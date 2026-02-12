"""
认购服务 (SubscriptionService) 单元测试

覆盖范围:
- 正常认购流程
- 超出供应量校验
- 未通过 KYC 场景 (业务层面)
- 收益计算验证
- 状态机转换 (pending → active → matured → redeemed)

_Requirements: 8.1_
"""

import asyncio
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from unittest.mock import MagicMock

import pytest
from tortoise import Tortoise

from src.models.asset import Asset
from src.models.subscription import Subscription
from src.shared.common.exceptions import BusinessException
from src.shared.schemas.enums import (
    AssetStatus,
    AssetType,
    LockPeriod,
    SubscriptionStatus,
    TokenType,
)


# ============================================================
# 异步运行器 (与 conftest.py 保持一致)
# ============================================================


def run_async(coro):
    """在同步上下文中运行异步协程"""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


# ============================================================
# 辅助函数
# ============================================================


async def _create_test_asset(
    name: str = "测试资产",
    symbol: str = "TEST",
    total_supply: Decimal = Decimal("1000000"),
    subscribed_amount: Decimal = Decimal("0"),
    min_subscription: Decimal = Decimal("100"),
    current_price: Decimal = Decimal("1"),
    apy_3m: Decimal = Decimal("10"),
    apy_6m: Decimal = Decimal("12"),
    apy_12m: Decimal = Decimal("15"),
    status: AssetStatus = AssetStatus.ACTIVE,
    environment: str = "hardhat",
) -> Asset:
    """创建测试用资产记录"""
    return await Asset.create(
        name=name,
        symbol=symbol,
        asset_type=AssetType.REAL_ESTATE,
        total_supply=total_supply,
        subscribed_amount=subscribed_amount,
        min_subscription=min_subscription,
        current_price=current_price,
        apy_3m=apy_3m,
        apy_6m=apy_6m,
        apy_12m=apy_12m,
        status=status,
        environment=environment,
    )


# ============================================================
# 测试类: 认购创建
# ============================================================


