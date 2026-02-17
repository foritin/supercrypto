"""
合约验证路由

路由前缀: /api/v1/admin/contracts
包含合约地址验证、格式检查、链上存在性验证等端点

Requirements: 2.1
"""

from falib.utils.handlers import create_success_response
from fastapi import APIRouter, Depends

from src.schemas.contract import (
    ContractValidationResult,
    ValidateContractRequest,
    ValidateContractResponse,
)
from src.security import require_admin
from src.services import AssetService

router = APIRouter()


# ============ 合约验证端点 ============


@router.post(
    "/validate",
    summary="Validate Contract Address",
    description="Validate contract address format and on-chain existence",
    response_model=None,
)
async def validate_contracts(
    request: ValidateContractRequest,
    _admin=Depends(require_admin),
):
    """验证合约地址 — 批量验证格式和链上存在性，可选检查 RWA Token 绑定状态"""
    validation_results = await AssetService.validate_contracts_batch(request.addresses)

    results = {}
    all_valid = True
    for address, (exists, message) in validation_results.items():
        format_valid = address.startswith("0x") and len(address) == 42
        results[address] = ContractValidationResult(
            address=address,
            format_valid=format_valid,
            exists_on_chain=exists,
            message=message,
        )
        if not format_valid or not exists:
            all_valid = False

    rwa_binding = None
    if request.check_rwa_binding and request.rwa_token_name:
        (
            is_bound,
            msg,
            bound_address,
        ) = await AssetService.validate_rwa_token_binding(
            contract_addresses=request.addresses,
            rwa_token_name=request.rwa_token_name,
        )
        rwa_binding = {
            "is_bound": is_bound,
            "message": msg,
            "bound_address": bound_address,
        }

    response = ValidateContractResponse(
        results=results, all_valid=all_valid, rwa_binding=rwa_binding
    )
    return create_success_response(object_data=response.model_dump())
