"""
管理员资产合约绑定管理路由

路由前缀: /api/v1/admin/assets
功能: 项目合约绑定、解绑操作

Requirements: 2.2
"""


from falib.utils.handlers import create_success_response
from fastapi import APIRouter, Depends

from src.services.asset.schemas import BindProjectRequest, UnbindContractsRequest
from src.services.asset.service import AssetService
from src.services.audit.service import audit_service
from src.shared.schemas.enums import AuditAction, AuditCategory, AuditStatus
from src.shared.security import require_admin

router = APIRouter()


def get_asset_service() -> AssetService:
    """依赖注入：获取资产服务"""
    return AssetService()


# ============ 可用项目查询 ============


@router.get(
    "/projects/available",
    summary="获取可绑定的项目列表",
    description="获取所有可用于绑定的项目及其合约列表",
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
    summary="按项目绑定合约",
    description="将指定项目下的 PROJECT scope 合约绑定到资产",
)
async def bind_project_contracts(
    asset_id: int,
    data: BindProjectRequest,
    service: AssetService = Depends(get_asset_service),
    admin_address: str = Depends(require_admin),
):
    """
    按项目绑定合约（简化版）

    变更说明 (Requirements 2.1-2.6):
    - 只绑定 PROJECT scope 合约，不绑定 GLOBAL scope 合约
    - 项目必须有主合约（is_primary=True），否则返回错误
    - 绑定成功后自动从主合约获取 symbol 和 address 填充到 Asset

    参数:
    - **project**: 项目标识 (如 vanke)
    - **contract_names**: 要绑定的合约名称列表，为空则绑定该项目下所有可用的 PROJECT scope 合约
    """
    result = await service.bind_project_contracts(
        asset_id=asset_id,
        project=data.project,
        contract_names=data.contract_names,
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
        description=f"Bound {bound_count} PROJECT scope contracts from project '{data.project}' to asset #{asset_id}",
        new_value={
            "project": data.project,
            "contract_names": data.contract_names,
        },
    )

    return create_success_response(
        object_data=result.model_dump(mode="json"),
        msg=f"Bound {bound_count} PROJECT scope contracts from project '{data.project}'",
    )


# ============ 合约解绑 ============


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
