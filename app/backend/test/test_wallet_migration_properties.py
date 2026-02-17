#!/usr/bin/env python3
"""
Wallet 迁移属性测试
==================

测试 Wallet → Account 数据迁移的正确性。

**Validates: Requirements 4.3**

Property 5: Wallet 数据迁移完整性
- 验证迁移后通过 address 可查询到等效数据
- 验证 encrypted_private_key, balance, is_active 字段值保持一致
"""

from dataclasses import dataclass
from decimal import Decimal
from typing import Optional

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

# ============ Mock 数据类 ============


@dataclass
class MockWallet:
    """模拟 Wallet 模型"""

    id: int
    address: str
    encrypted_private_key: str
    network: str
    balance: Decimal
    tag: Optional[str]
    account_id: Optional[int]
    is_active: bool


@dataclass
class MockAccount:
    """模拟 Account 模型"""

    id: int
    address: str
    private_key: str
    network: str
    tag: Optional[str]
    # 新增的钱包字段
    encrypted_private_key: Optional[str] = None
    balance: Decimal = Decimal("0")
    is_active: bool = True


# ============ 迁移函数 ============


def migrate_wallet_to_account(
    wallet: MockWallet,
    account: MockAccount,
) -> MockAccount:
    """
    将 Wallet 数据迁移到 Account

    Args:
        wallet: Wallet 记录
        account: 对应的 Account 记录

    Returns:
        更新后的 Account 记录
    """
    # 迁移字段
    account.encrypted_private_key = wallet.encrypted_private_key
    account.balance = wallet.balance
    account.is_active = wallet.is_active

    return account


def find_account_for_wallet(
    wallet: MockWallet,
    accounts: list[MockAccount],
) -> Optional[MockAccount]:
    """
    为 Wallet 查找对应的 Account

    匹配规则:
    1. 优先匹配 address + network
    2. 回退到只匹配 address

    Args:
        wallet: Wallet 记录
        accounts: Account 列表

    Returns:
        匹配的 Account，如果没有则返回 None
    """
    # 优先匹配 address + network
    for account in accounts:
        if account.address == wallet.address and account.network == wallet.network:
            return account

    # 回退到只匹配 address
    for account in accounts:
        if account.address == wallet.address:
            return account

    return None


# ============ 属性测试 ============


class TestWalletMigrationProperties:
    """Wallet 迁移属性测试"""

    @given(
        wallet_id=st.integers(min_value=1, max_value=10000),
        account_id=st.integers(min_value=1, max_value=10000),
        address=st.from_regex(r"0x[a-fA-F0-9]{40}", fullmatch=True),
        encrypted_key=st.text(
            min_size=64,
            max_size=128,
            alphabet=st.characters(whitelist_categories=("L", "N")),
        ),
        network=st.sampled_from(["hardhat", "sepolia", "mainnet"]),
        balance=st.decimals(
            min_value=0,
            max_value=1000000,
            places=18,
            allow_nan=False,
            allow_infinity=False,
        ),
        is_active=st.booleans(),
    )
    @settings(max_examples=50)
    def test_wallet_fields_migrated_correctly(
        self,
        wallet_id: int,
        account_id: int,
        address: str,
        encrypted_key: str,
        network: str,
        balance: Decimal,
        is_active: bool,
    ):
        """
        **Property 5.1: Wallet 字段正确迁移到 Account**

        验证 encrypted_private_key, balance, is_active 字段值保持一致

        **Validates: Requirements 4.3**
        """
        # Arrange
        wallet = MockWallet(
            id=wallet_id,
            address=address,
            encrypted_private_key=encrypted_key,
            network=network,
            balance=balance,
            tag=None,
            account_id=account_id,
            is_active=is_active,
        )

        account = MockAccount(
            id=account_id,
            address=address,
            private_key="test_private_key",
            network=network,
            tag=None,
        )

        # Act
        migrated_account = migrate_wallet_to_account(wallet, account)

        # Assert
        assert migrated_account.encrypted_private_key == wallet.encrypted_private_key, (
            f"encrypted_private_key 应该保持一致: "
            f"Account={migrated_account.encrypted_private_key}, Wallet={wallet.encrypted_private_key}"
        )
        assert migrated_account.balance == wallet.balance, (
            f"balance 应该保持一致: "
            f"Account={migrated_account.balance}, Wallet={wallet.balance}"
        )
        assert migrated_account.is_active == wallet.is_active, (
            f"is_active 应该保持一致: "
            f"Account={migrated_account.is_active}, Wallet={wallet.is_active}"
        )

    @given(
        address=st.from_regex(r"0x[a-fA-F0-9]{40}", fullmatch=True),
        network=st.sampled_from(["hardhat", "sepolia", "mainnet"]),
    )
    @settings(max_examples=50)
    def test_account_lookup_by_address_and_network(
        self,
        address: str,
        network: str,
    ):
        """
        **Property 5.2: 通过 address + network 查找 Account**

        验证优先匹配 address + network

        **Validates: Requirements 4.3**
        """
        # Arrange
        wallet = MockWallet(
            id=1,
            address=address,
            encrypted_private_key="encrypted_key",
            network=network,
            balance=Decimal("100"),
            tag=None,
            account_id=1,
            is_active=True,
        )

        # 创建多个 Account，只有一个匹配 address + network
        accounts = [
            MockAccount(
                id=1,
                address=address,
                private_key="key1",
                network=network,  # 匹配
                tag=None,
            ),
            MockAccount(
                id=2,
                address=address,
                private_key="key2",
                network="other_network",  # 不匹配 network
                tag=None,
            ),
            MockAccount(
                id=3,
                address="0x" + "0" * 40,  # 不匹配 address
                private_key="key3",
                network=network,
                tag=None,
            ),
        ]

        # Act
        found_account = find_account_for_wallet(wallet, accounts)

        # Assert
        assert found_account is not None, "应该找到匹配的 Account"
        assert found_account.id == 1, "应该匹配 address + network 的 Account"
        assert found_account.address == wallet.address
        assert found_account.network == wallet.network

    @given(
        address=st.from_regex(r"0x[a-fA-F0-9]{40}", fullmatch=True),
    )
    @settings(max_examples=50)
    def test_account_lookup_fallback_to_address_only(
        self,
        address: str,
    ):
        """
        **Property 5.3: 回退到只匹配 address**

        验证当 address + network 不匹配时，回退到只匹配 address

        **Validates: Requirements 4.3**
        """
        # Arrange
        wallet = MockWallet(
            id=1,
            address=address,
            encrypted_private_key="encrypted_key",
            network="hardhat",
            balance=Decimal("100"),
            tag=None,
            account_id=1,
            is_active=True,
        )

        # Account 的 network 不匹配，但 address 匹配
        accounts = [
            MockAccount(
                id=1,
                address=address,
                private_key="key1",
                network="sepolia",  # 不匹配 network
                tag=None,
            ),
        ]

        # Act
        found_account = find_account_for_wallet(wallet, accounts)

        # Assert
        assert found_account is not None, "应该通过 address 找到 Account"
        assert found_account.address == wallet.address

    @given(
        wallet_address=st.from_regex(r"0x[a-fA-F0-9]{40}", fullmatch=True),
    )
    @settings(max_examples=50)
    def test_no_matching_account_returns_none(
        self,
        wallet_address: str,
    ):
        """
        **Property 5.4: 无匹配 Account 时返回 None**

        验证当没有匹配的 Account 时返回 None

        **Validates: Requirements 4.3**
        """
        # Arrange
        wallet = MockWallet(
            id=1,
            address=wallet_address,
            encrypted_private_key="encrypted_key",
            network="hardhat",
            balance=Decimal("100"),
            tag=None,
            account_id=None,
            is_active=True,
        )

        # 所有 Account 的 address 都不匹配
        accounts = [
            MockAccount(
                id=1,
                address="0x" + "1" * 40,
                private_key="key1",
                network="hardhat",
                tag=None,
            ),
            MockAccount(
                id=2,
                address="0x" + "2" * 40,
                private_key="key2",
                network="sepolia",
                tag=None,
            ),
        ]

        # Act
        found_account = find_account_for_wallet(wallet, accounts)

        # Assert
        # 只有当 wallet_address 不在 accounts 中时才应该返回 None
        account_addresses = {a.address for a in accounts}
        if wallet_address not in account_addresses:
            assert found_account is None, "无匹配 Account 时应该返回 None"


