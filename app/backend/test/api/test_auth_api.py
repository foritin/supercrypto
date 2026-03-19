"""
认证 API 集成测试

使用 httpx.AsyncClient 测试 FastAPI 认证端点:
- POST /api/v1/public/auth/token  (登录)
- POST /api/v1/public/auth/refresh (刷新令牌)
- GET  /api/v1/user/auth/me       (当前用户 - 需认证)

验证:
- Requirements 8.7: API 集成测试覆盖认证、授权、响应格式
- Requirements 1.3: 生产环境后门被阻止
- Requirements 1.5: 登出需要认证
"""

import asyncio
import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import jwt
from httpx import ASGITransport, AsyncClient


def run_async(coro):
    """在同步上下文中运行异步协程"""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


# ============================================================
# 辅助函数
# ============================================================


def _create_test_token(address: str, session_id: str = "test-session") -> str:
    """创建测试用 JWT access token"""
    from src.security.jwt import create_access_token

    return create_access_token(
        {"address": address, "session_id": session_id, "token_version": 1},
        expires_delta=datetime.timedelta(minutes=30),
    )


def _get_app():
    """获取 FastAPI app 实例（延迟导入避免初始化问题）"""
    from main import app

    return app


def _mock_session_service():
    """创建 mock 的 session_service，模拟 Redis 会话管理"""
    mock = MagicMock()
    mock.is_blacklisted = AsyncMock(return_value=False)
    mock.create_session = AsyncMock(return_value="test-session-id")
    mock.get_token_version = AsyncMock(return_value=1)
    mock.get_session = AsyncMock(
        return_value={"token_version": 1, "wallet_address": "0x" + "a" * 40}
    )
    return mock


# ============================================================
# 测试类: 登录端点
# ============================================================


