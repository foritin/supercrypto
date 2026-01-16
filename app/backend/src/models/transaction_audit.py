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
from typing import Optional, Set

from tortoise import fields

from src.models.base import AbstractModel, TimestampMixin, get_utc_time
from src.shared.common.exceptions import BusinessException
from src.shared.schemas.enums.audit import (
    TransactionAuditStatus,
    TransactionAuditType,
)


class TransactionAuditImmutableError(BusinessException):
    """交易审计不可变异常"""
    
    def __init__(self, message: str = "Transaction audit field is immutable"):
        super().__init__(message=message, code=403)


class TransactionAudit(AbstractModel, TimestampMixin):
    """
    链上交易审计表
    
    记录所有链上交易的详细信息
    只允许状态更新，不允许删除
    """
    
    # === 交易基本信息 ===
    tx_hash = fields.CharField(
        max_length=128,
        unique=True,
        index=True,
        description="交易哈希"
    )
    chain_id = fields.IntField(
        index=True,
        description="链ID"
    )
    network = fields.CharField(
        max_length=32,
        index=True,
        description="网络名称"
    )
    
    # === 地址信息 ===
    from_address = fields.CharField(
        max_length=128,
        index=True,
        description="发送方地址"
    )
    to_address = fields.CharField(
        max_length=128,
        null=True,
        index=True,
        description="接收方地址"
    )
    value = fields.CharField(
        max_length=78,
        default="0",
        description="交易金额(Wei字符串)"
    )
    
    # === 交易类型和状态 ===
    tx_type = fields.CharEnumField(
        TransactionAuditType,
        max_length=32,
        index=True,
        description="交易类型"
    )
    status = fields.CharEnumField(
        TransactionAuditStatus,
        max_length=20,
        default=TransactionAuditStatus.PENDING,
        index=True,
        description="交易状态"
    )

    # === Token 信息 (ERC20 转账) ===
    token_address = fields.CharField(
        max_length=128,
        null=True,
        index=True,
        description="Token合约地址"
    )
    token_symbol = fields.CharField(
        max_length=32,
        null=True,
        description="Token符号"
    )
    token_decimals = fields.IntField(
        null=True,
        description="Token精度"
    )
    token_amount = fields.CharField(
        max_length=78,
        null=True,
        description="Token数量(原始字符串)"
    )
    
    # === 合约调用信息 ===
    contract_name = fields.CharField(
        max_length=128,
        null=True,
        description="合约名称"
    )
    function_name = fields.CharField(
        max_length=128,
        null=True,
        description="调用函数名"
    )
    function_args = fields.JSONField(
        null=True,
        description="函数参数"
    )
    
    # === Gas 信息 ===
    gas_price = fields.CharField(
        max_length=64,
        null=True,
        description="Gas价格(Wei)"
    )
    gas_limit = fields.BigIntField(
        null=True,
        description="Gas限制"
    )
    gas_used = fields.BigIntField(
        null=True,
        description="实际Gas消耗"
    )
    effective_gas_price = fields.CharField(
        max_length=64,
        null=True,
        description="实际Gas价格"
    )
    gas_cost = fields.CharField(
        max_length=78,
        null=True,
        description="Gas费用(Wei)"
    )
    
    # === 区块信息 ===
    block_number = fields.BigIntField(
        null=True,
        index=True,
        description="区块高度"
    )
    block_timestamp = fields.DatetimeField(
        null=True,
        description="区块时间"
    )
    nonce = fields.IntField(
        null=True,
        description="交易Nonce"
    )
    
    # === 关联信息 ===
    operator_id = fields.IntField(
        null=True,
        index=True,
        description="操作者账户ID"
    )
    related_audit_id = fields.IntField(
        null=True,
        index=True,
        description="关联的AuditLog ID"
    )
    
    # === 其他 ===
    description = fields.TextField(
        null=True,
        description="交易描述"
    )
    extra_data = fields.JSONField(
        null=True,
        description="额外数据"
    )
    error_message = fields.TextField(
        null=True,
        description="错误信息"
    )
    
    # === 时间戳 ===
    confirmed_at = fields.DatetimeField(
        null=True,
        description="确认时间"
    )
    
    # === 环境 ===
    environment = fields.CharField(
        max_length=32,
        default="local",
        index=True,
        description="环境: local/test/main"
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


# ==================== 交易审计辅助函数 ====================

async def record_transaction(
    tx_hash: str,
    chain_id: int,
    network: str,
    from_address: str,
    to_address: str,
    value: str,
    tx_type: TransactionAuditType,
    # Token 信息
    token_address: Optional[str] = None,
    token_symbol: Optional[str] = None,
    token_decimals: Optional[int] = None,
    token_amount: Optional[str] = None,
    # 关联信息
    operator_id: Optional[int] = None,
    related_audit_id: Optional[int] = None,
    contract_name: Optional[str] = None,
    function_name: Optional[str] = None,
    function_args: Optional[dict] = None,
    # Gas 信息
    gas_price: Optional[str] = None,
    gas_limit: Optional[int] = None,
    nonce: Optional[int] = None,
    # 其他
    description: Optional[str] = None,
    extra_data: Optional[dict] = None,
) -> TransactionAudit:
    """
    记录链上交易
    
    Args:
        tx_hash: 交易哈希
        chain_id: 链ID
        network: 网络名称
        from_address: 发送方地址
        to_address: 接收方地址
        value: 交易金额(Wei)
        tx_type: 交易类型
        token_address: Token地址
        token_symbol: Token符号
        token_decimals: Token精度
        token_amount: Token数量
        operator_id: 操作者ID
        related_audit_id: 关联审计日志ID
        contract_name: 合约名称
        function_name: 函数名
        function_args: 函数参数
        gas_price: Gas价格
        gas_limit: Gas限制
        nonce: Nonce
        description: 描述
        extra_data: 额外数据
    
    Returns:
        TransactionAudit: 交易审计记录
    """
    return await TransactionAudit.create(
        tx_hash=tx_hash,
        chain_id=chain_id,
        network=network,
        from_address=from_address,
        to_address=to_address,
        value=value,
        tx_type=tx_type,
        status=TransactionAuditStatus.PENDING,
        token_address=token_address,
        token_symbol=token_symbol,
        token_decimals=token_decimals,
        token_amount=token_amount,
        operator_id=operator_id,
        related_audit_id=related_audit_id,
        contract_name=contract_name,
        function_name=function_name,
        function_args=function_args,
        gas_price=gas_price,
        gas_limit=gas_limit,
        nonce=nonce,
        description=description,
        extra_data=extra_data,
    )


async def update_transaction_status(
    tx_hash: str,
    status: TransactionAuditStatus,
    block_number: Optional[int] = None,
    block_timestamp=None,
    gas_used: Optional[int] = None,
    effective_gas_price: Optional[str] = None,
    error_message: Optional[str] = None,
) -> TransactionAudit:
    """
    更新交易状态
    
    Args:
        tx_hash: 交易哈希
        status: 新状态
        block_number: 区块高度
        block_timestamp: 区块时间
        gas_used: Gas消耗
        effective_gas_price: 实际Gas价格
        error_message: 错误信息
    
    Returns:
        TransactionAudit: 更新后的交易记录
    """
    tx = await TransactionAudit.get(tx_hash=tx_hash)
    
    tx.status = status
    if block_number is not None:
        tx.block_number = block_number
    if block_timestamp is not None:
        tx.block_timestamp = block_timestamp
    if gas_used is not None:
        tx.gas_used = gas_used
        if effective_gas_price:
            tx.effective_gas_price = effective_gas_price
            tx.gas_cost = str(gas_used * int(effective_gas_price))
    if error_message is not None:
        tx.error_message = error_message
    
    # 如果状态变为已确认，记录确认时间
    if status == TransactionAuditStatus.CONFIRMED:
        tx.confirmed_at = get_utc_time()
    
    await tx.save()
    return tx


async def get_transaction_by_hash(tx_hash: str) -> Optional[TransactionAudit]:
    """根据哈希获取交易"""
    return await TransactionAudit.get_or_none(tx_hash=tx_hash)


async def get_pending_transactions(chain_id: Optional[int] = None) -> list:
    """获取待确认交易"""
    query = TransactionAudit.filter(status=TransactionAuditStatus.PENDING)
    if chain_id:
        query = query.filter(chain_id=chain_id)
    return await query.order_by("created_at").all()


async def query_transactions(
    chain_id: Optional[int] = None,
    from_address: Optional[str] = None,
    to_address: Optional[str] = None,
    tx_type: Optional[TransactionAuditType] = None,
    status: Optional[TransactionAuditStatus] = None,
    token_address: Optional[str] = None,
    start_time=None,
    end_time=None,
    limit: int = 100,
    offset: int = 0
) -> list:
    """
    查询交易记录
    
    Args:
        chain_id: 链ID
        from_address: 发送方地址
        to_address: 接收方地址
        tx_type: 交易类型
        status: 交易状态
        token_address: Token地址
        start_time: 开始时间
        end_time: 结束时间
        limit: 返回数量限制
        offset: 偏移量
    
    Returns:
        list: 交易记录列表
    """
    query = TransactionAudit.all()
    
    if chain_id:
        query = query.filter(chain_id=chain_id)
    if from_address:
        query = query.filter(from_address=from_address)
    if to_address:
        query = query.filter(to_address=to_address)
    if tx_type:
        query = query.filter(tx_type=tx_type)
    if status:
        query = query.filter(status=status)
    if token_address:
        query = query.filter(token_address=token_address)
    if start_time:
        query = query.filter(created_at__gte=start_time)
    if end_time:
        query = query.filter(created_at__lte=end_time)
    
    return await query.order_by("-created_at").offset(offset).limit(limit).all()