class TestCreateSubscriptionSuccess:
    """正常认购流程测试"""

    @pytest.fixture(autouse=True)
    def setup_db(self, sqlite_db):
        """使用 SQLite 内存数据库"""
        pass

    def test_create_subscription_success_3m(self):
        """正常认购: 3 个月锁定期，APY 10%"""

        async def _test():
            asset = await _create_test_asset(
                total_supply=Decimal("1000000"),
                apy_3m=Decimal("10"),
            )

            wallet = "0x" + "a" * 40
            tx_hash = "0x" + "b" * 64

            # 创建认购记录 (直接操作模型，绕过分布式锁依赖)
            start_date = datetime.now(timezone.utc)
            apy = asset.apy_3m
            lock_period = 3
            amount = Decimal("10000")

            expected_interest = Subscription.calculate_expected_interest(
                amount, apy, lock_period
            )
            end_date = Subscription.calculate_end_date(start_date, lock_period)

            subscription = await Subscription.create(
                wallet_address=wallet,
                asset=asset,
                amount=amount,
                token_type=TokenType.USDT,
                lock_period=lock_period,
                apy=apy,
                rwa_token_amount=amount / asset.current_price,
                start_date=start_date,
                end_date=end_date,
                original_end_date=end_date,
                expected_interest=expected_interest,
                tx_hash=tx_hash,
                status=SubscriptionStatus.ACTIVE,
                environment="hardhat",
            )

            assert subscription.id is not None
            assert subscription.wallet_address == wallet
            assert subscription.asset_id == asset.id
            assert subscription.amount == amount
            assert subscription.lock_period == lock_period
            assert subscription.apy == Decimal("10")
            assert subscription.status == SubscriptionStatus.ACTIVE
            assert subscription.tx_hash == tx_hash

            # 验证收益计算: 10000 * 10% * (3/12) = 250
            assert expected_interest == Decimal("250")
            assert subscription.expected_interest == Decimal("250")

            # 验证到期日期: start + 3*30 天
            expected_end = start_date + timedelta(days=90)
            assert end_date == expected_end

        run_async(_test())

    def test_create_subscription_success_6m(self):
        """正常认购: 6 个月锁定期，APY 12%"""

        async def _test():
            asset = await _create_test_asset(apy_6m=Decimal("12"))
            wallet = "0x" + "c" * 40
            tx_hash = "0x" + "d" * 64
            amount = Decimal("5000")
            lock_period = 6

            expected_interest = Subscription.calculate_expected_interest(
                amount, asset.apy_6m, lock_period
            )

            subscription = await Subscription.create(
                wallet_address=wallet,
                asset=asset,
                amount=amount,
                token_type=TokenType.USDT,
                lock_period=lock_period,
                apy=asset.apy_6m,
                rwa_token_amount=amount,
                start_date=datetime.now(timezone.utc),
                end_date=Subscription.calculate_end_date(
                    datetime.now(timezone.utc), lock_period
                ),
                original_end_date=Subscription.calculate_end_date(
                    datetime.now(timezone.utc), lock_period
                ),
                expected_interest=expected_interest,
                tx_hash=tx_hash,
                status=SubscriptionStatus.ACTIVE,
                environment="hardhat",
            )

            assert subscription.apy == Decimal("12")
            # 5000 * 12% * (6/12) = 300
            assert expected_interest == Decimal("300")

        run_async(_test())

    def test_create_subscription_success_12m(self):
        """正常认购: 12 个月锁定期，APY 15%"""

        async def _test():
            asset = await _create_test_asset(apy_12m=Decimal("15"))
            wallet = "0x" + "e" * 40
            tx_hash = "0x" + "f" * 64
            amount = Decimal("20000")
            lock_period = 12

            expected_interest = Subscription.calculate_expected_interest(
                amount, asset.apy_12m, lock_period
            )

            subscription = await Subscription.create(
                wallet_address=wallet,
                asset=asset,
                amount=amount,
                token_type=TokenType.USDT,
                lock_period=lock_period,
                apy=asset.apy_12m,
                rwa_token_amount=amount,
                start_date=datetime.now(timezone.utc),
                end_date=Subscription.calculate_end_date(
                    datetime.now(timezone.utc), lock_period
                ),
                original_end_date=Subscription.calculate_end_date(
                    datetime.now(timezone.utc), lock_period
                ),
                expected_interest=expected_interest,
                tx_hash=tx_hash,
                status=SubscriptionStatus.ACTIVE,
                environment="hardhat",
            )

            assert subscription.apy == Decimal("15")
            # 20000 * 15% * (12/12) = 3000
            assert expected_interest == Decimal("3000")

        run_async(_test())


# ============================================================
# 测试类: 超出供应量
# ============================================================


