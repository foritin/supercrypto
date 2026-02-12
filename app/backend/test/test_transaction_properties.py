"""
事务原子性属性测试

Feature: full-stack-review-fixes

验证:
- Property 8: 多步写操作原子性 — 认购创建操作中间步骤失败时，所有已执行步骤应被回滚
"""

import asyncio
from decimal import Decimal
from unittest.mock import patch

import pytest
from hypothesis import given, settings, strategies as st
from tortoise import Tortoise
from tortoise.transactions import in_transaction

from src.models import Asset, Subscription
from src.shared.schemas.enums import (
    AssetStatus,
    AssetType,
    SubscriptionStatus,
    TokenType,
)


# ============================================================
# 辅助函数 — 异步测试运行器
# ============================================================


def run_async(coro):
    """在同步上下文中运行异步协程"""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


# ============================================================
# Hypothesis 策略 — 生成测试数据
# ============================================================

# 资产名称策略
asset_name_strategy = st.text(
    alphabet=st.characters(whitelist_categories=("L", "N")),
    min_size=1,
    max_size=20,
).map(lambda s: f"Asset_{s}")

# 代币符号策略
symbol_strategy = st.text(
    alphabet=st.characters(whitelist_categories=("Lu",)),
    min_size=2,
    max_size=8,
)

# 认购金额策略 — 确保不超过总供应量
amount_strategy = st.decimals(
    min_value=Decimal("100"),
    max_value=Decimal("500000"),
    places=2,
    allow_nan=False,
    allow_infinity=False,
)

# 总供应量策略 — 足够大以容纳认购金额
total_supply_strategy = st.decimals(
    min_value=Decimal("1000000"),
    max_value=Decimal("10000000"),
    places=2,
    allow_nan=False,
    allow_infinity=False,
)

# 锁定期策略
lock_period_strategy = st.sampled_from([0, 3, 6, 12])

# APY 策略
apy_strategy = st.decimals(
    min_value=Decimal("1"),
    max_value=Decimal("30"),
    places=2,
    allow_nan=False,
    allow_infinity=False,
)

# 钱包地址策略
wallet_address_strategy = st.from_regex(r"0x[0-9a-f]{40}", fullmatch=True)

# 交易哈希策略
tx_hash_strategy = st.from_regex(r"0x[0-9a-f]{64}", fullmatch=True)


# ============================================================
# 测试基类 — SQLite 内存数据库初始化
# ============================================================


class TransactionPropertyTestBase:
    """事务属性测试基类，提供 SQLite 内存数据库 fixture"""

    @pytest.fixture(autouse=True)
    def setup_db(self):
        """初始化 SQLite 内存数据库"""

        async def init():
            await Tortoise.init(
                db_url="sqlite://:memory:",
                modules={"models": ["src.models"]},
            )
            await Tortoise.generate_schemas()

        async def cleanup():
            await Tortoise.close_connections()

        run_async(init())
        yield
        run_async(cleanup())


# ============================================================
# Property 8: 多步写操作原子性
# ============================================================


