"""
共享通用模块

包含：
- dependencies: FastAPI 依赖注入（get_xxx_service）— 通过 `from src.common.dependencies import ...` 直接导入
- exceptions: 业务异常类
- utils: 通用工具函数
- adapters: 基础设施适配器 (DB, Redis)
- validators: 数据校验
- metrics: 链上操作指标
- chain_logger: 链上操作日志

注意：dependencies 模块依赖 src.services，不在此处直接 re-export，
避免 common → services → models → common 循环导入。
路由文件请使用 `from src.common.dependencies import get_xxx_service`。

所有服务实例（单例、工厂）均由 ``src.common.dependencies`` 统一管理，
service 文件中只定义类，不创建实例。
"""

# ============ Adapters — 基础设施适配器 ============
from src.common.adapters import (
    TOKEN_URL,
    get_db_adapter,
    get_redis_adapter,
    oauth2_scheme,
)

# ============ Exceptions — 业务异常 ============
from src.common.exceptions import (
    AuditLogImmutableError,
    BusinessException,
    ConfigLoadError,
    ConflictException,
    ContractValidatorError,
    CyclicDependencyError,
    ForbiddenException,
    InsufficientBalanceException,
    MediaServiceError,
    NotFoundException,
    TransactionAuditImmutableError,
    UnauthorizedException,
    ValidationException,
)

# ============ Utils — 工具函数 ============
from src.common.utils import calculate_total_pages, is_db_available

# ============ Validators ============
from src.common.validators import validate_tx_hash

__all__ = [
    # Exceptions
    "BusinessException",
    "NotFoundException",
    "ValidationException",
    "UnauthorizedException",
    "ForbiddenException",
    "ConflictException",
    "InsufficientBalanceException",
    "AuditLogImmutableError",
    "TransactionAuditImmutableError",
    "ConfigLoadError",
    "CyclicDependencyError",
    "ContractValidatorError",
    "MediaServiceError",
    # Adapters
    "get_db_adapter",
    "get_redis_adapter",
    "oauth2_scheme",
    "TOKEN_URL",
    # Utils
    "calculate_total_pages",
    "is_db_available",
    # Validators
    "validate_tx_hash",
]
