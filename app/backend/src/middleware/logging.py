"""
请求日志中间件

职责：
- 生成 request_id 并注入 request.state 和 contextvars
- 记录请求完成日志（method, path, status_code, duration_ms）
- 在响应头中添加 X-Request-ID
"""

import time
import uuid
from typing import Callable

from falib.utils.log import get_logger
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from src.context import request_id_var

logger = get_logger("api.access")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    请求日志中间件

    - 生成 request_id 并注入 request.state 和 contextvars
    - 记录请求完成日志（method, path, status_code, duration_ms）
    - 日志级别: 5xx → WARNING，其余 → INFO
    - 在响应头中添加 X-Request-ID
    - 请求结束后 reset contextvars，防止上下文泄漏
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        # 设置 contextvars
        token = request_id_var.set(request_id)

        start_time = time.time()
        try:
            response = await call_next(request)
            duration_ms = int((time.time() - start_time) * 1000)

            # 日志级别：5xx 用 WARNING，其余用 INFO
            level = "warning" if response.status_code >= 500 else "info"
            getattr(logger, level)(
                f"[{request_id}] {request.method} {request.url.path} "
                f"→ {response.status_code} ({duration_ms}ms)"
            )

            # 注入响应头
            response.headers["X-Request-ID"] = request_id
            return response
        except Exception as exc:
            duration_ms = int((time.time() - start_time) * 1000)
            logger.error(
                f"[{request_id}] {request.method} {request.url.path} "
                f"→ EXCEPTION ({duration_ms}ms): {exc}"
            )
            raise
        finally:
            request_id_var.reset(token)
