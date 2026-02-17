"""
Admin Domain - Schemas
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from src.schemas.base import PaginationParams
from src.schemas.enums import AuditAction

# ============ 平台统计 ============


class TVLBreakdown(BaseModel):
    """TVL 分解"""

    asset_id: int
    asset_name: str
    amount: float
    percentage: float


class TVLStatsResponse(BaseModel):
    """TVL 统计响应"""

    total_tvl: float = Field(..., description="总 TVL (USD)")
    change_24h: float = Field(0, description="24小时变化百分比")
    change_7d: float = Field(0, description="7天变化百分比")
    breakdown: List[TVLBreakdown] = Field(
        default_factory=list, description="按资产分解"
    )


class UserStatsResponse(BaseModel):
    """用户统计响应"""

    total_users: int = Field(..., description="总用户数")
    kyc_approved: int = Field(..., description="KYC 通过用户数")
    kyc_pending: int = Field(..., description="KYC 待审核用户数")
    kyc_rejected: int = Field(..., description="KYC 被拒用户数")
    new_users_24h: int = Field(0, description="24小时新增用户")
    new_users_7d: int = Field(0, description="7天新增用户")
    kyc_conversion_rate: float = Field(0, description="KYC 转化率")


class StakingPoolStatsResponse(BaseModel):
    """质押池统计响应"""

    total_staked: float = Field(..., description="总质押量")
    active_stakes: int = Field(..., description="活跃质押数")
    total_rewards_distributed: float = Field(..., description="已分发奖励")
    rewards_pool_remaining: float = Field(..., description="剩余奖励池")
    avg_stake_period: float = Field(0, description="平均质押周期 (天)")
    period_distribution: dict = Field(default_factory=dict, description="各周期分布")


class PlatformStatsResponse(BaseModel):
    """平台统计汇总响应"""

    tvl: TVLStatsResponse
    users: UserStatsResponse
    staking: StakingPoolStatsResponse
    active_subscriptions: int = Field(..., description="活跃认购数")
    total_subscriptions: int = Field(..., description="总认购数")
    total_assets: int = Field(..., description="资产数量")


# ============ 审计日志 ============


class AuditLogResponse(BaseModel):
    """审计日志响应"""

    id: int
    operator_address: str
    action: AuditAction
    target_type: Optional[str]
    target_id: Optional[str]
    details: Optional[dict]
    success: bool
    error_message: Optional[str]
    tx_hash: Optional[str]
    ip_address: Optional[str]
    environment: str
    created_at: datetime


class AuditLogListQuery(PaginationParams):
    """审计日志查询参数"""

    action: Optional[AuditAction] = None
    operator_address: Optional[str] = None
    target_type: Optional[str] = None
    success: Optional[bool] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    page_size: int = Field(20, ge=1, le=100)


class CreateAuditLogRequest(BaseModel):
    """创建审计日志请求（内部使用）"""

    operator_address: str
    action: AuditAction
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    details: Optional[dict] = None
    success: bool = True
    error_message: Optional[str] = None
    tx_hash: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
