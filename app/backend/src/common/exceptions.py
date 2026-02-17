"""
统一异常定义
"""

from typing import Any, Optional, Union

from src.schemas.enums import ErrorCode


class BusinessException(Exception):
    """
    业务异常基类

    用于业务逻辑中的异常情况

    Args:
        error_code: 业务错误码（推荐使用，会自动获取默认消息）
        message: 错误信息（可选，覆盖默认消息）
        code: HTTP 状态码（默认 400）
        detail: 额外的错误详情（可包含插值参数）

    Usage:
        # 推荐：使用 ErrorCode，自动获取默认消息
        raise BusinessException(error_code=ErrorCode.ASSET_NOT_FOUND)

        # 带详情参数
        raise BusinessException(
            error_code=ErrorCode.CONTRACT_ALREADY_BOUND,
            detail={"contract_name": "Token", "bound_asset_name": "Asset1"}
        )

        # 自定义消息（覆盖默认）
        raise BusinessException(
            error_code=ErrorCode.ASSET_NOT_FOUND,
            message="Asset with ID 123 not found"
        )

        # 传统方式（不推荐，无错误码）
        raise BusinessException(message="Something went wrong", code=400)
    """

    def __init__(
        self,
        message: Optional[str] = None,
        code: int = 400,
        error_code: Optional[Union[ErrorCode, int]] = None,
        detail: Optional[Any] = None,
    ):
        # 处理 error_code
        if isinstance(error_code, ErrorCode):
            self.error_code = error_code.value
            # 如果没有提供 message，使用 ErrorCode 的默认消息
            if message is None:
                message = error_code.default_message
        else:
            self.error_code = error_code

        self.message = message or "Unknown error"
        self.code = code
        self.detail = detail
        super().__init__(self.message)


class NotFoundException(BusinessException):
    """
    资源未找到异常

    Example:
        raise NotFoundException("Account not found", detail={"account_id": 123})
    """

    def __init__(
        self,
        message: str = "Resource not found",
        error_code: Optional[Union[ErrorCode, int]] = None,
        detail: Optional[Any] = None,
    ):
        super().__init__(
            message=message, code=404, error_code=error_code, detail=detail
        )


class ValidationException(BusinessException):
    """
    数据验证异常

    Example:
        raise ValidationException("Invalid address format")
    """

    def __init__(
        self,
        message: str = "Validation failed",
        error_code: Optional[Union[ErrorCode, int]] = None,
        detail: Optional[Any] = None,
    ):
        super().__init__(
            message=message, code=422, error_code=error_code, detail=detail
        )


class UnauthorizedException(BusinessException):
    """
    未授权异常

    Example:
        raise UnauthorizedException("Invalid token")
    """

    def __init__(
        self,
        message: str = "Unauthorized",
        error_code: Optional[Union[ErrorCode, int]] = None,
        detail: Optional[Any] = None,
    ):
        super().__init__(
            message=message, code=401, error_code=error_code, detail=detail
        )


class ForbiddenException(BusinessException):
    """
    禁止访问异常

    Example:
        raise ForbiddenException("Insufficient permissions")
    """

    def __init__(
        self,
        message: str = "Forbidden",
        error_code: Optional[Union[ErrorCode, int]] = None,
        detail: Optional[Any] = None,
    ):
        super().__init__(
            message=message, code=403, error_code=error_code, detail=detail
        )


class ConflictException(BusinessException):
    """
    资源冲突异常

    Example:
        raise ConflictException("Account already exists")
    """

    def __init__(
        self,
        message: str = "Resource conflict",
        error_code: Optional[Union[ErrorCode, int]] = None,
        detail: Optional[Any] = None,
    ):
        super().__init__(
            message=message, code=409, error_code=error_code, detail=detail
        )


class InsufficientBalanceException(BusinessException):
    """
    余额不足异常（业务特定）

    Example:
        raise InsufficientBalanceException("Insufficient balance for transfer")
    """

    def __init__(
        self,
        message: str = "Insufficient balance",
        error_code: Optional[Union[ErrorCode, int]] = None,
        detail: Optional[Any] = None,
    ):
        super().__init__(
            message=message, code=400, error_code=error_code, detail=detail
        )


# ==================== 领域异常（从各模块集中迁移） ====================


class AuditLogImmutableError(BusinessException):
    """审计日志不可变异常（迁移自 models/audit.py）"""

    def __init__(self, message: str = "Audit log is immutable"):
        super().__init__(
            message=message, code=403, error_code=ErrorCode.AUDIT_LOG_IMMUTABLE
        )


class TransactionAuditImmutableError(BusinessException):
    """交易审计不可变异常（迁移自 models/transaction_audit.py）"""

    def __init__(self, message: str = "Transaction audit field is immutable"):
        super().__init__(
            message=message, code=403, error_code=ErrorCode.TRANSACTION_AUDIT_IMMUTABLE
        )


class ConfigLoadError(BusinessException):
    """配置加载错误（迁移自 services/project_registry_service.py）"""

    def __init__(self, message: str = "Configuration load error"):
        super().__init__(
            message=message, code=500, error_code=ErrorCode.CONFIG_LOAD_ERROR
        )


class CyclicDependencyError(ConfigLoadError):
    """循环依赖错误（迁移自 services/project_registry_service.py）"""

    def __init__(self, message: str = "Cyclic dependency detected"):
        super().__init__(message=message)
        self.error_code = ErrorCode.CYCLIC_DEPENDENCY.value


class ContractValidatorError(BusinessException):
    """合约验证异常（迁移自 services/asset_service.py）"""

    def __init__(self, message: str = "Contract validation failed"):
        super().__init__(
            message=message, code=400, error_code=ErrorCode.CONTRACT_VALIDATION_FAILED
        )


class MediaServiceError(BusinessException):
    """媒体服务异常（迁移自 services/asset_service.py）"""

    def __init__(self, message: str = "Media upload failed"):
        super().__init__(
            message=message, code=500, error_code=ErrorCode.MEDIA_UPLOAD_FAILED
        )


# ============ Storage 异常 ============


class StorageError(Exception):
    """存储服务基础异常"""

    pass


class FileSizeExceeded(StorageError):
    """文件大小超出限制"""

    def __init__(self, max_size: int, actual_size: int):
        self.max_size = max_size
        self.actual_size = actual_size
        super().__init__(
            f"文件大小 {actual_size / 1024 / 1024:.2f}MB 超出限制 {max_size / 1024 / 1024:.2f}MB"
        )


class InvalidFileType(StorageError):
    """不支持的文件类型"""

    def __init__(self, mime_type: str, allowed_types: list[str]):
        self.mime_type = mime_type
        self.allowed_types = allowed_types
        super().__init__(
            f"不支持的文件类型 {mime_type}，允许的类型: {', '.join(allowed_types)}"
        )
