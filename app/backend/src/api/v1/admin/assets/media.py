"""
管理员资产媒体管理路由

路由前缀: /api/v1/admin/assets
功能: 媒体资源的上传、删除、更新、排序操作

Requirements: 2.2
"""

from typing import Optional

from falib.utils.handlers import create_success_response
from fastapi import APIRouter, Depends, File, Form, Query, UploadFile

from src.common.dependencies import audit_service, get_asset_service
from src.schemas.asset_media import (
    MediaBatchDeleteRequest,
    MediaReorderRequest,
    MediaUpdateRequest,
)
from src.schemas.enums import AuditAction, AuditCategory, AuditStatus, MediaType
from src.security import require_admin
from src.services import AssetService

router = APIRouter()


# ============ 媒体列表查询 ============


@router.get(
    "/{asset_id}/media",
    summary="List Media",
    description="Get all media files for an asset",
)
async def list_media(
    asset_id: int,
    media_type: Optional[MediaType] = Query(None, description="按类型筛选"),
    service: AssetService = Depends(get_asset_service),
    admin_address: str = Depends(require_admin),
):
    """
    获取资产的媒体列表

    - 可按 media_type 筛选
    - 按 sort_order 排序
    - URL 返回预签名临时访问链接
    """
    result = await service.list_media_with_urls(asset_id, media_type)
    return create_success_response(list_data=result)


# ============ 媒体统计 ============


@router.get(
    "/{asset_id}/media/stats",
    summary="Get Media Stats",
    description="Get media count statistics by type for an asset",
)
async def get_media_stats(
    asset_id: int,
    service: AssetService = Depends(get_asset_service),
    admin_address: str = Depends(require_admin),
):
    """获取媒体统计"""
    stats = await service.get_media_stats(asset_id)
    return create_success_response(object_data=stats)


# ============ 批量媒体上传 ============


@router.post(
    "/{asset_id}/media",
    summary="Batch Upload Media",
    description="Batch upload multiple media files to an asset (connection reuse, reduced overhead)",
)
async def upload_media_batch(
    asset_id: int,
    files: list[UploadFile] = File(..., description="媒体文件列表"),
    media_type: MediaType = Form(..., description="媒体类型"),
    service: AssetService = Depends(get_asset_service),
    admin_address: str = Depends(require_admin),
):
    """
    批量上传媒体文件

    - 所有文件使用相同的媒体类型
    - 图片类型: 每个最大 5MB; 文档类型: 每个最大 10MB
    """
    (
        response_data,
        success_count,
        failed_count,
    ) = await service.handle_upload_media_batch(
        asset_id=asset_id,
        files=files,
        media_type=media_type,
    )

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

    return create_success_response(
        object_data=response_data,
        msg=f"Batch upload completed: {success_count} succeeded, {failed_count} failed",
    )


# ============ 批量媒体删除 ============


@router.post(
    "/{asset_id}/media/delete",
    summary="Batch Delete Media",
    description="Batch delete multiple media files (connection reuse, reduced overhead)",
)
async def delete_media_batch(
    asset_id: int,
    data: MediaBatchDeleteRequest,
    service: AssetService = Depends(get_asset_service),
    admin_address: str = Depends(require_admin),
):
    """
    批量删除媒体文件

    - 同时删除存储中的文件和数据库记录
    """
    (
        response_data,
        success_count,
        failed_count,
    ) = await service.handle_delete_media_batch(
        asset_id,
        data.media_ids,
    )

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

    return create_success_response(
        object_data=response_data,
        msg=f"Batch delete completed: {success_count} succeeded, {failed_count} failed",
    )


# ============ 媒体更新 ============


@router.patch(
    "/{asset_id}/media/{media_id}",
    summary="Update Media Info",
    description="Update media title, description, or set as primary",
)
async def update_media(
    asset_id: int,
    media_id: int,
    data: MediaUpdateRequest,
    service: AssetService = Depends(get_asset_service),
    admin_address: str = Depends(require_admin),
):
    """更新媒体信息 — 设为主图时自动取消同类型其他媒体的主图状态"""
    response_data = await service.update_media_with_url(
        asset_id=asset_id,
        media_id=media_id,
        title=data.title,
        description=data.description,
        is_primary=data.is_primary,
    )

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

    return create_success_response(
        object_data=response_data, msg="Media updated successfully"
    )


# ============ 媒体排序 ============


@router.put(
    "/{asset_id}/media/reorder",
    summary="Reorder Media",
    description="Reorder media items in the specified order",
)
async def reorder_media(
    asset_id: int,
    data: MediaReorderRequest,
    service: AssetService = Depends(get_asset_service),
    admin_address: str = Depends(require_admin),
):
    """批量排序媒体 — media_ids 顺序即为新的排序顺序"""
    result = await service.reorder_media_with_urls(asset_id, data.media_ids)

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

    return create_success_response(list_data=result, msg="Media reordered successfully")
