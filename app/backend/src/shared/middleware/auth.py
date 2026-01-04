"""
认证状态中间件

职责：解析 JWT 并注入用户身份到 request.state
不做拦截，权限校验由路由依赖处理

Architecture Decision:
- ADR-1: 中间件仅解析和注入，不拦截请求
- ADR-2: 身份信息存储在 request.state
- ADR-3: 公开路径基于前缀判断
"""

from typing import Callable

from falib.utils.log import get_logger
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from src.shared.security.exceptions import (
    AccessTokenExpiredException,
    RefreshTokenExpiredException,
)
from src.shared.security.jwt import verify_token

logger = get_logger("auth.middleware")


# 无需解析 JWT 的路径前缀
PUBLIC_PATH_PREFIXES = [
    "/api/v1/public/",  # 所有公开接口（包括 /public/auth/*）
    "/docs",
    "/redoc",
    "/openapi.json",
    "/health",
    "/favicon.ico",
]


class AuthStateMiddleware(BaseHTTPMiddleware):
    """
    认证状态中间件

    功能：
    - 解析 JWT token 并注入到 request.state
    - 不做强制拦截，由后续依赖决定是否需要认证
    - 公开路径跳过解析以优化性能

    注入的 state 属性：
    - is_authenticated: bool - 是否已认证
    - wallet_address: str | None - 钱包地址（小写）
    - session_id: str | None - 会话 ID
    - token_status: str | None - token 状态 (valid/expired/invalid)
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """处理请求，解析 JWT 并注入认证状态"""
        # 初始化认证状态
        request.state.is_authenticated = False
        request.state.wallet_address = None
        request.state.session_id = None
        request.state.token_status = None  # None / "valid" / "expired" / "invalid"

        path = request.url.path

        # 公开路径跳过 JWT 解析
        if self._is_public_path(path):
            return await call_next(request)

        # 尝试解析 JWT
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:]
            self._parse_token(request, token)

        return await call_next(request)

    def _is_public_path(self, path: str) -> bool:
        """检查是否为公开路径"""
        return any(path.startswith(prefix) for prefix in PUBLIC_PATH_PREFIXES)

    def _parse_token(self, request: Request, token: str) -> None:
        """解析 JWT token 并注入到 request.state"""
        try:
            payload = verify_token(token, expected_type="access")
            request.state.is_authenticated = True
            request.state.wallet_address = payload.get("address", "").lower()
            request.state.session_id = payload.get("session_id")
            request.state.token_status = "valid"

            logger.debug(f"Auth: {request.state.wallet_address[:8]}... authenticated")

        except AccessTokenExpiredException:
            request.state.token_status = "access_expired"
            logger.debug("Auth: access token expired")

        except RefreshTokenExpiredException:
            request.state.token_status = "refresh_expired"
            logger.debug("Auth: refresh token expired")

        except Exception as e:
            request.state.token_status = "invalid"
            logger.debug(f"Auth: invalid token - {e}")
