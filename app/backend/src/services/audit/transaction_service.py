"""
交易审计服务 - TransactionAuditService

负责链上交易的记录和追踪
只允许状态更新，不允许删除
"""
from datetime import datetime
from typing import Dict, List, Optional, Tuple

from falib.utils.config import SETTINGS
from falib.utils.log import get_logger

from src.models.base import get_utc_time
from src.models.transaction_audit import TransactionAudit
from src.services.audit.schemas import (
    TransactionAuditQuery,
    TransactionAuditResponse,
    TransactionStats,
)
from src.shared.common.exceptions import ConflictException, NotFoundException
from src.shared.common.utils import calculate_total_pages
from src.shared.schemas.enums.audit import (
    TransactionAuditStatus,
    TransactionAuditType,
)

logger = get_logger("audit.transaction")


class TransactionAuditService:
    """
    交易审计服务
    
    提供链上交易的记录和追踪功能
    只允许状态更新，不允许删除
    """

    @property
    def environment(self) -> str:
        """当前环境"""
        return getattr(SETTINGS, "ENVIRONMENT", "local")

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
        
        Args:
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
        
        Returns:
            TransactionAudit: 交易审计记录
        
        Raises:
            ConflictException: 交易哈希已存在
        """
        # 检查是否已存在
        exists = await TransactionAudit.filter(tx_hash=tx_hash).exists()
        if exists:
            raise ConflictException(
                f"Transaction {tx_hash[:16]}... already exists",
                detail={"tx_hash": tx_hash}
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
            environment=self.environment,
        )
        
        logger.info(
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
        
        Raises:
            NotFoundException: 交易不存在
        """
        tx = await TransactionAudit.get_or_none(tx_hash=tx_hash)
        if not tx:
            raise NotFoundException(
                f"Transaction {tx_hash[:16]}... not found",
                detail={"tx_hash": tx_hash}
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
        
        logger.info(
            f"Transaction status updated: {tx_hash[:16]}... "
            f"status={status.value}"
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
        
        Args:
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
        
        Returns:
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
        
        Args:
            tx_hash: 交易哈希
        
        Returns:
            TransactionAuditResponse: 交易记录
        
        Raises:
            NotFoundException: 交易不存在
        """
        tx = await TransactionAudit.get_or_none(tx_hash=tx_hash)
        if not tx:
            raise NotFoundException(
                f"Transaction {tx_hash[:16]}... not found",
                detail={"tx_hash": tx_hash}
            )
        return self._to_response(tx)

    async def get_pending_transactions(
        self,
        chain_id: Optional[int] = None
    ) -> List[TransactionAuditResponse]:
        """
        获取待确认交易
        
        Args:
            chain_id: 链ID（可选）
        
        Returns:
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
    ) -> TransactionStats:
        """
        获取交易统计
        
        Args:
            chain_id: 链ID（可选）
            start_time: 开始时间
            end_time: 结束时间
        
        Returns:
            TransactionStats: 统计数据
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
        pending_count = await query.filter(status=TransactionAuditStatus.PENDING).count()
        confirmed_count = await query.filter(status=TransactionAuditStatus.CONFIRMED).count()
        failed_count = await query.filter(status=TransactionAuditStatus.FAILED).count()
        reverted_count = await query.filter(status=TransactionAuditStatus.REVERTED).count()
        
        # 按类型统计
        by_type = {}
        for tx_type in TransactionAuditType:
            count = await query.filter(tx_type=tx_type).count()
            if count > 0:
                by_type[tx_type.value] = count
        
        # 按链统计 - 使用 group by 代替 distinct
        by_chain = {}
        chain_stats = await query.annotate(
            count=Count("id")
        ).group_by("chain_id").values("chain_id", "count")
        
        for stat in chain_stats:
            if stat["count"] > 0:
                by_chain[stat["chain_id"]] = stat["count"]
        
        # Gas 统计 (只统计已确认的交易)
        confirmed_txs = await query.filter(
            status=TransactionAuditStatus.CONFIRMED,
            gas_used__isnull=False
        ).all()
        
        total_gas_used = sum(tx.gas_used or 0 for tx in confirmed_txs)
        total_gas_cost = sum(int(tx.gas_cost or 0) for tx in confirmed_txs)
        
        return TransactionStats(
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


# 全局服务实例
transaction_audit_service = TransactionAuditService()
