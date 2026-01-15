"""
公开合约路由 - 合约地址查询

路由前缀: /api/v1/public/contracts
"""

from falib.utils.config import SETTINGS
from falib.utils.handlers import success_response
from fastapi import APIRouter

from src.models.contracts.contract import Contract
from src.shared.schemas.enums import ContractStatus

router = APIRouter()


@router.get(
    "/{contract_name}",
    summary="获取单个合约地址",
    description="根据合约名称获取地址",
)
async def get_contract_address(contract_name: str):
    """
    获取单个合约地址

    - **contract_name**: 合约名称（如 MockUSDT, Subscription）
    """
    contract = await Contract.filter(
        network=SETTINGS.NETWORK,
        name=contract_name,
        status=ContractStatus.ACTIVE,
    ).first()

    if not contract:
        return success_response(
            object_data=None, msg=f"Contract not found: {contract_name}"
        )

    return success_response(
        object_data={
            "name": contract.name,
            "address": contract.address,
            "project": contract.project_name,
            "network": SETTINGS.NETWORK,
        }
    )
