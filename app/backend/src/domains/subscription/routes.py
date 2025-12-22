"""
Subscription Domain - API Routes
"""

from decimal import Decimal
from typing import Optional

from falib.utils.handlers import create_success_response
from fastapi import APIRouter, Depends, HTTPException, Query, status

from src.domains.subscription.schemas import (
    RedeemRequest,
    SubscriptionCreateRequest,
    SubscriptionPreviewRequest,
)
from src.domains.subscription.service import SubscriptionService
from src.models.subscription import SubscriptionStatus
from src.shared.security import require_user

# 公开路由（无需认证）
public_router = APIRouter()

# 用户路由（需要认证，将在 router.py 中统一注入 require_user）
user_router = APIRouter()


def get_subscription_service() -> SubscriptionService:
    """依赖注入：获取认购服务"""
    return SubscriptionService()


# ============ 公开接口 ============


@public_router.get(
    "/preview", summary="预览认购收益", description="计算认购的预期收益和到期日期"
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


# ============ 用户接口（需要认证）============


@user_router.post("", summary="创建认购", description="创建新的认购记录")
async def create_subscription(
    data: SubscriptionCreateRequest,
    wallet_address: str = Depends(require_user),
    service: SubscriptionService = Depends(get_subscription_service),
):
    """
    创建认购

    - 需要 JWT 认证
    - 需要 KYC 验证
    - 需要足够的代币余额
    """
    result = await service.create_subscription(wallet_address, data)
    return create_success_response(
        object_data=result.model_dump(mode="json"),
        msg="Subscription created successfully",
    )


@user_router.get("", summary="获取认购列表", description="获取用户的认购记录列表")
async def list_subscriptions(
    status: Optional[SubscriptionStatus] = Query(None, description="状态筛选"),
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
        status=status,
        asset_id=asset_id,
        page=page,
        page_size=page_size,
    )

    return create_success_response(
        list_data=[item.model_dump(mode="json") for item in items],
        pagination={
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        },
    )


@user_router.get("/stats", summary="获取用户统计", description="获取用户的投资统计数据")
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


@user_router.get(
    "/{subscription_id}", summary="获取认购详情", description="根据ID获取认购的详细信息"
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


@user_router.post(
    "/{subscription_id}/redeem", summary="赎回认购", description="赎回已到期的认购"
)
async def redeem_subscription(
    subscription_id: int,
    data: RedeemRequest,
    wallet_address: str = Depends(require_user),
    service: SubscriptionService = Depends(get_subscription_service),
):
    """
    赎回认购

    - 需要 JWT 认证
    - 只能赎回已到期的认购
    - 需要提供赎回交易哈希
    """
    result = await service.redeem_subscription(
        subscription_id, wallet_address, data.tx_hash
    )
    return create_success_response(
        object_data=result.model_dump(mode="json"),
        msg="Subscription redeemed successfully",
    )
