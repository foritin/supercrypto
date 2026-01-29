"""
Auth 服务模块
负责用户认证、会话管理相关的所有业务逻辑

注意：路由已移至 src/api/v1/ 按权限级别组织
"""

from src.services.auth.schemas import (
                                       CurrentUserResponse,
                                       LogoutRequest,
                                       RefreshTokenRequest,
                                       SessionInfo,
                                       TokenRequest,
                                       TokenResponse,
)
from src.services.auth.service import AuthService, get_auth_service
from src.shared.services import SessionService, session_service

__all__ = [
    # Schemas
    "TokenRequest",
    "TokenResponse",
    "RefreshTokenRequest",
    "LogoutRequest",
    "CurrentUserResponse",
    "SessionInfo",
    # Services
    "AuthService",
    "get_auth_service",
    "SessionService",
    "session_service",
]
