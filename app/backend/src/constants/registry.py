"""
常量注册中心

提供单例模式的常量注册和获取功能，支持动态注册常量分组。
"""

from typing import Dict, Optional

from .types import ConstantItem


class ConstantsRegistry:
    """
    常量注册中心 - 单例模式

    用于集中管理所有常量分组，支持动态注册和获取。

    Example:
        >>> registry = ConstantsRegistry.get_instance()
        >>> registry.register(
        ...     "asset_type",
        ...     [
        ...         ConstantItem(
        ...             value="real_estate",
        ...             labels={"zh": "房地产", "en": "Real Estate"},
        ...         )
        ...     ],
        ... )
        >>> items = registry.get_group("asset_type")
    """

    _instance: Optional["ConstantsRegistry"] = None
    _groups: Dict[str, list[ConstantItem]]

    def __new__(cls) -> "ConstantsRegistry":
        """确保单例模式"""
        if cls._instance is None:
            instance = super().__new__(cls)
            instance._groups = {}
            cls._instance = instance
        return cls._instance

    @classmethod
    def get_instance(cls) -> "ConstantsRegistry":
        """
        获取注册中心单例实例

        Returns:
            ConstantsRegistry: 注册中心实例
        """
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    @classmethod
    def reset_instance(cls) -> None:
        """
        重置单例实例（仅用于测试）

        Warning:
            此方法仅应在测试中使用，生产环境不应调用
        """
        cls._instance = None

    def register(self, group: str, items: list[ConstantItem]) -> None:
        """
        注册常量分组

        Args:
            group: 分组名称，如 "asset_type"
            items: 常量项列表

        Example:
            >>> registry.register(
            ...     "asset_type",
            ...     [
            ...         ConstantItem(
            ...             value="real_estate",
            ...             labels={"zh": "房地产", "en": "Real Estate"},
            ...         )
            ...     ],
            ... )
        """
        self._groups[group] = items

    def get_group(self, group: str) -> Optional[list[ConstantItem]]:
        """
        获取指定分组的常量列表

        Args:
            group: 分组名称

        Returns:
            常量项列表，如果分组不存在则返回 None
        """
        return self._groups.get(group)

    def get_all_groups(self) -> Dict[str, list[ConstantItem]]:
        """
        获取所有常量分组

        Returns:
            包含所有分组的字典副本
        """
        return self._groups.copy()

    def list_groups(self) -> list[str]:
        """
        列出所有分组名称

        Returns:
            分组名称列表
        """
        return list(self._groups.keys())

    def has_group(self, group: str) -> bool:
        """
        检查分组是否存在

        Args:
            group: 分组名称

        Returns:
            分组是否存在
        """
        return group in self._groups

    def clear(self) -> None:
        """
        清空所有注册的常量（仅用于测试）

        Warning:
            此方法仅应在测试中使用，生产环境不应调用
        """
        self._groups.clear()


def get_registry() -> ConstantsRegistry:
    """
    获取常量注册中心实例的便捷函数

    Returns:
        ConstantsRegistry: 注册中心实例

    Example:
        >>> from src.constants import get_registry
        >>> registry = get_registry()
        >>> items = registry.get_group("asset_type")
    """
    return ConstantsRegistry.get_instance()
