"""
Contract Routes
合约相关路由
"""

from falib.utils.handlers import success_response
from fastapi import APIRouter, Depends

from src.domains.contract.schemas import (
    ConfirmSyncRequest,
    ResetDeployRequest,
    UpdateContractAddressRequest,
)
from src.domains.contract.service import ContractService, get_contract_service
from src.models.deploy import DeployInfo
from src.shared.exceptions import (
    NotFoundException,
    ValidationException,
)
from src.shared.security import require_admin

router = APIRouter()
admin_router = APIRouter()


@router.get(
    "/addresses",
    summary="获取所有合约地址",
    description="获取当前环境下所有已部署的合约地址",
)
async def get_contract_addresses(
    service: ContractService = Depends(get_contract_service),
):
    """
    获取所有合约地址

    返回当前网络下所有活跃的合约地址
    """
    addresses = await service.get_all_addresses()
    return success_response(object_data=addresses.model_dump())


@router.get(
    "/subscription",
    summary="获取认购合约信息",
    description="获取认购合约地址和相关依赖合约地址",
)
async def get_subscription_contract(
    service: ContractService = Depends(get_contract_service),
):
    """
    获取认购合约信息

    包含：
    - Subscription 合约地址
    - USDT 代币地址
    - RWA Token 地址
    - KYC Manager 地址

    注意：链上参数（APY、最小投资额等）需要前端直接从链上读取
    """
    info = await service.get_subscription_info()
    if not info:
        return success_response(
            object_data=None, msg="Subscription contract not deployed"
        )
    return success_response(object_data=info.model_dump())


@router.get(
    "/{contract_name}",
    summary="获取单个合约地址",
    description="根据合约名称获取地址",
)
async def get_contract_address(
    contract_name: str,
    service: ContractService = Depends(get_contract_service),
):
    """
    获取单个合约地址

    - **contract_name**: 合约名称（如 MockUSDT, Subscription）
    """
    # 直接从数据库查询，不需要静态映射
    deploy = await DeployInfo.filter(
        network=service.network,
        contract_name=contract_name,
        is_active=True,
    ).first()

    if not deploy:
        return success_response(
            object_data=None, msg=f"Contract not found: {contract_name}"
        )

    return success_response(
        object_data={
            "name": deploy.contract_name,
            "address": deploy.contract_address,
            "deploy_step": deploy.deploy_step,
            "project": deploy.project,
            "network": service.network,
        }
    )


# ============ 管理员接口 ============


@admin_router.get(
    "/status",
    summary="获取所有合约状态",
    description="获取所有合约的部署状态和依赖关系（管理员）",
    dependencies=[Depends(require_admin)],
)
async def get_all_contract_status(
    service: ContractService = Depends(get_contract_service),
):
    """
    获取所有合约的完整状态

    包含：
    - 部署状态
    - 部署时间
    - 依赖合约地址
    - 可用的 set 函数
    """
    status_list = await service.get_all_contract_status()
    return success_response(object_data=status_list.model_dump())


@admin_router.get(
    "/dependencies/{contract_name}",
    summary="获取合约依赖关系",
    description="获取指定合约的依赖关系（管理员）",
    dependencies=[Depends(require_admin)],
)
async def get_contract_dependencies(
    contract_name: str,
    service: ContractService = Depends(get_contract_service),
):
    """获取单个合约的依赖关系和可用的 set 函数"""
    dep = await service.get_contract_dependencies(contract_name)
    if not dep:
        raise NotFoundException(message=f"Unknown contract: {contract_name}")
    return success_response(object_data=dep.model_dump())


@admin_router.post(
    "/update-address",
    summary="更新合约地址",
    description="调用合约的 set 函数更新依赖地址（管理员）",
    dependencies=[Depends(require_admin)],
)
async def update_contract_address(
    request: UpdateContractAddressRequest,
    service: ContractService = Depends(get_contract_service),
):
    """
    更新合约地址

    此接口返回需要调用的合约函数信息，
    实际的链上调用需要由前端通过 MetaMask 完成

    返回：
    - target_contract: 目标合约地址
    - function_name: 函数名称
    - function_args: 函数参数
    - abi: 函数 ABI
    """
    # 验证目标合约是否存在
    dep = await service.get_contract_dependencies(request.target_contract)
    if not dep:
        raise NotFoundException(message=f"Unknown contract: {request.target_contract}")

    # 验证 set 函数是否可用
    if request.set_function not in dep.set_functions:
        raise ValidationException(
            message=f"Function {request.set_function} not available for {request.target_contract}. Available: {dep.set_functions}"
        )

    # 从数据库获取目标合约部署信息
    deploy = await DeployInfo.filter(
        network=service.network,
        contract_name=request.target_contract,
        is_active=True,
    ).first()

    if not deploy:
        raise NotFoundException(
            message=f"Contract {request.target_contract} not deployed"
        )

    target_address = deploy.contract_address

    # 返回调用信息（前端使用 MetaMask 调用）
    return success_response(
        object_data={
            "target_contract": request.target_contract,
            "target_address": target_address,
            "function_name": request.set_function,
            "function_args": [request.new_address],
            "abi": f"function {request.set_function}(address _newAddress)",
        },
        msg="请使用 MetaMask 调用此函数",
    )


