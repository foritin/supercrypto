"""
审计日志模型 - 通用审计系统

用于记录系统中所有需要审计的操作，包括：
- 账户操作（创建、登录、封禁、删除等）
- 权限变更（授予、撤销）
- 合约操作（部署、调用、管理员操作等）
- 资产操作（充值、提现、转账等）

设计原则：
- 只追加不修改：审计日志只能追加，不能修改或删除
- 异步记录：审计日志记录不阻塞主业务流程
"""

from tortoise import fields

from src.common.exceptions import AuditLogImmutableError
from src.models.base import AbstractModel, get_utc_time
from src.schemas.enums import AuditAction, AuditCategory, AuditStatus


class AuditLog(AbstractModel):
    """
    通用审计日志表

    记录所有需要审计的操作，支持灵活扩展
    只追加，永不修改或删除
    """

    # 基本信息
    category = fields.CharEnumField(
        AuditCategory, max_length=50, description="审计类别", db_index=True
    )
    action = fields.CharEnumField(
        AuditAction, max_length=100, description="操作类型", db_index=True
    )
    status = fields.CharEnumField(
        AuditStatus,
        max_length=20,
        default=AuditStatus.SUCCESS,
        description="操作状态",
        db_index=True,
    )

    # 操作主体信息
    operator_id = fields.IntField(null=True, description="操作者账户ID", db_index=True)
    operator_address = fields.CharField(
        max_length=128, null=True, description="操作者钱包地址"
    )
    operator_type = fields.CharField(
        max_length=50, null=True, description="操作者类型(user/admin/system)"
    )

    # 操作目标信息
    target_id = fields.IntField(null=True, description="目标对象ID", db_index=True)
    target_type = fields.CharField(
        max_length=50, null=True, description="目标对象类型", db_index=True
    )
    target_address = fields.CharField(
        max_length=128, null=True, description="目标钱包地址"
    )

    # 操作详情
    reason = fields.TextField(null=True, description="操作原因/备注")
    description = fields.TextField(null=True, description="操作描述")

    # 操作前后数据（JSON格式）
    old_value = fields.JSONField(null=True, description="操作前的值")
    new_value = fields.JSONField(null=True, description="操作后的值")
    extra_data = fields.JSONField(null=True, description="额外数据（灵活扩展）")

    # 请求信息
    ip_address = fields.CharField(
        max_length=45, null=True, description="操作IP地址", db_index=True
    )
    user_agent = fields.CharField(max_length=500, null=True, description="用户代理")
    request_id = fields.CharField(
        max_length=64, null=True, description="请求ID", db_index=True
    )

    # 区块链相关（如果适用）
    tx_hash = fields.CharField(
        max_length=128, null=True, description="交易哈希", db_index=True
    )
    block_number = fields.BigIntField(null=True, description="区块高度")
    gas_used = fields.BigIntField(null=True, description="Gas消耗")

    # 时间信息
    operated_at = fields.DatetimeField(
        default=get_utc_time, description="操作时间(UTC)", db_index=True
    )
    duration_ms = fields.IntField(null=True, description="操作耗时(毫秒)")

    # 错误信息（如果失败）
    error_code = fields.CharField(max_length=50, null=True, description="错误码")
    error_message = fields.TextField(null=True, description="错误信息")

    # 环境
    environment = fields.CharField(
        max_length=32,
        default="hardhat",
        description="环境: hardhat/sepolia/mainnet",
        db_index=True,
    )

    class Meta:
        table = "audit_log"
        table_description = "通用审计日志表"
        ordering = ["-operated_at"]

        # 复合索引 - 根据常见查询优化
        indexes = [
            # 按操作者查询
            ("operator_id", "operated_at"),
            # 按目标对象查询
            ("target_type", "target_id", "operated_at"),
            # 按类别和操作查询
            ("category", "action", "operated_at"),
            # 按状态查询（查找失败操作）
            ("status", "operated_at"),
        ]

    def __str__(self):
        return f"AuditLog({self.action} by operator={self.operator_id} on {self.target_type}:{self.target_id} at {self.operated_at})"

    # ==================== 不可变性保护 ====================

    async def save(self, *args, **kwargs):
        """
        重写保存方法，禁止更新已存在的记录

        只允许创建新记录，不允许修改已存在的记录
        """
        if self.id is not None:
            # 检查是否是已存在的记录
            exists = await AuditLog.filter(id=self.id).exists()
            if exists:
                raise AuditLogImmutableError(
                    f"Cannot update audit log {self.id}: audit logs are immutable"
                )
        return await super().save(*args, **kwargs)

    async def delete(self, *args, **kwargs):
        """
        重写删除方法，禁止删除审计日志
        """
        raise AuditLogImmutableError(
            f"Cannot delete audit log {self.id}: audit logs are immutable"
        )

    @classmethod
    async def bulk_update(cls, *args, **kwargs):
        """禁止批量更新"""
        raise AuditLogImmutableError("Bulk update is not allowed for audit logs")

    @classmethod
    async def bulk_delete(cls, *args, **kwargs):
        """禁止批量删除"""
        raise AuditLogImmutableError("Bulk delete is not allowed for audit logs")
