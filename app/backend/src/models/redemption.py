"""
Redemption 赎回模型
国库多签赎回系统数据模型
"""

from tortoise import fields

from src.models.base import AbstractModel, TimestampMixin
from src.schemas.enums.redemption import RedemptionEventType, RedemptionStatus


class RedemptionRequest(AbstractModel, TimestampMixin):
    """赎回请求表 - 记录用户赎回申请和多签状态"""

    # 关联
    subscription = fields.ForeignKeyField(
        "models.Subscription",
        related_name="redemption_requests",
        on_delete=fields.CASCADE,
        description="关联认购记录",
    )
    wallet_address = fields.CharField(
        max_length=128, db_index=True, description="用户钱包地址"
    )

    # 金额信息
    principal = fields.DecimalField(
        max_digits=36, decimal_places=18, description="本金金额"
    )
    interest = fields.DecimalField(
        max_digits=36, decimal_places=18, description="利息金额"
    )
    total_amount = fields.DecimalField(
        max_digits=36, decimal_places=18, description="总金额 (本金+利息)"
    )

    # 多签提案信息
    proposal_id = fields.IntField(null=True, description="链上提案ID")
    proposal_tx_hash = fields.CharField(
        max_length=128, null=True, description="创建提案的交易哈希"
    )

    # 状态
    status = fields.CharEnumField(
        RedemptionStatus,
        max_length=20,
        default=RedemptionStatus.PENDING,
        description="赎回状态",
    )

    # 执行信息
    executed_at = fields.DatetimeField(null=True, description="执行时间")
    execute_tx_hash = fields.CharField(
        max_length=128, null=True, description="执行交易哈希"
    )

    # 拒绝信息
    rejected_at = fields.DatetimeField(null=True, description="拒绝时间")
    rejected_by = fields.CharField(max_length=128, null=True, description="拒绝者地址")
    rejection_reason = fields.TextField(null=True, description="拒绝原因")

    # 环境
    environment = fields.CharField(
        max_length=20, default="hardhat", description="环境标识"
    )

    class Meta:
        table = "redemption_request"
        table_description = "赎回请求表"
        indexes = [
            ("wallet_address", "environment"),
            ("status", "environment"),
            ("proposal_id",),
            ("subscription", "environment"),
        ]

    def __str__(self):
        return (
            f"RedemptionRequest(id={self.id}, wallet={self.wallet_address[:10]}..., "
            f"status={self.status}, amount={self.total_amount})"
        )

    @property
    def signature_count(self) -> int:
        """当前签名数量"""
        if hasattr(self, "signatures"):
            return len(self.signatures)
        return 0


class RedemptionSignature(AbstractModel):
    """签名记录表 - 记录多签成员的签名"""

    redemption = fields.ForeignKeyField(
        "models.RedemptionRequest",
        related_name="signatures",
        on_delete=fields.CASCADE,
        description="关联赎回请求",
    )
    signer_address = fields.CharField(
        max_length=128, db_index=True, description="签名者地址"
    )
    signed_at = fields.DatetimeField(auto_now_add=True, description="签名时间")
    tx_hash = fields.CharField(max_length=128, description="签名交易哈希")

    class Meta:
        table = "redemption_signature"
        table_description = "赎回签名记录表"
        unique_together = (("redemption", "signer_address"),)
        indexes = [
            ("signer_address",),
            ("redemption",),
        ]

    def __str__(self):
        return (
            f"RedemptionSignature(redemption={self.redemption_id}, "
            f"signer={self.signer_address[:10]}..., tx={self.tx_hash[:10]}...)"
        )


class RedemptionEvent(AbstractModel, TimestampMixin):
    """赎回事件表 - 记录赎回全链路关键节点"""

    redemption = fields.ForeignKeyField(
        "models.RedemptionRequest",
        related_name="events",
        on_delete=fields.CASCADE,
        description="关联赎回请求",
    )
    event_type = fields.CharEnumField(
        RedemptionEventType,
        max_length=32,
        description="事件类型",
    )
    status = fields.CharEnumField(
        RedemptionStatus,
        max_length=20,
        null=True,
        description="事件对应赎回状态",
    )
    actor_address = fields.CharField(
        max_length=128,
        null=True,
        description="事件操作人地址",
    )
    tx_hash = fields.CharField(
        max_length=128,
        null=True,
        description="相关交易哈希",
    )
    message = fields.TextField(null=True, description="事件说明")
    metadata = fields.JSONField(null=True, description="扩展元数据")

    class Meta:
        table = "redemption_event"
        table_description = "赎回事件表"
        indexes = [
            ("redemption", "created_at"),
            ("event_type",),
            ("status",),
        ]

    def __str__(self):
        return (
            f"RedemptionEvent(redemption={self.redemption_id}, "
            f"type={self.event_type}, status={self.status})"
        )
