"""
链上交易审计模型 - Transaction Audit

用于记录所有链上交易的详细信息，包括：
- ETH/Token 转账
- 合约调用
- 质押/解质押操作
- 奖励领取等

设计原则：
- 只允许状态更新，不允许删除
- 可更新字段：status, block_number, block_timestamp, gas_used,
  effective_gas_price, gas_cost, error_message, updated_at, confirmed_at
"""

from typing import Set

from tortoise import fields

from src.common.exceptions import TransactionAuditImmutableError
from src.models.base import AbstractModel, TimestampMixin, get_utc_time
from src.schemas.enums.audit import TransactionAuditStatus, TransactionAuditType


class TransactionAudit(AbstractModel, TimestampMixin):
    """
    链上交易审计表

    记录所有链上交易的详细信息
    只允许状态更新，不允许删除
    """

    # === 交易基本信息 ===
    tx_hash = fields.CharField(
        max_length=128, unique=True, db_index=True, description="交易哈希"
    )
    chain_id = fields.IntField(db_index=True, description="链ID")
    network = fields.CharField(max_length=32, db_index=True, description="网络名称")

    # === 地址信息 ===
    from_address = fields.CharField(
        max_length=128, db_index=True, description="发送方地址"
    )
    to_address = fields.CharField(
        max_length=128, null=True, db_index=True, description="接收方地址"
    )
    value = fields.CharField(
        max_length=78, default="0", description="交易金额(Wei字符串)"
    )

    # === 交易类型和状态 ===
    tx_type = fields.CharEnumField(
        TransactionAuditType, max_length=32, db_index=True, description="交易类型"
    )
    status = fields.CharEnumField(
        TransactionAuditStatus,
        max_length=20,
        default=TransactionAuditStatus.PENDING,
        db_index=True,
        description="交易状态",
    )

    # === Token 信息 (ERC20 转账) ===
    token_address = fields.CharField(
        max_length=128, null=True, db_index=True, description="Token合约地址"
    )
    token_symbol = fields.CharField(max_length=32, null=True, description="Token符号")
    token_decimals = fields.IntField(null=True, description="Token精度")
    token_amount = fields.CharField(
        max_length=78, null=True, description="Token数量(原始字符串)"
    )

    # === 合约调用信息 ===
    contract_name = fields.CharField(max_length=128, null=True, description="合约名称")
    function_name = fields.CharField(
        max_length=128, null=True, description="调用函数名"
    )
    function_args = fields.JSONField(null=True, description="函数参数")

    # === Gas 信息 ===
    gas_price = fields.CharField(max_length=64, null=True, description="Gas价格(Wei)")
    gas_limit = fields.BigIntField(null=True, description="Gas限制")
    gas_used = fields.BigIntField(null=True, description="实际Gas消耗")
    effective_gas_price = fields.CharField(
        max_length=64, null=True, description="实际Gas价格"
    )
    gas_cost = fields.CharField(max_length=78, null=True, description="Gas费用(Wei)")

    # === 区块信息 ===
    block_number = fields.BigIntField(null=True, db_index=True, description="区块高度")
    block_timestamp = fields.DatetimeField(null=True, description="区块时间")
    nonce = fields.IntField(null=True, description="交易Nonce")

    # === 关联信息 ===
    operator_id = fields.IntField(null=True, db_index=True, description="操作者账户ID")
    related_audit_id = fields.IntField(
        null=True, db_index=True, description="关联的AuditLog ID"
    )

    # === 其他 ===
    description = fields.TextField(null=True, description="交易描述")
    extra_data = fields.JSONField(null=True, description="额外数据")
    error_message = fields.TextField(null=True, description="错误信息")

    # === 时间戳 ===
    confirmed_at = fields.DatetimeField(null=True, description="确认时间")

    # === 环境 ===
    environment = fields.CharField(
        max_length=32,
        default="hardhat",
        db_index=True,
        description="环境: hardhat/sepolia/mainnet",
    )

    class Meta:
        table = "transaction_audit"
        table_description = "链上交易审计表"
        ordering = ["-created_at"]

        # 复合索引 - 根据常见查询优化
        indexes = [
            # 按链和发送方查询
            ("chain_id", "from_address", "created_at"),
            # 按链和接收方查询
            ("chain_id", "to_address", "created_at"),
            # 按链和状态查询
            ("chain_id", "status", "created_at"),
            # 按Token地址查询
            ("token_address", "created_at"),
            # 按操作者查询
            ("operator_id", "created_at"),
        ]

    def __str__(self):
        return f"TransactionAudit({self.tx_hash[:16]}... {self.tx_type} {self.status})"

    # ==================== 不可变性保护 ====================

    # 允许更新的字段
    UPDATABLE_FIELDS: Set[str] = {
        "status",
        "block_number",
        "block_timestamp",
        "gas_used",
        "effective_gas_price",
        "gas_cost",
        "error_message",
        "updated_at",
        "confirmed_at",
    }

    async def save(self, *args, update_fields=None, **kwargs):
        """
        重写保存方法，限制可更新的字段

        只允许更新 UPDATABLE_FIELDS 中定义的字段
        """
        if self.id is not None:
            # 检查是否是已存在的记录
            exists = await TransactionAudit.filter(id=self.id).exists()
            if exists:
                # 如果指定了 update_fields，检查是否都是允许更新的字段
                if update_fields:
                    invalid_fields = set(update_fields) - self.UPDATABLE_FIELDS
                    if invalid_fields:
                        raise TransactionAuditImmutableError(
                            f"Cannot update fields {invalid_fields}: "
                            f"only {self.UPDATABLE_FIELDS} can be updated"
                        )
                # 如果没有指定 update_fields，只更新允许的字段
                else:
                    update_fields = list(self.UPDATABLE_FIELDS)

                # 确保 updated_at 被更新
                self.updated_at = get_utc_time()
                if "updated_at" not in update_fields:
                    update_fields.append("updated_at")

                kwargs["update_fields"] = update_fields

        return await super().save(*args, **kwargs)

    async def delete(self, *args, **kwargs):
        """
        重写删除方法，禁止删除交易审计记录
        """
        raise TransactionAuditImmutableError(
            f"Cannot delete transaction audit {self.tx_hash}: "
            "transaction audit records are immutable"
        )

    @classmethod
    async def bulk_delete(cls, *args, **kwargs):
        """禁止批量删除"""
        raise TransactionAuditImmutableError(
            "Bulk delete is not allowed for transaction audit records"
        )
