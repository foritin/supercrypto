"""
Transaction领域 - Service业务逻辑层

注意: 已从 Transaction 模型迁移到 TransactionAudit 模型
TransactionAudit 是不可变的审计记录，只允许状态更新，不允许删除
"""
from decimal import Decimal
from typing import List, Optional, Tuple

from src.models.transaction_audit import TransactionAudit
from src.services.transaction.repositories import TransactionRepository
from src.services.transaction.schemas import (
    TransactionCreate,
    TransactionListQuery,
    TransactionResponse,
    TransactionStats,
    TransactionUpdate,
)
from src.shared.common.exceptions import ConflictException, ValidationException
from src.shared.common.utils import calculate_total_pages
from src.shared.schemas.enums.audit import TransactionAuditStatus, TransactionAuditType

# 网络名称到 chain_id 的映射
NETWORK_CHAIN_MAP = {
    "ethereum": 1,
    "mainnet": 1,
    "sepolia": 11155111,
    "goerli": 5,
    "hardhat": 31337,
    "local": 31337,
}


def get_chain_id_from_network(network: str) -> int:
    """根据网络名称获取 chain_id"""
    return NETWORK_CHAIN_MAP.get(network.lower(), 1)


class TransactionService:
    """
    交易服务

    负责交易相关的业务逻辑处理
    注意: 使用 TransactionAudit 模型，不支持删除操作
    """

    def __init__(self, repository: Optional[TransactionRepository] = None):
        """初始化服务"""
        self.repo = repository or TransactionRepository()

    async def record_transaction(self, data: TransactionCreate) -> TransactionResponse:
        """
        记录交易

        业务流程：
        1. 检查交易哈希是否已存在
        2. 创建交易审计记录
        3. 返回响应
        """
        # 1. 检查哈希是否已存在
        if await self.repo.exists_by_hash(data.tx_hash):
            raise ConflictException(
                f"Transaction with hash {data.tx_hash} already exists",
                detail={"tx_hash": data.tx_hash}
            )

        # 获取 chain_id
        chain_id = get_chain_id_from_network(data.network)

        # 映射状态和类型
        status = self._map_status(data.status)
        tx_type = self._map_type(data.tx_type)

        # 2. 创建交易审计记录
        tx = await self.repo.create(
            tx_hash=data.tx_hash,
            from_address=data.from_address,
            to_address=data.to_address,
            value=data.amount,  # amount -> value
            chain_id=chain_id,
            network=data.network,
            status=status,
            tx_type=tx_type,
            gas_price=data.gas_price,
            operator_id=data.wallet_id,  # wallet_id -> operator_id
            description=data.note  # note -> description
        )

        # 3. 返回响应
        return self._to_response(tx)

    async def get_transaction(self, tx_id: int) -> TransactionResponse:
        """获取交易详情"""
        tx = await self.repo.get_by_id_or_raise(tx_id)
        return self._to_response(tx)

    async def get_transaction_by_hash(self, tx_hash: str) -> Optional[TransactionResponse]:
        """根据交易哈希查询交易"""
        tx = await self.repo.get_by_hash(tx_hash)
        if not tx:
            return None
        return self._to_response(tx)

    async def update_transaction(
        self,
        tx_id: int,
        data: TransactionUpdate
    ) -> TransactionResponse:
        """
        更新交易信息

        注意: TransactionAudit 只允许更新状态相关字段
        """
        tx = await self.repo.get_by_id_or_raise(tx_id)

        # 准备更新数据 (只允许更新状态相关字段)
        update_data = {}
        if data.status is not None:
            update_data['status'] = self._map_status(data.status)
        if data.gas_used is not None:
            update_data['gas_used'] = int(data.gas_used) if data.gas_used else None
        if data.block_number is not None:
            update_data['block_number'] = data.block_number
        if data.block_timestamp is not None:
            update_data['block_timestamp'] = data.block_timestamp

        if not update_data:
            raise ValidationException("No valid fields to update")

        # 更新交易状态
        updated_tx = await self.repo.update_status(
            tx.tx_hash,
            update_data.pop('status', tx.status),
            **update_data
        )
        return self._to_response(updated_tx)

    async def update_transaction_status(
        self,
        tx_hash: str,
        status: str,
        **kwargs
    ) -> TransactionResponse:
        """更新交易状态"""
        audit_status = self._map_status(status)
        tx = await self.repo.update_status(tx_hash, audit_status, **kwargs)
        return self._to_response(tx)

    async def list_transactions(
        self,
        query: TransactionListQuery
    ) -> Tuple[List[TransactionResponse], int, int]:
        """查询交易列表"""
        offset = (query.page - 1) * query.page_size

        # 准备过滤条件
        filters = {}
        if query.address:
            filters['address'] = query.address
        if query.from_address:
            filters['from_address'] = query.from_address
        if query.to_address:
            filters['to_address'] = query.to_address
        if query.wallet_id:
            filters['operator_id'] = query.wallet_id  # wallet_id -> operator_id
        if query.network:
            filters['network'] = query.network
        if query.status:
            filters['status'] = self._map_status(query.status)
        if query.tx_type:
            filters['tx_type'] = self._map_type(query.tx_type)

        transactions, total = await self.repo.list_all(
            offset=offset,
            limit=query.page_size,
            **filters
        )

        total_pages = calculate_total_pages(total, query.page_size)

        responses = [self._to_response(tx) for tx in transactions]
        return responses, total, total_pages

    async def get_address_transactions(
        self,
        address: str,
        page: int = 1,
        page_size: int = 10
    ) -> Tuple[List[TransactionResponse], int, int]:
        """查询地址的交易历史"""
        offset = (page - 1) * page_size

        transactions, total = await self.repo.list_by_address(
            address, offset, page_size
        )

        total_pages = calculate_total_pages(total, page_size)

        responses = [self._to_response(tx) for tx in transactions]
        return responses, total, total_pages

    async def get_operator_transactions(
        self,
        operator_id: int,
        page: int = 1,
        page_size: int = 10
    ) -> Tuple[List[TransactionResponse], int, int]:
        """查询操作者的交易历史"""
        offset = (page - 1) * page_size

        transactions, total = await self.repo.list_by_operator(
            operator_id, offset, page_size
        )

        total_pages = calculate_total_pages(total, page_size)

        responses = [self._to_response(tx) for tx in transactions]
        return responses, total, total_pages

    # 保留向后兼容的方法名
    async def get_wallet_transactions(
        self,
        wallet_id: int,
        page: int = 1,
        page_size: int = 10
    ) -> Tuple[List[TransactionResponse], int, int]:
        """查询钱包的交易历史 (向后兼容，实际调用 get_operator_transactions)"""
        return await self.get_operator_transactions(wallet_id, page, page_size)

    async def get_transaction_stats(
        self,
        address: Optional[str] = None,
        operator_id: Optional[int] = None
    ) -> TransactionStats:
        """
        获取交易统计

        可以按地址或操作者ID进行统计
        """
        # 构建基础查询
        filters = {}
        if address:
            filters['address'] = address
        if operator_id:
            filters['operator_id'] = operator_id

        transactions, _ = await self.repo.list_all(
            offset=0,
            limit=10000,  # 获取所有数据用于统计
            **filters
        )

        # 统计
        total_transactions = len(transactions)
        pending_count = sum(1 for tx in transactions if tx.status == TransactionAuditStatus.PENDING)
        confirmed_count = sum(1 for tx in transactions if tx.status == TransactionAuditStatus.CONFIRMED)
        failed_count = sum(1 for tx in transactions if tx.status == TransactionAuditStatus.FAILED)

        # 计算总金额 (value 是 Wei 字符串)
        total_amount = sum(Decimal(tx.value) for tx in transactions)

        return TransactionStats(
            total_transactions=total_transactions,
            pending_count=pending_count,
            confirmed_count=confirmed_count,
            failed_count=failed_count,
            total_amount=str(total_amount)
        )

    def _map_status(self, status: str) -> TransactionAuditStatus:
        """映射状态字符串到 TransactionAuditStatus"""
        status_map = {
            "pending": TransactionAuditStatus.PENDING,
            "confirmed": TransactionAuditStatus.CONFIRMED,
            "failed": TransactionAuditStatus.FAILED,
            "cancelled": TransactionAuditStatus.DROPPED,
        }
        return status_map.get(status.lower(), TransactionAuditStatus.PENDING)

    def _map_type(self, tx_type: str) -> TransactionAuditType:
        """映射交易类型字符串到 TransactionAuditType"""
        type_map = {
            "transfer": TransactionAuditType.TRANSFER,
            "approve": TransactionAuditType.TOKEN_APPROVE,
            "subscription": TransactionAuditType.CONTRACT_CALL,
            "redeem": TransactionAuditType.CONTRACT_CALL,
            "stake": TransactionAuditType.STAKING,
            "unstake": TransactionAuditType.UNSTAKING,
            "claim": TransactionAuditType.CLAIM_REWARD,
            "mint": TransactionAuditType.CONTRACT_CALL,
            "other": TransactionAuditType.OTHER,
        }
        return type_map.get(tx_type.lower(), TransactionAuditType.OTHER)

    def _reverse_map_status(self, status: TransactionAuditStatus) -> str:
        """反向映射 TransactionAuditStatus 到状态字符串"""
        status_map = {
            TransactionAuditStatus.PENDING: "pending",
            TransactionAuditStatus.CONFIRMED: "confirmed",
            TransactionAuditStatus.FAILED: "failed",
            TransactionAuditStatus.DROPPED: "cancelled",
        }
        return status_map.get(status, "pending")

    def _reverse_map_type(self, tx_type: TransactionAuditType) -> str:
        """反向映射 TransactionAuditType 到交易类型字符串"""
        type_map = {
            TransactionAuditType.TRANSFER: "transfer",
            TransactionAuditType.TOKEN_APPROVE: "approve",
            TransactionAuditType.STAKING: "stake",
            TransactionAuditType.UNSTAKING: "unstake",
            TransactionAuditType.CLAIM_REWARD: "claim",
            TransactionAuditType.CONTRACT_CALL: "other",
            TransactionAuditType.OTHER: "other",
        }
        return type_map.get(tx_type, "other")

    def _to_response(self, tx: TransactionAudit) -> TransactionResponse:
        """将 TransactionAudit 模型转换为响应 Schema"""
        return TransactionResponse(
            id=tx.id,
            tx_hash=tx.tx_hash,
            from_address=tx.from_address,
            to_address=tx.to_address or "",
            amount=tx.value,  # value -> amount (for backward compatibility)
            network=tx.network,
            status=self._reverse_map_status(tx.status),
            tx_type=self._reverse_map_type(tx.tx_type),
            gas_price=tx.gas_price,
            gas_used=str(tx.gas_used) if tx.gas_used else None,
            block_number=tx.block_number,
            block_timestamp=tx.block_timestamp,
            wallet_id=tx.operator_id,  # operator_id -> wallet_id (for backward compatibility)
            note=tx.description,  # description -> note (for backward compatibility)
            created_at=tx.created_at,
            updated_at=tx.updated_at
        )

