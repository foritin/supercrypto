"""
媒体管理 Schema
"""

from typing import Optional

from pydantic import BaseModel, Field


class MediaUploadResponse(BaseModel):
    """媒体上传响应"""

    id: int
    asset_id: int
    media_type: str
    title: Optional[str] = None
    description: Optional[str] = None
    url: str
    thumbnail_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    sort_order: int = 0
    is_primary: bool = False

    class Config:
        from_attributes = True


class MediaUpdateRequest(BaseModel):
    """媒体更新请求"""

    title: Optional[str] = Field(None, max_length=200, description="标题")
    description: Optional[str] = Field(None, description="描述")
    is_primary: Optional[bool] = Field(None, description="是否设为主图")


class MediaReorderRequest(BaseModel):
    """媒体排序请求"""

    media_ids: list[int] = Field(..., description="按新顺序排列的媒体 ID 列表")


class MediaListResponse(BaseModel):
    """媒体列表项"""

    id: int
    asset_id: int
    media_type: str
    title: Optional[str] = None
    description: Optional[str] = None
    url: str
    thumbnail_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    sort_order: int = 0
    is_primary: bool = False

    class Config:
        from_attributes = True


class MediaStatsResponse(BaseModel):
    """媒体统计响应"""

    cover: int = 0
    gallery: int = 0
    valuation: int = 0
    legal: int = 0
    financial: int = 0
    floor_plan: int = 0
    video: int = 0
    image: int = 0
    document: int = 0
    evaluation: int = 0


__all__ = [
    "MediaUploadResponse",
    "MediaUpdateRequest",
    "MediaReorderRequest",
    "MediaListResponse",
    "MediaStatsResponse",
]
