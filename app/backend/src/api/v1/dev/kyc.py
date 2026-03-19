"""
KYC 开发工具路由
仅在 dev/test 环境可用

路由前缀: /api/v1/dev/kyc

环境保护由 dev/__init__.py 的 router 级别依赖统一处理
"""

from falib.utils.handlers import create_success_response
from fastapi import APIRouter, Depends

from src.common.dependencies import get_kyc_service
from src.schemas.kyc import RecordAdmissionRequest
from src.services import KycService

router = APIRouter()


@router.post(
    "/quick-approve/{wallet_address}",
    summary="Quick KYC Approval (Dev Only)",
    description="Instantly approve KYC for development/testing (not available in production)",
)
async def quick_approve_kyc(
    wallet_address: str, service: KycService = Depends(get_kyc_service)
):
    """
    快速通过 KYC (开发工具)

    - **wallet_address**: 钱包地址

    本接口只会将记录推进为待链上确认状态（或链上已验证时直接对齐）。
    不会由后端代签名发交易。
    """
    result = await service.quick_approve(wallet_address)

    msg = "Quick approve prepared; please confirm on-chain with wallet"
    if result.on_chain_sync_status and result.on_chain_sync_status.value == "synced":
        msg = "Quick approve already synced from on-chain state"

    return create_success_response(
        object_data=result.model_dump(mode="json"),
        msg=msg,
    )


@router.post(
    "/quick-approve/{wallet_address}/confirm",
    summary="Confirm Quick KYC Admission",
    description="Confirm wallet-submitted on-chain quick approve transaction",
)
async def confirm_quick_approve_kyc(
    wallet_address: str,
    data: RecordAdmissionRequest,
    service: KycService = Depends(get_kyc_service),
):
    """
    确认 quick-approve 的链上交易

    - **wallet_address**: 钱包地址
    - **tx_hash**: 前端钱包发起 addInvestor 的交易哈希
    """
    result = await service.quick_record_admission(wallet_address, data.tx_hash)
    return create_success_response(
        object_data=result.model_dump(mode="json"),
        msg="Quick approve confirmed on-chain",
    )


@router.delete(
    "/reset/{wallet_address}",
    summary="Reset KYC (Dev Only)",
    description="Reset KYC status for development/testing (not available in production)",
)
async def reset_kyc(
    wallet_address: str, service: KycService = Depends(get_kyc_service)
):
    """
    重置 KYC 状态 (开发工具)

    - **wallet_address**: 钱包地址

    ⚠️ Only available in local/test environment.
    Will return 403 in production.
    """
    success = await service.reset_kyc(wallet_address)
    return create_success_response(
        object_data={"wallet_address": wallet_address, "reset": success},
        msg="KYC reset successfully" if success else "No KYC record found",
    )
