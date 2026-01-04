"""
可复用混入类 (Mixins)

用于 Pydantic Schema 的通用字段混入
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class TimestampMixin(BaseModel):
    """时间戳混入 - 用于包含创建和更新时间的Schema"""
    created_at: Optional[datetime] = Field(None, description="创建时间(UTC)")
    updated_at: Optional[datetime] = Field(None, description="更新时间(UTC)")


class IDMixin(BaseModel):
    """ID混入 - 用于包含ID的Schema"""
    id: int = Field(description="唯一ID")

