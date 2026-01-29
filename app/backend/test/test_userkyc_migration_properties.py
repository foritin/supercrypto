#!/usr/bin/env python3
"""
UserKyc 迁移属性测试
====================

测试 UserKyc reviewer_id → reviewer_address 迁移的正确性。

**Validates: Requirements 2.3**

Property 3: reviewer_address 填充正确性
- 验证如果 reviewer_id 有值且对应 Account 存在，reviewer_address 等于该 Account.address
"""

from dataclasses import dataclass
from typing import Optional

import pytest
from hypothesis import given, settings, strategies as st


# ============================================================
# 测试数据模型 (不依赖数据库)
# ============================================================


@dataclass
class MockAccount:
    """模拟 Account 模型"""
    id: int
    address: str


@dataclass
class MockUserKyc:
    """模拟 UserKyc 模型"""
    id: int
    wallet_address: str
    reviewer_id: Optional[int] = None
    reviewer_address: Optional[str] = None


# ============================================================
# 迁移逻辑 (纯函数，便于测试)
# ============================================================


def migrate_reviewer_address(
    kyc: MockUserKyc,
    account_map: dict[int, str],
) -> tuple[MockUserKyc, bool, Optional[str]]:
    """
    迁移 reviewer_id 到 reviewer_address
    
    Args:
        kyc: UserKyc 记录
        account_map: Account ID -> address 映射
        
    Returns:
        (更新后的 kyc, 是否迁移成功, 错误信息)
    """
    # 不需要迁移的情况
    if kyc.reviewer_id is None:
        return kyc, False, None
    
    if kyc.reviewer_address and kyc.reviewer_address.strip():
        return kyc, False, None
    
    # 需要迁移
    if kyc.reviewer_id not in account_map:
        return kyc, False, f"Account not found for reviewer_id={kyc.reviewer_id}"
    
    # 执行迁移
    address = account_map[kyc.reviewer_id]
    kyc.reviewer_address = address.lower()
    return kyc, True, None


def should_migrate(kyc: MockUserKyc) -> bool:
    """判断是否需要迁移"""
    return (
        kyc.reviewer_id is not None
        and (kyc.reviewer_address is None or kyc.reviewer_address.strip() == "")
    )


# ============================================================
# Hypothesis 策略
# ============================================================


# 以太坊地址策略
eth_address_strategy = st.text(
    alphabet="0123456789abcdef",
    min_size=40,
    max_size=40,
).map(lambda x: f"0x{x}")

# Account ID 策略
account_id_strategy = st.integers(min_value=1, max_value=1000000)

# 可选的 reviewer_id 策略
optional_reviewer_id_strategy = st.one_of(
    st.none(),
    account_id_strategy,
)

# 可选的 reviewer_address 策略
optional_reviewer_address_strategy = st.one_of(
    st.none(),
    st.just(""),  # 空字符串
    eth_address_strategy,
)


# ============================================================
# 属性测试
# ============================================================


