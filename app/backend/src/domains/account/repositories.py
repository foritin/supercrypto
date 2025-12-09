"""
Account领域 - Repository数据访问层
封装所有数据库操作
"""
from typing import Optional, List, Tuple
from tortoise.expressions import Q

from src.models.account import Account
from src.shared.exceptions import NotFoundException


class AccountRepository:
    """
    账户仓储
    
    负责Account模型的所有数据库操作
    """
    
    async def create(
        self,
        address: str,
        private_key: str,
        net_type: str = "local",
        tag: Optional[str] = None
    ) -> Account:
        """
        创建账户
        
        Args:
            address: 钱包地址
            private_key: 私钥
            net_type: 网络类型
            tag: 标签
            
        Returns:
            Account: 创建的账户对象
        """
        account = await Account.create(
            address=address,
            private_key=private_key,
            net_type=net_type,
            tag=tag
        )
        return account
    
    async def get_by_id(self, account_id: int) -> Optional[Account]:
        """
        根据ID查询账户
        
        Args:
            account_id: 账户ID
            
        Returns:
            Optional[Account]: 账户对象或None
        """
        return await Account.get_or_none(id=account_id)
    
    async def get_by_id_or_raise(self, account_id: int) -> Account:
        """
        根据ID查询账户，未找到则抛出异常
        
        Args:
            account_id: 账户ID
            
        Returns:
            Account: 账户对象
            
        Raises:
            NotFoundException: 账户不存在
        """
        account = await self.get_by_id(account_id)
        if not account:
            raise NotFoundException(
                f"Account with id {account_id} not found",
                detail={"account_id": account_id}
            )
        return account
    
    async def get_by_address(
        self,
        address: str,
        net_type: Optional[str] = None
    ) -> Optional[Account]:
        """
        根据地址查询账户
        
        Args:
            address: 钱包地址
            net_type: 网络类型（可选）
            
        Returns:
            Optional[Account]: 账户对象或None
        """
        query = Account.filter(address=address)
        if net_type:
            query = query.filter(net_type=net_type)
        return await query.first()
    
    async def exists_by_address(
        self,
        address: str,
        net_type: str
    ) -> bool:
        """
        检查地址是否存在
        
        Args:
            address: 钱包地址
            net_type: 网络类型
            
        Returns:
            bool: 存在返回True
        """
        return await Account.filter(
            address=address,
            net_type=net_type
        ).exists()
    
    async def list_by_net_type(
        self,
        net_type: str,
        offset: int = 0,
        limit: int = 10
    ) -> Tuple[List[Account], int]:
        """
        根据网络类型查询账户列表
        
        Args:
            net_type: 网络类型
            offset: 偏移量
            limit: 限制数量
            
        Returns:
            Tuple[List[Account], int]: (账户列表, 总数量)
        """
        query = Account.filter(net_type=net_type)
        total = await query.count()
        accounts = await query.offset(offset).limit(limit).all()
        return accounts, total
    
    async def list_all(
        self,
        offset: int = 0,
        limit: int = 10,
        net_type: Optional[str] = None,
        tag: Optional[str] = None,
        address: Optional[str] = None
    ) -> Tuple[List[Account], int]:
        """
        查询所有账户（支持过滤）
        
        Args:
            offset: 偏移量
            limit: 限制数量
            net_type: 网络类型过滤
            tag: 标签过滤（模糊搜索）
            address: 地址过滤（模糊搜索）
            
        Returns:
            Tuple[List[Account], int]: (账户列表, 总数量)
        """
        query = Account.all()
        
        # 应用过滤条件
        if net_type:
            query = query.filter(net_type=net_type)
        if tag:
            query = query.filter(tag__icontains=tag)
        if address:
            query = query.filter(address__icontains=address)
        
        total = await query.count()
        accounts = await query.offset(offset).limit(limit).order_by("-created_at").all()
        return accounts, total
    
    async def update(
        self,
        account_id: int,
        **kwargs
    ) -> Account:
        """
        更新账户
        
        Args:
            account_id: 账户ID
            **kwargs: 要更新的字段
            
        Returns:
            Account: 更新后的账户对象
            
        Raises:
            NotFoundException: 账户不存在
        """
        account = await self.get_by_id_or_raise(account_id)
        
        # 更新字段
        for key, value in kwargs.items():
            if value is not None and hasattr(account, key):
                setattr(account, key, value)
        
        await account.save()
        return account
    
    async def update_login_time(self, account_id: int) -> Account:
        """
        更新最后登录时间
        
        Args:
            account_id: 账户ID
            
        Returns:
            Account: 更新后的账户对象
        """
        from datetime import datetime, timezone
        account = await self.get_by_id_or_raise(account_id)
        account.last_login_dt = datetime.now(timezone.utc)
        await account.save()
        return account
    
    async def delete(self, account_id: int) -> bool:
        """
        删除账户
        
        Args:
            account_id: 账户ID
            
        Returns:
            bool: 删除成功返回True
            
        Raises:
            NotFoundException: 账户不存在
        """
        account = await self.get_by_id_or_raise(account_id)
        await account.delete()
        return True

