"""
交易模型
"""
from enum import Enum
from tortoise import fields
from src.models.base import AbstractModel, TimestampMixin


class TransactionStatus(str, Enum):
    """交易状态枚举"""
    PENDING = "pending"       # 待确认
    CONFIRMED = "confirmed"   # 已确认
    FAILED = "failed"         # 失败
    CANCELLED = "cancelled"   # 已取消


class TransactionType(str, Enum):
    """交易类型枚举"""
    TRANSFER = "transfer"     # 转账
    CONTRACT = "contract"     # 合约调用
    MINT = "mint"             # 铸造
    SWAP = "swap"             # 兑换


class Transaction(AbstractModel, TimestampMixin):
    """交易表"""
    
    tx_hash = fields.CharField(max_length=128, unique=True, description="交易哈希")
    from_address = fields.CharField(max_length=128, description="发送地址")
    to_address = fields.CharField(max_length=128, description="接收地址")
    amount = fields.DecimalField(
        max_digits=36,
        decimal_places=18,
        default=0,
        description="金额"
    )
    network = fields.CharField(max_length=20, default="ethereum", description="网络")
    status = fields.CharEnumField(
        TransactionStatus,
        max_length=20,
        default=TransactionStatus.PENDING,
        description="交易状态"
    )
    tx_type = fields.CharEnumField(
        TransactionType,
        max_length=20,
        default=TransactionType.TRANSFER,
        description="交易类型"
    )
    gas_price = fields.CharField(max_length=64, null=True, description="Gas价格")
    gas_used = fields.CharField(max_length=64, null=True, description="Gas使用量")
    block_number = fields.BigIntField(null=True, description="区块号")
    block_timestamp = fields.DatetimeField(null=True, description="区块时间")
    wallet_id = fields.IntField(null=True, description="关联的钱包ID")
    note = fields.TextField(null=True, description="备注")
    
    class Meta:
        table = "transaction"
        table_description = "交易表"
        indexes = [
            ("from_address", "to_address"),
            ("tx_hash",),
            ("status",),
            ("created_at",)
        ]
    
    def __str__(self):
        return f"Transaction(tx_hash={self.tx_hash[:10]}..., status={self.status})"

