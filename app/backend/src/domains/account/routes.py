"""
Account 领域 - API 路由
管理员级别接口，用于账户管理
"""

from fastapi import APIRouter, Depends, Query, status

from src.domains.account.schemas import (
    AccountCreate,
    AccountListQuery,
    AccountResponse,
    AccountUpdate,
)
from src.domains.account.services import AccountService
from src.shared.schemas.base import ApiResponse, PaginatedResponse

# 管理员路由（认证由 api/v1/router.py 的 admin_router 统一注入）
admin_router = APIRouter()


def get_account_service() -> AccountService:
    """依赖注入：获取账户服务"""
    return AccountService()


@admin_router.post(
    "/",
    response_model=ApiResponse[AccountResponse],
    status_code=status.HTTP_201_CREATED,
    summary="创建账户",
    description="创建新的账户，需要提供钱包地址和私钥",
)
async def create_account(
    data: AccountCreate, service: AccountService = Depends(get_account_service)
):
    """
    创建账户

    - **address**: 钱包地址（必填）
    - **private_key**: 私钥（必填）
    - **net_type**: 网络类型 (local/test/main)，默认local
    - **tag**: 标签（可选）

    返回创建的账户信息（不包含私钥）
    """
    account = await service.create_account(data)
    return ApiResponse(data=account, message="Account created successfully")


@admin_router.get(
    "/{account_id}",
    response_model=ApiResponse[AccountResponse],
    summary="获取账户详情",
    description="根据账户ID获取账户详细信息",
)
async def get_account(
    account_id: int, service: AccountService = Depends(get_account_service)
):
    """
    获取账户详情

    - **account_id**: 账户ID

    返回账户详细信息
    """
    account = await service.get_account(account_id)
    return ApiResponse(data=account)


@admin_router.get(
    "/",
    response_model=ApiResponse[PaginatedResponse[AccountResponse]],
    summary="查询账户列表",
    description="查询账户列表，支持分页和过滤",
)
async def list_accounts(
    net_type: str = Query(None, description="网络类型过滤"),
    tag: str = Query(None, description="标签过滤（模糊搜索）"),
    address: str = Query(None, description="地址过滤（模糊搜索）"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=100, description="每页数量"),
    service: AccountService = Depends(get_account_service),
):
    """
    查询账户列表

    支持的过滤参数：
    - **net_type**: 按网络类型过滤
    - **tag**: 按标签模糊搜索
    - **address**: 按地址模糊搜索
    - **page**: 页码（从1开始）
    - **page_size**: 每页数量（1-100）

    返回分页的账户列表
    """
    query = AccountListQuery(
        net_type=net_type, tag=tag, address=address, page=page, page_size=page_size
    )

    accounts, total, total_pages = await service.list_accounts(query)

    paginated = PaginatedResponse(
        items=accounts,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )

    return ApiResponse(data=paginated)


@admin_router.put(
    "/{account_id}",
    response_model=ApiResponse[AccountResponse],
    summary="更新账户",
    description="更新账户信息（标签、网络类型等）",
)
async def update_account(
    account_id: int,
    data: AccountUpdate,
    service: AccountService = Depends(get_account_service),
):
    """
    更新账户

    - **account_id**: 账户ID
    - **tag**: 新标签（可选）
    - **net_type**: 新网络类型（可选）

    返回更新后的账户信息
    """
    account = await service.update_account(account_id, data)
    return ApiResponse(data=account, message="Account updated successfully")


@admin_router.post(
    "/{account_id}/login",
    response_model=ApiResponse[AccountResponse],
    summary="记录登录",
    description="更新账户的最后登录时间",
)
async def record_login(
    account_id: int, service: AccountService = Depends(get_account_service)
):
    """
    记录账户登录

    - **account_id**: 账户ID

    更新last_login_dt字段并返回账户信息
    """
    account = await service.update_login_time(account_id)
    return ApiResponse(data=account, message="Login recorded successfully")
