"""
管理员资产媒体管理路由

路由前缀: /api/v1/admin/assets
功能: 媒体资源的上传、删除、更新、排序操作

Requirements: 2.2
"""

from typing import Optional

from falib.utils.handlers import create_error_response, create_success_response
from fastapi import APIRouter, Depends, File, Form, Query, UploadFile

from src.services.asset.media_schemas import (
    MediaBatchDeleteRequest,
    MediaBatchDeleteResponse,
    MediaBatchDeleteResult,
    MediaBatchUploadResponse,
    MediaBatchUploadResult,
    MediaListResponse,
    MediaReorderRequest,
    MediaUpdateRequest,
    MediaUploadResponse,
)
from src.services.asset.media_service import (
    MediaService,
    MediaServiceError,
    get_media_service,
)
from src.models import AssetMedia
from src.services.audit.service import audit_service
from src.shared.common.storage import FileSizeExceeded, InvalidFileType
from src.shared.schemas.enums import AuditAction, AuditCategory, AuditStatus, MediaType
from src.shared.security import require_admin

router = APIRouter()


# ============ 媒体列表查询 ============


@router.get(
    "/{asset_id}/media",
    summary="获取媒体列表",
    description="获取资产的所有媒体文件",
)
async def list_media(
    asset_id: int,
    media_type: Optional[MediaType] = Query(None, description="按类型筛选"),
    service: MediaService = Depends(get_media_service),
    admin_address: str = Depends(require_admin),
):
    """
    获取资产的媒体列表

    - 可按 media_type 筛选
    - 按 sort_order 排序
    - URL 返回预签名临时访问链接
    """
    media_list = await service.list_media(asset_id, media_type)
    
    # 收集所有需要转换的 URL
    file_paths = [m.url for m in media_list if m.url]
    
    # 批量获取预签名 URL（复用连接）
    presigned_urls = await service.get_presigned_urls_batch(file_paths) if file_paths else {}
    
    # 转换为响应格式
    result = []
    for m in media_list:
        data = MediaListResponse.model_validate(m).model_dump()
        # 将相对路径转换为预签名 URL
        if m.url and m.url in presigned_urls:
            data["url"] = presigned_urls[m.url]
        result.append(data)
    
    return create_success_response(list_data=result)


# ============ 媒体统计 ============


@router.get(
    "/{asset_id}/media/stats",
    summary="获取媒体统计",
    description="获取资产各类型媒体的数量统计",
)
async def get_media_stats(
    asset_id: int,
    service: MediaService = Depends(get_media_service),
    admin_address: str = Depends(require_admin),
):
    """获取媒体统计"""
    stats = await service.get_media_stats(asset_id)
    return create_success_response(object_data=stats)


# ============ 批量媒体上传 ============


@router.post(
    "/{asset_id}/media",
    summary="批量上传媒体",
    description="批量上传多个媒体文件到资产（复用连接，减少开销）",
)
async def upload_media_batch(
    asset_id: int,
    files: list[UploadFile] = File(..., description="媒体文件列表"),
    media_type: MediaType = Form(..., description="媒体类型"),
    service: MediaService = Depends(get_media_service),
    admin_address: str = Depends(require_admin),
):
    """
    批量上传媒体文件

    - 所有文件使用相同的媒体类型
    - 图片类型 (cover, gallery, floor_plan): 每个最大 5MB
    - 文档类型 (valuation, legal, financial): 每个最大 10MB
    - 使用单个连接上传所有文件，减少连接开销
    """
    try:
        # 使用批量上传方法（复用连接）
        upload_results = await service.upload_media_batch(
            asset_id=asset_id,
            files=files,
            media_type=media_type,
        )
    except MediaServiceError as e:
        return create_error_response(code=400, msg=str(e))

    results: list[MediaBatchUploadResult] = []
    success_count = 0
    failed_count = 0

    # 收集成功上传的媒体 URL 用于批量获取预签名 URL
    success_media_list: list[tuple[int, AssetMedia]] = []

    for i, (success, media, error) in enumerate(upload_results):
        file_name = files[i].filename if i < len(files) else "unknown"
        if success and media:
            success_media_list.append((i, media))
            success_count += 1
        else:
            results.append(
                MediaBatchUploadResult(
                    success=False,
                    file_name=file_name or "unknown",
                    error=error,
                )
            )
            failed_count += 1

    # 批量获取预签名 URL
    if success_media_list:
        file_paths = [m.url for _, m in success_media_list if m.url]
        presigned_urls = await service.get_presigned_urls_batch(file_paths) if file_paths else {}

        for idx, media in success_media_list:
            file_name = files[idx].filename if idx < len(files) else "unknown"
            response_data = MediaUploadResponse.model_validate(media).model_dump()
            if media.url and media.url in presigned_urls:
                response_data["url"] = presigned_urls[media.url]
            results.append(
                MediaBatchUploadResult(
                    success=True,
                    file_name=file_name or "unknown",
                    media=MediaUploadResponse(**response_data),
                )
            )

    # 记录审计日志
    if success_count > 0:
        await audit_service.log_async(
            category=AuditCategory.ASSET,
            action=AuditAction.ASSET_UPDATE,
            operator_address=admin_address,
            operator_type="admin",
            target_type="asset_media",
            target_id=asset_id,
            status=AuditStatus.SUCCESS,
            description=f"Batch uploaded {success_count} {media_type.value} media to asset #{asset_id}",
            new_value={
                "media_type": media_type.value,
                "success_count": success_count,
                "failed_count": failed_count,
            },
        )

    response = MediaBatchUploadResponse(
        total=len(files),
        success_count=success_count,
        failed_count=failed_count,
        results=results,
    )

    return create_success_response(
        object_data=response.model_dump(),
        msg=f"Batch upload completed: {success_count} succeeded, {failed_count} failed",
    )


