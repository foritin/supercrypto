"""
通用Schema定义
"""
from pydantic import BaseModel, Field
from typing import Optional


class PaginationParams(BaseModel):
    """分页参数"""
    page: int = Field(default=1, ge=1, description="页码")
    page_size: int = Field(default=10, ge=1, le=100, description="每页数量")
    
    @property
    def offset(self) -> int:
        """计算偏移量"""
        return (self.page - 1) * self.page_size
    
    @property
    def limit(self) -> int:
        """获取限制数量"""
        return self.page_size


class SortParams(BaseModel):
    """排序参数"""
    sort_by: Optional[str] = Field(default="created_at", description="排序字段")
    sort_order: str = Field(default="desc", description="排序方向: asc/desc")
    
    def validate_sort_order(self) -> str:
        """验证并返回排序方向"""
        if self.sort_order.lower() not in ["asc", "desc"]:
            return "desc"
        return self.sort_order.lower()

