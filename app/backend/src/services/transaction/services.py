"""
Transaction领域 - Service业务逻辑层
"""
from typing import Optional, List, Tuple
from decimal import Decimal

from src.services.transaction.repositories import TransactionRepository
from src.services.transaction.schemas import (
    TransactionCreate,
    TransactionUpdate,
    TransactionResponse,
    TransactionListQuery,
    TransactionStats
)
from src.models.transaction import Transaction
from src.shared.common.exceptions import ConflictException, ValidationException
from src.shared.common.utils import calculate_total_pages


class TransactionService:
    """
    交易服务
    
    负责交易相关的业务逻辑处理
    """
    
    def __init__(self, repository: Optional[TransactionRepository] = None):
        """初始化服务"""
        self.repo = repository or TransactionRepository()
    
    async def record_transaction(self, data: TransactionCreate) -> TransactionResponse:
        """
        记录交易
        
        业务流程：
        1. 检查交易哈希是否已存在
        2. 创建交易记录
        3. 返回响应
        """
        # 1. 检查哈希是否已存在
        if await self.repo.exists_by_hash(data.tx_hash):
            raise ConflictException(
                f"Transaction with hash {data.tx_hash} already exists",
                detail={"tx_hash": data.tx_hash}
            )
        
        # 2. 创建交易记录
        tx = await self.repo.create(
            tx_hash=data.tx_hash,
            from_address=data.from_address,
            to_address=data.to_address,
            amount=data.amount,
            network=data.network,
            status=data.status,
            tx_type=data.tx_type,
            gas_price=data.gas_price,
            wallet_id=data.wallet_id,
            note=data.note
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
        """更新交易信息"""
        # 准备更新数据
        update_data = {}
        if data.status is not None:
            update_data['status'] = data.status
        if data.gas_used is not None:
            update_data['gas_used'] = data.gas_used
        if data.block_number is not None:
            update_data['block_number'] = data.block_number
        if data.block_timestamp is not None:
            update_data['block_timestamp'] = data.block_timestamp
        if data.note is not None:
            update_data['note'] = data.note
        
        if not update_data:
            raise ValidationException("No fields to update")
        
        # 更新交易
        tx = await self.repo.update(tx_id, **update_data)
        return self._to_response(tx)
    
    async def update_transaction_status(
        self,
        tx_hash: str,
        status: str,
        **kwargs
    ) -> TransactionResponse:
        """更新交易状态"""
        tx = await self.repo.update_status(tx_hash, status, **kwargs)
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
            filters['wallet_id'] = query.wallet_id
        if query.network:
            filters['network'] = query.network
        if query.status:
            filters['status'] = query.status
        if query.tx_type:
            filters['tx_type'] = query.tx_type
        
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
    
    async def get_wallet_transactions(
        self,
        wallet_id: int,
        page: int = 1,
        page_size: int = 10
    ) -> Tuple[List[TransactionResponse], int, int]:
        """查询钱包的交易历史"""
        offset = (page - 1) * page_size
        
        transactions, total = await self.repo.list_by_wallet(
            wallet_id, offset, page_size
        )
        
        total_pages = calculate_total_pages(total, page_size)
        
        responses = [self._to_response(tx) for tx in transactions]
        return responses, total, total_pages
    
    async def get_transaction_stats(
        self,
        address: Optional[str] = None,
        wallet_id: Optional[int] = None
    ) -> TransactionStats:
        """
        获取交易统计
        
        可以按地址或钱包ID进行统计
        """
        # 构建基础查询
        filters = {}
        if address:
            filters['address'] = address
        if wallet_id:
            filters['wallet_id'] = wallet_id
        
        transactions, _ = await self.repo.list_all(
            offset=0,
            limit=10000,  # 获取所有数据用于统计
            **filters
        )
        
        # 统计
        total_transactions = len(transactions)
        pending_count = sum(1 for tx in transactions if tx.status == 'pending')
        confirmed_count = sum(1 for tx in transactions if tx.status == 'confirmed')
        failed_count = sum(1 for tx in transactions if tx.status == 'failed')
        
        # 计算总金额
        total_amount = sum(Decimal(tx.amount) for tx in transactions)
        
        return TransactionStats(
            total_transactions=total_transactions,
            pending_count=pending_count,
            confirmed_count=confirmed_count,
            failed_count=failed_count,
            total_amount=str(total_amount)
        )
    
    async def delete_transaction(self, tx_id: int) -> bool:
        """删除交易"""
        return await self.repo.delete(tx_id)
    
    def _to_response(self, tx: Transaction) -> TransactionResponse:
        """将ORM模型转换为响应Schema"""
        return TransactionResponse(
            id=tx.id,
            tx_hash=tx.tx_hash,
            from_address=tx.from_address,
            to_address=tx.to_address,
            amount=str(tx.amount),
            network=tx.network,
            status=tx.status,
            tx_type=tx.tx_type,
            gas_price=tx.gas_price,
            gas_used=tx.gas_used,
            block_number=tx.block_number,
            block_timestamp=tx.block_timestamp,
            wallet_id=tx.wallet_id,
            note=tx.note,
            created_at=tx.created_at,
            updated_at=tx.updated_at
        )

