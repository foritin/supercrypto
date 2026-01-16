"""
审计服务 - AuditService

负责通用审计日志的记录和查询
遵循只追加不修改的原则
"""
import asyncio
from datetime import datetime
from typing import Dict, List, Optional, Tuple

from falib.utils.config import SETTINGS
from falib.utils.log import get_logger

from src.models.audit import AuditLog
from src.models.base import get_utc_time
from src.services.audit.schemas import (
    AuditLogCreate,
    AuditLogQuery,
    AuditLogResponse,
    AuditStats,
)
from src.shared.common.exceptions import NotFoundException
from src.shared.common.utils import calculate_total_pages
from src.shared.schemas.enums import AuditAction, AuditCategory, AuditStatus

logger = get_logger("audit.service")


class AuditService:
    """
    审计服务
    
    提供审计日志的记录和查询功能
    所有日志只追加，不允许修改或删除
    """

    @property
    def environment(self) -> str:
        """当前环境"""
        return getattr(SETTINGS, "ENVIRONMENT", "local")

    async def log(
        self,
        category: AuditCategory,
        action: AuditAction,
        operator_id: Optional[int] = None,
        operator_address: Optional[str] = None,
        operator_type: Optional[str] = None,
        target_type: Optional[str] = None,
        target_id: Optional[int] = None,
        target_address: Optional[str] = None,
        status: AuditStatus = AuditStatus.SUCCESS,
        description: Optional[str] = None,
        reason: Optional[str] = None,
        old_value: Optional[Dict] = None,
        new_value: Optional[Dict] = None,
        extra_data: Optional[Dict] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_id: Optional[str] = None,
        tx_hash: Optional[str] = None,
        duration_ms: Optional[int] = None,
        error_code: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> AuditLog:
        """
        记录审计日志
        
        Args:
            category: 审计类别
            action: 操作类型
            operator_id: 操作者ID
            operator_address: 操作者地址
            operator_type: 操作者类型 (user/admin/system)
            target_type: 目标类型
            target_id: 目标ID
            target_address: 目标地址
            status: 操作状态
            description: 操作描述
            reason: 操作原因
            old_value: 操作前的值
            new_value: 操作后的值
            extra_data: 额外数据
            ip_address: IP地址
            user_agent: 用户代理
            request_id: 请求ID
            tx_hash: 交易哈希
            duration_ms: 操作耗时(毫秒)
            error_code: 错误码
            error_message: 错误信息
        
        Returns:
            AuditLog: 创建的审计日志
        """
        try:
            audit_log = await AuditLog.create(
                category=category,
                action=action,
                status=status,
                operator_id=operator_id,
                operator_address=operator_address.lower() if operator_address else None,
                operator_type=operator_type,
                target_type=target_type,
                target_id=target_id,
                target_address=target_address.lower() if target_address else None,
                description=description,
                reason=reason,
                old_value=old_value,
                new_value=new_value,
                extra_data=extra_data,
                ip_address=ip_address,
                user_agent=user_agent,
                request_id=request_id,
                tx_hash=tx_hash,
                operated_at=get_utc_time(),
                duration_ms=duration_ms,
                error_code=error_code,
                error_message=error_message,
                environment=self.environment,
            )
            
            logger.debug(
                f"Audit log created: {action.value} by operator={operator_id} "
                f"on {target_type}:{target_id} status={status.value}"
            )
            return audit_log
            
        except Exception as e:
            # 审计日志记录失败不应阻塞主业务
            logger.error(f"Failed to create audit log: {e}")
            raise

    async def log_async(
        self,
        category: AuditCategory,
        action: AuditAction,
        **kwargs
    ) -> None:
        """
        异步记录审计日志（不阻塞主业务）
        
        使用 asyncio.create_task 在后台记录日志
        """
        async def _log():
            try:
                await self.log(category=category, action=action, **kwargs)
            except Exception as e:
                logger.error(f"Async audit log failed: {e}")
        
        asyncio.create_task(_log())

    async def query(
        self,
        category: Optional[AuditCategory] = None,
        action: Optional[AuditAction] = None,
        operator_id: Optional[int] = None,
        operator_type: Optional[str] = None,
        target_type: Optional[str] = None,
        target_id: Optional[int] = None,
        status: Optional[AuditStatus] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        tx_hash: Optional[str] = None,
        ip_address: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[AuditLogResponse], int, int]:
        """
        查询审计日志
        
        Args:
            category: 类别过滤
            action: 操作类型过滤
            operator_id: 操作者ID过滤
            operator_type: 操作者类型过滤
            target_type: 目标类型过滤
            target_id: 目标ID过滤
            status: 状态过滤
            start_time: 开始时间
            end_time: 结束时间
            tx_hash: 交易哈希过滤
            ip_address: IP地址过滤
            page: 页码
            page_size: 每页数量
        
        Returns:
            Tuple[List[AuditLogResponse], int, int]: (日志列表, 总数, 总页数)
        """
        query = AuditLog.all()
        
        # 应用过滤条件
        if category:
            query = query.filter(category=category)
        if action:
            query = query.filter(action=action)
        if operator_id is not None:
            query = query.filter(operator_id=operator_id)
        if operator_type:
            query = query.filter(operator_type=operator_type)
        if target_type:
            query = query.filter(target_type=target_type)
        if target_id is not None:
            query = query.filter(target_id=target_id)
        if status:
            query = query.filter(status=status)
        if start_time:
            query = query.filter(operated_at__gte=start_time)
        if end_time:
            query = query.filter(operated_at__lte=end_time)
        if tx_hash:
            query = query.filter(tx_hash=tx_hash)
        if ip_address:
            query = query.filter(ip_address=ip_address)
        
        # 计算总数和分页
        total = await query.count()
        total_pages = calculate_total_pages(total, page_size)
        
        # 获取数据
        offset = (page - 1) * page_size
        logs = await query.order_by("-operated_at").offset(offset).limit(page_size).all()
        
        return [self._to_response(log) for log in logs], total, total_pages

    async def query_by_params(
        self, params: AuditLogQuery
    ) -> Tuple[List[AuditLogResponse], int, int]:
        """使用 Query Schema 查询"""
        return await self.query(
            category=params.category,
            action=params.action,
            operator_id=params.operator_id,
            operator_type=params.operator_type,
            target_type=params.target_type,
            target_id=params.target_id,
            status=params.status,
            start_time=params.start_time,
            end_time=params.end_time,
            tx_hash=params.tx_hash,
            ip_address=params.ip_address,
            page=params.page,
            page_size=params.page_size,
        )

    async def get_by_id(self, log_id: int) -> AuditLogResponse:
        """
        获取单条审计日志
        
        Args:
            log_id: 日志ID
        
        Returns:
            AuditLogResponse: 审计日志
        
        Raises:
            NotFoundException: 日志不存在
        """
        log = await AuditLog.get_or_none(id=log_id)
        if not log:
            raise NotFoundException(
                f"Audit log {log_id} not found",
                detail={"log_id": log_id}
            )
        return self._to_response(log)

    async def get_operator_history(
        self,
        operator_id: int,
        limit: int = 50
    ) -> List[AuditLogResponse]:
        """
        获取操作者历史
        
        Args:
            operator_id: 操作者ID
            limit: 返回数量限制
        
        Returns:
            List[AuditLogResponse]: 审计日志列表
        """
        logs = await AuditLog.filter(
            operator_id=operator_id
        ).order_by("-operated_at").limit(limit).all()
        
        return [self._to_response(log) for log in logs]

    async def get_target_history(
        self,
        target_type: str,
        target_id: int,
        limit: int = 50
    ) -> List[AuditLogResponse]:
        """
        获取目标对象历史
        
        Args:
            target_type: 目标类型
            target_id: 目标ID
            limit: 返回数量限制
        
        Returns:
            List[AuditLogResponse]: 审计日志列表
        """
        logs = await AuditLog.filter(
            target_type=target_type,
            target_id=target_id
        ).order_by("-operated_at").limit(limit).all()
        
        return [self._to_response(log) for log in logs]

    async def get_stats(
        self,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
    ) -> AuditStats:
        """
        获取统计数据
        
        Args:
            start_time: 开始时间
            end_time: 结束时间
        
        Returns:
            AuditStats: 统计数据
        """
        query = AuditLog.all()
        
        if start_time:
            query = query.filter(operated_at__gte=start_time)
        if end_time:
            query = query.filter(operated_at__lte=end_time)
        
        # 总数
        total = await query.count()
        
        # 按状态统计
        success_count = await query.filter(status=AuditStatus.SUCCESS).count()
        failed_count = await query.filter(status=AuditStatus.FAILED).count()
        pending_count = await query.filter(status=AuditStatus.PENDING).count()
        
        # 按类别统计
        by_category = {}
        for category in AuditCategory:
            count = await query.filter(category=category).count()
            if count > 0:
                by_category[category.value] = count
        
        # 按操作统计 (只统计有数据的)
        by_action = {}
        # 使用 group by 代替 distinct 来避免 PostgreSQL 的 ORDER BY 限制
        from tortoise.functions import Count
        action_stats = await query.annotate(
            count=Count("id")
        ).group_by("action").values("action", "count")
        
        for stat in action_stats:
            if stat["count"] > 0:
                by_action[stat["action"]] = stat["count"]
        
        return AuditStats(
            total_operations=total,
            success_count=success_count,
            failed_count=failed_count,
            pending_count=pending_count,
            by_category=by_category,
            by_action=by_action,
            start_time=start_time,
            end_time=end_time,
        )

    def _to_response(self, log: AuditLog) -> AuditLogResponse:
        """将 ORM 模型转换为响应 Schema"""
        return AuditLogResponse(
            id=log.id,
            category=log.category,
            action=log.action,
            status=log.status,
            operator_id=log.operator_id,
            operator_address=log.operator_address,
            operator_type=log.operator_type,
            target_type=log.target_type,
            target_id=log.target_id,
            target_address=log.target_address,
            description=log.description,
            reason=log.reason,
            old_value=log.old_value,
            new_value=log.new_value,
            extra_data=log.extra_data,
            ip_address=log.ip_address,
            user_agent=log.user_agent,
            request_id=log.request_id,
            tx_hash=log.tx_hash,
            block_number=log.block_number,
            gas_used=log.gas_used,
            operated_at=log.operated_at,
            duration_ms=log.duration_ms,
            error_code=log.error_code,
            error_message=log.error_message,
            environment=log.environment,
        )


# 全局服务实例
audit_service = AuditService()
