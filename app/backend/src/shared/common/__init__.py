"""
共享通用模块

包含：
- exceptions: 业务异常类
- utils: 通用工具函数
- adapters: 基础设施适配器 (DB, Redis)
"""

# 异常类
from src.shared.common.exceptions import (
    BusinessException,
    ConflictException,
    ForbiddenException,
    InsufficientBalanceException,
    NotFoundException,
    UnauthorizedException,
    ValidationException,
)

# 工具函数
from src.shared.common.utils import (
    calculate_total_pages,
    chunk_list,
    format_datetime,
    mask_sensitive_data,
    remove_none_values,
    safe_divide,
    truncate_string,
)

# 适配器
from src.shared.common.adapters import (
    get_db_adapter,
    get_redis_adapter,
    oauth2_scheme,
    TOKEN_URL,
)

__all__ = [
    # Exceptions
    "BusinessException",
    "NotFoundException",
    "ValidationException",
    "UnauthorizedException",
    "ForbiddenException",
    "ConflictException",
    "InsufficientBalanceException",
    # Utils
    "calculate_total_pages",
    "format_datetime",
    "safe_divide",
    "truncate_string",
    "mask_sensitive_data",
    "remove_none_values",
    "chunk_list",
    # Adapters
    "get_db_adapter",
    "get_redis_adapter",
    "oauth2_scheme",
    "TOKEN_URL",
]

