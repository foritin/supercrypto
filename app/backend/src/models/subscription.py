"""
Subscription 认购模型
"""

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from tortoise import fields

from src.models.base import AbstractModel, TimestampMixin
from src.shared.schemas.enums import SubscriptionStatus, TokenType


class Subscription(AbstractModel, TimestampMixin):
    """认购记录表"""

    # 用户信息
    wallet_address = fields.CharField(
        max_length=128, index=True, description="用户钱包地址"
    )

    # 资产信息
    asset = fields.ForeignKeyField(
        "models.Asset",
        related_name="subscriptions",
        on_delete=fields.CASCADE,
        description="关联资产",
    )

    # 认购信息
    amount = fields.DecimalField(
        max_digits=36, decimal_places=18, description="认购金额 (稳定币)"
    )
    token_type = fields.CharEnumField(
        TokenType, max_length=10, default=TokenType.USDT, description="支付代币类型"
    )
    lock_period = fields.IntField(description="锁定期 (月)")
    apy = fields.DecimalField(
        max_digits=10, decimal_places=4, description="认购时的 APY (%)"
    )

    # RWA Token 信息
    rwa_token_amount = fields.DecimalField(
        max_digits=36, decimal_places=18, default=0, description="获得的 RWA Token 数量"
    )

    # 时间信息
    start_date = fields.DatetimeField(null=True, description="认购开始时间")
    end_date = fields.DatetimeField(null=True, description="锁定期结束时间")
    original_end_date = fields.DatetimeField(
        null=True, description="原始到期时间 (质押可能延期)"
    )
    redeemed_at = fields.DatetimeField(null=True, description="赎回时间")

    # 收益信息
    expected_interest = fields.DecimalField(
        max_digits=36, decimal_places=18, default=0, description="预期利息"
    )
    actual_interest = fields.DecimalField(
        max_digits=36, decimal_places=18, default=0, description="实际利息 (赎回时计算)"
    )

    # 交易信息
    tx_hash = fields.CharField(max_length=128, null=True, description="认购交易哈希")
    redeem_tx_hash = fields.CharField(
        max_length=128, null=True, description="赎回交易哈希"
    )

    # 状态
    status = fields.CharEnumField(
        SubscriptionStatus,
        max_length=20,
        default=SubscriptionStatus.PENDING,
        description="认购状态",
    )

    # 环境区分
    environment = fields.CharField(
        max_length=20, default="hardhat", description="环境标识"
    )

    class Meta:
        table = "subscription"
        table_description = "认购记录表"
        indexes = [
            ("wallet_address", "environment"),
            ("asset_id", "environment"),
            ("status",),
            ("end_date",),
        ]
        # tx_hash + environment 唯一约束，防止重复认购
        unique_together = [("tx_hash", "environment")]

    def __str__(self):
        return f"Subscription(id={self.id}, wallet={self.wallet_address[:10]}..., asset={self.asset_id})"

    @property
    def is_matured(self) -> bool:
        """是否已到期 (活期模式: 始终可赎回)"""
        # 活期模式: lock_period == 0，始终可赎回
        if self.lock_period == 0:
            return True
        if not self.end_date:
            return False
        return datetime.now(timezone.utc) >= self.end_date

    @property
    def days_remaining(self) -> int:
        """剩余天数 (活期模式: 始终返回 0)"""
        # 活期模式: 随时可赎回
        if self.lock_period == 0:
            return 0
        if not self.end_date:
            return 0
        delta = self.end_date - datetime.now(timezone.utc)
        return max(0, delta.days)

    @property
    def total_return(self) -> Decimal:
        """总回报 (本金 + 利息)"""
        interest = (
            self.actual_interest if self.actual_interest > 0 else self.expected_interest
        )
        return self.amount + interest

    @classmethod
    def calculate_expected_interest(
        cls, amount: Decimal, apy: Decimal, lock_months: int
    ) -> Decimal:
        """计算预期利息 (活期模式: lock_months=0 时按实际持有时间计算)"""
        if lock_months == 0:
            # 活期模式：预期利息暂时按 1 个月估算
            return amount * (apy / 100) * (Decimal(1) / Decimal(12))
        # 利息 = 本金 × APY × (锁定月数/12)
        return amount * (apy / 100) * (Decimal(lock_months) / Decimal(12))

    @classmethod
    def calculate_end_date(cls, start_date: datetime, lock_months: int) -> datetime:
        """计算到期日期 (活期模式: lock_months=0 时立即可赎回)"""
        if lock_months == 0:
            # 活期模式：立即可赎回
            return start_date
        # 简单计算：每月按30天
        return start_date + timedelta(days=lock_months * 30)
