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

from src.services.auth.schemas import (
    RefreshTokenRequest,
    TokenRequest,
    TokenResponse,
)
from src.shared.security import (
    RefreshTokenExpiredException,
    create_access_token,
    create_refresh_token,
    refresh_tokens,
    verify_wallet_signature,
)
from src.shared.services import session_service

logger = get_logger("business.api.auth")

# refresh token cookie 名称
REFRESH_TOKEN_COOKIE = "supercrypto_refresh_token"

router = APIRouter()


@router.post(
    "/token", summary="登录获取令牌", description="使用钱包签名登录获取 JWT 令牌"
)
async def login(
    data: TokenRequest,
    request: Request,
    response: Response,
):
    """
    登录获取令牌

    - **address**: 钱包地址
    - **signature**: 钱包签名 (对 "SlimCryptoAccess" 消息的签名)

    签名验证流程：
    1. 前端使用 MetaMask 对固定消息进行签名
    2. 后端验证签名是否来自声明的地址
    3. 验证通过后颁发 JWT token
    4. 创建 Redis 会话记录
    """
    if SETTINGS.environment in ("dev", "test") and data.backdoor and data.backdoor == SETTINGS.BACKDOOR:
        pass
    else:
        # 验证签名
        if not verify_wallet_signature(data.address, data.signature):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid signature. Please sign with the correct wallet.",
            )

    wallet_address = data.address.lower()

    # 检查是否在黑名单中
    if await session_service.is_blacklisted(wallet_address):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is blacklisted. Please contact administrator.",
        )

    # 创建会话（包含链信息）
    user_agent = request.headers.get("user-agent", "")
    client_ip = request.client.host if request.client else ""
    session_id = await session_service.create_session(
        wallet_address=wallet_address,
        user_agent=user_agent,
        ip_address=client_ip,
        chain_id=data.chain_id,
        chain_name=data.chain_name,
        network_type=data.network_type,
    )

    # 获取 session 中的 token 版本号
    token_version = await session_service.get_token_version(wallet_address, session_id)

    if data.expires_in_mins:
        expires_in_mins = data.expires_in_mins
    else:
        expires_in_mins = SETTINGS.REFRESH_TOKEN_EXPIRE_MINUTES

    expire = datetime.timedelta(minutes=expires_in_mins)
    # 存储地址、会话ID 和版本号到 token
    token_data = {
        "address": wallet_address,
        "session_id": session_id,
        "token_version": token_version,  # 添加版本号
    }
    access_token = create_access_token(token_data, expires_delta=expire)
    new_refresh_token = create_refresh_token(token_data, expires_delta=expire)

    response_data = TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="Bearer",
        expires_in_mins=expires_in_mins,
    )

    # 通过 httpOnly cookie 设置 refresh token，前端 JS 无法访问
    _set_refresh_cookie(response, new_refresh_token, expires_in_mins)

    return create_success_response(object_data=response_data)


@router.post("/refresh", summary="刷新令牌", description="使用刷新令牌获取新的访问令牌")
async def refresh_token_api(
    response: Response,
    data: Optional[RefreshTokenRequest] = None,
    supercrypto_refresh_token: Optional[str] = Cookie(None),
):
    """
    刷新令牌

    支持两种方式提供 refresh token:
    1. httpOnly cookie（推荐，页面刷新时自动携带）
    2. 请求体中的 refresh_token 字段（向后兼容）

    返回：
    - 成功：新的 access_token 和 refresh_token
    - 失败 401 "refresh_token_expired"：需要断开 MetaMask 重新登录
    """
    # 优先从 cookie 读取，其次从请求体读取
    refresh_token_value = supercrypto_refresh_token
    if not refresh_token_value and data and data.refresh_token:
        refresh_token_value = data.refresh_token

    if not refresh_token_value:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="refresh_token_expired",
            headers={
                "WWW-Authenticate": "Bearer",
                "X-Token-Status": "refresh_expired",
            },
        )

    try:
        new_access_token, new_refresh_token = refresh_tokens(refresh_token_value)
    except RefreshTokenExpiredException:
        # Refresh Token 过期 - 清除 cookie，前端应断开 MetaMask 重新登录
        _clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="refresh_token_expired",
            headers={
                "WWW-Authenticate": "Bearer",
                "X-Token-Status": "refresh_expired",
            },
        )

    response_data = TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="Bearer",
        expires_in_mins=SETTINGS.REFRESH_TOKEN_EXPIRE_MINUTES,
    )

    # 更新 httpOnly cookie 中的 refresh token
    _set_refresh_cookie(
        response, new_refresh_token, SETTINGS.REFRESH_TOKEN_EXPIRE_MINUTES
    )

    return create_success_response(object_data=response_data)


def _set_refresh_cookie(
    response: Response, refresh_token: str, expires_in_mins: int
) -> None:
    """设置 httpOnly refresh token cookie"""
    is_production = SETTINGS.environment == "production"
    response.set_cookie(
        key=REFRESH_TOKEN_COOKIE,
        value=refresh_token,
        httponly=True,
        secure=is_production,  # production 环境强制 HTTPS
        samesite="lax",
        max_age=expires_in_mins * 60,
        path="/api/v1/public/auth",  # 仅在 auth 路径下发送 cookie
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
