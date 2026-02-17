"""
常量模块 - 提供统一的常量管理

导出:
    - ConstantItem: 单个常量项模型
    - ConstantGroup: 常量分组模型
    - ConstantsRegistry: 常量注册中心
    - get_registry: 获取注册中心实例的便捷函数

使用示例:
    >>> from src.constants import get_registry
    >>> registry = get_registry()
    >>> asset_types = registry.get_group("asset_type")
    >>> for item in asset_types:
    ...     print(f"{item.value}: {item.labels['zh']}")
"""

# 导入 definitions 模块以触发常量自动注册
# 注意: 此导入必须在 registry 导入之后，因为 definitions 依赖 registry
from . import definitions  # noqa: F401
from .registry import ConstantsRegistry, get_registry
from .types import ConstantGroup, ConstantItem

__all__ = [
    "ConstantItem",
    "ConstantGroup",
    "ConstantsRegistry",
    "get_registry",
]
