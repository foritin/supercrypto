"""
合约验证路由

路由前缀: /api/v1/admin/contracts
包含合约地址验证、格式检查、链上存在性验证等端点

Requirements: 2.1
"""

from typing import Optional

from falib.utils.handlers import create_success_response
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from src.services.asset.validators import ContractValidator
from src.shared.security import require_admin

router = APIRouter()


# ============ Request/Response Schemas ============


class ValidateContractRequest(BaseModel):
    """合约地址验证请求"""

    addresses: list[str] = Field(
        ..., min_length=1, max_length=10, description="要验证的合约地址列表，最多10个"
    )
    check_rwa_binding: bool = Field(
        default=False, description="是否检查 RWA Token 绑定状态"
    )
    rwa_token_name: Optional[str] = Field(
        default=None, description="RWA Token 名称，check_rwa_binding=True 时必填"
    )


class ContractValidationResult(BaseModel):
    """单个合约验证结果"""

    address: str
    format_valid: bool
    exists_on_chain: bool
    message: str


class ValidateContractResponse(BaseModel):
    """合约验证响应"""

    results: dict[str, ContractValidationResult]
    all_valid: bool
    rwa_binding: Optional[dict] = None


# ============ 合约验证端点 ============


@router.post(
    "/validate",
    summary="验证合约地址",
    description="验证合约地址格式和链上存在性",
    response_model=None,
)
async def validate_contracts(
    request: ValidateContractRequest,
    _admin=Depends(require_admin),
):
    """
    验证合约地址

    支持批量验证（最多10个地址），检查：
    1. 地址格式是否正确 (0x + 40位十六进制)
    2. 链上是否存在代码 (区分合约地址和EOA)
    3. 可选：检查 RWA Token 绑定状态

    Args:
        request: 验证请求，包含地址列表和可选的 RWA 绑定检查参数

    Returns:
        验证结果字典，每个地址的验证状态

    Example Request:
        {
            "addresses": ["0x1234...", "0x5678..."],
            "check_rwa_binding": true,
            "rwa_token_name": "FakeRWAToken"
        }

    Example Response:
        {
            "code": 200,
            "data": {
                "object": {
                    "results": {
                        "0x1234...": {
                            "address": "0x1234...",
                            "format_valid": true,
                            "exists_on_chain": true,
                            "message": "合约地址有效"
                        }
                    },
                    "all_valid": true,
                    "rwa_binding": {
                        "is_bound": true,
                        "message": "已绑定",
                        "bound_address": "0x1234..."
                    }
                }
            }
        }
    """
    # 批量验证合约地址
    validation_results = await ContractValidator.validate_contracts_batch(
        request.addresses
    )

    # 构建响应
    results = {}
    all_valid = True

    for address, (exists, message) in validation_results.items():
        # validate_contracts_batch 返回 (exists, message)
        # format_valid 通过地址格式检查（以 0x 开头且长度正确）
        format_valid = address.startswith("0x") and len(address) == 42
        results[address] = ContractValidationResult(
            address=address,
            format_valid=format_valid,
            exists_on_chain=exists,
            message=message,
        )
        if not format_valid or not exists:
            all_valid = False

    # 可选: 检查 RWA Token 绑定
    rwa_binding = None
    if request.check_rwa_binding and request.rwa_token_name:
        (
            is_bound,
            msg,
            bound_address,
        ) = await ContractValidator.validate_rwa_token_binding(
            contract_addresses=request.addresses,
            rwa_token_name=request.rwa_token_name,
        )
        rwa_binding = {
            "is_bound": is_bound,
            "message": msg,
            "bound_address": bound_address,
        }

    response = ValidateContractResponse(
        results=results,
        all_valid=all_valid,
        rwa_binding=rwa_binding,
    )

    return create_success_response(object_data=response.model_dump())