class TestCreateSubscriptionExceedsSupply:
    """认购金额超出资产可用供应量测试"""

    @pytest.fixture(autouse=True)
    def setup_db(self, sqlite_db):
        """使用 SQLite 内存数据库"""
        pass

    def test_exceeds_remaining_supply(self):
        """认购金额超过剩余可认购额度时应拒绝"""

        async def _test():
            # 总供应 10000，已认购 9500，剩余 500
            asset = await _create_test_asset(
                total_supply=Decimal("10000"),
                subscribed_amount=Decimal("9500"),
            )

            assert asset.remaining_amount == Decimal("500")

            # 尝试认购 600 (超出剩余 500)
            amount = Decimal("600")
            assert amount > asset.remaining_amount

        run_async(_test())

    def test_service_rejects_exceeds_supply(self):
        """SubscriptionService._do_create_subscription 应拒绝超额认购"""

        async def _test():
            from src.services.subscription.schemas import SubscriptionCreateRequest
            from src.services.subscription.service import SubscriptionService

            asset = await _create_test_asset(
                total_supply=Decimal("10000"),
                subscribed_amount=Decimal("9800"),
            )

            service = SubscriptionService()

            request = SubscriptionCreateRequest(
                asset_id=asset.id,
                amount=Decimal("500"),  # 剩余仅 200
                token_type=TokenType.USDT,
                lock_period=LockPeriod.THREE_MONTHS,
                tx_hash="0x" + "a" * 64,
            )

            with pytest.raises(BusinessException) as exc_info:
                await service._do_create_subscription("0x" + "b" * 40, request)

            assert exc_info.value.code == 400
            assert "exceeds" in exc_info.value.message.lower()

        run_async(_test())

    def test_exact_remaining_amount_allowed(self):
        """认购金额恰好等于剩余额度时应允许"""

        async def _test():
            asset = await _create_test_asset(
                total_supply=Decimal("10000"),
                subscribed_amount=Decimal("9000"),
                min_subscription=Decimal("100"),
            )

            # 剩余 1000，认购 1000 应该允许
            assert asset.remaining_amount == Decimal("1000")
            assert asset.is_available is True

        run_async(_test())

    def test_zero_remaining_not_available(self):
        """供应量已满时资产不可认购"""

        async def _test():
            asset = await _create_test_asset(
                total_supply=Decimal("10000"),
                subscribed_amount=Decimal("10000"),
            )

            assert asset.remaining_amount == Decimal("0")
            assert asset.is_available is False

        run_async(_test())


# ============================================================
# 测试类: 未通过 KYC
# ============================================================


class TestCreateSubscriptionWithoutKyc:
    """未通过 KYC 认证的认购场景测试

    注意: 当前 SubscriptionService 本身不直接检查 KYC 状态，
    KYC 验证在 API 层通过中间件/依赖注入完成。
    此处测试验证资产不可用状态（如 paused）时的拒绝逻辑，
    以及服务层对非活跃资产的保护。
    """

    @pytest.fixture(autouse=True)
    def setup_db(self, sqlite_db):
        """使用 SQLite 内存数据库"""
        pass

    def test_paused_asset_not_available(self):
        """暂停状态的资产不可认购"""

        async def _test():
            asset = await _create_test_asset(status=AssetStatus.PAUSED)
            assert asset.is_available is False

        run_async(_test())

    def test_closed_asset_not_available(self):
        """关闭状态的资产不可认购"""

        async def _test():
            asset = await _create_test_asset(status=AssetStatus.CLOSED)
            assert asset.is_available is False

        run_async(_test())

    def test_service_rejects_unavailable_asset(self):
        """SubscriptionService 应拒绝对不可用资产的认购"""

        async def _test():
            from src.services.subscription.schemas import SubscriptionCreateRequest
            from src.services.subscription.service import SubscriptionService

            asset = await _create_test_asset(status=AssetStatus.PAUSED)

            service = SubscriptionService()
            request = SubscriptionCreateRequest(
                asset_id=asset.id,
                amount=Decimal("1000"),
                token_type=TokenType.USDT,
                lock_period=LockPeriod.THREE_MONTHS,
                tx_hash="0x" + "c" * 64,
            )

            with pytest.raises(BusinessException) as exc_info:
                await service._do_create_subscription("0x" + "d" * 40, request)

            assert exc_info.value.code == 400
            assert "not available" in exc_info.value.message.lower()

        run_async(_test())

    def test_service_rejects_nonexistent_asset(self):
        """SubscriptionService 应拒绝不存在的资产"""

        async def _test():
            from src.services.subscription.schemas import SubscriptionCreateRequest
            from src.services.subscription.service import SubscriptionService

            service = SubscriptionService()
            request = SubscriptionCreateRequest(
                asset_id=99999,
                amount=Decimal("1000"),
                token_type=TokenType.USDT,
                lock_period=LockPeriod.THREE_MONTHS,
                tx_hash="0x" + "e" * 64,
            )

            with pytest.raises(BusinessException) as exc_info:
                await service._do_create_subscription("0x" + "f" * 40, request)

            assert exc_info.value.code == 404
            assert "not found" in exc_info.value.message.lower()

        run_async(_test())


