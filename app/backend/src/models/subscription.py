"""
Subscription 认购模型
"""

from datetime import datetime, timezone
from decimal import Decimal

from tortoise import fields

from src.models.base import AbstractModel, TimestampMixin
from src.schemas.enums import SubscriptionStatus, TokenType


class Subscription(AbstractModel, TimestampMixin):
    """认购记录表"""

    # 用户信息
    wallet_address = fields.CharField(
        max_length=128, db_index=True, description="用户钱包地址"
    )

    # 资产信息
    asset = fields.ForeignKeyField(
        "models.Asset",
        related_name="subscriptions",
        on_delete=fields.RESTRICT,
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
        """是否已到期 (T+1起息：定期需检查锁定期结束+满1天)"""
        # 活期模式: lock_period == 0，始终可赎回
        if self.lock_period == 0:
            return True
        if not self.end_date:
            return False
        # 定期模式：锁定期结束且满1天
        return datetime.now(timezone.utc) >= self.end_date

    @property
    def can_redeem(self) -> bool:
        """是否可赎回 (活期：始终可赎回；定期：锁定期结束)"""
        # 活期模式：随时可赎回
        if self.lock_period == 0:
            return True
        # 定期模式：锁定期结束即可赎回（收益按T+1计算）
        if not self.end_date:
            return False
        return datetime.now(timezone.utc) >= self.end_date

    def get_redeemable_interest(self, current_time: datetime = None) -> Decimal:
        """
        计算当前可赎回的收益 (T+1起息：未满1天返回0)
        
        Args:
            current_time: 当前时间，默认为 UTC now
            
        Returns:
            可赎回收益金额
        """
        if current_time is None:
            current_time = datetime.now(timezone.utc)
        
        # 检查是否满1天
        if not self.start_date:
            return Decimal(0)
        
        time_diff = current_time - self.start_date
        if time_diff.total_seconds() < 24 * 3600:  # 未满24小时
            return Decimal(0)
        
        # 已满1天，返回预期收益（实际赎回时由合约计算）
        return self.expected_interest

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
