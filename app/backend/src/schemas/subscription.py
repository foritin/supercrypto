"""
Subscription Domain - Pydantic Schemas
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from src.schemas.base import PaginationParams
from src.schemas.enums import LockPeriod, SubscriptionStatus, TokenType


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


class SubscriptionPendingRequest(BaseModel):
    """创建待确认订单请求"""

    asset_id: int = Field(..., description="资产ID")
    amount: Decimal = Field(..., gt=0, description="认购金额")
    token_type: TokenType = Field(default=TokenType.USDT, description="支付代币")
    lock_period: LockPeriod = Field(
        default=LockPeriod.FLEXIBLE, description="锁定期(月), 0=活期"
    )


class SubscriptionPendingResponse(BaseModel):
    """创建待确认订单响应"""

    order_id: str
    status: str = "pending_confirmation"
    expires_at: datetime


class SubscriptionConfirmRequest(BaseModel):
    """确认认购请求（链上交易成功后提交）"""

    order_id: str = Field(..., min_length=8, description="待确认订单ID")
    tx_hash: str = Field(..., min_length=10, description="交易哈希")
    block_number: Optional[int] = Field(None, description="区块号")
    gas_used: Optional[str] = Field(None, description="Gas Used")
    effective_gas_price: Optional[str] = Field(None, description="Effective Gas Price")


class TransactionReceiptResponse(BaseModel):
    """交易回执轮询响应"""

    status: str
    block_number: Optional[int] = None
    gas_used: Optional[str] = None
    effective_gas_price: Optional[str] = None
    confirmations: Optional[int] = None


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

    model_config = ConfigDict(from_attributes=True)


class RedeemRequest(BaseModel):
    """赎回请求"""

    tx_hash: str = Field(..., description="赎回交易哈希")


class SubscriptionListQuery(PaginationParams):
    """认购列表查询参数"""

    status: Optional[SubscriptionStatus] = None
    asset_id: Optional[int] = None