class TestUserKycMigrationProperties:
    """UserKyc 迁移属性测试"""
    
    @given(
        reviewer_id=account_id_strategy,
        account_address=eth_address_strategy,
    )
    @settings(max_examples=100)
    def test_property_reviewer_address_filled_correctly(
        self,
        reviewer_id: int,
        account_address: str,
    ):
        """
        **Property 3: reviewer_address 填充正确性**
        
        验证如果 reviewer_id 有值且对应 Account 存在，
        reviewer_address 等于该 Account.address (小写)
        
        **Validates: Requirements 2.3**
        """
        # Arrange
        kyc = MockUserKyc(
            id=1,
            wallet_address="0x" + "a" * 40,
            reviewer_id=reviewer_id,
            reviewer_address=None,  # 需要迁移
        )
        account_map = {reviewer_id: account_address}
        
        # Act
        updated_kyc, migrated, error = migrate_reviewer_address(kyc, account_map)
        
        # Assert
        assert migrated is True
        assert error is None
        assert updated_kyc.reviewer_address == account_address.lower()
    
    @given(
        reviewer_id=account_id_strategy,
        existing_address=eth_address_strategy,
        account_address=eth_address_strategy,
    )
    @settings(max_examples=100)
    def test_property_existing_address_not_overwritten(
        self,
        reviewer_id: int,
        existing_address: str,
        account_address: str,
    ):
        """
        **Property: 已有 reviewer_address 不被覆盖**
        
        验证如果 reviewer_address 已有值，迁移不会覆盖它
        
        **Validates: Requirements 2.3**
        """
        # Arrange
        kyc = MockUserKyc(
            id=1,
            wallet_address="0x" + "a" * 40,
            reviewer_id=reviewer_id,
            reviewer_address=existing_address,  # 已有值
        )
        account_map = {reviewer_id: account_address}
        
        # Act
        updated_kyc, migrated, error = migrate_reviewer_address(kyc, account_map)
        
        # Assert
        assert migrated is False
        assert updated_kyc.reviewer_address == existing_address  # 保持不变
    
    @given(
        reviewer_id=account_id_strategy,
    )
    @settings(max_examples=100)
    def test_property_missing_account_returns_error(
        self,
        reviewer_id: int,
    ):
        """
        **Property: Account 不存在时返回错误**
        
        验证如果 reviewer_id 对应的 Account 不存在，返回错误信息
        
        **Validates: Requirements 2.4**
        """
        # Arrange
        kyc = MockUserKyc(
            id=1,
            wallet_address="0x" + "a" * 40,
            reviewer_id=reviewer_id,
            reviewer_address=None,
        )
        account_map = {}  # 空映射，Account 不存在
        
        # Act
        updated_kyc, migrated, error = migrate_reviewer_address(kyc, account_map)
        
        # Assert
        assert migrated is False
        assert error is not None
        assert "not found" in error.lower()
        assert updated_kyc.reviewer_address is None  # 未修改
    
    @given(
        wallet_address=eth_address_strategy,
    )
    @settings(max_examples=100)
    def test_property_null_reviewer_id_skipped(
        self,
        wallet_address: str,
    ):
        """
        **Property: reviewer_id 为空时跳过迁移**
        
        验证如果 reviewer_id 为 None，不执行迁移
        
        **Validates: Requirements 2.3**
        """
        # Arrange
        kyc = MockUserKyc(
            id=1,
            wallet_address=wallet_address,
            reviewer_id=None,  # 无 reviewer_id
            reviewer_address=None,
        )
        account_map = {1: "0x" + "b" * 40}
        
        # Act
        updated_kyc, migrated, error = migrate_reviewer_address(kyc, account_map)
        
        # Assert
        assert migrated is False
        assert error is None
        assert updated_kyc.reviewer_address is None
    
    @given(
        reviewer_id=optional_reviewer_id_strategy,
        reviewer_address=optional_reviewer_address_strategy,
    )
    @settings(max_examples=200)
    def test_property_should_migrate_logic(
        self,
        reviewer_id: Optional[int],
        reviewer_address: Optional[str],
    ):
        """
        **Property: should_migrate 逻辑正确性**
        
        验证 should_migrate 函数的判断逻辑:
        - reviewer_id 有值 且 reviewer_address 为空或 None 时返回 True
        - 其他情况返回 False
        
        **Validates: Requirements 2.3**
        """
        # Arrange
        kyc = MockUserKyc(
            id=1,
            wallet_address="0x" + "a" * 40,
            reviewer_id=reviewer_id,
            reviewer_address=reviewer_address,
        )
        
        # Act
        result = should_migrate(kyc)
        
        # Assert
        expected = (
            reviewer_id is not None
            and (reviewer_address is None or reviewer_address.strip() == "")
        )
        assert result == expected
    
    @given(
        reviewer_id=account_id_strategy,
        account_address=eth_address_strategy,
    )
    @settings(max_examples=100)
    def test_property_address_normalized_to_lowercase(
        self,
        reviewer_id: int,
        account_address: str,
    ):
        """
        **Property: 地址规范化为小写**
        
        验证迁移后的 reviewer_address 总是小写
        
        **Validates: Requirements 2.3**
        """
        # Arrange - 使用混合大小写地址
        mixed_case_address = account_address[:22].upper() + account_address[22:].lower()
        kyc = MockUserKyc(
            id=1,
            wallet_address="0x" + "a" * 40,
            reviewer_id=reviewer_id,
            reviewer_address=None,
        )
        account_map = {reviewer_id: mixed_case_address}
        
        # Act
        updated_kyc, migrated, error = migrate_reviewer_address(kyc, account_map)
        
        # Assert
        assert migrated is True
        assert updated_kyc.reviewer_address == mixed_case_address.lower()
        assert updated_kyc.reviewer_address == updated_kyc.reviewer_address.lower()


class TestUserKycMigrationEdgeCases:
    """UserKyc 迁移边界情况测试"""
    
    def test_empty_string_reviewer_address_triggers_migration(self):
        """空字符串 reviewer_address 应触发迁移"""
        kyc = MockUserKyc(
            id=1,
            wallet_address="0x" + "a" * 40,
            reviewer_id=123,
            reviewer_address="",  # 空字符串
        )
        account_map = {123: "0x" + "b" * 40}
        
        updated_kyc, migrated, error = migrate_reviewer_address(kyc, account_map)
        
        assert migrated is True
        assert updated_kyc.reviewer_address == "0x" + "b" * 40
    
    def test_whitespace_reviewer_address_triggers_migration(self):
        """空白字符 reviewer_address 应触发迁移"""
        kyc = MockUserKyc(
            id=1,
            wallet_address="0x" + "a" * 40,
            reviewer_id=123,
            reviewer_address="   ",  # 空白字符
        )
        account_map = {123: "0x" + "b" * 40}
        
        # 注意: 当前实现只检查 strip() == ""
        result = should_migrate(kyc)
        assert result is True