@admin_router.get(
    "/status-enhanced",
    summary="获取增强版合约状态",
    description="获取所有合约的部署状态和依赖检测结果（管理员）",
    dependencies=[Depends(require_admin)],
)
async def get_contract_status_enhanced(
    service: ContractService = Depends(get_contract_service),
):
    """
    获取增强版合约状态

    包含：
    - 部署状态
    - 依赖状态检测（需更新/已同步/未部署）
    - 可用的 set 函数
    """
    status_list = await service.get_contract_status_enhanced()
    return success_response(object_data=status_list.model_dump())


@admin_router.get(
    "/available",
    summary="获取可用于绑定的合约列表",
    description="获取可用于 Asset 绑定的合约列表（按项目分组）",
    dependencies=[Depends(require_admin)],
)
async def get_available_contracts(
    service: ContractService = Depends(get_contract_service),
):
    """
    获取可用于 Asset 绑定的合约列表

    返回：
    - projects: 可用的项目合约组（排除 mock）
    - common_contracts: 公共合约（如 KYCManager）

    用于 Admin 创建/编辑 Asset 时选择合约绑定
    """
    result = await service.get_available_contracts_for_asset()
    return success_response(object_data=result)


@admin_router.post(
    "/confirm-binding",
    summary="确认绑定更新完成",
    description="前端完成链上调用后，更新绑定记录（管理员）",
    dependencies=[Depends(require_admin)],
)
async def confirm_binding_update(
    request: ConfirmSyncRequest,
    service: ContractService = Depends(get_contract_service),
):
    """
    确认绑定更新完成

    当前端通过 MetaMask 调用 set 函数成功后，
    调用此接口更新绑定记录
    """
    success = await service.confirm_binding_update(
        contract_name=request.contract_name,
        dependency_name=request.dependency_name,
        new_address=request.new_address,
        tx_hash=request.tx_hash,
    )

    if not success:
        raise NotFoundException(
            message=f"Failed to update binding: {request.contract_name} -> {request.dependency_name}"
        )

    return success_response(msg="绑定已更新")


@admin_router.delete(
    "/reset/{project}",
    summary="按项目清除部署记录",
    description="清除指定项目的合约部署记录（危险操作）",
    dependencies=[Depends(require_admin)],
)
async def reset_project_deployments(
    project: str,
    request: ResetDeployRequest,
    service: ContractService = Depends(get_contract_service),
):
    """
    按项目清除部署记录

    ⚠️ 危险操作！

    项目类型：
    - common: 公共合约 (KYCManager)
    - mock: Mock 合约 (MockUSDT, MockUSDC)
    - fake: 项目合约组
    """
    expected_confirm = project.upper()
    if request.confirm != expected_confirm:
        raise ValidationException(message=f"请输入 '{expected_confirm}' 确认此操作")

    # 从数据库查询有效的项目名
    valid_projects = (
        await DeployInfo.filter(
            network=service.network,
            is_active=True,
        )
        .distinct()
        .values_list("project", flat=True)
    )

    if project not in valid_projects:
        raise ValidationException(
            message=f"无效的项目名: {project}。有效值: {list(valid_projects)}"
        )

    deleted_count = await service.reset_deployments_by_project(project)

    return success_response(
        object_data={
            "deleted_count": deleted_count,
            "project": project,
            "network": service.network,
        },
        msg=f"已清除 {project} 项目的 {deleted_count} 条部署记录",
    )


@admin_router.delete(
    "/reset",
    summary="清除所有部署记录",
    description="清除当前网络的所有合约部署记录（危险操作）",
    dependencies=[Depends(require_admin)],
)
async def reset_all_deployments(
    request: ResetDeployRequest,
    service: ContractService = Depends(get_contract_service),
):
    """
    清除所有部署记录

    ⚠️ 危险操作！
    清除后需要重新运行部署脚本
    """
    if request.confirm != "RESET ALL":
        raise ValidationException(message="请输入 'RESET ALL' 确认此操作")

    deleted_count = await service.reset_all_deployments()

    return success_response(
        object_data={
            "deleted_count": deleted_count,
            "network": service.network,
        },
        msg=f"已清除 {deleted_count} 条部署记录",
    )
