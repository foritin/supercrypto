"""
资产媒体模型 - 支持多图片、文档、平面图等
"""
from enum import Enum
from tortoise import fields
from src.models.base import AbstractModel, TimestampMixin


class MediaType(str, Enum):
    """媒体类型枚举"""
    IMAGE = "image"               # 普通图片（房产照片等）
    COVER = "cover"               # 封面图
    FLOOR_PLAN = "floor_plan"     # 平面图
    EVALUATION = "evaluation"     # 评估报告
    DOCUMENT = "document"         # 其他文档
    VIDEO = "video"               # 视频


class AssetMedia(AbstractModel, TimestampMixin):
    """
    资产媒体表
    
    支持存储多种类型的媒体文件：
    - 房产图片（多张）
    - 平面图
    - 评估报告
    - 法律文档
    - 视频链接
    """
    
    asset = fields.ForeignKeyField(
        "models.Asset",
        related_name="media_files",
        on_delete=fields.CASCADE,
        description="关联资产"
    )
    
    # 媒体基本信息
    media_type = fields.CharEnumField(
        MediaType,
        max_length=20,
        default=MediaType.IMAGE,
        description="媒体类型"
    )
    title = fields.CharField(max_length=200, null=True, description="媒体标题")
    description = fields.TextField(null=True, description="媒体描述")
    
    # URL 信息
    url = fields.CharField(max_length=1000, description="媒体文件URL")
    thumbnail_url = fields.CharField(max_length=1000, null=True, description="缩略图URL")
    
    # 文件元信息
    file_name = fields.CharField(max_length=255, null=True, description="原始文件名")
    file_size = fields.IntField(null=True, description="文件大小(bytes)")
    mime_type = fields.CharField(max_length=100, null=True, description="MIME类型")
    
    # 排序和状态
    sort_order = fields.IntField(default=0, description="排序顺序")
    is_primary = fields.BooleanField(default=False, description="是否为主图/封面")
    
    class Meta:
        table = "asset_media"
        table_description = "资产媒体文件表"
        indexes = [
            ("asset_id", "media_type"),
            ("asset_id", "sort_order"),
        ]
        ordering = ["sort_order", "-created_at"]
    
    def __str__(self):
        return f"AssetMedia(asset_id={self.asset_id}, type={self.media_type}, title={self.title})"


class AssetFeatures(AbstractModel, TimestampMixin):
    """
    资产特征表 - 用于存储物业的详细特征
    
    适用于房地产类资产，存储如：
    - 基本信息：卧室数、浴室数、面积
    - 建筑信息：建造年份、翻新年份、建筑类型
    - 设施列表：停车位、泳池、健身房等
    """
    
    asset = fields.OneToOneField(
        "models.Asset",
        related_name="features",
        on_delete=fields.CASCADE,
        description="关联资产"
    )
    
    # === 房产基本信息 ===
    bedrooms = fields.IntField(null=True, description="卧室数量")
    bathrooms = fields.DecimalField(
        max_digits=4, decimal_places=1, 
        null=True, 
        description="浴室数量 (支持半浴室如 2.5)"
    )
    sqft = fields.IntField(null=True, description="面积 (平方英尺)")
    sqm = fields.IntField(null=True, description="面积 (平方米)")
    lot_size = fields.IntField(null=True, description="地块面积 (平方英尺)")
    
    # === 建筑信息 ===
    year_built = fields.IntField(null=True, description="建造年份")
    year_renovated = fields.IntField(null=True, description="最近翻新年份")
    property_type = fields.CharField(
        max_length=50, 
        null=True, 
        description="物业类型: single_family, multi_family, condo, commercial"
    )
    stories = fields.IntField(null=True, description="楼层数")
    
    # === 租赁信息 ===
    rental_status = fields.CharField(
        max_length=20,
        null=True,
        description="租赁状态: occupied, vacant, partial"
    )
    monthly_rent = fields.DecimalField(
        max_digits=10, decimal_places=2,
        null=True,
        description="月租金 (USD)"
    )
    lease_end_date = fields.DateField(null=True, description="租约结束日期")
    
    # === 设施 (JSON 数组存储) ===
    amenities = fields.JSONField(
        null=True,
        description="设施列表 JSON: ['parking', 'pool', 'gym', 'security', ...]"
    )
    
    # === 周边信息 (JSON 对象存储) ===
    neighborhood = fields.JSONField(
        null=True,
        description="周边信息 JSON: {schools: [], transit: [], shopping: []}"
    )
    
    class Meta:
        table = "asset_features"
        table_description = "资产特征详情表"
    
    def __str__(self):
        return f"AssetFeatures(asset_id={self.asset_id})"