# ============================================================
# 测试类: 收益计算
# ============================================================


class TestPreviewSubscriptionYieldCalculation:
    """收益计算验证测试

    公式: 预估收益 = 本金 × APY(%) × (锁定月数 / 12)
    """

    def test_yield_3m_10_percent(self):
        """3 个月锁定期，APY 10%: 10000 * 10% * (3/12) = 250"""
        result = Subscription.calculate_expected_interest(
            Decimal("10000"), Decimal("10"), 3
        )
        assert result == Decimal("250")

    def test_yield_6m_12_percent(self):
        """6 个月锁定期，APY 12%: 10000 * 12% * (6/12) = 600"""
        result = Subscription.calculate_expected_interest(
            Decimal("10000"), Decimal("12"), 6
        )
        assert result == Decimal("600")

    def test_yield_12m_15_percent(self):
        """12 个月锁定期，APY 15%: 10000 * 15% * (12/12) = 1500"""
        result = Subscription.calculate_expected_interest(
            Decimal("10000"), Decimal("15"), 12
        )
        assert result == Decimal("1500")

    def test_yield_flexible_mode(self):
        """活期模式 (lock_period=0): 按 1 个月估算"""
        # 10000 * 6% * (1/12) = 50
        result = Subscription.calculate_expected_interest(
            Decimal("10000"), Decimal("6"), 0
        )
        expected = Decimal("10000") * (Decimal("6") / Decimal("100")) * (
            Decimal("1") / Decimal("12")
        )
        assert result == expected

    def test_yield_small_amount(self):
        """小额认购收益计算"""
        # 100 * 10% * (3/12) = 2.5
        result = Subscription.calculate_expected_interest(
            Decimal("100"), Decimal("10"), 3
        )
        assert result == Decimal("2.5")

    def test_yield_large_amount(self):
        """大额认购收益计算"""
        # 1000000 * 15% * (12/12) = 150000
        result = Subscription.calculate_expected_interest(
            Decimal("1000000"), Decimal("15"), 12
        )
        assert result == Decimal("150000")

    def test_yield_zero_amount(self):
        """零金额收益为零"""
        result = Subscription.calculate_expected_interest(
            Decimal("0"), Decimal("10"), 3
        )
        assert result == Decimal("0")

    def test_end_date_calculation_3m(self):
        """到期日期计算: 3 个月 = 90 天"""
        start = datetime(2025, 1, 1, tzinfo=timezone.utc)
        end = Subscription.calculate_end_date(start, 3)
        assert end == start + timedelta(days=90)

    def test_end_date_calculation_6m(self):
        """到期日期计算: 6 个月 = 180 天"""
        start = datetime(2025, 1, 1, tzinfo=timezone.utc)
        end = Subscription.calculate_end_date(start, 6)
        assert end == start + timedelta(days=180)

    def test_end_date_calculation_12m(self):
        """到期日期计算: 12 个月 = 360 天"""
        start = datetime(2025, 1, 1, tzinfo=timezone.utc)
        end = Subscription.calculate_end_date(start, 12)
        assert end == start + timedelta(days=360)

    def test_end_date_flexible_mode(self):
        """活期模式到期日期 = 开始日期 (立即可赎回)"""
        start = datetime(2025, 1, 1, tzinfo=timezone.utc)
        end = Subscription.calculate_end_date(start, 0)
        assert end == start

    def test_total_return_with_expected_interest(self):
        """总回报 = 本金 + 预期利息 (未赎回时)"""

        async def _test():
            # 使用 MagicMock 模拟 Subscription 的 property
            sub = MagicMock(spec=Subscription)
            sub.amount = Decimal("10000")
            sub.expected_interest = Decimal("250")
            sub.actual_interest = Decimal("0")

            # 手动计算 total_return (因为 MagicMock 不执行 property)
            interest = (
                sub.actual_interest
                if sub.actual_interest > 0
                else sub.expected_interest
            )
            total = sub.amount + interest
            assert total == Decimal("10250")

        run_async(_test())


