"""
审计日志 (Audit Log) 数据模型
记录所有管理员操作
"""
from tortoise import fields

from src.models.base import AbstractModel, TimestampMixin
from src.shared.schemas.enums import AuditAction


class AuditLog(AbstractModel, TimestampMixin):
    """
    审计日志
    
    记录管理员的所有操作
    """
    
    # 操作者钱包地址
    operator_address = fields.CharField(
        max_length=128,
        index=True,
        description="操作者钱包地址"
    )
    
    # 操作类型
    action = fields.CharEnumField(
        AuditAction,
        index=True,
        description="操作类型"
    )
    
    # 操作目标类型 (如 asset, kyc, contract 等)
    target_type = fields.CharField(
        max_length=64,
        null=True,
        index=True,
        description="目标类型"
    )
    
    # 操作目标 ID
    target_id = fields.CharField(
        max_length=128,
        null=True,
        index=True,
        description="目标 ID"
    )
    
    # 操作详情 (JSON)
    details = fields.JSONField(
        null=True,
        description="操作详情，包含参数、前后值等"
    )
    
    # 操作结果
    success = fields.BooleanField(
        default=True,
        index=True,
        description="操作是否成功"
    )
    
    # 错误信息
    error_message = fields.TextField(
        null=True,
        description="错误信息（如果失败）"
    )
    
    # 交易哈希 (链上操作)
    tx_hash = fields.CharField(
        max_length=128,
        null=True,
        index=True,
        description="交易哈希"
    )
    
    # IP 地址
    ip_address = fields.CharField(
        max_length=64,
        null=True,
        description="操作者 IP 地址"
    )
    
    # User Agent
    user_agent = fields.TextField(
        null=True,
        description="浏览器 User Agent"
    )
    
    # 环境
    environment = fields.CharField(
        max_length=32,
        index=True,
        default="local",
        description="环境: local/test/main"
    )

    class Meta:
        table = "audit_log"
        table_description = "审计日志"
        ordering = ["-created_at"]

    def __str__(self):
        return f"AuditLog #{self.id} - {self.action} by {self.operator_address[:10]}..."

