"""
Wallet领域 - Repository数据访问层
"""
from typing import Optional, List, Tuple
from decimal import Decimal

from src.models.wallet import Wallet
from src.shared.common.exceptions import NotFoundException


class WalletRepository:
    """
    钱包仓储
    
    负责Wallet模型的所有数据库操作
    """
    
    async def create(
        self,
        address: str,
        encrypted_private_key: str,
        network: str = "ethereum",
        balance: Decimal = Decimal(0),
        tag: Optional[str] = None,
        account_id: Optional[int] = None
    ) -> Wallet:
        """创建钱包"""
        wallet = await Wallet.create(
            address=address,
            encrypted_private_key=encrypted_private_key,
            network=network,
            balance=balance,
            tag=tag,
            account_id=account_id
        )
        return wallet
    
    async def get_by_id(self, wallet_id: int) -> Optional[Wallet]:
        """根据ID查询钱包"""
        return await Wallet.get_or_none(id=wallet_id)
    
    async def get_by_id_or_raise(self, wallet_id: int) -> Wallet:
        """根据ID查询钱包，未找到则抛出异常"""
        wallet = await self.get_by_id(wallet_id)
        if not wallet:
            raise NotFoundException(
                f"Wallet with id {wallet_id} not found",
                detail={"wallet_id": wallet_id}
            )
        return wallet
    
    async def get_by_address(self, address: str) -> Optional[Wallet]:
        """根据地址查询钱包"""
        return await Wallet.get_or_none(address=address)
    
    async def exists_by_address(self, address: str) -> bool:
        """检查地址是否存在"""
        return await Wallet.filter(address=address).exists()
    
    async def list_by_account(
        self,
        account_id: int,
        offset: int = 0,
        limit: int = 10
    ) -> Tuple[List[Wallet], int]:
        """查询账户的钱包列表"""
        query = Wallet.filter(account_id=account_id)
        total = await query.count()
        wallets = await query.offset(offset).limit(limit).order_by("-created_at").all()
        return wallets, total
    
    async def list_by_network(
        self,
        network: str,
        offset: int = 0,
        limit: int = 10
    ) -> Tuple[List[Wallet], int]:
        """查询指定网络的钱包列表"""
        query = Wallet.filter(network=network, is_active=True)
        total = await query.count()
        wallets = await query.offset(offset).limit(limit).order_by("-created_at").all()
        return wallets, total
    
    async def list_all(
        self,
        offset: int = 0,
        limit: int = 10,
        is_active: Optional[bool] = None
    ) -> Tuple[List[Wallet], int]:
        """查询所有钱包"""
        query = Wallet.all()
        
        if is_active is not None:
            query = query.filter(is_active=is_active)
        
        total = await query.count()
        wallets = await query.offset(offset).limit(limit).order_by("-created_at").all()
        return wallets, total
    
    async def update(self, wallet_id: int, **kwargs) -> Wallet:
        """更新钱包"""
        wallet = await self.get_by_id_or_raise(wallet_id)
        
        for key, value in kwargs.items():
            if value is not None and hasattr(wallet, key):
                setattr(wallet, key, value)
        
        await wallet.save()
        return wallet
    
    async def update_balance(self, wallet_id: int, balance: Decimal) -> Wallet:
        """更新余额"""
        wallet = await self.get_by_id_or_raise(wallet_id)
        wallet.balance = balance
        await wallet.save()
        return wallet
    
    async def delete(self, wallet_id: int) -> bool:
        """删除钱包"""
        wallet = await self.get_by_id_or_raise(wallet_id)
        await wallet.delete()
        return True

