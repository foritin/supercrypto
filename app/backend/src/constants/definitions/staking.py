"""
质押相关业务常量

集中定义质押挖矿相关的常量，避免在 models 和 services 中重复定义。
"""

from decimal import Decimal

from src.schemas.enums import StakingPeriod

# PLT 代币总量
PLT_TOTAL_SUPPLY = Decimal("100000000")  # 1 亿枚

# PLT 质押奖励池
PLT_STAKING_POOL = Decimal("40000000")  # 40% 用于质押奖励

# 质押周期对应的奖励倍数
STAKING_MULTIPLIERS = {
    StakingPeriod.DAYS_15: Decimal("1.0"),
    StakingPeriod.DAYS_30: Decimal("2.5"),
    StakingPeriod.DAYS_45: Decimal("4.5"),
    StakingPeriod.DAYS_60: Decimal("7.0"),
}

# 基础日产出率 (每天每个 RWA Token 产出的 PLT)
BASE_DAILY_RATE = Decimal("0.01")
