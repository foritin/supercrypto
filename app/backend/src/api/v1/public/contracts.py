"""
公开合约路由 - 合约地址查询

路由前缀: /api/v1/public/contracts

重构说明:
- 移除直接 ORM 查询（ContractDeployment.filter）
- 使用 ContractService.get_public_contract_address() 方法
- _Requirements: 1.3, 1.4_
"""

from falib.utils.handlers import success_response
from fastapi import APIRouter, Depends

from src.services.contract import ContractService, get_contract_service

router = APIRouter()


@router.get(
    "/{contract_name}",
    summary="获取单个合约地址",
    description="根据合约名称获取地址",
)
async def get_contract_address(
    contract_name: str,
    contract_service: ContractService = Depends(get_contract_service),
):
    """
    获取单个合约地址

    - **contract_name**: 合约名称（如 MockUSDT, Subscription）

    通过 ContractService 封装数据库查询，遵循分层架构原则。
    """
    contract_info = await contract_service.get_public_contract_address(contract_name)

    if not contract_info:
        return success_response(
            object_data=None, msg=f"Contract not found: {contract_name}"
        )

    return success_response(object_data=contract_info)
