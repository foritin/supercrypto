"""
用户模型
"""

from tortoise import fields

from src.models.base import (
    AbstractModel,
    BlockableMixin,
    SoftDeleteMixin,
    TimestampMixin,
)
from src.shared.schemas.enums import NetWork


class Account(AbstractModel, TimestampMixin, BlockableMixin, SoftDeleteMixin):
    """
    账户表 - 支持封禁和删除两种状态，整合钱包功能

    - is_blocked: 临时封禁（违规、风控、冻结） - 可解封
    - is_deleted: 永久删除（用户注销、停用） - 可恢复但不建议

    钱包字段 (来自原 Wallet 模型):
    - encrypted_private_key: 加密的私钥
    - balance: 余额（Wei单位）
    - is_active: 是否激活
    """

    # === 原有字段 ===
    address = fields.CharField(max_length=128, description="钱包地址")
    private_key = fields.CharField(max_length=256, description="私钥")
    tag = fields.CharField(max_length=255, null=True, description="标签")
    network = fields.CharEnumField(
        NetWork, max_length=20, default=NetWork.HARDHAT, description="网络类型"
    )
    last_login_dt = fields.DatetimeField(null=True, description="最后登录时间(UTC)")

    # === 新增字段 (来自 Wallet 模型) - Requirements 4.1, 4.5 ===
    encrypted_private_key = fields.CharField(
        max_length=512, null=True, description="加密的私钥"
    )
    balance = fields.DecimalField(
        max_digits=36, decimal_places=18, default=0, description="余额（Wei单位）"
    )
    is_active = fields.BooleanField(default=True, description="是否激活")

    class Meta:
        table = "account"
        table_description = "账户表"
        unique_together = (("address", "network"),)

    def __str__(self):
        status = "active"
        if self.is_blocked:
            status = "blocked"
        elif self.is_deleted:
            status = "deleted"
        return f"Account(id={self.id}, address={self.address}, network={self.network}, status={status})"


# class RoutePermission(AbstractModel, TimestampMixin):
#     """路由权限表"""

#     name = fields.CharField(max_length=255, description="权限名称")
#     version = fields.CharField(max_length=10, default="v1", description="版本")
#     endpoint = fields.CharField(max_length=255, description="端点")
#     module = fields.CharField(max_length=100, description="模块")
#     method = fields.CharField(max_length=10, description="方法")
#     is_active = fields.BooleanField(default=True, description="是否激活")
#     description = fields.TextField(null=True, description="权限描述")

#     class Meta:
#         table = "route_permission"
#         table_description = "路由权限表"

#     def __str__(self):
#         return f"RoutePermission(id={self.id}, name={self.name}, version={self.version}, endpoint={self.endpoint}, module={self.module}, method={self.method}, is_active={self.is_active})"


# class AccountPermission(AbstractModel, TimestampMixin):
#     """
#     账户权限当前状态表

#     只保存当前的权限状态，不保存历史记录
#     历史记录存储在 AccountPermissionHistory 表中
#     """

#     account_id = fields.ForeignKeyField(
#         "models.Account",
#         on_delete=fields.RESTRICT,  # 防止误删账户
#         related_name="permissions",
#         description="账户ID",
#     )
#     permission_id = fields.ForeignKeyField(
#         "models.RoutePermission",
#         on_delete=fields.RESTRICT,  # 防止误删权限
#         related_name="accounts",
#         description="权限ID",
#     )
#     is_active = fields.BooleanField(
#         default=True, description="当前是否激活", index=True
#     )
#     granted_at = fields.DatetimeField(null=True, description="首次授予时间(UTC)")
#     granted_by = fields.CharField(max_length=128, null=True, description="授予者")
#     last_modified_at = fields.DatetimeField(null=True, description="最后修改时间(UTC)")
#     last_modified_by = fields.CharField(
#         max_length=128, null=True, description="最后修改者"
#     )

#     class Meta:
#         table = "account_permission"
#         table_description = "账户权限当前状态表"
#         # 确保同一账户不会重复分配同一权限
#         unique_together = (("account_id", "permission_id"),)

#     def __str__(self):
#         status = "active" if self.is_active else "inactive"
#         return f"AccountPermission(account={self.account_id}, permission={self.permission_id}, status={status})"


# # ==================== 权限管理辅助函数 ====================


# async def grant_permission(
#     account_id: int,
#     permission_id: int,
#     operator_id: int = None,
#     operator_address: str = None,
#     reason: str = None,
#     ip_address: str = None,
#     user_agent: str = None,
#     request_id: str = None,
# ) -> AccountPermission:
#     """
#     授予权限

