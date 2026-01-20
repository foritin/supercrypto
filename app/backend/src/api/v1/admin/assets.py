"""
管理员资产路由 - 资产 CRUD、绑定项目、媒体管理

路由前缀: /api/v1/admin/assets
"""

from decimal import Decimal
from typing import Optional

from falib.utils.handlers import create_success_response
from fastapi import APIRouter, Depends, File, Form, Query, UploadFile

from src.services.asset.media_schemas import (
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
from src.services.asset.schemas import (
    AssetCreateRequest,
    AssetStatusUpdateRequest,
    AssetUpdateRequest,
    BindProjectRequest,
    UnbindContractsRequest,
)
from src.services.asset.service import AssetService
from src.shared.common.storage import FileSizeExceeded, InvalidFileType
from src.shared.schemas.enums import MediaType
from src.shared.security import require_admin

router = APIRouter()


def get_asset_service() -> AssetService:
    """依赖注入：获取资产服务"""
    return AssetService()


@router.post("", summary="创建资产", description="创建新的 RWA 资产 (管理员)")
async def create_asset(
    data: AssetCreateRequest,
    service: AssetService = Depends(get_asset_service),
    admin_address: str = Depends(require_admin),
):
    """
    创建新资产

    - 需要管理员权限
    - 自动设置 environment 为当前环境
    """
    from src.services.audit.service import audit_service
    from src.shared.schemas.enums import AuditAction, AuditCategory, AuditStatus

    result = await service.create_asset(data, created_by=admin_address)

    # 记录审计日志
    await audit_service.log_async(
        category=AuditCategory.ASSET,
        action=AuditAction.ASSET_CREATE,
        operator_address=admin_address,
        operator_type="admin",
        target_type="asset",
        target_id=result.id,
        status=AuditStatus.SUCCESS,
        description=f"Asset '{result.name}' created",
        new_value={
            "id": result.id,
            "name": result.name,
            "symbol": result.symbol,
            "asset_type": result.asset_type.value if result.asset_type else None,
        },
    )

    return create_success_response(
        object_data=result.model_dump(mode="json"), msg="Asset created successfully"
    )


@router.put(
    "/{asset_id}", summary="更新资产信息", description="更新资产的基本信息 (管理员)"
)
async def update_asset(
    asset_id: int,
    data: AssetUpdateRequest,
    service: AssetService = Depends(get_asset_service),
    admin_address: str = Depends(require_admin),
):
    """
    更新资产信息

    - 需要管理员权限
    - 只更新非空字段
    """
    from src.services.audit.service import audit_service
    from src.shared.schemas.enums import AuditAction, AuditCategory, AuditStatus

    result = await service.update_asset(asset_id, data)

    # 记录审计日志
    await audit_service.log_async(
        category=AuditCategory.ASSET,
        action=AuditAction.ASSET_UPDATE,
        operator_address=admin_address,
        operator_type="admin",
        target_type="asset",
        target_id=asset_id,
        status=AuditStatus.SUCCESS,
        description=f"Asset #{asset_id} updated",
        new_value=data.model_dump(exclude_none=True),
    )

    return create_success_response(
        object_data=result.model_dump(mode="json"), msg="Asset updated successfully"
    )


@router.patch(
    "/{asset_id}/status",
    summary="更新资产状态",
    description="暂停或恢复资产的认购状态 (管理员)",
)
async def update_asset_status(
    asset_id: int,
    data: AssetStatusUpdateRequest,
    service: AssetService = Depends(get_asset_service),
    admin_address: str = Depends(require_admin),
):
    """
    更新资产状态

    - **status**: active (可认购), paused (已暂停), sold_out (已售罄), closed (已关闭)
    """
    from src.services.audit.service import audit_service
    from src.shared.schemas.enums import AuditAction, AuditCategory, AuditStatus

    result = await service.update_asset_status(asset_id, data.status)

    # 记录审计日志
    await audit_service.log_async(
        category=AuditCategory.ASSET,
        action=AuditAction.ASSET_STATUS_CHANGE,
        operator_address=admin_address,
        operator_type="admin",
        target_type="asset",
        target_id=asset_id,
        status=AuditStatus.SUCCESS,
        description=f"Asset #{asset_id} status changed to {data.status.value}",
        new_value={"status": data.status.value},
    )

    return create_success_response(
        object_data=result.model_dump(mode="json"),
        msg=f"Asset status updated to {data.status.value}",
    )


@router.post(
    "/{asset_id}/price",
    summary="更新资产价格",
    description="手动更新资产价格 (管理员/预言机)",
)
async def update_asset_price(
    asset_id: int,
    price: float = Query(..., gt=0, description="新价格"),
    source: str = Query("manual", description="价格来源"),
    service: AssetService = Depends(get_asset_service),
    admin_address: str = Depends(require_admin),
):
    """
    更新资产价格

    - 会自动记录价格历史
    """
    from src.services.audit.service import audit_service
    from src.shared.schemas.enums import AuditAction, AuditCategory, AuditStatus

    result = await service.update_price(asset_id, Decimal(str(price)), source)

    # 记录审计日志
    await audit_service.log_async(
        category=AuditCategory.ASSET,
        action=AuditAction.ASSET_PRICE_UPDATE,
        operator_address=admin_address,
        operator_type="admin",
        target_type="asset",
        target_id=asset_id,
        status=AuditStatus.SUCCESS,
        description=f"Asset #{asset_id} price updated to {price}",
        new_value={"price": str(price), "source": source},
    )

    return create_success_response(
        object_data=result.model_dump(mode="json"), msg="Price updated successfully"
    )


# ============ 项目绑定接口 ============


@router.get(
    "/projects/available",
    summary="获取可绑定的项目列表",
    description="获取所有可用于绑定的项目及其合约列表",
)
async def get_available_projects(service: AssetService = Depends(get_asset_service)):
    """
    获取可绑定的项目列表

    - 返回所有已部署的项目
    - 每个项目包含合约数量和合约名称列表
    """
    projects = await service.get_available_projects()

    return create_success_response(list_data=[p.model_dump() for p in projects])


@router.post(
    "/{asset_id}/bind-project",
    summary="按项目绑定合约",
    description="将指定项目下的合约绑定到资产（支持选择性绑定）",
)
async def bind_project_contracts(
    asset_id: int,
    data: BindProjectRequest,
    service: AssetService = Depends(get_asset_service),
    admin_address: str = Depends(require_admin),
):
    """
    按项目绑定合约（支持选择性绑定）

    - **project**: 项目标识 (如 common, mock, rwa)
    - **contract_names**: 要绑定的合约名称列表，为空则绑定该项目下所有可用合约
    - **set_primary**: 是否将该项目的主合约设为 primary
    - exclusive 类型合约不能被多个资产绑定
    """
    from src.services.audit.service import audit_service
    from src.shared.schemas.enums import AuditAction, AuditCategory, AuditStatus

    result = await service.bind_project_contracts(
        asset_id=asset_id,
        project=data.project,
        contract_names=data.contract_names,
        set_primary=data.set_primary,
    )

    bound_count = len(data.contract_names) if data.contract_names else "all"

    # 记录审计日志
    await audit_service.log_async(
        category=AuditCategory.ASSET,
        action=AuditAction.ASSET_BIND_CONTRACT,
        operator_address=admin_address,
        operator_type="admin",
        target_type="asset",
        target_id=asset_id,
        status=AuditStatus.SUCCESS,
        description=f"Bound {bound_count} contracts from project '{data.project}' to asset #{asset_id}",
        new_value={
            "project": data.project,
            "contract_names": data.contract_names,
            "set_primary": data.set_primary,
        },
    )

    return create_success_response(
        object_data=result.model_dump(mode="json"),
        msg=f"Bound {bound_count} contracts from project '{data.project}'",
    )


@router.delete(
    "/{asset_id}/unbind",
    summary="解绑合约",
    description="解绑资产关联的合约（支持指定合约名称）",
)
async def unbind_contracts(
    asset_id: int,
    data: UnbindContractsRequest,
    service: AssetService = Depends(get_asset_service),
    admin_address: str = Depends(require_admin),
):
    """
    解绑合约

    - **contract_names**: 解绑指定的合约名称列表
    - **project**: 解绑指定项目的所有合约
    - **unbind_all**: 解绑所有合约
    - 必须指定其中一个参数
    """
    from src.services.audit.service import audit_service
    from src.shared.schemas.enums import AuditAction, AuditCategory, AuditStatus

    result = await service.unbind_contracts(
        asset_id=asset_id,
        contract_names=data.contract_names,
        project=data.project,
        unbind_all=data.unbind_all,
    )

    if data.unbind_all:
        msg = "All contracts unbound"
    elif data.contract_names:
        msg = f"Unbound {len(data.contract_names)} contracts"
    else:
        msg = f"Contracts from project '{data.project}' unbound"

    # 记录审计日志
    await audit_service.log_async(
        category=AuditCategory.ASSET,
        action=AuditAction.ASSET_UNBIND_CONTRACT,
        operator_address=admin_address,
        operator_type="admin",
        target_type="asset",
        target_id=asset_id,
        status=AuditStatus.SUCCESS,
        description=msg,
        old_value={
            "contract_names": data.contract_names,
            "project": data.project,
            "unbind_all": data.unbind_all,
        },
    )

    return create_success_response(object_data=result.model_dump(mode="json"), msg=msg)


# ============ 媒体管理接口 ============


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
    """
    media_list = await service.list_media(asset_id, media_type)
    return create_success_response(
        list_data=[MediaListResponse.model_validate(m).model_dump() for m in media_list]
    )


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


@router.post(
    "/{asset_id}/media",
    summary="上传媒体",
    description="上传媒体文件到资产",
)
async def upload_media(
    asset_id: int,
    file: UploadFile = File(..., description="媒体文件"),
    media_type: MediaType = Form(..., description="媒体类型"),
    title: Optional[str] = Form(None, description="标题"),
    description: Optional[str] = Form(None, description="描述"),
    service: MediaService = Depends(get_media_service),
    admin_address: str = Depends(require_admin),
):
    """
    上传媒体文件

    - 图片类型 (cover, gallery, floor_plan): 最大 5MB
    - 文档类型 (valuation, legal, financial): 最大 10MB
    - 自动验证文件类型和大小
    """
    from src.services.audit.service import audit_service
    from src.shared.schemas.enums import AuditAction, AuditCategory, AuditStatus

    try:
        media = await service.upload_media(
            asset_id=asset_id,
            file=file,
            media_type=media_type,
            title=title,
            description=description,
        )

        # 记录审计日志
        await audit_service.log_async(
            category=AuditCategory.ASSET,
            action=AuditAction.ASSET_UPDATE,
            operator_address=admin_address,
            operator_type="admin",
            target_type="asset_media",
            target_id=media.id,
            status=AuditStatus.SUCCESS,
            description=f"Uploaded {media_type.value} media to asset #{asset_id}",
            new_value={
                "media_id": media.id,
                "media_type": media_type.value,
                "file_name": file.filename,
            },
        )

        return create_success_response(
            object_data=MediaUploadResponse.model_validate(media).model_dump(),
            msg="Media uploaded successfully",
        )
    except FileSizeExceeded as e:
        return create_success_response(
            code=400,
            msg=str(e),
        )
    except InvalidFileType as e:
        return create_success_response(
            code=400,
            msg=str(e),
        )
    except MediaServiceError as e:
        return create_success_response(
            code=400,
            msg=str(e),
        )


@router.delete(
    "/{asset_id}/media/{media_id}",
    summary="删除媒体",
    description="删除指定的媒体文件",
)
async def delete_media(
    asset_id: int,
    media_id: int,
    service: MediaService = Depends(get_media_service),
    admin_address: str = Depends(require_admin),
):
    """
    删除媒体文件

    - 同时删除存储中的文件和数据库记录
    """
    from src.services.audit.service import audit_service
    from src.shared.schemas.enums import AuditAction, AuditCategory, AuditStatus

    try:
        await service.delete_media(asset_id, media_id)

        # 记录审计日志
        await audit_service.log_async(
            category=AuditCategory.ASSET,
            action=AuditAction.ASSET_UPDATE,
            operator_address=admin_address,
            operator_type="admin",
            target_type="asset_media",
            target_id=media_id,
            status=AuditStatus.SUCCESS,
            description=f"Deleted media #{media_id} from asset #{asset_id}",
        )

        return create_success_response(msg="Media deleted successfully")
    except MediaServiceError as e:
        return create_success_response(code=404, msg=str(e))


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
    from src.services.audit.service import audit_service
    from src.shared.schemas.enums import AuditAction, AuditCategory, AuditStatus

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

        return create_success_response(
            object_data=MediaUploadResponse.model_validate(media).model_dump(),
            msg="Media updated successfully",
        )
    except MediaServiceError as e:
        return create_success_response(code=404, msg=str(e))


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
    from src.services.audit.service import audit_service
    from src.shared.schemas.enums import AuditAction, AuditCategory, AuditStatus

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

        return create_success_response(
            list_data=[
                MediaListResponse.model_validate(m).model_dump() for m in media_list
            ],
            msg="Media reordered successfully",
        )
    except MediaServiceError as e:
        return create_success_response(code=400, msg=str(e))