# ============ 批量媒体删除 ============


@router.post(
    "/{asset_id}/media/delete",
    summary="批量删除媒体",
    description="批量删除多个媒体文件（复用连接，减少开销）",
)
async def delete_media_batch(
    asset_id: int,
    data: MediaBatchDeleteRequest,
    service: MediaService = Depends(get_media_service),
    admin_address: str = Depends(require_admin),
):
    """
    批量删除媒体文件

    - 同时删除存储中的文件和数据库记录
    - 使用单个连接删除所有文件，减少连接开销
    """
    delete_results = await service.delete_media_batch(asset_id, data.media_ids)

    results: list[MediaBatchDeleteResult] = []
    success_count = 0
    failed_count = 0

    for media_id, success, error in delete_results:
        results.append(
            MediaBatchDeleteResult(
                media_id=media_id,
                success=success,
                error=error,
            )
        )
        if success:
            success_count += 1
        else:
            failed_count += 1

    # 记录审计日志
    if success_count > 0:
        await audit_service.log_async(
            category=AuditCategory.ASSET,
            action=AuditAction.ASSET_UPDATE,
            operator_address=admin_address,
            operator_type="admin",
            target_type="asset_media",
            target_id=asset_id,
            status=AuditStatus.SUCCESS,
            description=f"Batch deleted {success_count} media from asset #{asset_id}",
            new_value={
                "media_ids": data.media_ids,
                "success_count": success_count,
                "failed_count": failed_count,
            },
        )

    response = MediaBatchDeleteResponse(
        total=len(data.media_ids),
        success_count=success_count,
        failed_count=failed_count,
        results=results,
    )

    return create_success_response(
        object_data=response.model_dump(),
        msg=f"Batch delete completed: {success_count} succeeded, {failed_count} failed",
    )


# ============ 媒体更新 ============


@router.patch(
    "/{asset_id}/media/{media_id}",
    summary="更新媒体信息",
    description="更新媒体的标题、描述或设为主图",
)
async def update_media(
    asset_id: int,
    media_id: int,
    data: MediaUpdateRequest,
    service: MediaService = Depends(get_media_service),
    admin_address: str = Depends(require_admin),
):
    """
    更新媒体信息

    - 设为主图时会自动取消同类型其他媒体的主图状态
    """
    try:
        media = await service.update_media(
            asset_id=asset_id,
            media_id=media_id,
            title=data.title,
            description=data.description,
            is_primary=data.is_primary,
        )

        # 记录审计日志
        await audit_service.log_async(
            category=AuditCategory.ASSET,
            action=AuditAction.ASSET_UPDATE,
            operator_address=admin_address,
            operator_type="admin",
            target_type="asset_media",
            target_id=media_id,
            status=AuditStatus.SUCCESS,
            description=f"Updated media #{media_id}",
            new_value=data.model_dump(exclude_none=True),
        )

        # 转换为响应格式，并生成预签名 URL
        response_data = MediaUploadResponse.model_validate(media).model_dump()
        if media.url:
            response_data["url"] = await service.get_presigned_url(media.url)

        return create_success_response(
            object_data=response_data,
            msg="Media updated successfully",
        )
    except MediaServiceError as e:
        return create_error_response(code=404, msg=str(e))


# ============ 媒体排序 ============


@router.put(
    "/{asset_id}/media/reorder",
    summary="批量排序媒体",
    description="按指定顺序重新排列媒体",
)
async def reorder_media(
    asset_id: int,
    data: MediaReorderRequest,
    service: MediaService = Depends(get_media_service),
    admin_address: str = Depends(require_admin),
):
    """
    批量排序媒体

    - media_ids 顺序即为新的排序顺序
    """
    try:
        media_list = await service.reorder_media(asset_id, data.media_ids)

        # 记录审计日志
        await audit_service.log_async(
            category=AuditCategory.ASSET,
            action=AuditAction.ASSET_UPDATE,
            operator_address=admin_address,
            operator_type="admin",
            target_type="asset",
            target_id=asset_id,
            status=AuditStatus.SUCCESS,
            description=f"Reordered {len(data.media_ids)} media items",
            new_value={"media_ids": data.media_ids},
        )

        # 收集所有需要转换的 URL
        file_paths = [m.url for m in media_list if m.url]
        
        # 批量获取预签名 URL（复用连接）
        presigned_urls = await service.get_presigned_urls_batch(file_paths) if file_paths else {}

        # 转换为响应格式
        result = []
        for m in media_list:
            data_item = MediaListResponse.model_validate(m).model_dump()
            if m.url and m.url in presigned_urls:
                data_item["url"] = presigned_urls[m.url]
            result.append(data_item)

        return create_success_response(
            list_data=result,
            msg="Media reordered successfully",
        )
    except MediaServiceError as e:
        return create_error_response(code=400, msg=str(e))
