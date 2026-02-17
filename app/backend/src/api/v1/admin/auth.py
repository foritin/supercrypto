"""
管理员认证路由 - 会话管理、黑名单

路由前缀: /api/v1/admin/auth
"""

from typing import Optional

from falib.utils.handlers import PaginationInfo, create_success_response
from fastapi import APIRouter, Depends, Query

from src.common.dependencies import audit_service, session_service
from src.common.utils import calculate_total_pages
from src.schemas.enums import AuditAction, AuditCategory, AuditStatus
from src.security import require_admin

router = APIRouter()


@router.get(
    "/sessions",
    summary="List Active Sessions",
    description="Get all active user login sessions (admin)",
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

    total_pages = calculate_total_pages(total, page_size)

    return create_success_response(
        list_data=sessions,
        pagination=PaginationInfo(
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        ),
    )


@router.post(
    "/sessions/{wallet_address}/revoke",
    summary="Revoke User Sessions",
    description="Revoke all login sessions for a user (admin)",
)
async def revoke_user_sessions(
    wallet_address: str,
    admin_address: str = Depends(require_admin),
):
    """强制下线用户 — 撤销该用户的所有会话，用户下次请求将收到 401 错误"""
    wallet_address = wallet_address.lower()

    if wallet_address == admin_address:
        return create_success_response(
            object_data={"error": "Cannot blacklist yourself"},
            msg="不能将自己加入黑名单",
        )

    cleared_count = await session_service.add_to_blacklist(wallet_address)

    await audit_service.log_async(
        category=AuditCategory.AUTH,
        action=AuditAction.USER_SESSION_REVOKE,
        operator_address=admin_address,
        operator_type="admin",
        target_type="session",
        target_address=wallet_address,
        status=AuditStatus.SUCCESS,
        description=f"Session revoked for {wallet_address[:10]}...",
        extra_data={
            "cleared_sessions": cleared_count,
            "target_address": wallet_address,
        },
    )

    return create_success_response(
        object_data={
            "wallet_address": wallet_address,
            "cleared_sessions": cleared_count,
        },
        msg=f"已将用户 {wallet_address[:8]}... 加入黑名单，清除 {cleared_count} 个会话",
    )


@router.get(
    "/sessions/{wallet_address}",
    summary="Get User Sessions",
    description="Get all active sessions for a specific user (admin)",
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


@router.delete(
    "/blacklist/{wallet_address}",
    summary="Remove from Blacklist",
    description="Remove a user from the blacklist to allow re-login (admin)",
)
async def remove_user_from_blacklist(
    wallet_address: str,
    admin_address: str = Depends(require_admin),
):
    """解除用户黑名单"""
    wallet_address = wallet_address.lower()

    if not await session_service.is_blacklisted(wallet_address):
        return create_success_response(
            object_data={"wallet_address": wallet_address, "was_blacklisted": False},
            msg="用户不在黑名单中",
        )

    await session_service.remove_from_blacklist(wallet_address)

    await audit_service.log_async(
        category=AuditCategory.AUTH,
        action=AuditAction.USER_BLACKLIST_REMOVE,
        operator_address=admin_address,
        operator_type="admin",
        target_type="blacklist",
        target_address=wallet_address,
        status=AuditStatus.SUCCESS,
        description=f"Removed {wallet_address[:10]}... from blacklist",
        extra_data={
            "action": "remove_from_blacklist",
            "target_address": wallet_address,
        },
    )

    return create_success_response(
        object_data={"wallet_address": wallet_address, "was_blacklisted": True},
        msg=f"已将用户 {wallet_address[:8]}... 从黑名单移除",
    )


@router.get(
    "/blacklist/{wallet_address}",
    summary="Check Blacklist Status",
    description="Check if a user is blacklisted (admin)",
)
async def check_blacklist_status(
    wallet_address: str,
    admin_address: str = Depends(require_admin),
):
    """
    检查用户黑名单状态

    - **wallet_address**: 用户钱包地址
    """
    wallet_address = wallet_address.lower()
    is_blacklisted = await session_service.is_blacklisted(wallet_address)

    return create_success_response(
        object_data={
            "wallet_address": wallet_address,
            "is_blacklisted": is_blacklisted,
        },
    )