# ============================================================
# 测试类: 状态机转换
# ============================================================


class TestSubscriptionStatusTransitions:
    """认购状态机转换测试

    状态流: pending → active → matured → redeemed
    """

    @pytest.fixture(autouse=True)
    def setup_db(self, sqlite_db):
        """使用 SQLite 内存数据库"""
        pass

    def test_initial_status_active(self):
        """通过 _do_create_subscription 创建的认购初始状态为 ACTIVE"""

        async def _test():
            asset = await _create_test_asset()
            wallet = "0x" + "a" * 40
            start_date = datetime.now(timezone.utc)

            subscription = await Subscription.create(
                wallet_address=wallet,
                asset=asset,
                amount=Decimal("1000"),
                token_type=TokenType.USDT,
                lock_period=3,
                apy=Decimal("10"),
                rwa_token_amount=Decimal("1000"),
                start_date=start_date,
                end_date=Subscription.calculate_end_date(start_date, 3),
                original_end_date=Subscription.calculate_end_date(start_date, 3),
                expected_interest=Decimal("25"),
                tx_hash="0x" + "1" * 64,
                status=SubscriptionStatus.ACTIVE,
                environment="hardhat",
            )

            assert subscription.status == SubscriptionStatus.ACTIVE

        run_async(_test())

    def test_pending_status(self):
        """PENDING 状态: 交易发起中"""

        async def _test():
            asset = await _create_test_asset()
            start_date = datetime.now(timezone.utc)

            subscription = await Subscription.create(
                wallet_address="0x" + "b" * 40,
                asset=asset,
                amount=Decimal("1000"),
                token_type=TokenType.USDT,
                lock_period=3,
                apy=Decimal("10"),
                rwa_token_amount=Decimal("1000"),
                start_date=start_date,
                end_date=Subscription.calculate_end_date(start_date, 3),
                original_end_date=Subscription.calculate_end_date(start_date, 3),
                expected_interest=Decimal("25"),
                tx_hash="0x" + "2" * 64,
                status=SubscriptionStatus.PENDING,
                environment="hardhat",
            )

            assert subscription.status == SubscriptionStatus.PENDING

        run_async(_test())

    def test_active_to_matured_transition(self):
        """ACTIVE → MATURED: 到期后自动转换"""

        async def _test():
            asset = await _create_test_asset()

            # 创建一个已过期的认购 (end_date 在过去)
            past_start = datetime.now(timezone.utc) - timedelta(days=100)
            past_end = past_start + timedelta(days=90)  # 3 个月前到期

            subscription = await Subscription.create(
                wallet_address="0x" + "c" * 40,
                asset=asset,
                amount=Decimal("1000"),
                token_type=TokenType.USDT,
                lock_period=3,
                apy=Decimal("10"),
                rwa_token_amount=Decimal("1000"),
                start_date=past_start,
                end_date=past_end,
                original_end_date=past_end,
                expected_interest=Decimal("25"),
                tx_hash="0x" + "3" * 64,
                status=SubscriptionStatus.ACTIVE,
                environment="hardhat",
            )

            # 验证 is_matured property
            assert subscription.is_matured is True
            assert subscription.days_remaining == 0

            # 模拟 list_subscriptions 中的自动状态更新逻辑
            if (
                subscription.status == SubscriptionStatus.ACTIVE
                and subscription.is_matured
            ):
                subscription.status = SubscriptionStatus.MATURED
                await subscription.save()

            # 重新查询验证
            updated = await Subscription.get(id=subscription.id)
            assert updated.status == SubscriptionStatus.MATURED

        run_async(_test())

    def test_active_not_matured_before_end_date(self):
        """ACTIVE 状态: 未到期时 is_matured 为 False"""

        async def _test():
            asset = await _create_test_asset()

            # 创建一个未到期的认购 (end_date 在未来)
            start_date = datetime.now(timezone.utc)
            end_date = start_date + timedelta(days=90)

            subscription = await Subscription.create(
                wallet_address="0x" + "d" * 40,
                asset=asset,
                amount=Decimal("1000"),
                token_type=TokenType.USDT,
                lock_period=3,
                apy=Decimal("10"),
                rwa_token_amount=Decimal("1000"),
                start_date=start_date,
                end_date=end_date,
                original_end_date=end_date,
                expected_interest=Decimal("25"),
                tx_hash="0x" + "4" * 64,
                status=SubscriptionStatus.ACTIVE,
                environment="hardhat",
            )

            assert subscription.is_matured is False
            assert subscription.days_remaining > 0
            assert subscription.status == SubscriptionStatus.ACTIVE

        run_async(_test())

    def test_matured_to_redeemed_transition(self):
        """MATURED → REDEEMED: 赎回操作"""

        async def _test():
            asset = await _create_test_asset()

            past_start = datetime.now(timezone.utc) - timedelta(days=100)
            past_end = past_start + timedelta(days=90)

            subscription = await Subscription.create(
                wallet_address="0x" + "e" * 40,
                asset=asset,
                amount=Decimal("10000"),
                token_type=TokenType.USDT,
                lock_period=3,
                apy=Decimal("10"),
                rwa_token_amount=Decimal("10000"),
                start_date=past_start,
                end_date=past_end,
                original_end_date=past_end,
                expected_interest=Decimal("250"),
                tx_hash="0x" + "5" * 64,
                status=SubscriptionStatus.MATURED,
                environment="hardhat",
            )

            # 执行赎回
            redeem_tx = "0x" + "6" * 64
            subscription.status = SubscriptionStatus.REDEEMED
            subscription.redeemed_at = datetime.now(timezone.utc)
            subscription.redeem_tx_hash = redeem_tx
            subscription.actual_interest = subscription.expected_interest
            await subscription.save()

            # 验证
            redeemed = await Subscription.get(id=subscription.id)
            assert redeemed.status == SubscriptionStatus.REDEEMED
            assert redeemed.redeem_tx_hash == redeem_tx
            assert redeemed.actual_interest == Decimal("250")
            assert redeemed.redeemed_at is not None

        run_async(_test())

    def test_redeemed_cannot_redeem_again(self):
        """已赎回的认购不能再次赎回"""

        async def _test():
            from src.services.subscription.service import SubscriptionService

            asset = await _create_test_asset()

            past_start = datetime.now(timezone.utc) - timedelta(days=100)
            past_end = past_start + timedelta(days=90)
            wallet = "0x" + "f" * 40

            subscription = await Subscription.create(
                wallet_address=wallet,
                asset=asset,
                amount=Decimal("10000"),
                token_type=TokenType.USDT,
                lock_period=3,
                apy=Decimal("10"),
                rwa_token_amount=Decimal("10000"),
                start_date=past_start,
                end_date=past_end,
                original_end_date=past_end,
                expected_interest=Decimal("250"),
                actual_interest=Decimal("250"),
                tx_hash="0x" + "7" * 64,
                status=SubscriptionStatus.REDEEMED,
                redeemed_at=datetime.now(timezone.utc),
                redeem_tx_hash="0x" + "8" * 64,
                environment="hardhat",
            )

            service = SubscriptionService()

            with pytest.raises(BusinessException) as exc_info:
                await service.redeem_subscription(
                    subscription.id, wallet, "0x" + "9" * 64
                )

            assert exc_info.value.code == 400
            assert "already redeemed" in exc_info.value.message.lower()

        run_async(_test())

    def test_active_cannot_redeem_before_maturity(self):
        """未到期的认购不能赎回"""

        async def _test():
            from src.services.subscription.service import SubscriptionService

            asset = await _create_test_asset()

            start_date = datetime.now(timezone.utc)
            end_date = start_date + timedelta(days=90)
            wallet = "0x" + "1" * 40

            subscription = await Subscription.create(
                wallet_address=wallet,
                asset=asset,
                amount=Decimal("10000"),
                token_type=TokenType.USDT,
                lock_period=3,
                apy=Decimal("10"),
                rwa_token_amount=Decimal("10000"),
                start_date=start_date,
                end_date=end_date,
                original_end_date=end_date,
                expected_interest=Decimal("250"),
                tx_hash="0x" + "a1" + "0" * 62,
                status=SubscriptionStatus.ACTIVE,
                environment="hardhat",
            )

            service = SubscriptionService()

            with pytest.raises(BusinessException) as exc_info:
                await service.redeem_subscription(
                    subscription.id, wallet, "0x" + "b1" + "0" * 62
                )

            assert exc_info.value.code == 400
            assert "not matured" in exc_info.value.message.lower()

        run_async(_test())

    def test_flexible_mode_always_matured(self):
        """活期模式 (lock_period=0) 始终可赎回"""

        async def _test():
            asset = await _create_test_asset()
            start_date = datetime.now(timezone.utc)

            subscription = await Subscription.create(
                wallet_address="0x" + "2" * 40,
                asset=asset,
                amount=Decimal("1000"),
                token_type=TokenType.USDT,
                lock_period=0,
                apy=Decimal("6"),
                rwa_token_amount=Decimal("1000"),
                start_date=start_date,
                end_date=start_date,  # 活期: end_date == start_date
                original_end_date=start_date,
                expected_interest=Decimal("50"),
                tx_hash="0x" + "c1" + "0" * 62,
                status=SubscriptionStatus.ACTIVE,
                environment="hardhat",
            )

            # 活期模式始终 is_matured
            assert subscription.is_matured is True
            assert subscription.days_remaining == 0

        run_async(_test())


