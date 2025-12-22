"""
Asset Domain - API Routes
"""

from typing import Optional

from falib.utils.handlers import create_success_response
from fastapi import APIRouter, Depends, HTTPException, Query, status

from src.domains.asset.schemas import (
    AssetCreateRequest,
    AssetDetailResponse,
    AssetListItem,
    AssetPriceHistoryItem,
    AssetStatusUpdateRequest,
    AssetUpdateRequest,
    BindProjectRequest,
    UnbindContractsRequest,
)
from src.domains.asset.service import AssetService
from src.models.asset import AssetStatus, AssetType
router = APIRouter()
# admin_router 不再单独添加 dependencies，由 api/v1/router.py 统一管理
admin_router = APIRouter()


def get_asset_service() -> AssetService:
    """依赖注入：获取资产服务"""
    return AssetService()


# ============ 公开接口 ============


@router.get("", summary="获取资产列表", description="获取所有可投资的 RWA 资产列表")
async def list_assets(
    status: Optional[AssetStatus] = Query(None, description="状态筛选"),
    asset_type: Optional[AssetType] = Query(None, description="类型筛选"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=100, description="每页数量"),
    service: AssetService = Depends(get_asset_service),
):
    """
    获取资产列表

    - 支持按状态、类型筛选
    - 支持分页
    """
    items, total, total_pages = await service.list_assets(
        status=status, asset_type=asset_type, page=page, page_size=page_size
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


@router.get(
    "/{asset_id}", summary="获取资产详情", description="根据ID获取资产的详细信息"
)
async def get_asset(asset_id: int, service: AssetService = Depends(get_asset_service)):
    """
    获取资产详情

    - **asset_id**: 资产ID
    """
    result = await service.get_asset(asset_id)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found"
        )

    return create_success_response(object_data=result.model_dump(mode="json"))


@router.get(
    "/symbol/{symbol}",
    summary="根据符号获取资产",
    description="根据代币符号获取资产详情",
)
async def get_asset_by_symbol(
    symbol: str, service: AssetService = Depends(get_asset_service)
):
    """
    根据符号获取资产

    - **symbol**: 代币符号 (如 RWA001)
    """
    result = await service.get_asset_by_symbol(symbol)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asset with symbol '{symbol}' not found",
        )

    return create_success_response(object_data=result.model_dump(mode="json"))


@router.get(
    "/{asset_id}/price-history",
    summary="获取价格历史",
    description="获取资产的价格更新历史记录",
)
async def get_price_history(
    asset_id: int,
    limit: int = Query(50, ge=1, le=200, description="返回条数"),
    service: AssetService = Depends(get_asset_service),
):
    """
    获取资产价格历史

    - **asset_id**: 资产ID
    - **limit**: 返回条数 (默认50)
    """
    history = await service.get_price_history(asset_id, limit)

    return create_success_response(
        list_data=[item.model_dump(mode="json") for item in history]
    )


# ============ 管理员接口 ============


@admin_router.post("", summary="创建资产", description="创建新的 RWA 资产 (管理员)")
async def create_asset(
    data: AssetCreateRequest, service: AssetService = Depends(get_asset_service)
):
    """
    创建新资产

    - 需要管理员权限
    - 自动设置 environment 为当前环境
    """
    result = await service.create_asset(data, created_by=None)

    return create_success_response(
        object_data=result.model_dump(mode="json"), msg="Asset created successfully"
    )


@admin_router.put(
    "/{asset_id}", summary="更新资产信息", description="更新资产的基本信息 (管理员)"
)
async def update_asset(
    asset_id: int,
    data: AssetUpdateRequest,
    service: AssetService = Depends(get_asset_service),
):
    """
    更新资产信息

    - 需要管理员权限
    - 只更新非空字段
    """
    result = await service.update_asset(asset_id, data)

    return create_success_response(
        object_data=result.model_dump(mode="json"), msg="Asset updated successfully"
    )


@admin_router.patch(
    "/{asset_id}/status",
    summary="更新资产状态",
    description="暂停或恢复资产的认购状态 (管理员)",
)
async def update_asset_status(
    asset_id: int,
    data: AssetStatusUpdateRequest,
    service: AssetService = Depends(get_asset_service),
):
    """
    更新资产状态

    - **status**: active (可认购), paused (已暂停), sold_out (已售罄), closed (已关闭)
    """
    result = await service.update_asset_status(asset_id, data.status)

    return create_success_response(
        object_data=result.model_dump(mode="json"),
        msg=f"Asset status updated to {data.status.value}",
    )


@admin_router.post(
    "/{asset_id}/price",
    summary="更新资产价格",
    description="手动更新资产价格 (管理员/预言机)",
)
async def update_asset_price(
    asset_id: int,
    price: float = Query(..., gt=0, description="新价格"),
    source: str = Query("manual", description="价格来源"),
    service: AssetService = Depends(get_asset_service),
):
    """
    更新资产价格

    - 会自动记录价格历史
    """
    from decimal import Decimal

    result = await service.update_price(asset_id, Decimal(str(price)), source)

    return create_success_response(
        object_data=result.model_dump(mode="json"), msg="Price updated successfully"
    )


# ============ 项目绑定接口 ============


@admin_router.get(
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


@admin_router.post(
    "/{asset_id}/bind-project",
    summary="按项目绑定合约",
    description="将指定项目下的合约绑定到资产（支持选择性绑定）",
)
async def bind_project_contracts(
    asset_id: int,
    data: BindProjectRequest,
    service: AssetService = Depends(get_asset_service),
):
    """
    按项目绑定合约（支持选择性绑定）

    - **project**: 项目标识 (如 common, mock, rwa)
    - **contract_names**: 要绑定的合约名称列表，为空则绑定该项目下所有可用合约
    - **set_primary**: 是否将该项目的主合约设为 primary
    - exclusive 类型合约不能被多个资产绑定
    """
    result = await service.bind_project_contracts(
        asset_id=asset_id,
        project=data.project,
        contract_names=data.contract_names,
        set_primary=data.set_primary,
    )

    bound_count = len(data.contract_names) if data.contract_names else "all"
    return create_success_response(
        object_data=result.model_dump(mode="json"),
        msg=f"Bound {bound_count} contracts from project '{data.project}'",
    )


@admin_router.delete(
    "/{asset_id}/unbind",
    summary="解绑合约",
    description="解绑资产关联的合约（支持指定合约名称）",
)
async def unbind_contracts(
    asset_id: int,
    data: UnbindContractsRequest,
    service: AssetService = Depends(get_asset_service),
):
    """
    解绑合约

    - **contract_names**: 解绑指定的合约名称列表
    - **project**: 解绑指定项目的所有合约
    - **unbind_all**: 解绑所有合约
    - 必须指定其中一个参数
    """
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

    return create_success_response(object_data=result.model_dump(mode="json"), msg=msg)
