"""
Staking Domain - Schemas
"""
from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, Field

from src.shared.schemas.enums import StakingStatus

# ============ 请求 Schemas ============

class StakingPreviewRequest(BaseModel):
    """质押预览请求"""
    subscription_id: int = Field(..., description="关联的认购ID")
    amount: Decimal = Field(..., gt=0, description="质押金额")
    period: int = Field(..., description="质押周期（天）: 15/30/45/60")


class StakingCreateRequest(BaseModel):
    """创建质押请求"""
    subscription_id: int = Field(..., description="关联的认购ID")
    amount: Decimal = Field(..., gt=0, description="质押金额")
    period: int = Field(..., description="质押周期（天）: 15/30/45/60")
    tx_hash: str = Field(..., description="质押交易哈希")


class UnstakeRequest(BaseModel):
    """解押请求"""
    tx_hash: str = Field(..., description="解押交易哈希")


class ClaimRewardsRequest(BaseModel):
    """领取奖励请求"""
    tx_hash: str = Field(..., description="领取交易哈希")


# ============ 响应 Schemas ============

class StakingPreviewResponse(BaseModel):
    """质押预览响应"""
    subscription_id: int
    amount: float
    period: int
    multiplier: float
    expected_rewards: float
    end_date: datetime
    daily_rewards: float


class StakingResponse(BaseModel):
    """质押记录响应"""
    id: int
    wallet_address: str
    subscription_id: Optional[int]
    amount: float
    period: int
    multiplier: float
    start_date: datetime
    end_date: datetime
    expected_rewards: float
    claimed_rewards: float
    pending_rewards: float
    current_rewards: float
    days_remaining: int
    is_matured: bool
    status: StakingStatus
    stake_tx_hash: Optional[str]
    unstake_tx_hash: Optional[str]
    environment: str
    created_at: datetime
    updated_at: datetime


class StakingLimitResponse(BaseModel):
    """质押限额响应"""
    date: str
    base_limit: float
    carried_limit: float
    total_limit: float
    used_limit: float
    remaining_limit: float
    is_exhausted: bool


class StakingStatsResponse(BaseModel):
    """质押统计响应"""
    total_staked: float
    active_stakes: int
    total_rewards_earned: float
    pending_rewards: float
    current_apy: float


class RewardClaimResponse(BaseModel):
    """奖励领取响应"""
    id: int
    staking_id: int
    amount: float
    tx_hash: Optional[str]
    created_at: datetime


class PeriodOption(BaseModel):
    """周期选项"""
    period: int
    multiplier: float
    description: str


class StakingConfigResponse(BaseModel):
    """质押配置响应"""
    periods: List[PeriodOption]
    base_daily_rate: float
    min_stake_amount: float


# ============ PLT 代币信息 ============

class TokenAllocation(BaseModel):
    """代币分配项"""
    name: str = Field(..., description="分配项名称")
    amount: float = Field(..., description="分配数量")
    percentage: float = Field(..., description="占比百分比")
    description: str = Field(..., description="描述")
    color: str = Field(..., description="图表颜色")


class TokenDistributionResponse(BaseModel):
    """代币分配响应"""
    allocations: List[TokenAllocation]
    total_supply: float
    circulating_supply: float
    staking_pool_remaining: float


class PLTTokenInfoResponse(BaseModel):
    """PLT 代币信息响应"""
    name: str = Field(default="PLT Token")
    symbol: str = Field(default="PLT")
    total_supply: float = Field(..., description="总发行量")
    circulating_supply: float = Field(..., description="流通量")
    staking_rewards_pool: float = Field(..., description="质押奖励池总量")
    staking_rewards_distributed: float = Field(..., description="已分发奖励")
    staking_rewards_remaining: float = Field(..., description="剩余奖励池")
    current_price: Optional[float] = Field(None, description="当前价格 (USD)")
    market_cap: Optional[float] = Field(None, description="市值 (USD)")
    total_staked_value: float = Field(..., description="总质押价值")
    average_apy: float = Field(..., description="平均年化收益率")
    distribution: TokenDistributionResponse = Field(..., description="代币分配详情")