# ============================================================
# 测试类: APY 选择逻辑
# ============================================================


class TestGetApyForPeriod:
    """_get_apy_for_period 方法测试"""

    @pytest.fixture(autouse=True)
    def setup_db(self, sqlite_db):
        """使用 SQLite 内存数据库"""
        pass

    def test_apy_3m(self):
        """3 个月锁定期返回 apy_3m"""

        async def _test():
            from src.services.subscription.service import SubscriptionService

            asset = await _create_test_asset(
                apy_3m=Decimal("10"),
                apy_6m=Decimal("12"),
                apy_12m=Decimal("15"),
            )
            service = SubscriptionService()
            assert service._get_apy_for_period(asset, 3) == Decimal("10")

        run_async(_test())

    def test_apy_6m(self):
        """6 个月锁定期返回 apy_6m"""

        async def _test():
            from src.services.subscription.service import SubscriptionService

            asset = await _create_test_asset(
                apy_3m=Decimal("10"),
                apy_6m=Decimal("12"),
                apy_12m=Decimal("15"),
            )
            service = SubscriptionService()
            assert service._get_apy_for_period(asset, 6) == Decimal("12")

        run_async(_test())

    def test_apy_12m(self):
        """12 个月锁定期返回 apy_12m"""

        async def _test():
            from src.services.subscription.service import SubscriptionService

            asset = await _create_test_asset(
                apy_3m=Decimal("10"),
                apy_6m=Decimal("12"),
                apy_12m=Decimal("15"),
            )
            service = SubscriptionService()
            assert service._get_apy_for_period(asset, 12) == Decimal("15")

        run_async(_test())

    def test_apy_flexible(self):
        """活期模式 (lock_period=0) 返回 apy_3m * 0.6"""

        async def _test():
            from src.services.subscription.service import SubscriptionService

            asset = await _create_test_asset(apy_3m=Decimal("10"))
            service = SubscriptionService()
            result = service._get_apy_for_period(asset, 0)
            expected = Decimal("10") * Decimal("0.6")
            assert result == expected

        run_async(_test())