class TestLoginEndpoint:
    """POST /api/v1/public/auth/token 登录测试"""

    def test_login_uses_access_expiry_and_refresh_cookie_lifetime(self):
        """登录响应的 expires_in_mins 应为 access 过期时间，cookie Max-Age 应为 refresh 过期时间"""

        async def _test():
            app = _get_app()
            mock_ss = _mock_session_service()
            mock_account_service = MagicMock()
            mock_account_service.get_or_none = AsyncMock(return_value=MagicMock())
            mock_account_service.create = AsyncMock()
            mock_settings = MagicMock()
            mock_settings.environment = "dev"
            mock_settings.BACKDOOR = "test-backdoor-password"
            mock_settings.ACCESS_TOKEN_EXPIRE_MINUTES = 15
            mock_settings.REFRESH_TOKEN_EXPIRE_MINUTES = 10080
            mock_settings.CHAIN = MagicMock()
            mock_settings.CHAIN.NETWORK = "hardhat"
            mock_settings.NETWORK = "hardhat"

            from src.common.dependencies import get_account_service

            app.dependency_overrides[get_account_service] = lambda: mock_account_service

            try:
                with (
                    patch("src.api.v1.public.auth.SETTINGS", mock_settings),
                    patch("src.api.v1.public.auth.session_service", mock_ss),
                    patch("src.security.deps.session_service", mock_ss),
                ):
                    transport = ASGITransport(app=app)
                    async with AsyncClient(
                        transport=transport, base_url="http://test"
                    ) as client:
                        resp = await client.post(
                            "/api/v1/public/auth/token",
                            json={
                                "address": "0x" + "a" * 40,
                                "signature": "0xanything",
                                "backdoor": "test-backdoor-password",
                                "chain_id": 31337,
                                "chain_name": "Hardhat",
                            },
                        )

                        assert resp.status_code == 200, (
                            f"登录应成功，实际: {resp.status_code}, body: {resp.text}"
                        )
                        data = resp.json()
                        object_data = data.get("data", {}).get("object_data", {})

                        assert object_data.get("expires_in_mins") == 15, (
                            "expires_in_mins 应使用 ACCESS_TOKEN_EXPIRE_MINUTES"
                        )

                        access_payload = jwt.decode(
                            object_data["access_token"],
                            options={"verify_signature": False},
                            algorithms=["HS256"],
                        )
                        refresh_payload = jwt.decode(
                            object_data["refresh_token"],
                            options={"verify_signature": False},
                            algorithms=["HS256"],
                        )

                        assert refresh_payload["exp"] > access_payload["exp"], (
                            "refresh token 过期时间应晚于 access token"
                        )
            finally:
                app.dependency_overrides.pop(get_account_service, None)

        run_async(_test())

    def test_login_requires_signature(self):
        """登录需要有效签名 — 无签名或无效签名应返回 401"""

        async def _test():
            app = _get_app()
            mock_ss = _mock_session_service()

            with (
                patch("src.api.v1.public.auth.session_service", mock_ss),
                patch("src.security.deps.session_service", mock_ss),
            ):
                transport = ASGITransport(app=app)
                async with AsyncClient(
                    transport=transport, base_url="http://test"
                ) as client:
                    resp = await client.post(
                        "/api/v1/public/auth/token",
                        json={
                            "address": "0x" + "a" * 40,
                            "signature": "0xinvalid",
                        },
                    )
                    assert resp.status_code == 401, (
                        f"无效签名应返回 401，实际: {resp.status_code}"
                    )

        run_async(_test())

    def test_login_backdoor_blocked_in_production(self):
        """生产环境后门被阻止 — production 环境下后门密码不应生效"""

        async def _test():
            app = _get_app()
            mock_ss = _mock_session_service()
            mock_settings = MagicMock()
            mock_settings.environment = "production"
            mock_settings.BACKDOOR = "test-backdoor-password"
            mock_settings.JWT_SECRET = "***REMOVED***"
            mock_settings.ACCESS_TOKEN_EXPIRE_MINUTES = 120
            mock_settings.REFRESH_TOKEN_EXPIRE_MINUTES = 20160
            mock_settings.network = "mainnet"

            with (
                patch("src.api.v1.public.auth.SETTINGS", mock_settings),
                patch("src.api.v1.public.auth.session_service", mock_ss),
                patch("src.security.deps.session_service", mock_ss),
            ):
                transport = ASGITransport(app=app)
                async with AsyncClient(
                    transport=transport, base_url="http://test"
                ) as client:
                    resp = await client.post(
                        "/api/v1/public/auth/token",
                        json={
                            "address": "0x" + "b" * 40,
                            "signature": "0xinvalid",
                            "backdoor": "test-backdoor-password",
                        },
                    )
                    assert resp.status_code == 401, (
                        f"production 环境后门应被阻止，实际: {resp.status_code}"
                    )

        run_async(_test())

    def test_login_backdoor_works_in_dev(self):
        """开发环境后门可用 — dev 环境下正确的后门密码应允许登录"""

        async def _test():
            app = _get_app()
            mock_ss = _mock_session_service()

            with (
                patch("src.api.v1.public.auth.session_service", mock_ss),
                patch("src.security.deps.session_service", mock_ss),
            ):
                transport = ASGITransport(app=app)
                async with AsyncClient(
                    transport=transport, base_url="http://test"
                ) as client:
                    from falib.utils.config import SETTINGS

                    resp = await client.post(
                        "/api/v1/public/auth/token",
                        json={
                            "address": "0x" + "c" * 40,
                            "signature": "0xanything",
                            "backdoor": SETTINGS.BACKDOOR,
                        },
                    )
                    assert resp.status_code == 200, (
                        f"dev 环境后门应生效，实际: {resp.status_code}, body: {resp.text}"
                    )
                    data = resp.json()
                    assert data["code"] == 200
                    object_data = data.get("data", {}).get("object_data", {})
                    assert "access_token" in object_data, (
                        f"响应应包含 access_token，实际: {object_data}"
                    )

        run_async(_test())


# ============================================================
# 测试类: 需要认证的端点
# ============================================================


class TestAuthenticatedEndpoints:
    """需要认证的端点测试"""

    def test_logout_requires_authentication(self):
        """用户端点需要认证 — 未携带 token 访问应返回 401"""

        async def _test():
            app = _get_app()
            mock_ss = _mock_session_service()

            with patch("src.security.deps.session_service", mock_ss):
                transport = ASGITransport(app=app)
                async with AsyncClient(
                    transport=transport, base_url="http://test"
                ) as client:
                    resp = await client.get("/api/v1/user/auth/me")
                    assert resp.status_code == 401, (
                        f"未认证应返回 401，实际: {resp.status_code}"
                    )

        run_async(_test())

    def test_user_endpoint_with_valid_token(self):
        """携带有效 token 可访问用户端点"""

        async def _test():
            app = _get_app()
            address = "0x" + "d" * 40
            token = _create_test_token(address, session_id="test-session")
            mock_ss = _mock_session_service()
            mock_ss.get_session = AsyncMock(
                return_value={"token_version": 1, "wallet_address": address}
            )

            mock_account = MagicMock()
            mock_account.tag = "user"
            mock_account.address = address

            mock_auth_service = MagicMock()
            mock_auth_service.get_current_user_info = AsyncMock(
                return_value={
                    "account": mock_account,
                    "kyc": None,
                    "is_admin": False,
                    "network": MagicMock(value="hardhat"),
                }
            )

            with (
                patch("src.security.deps.session_service", mock_ss),
                patch(
                    "src.api.v1.user.auth.get_auth_service",
                    return_value=mock_auth_service,
                ),
            ):
                transport = ASGITransport(app=app)
                async with AsyncClient(
                    transport=transport, base_url="http://test"
                ) as client:
                    resp = await client.get(
                        "/api/v1/user/auth/me",
                        headers={"Authorization": f"Bearer {token}"},
                    )
                    assert resp.status_code == 200, (
                        f"有效 token 应返回 200，实际: {resp.status_code}, body: {resp.text}"
                    )

        run_async(_test())


