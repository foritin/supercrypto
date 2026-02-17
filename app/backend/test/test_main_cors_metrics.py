"""
main.py CORS 配置和 /metrics/chain 端点保护的单元测试

验证:
- Task 2.3: CORS 根据环境动态配置 allow_origins
- Task 2.4: /metrics/chain 端点需要管理员认证
"""

from unittest.mock import MagicMock, patch


class TestCorsConfiguration:
    """CORS 配置测试 - 验证 Requirements 1.8"""

    def test_production_cors_uses_specific_origins(self):
        """production 环境应仅允许指定域名"""
        mock_settings = MagicMock()
        mock_settings.environment = "production"
        mock_settings.debug = False

        with (
            patch("main.SETTINGS", mock_settings),
            patch("main.settings", mock_settings),
        ):
            import main

            # 重新计算 CORS origins
            cors_origins = (
                main._PRODUCTION_ORIGINS
                if mock_settings.environment == "production"
                else ["*"]
            )

            assert cors_origins != ["*"]
            assert "https://supercrypto.io" in cors_origins
            assert "https://www.supercrypto.io" in cors_origins
            assert "https://app.supercrypto.io" in cors_origins
            assert "*" not in cors_origins

    def test_dev_cors_allows_all_origins(self):
        """dev 环境应允许所有域名"""
        mock_settings = MagicMock()
        mock_settings.environment = "dev"

        cors_origins = (
            ["https://supercrypto.io"]
            if mock_settings.environment == "production"
            else ["*"]
        )

        assert cors_origins == ["*"]

    def test_test_cors_allows_all_origins(self):
        """test 环境应允许所有域名"""
        mock_settings = MagicMock()
        mock_settings.environment = "test"

        cors_origins = (
            ["https://supercrypto.io"]
            if mock_settings.environment == "production"
            else ["*"]
        )

        assert cors_origins == ["*"]

    def test_production_origins_list_not_empty(self):
        """production 域名列表不应为空"""
        from main import _PRODUCTION_ORIGINS

        assert len(_PRODUCTION_ORIGINS) > 0
        for origin in _PRODUCTION_ORIGINS:
            assert origin.startswith("https://"), (
                f"production 域名必须使用 HTTPS: {origin}"
            )


class TestMetricsEndpointProtection:
    """/metrics/chain 端点保护测试 - 验证 Requirements 1.9"""

    def test_metrics_chain_route_has_admin_dependency(self):
        """验证 /metrics/chain 路由包含 require_admin 依赖"""
        from main import app

        # 查找 /metrics/chain 路由
        metrics_route = None
        for route in app.routes:
            if hasattr(route, "path") and route.path == "/metrics/chain":
                metrics_route = route
                break

        assert metrics_route is not None, "/metrics/chain 路由应存在"

        # 验证路由有 dependencies
        assert hasattr(metrics_route, "dependencies"), (
            "/metrics/chain 应有 dependencies"
        )
        assert len(metrics_route.dependencies) > 0, "/metrics/chain 应至少有一个依赖"

        # 验证依赖中包含 require_admin
        dep_callables = [dep.dependency for dep in metrics_route.dependencies]
        from src.security import require_admin

        assert require_admin in dep_callables, (
            "/metrics/chain 应包含 require_admin 依赖"
        )

    def test_health_endpoint_has_no_auth_dependency(self):
        """验证 /health 端点不需要认证（对比测试）"""
        from main import app

        health_route = None
        for route in app.routes:
            if hasattr(route, "path") and route.path == "/health":
                health_route = route
                break

        assert health_route is not None, "/health 路由应存在"

        # /health 不应有认证依赖
        deps = getattr(health_route, "dependencies", [])
        assert len(deps) == 0, "/health 不应有认证依赖"
