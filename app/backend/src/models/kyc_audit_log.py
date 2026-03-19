"""
KYC 审核日志模型

用于记录 KYC 状态变更历史，包括：
- 用户提交申请
- 管理员审核操作
- 链上同步状态变更
- 状态重置等操作

创建时间: 2026-02-XX
需求引用: Requirements 2.1, 2.2, 2.3, 2.4
"""

from tortoise import fields

from src.models.base import AbstractModel, TimestampMixin
from src.schemas.enums import KycAuditAction


class KycAuditLog(AbstractModel, TimestampMixin):
    """KYC 审核日志表

    记录 KYC 申请的所有状态变更和操作历史，用于审计追踪。

    Attributes:
        kyc: 关联的 KYC 记录
        action: 操作类型 (submit/review/approve/reject/resubmit/sync/reset)
        actor_address: 操作者钱包地址
        actor_role: 操作者角色 (user/admin/system)
        details: 操作详情 (JSON 格式，可存储额外信息)
    """

    kyc = fields.ForeignKeyField(
        "models.AccountKyc",
        related_name="audit_logs",
        on_delete=fields.CASCADE,
        description="关联的 KYC 记录",
    )
    action = fields.CharEnumField(
        KycAuditAction,
        max_length=20,
        db_index=True,
        description="操作类型",
    )
    actor_address = fields.CharField(
        max_length=42,
        db_index=True,
        description="操作者地址",
    )
    actor_role = fields.CharField(
        max_length=20,
        description="操作者角色 (user/admin/system)",
    )
    details = fields.JSONField(
        null=True,
        description="操作详情",
    )

    class Meta:
        table = "kyc_audit_log"
        table_description = "KYC 审核日志表"
        ordering = ["-created_at"]
        indexes = [
            ("kyc_id", "created_at"),
        ]

    def __str__(self):
        return f"KycAuditLog(id={self.id}, kyc_id={self.kyc_id}, action={self.action}, actor={self.actor_address[:10]}...)"
