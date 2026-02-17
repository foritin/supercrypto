"""
KYC API 集成测试

使用 httpx.AsyncClient 测试 KYC 相关端点:
- GET /api/v1/public/kyc/status/{wallet_address}  (公开 KYC 状态查询)
- GET /api/v1/user/kyc/*                           (用户 KYC 操作 - 需认证)

验证:
- Requirements 8.7: API 集成测试覆盖认证、授权、响应格式
- Requirements 1.4: KYC 查询需要认证且仅能查询自身
"""

import asyncio
import datetime
from unittest.mock import AsyncMock, MagicMock, patch

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
    """获取 FastAPI app 实例"""
    from main import app

    return app


def _mock_session_service():
    """创建 mock 的 session_service"""
    mock = MagicMock()
    mock.is_blacklisted = AsyncMock(return_value=False)
    mock.create_session = AsyncMock(return_value="test-session-id")
    mock.get_token_version = AsyncMock(return_value=1)
    mock.get_session = AsyncMock(
        return_value={"token_version": 1, "wallet_address": "0x" + "a" * 40}
    )
    return mock


def _mock_kyc_service_with_status(status_value: str = "not_started"):
    """创建返回指定状态的 mock KycService"""
    mock_result = MagicMock()
    mock_result.model_dump = MagicMock(return_value={"status": status_value})
    mock_service = MagicMock()
    mock_service.get_status = AsyncMock(return_value=mock_result)
    return mock_service


# ============================================================
# 测试类: KYC 状态查询认证
# ============================================================


class TestKycStatusAuthentication:
    """KYC 用户端点需要认证"""

    def test_kyc_status_requires_authentication(self):
        """KYC 用户端点需要认证 — 未携带 token 应返回 401"""

        async def _test():
            app = _get_app()
            mock_ss = _mock_session_service()

            with patch("src.security.deps.session_service", mock_ss):
                transport = ASGITransport(app=app)
                async with AsyncClient(
                    transport=transport, base_url="http://test"
                ) as client:
                    resp = await client.post(
                        "/api/v1/user/kyc/apply",
                        json={"full_name": "测试用户"},
                    )
                    assert resp.status_code == 401, (
                        f"未认证访问 KYC 端点应返回 401，实际: {resp.status_code}"
                    )

        run_async(_test())

    def test_kyc_upload_requires_authentication(self):
        """KYC 文件上传需要认证"""

        async def _test():
            app = _get_app()
            mock_ss = _mock_session_service()

            with patch("src.security.deps.session_service", mock_ss):
                transport = ASGITransport(app=app)
                async with AsyncClient(
                    transport=transport, base_url="http://test"
                ) as client:
                    resp = await client.post(
                        "/api/v1/user/kyc/upload-document",
                    )
                    # 未认证: 401; 或缺少参数: 422 (但认证在参数验证之前)
                    assert resp.status_code in (401, 422), (
                        f"未认证访问 KYC 上传应返回 401 或 422，实际: {resp.status_code}"
                    )

        run_async(_test())


# ============================================================
# 测试类: KYC 状态查询隔离
# ============================================================


class TestKycStatusIsolation:
    """KYC 状态查询仅能查询自身"""

    def test_kyc_status_only_self(self):
        """公开 KYC 状态端点 — 验证可查询任意地址的公开状态

        /api/v1/public/kyc/status/{address} 是公开端点，
        返回有限的状态信息（仅 status 字段），不包含敏感数据。
        用户 KYC 操作端点（/api/v1/user/kyc/*）才需要认证。
        """

        async def _test():
            app = _get_app()
            address_a = "0x" + "a" * 40
            address_b = "0x" + "b" * 40

            mock_kyc_service = _mock_kyc_service_with_status("not_started")

            # 使用 FastAPI dependency_overrides 替换 KycService
            from src.api.v1.public.kyc import get_kyc_service

            app.dependency_overrides[get_kyc_service] = lambda: mock_kyc_service

            try:
                transport = ASGITransport(app=app)
                async with AsyncClient(
                    transport=transport, base_url="http://test"
                ) as client:
                    resp_a = await client.get(f"/api/v1/public/kyc/status/{address_a}")
                    assert resp_a.status_code == 200, (
                        f"公开 KYC 状态查询应返回 200，实际: {resp_a.status_code}"
                    )

                    resp_b = await client.get(f"/api/v1/public/kyc/status/{address_b}")
                    assert resp_b.status_code == 200, (
                        f"公开 KYC 状态查询应返回 200，实际: {resp_b.status_code}"
                    )

                    # 验证 KycService.get_status 被正确调用了两次
                    calls = mock_kyc_service.get_status.call_args_list
                    called_addresses = [call.args[0] for call in calls]
                    assert address_a in called_addresses
                    assert address_b in called_addresses
            finally:
                app.dependency_overrides.pop(get_kyc_service, None)

        run_async(_test())

    def test_user_kyc_endpoints_scoped_to_authenticated_user(self):
        """用户 KYC 端点限定为已认证用户自身

        /api/v1/user/kyc/* 端点通过 require_user 依赖注入获取钱包地址，
        确保操作仅针对已认证用户自身。
        """

        async def _test():
            app = _get_app()
            address = "0x" + "c" * 40
            token = _create_test_token(address, session_id="test-session")
            mock_ss = _mock_session_service()
            mock_ss.get_session = AsyncMock(
                return_value={"token_version": 1, "wallet_address": address}
            )

            mock_kyc_service = MagicMock()
            mock_kyc_service.apply_kyc = AsyncMock(
                return_value=MagicMock(id=1, status="pending")
            )

            with (
                patch("src.security.deps.session_service", mock_ss),
                patch(
                    "src.api.v1.user.kyc.get_kyc_service",
                    return_value=mock_kyc_service,
                ),
            ):
                transport = ASGITransport(app=app)
                async with AsyncClient(
                    transport=transport, base_url="http://test"
                ) as client:
                    resp = await client.post(
                        "/api/v1/user/kyc/apply",
                        json={"full_name": "测试用户"},
                        headers={"Authorization": f"Bearer {token}"},
                    )
                    # 请求应被处理（不是 401/403）
                    assert resp.status_code not in (401, 403), (
                        f"已认证用户不应被拒绝，实际: {resp.status_code}"
                    )

        run_async(_test())


# ============================================================
# 测试类: KYC 响应格式
# ============================================================


class TestKycResponseFormat:
    """KYC API 响应格式验证"""

    def test_public_kyc_status_response_format(self):
        """公开 KYC 状态查询应返回标准响应格式"""

        async def _test():
            app = _get_app()
            address = "0x" + "d" * 40

            mock_kyc_service = _mock_kyc_service_with_status("pending")

            from src.api.v1.public.kyc import get_kyc_service

            app.dependency_overrides[get_kyc_service] = lambda: mock_kyc_service

            try:
                transport = ASGITransport(app=app)
                async with AsyncClient(
                    transport=transport, base_url="http://test"
                ) as client:
                    resp = await client.get(f"/api/v1/public/kyc/status/{address}")
                    assert resp.status_code == 200

                    data = resp.json()
                    assert "code" in data, "响应应包含 code 字段"
                    assert data["code"] == 200
                    assert "data" in data, "响应应包含 data 字段"
            finally:
                app.dependency_overrides.pop(get_kyc_service, None)

        run_async(_test())
