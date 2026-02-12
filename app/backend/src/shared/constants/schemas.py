"""
常量数据模型

定义常量项和常量分组的 Pydantic 模型，用于 API 响应序列化。
"""

from typing import Any, Dict, Optional

from pydantic import ConfigDict, BaseModel, Field


class ConstantItem(BaseModel):
    """
    单个常量项

    Attributes:
        value: 常量值，如 "real_estate"
        labels: 多语言标签，如 {"zh": "房地产", "en": "Real Estate"}
        metadata: 额外元数据，如颜色、图标等

    Example:
        >>> item = ConstantItem(
        ...     value="real_estate",
        ...     labels={"zh": "房地产", "en": "Real Estate"},
        ...     metadata={"icon": "building"}
        ... )
    """

    value: str = Field(description="常量值")
    labels: Dict[str, str] = Field(description="多语言标签 {'zh': '中文', 'en': 'English'}")
    metadata: Optional[Dict[str, Any]] = Field(
        default=None, description="额外元数据 (如颜色、图标)"
    )

    model_config = ConfigDict(json_schema_extra={
            "example": {
                "value": "real_estate",
                "labels": {"zh": "房地产", "en": "Real Estate"},
                "metadata": {"icon": "building"},
            }
        })


class ConstantGroup(BaseModel):
    """
    常量分组

    Attributes:
        group: 分组名称，如 "asset_type"
        items: 常量项列表

    Example:
        >>> group = ConstantGroup(
        ...     group="asset_type",
        ...     items=[
        ...         ConstantItem(value="real_estate", labels={"zh": "房地产", "en": "Real Estate"}),
        ...         ConstantItem(value="bond", labels={"zh": "债券", "en": "Bond"}),
        ...     ]
        ... )
    """

    group: str = Field(description="分组名称")
    items: list[ConstantItem] = Field(description="常量项列表")

    model_config = ConfigDict(json_schema_extra={
            "example": {
                "group": "asset_type",
                "items": [
                    {
                        "value": "real_estate",
                        "labels": {"zh": "房地产", "en": "Real Estate"},
                        "metadata": None,
                    },
                    {
                        "value": "bond",
                        "labels": {"zh": "债券", "en": "Bond"},
                        "metadata": None,
                    },
                ],
            }
        })