#     Args:
#         account_id: 账户ID
#         permission_id: 权限ID
#         operator_id: 操作者ID
#         operator_address: 操作者地址
#         reason: 操作原因
#         ip_address: 操作IP
#         user_agent: 用户代理
#         request_id: 请求ID

#     Returns:
#         AccountPermission: 权限对象
#     """
#     from src.models.audit import AuditAction, AuditCategory, AuditStatus, log_audit
#     from src.models.base import get_utc_time

#     now = get_utc_time()

#     # 1. 更新或创建当前状态
#     perm, created = await AccountPermission.get_or_create(
#         account_id=account_id,
#         permission_id=permission_id,
#         defaults={
#             "is_active": True,
#             "granted_at": now,
#             "granted_by": operator_address or str(operator_id),
#             "last_modified_at": now,
#             "last_modified_by": operator_address or str(operator_id),
#         },
#     )

#     if not created:
#         # 如果已存在，更新为激活状态
#         perm.is_active = True
#         perm.last_modified_at = now
#         perm.last_modified_by = operator_address or str(operator_id)
#         await perm.save()

#     # 2. 记录审计日志
#     await log_audit(
#         category=AuditCategory.PERMISSION,
#         action=AuditAction.PERMISSION_GRANT,
#         status=AuditStatus.SUCCESS,
#         operator_id=operator_id,
#         operator_address=operator_address,
#         target_id=account_id,
#         target_type="Account",
#         reason=reason or "授予权限",
#         extra_data={"permission_id": permission_id, "is_new": created},
#         ip_address=ip_address,
#         user_agent=user_agent,
#         request_id=request_id,
#     )

#     return perm


# async def revoke_permission(
#     account_id: int,
#     permission_id: int,
#     operator_id: int = None,
#     operator_address: str = None,
#     reason: str = None,
#     ip_address: str = None,
#     user_agent: str = None,
#     request_id: str = None,
# ) -> AccountPermission:
#     """
#     撤销权限

#     Args:
#         account_id: 账户ID
#         permission_id: 权限ID
#         operator_id: 操作者ID
#         operator_address: 操作者地址
#         reason: 操作原因
#         ip_address: 操作IP
#         user_agent: 用户代理
#         request_id: 请求ID

#     Returns:
#         AccountPermission: 权限对象

#     Raises:
#         DoesNotExist: 权限不存在
#     """
#     from src.models.audit import AuditAction, AuditCategory, AuditStatus, log_audit
#     from src.models.base import get_utc_time

#     now = get_utc_time()

#     # 1. 获取并更新当前状态
#     perm = await AccountPermission.get(
#         account_id=account_id, permission_id=permission_id
#     )
#     perm.is_active = False
#     perm.last_modified_at = now
#     perm.last_modified_by = operator_address or str(operator_id)
#     await perm.save()

#     # 2. 记录审计日志
#     await log_audit(
#         category=AuditCategory.PERMISSION,
#         action=AuditAction.PERMISSION_REVOKE,
#         status=AuditStatus.SUCCESS,
#         operator_id=operator_id,
#         operator_address=operator_address,
#         target_id=account_id,
#         target_type="Account",
#         reason=reason or "撤销权限",
#         extra_data={"permission_id": permission_id},
#         ip_address=ip_address,
#         user_agent=user_agent,
#         request_id=request_id,
#     )

#     return perm


# async def get_permission_history(
#     account_id: int = None, permission_id: int = None, limit: int = 100
# ) -> list:
#     """
#     查询权限变更历史

#     Args:
#         account_id: 账户ID（可选）
#         permission_id: 权限ID（可选）
#         limit: 返回记录数限制

#     Returns:
#         list: 审计日志列表
#     """
#     from src.models.audit import AuditCategory, AuditLog

#     query = AuditLog.filter(category=AuditCategory.PERMISSION)

#     if account_id:
#         query = query.filter(target_id=account_id, target_type="Account")
#     if permission_id:
#         # permission_id 存储在 extra_data 中
#         # 注意：这种查询在大数据量时效率较低，可能需要优化
#         pass

#     return await query.order_by("-operated_at").limit(limit).all()


# async def get_active_permissions(account_id: int) -> list:
#     """
#     获取账户的所有激活权限

#     Args:
#         account_id: 账户ID

#     Returns:
#         list: 权限列表
#     """
#     return (
#         await AccountPermission.filter(account_id=account_id, is_active=True)
#         .prefetch_related("permission_id")
#         .all()
#     )
