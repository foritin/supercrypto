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
    """媒体类型枚举

    MVP 分类（5 种）:
    - cover: 封面图
    - gallery: 相册（房产照片等）
    - valuation: 估值报告（必需）
    - legal: 法律文件（必需）
    - financial: 财务文件

    其他类型（保留）:
    - floor_plan: 平面图
    - video: 视频
    """

    # MVP 核心分类
    COVER = "cover"  # 封面图
    GALLERY = "gallery"  # 相册（房产照片等）
    VALUATION = "valuation"  # 估值报告（必需）
    LEGAL = "legal"  # 法律文件（必需）
    FINANCIAL = "financial"  # 财务文件

    # 保留的其他类型
    FLOOR_PLAN = "floor_plan"  # 平面图
    VIDEO = "video"  # 视频

    # 兼容旧数据
    IMAGE = "image"  # 普通图片（等同于 gallery）
    EVALUATION = "evaluation"  # 评估报告（等同于 valuation）
    DOCUMENT = "document"  # 其他文档
