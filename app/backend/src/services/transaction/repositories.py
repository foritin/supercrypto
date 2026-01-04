"""
Transaction领域 - Repository数据访问层
"""
from typing import Optional, List, Tuple
from tortoise.expressions import Q

from src.models.transaction import Transaction
from src.shared.common.exceptions import NotFoundException


class TransactionRepository:
    """
    交易仓储
    
    负责Transaction模型的所有数据库操作
    """
    
    async def create(
        self,
        tx_hash: str,
        from_address: str,
        to_address: str,
        amount: str,
        network: str = "ethereum",
        status: str = "pending",
        tx_type: str = "transfer",
        **kwargs
    ) -> Transaction:
        """创建交易记录"""
        tx = await Transaction.create(
            tx_hash=tx_hash,
            from_address=from_address,
            to_address=to_address,
            amount=amount,
            network=network,
            status=status,
            tx_type=tx_type,
            **kwargs
        )
        return tx
    
    async def get_by_id(self, tx_id: int) -> Optional[Transaction]:
        """根据ID查询交易"""
        return await Transaction.get_or_none(id=tx_id)
    
    async def get_by_id_or_raise(self, tx_id: int) -> Transaction:
        """根据ID查询交易，未找到则抛出异常"""
        tx = await self.get_by_id(tx_id)
        if not tx:
            raise NotFoundException(
                f"Transaction with id {tx_id} not found",
                detail={"tx_id": tx_id}
            )
        return tx
    
    async def get_by_hash(self, tx_hash: str) -> Optional[Transaction]:
        """根据交易哈希查询"""
        return await Transaction.get_or_none(tx_hash=tx_hash)
    
    async def exists_by_hash(self, tx_hash: str) -> bool:
        """检查交易哈希是否存在"""
        return await Transaction.filter(tx_hash=tx_hash).exists()
    
    async def list_by_address(
        self,
        address: str,
        offset: int = 0,
        limit: int = 10
    ) -> Tuple[List[Transaction], int]:
        """查询指定地址的交易列表（发送或接收）"""
        query = Transaction.filter(
            Q(from_address=address) | Q(to_address=address)
        )
        total = await query.count()
        transactions = await query.offset(offset).limit(limit).order_by("-created_at").all()
        return transactions, total
    
    async def list_by_wallet(
        self,
        wallet_id: int,
        offset: int = 0,
        limit: int = 10
    ) -> Tuple[List[Transaction], int]:
        """查询钱包的交易列表"""
        query = Transaction.filter(wallet_id=wallet_id)
        total = await query.count()
        transactions = await query.offset(offset).limit(limit).order_by("-created_at").all()
        return transactions, total
    
    async def list_by_status(
        self,
        status: str,
        offset: int = 0,
        limit: int = 10
    ) -> Tuple[List[Transaction], int]:
        """根据状态查询交易列表"""
        query = Transaction.filter(status=status)
        total = await query.count()
        transactions = await query.offset(offset).limit(limit).order_by("-created_at").all()
        return transactions, total
    
    async def list_all(
        self,
        offset: int = 0,
        limit: int = 10,
        **filters
    ) -> Tuple[List[Transaction], int]:
        """查询所有交易（支持过滤）"""
        query = Transaction.all()
        
        # 应用过滤条件
        if 'address' in filters and filters['address']:
            address = filters['address']
            query = query.filter(
                Q(from_address=address) | Q(to_address=address)
            )
        if 'from_address' in filters and filters['from_address']:
            query = query.filter(from_address=filters['from_address'])
        if 'to_address' in filters and filters['to_address']:
            query = query.filter(to_address=filters['to_address'])
        if 'wallet_id' in filters and filters['wallet_id']:
            query = query.filter(wallet_id=filters['wallet_id'])
        if 'network' in filters and filters['network']:
            query = query.filter(network=filters['network'])
        if 'status' in filters and filters['status']:
            query = query.filter(status=filters['status'])
        if 'tx_type' in filters and filters['tx_type']:
            query = query.filter(tx_type=filters['tx_type'])
        
        total = await query.count()
        transactions = await query.offset(offset).limit(limit).order_by("-created_at").all()
        return transactions, total
    
    async def update(self, tx_id: int, **kwargs) -> Transaction:
        """更新交易"""
        tx = await self.get_by_id_or_raise(tx_id)
        
        for key, value in kwargs.items():
            if value is not None and hasattr(tx, key):
                setattr(tx, key, value)
        
        await tx.save()
        return tx
    
    async def update_status(
        self,
        tx_hash: str,
        status: str,
        **kwargs
    ) -> Transaction:
        """更新交易状态"""
        tx = await Transaction.get_or_none(tx_hash=tx_hash)
        if not tx:
            raise NotFoundException(
                f"Transaction with hash {tx_hash} not found"
            )
        
        tx.status = status
        for key, value in kwargs.items():
            if hasattr(tx, key):
                setattr(tx, key, value)
        
        await tx.save()
        return tx
    
    async def count_by_status(self, status: str) -> int:
        """统计指定状态的交易数量"""
        return await Transaction.filter(status=status).count()
    
    async def delete(self, tx_id: int) -> bool:
        """删除交易"""
        tx = await self.get_by_id_or_raise(tx_id)
        await tx.delete()
        return True

