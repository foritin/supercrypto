"""
资产相关枚举
"""

from enum import Enum


class AssetStatus(str, Enum):
    """资产状态枚举"""

    ACTIVE = "active"  # 可认购
    PAUSED = "paused"  # 已暂停
    SOLD_OUT = "sold_out"  # 已售罄
    CLOSED = "closed"  # 已关闭


class AssetType(str, Enum):
    """资产类型枚举"""

    REAL_ESTATE = "real_estate"  # 房地产
    BOND = "bond"  # 债券
    COMMODITY = "commodity"  # 大宗商品
    EQUITY = "equity"  # 股权
    OTHER = "other"  # 其他


class MediaType(str, Enum):
    """媒体类型枚举 - MVP 核心分类"""

    COVER = "cover"  # 封面图
    GALLERY = "gallery"  # 相册
    VALUATION = "valuation"  # 估值报告
    LEGAL = "legal"  # 法律文件
    FINANCIAL = "financial"  # 财务文件
    FLOOR_PLAN = "floor_plan"  # 平面图
    VIDEO = "video"  # 视频
    OTHER = "other"  # 其他文档
