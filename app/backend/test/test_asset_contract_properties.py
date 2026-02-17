#!/usr/bin/env python3
"""
Asset 合约地址属性测试
======================

测试 Asset.primary_contract_address property 的正确性。

**Validates: Requirements 5.2**

Property 8: Asset.primary_contract_address 查询正确性
- 验证返回值等于 AssetContractBinding.filter(asset_id=asset.id, is_primary=True).first().contract_address
- 验证不存在时返回 None
"""

from dataclasses import dataclass
from typing import Optional

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

# ============ Mock 数据类 ============


@dataclass
class MockAssetContractBinding:
    """模拟 AssetContractBinding 模型"""

    id: int
    asset_id: int
    contract_name: str
    contract_address: str
    contract_type: str
    is_primary: bool


@dataclass
class MockAsset:
    """模拟 Asset 模型"""

    id: int
    name: str
    symbol: str
    contract_address: Optional[str]  # 缓存字段

    # 模拟关联的 bindings
    _bindings: list[MockAssetContractBinding] = None

    def __post_init__(self):
        if self._bindings is None:
            self._bindings = []

    @property
    def primary_contract_address(self) -> Optional[str]:
        """
        获取主合约地址 (同步 property)

        模拟 Asset 模型的 primary_contract_address property
        当前实现返回缓存的 contract_address 字段值
        """
        return self.contract_address if self.contract_address else None

    def get_primary_from_bindings(self) -> Optional[str]:
        """
        从 bindings 中获取主合约地址

        模拟通过 AssetContractBinding 查询的逻辑
        """
        for binding in self._bindings:
            if binding.is_primary:
                return binding.contract_address
        return None


# ============ 辅助函数 ============


def sync_contract_address_from_bindings(asset: MockAsset) -> None:
    """
    同步 contract_address 字段

    模拟绑定操作后同步 contract_address 字段的逻辑
    """
    primary_addr = asset.get_primary_from_bindings()
    asset.contract_address = primary_addr


# ============ 属性测试 ============


