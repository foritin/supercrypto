"""
管理员合约路由 - 合约依赖关系可视化

路由前缀: /api/v1/admin/contracts
"""

from falib.utils.handlers import success_response
from fastapi import APIRouter, Depends

from src.services.contract.schemas import (
    ManualRegistryUpdateRequest,
    ProviderSyncRequest,
)
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


@router.post(
    "/provider/sync",
    summary="同步链上注册表状态",
    description="从 AddressProvider 读取最新地址并更新本地数据库",
)
async def sync_from_provider(
    request: ProviderSyncRequest,
    service: ContractService = Depends(get_contract_service),
    _admin=Depends(require_admin),
):
    """
    同步链上注册表状态
    """
    result = await service.sync_from_provider()
    return success_response(object_data=result)


@router.post(
    "/registry/update",
    summary="手动修正注册记录",
    description="手动更新本地数据库中的合约地址（紧急修正用）",
)
async def update_registry_record(
    request: ManualRegistryUpdateRequest,
    service: ContractService = Depends(get_contract_service),
    _admin=Depends(require_admin),
):
    """
    手动修正注册记录
    """
    result = await service.update_registry_record(
        contract_name=request.contract_name,
        address=request.address,
    )
    # 转换为 dict 避免 Pydantic 序列化问题（如果 ContractModel 未完全兼容）
    # 这里简单返回更新后的数据
    data = {
        "name": result.name,
        "address": result.address,
        "updated_at": result.updated_at.isoformat() if result.updated_at else None,
    }
    return success_response(object_data=data)


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
