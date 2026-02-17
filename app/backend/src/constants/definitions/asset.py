"""
资产相关常量定义

定义资产类型、资产状态、媒体类型等常量，与后端枚举保持同步。

同步的枚举:
- AssetType: src/schemas/enums/asset.py
- AssetStatus: src/schemas/enums/asset.py
- MediaType: src/schemas/enums/asset.py
"""

from src.constants.types import ConstantItem

# =============================================================================
# 资产类型常量 (asset_type)
# 同步: AssetType 枚举 - src/shared/schemas/enums/asset.py
# =============================================================================
ASSET_TYPE_CONSTANTS: list[ConstantItem] = [
    ConstantItem(
        value="real_estate",
        labels={"zh": "房地产", "en": "Real Estate"},
    ),
    ConstantItem(
        value="bond",
        labels={"zh": "债券", "en": "Bond"},
    ),
    ConstantItem(
        value="commodity",
        labels={"zh": "大宗商品", "en": "Commodity"},
    ),
    ConstantItem(
        value="equity",
        labels={"zh": "股权", "en": "Equity"},
    ),
    ConstantItem(
        value="other",
        labels={"zh": "其他", "en": "Other"},
    ),
]

# =============================================================================
# 资产状态常量 (asset_status)
# 同步: AssetStatus 枚举 - src/shared/schemas/enums/asset.py
# =============================================================================
ASSET_STATUS_CONSTANTS: list[ConstantItem] = [
    ConstantItem(
        value="active",
        labels={"zh": "可认购", "en": "Available"},
        metadata={"color": "green"},
    ),
    ConstantItem(
        value="paused",
        labels={"zh": "已暂停", "en": "Paused"},
        metadata={"color": "orange"},
    ),
    ConstantItem(
        value="sold_out",
        labels={"zh": "已售罄", "en": "Sold Out"},
        metadata={"color": "red"},
    ),
    ConstantItem(
        value="closed",
        labels={"zh": "已关闭", "en": "Closed"},
        metadata={"color": "default"},
    ),
]

# =============================================================================
# 媒体类型常量 (media_type) - MVP 核心类型
# 同步: MediaType 枚举 - src/schemas/enums/asset.py
# =============================================================================
MEDIA_TYPE_CONSTANTS: list[ConstantItem] = [
    ConstantItem(
        value="cover",
        labels={"zh": "封面图", "en": "Cover"},
    ),
    ConstantItem(
        value="gallery",
        labels={"zh": "相册", "en": "Gallery"},
    ),
    ConstantItem(
        value="valuation",
        labels={"zh": "估值报告", "en": "Valuation Report"},
    ),
    ConstantItem(
        value="legal",
        labels={"zh": "法律文件", "en": "Legal Documents"},
    ),
    ConstantItem(
        value="financial",
        labels={"zh": "财务文件", "en": "Financial Documents"},
    ),
    ConstantItem(
        value="floor_plan",
        labels={"zh": "平面图", "en": "Floor Plan"},
    ),
    ConstantItem(
        value="video",
        labels={"zh": "视频", "en": "Video"},
    ),
    ConstantItem(
        value="other",
        labels={"zh": "其他文档", "en": "Other"},
    ),
    ConstantItem(
        value="logo",
        labels={"zh": "Logo 图标", "en": "Logo"},
    ),
]
