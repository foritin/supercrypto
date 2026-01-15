"""
管理员账户路由 - 账户管理

路由前缀: /api/v1/admin/accounts
"""

from falib.utils.config import SETTINGS
from falib.utils.handlers import PaginationInfo, create_success_response
from fastapi import APIRouter, Depends, Query, status

from src.services.account.schemas import (
    AccountCreate,
    AccountListQuery,
    AccountUpdate,
)
from src.services.account.service import AccountService

router = APIRouter()


def get_account_service() -> AccountService:
    """依赖注入：获取账户服务"""
    return AccountService()


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    summary="创建账户",
    description="创建新的账户，需要提供钱包地址和私钥",
)
async def create_account(
    data: AccountCreate,
    service: AccountService = Depends(get_account_service),
):
    """
    创建账户

    - **address**: 钱包地址（必填）
    - **private_key**: 私钥（必填）
    - **tag**: 标签（可选）

    返回创建的账户信息（不包含私钥）
    """
    account = await service.create(data)
    # object_data 接收 Pydantic 模型，falib 会自动调用 model_dump(mode='json')
    return create_success_response(
        msg="Account created successfully", object_data=account
    )


@router.get(
    "/address/{address}",
    summary="根据地址获取账户",
    description="根据钱包地址获取账户详细信息",
)
async def get_account_by_address(
    address: str,
    service: AccountService = Depends(get_account_service),
):
    """
    根据地址获取账户

    - **address**: 钱包地址

    返回账户详细信息
    """
    account = await service.get_by_address(address)
    return create_success_response(object_data=account)


@router.get(
    "/",
    summary="查询账户列表",
    description="查询账户列表，支持分页和过滤",
)
async def list_accounts(
    tag: str = Query(None, description="标签过滤（模糊搜索）"),
    address: str = Query(None, description="地址过滤（模糊搜索）"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=100, description="每页数量"),
    service: AccountService = Depends(get_account_service),
):
    """
    查询账户列表

    支持的过滤参数：
    - **tag**: 按标签模糊搜索
    - **address**: 按地址模糊搜索
    - **page**: 页码（从1开始）
    - **page_size**: 每页数量（1-100）

    返回分页的账户列表
    """
    query = AccountListQuery(
        tag=tag, address=address, page=page, page_size=page_size
    )

    accounts, total, total_pages = await service.list(query)

    # 使用 falib 的 PaginationInfo
    pagination = PaginationInfo(
        total=total, page=page, page_size=page_size, total_pages=total_pages
    )

    # list_data 接收 Pydantic 模型列表，falib 会自动序列化每个元素
    return create_success_response(list_data=accounts, pagination=pagination)


@router.put(
    "/address/{address}",
    summary="更新账户",
    description="根据地址更新账户信息",
)
async def update_account(
    address: str,
    data: AccountUpdate,
    service: AccountService = Depends(get_account_service),
):
    """
    更新账户

    - **address**: 钱包地址
    - **tag**: 新标签（可选）

    返回更新后的账户信息
    """
    account = await service.update(address, data)
    return create_success_response(
        msg="Account updated successfully", object_data=account
    )


@router.delete(
    "/address/{address}",
    summary="删除账户",
    description="根据地址删除账户",
)
async def delete_account(
    address: str,
    service: AccountService = Depends(get_account_service),
):
    """
    删除账户

    - **address**: 钱包地址

    返回删除结果
    """
    await service.delete(address)
    return create_success_response(
        msg="Account deleted successfully", object_data={"address": address}
    )
