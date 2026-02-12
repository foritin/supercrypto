"""
认购领域 - 业务服务层

幂等性设计:
- 使用 tx_hash 作为唯一标识
- 相同 tx_hash 的请求返回已存在记录
- 使用 Redis 分布式锁防止并发创建
- 数据库唯一约束作为最后防线
"""

import asyncio
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional, Tuple

from falib.utils.config import SETTINGS
from falib.utils.log import get_logger
from tortoise.exceptions import IntegrityError
from tortoise.transactions import in_transaction

from src.models.asset import Asset
from src.models.subscription import Subscription
from src.services.asset.service import AssetService
from src.services.subscription.schemas import (
    SubscriptionCreateRequest,
    SubscriptionPreviewRequest,
    SubscriptionPreviewResponse,
    SubscriptionResponse,
)
from src.shared.common.exceptions import BusinessException
from src.shared.schemas.enums import SubscriptionStatus
from src.shared.services.lock_service import DistributedLockService, LockAcquireError

logger = get_logger("business.subscription.service")


class SubscriptionService:
    """认购服务"""

    def __init__(self):
        self.asset_service = AssetService()

    @property
    def network(self) -> str:
        """获取当前网络"""
        return SETTINGS.network

    async def preview_subscription(
        self, data: SubscriptionPreviewRequest
    ) -> SubscriptionPreviewResponse:
        """
        预览认购收益

        参数:
            data: 预览请求

        返回:
            预览响应
        """
        # 获取资产
        asset = await Asset.filter(
            id=data.asset_id, environment=self.network
        ).first()

        if not asset:
            raise BusinessException(code=404, message="Asset not found")

        if not asset.is_available:
            raise BusinessException(
                code=400, message="Asset is not available for subscription"
            )

        # 检查最小认购金额
        if data.amount < asset.min_subscription:
            raise BusinessException(
                code=400,
                message=f"Minimum subscription amount is {asset.min_subscription}",
            )

        # 获取对应锁定期的 APY
        apy = self._get_apy_for_period(asset, data.lock_period)

        # 计算预期利息
        expected_interest = Subscription.calculate_expected_interest(
            data.amount, apy, data.lock_period
        )

        # 计算到期日期
        start_date = datetime.now(timezone.utc)
        end_date = Subscription.calculate_end_date(start_date, data.lock_period)

        # 计算 RWA Token 数量 (基于当前价格)
        rwa_token_amount = (
            data.amount / asset.current_price
            if asset.current_price > 0
            else data.amount
        )

        return SubscriptionPreviewResponse(
            asset_id=asset.id,
            asset_name=asset.name,
            asset_symbol=asset.symbol,
            amount=float(data.amount),
            token_type=data.token_type.value,
            lock_period=data.lock_period,
            apy=float(apy),
            expected_interest=float(expected_interest),
            total_return=float(data.amount + expected_interest),
            end_date=end_date,
            rwa_token_amount=float(rwa_token_amount),
        )

    async def create_subscription(
        self, wallet_address: str, data: SubscriptionCreateRequest
    ) -> SubscriptionResponse:
        """
        创建认购 (幂等性)

        幂等性保证:
        1. 如果 tx_hash 已存在，返回已有记录
        2. 使用分布式锁防止并发创建
        3. 数据库唯一约束作为最后防线

        参数:
            wallet_address: 用户钱包地址
            data: 创建请求

        返回:
            认购响应
        """
        # ===== Step 1: 快速检查 - 如果已存在直接返回 (幂等性) =====
        if data.tx_hash:
            existing = (
                await Subscription.filter(
                    tx_hash=data.tx_hash, environment=self.network
                )
                .prefetch_related("asset")
                .first()
            )

            if existing:
                # 幂等性: 返回已存在的记录，不报错
                return await self._to_response(existing)

        # ===== Step 2: 获取分布式锁 =====
        lock_service = await DistributedLockService.get_instance()
        lock_key = f"subscription:{data.tx_hash or wallet_address}:{data.asset_id}"

        try:
            async with lock_service.lock(lock_key, timeout=30):
                # ===== Step 3: 双重检查 (锁内再查一次) =====
                if data.tx_hash:
                    existing = (
                        await Subscription.filter(
                            tx_hash=data.tx_hash, environment=self.network
                        )
                        .prefetch_related("asset")
                        .first()
                    )

                    if existing:
                        return await self._to_response(existing)

                # ===== Step 4: 执行实际创建 =====
                return await self._do_create_subscription(wallet_address, data)

        except LockAcquireError:
            # 锁获取失败，可能是另一个请求正在处理
            # 等待后再查一次
            await asyncio.sleep(0.5)

            if data.tx_hash:
                existing = (
                    await Subscription.filter(
                        tx_hash=data.tx_hash, environment=self.network
                    )
                    .prefetch_related("asset")
                    .first()
                )

                if existing:
                    return await self._to_response(existing)

            raise BusinessException(code=409, message="请求处理中，请稍后重试")

    async def _do_create_subscription(
        self, wallet_address: str, data: SubscriptionCreateRequest
    ) -> SubscriptionResponse:
        """
        执行实际的创建逻辑 (内部方法)

        参数:
            wallet_address: 用户钱包地址
            data: 创建请求

        返回:
            认购响应
        """
        # 获取资产
        asset = await Asset.filter(
            id=data.asset_id, environment=self.network
        ).first()

        if not asset:
            raise BusinessException(code=404, message="Asset not found")

        if not asset.is_available:
            raise BusinessException(
                code=400, message="Asset is not available for subscription"
            )

        # 检查剩余额度
        if data.amount > asset.remaining_amount:
            raise BusinessException(
                code=400,
                message=f"Subscription amount exceeds remaining supply ({asset.remaining_amount})",
            )

        # 获取 APY
        apy = self._get_apy_for_period(asset, data.lock_period)

        # 计算
        start_date = datetime.now(timezone.utc)
        end_date = Subscription.calculate_end_date(start_date, data.lock_period)
        expected_interest = Subscription.calculate_expected_interest(
            data.amount, apy, data.lock_period
        )
        rwa_token_amount = (
            data.amount / asset.current_price
            if asset.current_price > 0
            else data.amount
        )

        try:
            # 使用事务保护：创建认购记录 + 更新资产供应量必须原子执行
            async with in_transaction() as conn:
                # 创建认购记录
                subscription = await Subscription.create(
                    wallet_address=wallet_address.lower(),
                    asset=asset,
                    amount=data.amount,
                    token_type=data.token_type,
                    lock_period=data.lock_period,
                    apy=apy,
                    rwa_token_amount=rwa_token_amount,
                    start_date=start_date,
                    end_date=end_date,
                    original_end_date=end_date,
                    expected_interest=expected_interest,
                    tx_hash=data.tx_hash,
                    status=SubscriptionStatus.ACTIVE,
                    environment=self.network,
                    using_db=conn,
                )

                # 更新资产已认购金额（在同一事务中）
                await self.asset_service.update_subscribed_amount(
                    asset.id, data.amount, is_add=True
                )

        except IntegrityError:
            # 数据库唯一约束冲突 - 说明记录已被创建 (并发情况)
            # 返回已存在的记录
            if data.tx_hash:
                existing = (
                    await Subscription.filter(
                        tx_hash=data.tx_hash, environment=self.network
                    )
                    .prefetch_related("asset")
                    .first()
                )

                if existing:
                    return await self._to_response(existing)

            raise BusinessException(code=409, message="认购记录创建冲突，请重试")

        return await self._to_response(subscription)

    async def list_subscriptions(
        self,
        wallet_address: str,
        status: Optional[SubscriptionStatus] = None,
        asset_id: Optional[int] = None,
        page: int = 1,
        page_size: int = 10,
    ) -> Tuple[List[SubscriptionResponse], int, int]:
        """
        获取用户认购列表

        参数:
            wallet_address: 用户钱包地址
            status: 状态筛选
            asset_id: 资产筛选
            page: 页码
            page_size: 每页数量

        返回:
            (列表, 总数, 总页数)
        """
        query = Subscription.filter(
            wallet_address=wallet_address.lower(), environment=self.network
        )

        if status:
            query = query.filter(status=status)
        if asset_id:
            query = query.filter(asset_id=asset_id)

        total = await query.count()
        total_pages = (total + page_size - 1) // page_size

        offset = (page - 1) * page_size
        subscriptions = (
            await query.order_by("-created_at")
            .offset(offset)
            .limit(page_size)
            .prefetch_related("asset")
        )

        # 自动更新到期状态
        for sub in subscriptions:
            if sub.status == SubscriptionStatus.ACTIVE and sub.is_matured:
                sub.status = SubscriptionStatus.MATURED
                await sub.save()

        return ([await self._to_response(s) for s in subscriptions], total, total_pages)

    async def get_subscription(
        self, subscription_id: int, wallet_address: str
    ) -> Optional[SubscriptionResponse]:
        """
        获取认购详情

        参数:
            subscription_id: 认购ID
            wallet_address: 用户钱包地址

        返回:
            认购详情或 None
        """
        subscription = (
            await Subscription.filter(
                id=subscription_id,
                wallet_address=wallet_address.lower(),
                environment=self.network,
            )
            .prefetch_related("asset")
            .first()
        )

        if not subscription:
            return None

        # 自动更新到期状态
        if subscription.status == SubscriptionStatus.ACTIVE and subscription.is_matured:
            subscription.status = SubscriptionStatus.MATURED
            await subscription.save()

        return await self._to_response(subscription)

    async def redeem_subscription(
        self, subscription_id: int, wallet_address: str, tx_hash: str
    ) -> SubscriptionResponse:
        """
        赎回认购

        参数:
            subscription_id: 认购ID
            wallet_address: 用户钱包地址
            tx_hash: 赎回交易哈希

        返回:
            更新后的认购响应
        """
        subscription = (
            await Subscription.filter(
                id=subscription_id,
                wallet_address=wallet_address.lower(),
                environment=self.network,
            )
            .prefetch_related("asset")
            .first()
        )

        if not subscription:
            raise BusinessException(code=404, message="Subscription not found")

        if subscription.status == SubscriptionStatus.REDEEMED:
            raise BusinessException(code=400, message="Subscription already redeemed")

        if not subscription.is_matured:
            raise BusinessException(
                code=400, message="Subscription has not matured yet"
            )

        # 使用事务保护：更新认购状态 + 更新资产供应量必须原子执行
        async with in_transaction() as conn:
            # 更新状态
            subscription.status = SubscriptionStatus.REDEEMED
            subscription.redeemed_at = datetime.now(timezone.utc)
            subscription.redeem_tx_hash = tx_hash
            subscription.actual_interest = (
                subscription.expected_interest
            )  # 简化：实际利息=预期利息
            await subscription.save(using_db=conn)

            # 更新资产已认购金额
            await self.asset_service.update_subscribed_amount(
                subscription.asset_id, subscription.amount, is_add=False
            )

        return await self._to_response(subscription)

    async def get_user_stats(self, wallet_address: str) -> dict:
        """
        获取用户统计数据

        参数:
            wallet_address: 用户钱包地址

        返回:
            统计数据
        """
        subscriptions = await Subscription.filter(
            wallet_address=wallet_address.lower(), environment=self.network
        ).prefetch_related("asset")

        total_invested = Decimal(0)
        total_value = Decimal(0)
        total_earnings = Decimal(0)
        active_count = 0

        for sub in subscriptions:
            if sub.status in [SubscriptionStatus.ACTIVE, SubscriptionStatus.MATURED]:
                total_invested += sub.amount
                total_value += sub.total_return
                total_earnings += sub.expected_interest
                active_count += 1
            elif sub.status == SubscriptionStatus.REDEEMED:
                total_earnings += sub.actual_interest

        return {
            "total_invested": float(total_invested),
            "total_value": float(total_value),
            "total_earnings": float(total_earnings),
            "active_subscriptions": active_count,
            "total_subscriptions": len(subscriptions),
        }

    def _get_apy_for_period(self, asset: Asset, lock_period: int) -> Decimal:
        """获取锁定期对应的 APY (活期模式使用基础 APY)"""
        if lock_period == 0:  # 活期模式
            return (
                asset.apy_flexible
                if hasattr(asset, "apy_flexible")
                else asset.apy_3m * Decimal("0.6")
            )  # 活期约为 3月期的 60%
        elif lock_period == 3:
            return asset.apy_3m
        elif lock_period == 6:
            return asset.apy_6m
        elif lock_period == 12:
            return asset.apy_12m
        else:
            # 默认使用活期 APY
            return (
                asset.apy_flexible
                if hasattr(asset, "apy_flexible")
                else asset.apy_3m * Decimal("0.6")
            )

    async def _to_response(self, subscription: Subscription) -> SubscriptionResponse:
        """转换为响应"""
        # 确保已加载关联的 asset
        if not hasattr(subscription, "asset") or subscription.asset is None:
            await subscription.fetch_related("asset")

        asset = subscription.asset

        return SubscriptionResponse(
            id=subscription.id,
            wallet_address=subscription.wallet_address,
            asset_id=subscription.asset_id,
            asset_name=asset.name if asset else None,
            asset_symbol=asset.symbol if asset else None,
            amount=float(subscription.amount),
            token_type=subscription.token_type.value,
            lock_period=subscription.lock_period,
            apy=float(subscription.apy),
            rwa_token_amount=float(subscription.rwa_token_amount),
            start_date=subscription.start_date,
            end_date=subscription.end_date,
            expected_interest=float(subscription.expected_interest),
            actual_interest=float(subscription.actual_interest),
            total_return=float(subscription.total_return),
            days_remaining=subscription.days_remaining,
            is_matured=subscription.is_matured,
            status=subscription.status,
            tx_hash=subscription.tx_hash,
            redeem_tx_hash=subscription.redeem_tx_hash,
            environment=subscription.environment,
            created_at=subscription.created_at,
            updated_at=subscription.updated_at,
        )
