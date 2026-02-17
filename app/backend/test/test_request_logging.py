"""
RequestLoggingMiddleware 属性测试

使用 hypothesis 验证中间件的核心属性：
- Property 1: 请求日志完整性
- Property 2: 日志级别正确性
- Property 6: X-Request-ID 响应头一致性

注意: 中间件使用 falib/loguru 日志体系，不走 Python 标准 logging，
因此通过 mock 方式捕获日志调用，而非 pytest caplog。
"""

import re
from unittest.mock import MagicMock, patch

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from src.middleware.logging import RequestLoggingMiddleware

# ============================================================
# Hypothesis 策略
# ============================================================

# HTTP 方法
http_method_strategy = st.sampled_from(["GET", "POST", "PUT", "DELETE", "PATCH"])

# URL 路径段: 字母数字，非空
path_segment_strategy = st.from_regex(r"[a-z][a-z0-9]{0,9}", fullmatch=True)

# 状态码: 200-599 (有效 HTTP 响应状态码)
status_code_strategy = st.integers(min_value=200, max_value=599)

# UUID v4 正则
UUID_PATTERN = re.compile(
    r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
)


# ============================================================
# 辅助函数
# ============================================================


def _create_test_app(status_code: int) -> FastAPI:
    """创建带有 RequestLoggingMiddleware 的测试 FastAPI 应用"""
    app = FastAPI()
    app.add_middleware(RequestLoggingMiddleware)

    @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
    async def catch_all(path: str):
        return JSONResponse(content={"ok": True}, status_code=status_code)

    return app


# ============================================================
# Property 1: 请求日志完整性
# ============================================================


