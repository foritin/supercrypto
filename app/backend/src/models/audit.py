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

from src.models.base import AbstractModel, get_utc_time
from src.shared.common.exceptions import BusinessException
from src.shared.schemas.enums import AuditAction, AuditCategory, AuditStatus


class AuditLogImmutableError(BusinessException):
    """审计日志不可变异常"""
    
    def __init__(self, message: str = "Audit log is immutable"):
        super().__init__(message=message, code=403)


class AuditLog(AbstractModel):
    """
    通用审计日志表
    
    记录所有需要审计的操作，支持灵活扩展
    只追加，永不修改或删除
    """
    
    # 基本信息
    category = fields.CharEnumField(
        AuditCategory,
        max_length=50,
        description="审计类别",
        index=True
    )
    action = fields.CharEnumField(
        AuditAction,
        max_length=100,
        description="操作类型",
        index=True
    )
    status = fields.CharEnumField(
        AuditStatus,
        max_length=20,
        default=AuditStatus.SUCCESS,
        description="操作状态",
        index=True
    )
    
    # 操作主体信息
    operator_id = fields.IntField(null=True, description="操作者账户ID", index=True)
    operator_address = fields.CharField(max_length=128, null=True, description="操作者钱包地址")
    operator_type = fields.CharField(max_length=50, null=True, description="操作者类型(user/admin/system)")
    
    # 操作目标信息
    target_id = fields.IntField(null=True, description="目标对象ID", index=True)
    target_type = fields.CharField(max_length=50, null=True, description="目标对象类型", index=True)
    target_address = fields.CharField(max_length=128, null=True, description="目标钱包地址")
    
    # 操作详情
    reason = fields.TextField(null=True, description="操作原因/备注")
    description = fields.TextField(null=True, description="操作描述")
    
    # 操作前后数据（JSON格式）
    old_value = fields.JSONField(null=True, description="操作前的值")
    new_value = fields.JSONField(null=True, description="操作后的值")
    extra_data = fields.JSONField(null=True, description="额外数据（灵活扩展）")
    
    # 请求信息
    ip_address = fields.CharField(max_length=45, null=True, description="操作IP地址", index=True)
    user_agent = fields.CharField(max_length=500, null=True, description="用户代理")
    request_id = fields.CharField(max_length=64, null=True, description="请求ID", index=True)
    
    # 区块链相关（如果适用）
    tx_hash = fields.CharField(max_length=128, null=True, description="交易哈希", index=True)
    block_number = fields.BigIntField(null=True, description="区块高度")
    gas_used = fields.BigIntField(null=True, description="Gas消耗")
    
    # 时间信息
    operated_at = fields.DatetimeField(
        default=get_utc_time,
        description="操作时间(UTC)",
        index=True
    )
    duration_ms = fields.IntField(null=True, description="操作耗时(毫秒)")
    
    # 错误信息（如果失败）
    error_code = fields.CharField(max_length=50, null=True, description="错误码")
    error_message = fields.TextField(null=True, description="错误信息")
    
    # 环境
    environment = fields.CharField(
        max_length=32,
        default="local",
        description="环境: local/test/main",
        index=True
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


# ==================== 审计日志辅助函数 ====================

async def log_audit(
    category: AuditCategory,
    action: AuditAction,
    status: AuditStatus = AuditStatus.SUCCESS,
    # 操作者信息
    operator_id: int = None,
    operator_address: str = None,
    operator_type: str = None,
    # 目标信息
    target_id: int = None,
    target_type: str = None,
    target_address: str = None,
    # 操作详情
    reason: str = None,
    description: str = None,
    old_value: dict = None,
    new_value: dict = None,
    extra_data: dict = None,
    # 请求信息
    ip_address: str = None,
    user_agent: str = None,
    request_id: str = None,
    # 区块链信息
    tx_hash: str = None,
    block_number: int = None,
    gas_used: int = None,
    # 其他
    duration_ms: int = None,
    error_code: str = None,
    error_message: str = None,
) -> AuditLog:
    """
    记录审计日志
    
    Args:
        category: 审计类别
        action: 操作类型
        status: 操作状态
        operator_id: 操作者ID
        operator_address: 操作者地址
        operator_type: 操作者类型
        target_id: 目标ID
        target_type: 目标类型
        target_address: 目标地址
        reason: 原因
        description: 描述
        old_value: 操作前的值
        new_value: 操作后的值
        extra_data: 额外数据
        ip_address: IP地址
        user_agent: 用户代理
        request_id: 请求ID
        tx_hash: 交易哈希
        block_number: 区块高度
        gas_used: Gas消耗
        duration_ms: 耗时
        error_code: 错误码
        error_message: 错误信息
    
    Returns:
        AuditLog: 审计日志对象
    """
    return await AuditLog.create(
        category=category,
        action=action,
        status=status,
        operator_id=operator_id,
        operator_address=operator_address,
        operator_type=operator_type,
        target_id=target_id,
        target_type=target_type,
        target_address=target_address,
        reason=reason,
        description=description,
        old_value=old_value,
        new_value=new_value,
        extra_data=extra_data,
        ip_address=ip_address,
        user_agent=user_agent,
        request_id=request_id,
        tx_hash=tx_hash,
        block_number=block_number,
        gas_used=gas_used,
        operated_at=get_utc_time(),
        duration_ms=duration_ms,
        error_code=error_code,
        error_message=error_message,
    )


async def query_audit_logs(
    category: AuditCategory = None,
    action: AuditAction = None,
    operator_id: int = None,
    target_type: str = None,
    target_id: int = None,
    status: AuditStatus = None,
    start_time = None,
    end_time = None,
    limit: int = 100,
    offset: int = 0
) -> list:
    """
    查询审计日志
    
    Args:
        category: 类别过滤
        action: 操作类型过滤
        operator_id: 操作者ID过滤
        target_type: 目标类型过滤
        target_id: 目标ID过滤
        status: 状态过滤
        start_time: 开始时间
        end_time: 结束时间
        limit: 返回数量限制
        offset: 偏移量
    
    Returns:
        list: 审计日志列表
    """
    query = AuditLog.all()
    
    if category:
        query = query.filter(category=category)
    if action:
        query = query.filter(action=action)
    if operator_id:
        query = query.filter(operator_id=operator_id)
    if target_type:
        query = query.filter(target_type=target_type)
    if target_id:
        query = query.filter(target_id=target_id)
    if status:
        query = query.filter(status=status)
    if start_time:
        query = query.filter(operated_at__gte=start_time)
    if end_time:
        query = query.filter(operated_at__lte=end_time)
    
    return await query.order_by("-operated_at").offset(offset).limit(limit).all()


async def get_operator_audit_history(operator_id: int, limit: int = 50) -> list:
    """获取操作者的审计历史"""
    return await AuditLog.filter(
        operator_id=operator_id
    ).order_by("-operated_at").limit(limit).all()


async def get_target_audit_history(target_type: str, target_id: int, limit: int = 50) -> list:
    """获取目标对象的审计历史"""
    return await AuditLog.filter(
        target_type=target_type,
        target_id=target_id
    ).order_by("-operated_at").limit(limit).all()


async def get_failed_operations(limit: int = 100) -> list:
    """获取失败的操作记录"""
    return await AuditLog.filter(
        status=AuditStatus.FAILED
    ).order_by("-operated_at").limit(limit).all()


async def get_security_events(limit: int = 100) -> list:
    """获取安全相关事件（封禁、失败登录等）"""
    return await AuditLog.filter(
        action__in=[
            AuditAction.ACCOUNT_BLOCK,
            AuditAction.AUTH_LOGIN_FAILED,
            AuditAction.PERMISSION_REVOKE,
        ]
    ).order_by("-operated_at").limit(limit).all()

