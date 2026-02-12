"""
KYC 开发工具路由
仅在 dev/test 环境可用

路由前缀: /api/v1/dev/kyc

环境保护由 dev/__init__.py 的 router 级别依赖统一处理
"""

from falib.utils.handlers import create_success_response
from fastapi import APIRouter, Depends

from src.services.kyc.service import KycService

router = APIRouter()


def get_kyc_service() -> KycService:
    """依赖注入：获取 KYC 服务"""
    return KycService()


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

    ⚠️ Only available in local/test environment.
    Will return 403 in production.
    """
    result = await service.quick_approve(wallet_address)
    return create_success_response(
        object_data=result.model_dump(mode="json"),
        msg="KYC approved successfully (dev mode)",
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