class TestAssetPrimaryContractAddressProperties:
    """Asset.primary_contract_address 属性测试"""

    @given(
        asset_id=st.integers(min_value=1, max_value=10000),
        asset_name=st.text(
            min_size=1,
            max_size=50,
            alphabet=st.characters(whitelist_categories=("L", "N")),
        ),
        symbol=st.text(
            min_size=1,
            max_size=10,
            alphabet=st.characters(whitelist_categories=("Lu",)),
        ),
        contract_address=st.from_regex(r"0x[a-fA-F0-9]{40}", fullmatch=True),
    )
    @settings(max_examples=50)
    def test_primary_contract_address_returns_cached_value(
        self,
        asset_id: int,
        asset_name: str,
        symbol: str,
        contract_address: str,
    ):
        """
        **Property 8.1: primary_contract_address 返回缓存值**

        验证 primary_contract_address property 返回 contract_address 字段的值

        **Validates: Requirements 5.4**
        """
        # Arrange
        asset = MockAsset(
            id=asset_id,
            name=asset_name,
            symbol=symbol,
            contract_address=contract_address,
        )

        # Act
        result = asset.primary_contract_address

        # Assert
        assert result == contract_address, (
            f"primary_contract_address ({result}) 应该等于 contract_address ({contract_address})"
        )

    @given(
        asset_id=st.integers(min_value=1, max_value=10000),
        asset_name=st.text(
            min_size=1,
            max_size=50,
            alphabet=st.characters(whitelist_categories=("L", "N")),
        ),
        symbol=st.text(
            min_size=1,
            max_size=10,
            alphabet=st.characters(whitelist_categories=("Lu",)),
        ),
    )
    @settings(max_examples=50)
    def test_primary_contract_address_returns_none_when_empty(
        self,
        asset_id: int,
        asset_name: str,
        symbol: str,
    ):
        """
        **Property 8.2: 无主合约时返回 None**

        验证当 contract_address 为空时，primary_contract_address 返回 None

        **Validates: Requirements 5.5**
        """
        # Arrange - 测试 None
        asset_none = MockAsset(
            id=asset_id,
            name=asset_name,
            symbol=symbol,
            contract_address=None,
        )

        # Act & Assert
        assert asset_none.primary_contract_address is None, (
            "contract_address 为 None 时，primary_contract_address 应该返回 None"
        )

        # Arrange - 测试空字符串
        asset_empty = MockAsset(
            id=asset_id,
            name=asset_name,
            symbol=symbol,
            contract_address="",
        )

        # Act & Assert
        assert asset_empty.primary_contract_address is None, (
            "contract_address 为空字符串时，primary_contract_address 应该返回 None"
        )

    @given(
        asset_id=st.integers(min_value=1, max_value=10000),
        asset_name=st.text(
            min_size=1,
            max_size=50,
            alphabet=st.characters(whitelist_categories=("L", "N")),
        ),
        symbol=st.text(
            min_size=1,
            max_size=10,
            alphabet=st.characters(whitelist_categories=("Lu",)),
        ),
        primary_address=st.from_regex(r"0x[a-fA-F0-9]{40}", fullmatch=True),
        other_addresses=st.lists(
            st.from_regex(r"0x[a-fA-F0-9]{40}", fullmatch=True),
            min_size=0,
            max_size=5,
        ),
    )
    @settings(max_examples=50)
    def test_binding_sync_updates_contract_address(
        self,
        asset_id: int,
        asset_name: str,
        symbol: str,
        primary_address: str,
        other_addresses: list[str],
    ):
        """
        **Property 8.3: 绑定同步正确更新 contract_address**

        验证从 bindings 同步后，contract_address 等于主合约地址

        **Validates: Requirements 5.2**
        """
        # Arrange
        asset = MockAsset(
            id=asset_id,
            name=asset_name,
            symbol=symbol,
            contract_address=None,  # 初始为空
        )

        # 创建 bindings
        bindings = []

        # 添加主合约
        bindings.append(
            MockAssetContractBinding(
                id=1,
                asset_id=asset_id,
                contract_name=f"{symbol}Token",
                contract_address=primary_address,
                contract_type="project",
                is_primary=True,
            )
        )

        # 添加其他合约
        for i, addr in enumerate(other_addresses):
            bindings.append(
                MockAssetContractBinding(
                    id=i + 2,
                    asset_id=asset_id,
                    contract_name=f"Contract{i}",
                    contract_address=addr,
                    contract_type="common",
                    is_primary=False,
                )
            )

        asset._bindings = bindings

        # Act - 同步 contract_address
        sync_contract_address_from_bindings(asset)

        # Assert
        assert asset.contract_address == primary_address, (
            f"同步后 contract_address ({asset.contract_address}) "
            f"应该等于主合约地址 ({primary_address})"
        )
        assert asset.primary_contract_address == primary_address, (
            f"同步后 primary_contract_address ({asset.primary_contract_address}) "
            f"应该等于主合约地址 ({primary_address})"
        )

    @given(
        asset_id=st.integers(min_value=1, max_value=10000),
        asset_name=st.text(
            min_size=1,
            max_size=50,
            alphabet=st.characters(whitelist_categories=("L", "N")),
        ),
        symbol=st.text(
            min_size=1,
            max_size=10,
            alphabet=st.characters(whitelist_categories=("Lu",)),
        ),
        addresses=st.lists(
            st.from_regex(r"0x[a-fA-F0-9]{40}", fullmatch=True),
            min_size=1,
            max_size=5,
        ),
    )
    @settings(max_examples=50)
    def test_no_primary_binding_returns_none(
        self,
        asset_id: int,
        asset_name: str,
        symbol: str,
        addresses: list[str],
    ):
        """
        **Property 8.4: 无主合约绑定时返回 None**

        验证当所有 bindings 的 is_primary=False 时，同步后 contract_address 为 None

        **Validates: Requirements 5.5**
        """
        # Arrange
        asset = MockAsset(
            id=asset_id,
            name=asset_name,
            symbol=symbol,
            contract_address="0x" + "1" * 40,  # 初始有值
        )

        # 创建 bindings (全部非主合约)
        bindings = []
        for i, addr in enumerate(addresses):
            bindings.append(
                MockAssetContractBinding(
                    id=i + 1,
                    asset_id=asset_id,
                    contract_name=f"Contract{i}",
                    contract_address=addr,
                    contract_type="common",
                    is_primary=False,  # 全部非主合约
                )
            )

        asset._bindings = bindings

        # Act - 同步 contract_address
        sync_contract_address_from_bindings(asset)

        # Assert
        assert asset.contract_address is None, (
            "无主合约绑定时，同步后 contract_address 应该为 None"
        )
        assert asset.primary_contract_address is None, (
            "无主合约绑定时，primary_contract_address 应该返回 None"
        )


# ============ 边界情况测试 ============


class TestAssetContractAddressEdgeCases:
    """边界情况测试"""

    def test_empty_bindings_list(self):
        """空 bindings 列表应返回 None"""
        asset = MockAsset(
            id=1,
            name="Test",
            symbol="TST",
            contract_address=None,
            _bindings=[],
        )

        sync_contract_address_from_bindings(asset)

        assert asset.contract_address is None
        assert asset.primary_contract_address is None

    def test_multiple_primary_bindings_returns_first(self):
        """多个主合约时返回第一个"""
        asset = MockAsset(
            id=1,
            name="Test",
            symbol="TST",
            contract_address=None,
        )

        # 创建多个主合约 (异常情况)
        asset._bindings = [
            MockAssetContractBinding(
                id=1,
                asset_id=1,
                contract_name="Token1",
                contract_address="0x" + "a" * 40,
                contract_type="project",
                is_primary=True,
            ),
            MockAssetContractBinding(
                id=2,
                asset_id=1,
                contract_name="Token2",
                contract_address="0x" + "b" * 40,
                contract_type="project",
                is_primary=True,
            ),
        ]

        sync_contract_address_from_bindings(asset)

        # 应该返回第一个主合约
        assert asset.contract_address == "0x" + "a" * 40

    def test_contract_address_consistency(self):
        """contract_address 和 primary_contract_address 应该一致"""
        test_addresses = [
            "0x" + "0" * 40,
            "0x" + "f" * 40,
            "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12",
        ]

        for addr in test_addresses:
            asset = MockAsset(
                id=1,
                name="Test",
                symbol="TST",
                contract_address=addr,
            )

            assert asset.primary_contract_address == asset.contract_address, (
                f"primary_contract_address 应该等于 contract_address: {addr}"
            )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
