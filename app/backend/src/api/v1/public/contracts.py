"""
公开合约路由 - 合约地址查询

路由前缀: /api/v1/public/contracts
"""

from falib.utils.handlers import success_response
from fastapi import APIRouter, Depends

from src.services.contract.service import ContractService, get_contract_service
from src.models.deploy import DeployInfo

router = APIRouter()


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

