"""
Staking Domain - Business Service
"""

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import List, Optional, Tuple

from falib.utils.config import SETTINGS
from tortoise.functions import Sum

from src.models.staking import (
    BASE_DAILY_RATE,
    STAKING_MULTIPLIERS,
    RewardClaim,
    StakingLimit,
    StakingRecord,
)
from src.models.subscription import Subscription
from src.services.staking.schemas import (
    PeriodOption,
    PLTTokenInfoResponse,
    RewardClaimResponse,
    StakingConfigResponse,
    StakingCreateRequest,
    StakingLimitResponse,
    StakingPreviewRequest,
    StakingPreviewResponse,
    StakingResponse,
    StakingStatsResponse,
    TokenAllocation,
    TokenDistributionResponse,
)
from src.shared.common.exceptions import BusinessException
from src.shared.schemas.enums import StakingPeriod, StakingStatus, SubscriptionStatus

# 默认每日基础限额
DEFAULT_DAILY_LIMIT = Decimal("100000")  # 10万 RWA Token

# 最小质押金额
MIN_STAKE_AMOUNT = Decimal("100")

# PLT 代币配置
PLT_TOTAL_SUPPLY = Decimal("100000000")  # 1 亿枚
PLT_STAKING_REWARDS_POOL = Decimal("40000000")  # 40% 用于质押奖励

# PLT 代币分配
PLT_ALLOCATIONS = [
    {
        "name": "Staking Rewards",
        "amount": 40000000,
        "percentage": 40.0,
        "description": "质押挖矿奖励池",
        "color": "#1890ff",
    },
    {
        "name": "Team & Advisors",
        "amount": 15000000,
        "percentage": 15.0,
        "description": "团队与顾问（4年线性解锁）",
        "color": "#52c41a",
    },
    {
        "name": "Ecosystem Development",
        "amount": 20000000,
        "percentage": 20.0,
        "description": "生态发展基金",
        "color": "#722ed1",
    },
    {
        "name": "Community Airdrop",
        "amount": 10000000,
        "percentage": 10.0,
        "description": "社区空投",
        "color": "#faad14",
    },
    {
        "name": "Liquidity",
        "amount": 10000000,
        "percentage": 10.0,
        "description": "流动性提供",
        "color": "#13c2c2",
    },
    {
        "name": "Reserve",
        "amount": 5000000,
        "percentage": 5.0,
        "description": "储备基金",
        "color": "#eb2f96",
    },
]


