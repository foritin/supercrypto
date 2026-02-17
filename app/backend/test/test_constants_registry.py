"""
常量注册中心单元测试

测试 ConstantsRegistry 类的所有方法：
- register: 注册常量分组
- get_group: 获取指定分组
- get_all_groups: 获取所有分组
- list_groups: 列出所有分组名称
- has_group: 检查分组是否存在
"""

import pytest

from src.constants.registry import ConstantsRegistry, get_registry
from src.constants.types import ConstantItem


class TestConstantsRegistry:
    """常量注册中心测试类"""

    @pytest.fixture(autouse=True)
    def setup_and_teardown(self):
        """每个测试前后重置单例实例，确保测试隔离"""
        ConstantsRegistry.reset_instance()
        yield
        ConstantsRegistry.reset_instance()

    # ==================== 单例模式测试 ====================

    def test_singleton_pattern(self):
        """测试单例模式：多次获取实例应返回同一对象"""
        instance1 = ConstantsRegistry.get_instance()
        instance2 = ConstantsRegistry.get_instance()
        assert instance1 is instance2

    def test_singleton_via_new(self):
        """测试通过 __new__ 创建的实例也是单例"""
        instance1 = ConstantsRegistry()
        instance2 = ConstantsRegistry()
        assert instance1 is instance2

    def test_reset_instance(self):
        """测试重置单例实例"""
        instance1 = ConstantsRegistry.get_instance()
        ConstantsRegistry.reset_instance()
        instance2 = ConstantsRegistry.get_instance()
        assert instance1 is not instance2

    # ==================== register 方法测试 ====================

    def test_register_single_group(self):
        """测试注册单个常量分组"""
        registry = ConstantsRegistry.get_instance()
        items = [
            ConstantItem(
                value="real_estate", labels={"zh": "房地产", "en": "Real Estate"}
            ),
            ConstantItem(value="bond", labels={"zh": "债券", "en": "Bond"}),
        ]
        registry.register("asset_type", items)

        result = registry.get_group("asset_type")
        assert result is not None
        assert len(result) == 2
        assert result[0].value == "real_estate"
        assert result[1].value == "bond"

    def test_register_multiple_groups(self):
        """测试注册多个常量分组"""
        registry = ConstantsRegistry.get_instance()

        asset_types = [
            ConstantItem(
                value="real_estate", labels={"zh": "房地产", "en": "Real Estate"}
            ),
        ]
        asset_statuses = [
            ConstantItem(
                value="active",
                labels={"zh": "可认购", "en": "Available"},
                metadata={"color": "green"},
            ),
        ]

        registry.register("asset_type", asset_types)
        registry.register("asset_status", asset_statuses)

        assert registry.get_group("asset_type") is not None
        assert registry.get_group("asset_status") is not None
        assert len(registry.list_groups()) == 2

    def test_register_overwrites_existing_group(self):
        """测试注册已存在的分组会覆盖原有数据"""
        registry = ConstantsRegistry.get_instance()

        items_v1 = [
            ConstantItem(value="v1", labels={"zh": "版本1", "en": "Version 1"}),
        ]
        items_v2 = [
            ConstantItem(value="v2", labels={"zh": "版本2", "en": "Version 2"}),
        ]

        registry.register("test_group", items_v1)
        registry.register("test_group", items_v2)

        result = registry.get_group("test_group")
        assert result is not None
        assert len(result) == 1
        assert result[0].value == "v2"

    def test_register_empty_group(self):
        """测试注册空的常量分组"""
        registry = ConstantsRegistry.get_instance()
        registry.register("empty_group", [])

        result = registry.get_group("empty_group")
        assert result is not None
        assert len(result) == 0

    def test_register_with_metadata(self):
        """测试注册带有元数据的常量"""
        registry = ConstantsRegistry.get_instance()
        items = [
            ConstantItem(
                value="active",
                labels={"zh": "可认购", "en": "Available"},
                metadata={"color": "green", "icon": "check"},
            ),
        ]
        registry.register("status", items)

        result = registry.get_group("status")
        assert result is not None
        assert result[0].metadata == {"color": "green", "icon": "check"}

    # ==================== get_group 方法测试 ====================

    def test_get_group_existing(self):
        """测试获取存在的分组"""
        registry = ConstantsRegistry.get_instance()
        items = [
            ConstantItem(value="test", labels={"zh": "测试", "en": "Test"}),
        ]
        registry.register("test_group", items)

        result = registry.get_group("test_group")
        assert result is not None
        assert len(result) == 1
        assert result[0].value == "test"

    def test_get_group_non_existing(self):
        """测试获取不存在的分组返回 None"""
        registry = ConstantsRegistry.get_instance()
        result = registry.get_group("non_existing_group")
        assert result is None

    def test_get_group_returns_original_list(self):
        """测试 get_group 返回的是原始列表引用"""
        registry = ConstantsRegistry.get_instance()
        items = [
            ConstantItem(value="test", labels={"zh": "测试", "en": "Test"}),
        ]
        registry.register("test_group", items)

        result = registry.get_group("test_group")
        assert result is items  # 返回的是同一个列表对象

    # ==================== get_all_groups 方法测试 ====================

    def test_get_all_groups_empty(self):
        """测试获取所有分组（空注册中心）"""
        registry = ConstantsRegistry.get_instance()
        result = registry.get_all_groups()
        assert result == {}

    def test_get_all_groups_with_data(self):
        """测试获取所有分组（有数据）"""
        registry = ConstantsRegistry.get_instance()

        registry.register(
            "group1",
            [ConstantItem(value="a", labels={"zh": "A", "en": "A"})],
        )
        registry.register(
            "group2",
            [ConstantItem(value="b", labels={"zh": "B", "en": "B"})],
        )

        result = registry.get_all_groups()
        assert len(result) == 2
        assert "group1" in result
        assert "group2" in result

    def test_get_all_groups_returns_copy(self):
        """测试 get_all_groups 返回的是副本，修改不影响原数据"""
        registry = ConstantsRegistry.get_instance()
        registry.register(
            "test_group",
            [ConstantItem(value="test", labels={"zh": "测试", "en": "Test"})],
        )

        result = registry.get_all_groups()
        result["new_group"] = []  # 修改返回的副本

        # 原数据不受影响
        assert "new_group" not in registry.get_all_groups()
        assert len(registry.list_groups()) == 1

    # ==================== list_groups 方法测试 ====================

    def test_list_groups_empty(self):
        """测试列出所有分组名称（空注册中心）"""
        registry = ConstantsRegistry.get_instance()
        result = registry.list_groups()
        assert result == []

    def test_list_groups_with_data(self):
        """测试列出所有分组名称（有数据）"""
        registry = ConstantsRegistry.get_instance()

        registry.register(
            "asset_type",
            [ConstantItem(value="a", labels={"zh": "A", "en": "A"})],
        )
        registry.register(
            "asset_status",
            [ConstantItem(value="b", labels={"zh": "B", "en": "B"})],
        )
        registry.register(
            "media_type",
            [ConstantItem(value="c", labels={"zh": "C", "en": "C"})],
        )

        result = registry.list_groups()
        assert len(result) == 3
        assert "asset_type" in result
        assert "asset_status" in result
        assert "media_type" in result

    # ==================== has_group 方法测试 ====================

    def test_has_group_existing(self):
        """测试检查存在的分组"""
        registry = ConstantsRegistry.get_instance()
        registry.register(
            "test_group",
            [ConstantItem(value="test", labels={"zh": "测试", "en": "Test"})],
        )

        assert registry.has_group("test_group") is True

    def test_has_group_non_existing(self):
        """测试检查不存在的分组"""
        registry = ConstantsRegistry.get_instance()
        assert registry.has_group("non_existing") is False

    def test_has_group_empty_group(self):
        """测试检查空分组（空分组也是存在的）"""
        registry = ConstantsRegistry.get_instance()
        registry.register("empty_group", [])

        assert registry.has_group("empty_group") is True

    # ==================== clear 方法测试 ====================

    def test_clear(self):
        """测试清空所有注册的常量"""
        registry = ConstantsRegistry.get_instance()

        registry.register(
            "group1",
            [ConstantItem(value="a", labels={"zh": "A", "en": "A"})],
        )
        registry.register(
            "group2",
            [ConstantItem(value="b", labels={"zh": "B", "en": "B"})],
        )

        assert len(registry.list_groups()) == 2

        registry.clear()

        assert len(registry.list_groups()) == 0
        assert registry.get_all_groups() == {}

    # ==================== get_registry 便捷函数测试 ====================

    def test_get_registry_function(self):
        """测试 get_registry 便捷函数"""
        registry1 = get_registry()
        registry2 = ConstantsRegistry.get_instance()
        assert registry1 is registry2

    def test_get_registry_returns_singleton(self):
        """测试 get_registry 多次调用返回同一实例"""
        registry1 = get_registry()
        registry2 = get_registry()
        assert registry1 is registry2