# ============ 边界情况测试 ============


class TestWalletMigrationEdgeCases:
    """边界情况测试"""

    def test_zero_balance_migration(self):
        """零余额应正确迁移"""
        wallet = MockWallet(
            id=1,
            address="0x" + "a" * 40,
            encrypted_private_key="key",
            network="hardhat",
            balance=Decimal("0"),
            tag=None,
            account_id=1,
            is_active=True,
        )

        account = MockAccount(
            id=1,
            address="0x" + "a" * 40,
            private_key="pk",
            network="hardhat",
            tag=None,
            balance=Decimal("1000"),  # 原有余额
        )

        migrated = migrate_wallet_to_account(wallet, account)

        assert migrated.balance == Decimal("0"), "零余额应正确迁移"

    def test_inactive_wallet_migration(self):
        """非激活钱包应正确迁移"""
        wallet = MockWallet(
            id=1,
            address="0x" + "a" * 40,
            encrypted_private_key="key",
            network="hardhat",
            balance=Decimal("100"),
            tag=None,
            account_id=1,
            is_active=False,  # 非激活
        )

        account = MockAccount(
            id=1,
            address="0x" + "a" * 40,
            private_key="pk",
            network="hardhat",
            tag=None,
            is_active=True,  # 原本激活
        )

        migrated = migrate_wallet_to_account(wallet, account)

        assert migrated.is_active is False, "非激活状态应正确迁移"

    def test_empty_accounts_list(self):
        """空 Account 列表应返回 None"""
        wallet = MockWallet(
            id=1,
            address="0x" + "a" * 40,
            encrypted_private_key="key",
            network="hardhat",
            balance=Decimal("100"),
            tag=None,
            account_id=None,
            is_active=True,
        )

        found = find_account_for_wallet(wallet, [])

        assert found is None, "空 Account 列表应返回 None"

    def test_large_balance_migration(self):
        """大额余额应正确迁移"""
        large_balance = Decimal("999999999999999999.999999999999999999")

        wallet = MockWallet(
            id=1,
            address="0x" + "a" * 40,
            encrypted_private_key="key",
            network="hardhat",
            balance=large_balance,
            tag=None,
            account_id=1,
            is_active=True,
        )

        account = MockAccount(
            id=1,
            address="0x" + "a" * 40,
            private_key="pk",
            network="hardhat",
            tag=None,
        )

        migrated = migrate_wallet_to_account(wallet, account)

        assert migrated.balance == large_balance, "大额余额应正确迁移"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
