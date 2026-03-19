"""
FastAPI 权限依赖

可自由导入 services 和 models，因为不被 middleware 导入
"""

from typing import Optional

from falib.utils.config import SETTINGS
from falib.utils.log import get_logger
from fastapi import HTTPException, status
from starlette.requests import Request

from src.common.exceptions import UnauthorizedException
from src.infra import session_service
from src.models.account import Account
from src.security.exceptions import (
    AccessTokenExpiredException,
    RefreshTokenExpiredException,
)
from src.security.jwt import verify_token

logger = get_logger("system.security.deps")


def extract_token_from_header(authorization: Optional[str]) -> str:
    """
    从 Authorization header 中提取 JWT token

    Args:
        authorization: Authorization header 值，格式为 "Bearer <token>"

    Returns:
        JWT token 字符串

    Raises:
        HTTPException: 如果 header 格式不正确
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format. Use: Bearer <token>",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return parts[1]


def verify_jwt_and_get_address(token: str) -> str:
    """
    验证 JWT token 并返回钱包地址

    Args:
        token: JWT token 字符串

    Returns:
        钱包地址

    Raises:
        HTTPException: 如果 token 无效或已过期
            - 401 + "access_token_expired": access token 过期，前端应刷新 token
            - 401 + "refresh_token_expired": refresh token 过期，前端应断开 MetaMask 重新登录
    """
    try:
        payload = verify_token(token, expected_type="access")
        address = payload.get("address")
        if not address:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing address",
            )
        return address.lower()
    except AccessTokenExpiredException:
        # Access Token 过期 - 前端应使用 refresh token 刷新
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="access_token_expired",
            headers={"WWW-Authenticate": "Bearer", "X-Token-Status": "access_expired"},
        )
    except RefreshTokenExpiredException:
        # Refresh Token 过期 - 前端应断开 MetaMask 重新登录
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="refresh_token_expired",
            headers={
                "WWW-Authenticate": "Bearer",
                "X-Token-Status": "refresh_expired",
            },
        )
    except UnauthorizedException as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )


async def require_user(request: Request) -> str:
    """
    普通用户认证依赖

    前置条件：AuthStateMiddleware 已处理 JWT 解析

    检查：
    1. 是否已认证（token 有效）
    2. Token 版本号是否匹配
    3. 是否在黑名单中

    Returns:
        wallet_address: 用户钱包地址
    """

    # 从 request.state 获取认证状态
    if getattr(request.state, "is_authenticated", False):
        wallet_address = request.state.wallet_address
    else:
        # 认证失败，检查原因
        token_status = getattr(request.state, "token_status", None)
        if token_status == "access_expired":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="access_token_expired",
                headers={
                    "WWW-Authenticate": "Bearer",
                    "X-Token-Status": "access_expired",
                },
            )
        elif token_status == "refresh_expired":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="refresh_token_expired",
                headers={
                    "WWW-Authenticate": "Bearer",
                    "X-Token-Status": "refresh_expired",
                },
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required",
                headers={"WWW-Authenticate": "Bearer"},
            )

    # 验证 Token 版本号
    session_id = getattr(request.state, "session_id", None)
    if session_id:
        session = await session_service.get_session(wallet_address, session_id)

        # Session 不存在 = 已被登出
        if not session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session not found. Please login again.",
                headers={
                    "WWW-Authenticate": "Bearer",
                    "X-Token-Status": "session_not_found",
                },
            )

        # 检查版本号是否匹配
        token_version = getattr(request.state, "token_version", 1)
        session_version = session.get("token_version", 1)

        if token_version != session_version:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been invalidated. Please login again.",
                headers={
                    "WWW-Authenticate": "Bearer",
                    "X-Token-Status": "version_mismatch",
                    "X-Current-Version": str(session_version),
                    "X-Token-Version": str(token_version),
                },
            )

    # 检查是否在黑名单中（管理员封禁）
    if await session_service.is_blacklisted(wallet_address):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is blacklisted. Please contact support.",
        )

    return wallet_address


async def require_admin(request: Request) -> str:
    """
    管理员权限验证依赖

    前置条件：AuthStateMiddleware 已处理 JWT 解析

    检查：
    1. 基础认证（复用 require_user）
    2. 是否为管理员账户
    """

    # 复用用户认证
    wallet_address = await require_user(request)

    # 查询账户并验证管理员权限
    network = SETTINGS.network
    account = await Account.filter(address=wallet_address, network=network).first()

    roles = account.roles or [] if account else []
    is_admin = "admin" in roles
    is_contract_owner = "contract_owner" in roles
    is_treasury_route = request.url.path.startswith("/api/v1/admin/treasury")

    if not is_admin and not (is_treasury_route and is_contract_owner):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin permission required",
        )

    return wallet_address


async def require_multisig_signer(request: Request) -> str:
    """
    多签签名者权限验证依赖

    前置条件：AuthStateMiddleware 已处理 JWT 解析

    检查：
    1. 基础认证（复用 require_user）
    2. 是否为多签成员
    """

    # 复用用户认证
    wallet_address = await require_user(request)

    # 查询账户并验证多签成员权限
    network = SETTINGS.network
    account = await Account.filter(address=wallet_address, network=network).first()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account not found",
        )

    # 检查是否为多签成员（统一角色：multisig_signer；contract_owner 保留签名权限）
    valid_roles = ["multisig_signer", "contract_owner"]
    account_roles = account.roles or []
    if not any(role in account_roles for role in valid_roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Multisig signer permission required",
        )

    return wallet_address


async def require_contract_owner(request: Request) -> str:
    """
    合约所有者权限验证依赖

    前置条件：AuthStateMiddleware 已处理 JWT 解析

    检查：
    1. 基础认证（复用 require_user）
    2. 是否为合约所有者账户（可执行部署等管理操作）
    """

    # 复用用户认证
    wallet_address = await require_user(request)

    # 查询账户并验证合约所有者权限
    network = SETTINGS.network
    account = await Account.filter(address=wallet_address, network=network).first()

    if not account or "contract_owner" not in (account.roles or []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Contract owner permission required",
        )

    return wallet_address
