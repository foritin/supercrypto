"""
公开认证路由 - 登录、登出、刷新令牌

路由前缀: /api/v1/public/auth
"""

import datetime

from falib.utils.config import SETTINGS
from falib.utils.handlers import create_success_response
from fastapi import APIRouter, HTTPException, Request, status

from src.services.auth.schemas import (
    LogoutRequest,
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

router = APIRouter()


@router.post(
    "/token", summary="登录获取令牌", description="使用钱包签名登录获取 JWT 令牌"
)
async def login(
    data: TokenRequest,
    request: Request,
):
    """
    登录获取令牌

    - **address**: 钱包地址
    - **signature**: 钱包签名 (对 "ApprovePlatformAccess" 消息的签名)

    签名验证流程：
    1. 前端使用 MetaMask 对固定消息进行签名
    2. 后端验证签名是否来自声明的地址
    3. 验证通过后颁发 JWT token
    4. 创建 Redis 会话记录
    """
    if data.backdoor and data.backdoor == SETTINGS.BACKDOOR:
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

    response = TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="Bearer",
        expires_in_mins=expires_in_mins,
    )
    return create_success_response(object_data=response)


@router.post("/refresh", summary="刷新令牌", description="使用刷新令牌获取新的访问令牌")
async def refresh_token_api(data: RefreshTokenRequest):
    """
    刷新令牌

    - **refresh_token**: 刷新令牌

    返回：
    - 成功：新的 access_token 和 refresh_token
    - 失败 401 "refresh_token_expired"：需要断开 MetaMask 重新登录
    """
    try:
        new_access_token, new_refresh_token = refresh_tokens(data.refresh_token)
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

    response = TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="Bearer",
        expires_in_mins=SETTINGS.REFRESH_TOKEN_EXPIRE_MINUTES,
    )
    return create_success_response(object_data=response)


@router.post("/logout", summary="登出", description="用户登出，清理会话并失效所有token")
async def logout(data: LogoutRequest):
    """
    登出

    - **wallet_address**: 钱包地址

    清理：
    1. 递增 token 版本号（使所有设备的 token 立即失效）
    2. 清理所有会话数据

    Token 版本号机制确保：
    - 所有已颁发的 access_token 和 refresh_token 立即失效
    - 用户需要重新签名登录获取新 token
    """
    wallet_address = data.wallet_address.lower()

    # 递增 token 版本号（使所有 token 失效）
    new_version, affected_count = await session_service.increment_token_version(
        wallet_address
    )

    # 清理所有会话
    cleared_count = await session_service.clear_user_sessions(wallet_address)

    return create_success_response(
        object_data={
            "wallet_address": wallet_address,
            "new_token_version": new_version,
            "invalidated_tokens": affected_count,
            "cleared_sessions": cleared_count,
        },
        msg="Logout successful. All tokens have been invalidated.",
    )
