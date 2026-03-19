"""
Account 服务 - 账户管理

统一使用 address 作为查询标识符
"""

from datetime import datetime, timezone
from typing import List, Optional, Tuple

from falib.utils.config import SETTINGS
from falib.utils.log import get_logger

from src.common.exceptions import ConflictException, NotFoundException
from src.common.utils import calculate_total_pages
from src.models.account import Account
from src.schemas.account import (
    AccountCreate,
    AccountListQuery,
    AccountResponse,
    AccountRolesUpdate,
    AccountUpdate,
)

logger = get_logger("business.account.service")


class AccountService:
    """
    账户服务

    所有查询统一使用 address 作为标识符
    """

    @property
    def network(self) -> str:
        """当前网络类型"""
        return SETTINGS.network

    async def create(self, data: AccountCreate) -> AccountResponse:
        """
        创建账户

        参数:
            data: 账户创建数据

        返回:
            AccountResponse: 账户响应

        异常:
            ConflictException: 地址已存在
        """
        address = data.address.lower()

        # 检查是否已存在
        exists = await Account.filter(address=address, network=self.network).exists()
        if exists:
            raise ConflictException(
                f"Account {address[:10]}... already exists",
                detail={"address": address},
            )

        # 创建账户
        account = await Account.create(
            address=address,
            private_key=data.private_key,
            network=self.network,
            roles=data.roles,
        )

        return self._to_response(account)

    async def get_by_address(self, address: str) -> AccountResponse:
        """
        根据地址获取账户

        参数:
            address: 钱包地址

        返回:
            AccountResponse: 账户响应

        异常:
            NotFoundException: 账户不存在
        """
        address = address.lower()
        account = await Account.filter(address=address, network=self.network).first()

        if not account:
            raise NotFoundException(
                f"Account {address[:10]}... not found",
                detail={"address": address},
            )

        return self._to_response(account)

    async def get_or_none(self, address: str) -> Optional[AccountResponse]:
        """
        根据地址获取账户（不存在返回 None）

        参数:
            address: 钱包地址

        返回:
            Optional[AccountResponse]: 账户响应或 None
        """
        address = address.lower()
        account = await Account.filter(address=address, network=self.network).first()

        if not account:
            return None

        return self._to_response(account)

    async def get_model_by_address(self, address: str) -> Optional[Account]:
        """
        根据地址获取 ORM 模型（内部使用）

        参数:
            address: 钱包地址

        返回:
            Optional[Account]: ORM 模型或 None
        """
        address = address.lower()
        return await Account.filter(address=address, network=self.network).first()

    async def update(self, address: str, data: AccountUpdate) -> AccountResponse:
        """
        更新账户

        参数:
            address: 钱包地址
            data: 更新数据

        返回:
            AccountResponse: 更新后的账户

        异常:
            NotFoundException: 账户不存在
        """
        address = address.lower()
        account = await Account.filter(address=address, network=self.network).first()

        if not account:
            raise NotFoundException(
                f"Account {address[:10]}... not found",
                detail={"address": address},
            )

        # 更新非 None 字段
        if data.roles is not None:
            account.roles = data.roles

        await account.save()
        return self._to_response(account)

    async def update_roles(
        self, address: str, data: AccountRolesUpdate
    ) -> AccountResponse:
        """
        更新账户角色

        参数:
            address: 钱包地址
            data: 角色更新数据

        返回:
            AccountResponse: 更新后的账户

        异常:
            NotFoundException: 账户不存在
        """
        address = address.lower()
        account = await Account.filter(address=address, network=self.network).first()

        if not account:
            raise NotFoundException(
                f"Account {address[:10]}... not found",
                detail={"address": address},
            )

        account.roles = data.roles
        await account.save()
        return self._to_response(account)

    async def update_login_time(self, address: str) -> AccountResponse:
        """
        更新最后登录时间

        参数:
            address: 钱包地址

        返回:
            AccountResponse: 更新后的账户
        """
        address = address.lower()
        account = await Account.filter(address=address, network=self.network).first()

        if not account:
            raise NotFoundException(
                f"Account {address[:10]}... not found",
                detail={"address": address},
            )

        account.last_login_dt = datetime.now(timezone.utc)
        await account.save()
        return self._to_response(account)

    async def list(
        self, query: AccountListQuery
    ) -> Tuple[List[AccountResponse], int, int]:
        """
        查询账户列表

        参数:
            query: 查询参数

        返回:
            Tuple[List[AccountResponse], int, int]: (账户列表, 总数, 总页数)
        """
        q = Account.filter(network=self.network)

        # 应用过滤条件
        if query.roles:
            # JSONField 包含查询 - 使用 __contains 检查 roles 数组包含任意指定角色
            from tortoise.expressions import Q

            role_filters = Q()
            for role in query.roles:
                role_filters |= Q(roles__contains=[role])
            q = q.filter(role_filters)
        if query.address:
            q = q.filter(address__icontains=query.address.lower())

        total = await q.count()
        total_pages = calculate_total_pages(total, query.page_size)

        offset = (query.page - 1) * query.page_size
        accounts = (
            await q.offset(offset).limit(query.page_size).order_by("-created_at").all()
        )

        return [self._to_response(acc) for acc in accounts], total, total_pages

    async def list_by_role(
        self, role: str, page: int = 1, page_size: int = 20
    ) -> Tuple[List[AccountResponse], int, int]:
        """
        根据角色查询账户列表

        参数:
            role: 角色名称
            page: 页码
            page_size: 每页数量

        返回:
            Tuple[List[AccountResponse], int, int]: (账户列表, 总数, 总页数)
        """
        q = Account.filter(network=self.network, roles__contains=[role])

        total = await q.count()
        total_pages = calculate_total_pages(total, page_size)

        offset = (page - 1) * page_size
        accounts = await q.offset(offset).limit(page_size).order_by("-created_at").all()

        return [self._to_response(acc) for acc in accounts], total, total_pages

    async def delete(self, address: str) -> bool:
        """
        删除账户

        参数:
            address: 钱包地址

        返回:
            bool: 删除成功返回 True

        异常:
            NotFoundException: 账户不存在
        """
        address = address.lower()
        deleted_count = await Account.filter(
            address=address, network=self.network
        ).delete()

        if deleted_count == 0:
            raise NotFoundException(
                f"Account {address[:10]}... not found",
                detail={"address": address},
            )

        return True

    async def exists(self, address: str) -> bool:
        """
        检查地址是否存在

        参数:
            address: 钱包地址

        返回:
            bool: 存在返回 True
        """
        address = address.lower()
        return await Account.filter(address=address, network=self.network).exists()

    def _to_response(self, account: Account) -> AccountResponse:
        """将 ORM 模型转换为响应 Schema"""
        return AccountResponse(
            id=account.id,
            address=account.address,
            roles=account.roles if account.roles else [],
            network=account.network,
            last_login_dt=account.last_login_dt,
            created_at=account.created_at,
            updated_at=account.updated_at,
        )
