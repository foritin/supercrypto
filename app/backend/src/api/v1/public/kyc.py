"""
公开 KYC 路由 - KYC 状态查询

路由前缀: /api/v1/public/kyc
"""

from falib.utils.handlers import create_success_response
from fastapi import APIRouter, Depends

from src.common.dependencies import get_kyc_service
from src.services import KycService

router = APIRouter()


@router.get(
    "/status/{wallet_address}",
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
    return create_success_response(object_data=result.model_dump(mode="json"))
