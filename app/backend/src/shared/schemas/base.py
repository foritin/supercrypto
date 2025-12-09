"""
基础Schema模型 - 通用响应格式
"""
from typing import TypeVar, Generic, Optional, Any
from pydantic import BaseModel, Field
from datetime import datetime


T = TypeVar('T')


class ApiResponse(BaseModel, Generic[T]):
    """
    通用API响应格式
    
    Example:
        ApiResponse[UserResponse](data=user, message="success")
    """
    code: int = Field(default=0, description="状态码，0表示成功")
    message: str = Field(default="success", description="响应消息")
    data: Optional[T] = Field(default=None, description="响应数据")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="响应时间戳(UTC)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "code": 0,
                "message": "success",
                "data": {"id": 1, "name": "example"},
                "timestamp": "2025-11-16T10:00:00Z"
            }
        }


class PaginatedResponse(BaseModel, Generic[T]):
    """
    分页响应格式
    
    Example:
        PaginatedResponse[UserResponse](items=users, total=100, page=1, page_size=10)
    """
    items: list[T] = Field(description="数据列表")
    total: int = Field(description="总数量")
    page: int = Field(description="当前页码")
    page_size: int = Field(description="每页数量")
    total_pages: int = Field(description="总页数")
    
    @property
    def has_next(self) -> bool:
        """是否有下一页"""
        return self.page < self.total_pages
    
    @property
    def has_prev(self) -> bool:
        """是否有上一页"""
        return self.page > 1
    
    class Config:
        json_schema_extra = {
            "example": {
                "items": [{"id": 1}, {"id": 2}],
                "total": 100,
                "page": 1,
                "page_size": 10,
                "total_pages": 10
            }
        }


class ErrorResponse(BaseModel):
    """
    错误响应格式
    
    用于统一错误返回格式
    """
    code: int = Field(description="错误码")
    message: str = Field(description="错误信息")
    detail: Optional[Any] = Field(default=None, description="错误详情")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="时间戳(UTC)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "code": 400,
                "message": "Bad Request",
                "detail": "Invalid parameter: user_id",
                "timestamp": "2025-11-16T10:00:00Z"
            }
        }


class TimestampMixin(BaseModel):
    """时间戳混入 - 用于包含创建和更新时间的Schema"""
    created_at: Optional[datetime] = Field(None, description="创建时间(UTC)")
    updated_at: Optional[datetime] = Field(None, description="更新时间(UTC)")


class IDMixin(BaseModel):
    """ID混入 - 用于包含ID的Schema"""
    id: int = Field(description="唯一ID")

