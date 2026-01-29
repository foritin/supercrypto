"""
Subscription Domain - Pydantic Schemas
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field

from src.shared.schemas.enums import LockPeriod, SubscriptionStatus, TokenType


class SubscriptionPreviewRequest(BaseModel):
    """认购预览请求 - 活期模式"""

    asset_id: int = Field(..., description="资产ID")
    amount: Decimal = Field(..., gt=0, description="认购金额")
    token_type: TokenType = Field(default=TokenType.USDT, description="支付代币")
    lock_period: LockPeriod = Field(
        default=LockPeriod.FLEXIBLE, description="锁定期(月), 0=活期"
    )


class SubscriptionPreviewResponse(BaseModel):
    """认购预览响应"""

    asset_id: int
    asset_name: str
    asset_symbol: str
    amount: float
    token_type: str
    lock_period: int
    apy: float
    expected_interest: float
    total_return: float
    end_date: datetime
    rwa_token_amount: float


class SubscriptionCreateRequest(BaseModel):
    """创建认购请求 - 活期模式"""

    asset_id: int = Field(..., description="资产ID")
    amount: Decimal = Field(..., gt=0, description="认购金额")
    token_type: TokenType = Field(default=TokenType.USDT, description="支付代币")
    lock_period: LockPeriod = Field(
        default=LockPeriod.FLEXIBLE, description="锁定期(月), 0=活期"
    )
    tx_hash: str = Field(..., description="交易哈希")


class SubscriptionResponse(BaseModel):
    """认购响应"""

    id: int
    wallet_address: str
    asset_id: int
    asset_name: Optional[str] = None
    asset_symbol: Optional[str] = None
    amount: float
    token_type: str
    lock_period: int
    apy: float
    rwa_token_amount: float
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    expected_interest: float
    actual_interest: float
    total_return: float
    days_remaining: int
    is_matured: bool
    status: SubscriptionStatus
    tx_hash: Optional[str]
    redeem_tx_hash: Optional[str]
    environment: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RedeemRequest(BaseModel):
    """赎回请求"""

    tx_hash: str = Field(..., description="赎回交易哈希")


class SubscriptionListQuery(BaseModel):
    """认购列表查询参数"""

    status: Optional[SubscriptionStatus] = None
    asset_id: Optional[int] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=10, ge=1, le=100)
