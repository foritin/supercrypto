"""
外键策略属性测试

Feature: full-stack-review-fixes

验证:
- Property 6: RESTRICT 外键阻止级联删除 — 存在 Subscription 时删除 Asset 应抛出 IntegrityError
- Property 7: SET_NULL 外键保留子记录 — 删除父记录后子记录保留且外键字段设为 NULL
"""

import asyncio
from decimal import Decimal

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st
from tortoise import Tortoise
from tortoise.exceptions import IntegrityError

from src.models import (
    Asset,
    AssetPriceHistory,
    ContractConfig,
    ContractDeployment,
    Subscription,
)
from src.schemas.enums import (
    AssetStatus,
    AssetType,
    ContractScope,
    ContractStatus,
    ContractType,
    Network,
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

# 认购金额策略
amount_strategy = st.decimals(
    min_value=Decimal("100"),
    max_value=Decimal("1000000"),
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

# 价格策略
price_strategy = st.decimals(
    min_value=Decimal("0.01"),
    max_value=Decimal("999999"),
    places=2,
    allow_nan=False,
    allow_infinity=False,
)

# 钱包地址策略
wallet_address_strategy = st.from_regex(r"0x[0-9a-f]{40}", fullmatch=True)

# 合约名称策略
contract_name_strategy = st.text(
    alphabet=st.characters(whitelist_categories=("L", "N")),
    min_size=3,
    max_size=30,
).map(lambda s: f"Contract_{s}")

# 项目名称策略
project_name_strategy = st.sampled_from(
    ["common", "fake", "mock", "vanke", "test_proj"]
)

# 合约地址策略
contract_address_strategy = st.from_regex(r"0x[0-9a-f]{40}", fullmatch=True)

# 交易哈希策略
tx_hash_strategy = st.from_regex(r"0x[0-9a-f]{64}", fullmatch=True)


# ============================================================
# 测试基类 — SQLite 内存数据库初始化
# ============================================================


class FKPropertyTestBase:
    """外键属性测试基类，提供 SQLite 内存数据库 fixture"""

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
# Property 6: RESTRICT 外键阻止级联删除
# ============================================================


class TestRestrictForeignKey(FKPropertyTestBase):
    """Feature: full-stack-review-fixes — RESTRICT 外键阻止级联删除"""

    @settings(max_examples=100)
    @given(
        asset_name=asset_name_strategy,
        symbol=symbol_strategy,
        wallet_address=wallet_address_strategy,
        amount=amount_strategy,
        lock_period=lock_period_strategy,
        apy=apy_strategy,
        tx_hash=tx_hash_strategy,
    )
    def test_property_6_restrict_fk_prevents_cascade_delete(
        self,
        asset_name: str,
        symbol: str,
        wallet_address: str,
        amount: Decimal,
        lock_period: int,
        apy: Decimal,
        tx_hash: str,
    ):
        """Property 6: RESTRICT 外键阻止级联删除

        **Validates: Requirements 2.1**

        属性: 对于任意 Asset，如果存在关联的 Subscription 记录，
        则删除该 Asset 应抛出 IntegrityError，且 Subscription 记录保持不变。
        """

        async def run_test():
            # Arrange: 创建 Asset
            asset = await Asset.create(
                name=asset_name,
                symbol=symbol,
                asset_type=AssetType.REAL_ESTATE,
                status=AssetStatus.ACTIVE,
                total_supply=Decimal("10000000"),
                environment="hardhat",
            )

            # Arrange: 创建关联的 Subscription
            subscription = await Subscription.create(
                wallet_address=wallet_address,
                asset=asset,
                amount=amount,
                token_type=TokenType.USDT,
                lock_period=lock_period,
                apy=apy,
                status=SubscriptionStatus.PENDING,
                tx_hash=tx_hash,
                environment="hardhat",
            )
            subscription_id = subscription.id

            # Act & Assert: 删除 Asset 应抛出 IntegrityError
            with pytest.raises(IntegrityError):
                await asset.delete()

            # Assert: Subscription 记录保持不变
            preserved = await Subscription.get_or_none(id=subscription_id)
            assert preserved is not None, "Subscription 记录不应被删除"
            assert preserved.asset_id == asset.id, "Subscription 的 asset_id 不应改变"
            assert preserved.amount == amount, "Subscription 的 amount 不应改变"

            # Assert: Asset 也应保持不变（删除被阻止）
            asset_still_exists = await Asset.get_or_none(id=asset.id)
            assert asset_still_exists is not None, "Asset 不应被删除（RESTRICT 阻止）"

            # 清理: 先删除 Subscription，再删除 Asset
            await subscription.delete()
            await asset.delete()

        run_async(run_test())

    @settings(max_examples=100)
    @given(
        asset_name=asset_name_strategy,
        symbol=symbol_strategy,
    )
    def test_property_6_asset_without_subscriptions_can_be_deleted(
        self,
        asset_name: str,
        symbol: str,
    ):
        """Property 6 补充: 无关联 Subscription 的 Asset 可以正常删除

        **Validates: Requirements 2.1**

        属性: 如果 Asset 没有关联的 Subscription 记录，
        则删除该 Asset 应成功。
        """

        async def run_test():
            # Arrange: 创建 Asset（无 Subscription）
            asset = await Asset.create(
                name=asset_name,
                symbol=symbol,
                asset_type=AssetType.REAL_ESTATE,
                status=AssetStatus.ACTIVE,
                total_supply=Decimal("10000000"),
                environment="hardhat",
            )
            asset_id = asset.id

            # Act: 删除 Asset 应成功
            await asset.delete()

            # Assert: Asset 已被删除
            deleted = await Asset.get_or_none(id=asset_id)
            assert deleted is None, "无关联 Subscription 的 Asset 应可正常删除"

        run_async(run_test())


# ============================================================
# Property 7: SET_NULL 外键保留子记录
# ============================================================


class TestSetNullForeignKey(FKPropertyTestBase):
    """Feature: full-stack-review-fixes — SET_NULL 外键保留子记录"""

    @settings(max_examples=100)
    @given(
        asset_name=asset_name_strategy,
        symbol=symbol_strategy,
        price=price_strategy,
        source=st.sampled_from(["oracle", "manual", "chainlink", "api"]),
    )
    def test_property_7_set_null_preserves_price_history(
        self,
        asset_name: str,
        symbol: str,
        price: Decimal,
        source: str,
    ):
        """Property 7: SET_NULL 外键保留子记录 (AssetPriceHistory)

        **Validates: Requirements 2.2**

        属性: 对于任意 Asset，如果存在关联的 AssetPriceHistory 记录，
        删除 Asset 后 AssetPriceHistory 记录应保留且 asset_id 设为 NULL。
        """

        async def run_test():
            # Arrange: 创建 Asset
            asset = await Asset.create(
                name=asset_name,
                symbol=symbol,
                asset_type=AssetType.REAL_ESTATE,
                status=AssetStatus.ACTIVE,
                total_supply=Decimal("10000000"),
                environment="hardhat",
            )

            # Arrange: 创建关联的 AssetPriceHistory
            history = await AssetPriceHistory.create(
                asset=asset,
                price=price,
                source=source,
            )
            history_id = history.id

            # Act: 删除 Asset
            await asset.delete()

            # Assert: AssetPriceHistory 记录保留
            preserved = await AssetPriceHistory.get_or_none(id=history_id)
            assert preserved is not None, "AssetPriceHistory 记录应被保留"

            # Assert: 外键字段设为 NULL
            assert preserved.asset_id is None, (
                f"AssetPriceHistory.asset_id 应为 NULL，实际为 {preserved.asset_id}"
            )

            # Assert: 其他字段保持不变
            assert preserved.price == price, "价格数据不应改变"
            assert preserved.source == source, "来源数据不应改变"

            # 清理
            await preserved.delete()

        run_async(run_test())

    @settings(max_examples=100)
    @given(
        contract_name=contract_name_strategy,
        project_name=project_name_strategy,
        deploy_name=st.text(
            alphabet=st.characters(whitelist_categories=("L", "N")),
            min_size=3,
            max_size=30,
        ).map(lambda s: f"Deploy_{s}"),
        deploy_address=contract_address_strategy,
        deployer_address=wallet_address_strategy,
        tx_hash=tx_hash_strategy,
        chain_id=st.sampled_from([1, 11155111, 31337]),
    )
    def test_property_7_set_null_preserves_contract_deployment(
        self,
        contract_name: str,
        project_name: str,
        deploy_name: str,
        deploy_address: str,
        deployer_address: str,
        tx_hash: str,
        chain_id: int,
    ):
        """Property 7: SET_NULL 外键保留子记录 (ContractDeployment)

        **Validates: Requirements 2.3**

        属性: 对于任意 ContractConfig，如果存在关联的 ContractDeployment 记录，
        删除 ContractConfig 后 ContractDeployment 记录应保留且 config_id 设为 NULL。
        """

        async def run_test():
            # Arrange: 创建 ContractConfig
            config = await ContractConfig.create(
                contract_name=contract_name,
                project_name=project_name,
                deploy_order=1,
            )

            # Arrange: 创建关联的 ContractDeployment
            deployment = await ContractDeployment.create(
                config=config,
                name=deploy_name,
                address=deploy_address,
                deployer_address=deployer_address,
                network=Network.HARDHAT,
                chain_id=chain_id,
                scope=ContractScope.GLOBAL,
                contract_type=ContractType.UNKNOWN,
                project_name=project_name,
                tx_hash=tx_hash,
                status=ContractStatus.ACTIVE,
            )
            deployment_id = deployment.id

            # Act: 删除 ContractConfig
            await config.delete()

            # Assert: ContractDeployment 记录保留
            preserved = await ContractDeployment.get_or_none(id=deployment_id)
            assert preserved is not None, "ContractDeployment 记录应被保留"

            # Assert: 外键字段设为 NULL
            assert preserved.config_id is None, (
                f"ContractDeployment.config_id 应为 NULL，实际为 {preserved.config_id}"
            )

            # Assert: 其他字段保持不变
            assert preserved.name == deploy_name, "部署名称不应改变"
            assert preserved.address == deploy_address, "合约地址不应改变"
            assert preserved.deployer_address == deployer_address, "部署者地址不应改变"
            assert preserved.tx_hash == tx_hash, "交易哈希不应改变"

            # 清理
            await preserved.delete()

        run_async(run_test())
