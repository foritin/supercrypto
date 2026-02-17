"""
管理员资产合约绑定管理路由

路由前缀: /api/v1/admin/assets
功能: 项目合约绑定、解绑操作

Requirements: 2.2
"""

from falib.utils.handlers import create_success_response
from fastapi import APIRouter, Depends

from src.common.dependencies import (
    audit_service,
    get_asset_service,
    get_contract_service,
)
from src.schemas.asset import BindProjectRequest, UnbindContractsRequest
from src.schemas.enums import (
    AuditAction,
    AuditCategory,
    AuditStatus,
)
from src.security import require_admin
from src.services import AssetService

router = APIRouter()


# ============ 可用项目查询 ============


@router.get(
    "/projects/available",
    summary="List Available Projects for Binding",
    description="Get all available projects and their contracts for binding",
)
async def get_available_projects(
    service: AssetService = Depends(get_asset_service),
    admin_address: str = Depends(require_admin),
):
    """
    获取可绑定的项目列表

    - 返回所有已部署的项目
    - 每个项目包含合约数量和合约名称列表
    """
    projects = await service.get_available_projects()

    return create_success_response(list_data=[p.model_dump() for p in projects])


# ============ 项目合约绑定 ============


@router.post(
    "/{asset_id}/bind-project",
    summary="Bind Project Contracts",
    description="Bind PROJECT scope contracts from a project to an asset",
)
async def bind_project_contracts(
    asset_id: int,
    data: BindProjectRequest,
    service: AssetService = Depends(get_asset_service),
    admin_address: str = Depends(require_admin),
):
    """按项目绑定 PROJECT scope 合约到资产"""
    contract_service = get_contract_service()
    (
        primary_contract,
        project_contracts,
    ) = await contract_service.validate_project_for_binding(data.project)

    result = await service.bind_project_contracts(
        asset_id=asset_id,
        project=data.project,
        primary_contract=primary_contract,
        project_contracts=project_contracts,
        contract_names=data.contract_names,
    )

    bound_count = len(data.contract_names) if data.contract_names else "all"
    msg = f"Bound {bound_count} PROJECT scope contracts from project '{data.project}'"

    await audit_service.log_async(
        category=AuditCategory.ASSET,
        action=AuditAction.ASSET_BIND_CONTRACT,
        operator_address=admin_address,
        operator_type="admin",
        target_type="asset",
        target_id=asset_id,
        status=AuditStatus.SUCCESS,
        description=msg,
        new_value={"project": data.project, "contract_names": data.contract_names},
    )

    return create_success_response(object_data=result.model_dump(mode="json"), msg=msg)


# ============ 合约解绑 ============


@router.delete(
    "/{asset_id}/unbind",
    summary="Unbind Contracts",
    description="Unbind contracts from an asset (supports specifying contract names)",
)
async def unbind_contracts(
    asset_id: int,
    data: UnbindContractsRequest,
    service: AssetService = Depends(get_asset_service),
    admin_address: str = Depends(require_admin),
):
    """解绑资产的合约（支持按名称、项目或全部解绑）"""
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