class StakingService:
    """质押服务"""

    @property
    def environment(self) -> str:
        """获取当前环境"""
        return SETTINGS.environment

    def _get_multiplier(self, period: int) -> Decimal:
        """获取周期对应的奖励倍数"""
        try:
            staking_period = StakingPeriod(period)
            return STAKING_MULTIPLIERS[staking_period]
        except (ValueError, KeyError):
            raise BusinessException(
                code=400,
                message=f"Invalid staking period: {period}. Must be 15, 30, 45, or 60 days",
            )

    async def get_config(self) -> StakingConfigResponse:
        """获取质押配置"""
        periods = []
        for period in StakingPeriod:
            multiplier = STAKING_MULTIPLIERS[period]
            periods.append(
                PeriodOption(
                    period=period.value,
                    multiplier=float(multiplier),
                    description=f"{period.value} days ({multiplier}x rewards)",
                )
            )

        return StakingConfigResponse(
            periods=periods,
            base_daily_rate=float(BASE_DAILY_RATE),
            min_stake_amount=float(MIN_STAKE_AMOUNT),
        )

    async def preview_staking(
        self, wallet_address: str, data: StakingPreviewRequest
    ) -> StakingPreviewResponse:
        """
        预览质押

        计算预期奖励和到期日期
        """
        # 验证认购
        subscription = await Subscription.filter(
            id=data.subscription_id,
            wallet_address=wallet_address.lower(),
            environment=self.environment,
        ).first()

        if not subscription:
            raise BusinessException(code=404, message="Subscription not found")

        if subscription.status not in [
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.MATURED,
        ]:
            raise BusinessException(code=400, message="Subscription is not active")

        # 验证质押金额
        if data.amount < MIN_STAKE_AMOUNT:
            raise BusinessException(
                code=400, message=f"Minimum stake amount is {MIN_STAKE_AMOUNT}"
            )

        if data.amount > subscription.rwa_token_amount:
            raise BusinessException(
                code=400,
                message=f"Stake amount exceeds available RWA tokens ({subscription.rwa_token_amount})",
            )

        # 获取倍数
        multiplier = self._get_multiplier(data.period)

        # 计算预期奖励
        expected_rewards = StakingRecord.calculate_rewards(
            data.amount, data.period, multiplier
        )

        # 计算到期日期
        start_date = datetime.now(timezone.utc)
        end_date = StakingRecord.calculate_end_date(start_date, data.period)

        # 计算日奖励
        daily_rewards = BASE_DAILY_RATE * data.amount * multiplier

        return StakingPreviewResponse(
            subscription_id=subscription.id,
            amount=float(data.amount),
            period=data.period,
            multiplier=float(multiplier),
            expected_rewards=float(expected_rewards),
            end_date=end_date,
            daily_rewards=float(daily_rewards),
        )

    async def create_staking(
        self, wallet_address: str, data: StakingCreateRequest
    ) -> StakingResponse:
        """
        创建质押
        """
        # 验证认购
        subscription = await Subscription.filter(
            id=data.subscription_id,
            wallet_address=wallet_address.lower(),
            environment=self.environment,
        ).first()

        if not subscription:
            raise BusinessException(code=404, message="Subscription not found")

        if subscription.status not in [
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.MATURED,
        ]:
            raise BusinessException(code=400, message="Subscription is not active")

        # 验证质押金额
        if data.amount < MIN_STAKE_AMOUNT:
            raise BusinessException(
                code=400, message=f"Minimum stake amount is {MIN_STAKE_AMOUNT}"
            )

        # 检查限额
        limit = await self._get_or_create_today_limit()
        if data.amount > limit.remaining_limit:
            raise BusinessException(
                code=400,
                message=f"Exceeds daily limit. Remaining: {limit.remaining_limit}",
            )

        # 获取倍数
        multiplier = self._get_multiplier(data.period)

        # 计算
        start_date = datetime.now(timezone.utc)
        end_date = StakingRecord.calculate_end_date(start_date, data.period)
        expected_rewards = StakingRecord.calculate_rewards(
            data.amount, data.period, multiplier
        )

        # 创建质押记录
        staking = await StakingRecord.create(
            wallet_address=wallet_address.lower(),
            subscription_id=subscription.id,
            amount=data.amount,
            period=data.period,
            multiplier=multiplier,
            start_date=start_date,
            end_date=end_date,
            expected_rewards=expected_rewards,
            stake_tx_hash=data.tx_hash,
            status=StakingStatus.ACTIVE,
            environment=self.environment,
        )

        # 更新限额
        limit.used_limit += data.amount
        await limit.save()

        # 顺延认购赎回时间
        if subscription.status == SubscriptionStatus.ACTIVE:
            subscription.end_date = subscription.end_date + timedelta(days=data.period)
            await subscription.save()

        return await self._to_response(staking)

    async def list_stakings(
        self,
        wallet_address: str,
        status: Optional[StakingStatus] = None,
        page: int = 1,
        page_size: int = 10,
    ) -> Tuple[List[StakingResponse], int, int]:
        """
        获取用户质押列表
        """
        query = StakingRecord.filter(
            wallet_address=wallet_address.lower(), environment=self.environment
        )

        if status:
            query = query.filter(status=status)

        total = await query.count()
        total_pages = (total + page_size - 1) // page_size

        offset = (page - 1) * page_size
        stakings = await query.order_by("-created_at").offset(offset).limit(page_size)

        # 自动更新到期状态
        for staking in stakings:
            if staking.status == StakingStatus.ACTIVE and staking.is_matured:
                staking.status = StakingStatus.MATURED
                await staking.save()

        return ([await self._to_response(s) for s in stakings], total, total_pages)

    async def get_staking(
        self, staking_id: int, wallet_address: str
    ) -> Optional[StakingResponse]:
        """
        获取质押详情
        """
        staking = await StakingRecord.filter(
            id=staking_id,
            wallet_address=wallet_address.lower(),
            environment=self.environment,
        ).first()

        if not staking:
            return None

        # 自动更新到期状态
        if staking.status == StakingStatus.ACTIVE and staking.is_matured:
            staking.status = StakingStatus.MATURED
            await staking.save()

        return await self._to_response(staking)

    async def unstake(
        self, staking_id: int, wallet_address: str, tx_hash: str
    ) -> StakingResponse:
        """
        解除质押
        """
        staking = await StakingRecord.filter(
            id=staking_id,
            wallet_address=wallet_address.lower(),
            environment=self.environment,
        ).first()

        if not staking:
            raise BusinessException(code=404, message="Staking record not found")

        if staking.status == StakingStatus.UNSTAKED:
            raise BusinessException(code=400, message="Already unstaked")

        if not staking.is_matured:
            raise BusinessException(code=400, message="Staking has not matured yet")

        # 更新状态
        staking.status = StakingStatus.UNSTAKED
        staking.unstake_tx_hash = tx_hash

        # 自动领取剩余奖励
        if staking.pending_rewards > 0:
            await RewardClaim.create(
                wallet_address=wallet_address.lower(),
                staking_record=staking,
                amount=staking.pending_rewards,
                tx_hash=tx_hash,
                environment=self.environment,
            )
            staking.claimed_rewards = staking.expected_rewards

        await staking.save()

        # 恢复认购赎回时间
        if staking.subscription_id:
            subscription = await Subscription.filter(id=staking.subscription_id).first()
            if subscription and subscription.original_end_date:
                subscription.end_date = subscription.original_end_date
                await subscription.save()

        return await self._to_response(staking)

    async def claim_rewards(
        self, staking_id: int, wallet_address: str, tx_hash: str
    ) -> RewardClaimResponse:
        """
        领取奖励
        """
        staking = await StakingRecord.filter(
            id=staking_id,
            wallet_address=wallet_address.lower(),
            environment=self.environment,
        ).first()

        if not staking:
            raise BusinessException(code=404, message="Staking record not found")

        if staking.status == StakingStatus.UNSTAKED:
            raise BusinessException(
                code=400, message="Already unstaked, rewards claimed"
            )

        # 计算可领取奖励
        claimable = staking.current_rewards - staking.claimed_rewards
        if claimable <= 0:
            raise BusinessException(code=400, message="No rewards to claim")

        # 创建领取记录
        claim = await RewardClaim.create(
            wallet_address=wallet_address.lower(),
            staking_record=staking,
            amount=claimable,
            tx_hash=tx_hash,
            environment=self.environment,
        )

        # 更新已领取
        staking.claimed_rewards += claimable
        await staking.save()

        return RewardClaimResponse(
            id=claim.id,
            staking_id=staking.id,
            amount=float(claimable),
            tx_hash=tx_hash,
            created_at=claim.created_at,
        )

    async def get_user_stats(self, wallet_address: str) -> StakingStatsResponse:
        """
        获取用户质押统计
        """
        stakings = await StakingRecord.filter(
            wallet_address=wallet_address.lower(), environment=self.environment
        )

        total_staked = Decimal(0)
        active_count = 0
        total_earned = Decimal(0)
        pending = Decimal(0)

        for s in stakings:
            if s.status in [StakingStatus.ACTIVE, StakingStatus.MATURED]:
                total_staked += s.amount
                active_count += 1
                pending += s.pending_rewards
            total_earned += s.claimed_rewards

        # 计算当前 APY (简化计算)
        # 假设 60 天周期，7.0x 倍数
        current_apy = float(BASE_DAILY_RATE * 365 * Decimal("7.0") * 100)  # 转为百分比

        return StakingStatsResponse(
            total_staked=float(total_staked),
            active_stakes=active_count,
            total_rewards_earned=float(total_earned),
            pending_rewards=float(pending),
            current_apy=current_apy,
        )

    async def get_today_limit(self) -> StakingLimitResponse:
        """
        获取今日质押限额
        """
        limit = await self._get_or_create_today_limit()

        return StakingLimitResponse(
            date=str(limit.date),
            base_limit=float(limit.base_limit),
            carried_limit=float(limit.carried_limit),
            total_limit=float(limit.total_limit),
            used_limit=float(limit.used_limit),
            remaining_limit=float(limit.remaining_limit),
            is_exhausted=limit.is_exhausted,
        )

    async def _get_or_create_today_limit(self) -> StakingLimit:
        """
        获取或创建今日限额记录
        """
        today = date.today()

        limit = await StakingLimit.filter(
            date=today, environment=self.environment
        ).first()

        if limit:
            return limit

        # 获取昨日未用限额
        yesterday = today - timedelta(days=1)
        yesterday_limit = await StakingLimit.filter(
            date=yesterday, environment=self.environment
        ).first()

        carried = Decimal(0)
        if yesterday_limit:
            carried = yesterday_limit.remaining_limit

        # 创建今日限额
        limit = await StakingLimit.create(
            date=today,
            base_limit=DEFAULT_DAILY_LIMIT,
            carried_limit=carried,
            used_limit=Decimal(0),
            environment=self.environment,
        )

        return limit

    async def _to_response(self, staking: StakingRecord) -> StakingResponse:
        """转换为响应"""
        return StakingResponse(
            id=staking.id,
            wallet_address=staking.wallet_address,
            subscription_id=staking.subscription_id,
            amount=float(staking.amount),
            period=staking.period,
            multiplier=float(staking.multiplier),
            start_date=staking.start_date,
            end_date=staking.end_date,
            expected_rewards=float(staking.expected_rewards),
            claimed_rewards=float(staking.claimed_rewards),
            pending_rewards=float(staking.pending_rewards),
            current_rewards=float(staking.current_rewards),
            days_remaining=staking.days_remaining,
            is_matured=staking.is_matured,
            status=staking.status,
            stake_tx_hash=staking.stake_tx_hash,
            unstake_tx_hash=staking.unstake_tx_hash,
            environment=staking.environment,
            created_at=staking.created_at,
            updated_at=staking.updated_at,
        )

    async def get_plt_token_info(self) -> PLTTokenInfoResponse:
        """
        获取 PLT 代币信息
        """
        # 计算已分发奖励
        total_claimed = (
            await RewardClaim.filter(environment=self.environment)
            .annotate(total=Sum("amount"))
            .values_list("total", flat=True)
        )

        distributed = Decimal(total_claimed[0] or 0) if total_claimed else Decimal(0)

        # 计算总质押量
        total_staked = (
            await StakingRecord.filter(
                status__in=[StakingStatus.ACTIVE, StakingStatus.MATURED],
                environment=self.environment,
            )
            .annotate(total=Sum("amount"))
            .values_list("total", flat=True)
        )

        staked_value = Decimal(total_staked[0] or 0) if total_staked else Decimal(0)

        # 计算平均 APY (基于 60 天周期的 7.0x 倍数)
        avg_apy = float(BASE_DAILY_RATE * 365 * Decimal("7.0") * 100)

        # 流通量 = 已分发 + 空投 + 流动性
        circulating = distributed + Decimal("10000000") + Decimal("10000000")

        # 分配详情
        allocations = [TokenAllocation(**alloc) for alloc in PLT_ALLOCATIONS]

        distribution = TokenDistributionResponse(
            allocations=allocations,
            total_supply=float(PLT_TOTAL_SUPPLY),
            circulating_supply=float(circulating),
            staking_pool_remaining=float(PLT_STAKING_REWARDS_POOL - distributed),
        )

        return PLTTokenInfoResponse(
            name="PLT Token",
            symbol="PLT",
            total_supply=float(PLT_TOTAL_SUPPLY),
            circulating_supply=float(circulating),
            staking_rewards_pool=float(PLT_STAKING_REWARDS_POOL),
            staking_rewards_distributed=float(distributed),
            staking_rewards_remaining=float(PLT_STAKING_REWARDS_POOL - distributed),
            current_price=0.1,  # 示例价格
            market_cap=float(circulating) * 0.1,
            total_staked_value=float(staked_value),
            average_apy=avg_apy,
            distribution=distribution,
        )
