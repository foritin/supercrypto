"""
质押相关枚举
"""

from enum import Enum


class StakingStatus(str, Enum):
    """质押状态"""

    ACTIVE = "active"  # 质押中
    MATURED = "matured"  # 已到期（可解押/领取）
    UNSTAKED = "unstaked"  # 已解押
    CLAIMED = "claimed"  # 已领取奖励
    CANCELLED = "cancelled"  # 已取消


class StakingPeriod(int, Enum):
    """质押周期（天）"""

    DAYS_15 = 15
    DAYS_30 = 30
    DAYS_45 = 45
    DAYS_60 = 60
