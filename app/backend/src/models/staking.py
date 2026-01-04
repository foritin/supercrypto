"""
Staking (质押挖矿) 数据模型
"""
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from tortoise import fields

from src.models.base import AbstractModel, TimestampMixin
from src.shared.schemas.enums import StakingPeriod, StakingStatus


# 质押周期对应的奖励倍数
STAKING_MULTIPLIERS = {
    StakingPeriod.DAYS_15: Decimal("1.0"),
    StakingPeriod.DAYS_30: Decimal("2.5"),
    StakingPeriod.DAYS_45: Decimal("4.5"),
    StakingPeriod.DAYS_60: Decimal("7.0"),
}

# 基础日产出率 (每天每个 RWA Token 产出的 PLT)
BASE_DAILY_RATE = Decimal("0.01")  # 可配置


class StakingRecord(AbstractModel, TimestampMixin):
    """
    质押记录
    
    记录用户的每笔质押信息
    """
    
    # 用户钱包地址
    wallet_address = fields.CharField(
        max_length=128,
        index=True,
        description="用户钱包地址"
    )
    
    # 关联的认购（质押会顺延认购赎回时间）
    subscription = fields.ForeignKeyField(
        "models.Subscription",
        related_name="staking_records",
        null=True,
        on_delete=fields.SET_NULL,
        description="关联的认购记录"
    )
    
    # 质押金额（RWA Token 数量）
    amount = fields.DecimalField(
        max_digits=36,
        decimal_places=18,
        description="质押的 RWA Token 数量"
    )
    
    # 质押周期（天）
    period = fields.IntField(
        description="质押周期（天）: 15/30/45/60"
    )
    
    # 奖励倍数
    multiplier = fields.DecimalField(
        max_digits=10,
        decimal_places=2,
        description="奖励倍数: 1.0/2.5/4.5/7.0"
    )
    
    # 时间信息
    start_date = fields.DatetimeField(
        description="质押开始时间"
    )
    end_date = fields.DatetimeField(
        description="质押到期时间"
    )
    
    # 奖励信息
    expected_rewards = fields.DecimalField(
        max_digits=36,
        decimal_places=18,
        default=0,
        description="预期 PLT 奖励"
    )
    claimed_rewards = fields.DecimalField(
        max_digits=36,
        decimal_places=18,
        default=0,
        description="已领取的 PLT 奖励"
    )
    
    # 状态
    status = fields.CharEnumField(
        StakingStatus,
        default=StakingStatus.ACTIVE,
        index=True,
        description="质押状态"
    )
    
    # 交易信息
    stake_tx_hash = fields.CharField(
        max_length=128,
        null=True,
        description="质押交易哈希"
    )
    unstake_tx_hash = fields.CharField(
        max_length=128,
        null=True,
        description="解押交易哈希"
    )
    
    # 环境
    environment = fields.CharField(
        max_length=32,
        index=True,
        default="local",
        description="环境: local/test/main"
    )

    class Meta:
        table = "staking_record"
        table_description = "质押记录"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Staking #{self.id} - {self.amount} RWA ({self.period} days)"
    
    @property
    def is_matured(self) -> bool:
        """是否已到期"""
        return datetime.now(timezone.utc) >= self.end_date
    
    @property
    def days_remaining(self) -> int:
        """剩余天数"""
        if self.is_matured:
            return 0
        delta = self.end_date - datetime.now(timezone.utc)
        return max(0, delta.days)
    
    @property
    def pending_rewards(self) -> Decimal:
        """待领取的奖励"""
        return self.expected_rewards - self.claimed_rewards
    
    @property
    def current_rewards(self) -> Decimal:
        """
        当前累积的奖励（基于已质押时间）
        
        公式: 基础产出 × 金额 × 已质押天数 × 倍数
        """
        if self.status == StakingStatus.UNSTAKED:
            return self.expected_rewards
        
        now = datetime.now(timezone.utc)
        if now < self.start_date:
            return Decimal(0)
        
        # 计算已质押天数
        staked_days = (min(now, self.end_date) - self.start_date).days
        if staked_days <= 0:
            return Decimal(0)
        
        return BASE_DAILY_RATE * self.amount * staked_days * self.multiplier
    
    @staticmethod
    def calculate_rewards(
        amount: Decimal,
        period: int,
        multiplier: Decimal
    ) -> Decimal:
        """
        计算预期奖励
        
        公式: 基础产出 × 金额 × 天数 × 倍数
        """
        return BASE_DAILY_RATE * amount * period * multiplier
    
    @staticmethod
    def calculate_end_date(start_date: datetime, period: int) -> datetime:
        """计算到期日期"""
        return start_date + timedelta(days=period)


class StakingLimit(AbstractModel, TimestampMixin):
    """
    质押限额
    
    管理每日质押限额和累积
    """
    
    # 日期（用于按天管理限额）
    date = fields.DateField(
        index=True,
        description="日期"
    )
    
    # 基础限额
    base_limit = fields.DecimalField(
        max_digits=36,
        decimal_places=18,
        description="当日基础限额"
    )
    
    # 累积限额（前一日未用）
    carried_limit = fields.DecimalField(
        max_digits=36,
        decimal_places=18,
        default=0,
        description="累积的未用限额"
    )
    
    # 已使用限额
    used_limit = fields.DecimalField(
        max_digits=36,
        decimal_places=18,
        default=0,
        description="已使用限额"
    )
    
    # 环境
    environment = fields.CharField(
        max_length=32,
        index=True,
        default="local",
        description="环境: local/test/main"
    )

    class Meta:
        table = "staking_limit"
        table_description = "质押限额"
        unique_together = [("date", "environment")]

    def __str__(self):
        return f"Limit {self.date} - {self.remaining_limit}/{self.total_limit}"
    
    @property
    def total_limit(self) -> Decimal:
        """总限额（基础 + 累积）"""
        return self.base_limit + self.carried_limit
    
    @property
    def remaining_limit(self) -> Decimal:
        """剩余限额"""
        return max(Decimal(0), self.total_limit - self.used_limit)
    
    @property
    def is_exhausted(self) -> bool:
        """限额是否已耗尽"""
        return self.remaining_limit <= 0


class RewardClaim(AbstractModel, TimestampMixin):
    """
    奖励领取记录
    """
    
    # 用户钱包地址
    wallet_address = fields.CharField(
        max_length=128,
        index=True,
        description="用户钱包地址"
    )
    
    # 关联的质押记录
    staking_record = fields.ForeignKeyField(
        "models.StakingRecord",
        related_name="reward_claims",
        on_delete=fields.CASCADE,
        description="关联的质押记录"
    )
    
    # 领取金额
    amount = fields.DecimalField(
        max_digits=36,
        decimal_places=18,
        description="领取的 PLT 数量"
    )
    
    # 交易哈希
    tx_hash = fields.CharField(
        max_length=128,
        null=True,
        description="领取交易哈希"
    )
    
    # 环境
    environment = fields.CharField(
        max_length=32,
        index=True,
        default="local",
        description="环境: local/test/main"
    )

    class Meta:
        table = "reward_claim"
        table_description = "奖励领取记录"

    def __str__(self):
        return f"Claim #{self.id} - {self.amount} PLT"

