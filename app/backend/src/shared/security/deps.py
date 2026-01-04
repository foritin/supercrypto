"""
FastAPI 权限依赖

可自由导入 services 和 models，因为不被 middleware 导入
"""

from typing import Optional

from falib.utils.config import SETTINGS
from fastapi import HTTPException, status
from starlette.requests import Request

from src.shared.services import session_service
from src.models.account import Account
from src.shared.common.exceptions import UnauthorizedException
from src.shared.security.exceptions import (
    AccessTokenExpiredException,
    RefreshTokenExpiredException,
)
from src.shared.security.jwt import verify_token


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
    2. 会话是否已被撤销

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

    # 检查是否在黑名单中
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
    wallet = SETTINGS.wallet
    account = await Account.filter(address=wallet_address, net_type=wallet).first()

    if not account or account.tag != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin permission required",
        )

    return wallet_address
