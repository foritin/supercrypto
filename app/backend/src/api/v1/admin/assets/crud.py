"""
管理员资产 CRUD 路由

路由前缀: /api/v1/admin/assets
功能: 资产的创建、读取、更新、删除操作

Requirements: 2.2
"""

from decimal import Decimal
from typing import Optional

from falib.utils.handlers import PaginationInfo, create_success_response
from fastapi import APIRouter, Depends, HTTPException, Query
from starlette import status

from src.common.dependencies import audit_service, get_asset_service
from src.schemas.asset import (
    AssetCreateRequest,
    AssetStatusUpdateRequest,
    AssetUpdateRequest,
    UpdatePriceRequest,
)
from src.schemas.enums import (
    AssetStatus,
    AssetSubscriptionMode,
    AssetType,
    AuditAction,
    AuditCategory,
    AuditStatus,
)
from src.security import require_admin
from src.services import AssetService

router = APIRouter()


# ============ 资产列表查询 ============


@router.get(
    "/",
    summary="List Assets (Admin)",
    description="Get all assets including those without contract bindings",
)
async def list_assets(
    status: Optional[AssetStatus] = Query(None, description="状态筛选"),
    asset_type: Optional[AssetType] = Query(None, description="类型筛选"),
    subscription_mode: Optional[AssetSubscriptionMode] = Query(
        None, description="认购模式筛选"
    ),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=100, description="每页数量"),
    service: AssetService = Depends(get_asset_service),
    admin_address: str = Depends(require_admin),
):
    """
    获取资产列表（Admin API）

    - 需要管理员权限
    - 返回所有资产，包括未绑定合约的资产
    - 支持按状态和类型筛选
    """
    items, total, total_pages = await service.list_assets(
        status=status,
        asset_type=asset_type,
        subscription_mode=subscription_mode,
        page=page,
        page_size=page_size,
        public_only=False,  # 管理员可以看到所有资产
    )

    return create_success_response(
        list_data=[item.model_dump(mode="json") for item in items],
        pagination=PaginationInfo(
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        ),
    )


# ============ 资产详情查询 ============


@router.get(
    "/{asset_id}",
    summary="Get Asset Detail (Admin)",
    description="Get detailed asset information by ID, including assets without contract bindings",
)
async def get_asset(
    asset_id: int,
    service: AssetService = Depends(get_asset_service),
    admin_address: str = Depends(require_admin),
):
    """
    获取资产详情（Admin API）

    - 需要管理员权限
    - 可以获取所有资产，包括未绑定合约的资产
    """
    result = await service.get_asset(asset_id, public_only=False)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found"
        )

    return create_success_response(object_data=result.model_dump(mode="json"))


# ============ 资产创建 ============


@router.post("/", summary="Create Asset", description="Create a new RWA asset (admin)")
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
    # created_by 是 IntField，暂不传递（后续通过 User 表关联获取用户 ID）
    result = await service.create_asset(data, created_by=None)

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


# ============ 资产更新 ============


@router.put(
    "/{asset_id}",
    summary="Update Asset",
    description="Update asset basic information (admin)",
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


# ============ 资产状态更新 ============


@router.patch(
    "/{asset_id}/status",
    summary="Update Asset Status",
    description="Pause or resume asset subscription status (admin)",
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


# ============ 资产价格更新 ============


@router.post(
    "/{asset_id}/price",
    summary="Update Asset Price",
    description="Manually update asset price (admin/oracle)",
)
async def update_asset_price(
    asset_id: int,
    data: UpdatePriceRequest,
    service: AssetService = Depends(get_asset_service),
    admin_address: str = Depends(require_admin),
):
    """
    更新资产价格

    - 会自动记录价格历史
    """
    result = await service.update_price(asset_id, Decimal(str(data.price)), data.source)

    # 记录审计日志
    await audit_service.log_async(
        category=AuditCategory.ASSET,
        action=AuditAction.ASSET_PRICE_UPDATE,
        operator_address=admin_address,
        operator_type="admin",
        target_type="asset",
        target_id=asset_id,
        status=AuditStatus.SUCCESS,
        description=f"Asset #{asset_id} price updated to {data.price}",
        new_value={"price": str(data.price), "source": data.source},
    )

    return create_success_response(
        object_data=result.model_dump(mode="json"), msg="Price updated successfully"
    )


# ============ 资产删除 (危险操作) ============


@router.delete(
    "/{asset_id}",
    summary="Delete Asset Permanently",
    description="Permanently delete an asset and all associated data including MinIO files, media, price history, contract bindings (admin dangerous operation)",
)
async def delete_asset(
    asset_id: int,
    service: AssetService = Depends(get_asset_service),
    admin_address: str = Depends(require_admin),
):
    """
    永久删除资产

    ⚠️ 危险操作，不可恢复！
    - 如果存在认购记录则拒绝删除
    - 会清理 MinIO 上所有关联文件
    - 会删除价格历史、合约绑定等所有关联数据
    """
    result = await service.delete_asset(asset_id)

    # 记录审计日志
    await audit_service.log_async(
        category=AuditCategory.ASSET,
        action=AuditAction.ASSET_DELETE,
        operator_address=admin_address,
        operator_type="admin",
        target_type="asset",
        target_id=asset_id,
        status=AuditStatus.SUCCESS,
        description=f"Asset #{asset_id} '{result['name']}' permanently deleted",
        old_value=result,
    )

    return create_success_response(
        object_data=result, msg=f"Asset '{result['name']}' permanently deleted"
    )
