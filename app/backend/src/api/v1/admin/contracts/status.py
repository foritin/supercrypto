"""
合约状态查询路由

路由前缀: /api/v1/admin/contracts
包含合约状态查询、依赖关系图、Provider 状态等端点

Requirements: 2.1
"""

from typing import Optional

from falib.utils.handlers import create_error_response, create_success_response
from fastapi import APIRouter, Depends

from src.services.contract.service import ContractService, get_contract_service
from src.shared.common.exceptions import BusinessException
from src.shared.security import require_admin

router = APIRouter()


# ============ 合约状态查询端点 ============


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
    summary="获取 Provider 注册状态",
    description="获取 Provider 注册状态详情",
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


# ============ 主合约管理端点 ============


@router.patch(
    "/{contract_id}/set-primary",
    summary="设置合约为主合约",
    description="将指定合约设置为项目的主合约（RWA Token）",
)
async def set_primary_contract(
    contract_id: int,
    service: ContractService = Depends(get_contract_service),
    _admin=Depends(require_admin),
):
    """
    设置合约为主合约

    验证规则:
    1. 合约必须存在
    2. 合约必须是 PROJECT scope（只有项目专属合约可以设为主合约）
    3. 项目不能已有主合约（每个项目只能有一个主合约）

    Args:
        contract_id: 合约 ID

    Returns:
        更新后的合约信息

    Raises:
        400: 合约 scope 不正确或项目已有主合约
        404: 合约不存在
    """
    try:
        contract = await service.set_primary(contract_id)

        # 构建响应数据
        contract_data = {
            "id": contract.id,
            "name": contract.name,
            "address": contract.address,
            "project_name": contract.project_name,
            "scope": contract.scope.value if contract.scope else None,
            "contract_type": (
                contract.contract_type.value if contract.contract_type else None
            ),
            "is_primary": contract.is_primary,
            "symbol": contract.symbol,
            "status": contract.status.value if contract.status else None,
            "network": contract.network.value if contract.network else None,
            "chain_id": contract.chain_id,
        }

        return create_success_response(object_data=contract_data)
    except BusinessException as e:
        return create_error_response(
            msg=e.message,
            code=e.code,
            object_data={
                "error_code": e.error_code,
                "detail": e.detail,
            },
        )


@router.patch(
    "/{contract_id}/unset-primary",
    summary="取消合约的主合约标记",
    description="取消指定合约的主合约标记",
)
async def unset_primary_contract(
    contract_id: int,
    service: ContractService = Depends(get_contract_service),
    _admin=Depends(require_admin),
):
    """
    取消合约的主合约标记

    验证规则:
    1. 合约必须存在
    2. 合约必须是当前的主合约（is_primary=True）

    Args:
        contract_id: 合约 ID

    Returns:
        更新后的合约信息

    Raises:
        400: 合约不是主合约
        404: 合约不存在
    """
    try:
        contract = await service.unset_primary(contract_id)

        # 构建响应数据
        contract_data = {
            "id": contract.id,
            "name": contract.name,
            "address": contract.address,
            "project_name": contract.project_name,
            "scope": contract.scope.value if contract.scope else None,
            "contract_type": (
                contract.contract_type.value if contract.contract_type else None
            ),
            "is_primary": contract.is_primary,
            "symbol": contract.symbol,
            "status": contract.status.value if contract.status else None,
            "network": contract.network.value if contract.network else None,
            "chain_id": contract.chain_id,
        }

        return create_success_response(object_data=contract_data)
    except BusinessException as e:
        return create_error_response(
            msg=e.message,
            code=e.code,
            object_data={
                "error_code": e.error_code,
                "detail": e.detail,
            },
        )
