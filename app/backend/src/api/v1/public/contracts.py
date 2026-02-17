"""
公开合约路由 - 合约地址查询

路由前缀: /api/v1/public/contracts

说明:
- 使用 ContractService 查询合约地址
- 支持按 scope 和 contract_type 过滤
- 利用 contract_deployment 表的 scope/contract_type 字段动态分类
- _Requirements: 1.3, 1.4_
"""

from typing import Optional

from falib.utils.handlers import create_success_response
from fastapi import APIRouter, Depends, Query

from src.common.dependencies import get_contract_service
from src.services import ContractService

router = APIRouter()


@router.get(
    "/addresses",
    summary="Get Contract Addresses (Grouped by Type)",
    description="Return active contract addresses grouped by contract_type for the current network. Supports scope and contract_type filtering.",
)
async def get_all_contract_addresses(
    scope: Optional[str] = Query(None, description="按作用域过滤: global / project"),
    contract_type: Optional[str] = Query(
        None,
        description="按功能类型过滤: stablecoin / defi / token / kyc / registry 等",
    ),
    contract_service: ContractService = Depends(get_contract_service),
):
    """
    批量获取合约地址，按 contract_type 分组

    返回格式:
    {
        "network": "hardhat",
        "contracts": {
            "stablecoin": [{"name": "USDT", "address": "0x...", ...}],
            "defi": [{"name": "VankeSubscription", "address": "0x...", ...}],
            ...
        }
    }
    """
    addresses = await contract_service.get_all_contract_addresses(
        scope=scope,
        contract_type=contract_type,
    )
    return create_success_response(object_data=addresses)


@router.get(
    "/{contract_name}",
    summary="Get Contract Address",
    description="Get a single contract address by name",
)
async def get_contract_address(
    contract_name: str,
    contract_service: ContractService = Depends(get_contract_service),
):
    """
    获取单个合约地址

    - **contract_name**: 合约名称（如 USDT, VankeSubscription）
    """
    contract_info = await contract_service.get_public_contract_address(contract_name)

    if not contract_info:
        return create_success_response(
            object_data=None, msg=f"Contract not found: {contract_name}"
        )

    return create_success_response(object_data=contract_info)