class TestProperty1LogCompleteness:
    """
    **Validates: Requirements 2.1, 2.4**

    Property 1: 请求日志完整性
    对于任意 HTTP 请求，日志消息应包含:
    request_id (UUID), HTTP method, path, status_code, duration_ms
    """

    @given(
        method=http_method_strategy,
        segment=path_segment_strategy,
        status_code=status_code_strategy,
    )
    @settings(
        max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_log_contains_all_required_fields(self, method, segment, status_code):
        """
        **Validates: Requirements 2.1, 2.4**

        属性: 任意 method/path/status_code 组合，日志消息包含所有必需字段
        """
        app = _create_test_app(status_code)
        client = TestClient(app, raise_server_exceptions=False)
        path = f"/test/{segment}"

        with patch("src.middleware.logging.logger") as mock_logger:
            response = getattr(client, method.lower())(path)

        assert response.status_code == status_code

        # 确定预期的日志级别方法
        expected_level = "warning" if status_code >= 500 else "info"
        log_method = getattr(mock_logger, expected_level)

        assert log_method.call_count >= 1, (
            f"未找到 {expected_level} 级别的日志调用。"
            f"mock_logger 调用: info={mock_logger.info.call_count}, "
            f"warning={mock_logger.warning.call_count}"
        )

        # 获取最后一次调用的日志消息 (hypothesis 可能多次调用)
        log_msg = log_method.call_args_list[-1][0][0]

        # 验证包含 UUID 格式的 request_id
        assert UUID_PATTERN.search(log_msg), f"日志缺少 request_id (UUID): {log_msg}"

        # 验证包含 HTTP method
        assert method in log_msg, f"日志缺少 HTTP method '{method}': {log_msg}"

        # 验证包含 path
        assert path in log_msg, f"日志缺少 path '{path}': {log_msg}"

        # 验证包含 status_code
        assert str(status_code) in log_msg, (
            f"日志缺少 status_code '{status_code}': {log_msg}"
        )

        # 验证包含 duration (Xms 格式)
        assert re.search(r"\(\d+ms\)", log_msg), f"日志缺少 duration_ms: {log_msg}"


# ============================================================
# Property 2: 日志级别正确性
# ============================================================


class TestProperty2LogLevel:
    """
    **Validates: Requirements 2.2**

    Property 2: 日志级别正确性
    status_code >= 500 时使用 WARNING，否则使用 INFO
    """

    @given(status_code=st.integers(min_value=200, max_value=499))
    @settings(
        max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_non_5xx_uses_info_level(self, status_code):
        """
        **Validates: Requirements 2.2**

        属性: 非 5xx 状态码使用 INFO 级别
        """
        app = _create_test_app(status_code)
        client = TestClient(app, raise_server_exceptions=False)

        with patch("src.middleware.logging.logger") as mock_logger:
            client.get("/test/check")

        # 验证 info 被调用，warning 未被调用
        assert mock_logger.info.call_count >= 1, (
            f"状态码 {status_code} 应调用 logger.info()，但未调用"
        )
        assert mock_logger.warning.call_count == 0, (
            f"状态码 {status_code} 不应调用 logger.warning()，"
            f"但被调用了 {mock_logger.warning.call_count} 次"
        )

    @given(status_code=st.integers(min_value=500, max_value=599))
    @settings(
        max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_5xx_uses_warning_level(self, status_code):
        """
        **Validates: Requirements 2.2**

        属性: 5xx 状态码使用 WARNING 级别
        """
        app = _create_test_app(status_code)
        client = TestClient(app, raise_server_exceptions=False)

        with patch("src.middleware.logging.logger") as mock_logger:
            client.get("/test/check")

        # 验证 warning 被调用，info 未被调用
        assert mock_logger.warning.call_count >= 1, (
            f"状态码 {status_code} 应调用 logger.warning()，但未调用"
        )
        assert mock_logger.info.call_count == 0, (
            f"状态码 {status_code} 不应调用 logger.info()，"
            f"但被调用了 {mock_logger.info.call_count} 次"
        )


# ============================================================
# Property 6: X-Request-ID 响应头一致性
# ============================================================


class TestProperty6XRequestIdHeader:
    """
    **Validates: Requirements 5.1**

    Property 6: X-Request-ID 响应头一致性
    响应头 X-Request-ID 值应为有效 UUID，且与日志中的 request_id 一致
    """

    @given(
        method=http_method_strategy,
        segment=path_segment_strategy,
        status_code=status_code_strategy,
    )
    @settings(
        max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_response_header_matches_log_request_id(self, method, segment, status_code):
        """
        **Validates: Requirements 5.1**

        属性: 响应头 X-Request-ID 是有效 UUID，且与日志中记录的 request_id 一致
        """
        app = _create_test_app(status_code)
        client = TestClient(app, raise_server_exceptions=False)
        path = f"/test/{segment}"

        with patch("src.middleware.logging.logger") as mock_logger:
            response = getattr(client, method.lower())(path)

        # 验证响应头存在
        assert "x-request-id" in response.headers, "响应缺少 X-Request-ID 头"

        header_value = response.headers["x-request-id"]

        # 验证是有效 UUID 格式
        assert UUID_PATTERN.fullmatch(header_value), (
            f"X-Request-ID 不是有效 UUID: {header_value}"
        )

        # 从 mock 日志调用中提取 request_id
        expected_level = "warning" if status_code >= 500 else "info"
        log_method = getattr(mock_logger, expected_level)

        assert log_method.call_count >= 1, f"未找到 {expected_level} 级别的日志调用"

        log_msg = log_method.call_args_list[-1][0][0]
        log_uuid_match = UUID_PATTERN.search(log_msg)
        assert log_uuid_match, f"日志中未找到 UUID: {log_msg}"

        log_request_id = log_uuid_match.group()

        # 验证响应头与日志中的 request_id 一致
        assert header_value == log_request_id, (
            f"X-Request-ID 头 ({header_value}) 与日志中的 "
            f"request_id ({log_request_id}) 不一致"
        )


# ============================================================
# Property 7: 中间件间 request_id 一致性
# ============================================================


class TestProperty7MiddlewareRequestIdConsistency:
    """
    **Validates: Requirements 6.2**

    Property 7: 中间件间 request_id 一致性
    当 RequestLoggingMiddleware（最外层）和 AuditMiddleware 同时注册时，
    AuditMiddleware 应复用 RequestLoggingMiddleware 生成的 request_id，
    而非自行生成新的。
    """

    @given(segment=path_segment_strategy)
    @settings(
        max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_audit_middleware_reuses_request_id_from_logging_middleware(self, segment):
        """
        **Validates: Requirements 6.2**

        属性: 经过两层中间件后，handler 看到的 request.state.request_id
        与响应头 X-Request-ID 一致，证明 AuditMiddleware 未覆盖
        RequestLoggingMiddleware 设置的 request_id。
        """
        from src.middleware.audit import AuditMiddleware

        app = FastAPI()

        # 注册顺序: AuditMiddleware 先添加，RequestLoggingMiddleware 后添加
        # 执行顺序: RequestLoggingMiddleware(外) → AuditMiddleware(内) → Handler
        app.add_middleware(AuditMiddleware)
        app.add_middleware(RequestLoggingMiddleware)

        @app.get("/test/{path:path}")
        async def test_route(request: Request):
            """返回 handler 看到的 request_id"""
            return JSONResponse(
                {"request_id": getattr(request.state, "request_id", None)}
            )

        client = TestClient(app, raise_server_exceptions=False)

        with (
            patch("src.middleware.logging.logger"),
            patch("src.middleware.audit.logger"),
        ):
            response = client.get(f"/test/{segment}")

        assert response.status_code == 200

        # X-Request-ID 由 RequestLoggingMiddleware 设置
        header_request_id = response.headers.get("x-request-id")
        assert header_request_id is not None, "响应缺少 X-Request-ID 头"
        assert UUID_PATTERN.fullmatch(header_request_id), (
            f"X-Request-ID 不是有效 UUID: {header_request_id}"
        )

        # handler 看到的 request_id（经过 AuditMiddleware 后）
        body_request_id = response.json()["request_id"]
        assert body_request_id is not None, "handler 未获取到 request_id"

        # 核心断言: 两者必须一致，证明 AuditMiddleware 未覆盖
        assert header_request_id == body_request_id, (
            f"request_id 不一致！"
            f"X-Request-ID 头 (RequestLoggingMiddleware): {header_request_id}, "
            f"handler 看到的 (经 AuditMiddleware): {body_request_id}"
        )


# ============================================================
# Property 5: 异常处理器 request_id 注入
# ============================================================


class TestProperty5ExceptionHandlerRequestId:
    """
    **Validates: Requirements 4.1, 4.2, 4.3**

    Property 5: 异常处理器 request_id 注入
    对于任意异常（validation / business / unhandled），
    异常处理器的日志消息应包含 request.state.request_id。
    """

    # ----------------------------------------------------------
    # 辅助: 构建带异常处理器的测试应用
    # ----------------------------------------------------------

    @staticmethod
    def _build_validation_error_app():
        """创建触发 RequestValidationError 的测试应用，返回 (app, exc_logger)"""
        from pydantic import BaseModel

        test_app = FastAPI()
        test_app.add_middleware(RequestLoggingMiddleware)

        exc_logger = MagicMock()

        class StrictBody(BaseModel):
            value: int

        @test_app.post("/trigger/validation")
        async def validation_route(body: StrictBody):
            return JSONResponse(content={"ok": True})

        @test_app.exception_handler(RequestValidationError)
        async def _validation_handler(request: Request, exc: RequestValidationError):
            rid = getattr(request.state, "request_id", "-")
            exc_logger.warning(
                f"[{rid}] Validation error: {request.method} {request.url.path}"
            )
            return JSONResponse(
                status_code=422,
                content={"code": 422, "message": "Validation error"},
            )

        return test_app, exc_logger

    @staticmethod
    def _build_business_exception_app():
        """创建触发 BusinessException 的测试应用，返回 (app, exc_logger)"""
        from src.common.exceptions import BusinessException

        test_app = FastAPI()
        test_app.add_middleware(RequestLoggingMiddleware)

        exc_logger = MagicMock()

        @test_app.get("/trigger/business")
        async def business_route():
            raise BusinessException(message="test error", code=400)

        @test_app.exception_handler(BusinessException)
        async def _business_handler(request: Request, exc: BusinessException):
            rid = getattr(request.state, "request_id", "-")
            exc_logger.warning(
                f"[{rid}] Business exception: {request.method} {request.url.path}"
            )
            return JSONResponse(
                status_code=exc.code,
                content={"code": exc.code, "message": exc.message},
            )

        return test_app, exc_logger

    @staticmethod
    def _build_unhandled_exception_app():
        """创建触发未处理异常的测试应用，返回 (app, exc_logger)"""
        test_app = FastAPI()
        test_app.add_middleware(RequestLoggingMiddleware)

        exc_logger = MagicMock()

        @test_app.get("/trigger/unhandled")
        async def unhandled_route():
            raise RuntimeError("unexpected boom")

        @test_app.exception_handler(Exception)
        async def _global_handler(request: Request, exc: Exception):
            rid = getattr(request.state, "request_id", "-")
            exc_logger.error(
                f"[{rid}] Unhandled exception: {request.method} {request.url.path} - {exc}"
            )
            return JSONResponse(
                status_code=500,
                content={"code": 500, "message": "Internal server error"},
            )

        return test_app, exc_logger

    # ----------------------------------------------------------
    # Property 5a: validation exception handler 包含 request_id
    # ----------------------------------------------------------

    @given(segment=path_segment_strategy)
    @settings(
        max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_validation_exception_log_contains_request_id(self, segment):
        """
        **Validates: Requirements 4.1**

        属性: 当请求触发 RequestValidationError 时，
        异常处理器日志包含与 X-Request-ID 响应头一致的 request_id。
        """
        test_app, exc_logger = self._build_validation_error_app()
        client = TestClient(test_app, raise_server_exceptions=False)

        with patch("src.middleware.logging.logger"):
            response = client.post(
                "/trigger/validation",
                json={"value": "not_an_int"},
            )

        assert response.status_code == 422

        # 从响应头获取 request_id（由 RequestLoggingMiddleware 注入）
        header_id = response.headers.get("x-request-id")
        assert header_id is not None, "响应缺少 X-Request-ID 头"
        assert UUID_PATTERN.fullmatch(header_id), (
            f"X-Request-ID 不是有效 UUID: {header_id}"
        )

        # 验证异常处理器的日志包含该 request_id
        assert exc_logger.warning.call_count >= 1, "异常处理器未调用 logger.warning()"
        log_msg = exc_logger.warning.call_args_list[-1][0][0]
        assert header_id in log_msg, (
            f"异常处理器日志未包含 request_id。期望: {header_id}，日志: {log_msg}"
        )

    # ----------------------------------------------------------
    # Property 5b: business exception handler 包含 request_id
    # ----------------------------------------------------------

    @given(segment=path_segment_strategy)
    @settings(
        max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_business_exception_log_contains_request_id(self, segment):
        """
        **Validates: Requirements 4.2**

        属性: 当请求触发 BusinessException 时，
        异常处理器日志包含与 X-Request-ID 响应头一致的 request_id。
        """
        test_app, exc_logger = self._build_business_exception_app()
        client = TestClient(test_app, raise_server_exceptions=False)

        with patch("src.middleware.logging.logger"):
            response = client.get("/trigger/business")

        assert response.status_code == 400

        header_id = response.headers.get("x-request-id")
        assert header_id is not None, "响应缺少 X-Request-ID 头"
        assert UUID_PATTERN.fullmatch(header_id), (
            f"X-Request-ID 不是有效 UUID: {header_id}"
        )

        assert exc_logger.warning.call_count >= 1, "异常处理器未调用 logger.warning()"
        log_msg = exc_logger.warning.call_args_list[-1][0][0]
        assert header_id in log_msg, (
            f"异常处理器日志未包含 request_id。期望: {header_id}，日志: {log_msg}"
        )

    # ----------------------------------------------------------
    # Property 5c: global exception handler 包含 request_id
    # ----------------------------------------------------------

    @given(segment=path_segment_strategy)
    @settings(
        max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_unhandled_exception_log_contains_request_id(self, segment):
        """
        **Validates: Requirements 4.3**

        属性: 当请求触发未处理异常时，
        全局异常处理器日志包含有效 UUID 格式的 request_id。

        注意: 未处理异常会经过 BaseHTTPMiddleware 的 except 分支（re-raise），
        异常处理器返回的响应不经过中间件的正常路径，因此 X-Request-ID 响应头
        可能不存在。这里直接验证异常处理器日志中的 request_id 是有效 UUID。
        """
        test_app, exc_logger = self._build_unhandled_exception_app()
        client = TestClient(test_app, raise_server_exceptions=False)

        with patch("src.middleware.logging.logger"):
            response = client.get("/trigger/unhandled")

        assert response.status_code == 500

        # 验证异常处理器被调用且日志包含有效 UUID 格式的 request_id
        assert exc_logger.error.call_count >= 1, "异常处理器未调用 logger.error()"
        log_msg = exc_logger.error.call_args_list[-1][0][0]

        log_uuid_match = UUID_PATTERN.search(log_msg)
        assert log_uuid_match is not None, (
            f"异常处理器日志未包含有效 UUID 格式的 request_id: {log_msg}"
        )

        # 如果响应头存在 X-Request-ID，验证与日志中的一致
        header_id = response.headers.get("x-request-id")
        if header_id is not None:
            assert header_id == log_uuid_match.group(), (
                f"X-Request-ID 头 ({header_id}) 与异常处理器日志中的 "
                f"request_id ({log_uuid_match.group()}) 不一致"
            )


# ============================================================
# Property 3: 请求上下文传播
# ============================================================


class TestProperty3ContextPropagation:
    """
    **Validates: Requirements 3.1, 3.4**

    Property 3: 请求上下文传播
    对于任意 HTTP 请求，在下游 handler 执行期间，
    调用 get_request_id() 应返回与 RequestLoggingMiddleware
    设置的 request_id 相同的值。
    """

    @staticmethod
    def _build_context_propagation_app() -> FastAPI:
        """创建一个在 handler 中调用 get_request_id() 并返回结果的测试应用"""
        from src.context import get_request_id

        test_app = FastAPI()
        test_app.add_middleware(RequestLoggingMiddleware)

        @test_app.api_route(
            "/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"]
        )
        async def catch_all(path: str):
            # 在 handler 中调用 get_request_id()，返回到响应体
            ctx_request_id = get_request_id()
            return JSONResponse(
                content={"context_request_id": ctx_request_id},
                status_code=200,
            )

        return test_app

    @given(
        method=http_method_strategy,
        segment=path_segment_strategy,
    )
    @settings(
        max_examples=100,
        suppress_health_check=[HealthCheck.function_scoped_fixture],
    )
    def test_get_request_id_returns_correct_value_during_request(self, method, segment):
        """
        **Validates: Requirements 3.1, 3.4**

        属性: 在请求处理期间，get_request_id() 返回的值
        与响应头 X-Request-ID 一致（即中间件设置的 request_id）。
        """
        app = self._build_context_propagation_app()
        client = TestClient(app, raise_server_exceptions=False)
        path = f"/test/{segment}"

        with patch("src.middleware.logging.logger"):
            response = getattr(client, method.lower())(path)

        assert response.status_code == 200

        # 从响应头获取中间件设置的 request_id
        header_request_id = response.headers.get("x-request-id")
        assert header_request_id is not None, "响应缺少 X-Request-ID 头"
        assert UUID_PATTERN.fullmatch(header_request_id), (
            f"X-Request-ID 不是有效 UUID: {header_request_id}"
        )

        # 从响应体获取 handler 中 get_request_id() 的返回值
        body = response.json()
        context_request_id = body["context_request_id"]

        # 核心断言: handler 中 get_request_id() 返回的值
        # 必须与中间件设置的 request_id 一致
        assert context_request_id == header_request_id, (
            f"上下文传播失败！"
            f"get_request_id() 返回: {context_request_id}, "
            f"X-Request-ID 头: {header_request_id}"
        )


# ============================================================
# Property 4: 请求上下文隔离
# ============================================================


class TestProperty4ContextIsolation:
    """
    **Validates: Requirements 3.2**

    Property 4: 请求上下文隔离
    对于任意连续的 HTTP 请求序列，每个请求完成后，
    request_id_var 应被重置为默认值 "-"，
    确保请求之间不会发生上下文泄漏。
    """

    @staticmethod
    def _build_context_isolation_app() -> FastAPI:
        """创建一个在 handler 中返回 get_request_id() 的测试应用"""
        from src.context import get_request_id

        test_app = FastAPI()
        test_app.add_middleware(RequestLoggingMiddleware)

        @test_app.api_route(
            "/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"]
        )
        async def catch_all(path: str):
            ctx_request_id = get_request_id()
            return JSONResponse(
                content={"context_request_id": ctx_request_id},
                status_code=200,
            )

        return test_app

    @given(
        method1=http_method_strategy,
        segment1=path_segment_strategy,
        method2=http_method_strategy,
        segment2=path_segment_strategy,
    )
    @settings(
        max_examples=100,
        suppress_health_check=[HealthCheck.function_scoped_fixture],
    )
    def test_sequential_requests_have_isolated_contexts(
        self, method1, segment1, method2, segment2
    ):
        """
        **Validates: Requirements 3.2**

        属性: 连续两个请求各自拥有独立的 request_id，
        且请求完成后 context 被重置为默认值 "-"。
        """
        from src.context import get_request_id

        app = self._build_context_isolation_app()
        client = TestClient(app, raise_server_exceptions=False)

        # --- 第一个请求 ---
        with patch("src.middleware.logging.logger"):
            response1 = getattr(client, method1.lower())(f"/test/{segment1}")

        assert response1.status_code == 200

        header_id_1 = response1.headers.get("x-request-id")
        context_id_1 = response1.json()["context_request_id"]

        assert header_id_1 is not None, "第一个请求缺少 X-Request-ID 头"
        assert UUID_PATTERN.fullmatch(header_id_1), (
            f"第一个请求 X-Request-ID 不是有效 UUID: {header_id_1}"
        )
        assert context_id_1 == header_id_1, (
            f"第一个请求上下文传播失败: context={context_id_1}, header={header_id_1}"
        )

        # 验证请求完成后 context 已重置为默认值
        assert get_request_id() == "-", (
            f"第一个请求完成后 context 未重置！"
            f"get_request_id() 返回: {get_request_id()}, 期望: '-'"
        )

        # --- 第二个请求 ---
        with patch("src.middleware.logging.logger"):
            response2 = getattr(client, method2.lower())(f"/test/{segment2}")

        assert response2.status_code == 200

        header_id_2 = response2.headers.get("x-request-id")
        context_id_2 = response2.json()["context_request_id"]

        assert header_id_2 is not None, "第二个请求缺少 X-Request-ID 头"
        assert UUID_PATTERN.fullmatch(header_id_2), (
            f"第二个请求 X-Request-ID 不是有效 UUID: {header_id_2}"
        )
        assert context_id_2 == header_id_2, (
            f"第二个请求上下文传播失败: context={context_id_2}, header={header_id_2}"
        )

        # 核心断言 1: 两个请求的 request_id 必须不同（UUID 碰撞概率极低）
        assert header_id_1 != header_id_2, (
            f"两个连续请求的 request_id 相同！"
            f"request_id_1: {header_id_1}, request_id_2: {header_id_2}"
        )

        # 核心断言 2: 第二个请求完成后 context 也已重置
        assert get_request_id() == "-", (
            f"第二个请求完成后 context 未重置！"
            f"get_request_id() 返回: {get_request_id()}, 期望: '-'"
        )

        # 核心断言 3: 第二个请求的 context 没有泄漏第一个请求的 request_id
        assert context_id_2 != context_id_1, (
            f"上下文泄漏！第二个请求的 get_request_id() 返回了第一个请求的 request_id。"
            f"request_1: {context_id_1}, request_2: {context_id_2}"
        )
