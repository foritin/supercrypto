"""
统一异常定义
"""
from typing import Optional, Any


class BusinessException(Exception):
    """
    业务异常基类
    
    用于业务逻辑中的异常情况
    """
    
    def __init__(
        self,
        message: str,
        code: int = 400,
        detail: Optional[Any] = None
    ):
        self.message = message
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
        detail: Optional[Any] = None
    ):
        super().__init__(message=message, code=404, detail=detail)


class ValidationException(BusinessException):
    """
    数据验证异常
    
    Example:
        raise ValidationException("Invalid address format")
    """
    
    def __init__(
        self,
        message: str = "Validation failed",
        detail: Optional[Any] = None
    ):
        super().__init__(message=message, code=422, detail=detail)


class UnauthorizedException(BusinessException):
    """
    未授权异常
    
    Example:
        raise UnauthorizedException("Invalid token")
    """
    
    def __init__(
        self,
        message: str = "Unauthorized",
        detail: Optional[Any] = None
    ):
        super().__init__(message=message, code=401, detail=detail)


class ForbiddenException(BusinessException):
    """
    禁止访问异常
    
    Example:
        raise ForbiddenException("Insufficient permissions")
    """
    
    def __init__(
        self,
        message: str = "Forbidden",
        detail: Optional[Any] = None
    ):
        super().__init__(message=message, code=403, detail=detail)


class ConflictException(BusinessException):
    """
    资源冲突异常
    
    Example:
        raise ConflictException("Account already exists")
    """
    
    def __init__(
        self,
        message: str = "Resource conflict",
        detail: Optional[Any] = None
    ):
        super().__init__(message=message, code=409, detail=detail)


class InsufficientBalanceException(BusinessException):
    """
    余额不足异常（业务特定）
    
    Example:
        raise InsufficientBalanceException("Insufficient balance for transfer")
    """
    
    def __init__(
        self,
        message: str = "Insufficient balance",
        detail: Optional[Any] = None
    ):
        super().__init__(message=message, code=400, detail=detail)