class TestConstantItemIntegration:
    """常量项与注册中心集成测试"""

    @pytest.fixture(autouse=True)
    def setup_and_teardown(self):
        """每个测试前后重置单例实例"""
        ConstantsRegistry.reset_instance()
        yield
        ConstantsRegistry.reset_instance()

    def test_constant_item_labels_structure(self):
        """测试常量项的标签结构"""
        item = ConstantItem(
            value="real_estate",
            labels={"zh": "房地产", "en": "Real Estate"},
        )

        assert item.value == "real_estate"
        assert item.labels["zh"] == "房地产"
        assert item.labels["en"] == "Real Estate"
        assert item.metadata is None

    def test_constant_item_with_metadata(self):
        """测试带元数据的常量项"""
        item = ConstantItem(
            value="active",
            labels={"zh": "可认购", "en": "Available"},
            metadata={"color": "green", "priority": 1},
        )

        assert item.metadata is not None
        assert item.metadata["color"] == "green"
        assert item.metadata["priority"] == 1

    def test_full_workflow(self):
        """测试完整的注册和获取工作流"""
        registry = get_registry()

        # 注册资产类型
        asset_types = [
            ConstantItem(
                value="real_estate", labels={"zh": "房地产", "en": "Real Estate"}
            ),
            ConstantItem(value="bond", labels={"zh": "债券", "en": "Bond"}),
            ConstantItem(
                value="commodity", labels={"zh": "大宗商品", "en": "Commodity"}
            ),
        ]
        registry.register("asset_type", asset_types)

        # 注册资产状态
        asset_statuses = [
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
        ]
        registry.register("asset_status", asset_statuses)

        # 验证
        assert registry.has_group("asset_type")
        assert registry.has_group("asset_status")
        assert not registry.has_group("non_existing")

        groups = registry.list_groups()
        assert len(groups) == 2

        all_groups = registry.get_all_groups()
        assert len(all_groups["asset_type"]) == 3
        assert len(all_groups["asset_status"]) == 2

        # 验证具体数据
        types = registry.get_group("asset_type")
        assert types is not None
        values = [item.value for item in types]
        assert "real_estate" in values
        assert "bond" in values
        assert "commodity" in values
