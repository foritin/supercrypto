"""
合约状态查询路由

路由前缀: /api/v1/admin/contracts
包含合约状态查询、依赖关系图、Provider 状态等端点

Requirements: 2.1
"""

from typing import Optional

from falib.utils.handlers import create_success_response
from fastapi import APIRouter, Depends

from src.common.dependencies import get_contract_service
from src.security import require_admin
from src.services import ContractService

router = APIRouter()


# ============ 合约状态查询端点 ============


@router.get(
    "/status",
    summary="List Contract Status",
    description="Get contract status list (admin) - for list view",
)
async def get_contract_status(
    service: ContractService = Depends(get_contract_service),
    _admin=Depends(require_admin),
):
    """
    获取合约状态列表

    返回格式：
    {
        "global_contracts": [...],
        "project_contracts": [...],
        "network": "dev",
        "needs_update_count": 0
    }
    """
    status_data = await service.get_contract_status()
    return create_success_response(object_data=status_data)


@router.get(
    "/dependency-graph",
    summary="Get Contract Dependency Graph",
    description="Get contract dependency graph data for frontend visualization (admin)",
)
async def get_dependency_graph(
    service: ContractService = Depends(get_contract_service),
    _admin=Depends(require_admin),
):
    """
    获取合约依赖关系图数据

    返回用于前端可视化图的数据结构：
    {
        "nodes": [{"id": "ContractName", "label": "...", "type": "...",
                   "address": "...", "status": "...", "project": "..."}],
        "edges": [{"source": "ContractA", "target": "DependencyKey", "status": "..."}]
    }

    用于树形可视化组件渲染依赖关系图
    """
    graph_data = await service.get_dependency_graph()
    return create_success_response(object_data=graph_data)


@router.get(
    "/provider/status",
    summary="Get Provider Registration Status",
    description="Get Provider registration status details",
)
async def get_provider_status(
    category: Optional[str] = None,
    service: ContractService = Depends(get_contract_service),
    _admin=Depends(require_admin),
):
    """
    获取 Provider 注册状态详情

    Args:
        category: 可选，按分类过滤 (如 "vanke", "common")
    """
    result = await service.get_provider_status(category=category)
    return create_success_response(object_data=result)


def _contract_to_dict(contract) -> dict:
    """将合约部署记录转换为响应字典"""
    return {
        "id": contract.id,
        "name": contract.name,
        "address": contract.address,
        "project_name": contract.project_name,
        "scope": contract.scope.value if contract.scope else None,
        "contract_type": contract.contract_type.value
        if contract.contract_type
        else None,
        "is_primary": contract.is_primary,
        "symbol": contract.name,
        "status": contract.status.value if contract.status else None,
        "network": contract.network.value if contract.network else None,
        "chain_id": contract.chain_id,
    }


# ============ 主合约管理端点 ============


@router.patch(
    "/{contract_id}/set-primary",
    summary="Set Primary Contract",
    description="Set a contract as the primary contract for a project (RWA Token)",
)
async def set_primary_contract(
    contract_id: int,
    service: ContractService = Depends(get_contract_service),
    _admin=Depends(require_admin),
):
    """设置合约为主合约 — 仅 PROJECT scope 合约可设为主合约，每个项目只能有一个"""
    contract = await service.set_primary(contract_id)
    return create_success_response(object_data=_contract_to_dict(contract))


@router.patch(
    "/{contract_id}/unset-primary",
    summary="Unset Primary Contract",
    description="Remove the primary contract designation from a contract",
)
async def unset_primary_contract(
    contract_id: int,
    service: ContractService = Depends(get_contract_service),
    _admin=Depends(require_admin),
):
    """取消合约的主合约标记 — 合约必须当前为主合约（is_primary=True）"""
    contract = await service.unset_primary(contract_id)
    return create_success_response(object_data=_contract_to_dict(contract))
