"""
Auth 领域 - API 路由
包含：
- 用户认证（登录、登出、刷新令牌）
- 当前用户信息
- 管理员会话管理
"""

import datetime
from typing import Optional

from falib.utils.config import SETTINGS
from falib.utils.handlers import create_success_response
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status

from src.domains.admin.service import admin_service
from src.domains.auth.schemas import (
    CurrentUserResponse,
    LogoutRequest,
    RefreshTokenRequest,
    TokenRequest,
    TokenResponse,
)
from src.domains.auth.session_service import session_service
from src.models.account import Account
from src.models.audit_log import AuditAction
from src.models.kyc import UserKyc
from src.shared.security import (
    create_access_token,
    create_refresh_token,
    refresh_tokens,
    require_admin,
    verify_wallet_signature,
)

# 用户认证路由
router = APIRouter()

# 管理员会话管理路由
admin_router = APIRouter()


# =============================================================================
# 用户认证 API
# =============================================================================


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
    - **signature**: 钱包签名 (对 "Sign in to SuperCrypto" 消息的签名)

    签名验证流程：
    1. 前端使用 MetaMask 对固定消息进行签名
    2. 后端验证签名是否来自声明的地址
    3. 验证通过后颁发 JWT token
    4. 创建 Redis 会话记录
    """
    # 验证签名
    if not verify_wallet_signature(data.address, data.signature):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid signature. Please sign with the correct wallet.",
        )

    wallet_address = data.address.lower()

    # 清除之前的撤销标记（允许重新登录）
    await session_service.clear_revoke_mark(wallet_address)

    # 创建会话
    user_agent = request.headers.get("user-agent", "")
    client_ip = request.client.host if request.client else ""
    session_id = await session_service.create_session(
        wallet_address=wallet_address,
        user_agent=user_agent,
        ip_address=client_ip,
    )

    if data.expires_in_mins:
        expires_in_mins = data.expires_in_mins
    else:
        expires_in_mins = SETTINGS.REFRESH_TOKEN_EXPIRE_MINUTES

    expire = datetime.timedelta(minutes=expires_in_mins)
    # 存储地址和会话ID到 token
    token_data = {"address": wallet_address, "session_id": session_id}
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
    """
    new_access_token, new_refresh_token = refresh_tokens(data.refresh_token)
    response = TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="Bearer",
        expires_in_mins=SETTINGS.REFRESH_TOKEN_EXPIRE_MINUTES,
    )
    return create_success_response(object_data=response)


@router.post("/logout", summary="登出", description="用户登出，清理会话")
async def logout(data: LogoutRequest):
    """
    登出

    - **wallet_address**: 钱包地址

    清理用户的所有会话数据
    """
    wallet_address = data.wallet_address.lower()

    # 撤销该用户的所有会话
    revoked_count = await session_service.revoke_all_sessions(wallet_address)

    return create_success_response(
        object_data={
            "wallet_address": wallet_address,
            "revoked_sessions": revoked_count,
        },
        msg="Logout successful",
    )


@router.get("/me", summary="获取当前用户信息", description="获取当前登录用户的信息")
async def get_current_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    x_wallet_address: Optional[str] = Header(None, alias="X-Wallet-Address"),
):
    """
    获取当前用户信息

    认证方式（优先使用 JWT）：
    1. Authorization: Bearer <token> - JWT 认证（推荐）
    2. X-Wallet-Address - 钱包地址（向后兼容，不安全）

    返回用户信息、是否为管理员、KYC 状态等
    """
    wallet_address = None

    # 优先使用 JWT 认证
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
        try:
            from src.shared.security import verify_token

            payload = verify_token(token)
            wallet_address = payload.get("address", "").lower()
        except Exception:
            # JWT 无效，尝试使用 X-Wallet-Address
            pass

    # 如果 JWT 认证失败或未提供，使用 X-Wallet-Address（向后兼容）
    if not wallet_address and x_wallet_address:
        wallet_address = x_wallet_address.lower()

    if not wallet_address:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization required. Provide JWT token or X-Wallet-Address",
        )

    environment = SETTINGS.environment or "local"

    # 检查会话是否被撤销
    # 如果用户已重新连接钱包（能发送请求），则自动清除撤销标记
    if await session_service.is_session_revoked(wallet_address):
        # 用户已重新连接，清除撤销标记允许访问
        await session_service.clear_revoke_mark(wallet_address)

    # 查询账户
    account = await Account.filter(address=wallet_address, net_type=environment).first()

    # 查询 KYC 状态
    kyc = await UserKyc.filter(
        wallet_address=wallet_address, environment=environment
    ).first()

    # 判断是否为管理员
    is_admin = account.tag == "admin" if account and account.tag else False

    response = CurrentUserResponse(
        address=wallet_address,
        is_admin=is_admin,
        tag=account.tag if account else None,
        net_type=environment,
        kyc_status=kyc.status.value if kyc else None,
    )

    return create_success_response(object_data=response.model_dump())


# =============================================================================
# 管理员会话管理 API
# =============================================================================


@admin_router.get(
    "/sessions",
    summary="获取活跃用户会话列表",
    description="获取当前所有活跃的用户登录会话（管理员）",
)
async def list_active_sessions(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    search: Optional[str] = Query(None, description="按钱包地址搜索"),
    admin_address: str = Depends(require_admin),
):
    """
    获取活跃用户会话列表

    - 支持分页
    - 支持按钱包地址搜索
    """
    sessions, total = await session_service.get_active_sessions(
        page=page,
        page_size=page_size,
        search=search,
    )

    total_pages = (total + page_size - 1) // page_size

    return create_success_response(
        list_data=sessions,
        pagination={
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        },
    )


@admin_router.post(
    "/sessions/{wallet_address}/revoke",
    summary="强制下线用户",
    description="撤销指定用户的所有登录会话（管理员）",
)
async def revoke_user_sessions(
    wallet_address: str,
    admin_address: str = Depends(require_admin),
):
    """
    强制下线用户

    - **wallet_address**: 要下线的用户钱包地址

    撤销该用户的所有会话，用户下次请求将收到 401 错误
    """
    wallet_address = wallet_address.lower()

    # 防止管理员下线自己
    if wallet_address == admin_address:
        return create_success_response(
            object_data={"error": "Cannot revoke your own session"},
            msg="不能下线自己的会话",
        )

    # 撤销会话
    revoked_count = await session_service.revoke_all_sessions(wallet_address)

    # 记录审计日志
    await admin_service.create_audit_log(
        operator_address=admin_address,
        action=AuditAction.USER_SESSION_REVOKE,
        target_type="session",
        target_id=wallet_address,
        details={
            "revoked_sessions": revoked_count,
            "target_address": wallet_address,
        },
        success=True,
    )

    return create_success_response(
        object_data={
            "wallet_address": wallet_address,
            "revoked_sessions": revoked_count,
        },
        msg=f"已强制下线用户 {wallet_address[:8]}...，撤销 {revoked_count} 个会话",
    )


@admin_router.get(
    "/sessions/{wallet_address}",
    summary="获取用户会话列表",
    description="获取指定用户的所有活跃会话（管理员）",
)
async def get_user_sessions(
    wallet_address: str,
    admin_address: str = Depends(require_admin),
):
    """
    获取用户会话列表

    - **wallet_address**: 用户钱包地址
    """
    wallet_address = wallet_address.lower()
    sessions = await session_service.get_user_sessions(wallet_address)

    return create_success_response(
        list_data=sessions,
        object_data={"wallet_address": wallet_address, "session_count": len(sessions)},
    )