class TestTransactionAtomicity(TransactionPropertyTestBase):
    """Feature: full-stack-review-fixes — 多步写操作原子性"""

    @settings(max_examples=100)
    @given(
        asset_name=asset_name_strategy,
        symbol=symbol_strategy,
        wallet_address=wallet_address_strategy,
        amount=amount_strategy,
        total_supply=total_supply_strategy,
        lock_period=lock_period_strategy,
        apy=apy_strategy,
        tx_hash=tx_hash_strategy,
    )
    def test_property_8_transaction_rollback_on_failure(
        self,
        asset_name: str,
        symbol: str,
        wallet_address: str,
        amount: Decimal,
        total_supply: Decimal,
        lock_period: int,
        apy: Decimal,
        tx_hash: str,
    ):
        """Property 8: 多步写操作原子性

        **Validates: Requirements 2.4**

        属性: 对于任意认购创建操作，如果中间步骤（如更新资产供应量）失败，
        则所有已执行的步骤（如认购记录创建）应被回滚，
        数据库状态应与操作前一致。
        """

        async def run_test():
            # Arrange: 创建 Asset，记录初始状态
            asset = await Asset.create(
                name=asset_name,
                symbol=symbol,
                asset_type=AssetType.REAL_ESTATE,
                status=AssetStatus.ACTIVE,
                total_supply=total_supply,
                subscribed_amount=Decimal("0"),
                environment="hardhat",
            )
            asset_id = asset.id
            initial_subscribed = asset.subscribed_amount

            # 记录操作前的 Subscription 数量
            sub_count_before = await Subscription.filter(
                wallet_address=wallet_address, environment="hardhat"
            ).count()

            # Act: 在事务中执行多步操作，第二步故意抛出异常
            with pytest.raises(RuntimeError, match="模拟更新供应量失败"):
                async with in_transaction() as conn:
                    # 步骤 1: 创建认购记录（应被回滚）
                    await Subscription.create(
                        wallet_address=wallet_address,
                        asset=asset,
                        amount=amount,
                        token_type=TokenType.USDT,
                        lock_period=lock_period,
                        apy=apy,
                        status=SubscriptionStatus.ACTIVE,
                        tx_hash=tx_hash,
                        environment="hardhat",
                        using_db=conn,
                    )

                    # 步骤 2: 模拟更新资产供应量失败
                    raise RuntimeError("模拟更新供应量失败")

            # Assert: 认购记录应被回滚 — 数量不变
            sub_count_after = await Subscription.filter(
                wallet_address=wallet_address, environment="hardhat"
            ).count()
            assert sub_count_after == sub_count_before, (
                f"事务回滚后 Subscription 数量应不变: "
                f"期望 {sub_count_before}，实际 {sub_count_after}"
            )

            # Assert: 资产供应量应保持不变
            asset_after = await Asset.get(id=asset_id)
            assert asset_after.subscribed_amount == initial_subscribed, (
                f"事务回滚后 subscribed_amount 应不变: "
                f"期望 {initial_subscribed}，实际 {asset_after.subscribed_amount}"
            )

            # 清理
            await asset.delete()

        run_async(run_test())

    @settings(max_examples=100)
    @given(
        asset_name=asset_name_strategy,
        symbol=symbol_strategy,
        wallet_address=wallet_address_strategy,
        amount=amount_strategy,
        total_supply=total_supply_strategy,
        lock_period=lock_period_strategy,
        apy=apy_strategy,
        tx_hash=tx_hash_strategy,
    )
    def test_property_8_successful_transaction_commits_all_steps(
        self,
        asset_name: str,
        symbol: str,
        wallet_address: str,
        amount: Decimal,
        total_supply: Decimal,
        lock_period: int,
        apy: Decimal,
        tx_hash: str,
    ):
        """Property 8 补充: 成功事务提交所有步骤

        **Validates: Requirements 2.4**

        属性: 对于任意认购创建操作，如果所有步骤成功完成，
        则认购记录和资产供应量更新应同时生效。
        """

        async def run_test():
            # Arrange: 创建 Asset
            asset = await Asset.create(
                name=asset_name,
                symbol=symbol,
                asset_type=AssetType.REAL_ESTATE,
                status=AssetStatus.ACTIVE,
                total_supply=total_supply,
                subscribed_amount=Decimal("0"),
                environment="hardhat",
            )
            asset_id = asset.id

            # Act: 在事务中执行多步操作，全部成功
            async with in_transaction() as conn:
                # 步骤 1: 创建认购记录
                subscription = await Subscription.create(
                    wallet_address=wallet_address,
                    asset=asset,
                    amount=amount,
                    token_type=TokenType.USDT,
                    lock_period=lock_period,
                    apy=apy,
                    status=SubscriptionStatus.ACTIVE,
                    tx_hash=tx_hash,
                    environment="hardhat",
                    using_db=conn,
                )

                # 步骤 2: 更新资产供应量
                asset.subscribed_amount += amount
                await asset.save(using_db=conn)

            # Assert: 认购记录应存在
            saved_sub = await Subscription.get_or_none(id=subscription.id)
            assert saved_sub is not None, "成功事务后 Subscription 应存在"
            assert saved_sub.amount == amount, "Subscription 金额应正确"
            assert saved_sub.wallet_address == wallet_address

            # Assert: 资产供应量应已更新
            asset_after = await Asset.get(id=asset_id)
            assert asset_after.subscribed_amount == amount, (
                f"成功事务后 subscribed_amount 应为 {amount}，"
                f"实际为 {asset_after.subscribed_amount}"
            )

            # 清理: 先删除 Subscription（RESTRICT 外键），再删除 Asset
            await saved_sub.delete()
            await asset_after.delete()

        run_async(run_test())

    @settings(max_examples=100)
    @given(
        asset_name=asset_name_strategy,
        symbol=symbol_strategy,
        wallet_address=wallet_address_strategy,
        amount=amount_strategy,
        total_supply=total_supply_strategy,
        lock_period=lock_period_strategy,
        apy=apy_strategy,
        tx_hash=tx_hash_strategy,
    )
    def test_property_8_partial_failure_no_orphan_records(
        self,
        asset_name: str,
        symbol: str,
        wallet_address: str,
        amount: Decimal,
        total_supply: Decimal,
        lock_period: int,
        apy: Decimal,
        tx_hash: str,
    ):
        """Property 8 补充: 部分失败不产生孤立记录

        **Validates: Requirements 2.4**

        属性: 当事务中第二步失败时，不应存在没有对应供应量更新的认购记录
        （即不产生孤立的 Subscription 记录）。
        """

        async def run_test():
            # Arrange: 创建 Asset
            asset = await Asset.create(
                name=asset_name,
                symbol=symbol,
                asset_type=AssetType.REAL_ESTATE,
                status=AssetStatus.ACTIVE,
                total_supply=total_supply,
                subscribed_amount=Decimal("0"),
                environment="hardhat",
            )

            # Act: 事务中第一步成功，第二步失败
            with pytest.raises(ValueError, match="供应量更新异常"):
                async with in_transaction() as conn:
                    # 步骤 1: 创建认购记录
                    await Subscription.create(
                        wallet_address=wallet_address,
                        asset=asset,
                        amount=amount,
                        token_type=TokenType.USDT,
                        lock_period=lock_period,
                        apy=apy,
                        status=SubscriptionStatus.ACTIVE,
                        tx_hash=tx_hash,
                        environment="hardhat",
                        using_db=conn,
                    )

                    # 步骤 2: 模拟供应量更新异常
                    raise ValueError("供应量更新异常")

            # Assert: 不应存在该 tx_hash 的认购记录（孤立记录）
            orphan = await Subscription.filter(
                tx_hash=tx_hash, environment="hardhat"
            ).first()
            assert orphan is None, (
                f"事务回滚后不应存在 tx_hash={tx_hash} 的孤立 Subscription 记录"
            )

            # Assert: 资产供应量保持为 0
            asset_after = await Asset.get(id=asset.id)
            assert asset_after.subscribed_amount == Decimal("0"), (
                "事务回滚后 subscribed_amount 应保持为 0"
            )

            # 清理
            await asset.delete()

        run_async(run_test())
