from datetime import datetime, timezone
from typing import Optional

from tortoise import fields, models


def get_utc_time():
    """获取 UTC 时区的当前时间"""
    return datetime.now(timezone.utc)


class AbstractModel(models.Model):
    id = fields.IntField(pk=True)

    class Meta:
        abstract = True


class TimestampMixin:
    """时间戳混入类"""

    created_at = fields.DatetimeField(null=True, default=get_utc_time)

    updated_at = fields.DatetimeField(null=True, default=get_utc_time)

    async def save(self, *args, **kwargs):
        """重写保存方法，确保 updated_at 使用 UTC 时区"""
        self.updated_at = get_utc_time()
        return await super().save(*args, **kwargs)


class SoftDeleteMixin:
    """软删除混入类 - 用于永久性删除（逻辑删除）"""

    is_deleted = fields.BooleanField(
        default=False, description="是否删除", db_index=True
    )
    deleted_at = fields.DatetimeField(null=True, description="删除时间(UTC)")
    deleted_by = fields.CharField(max_length=128, null=True, description="删除者")

    async def soft_delete(self, deleted_by: Optional[str] = None):
        """软删除方法 - 用于用户注销等永久性操作"""
        self.is_deleted = True
        self.deleted_at = get_utc_time()
        self.deleted_by = deleted_by
        await self.save()

    async def restore(self):
        """恢复已删除的记录"""
        self.is_deleted = False
        self.deleted_at = None
        self.deleted_by = None
        await self.save()


class BlockableMixin:
    """可封禁混入类 - 用于临时性封禁/冻结"""

    is_blocked = fields.BooleanField(
        default=False, description="是否封禁", db_index=True
    )
    blocked_at = fields.DatetimeField(null=True, description="封禁时间(UTC)")
    blocked_by = fields.CharField(max_length=128, null=True, description="封禁者")
    blocked_reason = fields.TextField(null=True, description="封禁原因")

    async def block(
        self, reason: Optional[str] = None, blocked_by: Optional[str] = None
    ):
        """封禁账户 - 用于违规、风控等临时冻结场景"""
        self.is_blocked = True
        self.blocked_at = get_utc_time()
        self.blocked_by = blocked_by
        self.blocked_reason = reason
        await self.save()

    async def unblock(self):
        """解封账户 - 恢复正常使用"""
        self.is_blocked = False
        self.blocked_at = None
        self.blocked_by = None
        self.blocked_reason = None
        await self.save()

    def is_active(self) -> bool:
        """判断账户是否可用（未封禁且未删除）"""
        return not self.is_blocked and not getattr(self, "is_deleted", False)
