"""
质押服务 (StakingService) 单元测试

覆盖范围:
- 正常质押流程
- 奖励计算验证
- 提前解质押校验
- 质押周期验证 (15/30/45/60 天)

_Requirements: 8.2_
"""

import asyncio
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest

from src.common.exceptions import BusinessException
from src.constants.definitions.staking import BASE_DAILY_RATE, STAKING_MULTIPLIERS
from src.models.asset import Asset
from src.models.staking import (
    RewardClaim,
    StakingRecord,
)
from src.models.subscription import Subscription
from src.schemas.enums import (
    AssetStatus,
    AssetType,
    StakingPeriod,
    StakingStatus,
    SubscriptionStatus,
    TokenType,
)
from src.services.staking_service import (
    DEFAULT_DAILY_LIMIT,
    MIN_STAKE_AMOUNT,
    StakingService,
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


async def _create_test_subscription(
    asset: Asset,
    wallet_address: str = "0x" + "a" * 40,
    amount: Decimal = Decimal("10000"),
    rwa_token_amount: Decimal = Decimal("10000"),
    lock_period: int = 3,
    apy: Decimal = Decimal("10"),
    status: SubscriptionStatus = SubscriptionStatus.ACTIVE,
    environment: str = "hardhat",
) -> Subscription:
    """创建测试用认购记录"""
    now = datetime.now(timezone.utc)
    end_date = now + timedelta(days=lock_period * 30)
    return await Subscription.create(
        wallet_address=wallet_address.lower(),
        asset=asset,
        amount=amount,
        rwa_token_amount=rwa_token_amount,
        token_type=TokenType.USDT,
        lock_period=lock_period,
        apy=apy,
        status=status,
        start_date=now,
        end_date=end_date,
        original_end_date=end_date,
        tx_hash="0x" + "b" * 64,
        environment=environment,
    )


# ============================================================
# 测试类: 正常质押
# ============================================================


class TestCreateStakingSuccess:
    """正常质押流程测试"""

    @pytest.fixture(autouse=True)
    def setup_db(self, sqlite_db):
        """使用 SQLite 内存数据库"""
        pass

    def test_create_staking_success(self):
        """正常创建质押 — 15 天周期"""

        async def _test():
            service = StakingService()
            wallet = "0x" + "a" * 40

            # 准备: 创建资产和认购
            asset = await _create_test_asset()
            subscription = await _create_test_subscription(
                asset=asset,
                wallet_address=wallet,
                rwa_token_amount=Decimal("10000"),
            )

            # 创建质押限额 (服务内部会自动创建，但需要确保环境一致)
            from src.schemas.staking import StakingCreateRequest

            request = StakingCreateRequest(
                subscription_id=subscription.id,
                amount=Decimal("1000"),
                period=15,
                tx_hash="0x" + "c" * 64,
            )

            result = await service.create_staking(wallet, request)

            # 验证返回结果
            assert result.amount == 1000.0
            assert result.period == 15
            assert result.multiplier == float(
                STAKING_MULTIPLIERS[StakingPeriod.DAYS_15]
            )
            assert result.status == StakingStatus.ACTIVE
            assert result.wallet_address == wallet.lower()
            assert result.subscription_id == subscription.id
            assert result.stake_tx_hash == "0x" + "c" * 64

            # 验证预期奖励计算
            expected = (
                BASE_DAILY_RATE
                * Decimal("1000")
                * 15
                * STAKING_MULTIPLIERS[StakingPeriod.DAYS_15]
            )
            assert result.expected_rewards == float(expected)

            # 验证数据库记录
            db_record = await StakingRecord.filter(id=result.id).first()
            assert db_record is not None
            assert db_record.amount == Decimal("1000")
            assert db_record.status == StakingStatus.ACTIVE

        run_async(_test())

    def test_create_staking_30_days(self):
        """创建 30 天周期质押"""

        async def _test():
            service = StakingService()
            wallet = "0x" + "a" * 40

            asset = await _create_test_asset()
            subscription = await _create_test_subscription(
                asset=asset, wallet_address=wallet
            )

            from src.schemas.staking import StakingCreateRequest

            request = StakingCreateRequest(
                subscription_id=subscription.id,
                amount=Decimal("2000"),
                period=30,
                tx_hash="0x" + "d" * 64,
            )

            result = await service.create_staking(wallet, request)

            assert result.period == 30
            assert result.multiplier == float(
                STAKING_MULTIPLIERS[StakingPeriod.DAYS_30]
            )

            expected = (
                BASE_DAILY_RATE
                * Decimal("2000")
                * 30
                * STAKING_MULTIPLIERS[StakingPeriod.DAYS_30]
            )
            assert result.expected_rewards == float(expected)

        run_async(_test())

    def test_create_staking_60_days(self):
        """创建 60 天周期质押 — 最高倍数"""

        async def _test():
            service = StakingService()
            wallet = "0x" + "a" * 40

            asset = await _create_test_asset()
            subscription = await _create_test_subscription(
                asset=asset, wallet_address=wallet
            )

            from src.schemas.staking import StakingCreateRequest

            request = StakingCreateRequest(
                subscription_id=subscription.id,
                amount=Decimal("5000"),
                period=60,
                tx_hash="0x" + "e" * 64,
            )

            result = await service.create_staking(wallet, request)

            assert result.period == 60
            assert result.multiplier == float(
                STAKING_MULTIPLIERS[StakingPeriod.DAYS_60]
            )

            # 60 天 7.0x 倍数
            expected = BASE_DAILY_RATE * Decimal("5000") * 60 * Decimal("7.0")
            assert result.expected_rewards == float(expected)

        run_async(_test())

    def test_create_staking_updates_daily_limit(self):
        """质押后每日限额应减少"""

        async def _test():
            service = StakingService()
            wallet = "0x" + "a" * 40

            asset = await _create_test_asset()
            subscription = await _create_test_subscription(
                asset=asset, wallet_address=wallet
            )

            from src.schemas.staking import StakingCreateRequest

            request = StakingCreateRequest(
                subscription_id=subscription.id,
                amount=Decimal("1000"),
                period=15,
                tx_hash="0x" + "f" * 64,
            )

            await service.create_staking(wallet, request)

            # 验证限额已更新
            limit_resp = await service.get_today_limit()
            assert float(limit_resp.used_limit) == 1000.0
            assert (
                float(limit_resp.remaining_limit) == float(DEFAULT_DAILY_LIMIT) - 1000.0
            )

        run_async(_test())

    def test_create_staking_extends_subscription_end_date(self):
        """质押应顺延认购赎回时间"""

        async def _test():
            service = StakingService()
            wallet = "0x" + "a" * 40

            asset = await _create_test_asset()
            subscription = await _create_test_subscription(
                asset=asset, wallet_address=wallet
            )
            original_end = subscription.end_date

            from src.schemas.staking import StakingCreateRequest

            request = StakingCreateRequest(
                subscription_id=subscription.id,
                amount=Decimal("1000"),
                period=30,
                tx_hash="0x" + "1" * 64,
            )

            await service.create_staking(wallet, request)

            # 重新查询认购记录
            updated_sub = await Subscription.filter(id=subscription.id).first()
            expected_end = original_end + timedelta(days=30)
            # 比较到秒级精度
            assert abs((updated_sub.end_date - expected_end).total_seconds()) < 1

        run_async(_test())


# ============================================================
# 测试类: 奖励计算
# ============================================================


class TestStakingRewardCalculation:
    """奖励计算验证测试"""

    def test_reward_15_days_1x(self):
        """15 天周期 1.0x 倍数奖励计算"""
        amount = Decimal("1000")
        period = 15
        multiplier = STAKING_MULTIPLIERS[StakingPeriod.DAYS_15]  # 1.0x

        reward = StakingService.calculate_rewards(amount, period, multiplier)

        # 0.01 * 1000 * 15 * 1.0 = 150
        expected = BASE_DAILY_RATE * amount * period * multiplier
        assert reward == expected
        assert reward == Decimal("150")

    def test_reward_30_days_2_5x(self):
        """30 天周期 2.5x 倍数奖励计算"""
        amount = Decimal("1000")
        period = 30
        multiplier = STAKING_MULTIPLIERS[StakingPeriod.DAYS_30]  # 2.5x

        reward = StakingService.calculate_rewards(amount, period, multiplier)

        # 0.01 * 1000 * 30 * 2.5 = 750
        expected = BASE_DAILY_RATE * amount * period * multiplier
        assert reward == expected
        assert reward == Decimal("750")

    def test_reward_45_days_4_5x(self):
        """45 天周期 4.5x 倍数奖励计算"""
        amount = Decimal("2000")
        period = 45
        multiplier = STAKING_MULTIPLIERS[StakingPeriod.DAYS_45]  # 4.5x

        reward = StakingService.calculate_rewards(amount, period, multiplier)

        # 0.01 * 2000 * 45 * 4.5 = 4050
        expected = BASE_DAILY_RATE * amount * period * multiplier
        assert reward == expected
        assert reward == Decimal("4050")

    def test_reward_60_days_7x(self):
        """60 天周期 7.0x 倍数奖励计算"""
        amount = Decimal("5000")
        period = 60
        multiplier = STAKING_MULTIPLIERS[StakingPeriod.DAYS_60]  # 7.0x

        reward = StakingService.calculate_rewards(amount, period, multiplier)

        # 0.01 * 5000 * 60 * 7.0 = 21000
        expected = BASE_DAILY_RATE * amount * period * multiplier
        assert reward == expected
        assert reward == Decimal("21000")

    def test_reward_small_amount(self):
        """最小质押金额的奖励计算"""
        amount = MIN_STAKE_AMOUNT  # 100
        period = 15
        multiplier = STAKING_MULTIPLIERS[StakingPeriod.DAYS_15]

        reward = StakingService.calculate_rewards(amount, period, multiplier)

        # 0.01 * 100 * 15 * 1.0 = 15
        assert reward == Decimal("15")

    def test_reward_large_amount(self):
        """大额质押的奖励计算"""
        amount = Decimal("100000")
        period = 60
        multiplier = STAKING_MULTIPLIERS[StakingPeriod.DAYS_60]

        reward = StakingService.calculate_rewards(amount, period, multiplier)

        # 0.01 * 100000 * 60 * 7.0 = 420000
        assert reward == Decimal("420000")

    def test_reward_proportional_to_amount(self):
        """奖励与质押金额成正比"""
        period = 30
        multiplier = STAKING_MULTIPLIERS[StakingPeriod.DAYS_30]

        reward_1000 = StakingService.calculate_rewards(
            Decimal("1000"), period, multiplier
        )
        reward_2000 = StakingService.calculate_rewards(
            Decimal("2000"), period, multiplier
        )

        assert reward_2000 == reward_1000 * 2

    def test_reward_proportional_to_period(self):
        """奖励与质押天数成正比 (同倍数下)"""
        amount = Decimal("1000")
        multiplier = Decimal("1.0")

        reward_15 = StakingService.calculate_rewards(amount, 15, multiplier)
        reward_30 = StakingService.calculate_rewards(amount, 30, multiplier)

        assert reward_30 == reward_15 * 2

    def test_end_date_calculation(self):
        """到期日期计算"""
        start = datetime(2025, 1, 1, 0, 0, 0, tzinfo=timezone.utc)

        end_15 = StakingRecord.calculate_end_date(start, 15)
        assert end_15 == start + timedelta(days=15)

        end_30 = StakingRecord.calculate_end_date(start, 30)
        assert end_30 == start + timedelta(days=30)

        end_45 = StakingRecord.calculate_end_date(start, 45)
        assert end_45 == start + timedelta(days=45)

        end_60 = StakingRecord.calculate_end_date(start, 60)
        assert end_60 == start + timedelta(days=60)

    def test_multiplier_increases_with_period(self):
        """更长周期应有更高倍数"""
        assert (
            STAKING_MULTIPLIERS[StakingPeriod.DAYS_15]
            < STAKING_MULTIPLIERS[StakingPeriod.DAYS_30]
        )
        assert (
            STAKING_MULTIPLIERS[StakingPeriod.DAYS_30]
            < STAKING_MULTIPLIERS[StakingPeriod.DAYS_45]
        )
        assert (
            STAKING_MULTIPLIERS[StakingPeriod.DAYS_45]
            < STAKING_MULTIPLIERS[StakingPeriod.DAYS_60]
        )


# ============================================================
# 测试类: 提前解质押
# ============================================================


class TestUnstakeBeforePeriod:
    """提前解质押校验测试"""

    @pytest.fixture(autouse=True)
    def setup_db(self, sqlite_db):
        """使用 SQLite 内存数据库"""
        pass

    def test_unstake_before_maturity_rejected(self):
        """未到期的质押不允许解质押"""

        async def _test():
            service = StakingService()
            wallet = "0x" + "a" * 40

            asset = await _create_test_asset()
            subscription = await _create_test_subscription(
                asset=asset, wallet_address=wallet
            )

            # 创建一个未到期的质押记录 (end_date 在未来)
            now = datetime.now(timezone.utc)
            staking = await StakingRecord.create(
                wallet_address=wallet.lower(),
                subscription_id=subscription.id,
                amount=Decimal("1000"),
                period=60,
                multiplier=STAKING_MULTIPLIERS[StakingPeriod.DAYS_60],
                start_date=now,
                end_date=now + timedelta(days=60),
                expected_rewards=Decimal("4200"),
                stake_tx_hash="0x" + "c" * 64,
                status=StakingStatus.ACTIVE,
                environment="hardhat",
            )

            # 尝试解质押 — 应被拒绝
            with pytest.raises(BusinessException) as exc_info:
                await service.unstake(staking.id, wallet, "0x" + "d" * 64)

            assert exc_info.value.code == 400
            assert "not matured" in exc_info.value.message.lower()

        run_async(_test())

    def test_unstake_after_maturity_success(self):
        """到期后可以正常解质押"""

        async def _test():
            service = StakingService()
            wallet = "0x" + "a" * 40

            asset = await _create_test_asset()
            subscription = await _create_test_subscription(
                asset=asset, wallet_address=wallet
            )

            # 创建一个已到期的质押记录 (end_date 在过去)
            now = datetime.now(timezone.utc)
            staking = await StakingRecord.create(
                wallet_address=wallet.lower(),
                subscription_id=subscription.id,
                amount=Decimal("1000"),
                period=15,
                multiplier=STAKING_MULTIPLIERS[StakingPeriod.DAYS_15],
                start_date=now - timedelta(days=20),
                end_date=now - timedelta(days=5),
                expected_rewards=Decimal("150"),
                stake_tx_hash="0x" + "c" * 64,
                status=StakingStatus.ACTIVE,
                environment="hardhat",
            )

            unstake_tx = "0x" + "d" * 64
            result = await service.unstake(staking.id, wallet, unstake_tx)

            assert result.status == StakingStatus.UNSTAKED
            assert result.unstake_tx_hash == unstake_tx

            # 验证数据库状态
            db_record = await StakingRecord.filter(id=staking.id).first()
            assert db_record.status == StakingStatus.UNSTAKED

        run_async(_test())

    def test_unstake_already_unstaked_rejected(self):
        """已解质押的记录不能重复解质押"""

        async def _test():
            service = StakingService()
            wallet = "0x" + "a" * 40

            asset = await _create_test_asset()
            subscription = await _create_test_subscription(
                asset=asset, wallet_address=wallet
            )

            now = datetime.now(timezone.utc)
            staking = await StakingRecord.create(
                wallet_address=wallet.lower(),
                subscription_id=subscription.id,
                amount=Decimal("1000"),
                period=15,
                multiplier=STAKING_MULTIPLIERS[StakingPeriod.DAYS_15],
                start_date=now - timedelta(days=20),
                end_date=now - timedelta(days=5),
                expected_rewards=Decimal("150"),
                stake_tx_hash="0x" + "c" * 64,
                status=StakingStatus.UNSTAKED,
                unstake_tx_hash="0x" + "d" * 64,
                environment="hardhat",
            )

            with pytest.raises(BusinessException) as exc_info:
                await service.unstake(staking.id, wallet, "0x" + "e" * 64)

            assert exc_info.value.code == 400
            assert "already unstaked" in exc_info.value.message.lower()

        run_async(_test())

    def test_unstake_nonexistent_record_rejected(self):
        """不存在的质押记录应返回 404"""

        async def _test():
            service = StakingService()
            wallet = "0x" + "a" * 40

            with pytest.raises(BusinessException) as exc_info:
                await service.unstake(99999, wallet, "0x" + "d" * 64)

            assert exc_info.value.code == 404

        run_async(_test())

    def test_unstake_auto_claims_pending_rewards(self):
        """解质押时自动领取待领取的奖励"""

        async def _test():
            service = StakingService()
            wallet = "0x" + "a" * 40

            asset = await _create_test_asset()
            subscription = await _create_test_subscription(
                asset=asset, wallet_address=wallet
            )

            now = datetime.now(timezone.utc)
            expected_rewards = Decimal("150")
            staking = await StakingRecord.create(
                wallet_address=wallet.lower(),
                subscription_id=subscription.id,
                amount=Decimal("1000"),
                period=15,
                multiplier=STAKING_MULTIPLIERS[StakingPeriod.DAYS_15],
                start_date=now - timedelta(days=20),
                end_date=now - timedelta(days=5),
                expected_rewards=expected_rewards,
                claimed_rewards=Decimal("0"),
                stake_tx_hash="0x" + "c" * 64,
                status=StakingStatus.ACTIVE,
                environment="hardhat",
            )

            unstake_tx = "0x" + "d" * 64
            result = await service.unstake(staking.id, wallet, unstake_tx)

            # 解质押后 claimed_rewards 应等于 expected_rewards
            assert result.claimed_rewards == float(expected_rewards)
            assert result.pending_rewards == 0.0

            # 验证 RewardClaim 记录已创建
            claims = await RewardClaim.filter(staking_record_id=staking.id).all()
            assert len(claims) == 1
            assert claims[0].amount == expected_rewards

        run_async(_test())


# ============================================================
# 测试类: 质押周期验证
# ============================================================


class TestStakingPeriodValidation:
    """质押周期验证测试 (15/30/45/60 天)"""

    @pytest.fixture(autouse=True)
    def setup_db(self, sqlite_db):
        """使用 SQLite 内存数据库"""
        pass

    def test_valid_period_15(self):
        """15 天是有效的质押周期"""
        service = StakingService()
        multiplier = service._get_multiplier(15)
        assert multiplier == STAKING_MULTIPLIERS[StakingPeriod.DAYS_15]
        assert multiplier == Decimal("1.0")

    def test_valid_period_30(self):
        """30 天是有效的质押周期"""
        service = StakingService()
        multiplier = service._get_multiplier(30)
        assert multiplier == STAKING_MULTIPLIERS[StakingPeriod.DAYS_30]
        assert multiplier == Decimal("2.5")

    def test_valid_period_45(self):
        """45 天是有效的质押周期"""
        service = StakingService()
        multiplier = service._get_multiplier(45)
        assert multiplier == STAKING_MULTIPLIERS[StakingPeriod.DAYS_45]
        assert multiplier == Decimal("4.5")

    def test_valid_period_60(self):
        """60 天是有效的质押周期"""
        service = StakingService()
        multiplier = service._get_multiplier(60)
        assert multiplier == STAKING_MULTIPLIERS[StakingPeriod.DAYS_60]
        assert multiplier == Decimal("7.0")

    def test_invalid_period_7_rejected(self):
        """7 天不是有效的质押周期"""
        service = StakingService()
        with pytest.raises(BusinessException) as exc_info:
            service._get_multiplier(7)
        assert exc_info.value.code == 400
        assert "invalid staking period" in exc_info.value.message.lower()

    def test_invalid_period_90_rejected(self):
        """90 天不是有效的质押周期"""
        service = StakingService()
        with pytest.raises(BusinessException) as exc_info:
            service._get_multiplier(90)
        assert exc_info.value.code == 400

    def test_invalid_period_0_rejected(self):
        """0 天不是有效的质押周期"""
        service = StakingService()
        with pytest.raises(BusinessException) as exc_info:
            service._get_multiplier(0)
        assert exc_info.value.code == 400

    def test_invalid_period_negative_rejected(self):
        """负数天不是有效的质押周期"""
        service = StakingService()
        with pytest.raises(BusinessException) as exc_info:
            service._get_multiplier(-15)
        assert exc_info.value.code == 400

    def test_create_staking_invalid_period_rejected(self):
        """使用无效周期创建质押应被拒绝"""

        async def _test():
            service = StakingService()
            wallet = "0x" + "a" * 40

            asset = await _create_test_asset()
            subscription = await _create_test_subscription(
                asset=asset, wallet_address=wallet
            )

            from src.schemas.staking import StakingCreateRequest

            request = StakingCreateRequest(
                subscription_id=subscription.id,
                amount=Decimal("1000"),
                period=7,  # 无效周期
                tx_hash="0x" + "c" * 64,
            )

            with pytest.raises(BusinessException) as exc_info:
                await service.create_staking(wallet, request)

            assert exc_info.value.code == 400
            assert "invalid staking period" in exc_info.value.message.lower()

        run_async(_test())

    def test_create_staking_below_minimum_rejected(self):
        """低于最小质押金额应被拒绝"""

        async def _test():
            service = StakingService()
            wallet = "0x" + "a" * 40

            asset = await _create_test_asset()
            subscription = await _create_test_subscription(
                asset=asset, wallet_address=wallet
            )

            from src.schemas.staking import StakingCreateRequest

            request = StakingCreateRequest(
                subscription_id=subscription.id,
                amount=Decimal("50"),  # 低于 MIN_STAKE_AMOUNT (100)
                period=15,
                tx_hash="0x" + "c" * 64,
            )

            with pytest.raises(BusinessException) as exc_info:
                await service.create_staking(wallet, request)

            assert exc_info.value.code == 400
            assert "minimum" in exc_info.value.message.lower()

        run_async(_test())

    def test_create_staking_exceeds_daily_limit_rejected(self):
        """超出每日限额应被拒绝"""

        async def _test():
            service = StakingService()
            wallet = "0x" + "a" * 40

            asset = await _create_test_asset()
            subscription = await _create_test_subscription(
                asset=asset,
                wallet_address=wallet,
                rwa_token_amount=Decimal("200000"),
            )

            from src.schemas.staking import StakingCreateRequest

            # 尝试质押超过每日限额 (DEFAULT_DAILY_LIMIT = 100000)
            request = StakingCreateRequest(
                subscription_id=subscription.id,
                amount=Decimal("100001"),
                period=15,
                tx_hash="0x" + "c" * 64,
            )

            with pytest.raises(BusinessException) as exc_info:
                await service.create_staking(wallet, request)

            assert exc_info.value.code == 400
            assert "limit" in exc_info.value.message.lower()

        run_async(_test())

    def test_create_staking_nonexistent_subscription_rejected(self):
        """不存在的认购 ID 应被拒绝"""

        async def _test():
            service = StakingService()
            wallet = "0x" + "a" * 40

            from src.schemas.staking import StakingCreateRequest

            request = StakingCreateRequest(
                subscription_id=99999,
                amount=Decimal("1000"),
                period=15,
                tx_hash="0x" + "c" * 64,
            )

            with pytest.raises(BusinessException) as exc_info:
                await service.create_staking(wallet, request)

            assert exc_info.value.code == 404

        run_async(_test())

    def test_all_valid_periods_produce_different_rewards(self):
        """所有有效周期对相同金额应产生不同奖励 (递增)"""
        amount = Decimal("1000")
        rewards = []

        for period_enum in StakingPeriod:
            multiplier = STAKING_MULTIPLIERS[period_enum]
            reward = StakingService.calculate_rewards(
                amount, period_enum.value, multiplier
            )
            rewards.append(reward)

        # 奖励应严格递增: 15天 < 30天 < 45天 < 60天
        for i in range(len(rewards) - 1):
            assert rewards[i] < rewards[i + 1], (
                f"周期 {list(StakingPeriod)[i].value} 天的奖励 ({rewards[i]}) "
                f"应小于 {list(StakingPeriod)[i + 1].value} 天的奖励 ({rewards[i + 1]})"
            )
