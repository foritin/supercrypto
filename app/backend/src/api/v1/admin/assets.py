"""
管理员资产路由 - 资产 CRUD、绑定项目

路由前缀: /api/v1/admin/assets
"""

from decimal import Decimal

from falib.utils.handlers import create_success_response
from fastapi import APIRouter, Depends, Query

from src.services.asset.schemas import (
    AssetCreateRequest,
    AssetStatusUpdateRequest,
    AssetUpdateRequest,
    BindProjectRequest,
    UnbindContractsRequest,
)
from src.services.asset.service import AssetService

router = APIRouter()


def get_asset_service() -> AssetService:
    """依赖注入：获取资产服务"""
    return AssetService()


@router.post("", summary="创建资产", description="创建新的 RWA 资产 (管理员)")
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


@router.put(
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


@router.patch(
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
):
    """
    更新资产价格

    - 会自动记录价格历史
    """
    result = await service.update_price(asset_id, Decimal(str(price)), source)

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


@router.delete(
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
