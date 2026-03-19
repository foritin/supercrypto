"""
管理员账户路由 - 账户管理

路由前缀: /api/v1/admin/accounts
"""

from typing import List

from falib.utils.handlers import PaginationInfo, create_success_response
from fastapi import APIRouter, Depends, Query, status

from src.common.dependencies import get_account_service
from src.schemas.account import (
    AccountCreate, 
    AccountListQuery, 
    AccountUpdate, 
    AccountRolesUpdate,
    ACCOUNT_ROLES,
)
from src.security import require_contract_owner
from src.services import AccountService

router = APIRouter()


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Create Account",
    description="Create a new account with wallet address and private key",
)
async def create_account(
    data: AccountCreate,
    service: AccountService = Depends(get_account_service),
):
    """
    创建账户

    - **address**: 钱包地址（必填）
    - **private_key**: 私钥（必填）
    - **roles**: 角色列表（可选）

    返回创建的账户信息（不包含私钥）
    """
    account = await service.create(data)
    # object_data 接收 Pydantic 模型，falib 会自动调用 model_dump(mode='json')
    return create_success_response(
        msg="Account created successfully", object_data=account
    )


@router.get(
    "/address/{address}",
    summary="Get Account by Address",
    description="Get detailed account information by wallet address",
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
    "",
    summary="List Accounts",
    description="List accounts with pagination and filtering",
)
async def list_accounts(
    roles: List[str] = Query(None, description="角色过滤（包含任意指定角色）"),
    address: str = Query(None, description="地址过滤（模糊搜索）"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=100, description="每页数量"),
    service: AccountService = Depends(get_account_service),
):
    """
    查询账户列表

    支持的过滤参数：
    - **roles**: 按角色过滤（包含任意指定角色）
    - **address**: 按地址模糊搜索
    - **page**: 页码（从1开始）
    - **page_size**: 每页数量（1-100）

    返回分页的账户列表
    """
    query = AccountListQuery(roles=roles, address=address, page=page, page_size=page_size)

    accounts, total, total_pages = await service.list(query)

    # 使用 falib 的 PaginationInfo
    pagination = PaginationInfo(
        total=total, page=page, page_size=page_size, total_pages=total_pages
    )

    # list_data 接收 Pydantic 模型列表，falib 会自动序列化每个元素
    return create_success_response(list_data=accounts, pagination=pagination)


@router.get(
    "/by-role/{role}",
    summary="List Accounts by Role",
    description="List accounts by specific role",
)
async def list_accounts_by_role(
    role: str,
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=100, description="每页数量"),
    service: AccountService = Depends(get_account_service),
):
    """
    根据角色查询账户列表

    - **role**: 角色名称 (可选值: admin, treasury, multisig_signer, contract_owner)
    - **page**: 页码（从1开始）
    - **page_size**: 每页数量（1-100）

    返回指定角色的账户列表
    """
    accounts, total, total_pages = await service.list_by_role(
        role=role, page=page, page_size=page_size
    )

    pagination = PaginationInfo(
        total=total, page=page, page_size=page_size, total_pages=total_pages
    )

    return create_success_response(list_data=accounts, pagination=pagination)


@router.get(
    "/roles/available",
    summary="Get Available Roles",
    description="Get list of available account roles",
)
async def get_available_roles():
    """
    获取所有可用的账户角色

    返回预定义的角色列表
    """
    return create_success_response(object_data={"roles": ACCOUNT_ROLES})


@router.put(
    "/address/{address}",
    summary="Update Account",
    description="Update account information by address",
)
async def update_account(
    address: str,
    data: AccountUpdate,
    service: AccountService = Depends(get_account_service),
):
    """
    更新账户

    - **address**: 钱包地址
    - **roles**: 角色列表（可选）
    - **network**: 网络类型（可选）

    返回更新后的账户信息
    """
    account = await service.update(address, data)
    return create_success_response(
        msg="Account updated successfully", object_data=account
    )


@router.put(
    "/address/{address}/roles",
    summary="Update Account Roles",
    description="Update account roles by address",
)
async def update_account_roles(
    address: str,
    data: AccountRolesUpdate,
    _wallet_address: str = Depends(require_contract_owner),
    service: AccountService = Depends(get_account_service),
):
    """
    更新账户角色（专用接口）

    - **address**: 钱包地址
    - **roles**: 角色列表（必填）

    返回更新后的账户信息
    """
    account = await service.update_roles(address, data)
    return create_success_response(
        msg="Account roles updated successfully", object_data=account
    )


@router.delete(
    "/address/{address}",
    summary="Delete Account",
    description="Delete an account by address",
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
