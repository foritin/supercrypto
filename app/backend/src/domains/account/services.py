"""
Account领域 - Service业务逻辑层
编排业务流程，调用repository和外部服务
"""
from typing import Optional, List, Tuple
from datetime import datetime

from src.domains.account.repositories import AccountRepository
from src.domains.account.schemas import (
    AccountCreate,
    AccountUpdate,
    AccountResponse,
    AccountListQuery
)
from src.models.account import Account
from src.shared.exceptions import (
    ConflictException,
    NotFoundException,
    ValidationException
)
from src.shared.utils import calculate_total_pages


class AccountService:
    """
    账户服务
    
    负责账户相关的业务逻辑处理
    """
    
    def __init__(self, repository: Optional[AccountRepository] = None):
        """
        初始化服务
        
        Args:
            repository: 账户仓储，默认创建新实例
        """
        self.repo = repository or AccountRepository()
    
    async def create_account(self, data: AccountCreate) -> AccountResponse:
        """
        创建账户
        
        业务流程：
        1. 验证地址是否已存在
        2. 创建账户
        3. 返回响应
        
        Args:
            data: 账户创建数据
            
        Returns:
            AccountResponse: 账户响应对象
            
        Raises:
            ConflictException: 地址已存在
        """
        # 1. 检查地址是否已存在（同一网络）
        exists = await self.repo.exists_by_address(
            address=data.address,
            net_type=data.net_type
        )
        if exists:
            raise ConflictException(
                f"Account with address {data.address} already exists on {data.net_type} network",
                detail={
                    "address": data.address,
                    "net_type": data.net_type
                }
            )
        
        # 2. 创建账户
        account = await self.repo.create(
            address=data.address,
            private_key=data.private_key,
            net_type=data.net_type,
            tag=data.tag
        )
        
        # 3. 转换为响应对象
        return self._to_response(account)
    
    async def get_account(self, account_id: int) -> AccountResponse:
        """
        获取账户详情
        
        Args:
            account_id: 账户ID
            
        Returns:
            AccountResponse: 账户响应对象
            
        Raises:
            NotFoundException: 账户不存在
        """
        account = await self.repo.get_by_id_or_raise(account_id)
        return self._to_response(account)
    
    async def get_account_by_address(
        self,
        address: str,
        net_type: Optional[str] = None
    ) -> Optional[AccountResponse]:
        """
        根据地址获取账户
        
        Args:
            address: 钱包地址
            net_type: 网络类型
            
        Returns:
            Optional[AccountResponse]: 账户响应对象或None
        """
        account = await self.repo.get_by_address(address, net_type)
        if not account:
            return None
        return self._to_response(account)
    
    async def update_account(
        self,
        account_id: int,
        data: AccountUpdate
    ) -> AccountResponse:
        """
        更新账户
        
        Args:
            account_id: 账户ID
            data: 更新数据
            
        Returns:
            AccountResponse: 更新后的账户响应对象
            
        Raises:
            NotFoundException: 账户不存在
        """
        # 准备更新数据（只更新非None字段）
        update_data = {}
        if data.tag is not None:
            update_data['tag'] = data.tag
        if data.net_type is not None:
            update_data['net_type'] = data.net_type
        
        if not update_data:
            raise ValidationException("No fields to update")
        
        # 更新账户
        account = await self.repo.update(account_id, **update_data)
        return self._to_response(account)
    
    async def list_accounts(
        self,
        query: AccountListQuery
    ) -> Tuple[List[AccountResponse], int, int]:
        """
        查询账户列表
        
        Args:
            query: 查询参数
            
        Returns:
            Tuple[List[AccountResponse], int, int]: (账户列表, 总数, 总页数)
        """
        offset = (query.page - 1) * query.page_size
        
        accounts, total = await self.repo.list_all(
            offset=offset,
            limit=query.page_size,
            net_type=query.net_type,
            tag=query.tag,
            address=query.address
        )
        
        total_pages = calculate_total_pages(total, query.page_size)
        
        responses = [self._to_response(acc) for acc in accounts]
        return responses, total, total_pages
    
    async def update_login_time(self, account_id: int) -> AccountResponse:
        """
        更新最后登录时间
        
        Args:
            account_id: 账户ID
            
        Returns:
            AccountResponse: 更新后的账户响应对象
        """
        account = await self.repo.update_login_time(account_id)
        return self._to_response(account)
    
    async def delete_account(self, account_id: int) -> bool:
        """
        删除账户
        
        Args:
            account_id: 账户ID
            
        Returns:
            bool: 删除成功返回True
            
        Raises:
            NotFoundException: 账户不存在
        """
        return await self.repo.delete(account_id)
    
    def _to_response(self, account: Account) -> AccountResponse:
        """
        将ORM模型转换为响应Schema
        
        Args:
            account: Account ORM模型
            
        Returns:
            AccountResponse: 账户响应对象
        """
        return AccountResponse(
            id=account.id,
            address=account.address,
            tag=account.tag,
            net_type=account.net_type,
            last_login_dt=account.last_login_dt,
            created_at=account.created_at,
            updated_at=account.updated_at
        )

