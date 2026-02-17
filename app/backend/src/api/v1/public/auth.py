"""
公开认证路由 - 登录、登出、刷新令牌

路由前缀: /api/v1/public/auth

安全策略:
- access token 通过 JSON 响应返回，前端仅在内存中保持
- refresh token 通过 httpOnly cookie 设置，前端无法通过 JS 访问
- 页面刷新时通过 /auth/refresh 端点（读取 cookie）换取新 access token
"""

import datetime
from typing import Optional

from falib.utils.config import SETTINGS
from falib.utils.handlers import create_success_response
from falib.utils.log import get_logger
from fastapi import APIRouter, Cookie, HTTPException, Request, Response, status

from src.common.dependencies import session_service
from src.schemas.auth import (
    RefreshTokenRequest,
    TokenRequest,
    TokenResponse,
)
from src.security import (
    REFRESH_TOKEN_COOKIE,
    RefreshTokenExpiredException,
    create_access_token,
    create_refresh_token,
    refresh_tokens,
    verify_wallet_signature,
)

logger = get_logger("business.api.auth")

router = APIRouter()


# ============ 内部辅助函数 ============


async def _authenticate_and_create_session(
    data: TokenRequest,
    request: Request,
) -> tuple[str, str, int]:
    """验证签名、创建会话、生成令牌，返回 (access_token, refresh_token, expires_in_mins)"""
    if not (
        SETTINGS.environment in ("dev", "test")
        and data.backdoor
        and data.backdoor == SETTINGS.BACKDOOR
    ):
        if not verify_wallet_signature(data.address, data.signature):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid signature. Please sign with the correct wallet.",
            )

    wallet_address = data.address.lower()
    if await session_service.is_blacklisted(wallet_address):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is blacklisted. Please contact administrator.",
        )

    session_id = await session_service.create_session(
        wallet_address=wallet_address,
        user_agent=request.headers.get("user-agent", ""),
        ip_address=request.client.host if request.client else "",
        chain_id=data.chain_id,
        chain_name=data.chain_name,
        network_type=data.network_type,
    )
    token_version = await session_service.get_token_version(wallet_address, session_id)
    expires_in_mins = data.expires_in_mins or SETTINGS.REFRESH_TOKEN_EXPIRE_MINUTES
    expire = datetime.timedelta(minutes=expires_in_mins)
    token_data = {
        "address": wallet_address,
        "session_id": session_id,
        "token_version": token_version,
    }
    return (
        create_access_token(token_data, expires_delta=expire),
        create_refresh_token(token_data, expires_delta=expire),
        expires_in_mins,
    )


def _set_refresh_cookie(
    response: Response, refresh_token: str, expires_in_mins: int
) -> None:
    """设置 httpOnly refresh token cookie"""
    is_production = SETTINGS.environment == "production"
    response.set_cookie(
        key=REFRESH_TOKEN_COOKIE,
        value=refresh_token,
        httponly=True,
        secure=is_production,
        samesite="lax",
        max_age=expires_in_mins * 60,
        path="/api/v1/public/auth",
    )


def _clear_refresh_cookie(response: Response) -> None:
    """清除 refresh token cookie"""
    is_production = SETTINGS.environment == "production"
    response.delete_cookie(
        key=REFRESH_TOKEN_COOKIE,
        httponly=True,
        secure=is_production,
        samesite="lax",
        path="/api/v1/public/auth",
    )


# ============ 路由端点 ============


@router.post(
    "/token",
    summary="Login",
    description="Login with wallet signature to obtain JWT token",
)
async def login(data: TokenRequest, request: Request, response: Response):
    """登录获取令牌 — 验证钱包签名后颁发 JWT token 并创建 Redis 会话"""
    (
        access_token,
        new_refresh_token,
        expires_in_mins,
    ) = await _authenticate_and_create_session(data, request)

    response_data = TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="Bearer",
        expires_in_mins=expires_in_mins,
    )
    _set_refresh_cookie(response, new_refresh_token, expires_in_mins)
    return create_success_response(object_data=response_data)


@router.post(
    "/refresh",
    summary="Refresh Token",
    description="Obtain a new access token using a refresh token",
)
async def refresh_token_api(
    response: Response,
    data: Optional[RefreshTokenRequest] = None,
    supercrypto_refresh_token: Optional[str] = Cookie(None),
):
    """刷新令牌 — 支持 httpOnly cookie 或请求体提供 refresh token"""
    refresh_token_value = supercrypto_refresh_token
    if not refresh_token_value and data and data.refresh_token:
        refresh_token_value = data.refresh_token

    if not refresh_token_value:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="refresh_token_expired",
            headers={"WWW-Authenticate": "Bearer", "X-Token-Status": "refresh_expired"},
        )

    try:
        new_access_token, new_refresh_token = refresh_tokens(refresh_token_value)
    except RefreshTokenExpiredException:
        _clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="refresh_token_expired",
            headers={"WWW-Authenticate": "Bearer", "X-Token-Status": "refresh_expired"},
        )

    response_data = TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="Bearer",
        expires_in_mins=SETTINGS.REFRESH_TOKEN_EXPIRE_MINUTES,
    )
    _set_refresh_cookie(
        response, new_refresh_token, SETTINGS.REFRESH_TOKEN_EXPIRE_MINUTES
    )
    return create_success_response(object_data=response_data)
