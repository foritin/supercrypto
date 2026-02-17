"""
公开认购路由 - 认购预览

路由前缀: /api/v1/public/subscriptions
"""

from decimal import Decimal

from falib.utils.handlers import create_success_response
from fastapi import APIRouter, Depends, Query

from src.common.dependencies import get_subscription_service
from src.schemas.subscription import SubscriptionPreviewRequest
from src.services import SubscriptionService

router = APIRouter()


@router.get(
    "/preview",
    summary="Preview Subscription Returns",
    description="Calculate expected returns and maturity date for a subscription",
)
async def preview_subscription(
    asset_id: int = Query(..., description="资产ID"),
    amount: float = Query(..., gt=0, description="认购金额"),
    token_type: str = Query("USDT", description="支付代币 (USDT/USDC)"),
    lock_period: int = Query(3, description="锁定期 (3/6/12 月)"),
    service: SubscriptionService = Depends(get_subscription_service),
):
    """
    预览认购收益（公开接口）

    - **asset_id**: 资产ID
    - **amount**: 认购金额
    - **token_type**: 支付代币 (USDT/USDC)
    - **lock_period**: 锁定期 (3/6/12 月)
    """
    data = SubscriptionPreviewRequest(
        asset_id=asset_id,
        amount=Decimal(str(amount)),
        token_type=token_type,
        lock_period=lock_period,
    )
    result = await service.preview_subscription(data)
    return create_success_response(object_data=result.model_dump(mode="json"))
