"""
用户认购路由 - 认购操作、列表、赎回

路由前缀: /api/v1/user/subscriptions
"""

from decimal import Decimal
from typing import Optional

from falib.utils.handlers import PaginationInfo, create_success_response
from fastapi import APIRouter, Depends, HTTPException, Query, status
from tortoise.transactions import in_transaction

from src.common.dependencies import get_asset_service, get_subscription_service
from src.schemas.enums import SubscriptionStatus
from src.schemas.subscription import RedeemRequest, SubscriptionCreateRequest
from src.security import require_user
from src.services import AssetService, SubscriptionService

router = APIRouter()


@router.post(
    "", summary="Create Subscription", description="Create a new subscription record"
)
async def create_subscription(
    data: SubscriptionCreateRequest,
    wallet_address: str = Depends(require_user),
    service: SubscriptionService = Depends(get_subscription_service),
    asset_service: AssetService = Depends(get_asset_service),
):
    """
    创建认购

    - 需要 JWT 认证
    - 需要 KYC 验证
    - 需要足够的代币余额
    """
    async with in_transaction() as conn:
        result = await service.create_subscription(wallet_address, data, using_db=conn)
        await asset_service.update_subscribed_amount(
            result.asset_id, data.amount, is_add=True, using_db=conn
        )
    return create_success_response(
        object_data=result.model_dump(mode="json"),
        msg="Subscription created successfully",
    )


@router.get(
    "", summary="List Subscriptions", description="Get the user's subscription records"
)
async def list_subscriptions(
    subscription_status: Optional[SubscriptionStatus] = Query(
        None, alias="status", description="状态筛选"
    ),
    asset_id: Optional[int] = Query(None, description="资产筛选"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=100, description="每页数量"),
    wallet_address: str = Depends(require_user),
    service: SubscriptionService = Depends(get_subscription_service),
):
    """
    获取用户认购列表

    - 需要 JWT 认证
    - 支持按状态、资产筛选
    - 支持分页
    """
    items, total, total_pages = await service.list_subscriptions(
        wallet_address=wallet_address,
        status=subscription_status,
        asset_id=asset_id,
        page=page,
        page_size=page_size,
    )

    return create_success_response(
        list_data=[item.model_dump(mode="json") for item in items],
        pagination=PaginationInfo(
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        ),
    )


@router.get(
    "/stats",
    summary="Get User Stats",
    description="Get the user's investment statistics",
)
async def get_user_stats(
    wallet_address: str = Depends(require_user),
    service: SubscriptionService = Depends(get_subscription_service),
):
    """
    获取用户投资统计

    - 需要 JWT 认证
    - 总投资金额
    - 总资产价值
    - 累计收益
    - 活跃认购数
    """
    stats = await service.get_user_stats(wallet_address)
    return create_success_response(object_data=stats)


@router.get(
    "/{subscription_id}",
    summary="Get Subscription Detail",
    description="Get detailed subscription information by ID",
)
async def get_subscription(
    subscription_id: int,
    wallet_address: str = Depends(require_user),
    service: SubscriptionService = Depends(get_subscription_service),
):
    """
    获取认购详情

    - 需要 JWT 认证
    - **subscription_id**: 认购ID
    """
    result = await service.get_subscription(subscription_id, wallet_address)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found"
        )

    return create_success_response(object_data=result.model_dump(mode="json"))


@router.post(
    "/{subscription_id}/redeem",
    summary="Redeem Subscription",
    description="Redeem a matured subscription",
)
async def redeem_subscription(
    subscription_id: int,
    data: RedeemRequest,
    wallet_address: str = Depends(require_user),
    service: SubscriptionService = Depends(get_subscription_service),
    asset_service: AssetService = Depends(get_asset_service),
):
    """
    赎回认购

    - 需要 JWT 认证
    - 只能赎回已到期的认购
    - 需要提供赎回交易哈希
    """
    async with in_transaction() as conn:
        result = await service.redeem_subscription(
            subscription_id, wallet_address, data.tx_hash, using_db=conn
        )
        await asset_service.update_subscribed_amount(
            result.asset_id, Decimal(str(result.amount)), is_add=False, using_db=conn
        )
    return create_success_response(
        object_data=result.model_dump(mode="json"),
        msg="Subscription redeemed successfully",
    )
