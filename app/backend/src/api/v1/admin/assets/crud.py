"""
管理员资产 CRUD 路由

路由前缀: /api/v1/admin/assets
功能: 资产的创建、读取、更新、删除操作

Requirements: 2.2
"""

from decimal import Decimal
from typing import Optional

from falib.utils.handlers import create_success_response
from fastapi import APIRouter, Depends, HTTPException, Query
from starlette import status

from src.services.asset.schemas import (
    AssetCreateRequest,
    AssetStatusUpdateRequest,
    AssetUpdateRequest,
    UpdatePriceRequest,
)
from src.services.asset.service import AssetService
from src.services.audit.service import audit_service
from src.shared.schemas.enums import (
    AssetStatus,
    AssetType,
    AuditAction,
    AuditCategory,
    AuditStatus,
)
from src.shared.security import require_admin

router = APIRouter()


def get_asset_service() -> AssetService:
    """依赖注入：获取资产服务"""
    return AssetService()


# ============ 资产列表查询 ============


@router.get(
    "/",
    summary="获取资产列表 (管理员)",
    description="获取所有资产列表，包括未绑定合约的资产",
)
async def list_assets(
    status: Optional[AssetStatus] = Query(None, description="状态筛选"),
    asset_type: Optional[AssetType] = Query(None, description="类型筛选"),
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
        page=page,
        page_size=page_size,
        public_only=False,  # 管理员可以看到所有资产
    )

    return create_success_response(
        list_data=[item.model_dump(mode="json") for item in items],
        pagination={
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        },
    )


# ============ 资产详情查询 ============


@router.get(
    "/{asset_id}",
    summary="获取资产详情 (管理员)",
    description="根据ID获取资产的详细信息，包括未绑定合约的资产",
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


@router.post("/", summary="创建资产", description="创建新的 RWA 资产 (管理员)")
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
    # 注意：created_by 字段是 IntField，不能传入钱包地址字符串
    # 暂时不传递 created_by，后续可以通过 User 表关联获取用户 ID
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
    summary="更新资产价格",
    description="手动更新资产价格 (管理员/预言机)",
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
