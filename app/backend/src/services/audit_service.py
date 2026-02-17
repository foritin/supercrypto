"""
审计服务模块

提供审计日志和交易审计的服务层实现
- AuditService: 通用审计日志的记录和查询，遵循只追加不修改的原则
- TransactionAuditService: 链上交易的记录和追踪，只允许状态更新，不允许删除
"""

import asyncio
from datetime import datetime
from typing import Dict, List, Optional, Tuple

from falib.utils.config import SETTINGS
from falib.utils.log import get_logger

from src.common.exceptions import ConflictException, NotFoundException
from src.common.utils import calculate_total_pages
from src.models.audit import AuditLog
from src.models.base import get_utc_time
from src.models.transaction_audit import TransactionAudit
from src.schemas.audit import (
    AuditLogQuery,
    AuditLogResponse,
    AuditStats,
    TransactionAuditQuery,
    TransactionAuditResponse,
    TransactionAuditStats,
)
from src.schemas.enums import AuditAction, AuditCategory, AuditStatus
from src.schemas.enums.audit import TransactionAuditStatus, TransactionAuditType

logger = get_logger("business.audit.service")
transaction_logger = get_logger("business.transaction.service")


__all__ = [
    "AuditService",
    "TransactionAuditService",
]


class AuditService:
    """
    审计服务

    提供审计日志的记录和查询功能
    所有日志只追加，不允许修改或删除
    """

    @property
    def network(self) -> str:
        """获取当前网络"""
        return SETTINGS.network

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

        参数:
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

        返回:
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
                environment=self.network,
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
        self, category: AuditCategory, action: AuditAction, **kwargs
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

        参数:
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

        返回:
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
        logs = (
            await query.order_by("-operated_at").offset(offset).limit(page_size).all()
        )

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

        参数:
            log_id: 日志ID

        返回:
            AuditLogResponse: 审计日志

        异常:
            NotFoundException: 日志不存在
        """
        log = await AuditLog.get_or_none(id=log_id)
        if not log:
            raise NotFoundException(
                f"Audit log {log_id} not found", detail={"log_id": log_id}
            )
        return self._to_response(log)

    async def get_operator_history(
        self, operator_id: int, limit: int = 50
    ) -> List[AuditLogResponse]:
        """
        获取操作者历史

        参数:
            operator_id: 操作者ID
            limit: 返回数量限制

        返回:
            List[AuditLogResponse]: 审计日志列表
        """
        logs = (
            await AuditLog.filter(operator_id=operator_id)
            .order_by("-operated_at")
            .limit(limit)
            .all()
        )

        return [self._to_response(log) for log in logs]

    async def get_target_history(
        self, target_type: str, target_id: int, limit: int = 50
    ) -> List[AuditLogResponse]:
        """
        获取目标对象历史

        参数:
            target_type: 目标类型
            target_id: 目标ID
            limit: 返回数量限制

        返回:
            List[AuditLogResponse]: 审计日志列表
        """
        logs = (
            await AuditLog.filter(target_type=target_type, target_id=target_id)
            .order_by("-operated_at")
            .limit(limit)
            .all()
        )

        return [self._to_response(log) for log in logs]

    async def get_stats(
        self,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
    ) -> AuditStats:
        """
        获取统计数据

        参数:
            start_time: 开始时间
            end_time: 结束时间

        返回:
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

        action_stats = (
            await query.annotate(count=Count("id"))
            .group_by("action")
            .values("action", "count")
        )

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

    async def export_to_csv(self, **query_params) -> str:
        """
        导出审计日志为 CSV 字符串

        参数:
            **query_params: 传递给 query() 的过滤参数

        返回:
            CSV 格式字符串
        """
        import csv
        import io

        # 限制导出数量
        query_params.setdefault("page", 1)
        query_params.setdefault("page_size", 10000)

        logs, total, _ = await self.query(**query_params)

        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow(
            [
                "ID",
                "时间",
                "类别",
                "操作",
                "状态",
                "操作者ID",
                "操作者地址",
                "操作者类型",
                "目标类型",
                "目标ID",
                "目标地址",
                "描述",
                "原因",
                "IP地址",
                "交易哈希",
                "耗时(ms)",
                "错误码",
                "错误信息",
            ]
        )

        for log in logs:
            writer.writerow(
                [
                    log.id,
                    log.operated_at.isoformat() if log.operated_at else "",
                    log.category.value if log.category else "",
                    log.action.value if log.action else "",
                    log.status.value if log.status else "",
                    log.operator_id or "",
                    log.operator_address or "",
                    log.operator_type or "",
                    log.target_type or "",
                    log.target_id or "",
                    log.target_address or "",
                    log.description or "",
                    log.reason or "",
                    log.ip_address or "",
                    log.tx_hash or "",
                    log.duration_ms or "",
                    log.error_code or "",
                    log.error_message or "",
                ]
            )

        output.seek(0)
        return output.getvalue()

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

    # ============ 审计日志辅助操作（原 models/audit.py 模块级函数） ============

    async def log_audit(
        self,
        category: AuditCategory,
        action: AuditAction,
        status: AuditStatus = AuditStatus.SUCCESS,
        operator_id: Optional[int] = None,
        operator_address: Optional[str] = None,
        operator_type: Optional[str] = None,
        target_id: Optional[int] = None,
        target_type: Optional[str] = None,
        target_address: Optional[str] = None,
        reason: Optional[str] = None,
        description: Optional[str] = None,
        old_value: Optional[dict] = None,
        new_value: Optional[dict] = None,
        extra_data: Optional[dict] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_id: Optional[str] = None,
        tx_hash: Optional[str] = None,
        block_number: Optional[int] = None,
        gas_used: Optional[int] = None,
        duration_ms: Optional[int] = None,
        error_code: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> AuditLog:
        """
        记录审计日志（简单版，不含 environment/address 标准化）

        原 models/audit.py 模块级函数，现迁移至 AuditService。
        新代码建议使用 self.log() 方法。
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
        self,
        category: Optional[AuditCategory] = None,
        action: Optional[AuditAction] = None,
        operator_id: Optional[int] = None,
        target_type: Optional[str] = None,
        target_id: Optional[int] = None,
        status: Optional[AuditStatus] = None,
        start_time=None,
        end_time=None,
        limit: int = 100,
        offset: int = 0,
    ) -> list:
        """
        查询审计日志（返回原始 ORM 对象列表）

        原 models/audit.py 模块级函数，现迁移至 AuditService。
        新代码建议使用 self.query() 方法（返回 AuditLogResponse）。
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

    async def get_operator_audit_history(
        self, operator_id: int, limit: int = 50
    ) -> list:
        """获取操作者的审计历史（返回原始 ORM 对象列表）"""
        return (
            await AuditLog.filter(operator_id=operator_id)
            .order_by("-operated_at")
            .limit(limit)
            .all()
        )

    async def get_target_audit_history(
        self, target_type: str, target_id: int, limit: int = 50
    ) -> list:
        """获取目标对象的审计历史（返回原始 ORM 对象列表）"""
        return (
            await AuditLog.filter(target_type=target_type, target_id=target_id)
            .order_by("-operated_at")
            .limit(limit)
            .all()
        )

    async def get_failed_operations(self, limit: int = 100) -> list:
        """获取失败的操作记录"""
        return (
            await AuditLog.filter(status=AuditStatus.FAILED)
            .order_by("-operated_at")
            .limit(limit)
            .all()
        )

    async def get_security_events(self, limit: int = 100) -> list:
        """获取安全相关事件（封禁、失败登录等）"""
        return (
            await AuditLog.filter(
                action__in=[
                    AuditAction.ACCOUNT_BLOCK,
                    AuditAction.AUTH_LOGIN_FAILED,
                    AuditAction.PERMISSION_REVOKE,
                ]
            )
            .order_by("-operated_at")
            .limit(limit)
            .all()
        )


class TransactionAuditService:
    """
    交易审计服务

    提供链上交易的记录和追踪功能
    只允许状态更新，不允许删除
    """

    @property
    def network(self) -> str:
        """获取当前网络"""
        return SETTINGS.network

    async def record_transaction(
        self,
        tx_hash: str,
        chain_id: int,
        network: str,
        from_address: str,
        to_address: Optional[str],
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
        function_args: Optional[Dict] = None,
        # Gas 信息
        gas_price: Optional[str] = None,
        gas_limit: Optional[int] = None,
        nonce: Optional[int] = None,
        # 其他
        description: Optional[str] = None,
        extra_data: Optional[Dict] = None,
    ) -> TransactionAudit:
        """
        记录交易

        参数:
            tx_hash: 交易哈希
            chain_id: 链ID
            network: 网络名称
            from_address: 发送方地址
            to_address: 接收方地址
            value: 交易金额(Wei字符串)
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

        返回:
            TransactionAudit: 交易审计记录

        异常:
            ConflictException: 交易哈希已存在
        """
        # 检查是否已存在
        exists = await TransactionAudit.filter(tx_hash=tx_hash).exists()
        if exists:
            raise ConflictException(
                f"Transaction {tx_hash[:16]}... already exists",
                detail={"tx_hash": tx_hash},
            )

        tx = await TransactionAudit.create(
            tx_hash=tx_hash,
            chain_id=chain_id,
            network=network,
            from_address=from_address.lower(),
            to_address=to_address.lower() if to_address else None,
            value=value,
            tx_type=tx_type,
            status=TransactionAuditStatus.PENDING,
            token_address=token_address.lower() if token_address else None,
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
            environment=self.network,
        )

        transaction_logger.info(
            f"Transaction recorded: {tx_hash[:16]}... "
            f"type={tx_type.value} chain={chain_id}"
        )
        return tx

    async def update_status(
        self,
        tx_hash: str,
        status: TransactionAuditStatus,
        block_number: Optional[int] = None,
        block_timestamp: Optional[datetime] = None,
        gas_used: Optional[int] = None,
        effective_gas_price: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> TransactionAudit:
        """
        更新交易状态

        只允许更新以下字段：
        - status
        - block_number
        - block_timestamp
        - gas_used
        - effective_gas_price
        - error_message
        - updated_at
        - confirmed_at

        参数:
            tx_hash: 交易哈希
            status: 新状态
            block_number: 区块高度
            block_timestamp: 区块时间
            gas_used: Gas消耗
            effective_gas_price: 实际Gas价格
            error_message: 错误信息

        返回:
            TransactionAudit: 更新后的交易记录

        异常:
            NotFoundException: 交易不存在
        """
        tx = await TransactionAudit.get_or_none(tx_hash=tx_hash)
        if not tx:
            raise NotFoundException(
                f"Transaction {tx_hash[:16]}... not found", detail={"tx_hash": tx_hash}
            )

        # 更新状态
        tx.status = status
        tx.updated_at = get_utc_time()

        if block_number is not None:
            tx.block_number = block_number
        if block_timestamp is not None:
            tx.block_timestamp = block_timestamp
        if gas_used is not None:
            tx.gas_used = gas_used
            # 计算 gas_cost
            if effective_gas_price:
                tx.effective_gas_price = effective_gas_price
                tx.gas_cost = str(gas_used * int(effective_gas_price))
        if error_message is not None:
            tx.error_message = error_message

        # 如果状态变为已确认，记录确认时间
        if status == TransactionAuditStatus.CONFIRMED:
            tx.confirmed_at = get_utc_time()

        await tx.save()

        transaction_logger.info(
            f"Transaction status updated: {tx_hash[:16]}... status={status.value}"
        )
        return tx

    async def query(
        self,
        chain_id: Optional[int] = None,
        from_address: Optional[str] = None,
        to_address: Optional[str] = None,
        tx_type: Optional[TransactionAuditType] = None,
        status: Optional[TransactionAuditStatus] = None,
        token_address: Optional[str] = None,
        operator_id: Optional[int] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[TransactionAuditResponse], int, int]:
        """
        查询交易记录

        参数:
            chain_id: 链ID
            from_address: 发送方地址
            to_address: 接收方地址
            tx_type: 交易类型
            status: 交易状态
            token_address: Token地址
            operator_id: 操作者ID
            start_time: 开始时间
            end_time: 结束时间
            page: 页码
            page_size: 每页数量

        返回:
            Tuple[List[TransactionAuditResponse], int, int]: (交易列表, 总数, 总页数)
        """
        query = TransactionAudit.all()

        # 应用过滤条件
        if chain_id is not None:
            query = query.filter(chain_id=chain_id)
        if from_address:
            query = query.filter(from_address=from_address.lower())
        if to_address:
            query = query.filter(to_address=to_address.lower())
        if tx_type:
            query = query.filter(tx_type=tx_type)
        if status:
            query = query.filter(status=status)
        if token_address:
            query = query.filter(token_address=token_address.lower())
        if operator_id is not None:
            query = query.filter(operator_id=operator_id)
        if start_time:
            query = query.filter(created_at__gte=start_time)
        if end_time:
            query = query.filter(created_at__lte=end_time)

        # 计算总数和分页
        total = await query.count()
        total_pages = calculate_total_pages(total, page_size)

        # 获取数据
        offset = (page - 1) * page_size
        txs = await query.order_by("-created_at").offset(offset).limit(page_size).all()

        return [self._to_response(tx) for tx in txs], total, total_pages

    async def query_by_params(
        self, params: TransactionAuditQuery
    ) -> Tuple[List[TransactionAuditResponse], int, int]:
        """使用 Query Schema 查询"""
        return await self.query(
            chain_id=params.chain_id,
            from_address=params.from_address,
            to_address=params.to_address,
            tx_type=params.tx_type,
            status=params.status,
            token_address=params.token_address,
            operator_id=params.operator_id,
            start_time=params.start_time,
            end_time=params.end_time,
            page=params.page,
            page_size=params.page_size,
        )

    async def get_by_hash(self, tx_hash: str) -> TransactionAuditResponse:
        """
        根据哈希获取交易

        参数:
            tx_hash: 交易哈希

        返回:
            TransactionAuditResponse: 交易记录

        异常:
            NotFoundException: 交易不存在
        """
        tx = await TransactionAudit.get_or_none(tx_hash=tx_hash)
        if not tx:
            raise NotFoundException(
                f"Transaction {tx_hash[:16]}... not found", detail={"tx_hash": tx_hash}
            )
        return self._to_response(tx)

    async def get_pending_transactions(
        self, chain_id: Optional[int] = None
    ) -> List[TransactionAuditResponse]:
        """
        获取待确认交易

        参数:
            chain_id: 链ID（可选）

        返回:
            List[TransactionAuditResponse]: 待确认交易列表
        """
        query = TransactionAudit.filter(status=TransactionAuditStatus.PENDING)
        if chain_id is not None:
            query = query.filter(chain_id=chain_id)

        txs = await query.order_by("created_at").all()
        return [self._to_response(tx) for tx in txs]

    async def get_stats(
        self,
        chain_id: Optional[int] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
    ) -> TransactionAuditStats:
        """
        获取交易统计

        参数:
            chain_id: 链ID（可选）
            start_time: 开始时间
            end_time: 结束时间

        返回:
            TransactionAuditStats: 统计数据
        """
        from tortoise.functions import Count

        query = TransactionAudit.all()

        if chain_id is not None:
            query = query.filter(chain_id=chain_id)
        if start_time:
            query = query.filter(created_at__gte=start_time)
        if end_time:
            query = query.filter(created_at__lte=end_time)

        # 总数
        total = await query.count()

        # 按状态统计
        pending_count = await query.filter(
            status=TransactionAuditStatus.PENDING
        ).count()
        confirmed_count = await query.filter(
            status=TransactionAuditStatus.CONFIRMED
        ).count()
        failed_count = await query.filter(status=TransactionAuditStatus.FAILED).count()
        reverted_count = await query.filter(
            status=TransactionAuditStatus.REVERTED
        ).count()

        # 按类型统计
        by_type = {}
        for tx_type in TransactionAuditType:
            count = await query.filter(tx_type=tx_type).count()
            if count > 0:
                by_type[tx_type.value] = count

        # 按链统计 - 使用 group by 代替 distinct
        by_chain = {}
        chain_stats = (
            await query.annotate(count=Count("id"))
            .group_by("chain_id")
            .values("chain_id", "count")
        )

        for stat in chain_stats:
            if stat["count"] > 0:
                by_chain[stat["chain_id"]] = stat["count"]

        # Gas 统计 (只统计已确认的交易)
        confirmed_txs = await query.filter(
            status=TransactionAuditStatus.CONFIRMED, gas_used__isnull=False
        ).all()

        total_gas_used = sum(tx.gas_used or 0 for tx in confirmed_txs)
        total_gas_cost = sum(int(tx.gas_cost or 0) for tx in confirmed_txs)

        return TransactionAuditStats(
            total_transactions=total,
            pending_count=pending_count,
            confirmed_count=confirmed_count,
            failed_count=failed_count,
            reverted_count=reverted_count,
            by_type=by_type,
            by_chain=by_chain,
            total_gas_used=total_gas_used,
            total_gas_cost=str(total_gas_cost),
            start_time=start_time,
            end_time=end_time,
        )

    def _to_response(self, tx: TransactionAudit) -> TransactionAuditResponse:
        """将 ORM 模型转换为响应 Schema"""
        return TransactionAuditResponse(
            id=tx.id,
            tx_hash=tx.tx_hash,
            chain_id=tx.chain_id,
            network=tx.network,
            from_address=tx.from_address,
            to_address=tx.to_address,
            value=tx.value,
            tx_type=tx.tx_type,
            status=tx.status,
            token_address=tx.token_address,
            token_symbol=tx.token_symbol,
            token_decimals=tx.token_decimals,
            token_amount=tx.token_amount,
            contract_name=tx.contract_name,
            function_name=tx.function_name,
            function_args=tx.function_args,
            gas_price=tx.gas_price,
            gas_limit=tx.gas_limit,
            gas_used=tx.gas_used,
            effective_gas_price=tx.effective_gas_price,
            gas_cost=tx.gas_cost,
            block_number=tx.block_number,
            block_timestamp=tx.block_timestamp,
            nonce=tx.nonce,
            operator_id=tx.operator_id,
            related_audit_id=tx.related_audit_id,
            description=tx.description,
            extra_data=tx.extra_data,
            error_message=tx.error_message,
            created_at=tx.created_at,
            updated_at=tx.updated_at,
            confirmed_at=tx.confirmed_at,
            environment=tx.environment,
        )

    # ============ Transaction Audit Operations (原 models/transaction_audit.py) ============

    async def record_transaction_simple(
        self,
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
        记录链上交易（简单版，不含地址标准化和冲突检查）

        原 models/transaction_audit.py 模块级函数，现迁移至 TransactionAuditService。
        新代码建议使用 self.record_transaction() 方法。
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

    async def update_transaction_status_simple(
        self,
        tx_hash: str,
        status: TransactionAuditStatus,
        block_number: Optional[int] = None,
        block_timestamp=None,
        gas_used: Optional[int] = None,
        effective_gas_price: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> TransactionAudit:
        """
        更新交易状态（简单版，返回原始 ORM 对象）

        原 models/transaction_audit.py 模块级函数，现迁移至 TransactionAuditService。
        新代码建议使用 self.update_status() 方法。
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

    async def get_transaction_by_hash_simple(
        self, tx_hash: str
    ) -> Optional[TransactionAudit]:
        """
        根据哈希获取交易（返回原始 ORM 对象）

        原 models/transaction_audit.py 模块级函数，现迁移至 TransactionAuditService。
        新代码建议使用 self.get_by_hash() 方法（返回 TransactionAuditResponse）。
        """
        return await TransactionAudit.get_or_none(tx_hash=tx_hash)

    async def get_pending_transactions_simple(
        self, chain_id: Optional[int] = None
    ) -> list:
        """
        获取待确认交易（返回原始 ORM 对象列表）

        原 models/transaction_audit.py 模块级函数，现迁移至 TransactionAuditService。
        新代码建议使用 self.get_pending_transactions() 方法（返回 TransactionAuditResponse 列表）。
        """
        query = TransactionAudit.filter(status=TransactionAuditStatus.PENDING)
        if chain_id:
            query = query.filter(chain_id=chain_id)
        return await query.order_by("created_at").all()

    async def query_transactions_simple(
        self,
        chain_id: Optional[int] = None,
        from_address: Optional[str] = None,
        to_address: Optional[str] = None,
        tx_type: Optional[TransactionAuditType] = None,
        status: Optional[TransactionAuditStatus] = None,
        token_address: Optional[str] = None,
        start_time=None,
        end_time=None,
        limit: int = 100,
        offset: int = 0,
    ) -> list:
        """
        查询交易记录（返回原始 ORM 对象列表）

        原 models/transaction_audit.py 模块级函数，现迁移至 TransactionAuditService。
        新代码建议使用 self.query() 方法（返回 TransactionAuditResponse 列表）。
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
