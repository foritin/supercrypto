"""
请求上下文模块

通过 contextvars 在同一请求链路中传播 request_id，
使所有日志调用可以关联到同一请求。
"""

import contextvars

# 请求级别的 context variable，默认值 "-" 表示不在请求上下文中
request_id_var: contextvars.ContextVar[str] = contextvars.ContextVar(
    "request_id", default="-"
)


def get_request_id() -> str:
    """获取当前请求的 request_id，不在请求上下文中时返回 '-'"""
    return request_id_var.get()
