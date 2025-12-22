"""
Auth 领域模块
负责用户认证、会话管理相关的所有业务逻辑
"""

from src.domains.auth.routes import admin_router, router
from src.domains.auth.schemas import (
    CurrentUserResponse,
    LogoutRequest,
    RefreshTokenRequest,
    SessionInfo,
    TokenRequest,
    TokenResponse,
)
from src.domains.auth.session_service import SessionService, session_service

__all__ = [
    # 路由
    "router",
    "admin_router",
    # Schemas
    "TokenRequest",
    "TokenResponse",
    "RefreshTokenRequest",
    "LogoutRequest",
    "CurrentUserResponse",
    "SessionInfo",
    # Services
    "SessionService",
    "session_service",
]
