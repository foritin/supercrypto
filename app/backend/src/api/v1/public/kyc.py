"""
公开 KYC 路由 - KYC 状态查询

路由前缀: /api/v1/public/kyc
"""

from fastapi import APIRouter, Depends

from src.services.kyc.schemas import KycStatusResponse
from src.services.kyc.service import KycService
from src.shared.schemas.base import ApiResponse

router = APIRouter()


def get_kyc_service() -> KycService:
    """依赖注入：获取 KYC 服务"""
    return KycService()


@router.get(
    "/status/{wallet_address}",
    response_model=ApiResponse[KycStatusResponse],
    summary="Get KYC Status",
    description="Get the KYC status for a wallet address",
)
async def get_kyc_status(
    wallet_address: str, service: KycService = Depends(get_kyc_service)
):
    """
    获取钱包的 KYC 状态（公开接口）

    - **wallet_address**: 钱包地址

    Returns the KYC status for the given wallet address in the current environment.
    If no KYC record exists, returns status 'not_started'.
    """
    result = await service.get_status(wallet_address)
    return ApiResponse(data=result)

