"""
管理员认证路由 - 会话管理、黑名单

路由前缀: /api/v1/admin/auth
"""

from typing import Optional

from falib.utils.handlers import create_success_response
from fastapi import APIRouter, Depends, Query

from src.shared.security import require_admin
from src.shared.services import session_service

router = APIRouter()


@router.get(
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


@router.post(
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
    from src.services.audit.service import audit_service
    from src.shared.schemas.enums import AuditAction, AuditCategory, AuditStatus

    wallet_address = wallet_address.lower()

    # 防止管理员下线自己
    if wallet_address == admin_address:
        return create_success_response(
            object_data={"error": "Cannot blacklist yourself"},
            msg="不能将自己加入黑名单",
        )

    # 加入黑名单
    cleared_count = await session_service.add_to_blacklist(wallet_address)

    # 记录审计日志
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


@router.delete(
    "/blacklist/{wallet_address}",
    summary="解除黑名单",
    description="将用户从黑名单移除，允许重新登录（管理员）",
)
async def remove_user_from_blacklist(
    wallet_address: str,
    admin_address: str = Depends(require_admin),
):
    """
    解除用户黑名单

    - **wallet_address**: 用户钱包地址
    """
    from src.services.audit.service import audit_service
    from src.shared.schemas.enums import AuditAction, AuditCategory, AuditStatus

    wallet_address = wallet_address.lower()

    # 检查是否在黑名单
    if not await session_service.is_blacklisted(wallet_address):
        return create_success_response(
            object_data={"wallet_address": wallet_address, "was_blacklisted": False},
            msg="用户不在黑名单中",
        )

    # 解除黑名单
    await session_service.remove_from_blacklist(wallet_address)

    # 记录审计日志
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
    summary="检查黑名单状态",
    description="检查用户是否在黑名单中（管理员）",
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
