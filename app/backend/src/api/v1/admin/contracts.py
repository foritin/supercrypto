"""
管理员合约路由 - 合约依赖关系可视化

路由前缀: /api/v1/admin/contracts
"""

from falib.utils.handlers import success_response
from fastapi import APIRouter, Depends

from src.services.contract.service import ContractService, get_contract_service
from src.shared.security import require_admin

router = APIRouter()


@router.get(
    "/status",
    summary="获取合约状态列表",
    description="获取合约状态列表（管理员）- 用于列表视图",
)
async def get_contract_status(
    service: ContractService = Depends(get_contract_service),
    _admin=Depends(require_admin),
):
    """
    获取合约状态列表

    返回格式：
    {
        "contracts": [...],
        "projects": [...],
        "network": "dev",
        "needs_update_count": 0
    }
    """
    status_data = await service.get_contract_status()
    return success_response(object_data=status_data)


@router.get(
    "/dependency-graph",
    summary="获取合约依赖关系图数据",
    description="获取用于前端可视化的合约依赖关系图（管理员）",
)
async def get_dependency_graph(
    service: ContractService = Depends(get_contract_service),
    _admin=Depends(require_admin),
):
    """
    获取合约依赖关系图数据

    返回用于前端可视化图的数据结构：
    {
        "nodes": [{"id": "ContractName", "label": "...", "type": "...", "address": "...", "status": "...", "project": "..."}],
        "edges": [{"source": "ContractA", "target": "ContractB", "label": "setFunction", "setFunction": "...", "status": "..."}]
    }

    用于树形可视化组件渲染依赖关系图
    """
    graph_data = await service.get_dependency_graph()
    return success_response(object_data=graph_data)