# ============================================================
# 测试类: 管理员端点
# ============================================================


class TestAdminEndpoints:
    """管理端点需要 admin 角色"""

    def test_admin_endpoints_require_admin_role(self):
        """管理端点需要 admin 角色 — 普通用户访问 admin 端点应返回 403"""

        async def _test():
            app = _get_app()
            address = "0x" + "e" * 40
            token = _create_test_token(address, session_id="test-session")
            mock_ss = _mock_session_service()
            mock_ss.get_session = AsyncMock(
                return_value={"token_version": 1, "wallet_address": address}
            )

            mock_account = MagicMock()
            mock_account.tag = "user"
            mock_account.role = "user"

            with (
                patch("src.security.deps.session_service", mock_ss),
                patch("src.security.deps.Account") as MockAccount,
            ):
                MockAccount.filter.return_value.first = AsyncMock(
                    return_value=mock_account
                )

                transport = ASGITransport(app=app)
                async with AsyncClient(
                    transport=transport, base_url="http://test"
                ) as client:
                    resp = await client.get(
                        "/api/v1/admin/accounts",
                        headers={"Authorization": f"Bearer {token}"},
                    )
                    assert resp.status_code == 403, (
                        f"普通用户访问 admin 端点应返回 403，实际: {resp.status_code}"
                    )

        run_async(_test())

    def test_admin_endpoints_accessible_with_admin_role(self):
        """admin 用户可访问管理端点"""

        async def _test():
            app = _get_app()
            address = "0x" + "f" * 40
            token = _create_test_token(address, session_id="test-session")
            mock_ss = _mock_session_service()
            mock_ss.get_session = AsyncMock(
                return_value={"token_version": 1, "wallet_address": address}
            )

            mock_account = MagicMock()
            mock_account.tag = "admin"
            mock_account.role = "admin"

            # Mock AccountService 用于 admin/accounts 端点的业务逻辑
            mock_account_service = MagicMock()
            mock_account_service.list = AsyncMock(return_value=([], 0, 0))

            # 使用 FastAPI dependency_overrides 替换 AccountService
            from src.api.v1.admin.accounts import get_account_service

            app.dependency_overrides[get_account_service] = lambda: mock_account_service

            try:
                with (
                    patch("src.security.deps.session_service", mock_ss),
                    patch("src.security.deps.Account") as MockAccount,
                ):
                    MockAccount.filter.return_value.first = AsyncMock(
                        return_value=mock_account
                    )

                    transport = ASGITransport(app=app)
                    async with AsyncClient(
                        transport=transport, base_url="http://test"
                    ) as client:
                        resp = await client.get(
                            "/api/v1/admin/accounts",
                            headers={"Authorization": f"Bearer {token}"},
                        )
                        assert resp.status_code not in (401, 403), (
                            f"admin 用户不应被拒绝，实际: {resp.status_code}"
                        )
            finally:
                app.dependency_overrides.pop(get_account_service, None)

        run_async(_test())

    def test_admin_endpoint_without_token_returns_401(self):
        """未认证访问 admin 端点应返回 401"""

        async def _test():
            app = _get_app()
            mock_ss = _mock_session_service()

            with patch("src.security.deps.session_service", mock_ss):
                transport = ASGITransport(app=app)
                async with AsyncClient(
                    transport=transport, base_url="http://test"
                ) as client:
                    resp = await client.get("/api/v1/admin/accounts")
                    assert resp.status_code == 401, (
                        f"未认证应返回 401，实际: {resp.status_code}"
                    )

        run_async(_test())
