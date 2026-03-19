"""
认购领域 - 业务服务层

幂等性设计:
- 使用 tx_hash 作为唯一标识
- 相同 tx_hash 的请求返回已存在记录
- 使用 Redis 分布式锁防止并发创建
- 数据库唯一约束作为最后防线
"""

import asyncio
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import List, Optional, Tuple

from falib.utils.config import SETTINGS
from falib.utils.log import get_logger
from tortoise.exceptions import IntegrityError
from web3 import AsyncHTTPProvider, AsyncWeb3
from web3.exceptions import TransactionNotFound

from src.common.adapters import get_async_redis_adapter
from src.common.exceptions import BusinessException
from src.common.utils import calculate_total_pages
from src.infra.lock_service import DistributedLockService, LockAcquireError
from src.models.asset import Asset
from src.models.contracts.contract_deployment import ContractDeployment
from src.models.subscription import Subscription
from src.schemas.enums import ChainID, ContractStatus, SubscriptionStatus
from src.schemas.enums.asset import AssetSubscriptionMode
from src.schemas.subscription import (
    SubscriptionConfirmRequest,
    SubscriptionCreateRequest,
    SubscriptionPendingRequest,
    SubscriptionPendingResponse,
    SubscriptionPreviewRequest,
    SubscriptionPreviewResponse,
    SubscriptionResponse,
    TransactionReceiptResponse,
)

logger = get_logger("business.subscription.service")
PENDING_ORDER_TTL_SECONDS = 15 * 60


class SubscriptionService:
    """认购服务"""

    def __init__(self):
        pass

    # ============ Interest Calculation (原 models/subscription.py) ============

    @staticmethod
    def calculate_expected_interest(
        amount: Decimal, apy: Decimal, lock_months: int
    ) -> Decimal:
        """计算预期利息 (活期模式: lock_months=0 时按实际持有时间计算)"""
        if lock_months == 0:
            # 活期模式：预期利息暂时按 1 个月估算
            return amount * (apy / 100) * (Decimal(1) / Decimal(12))
        # 利息 = 本金 × APY × (锁定月数/12)
        return amount * (apy / 100) * (Decimal(lock_months) / Decimal(12))

    @staticmethod
    def calculate_end_date(start_date: datetime, lock_months: int) -> datetime:
        """计算到期日期 (活期模式: lock_months=0 时立即可赎回)"""
        if lock_months == 0:
            # 活期模式：立即可赎回
            return start_date
        # 简单计算：每月按30天
        return start_date + timedelta(days=lock_months * 30)

    @property
    def network(self) -> str:
        """获取当前网络"""
        return SETTINGS.network

    @property
    def rpc_url(self) -> str:
        """获取 RPC URL"""
        return SETTINGS.CRYPTO.MAINNET_URL

    def _pending_order_key(self, order_id: str) -> str:
        return f"subscription:pending:{self.network}:{order_id}"

    async def _get_subscription_contract_address(self, chain_id: int) -> Optional[str]:
        """获取当前网络下订阅合约地址"""
        try:
            network = ChainID.from_value_to_name(chain_id)
        except ValueError:
            return None
        deployment = await ContractDeployment.filter(
            name="VankeSubscription",
            network=network,
            chain_id=chain_id,
            status=ContractStatus.ACTIVE,
        ).first()
        return deployment.address.lower() if deployment else None

    async def create_pending_order(
        self,
        wallet_address: str,
        data: SubscriptionPendingRequest,
    ) -> SubscriptionPendingResponse:
        """创建待确认认购订单（存储在 Redis）"""
        asset = await Asset.filter(id=data.asset_id, environment=self.network).first()
        if not asset:
            raise BusinessException(code=404, message="Asset not found")

        self._validate_lock_period_for_asset_mode(asset, data.lock_period)

        now = datetime.now(timezone.utc)
        if asset.subscription_start_at and now < asset.subscription_start_at:
            raise BusinessException(
                code=400, message="Subscription has not started yet"
            )
        if asset.subscription_end_at and now >= asset.subscription_end_at:
            raise BusinessException(code=400, message="Subscription period has ended")
        if not asset.is_available:
            raise BusinessException(
                code=400, message="Asset is not available for subscription"
            )
        if data.amount < asset.min_subscription:
            raise BusinessException(
                code=400,
                message=f"Minimum subscription amount is {asset.min_subscription}",
            )
        if data.amount > asset.remaining_amount:
            raise BusinessException(
                code=400,
                message=(
                    "Subscription amount exceeds remaining supply "
                    f"({asset.remaining_amount})"
                ),
            )

        order_id = str(uuid.uuid4())
        expires_at = now + timedelta(seconds=PENDING_ORDER_TTL_SECONDS)
        payload = {
            "order_id": order_id,
            "wallet_address": wallet_address.lower(),
            "asset_id": data.asset_id,
            "amount": str(data.amount),
            "token_type": data.token_type.value,
            "lock_period": int(data.lock_period),
            "created_at": now.isoformat(),
            "expires_at": expires_at.isoformat(),
        }

        async with get_async_redis_adapter() as redis:
            await redis.set_json(self._pending_order_key(order_id), payload)
            await redis.expire(
                self._pending_order_key(order_id), PENDING_ORDER_TTL_SECONDS
            )

        return SubscriptionPendingResponse(
            order_id=order_id,
            status="pending_confirmation",
            expires_at=expires_at,
        )

    async def get_transaction_receipt(self, tx_hash: str) -> TransactionReceiptResponse:
        """查询链上交易回执状态"""
        web3 = AsyncWeb3(AsyncHTTPProvider(self.rpc_url))
        tx_hash = tx_hash.lower()

        try:
            receipt = await web3.eth.get_transaction_receipt(tx_hash)
        except TransactionNotFound:
            return TransactionReceiptResponse(status="pending")

        status = "success" if int(receipt.get("status", 0)) == 1 else "failed"
        block_number = receipt.get("blockNumber")
        latest_block = await web3.eth.block_number
        confirmations = (
            max(0, int(latest_block) - int(block_number) + 1)
            if block_number is not None
            else None
        )

        return TransactionReceiptResponse(
            status=status,
            block_number=int(block_number) if block_number is not None else None,
            gas_used=str(receipt.get("gasUsed", 0)),
            effective_gas_price=str(receipt.get("effectiveGasPrice", 0)),
            confirmations=confirmations,
        )

    async def confirm_pending_order(
        self,
        wallet_address: str,
        data: SubscriptionConfirmRequest,
        using_db=None,
    ) -> tuple[SubscriptionResponse, bool]:
        """确认待处理订单并落库认购记录（返回: 响应, 是否新建）"""
        tx_hash = data.tx_hash.lower()

        existing = (
            await Subscription.filter(tx_hash=tx_hash, environment=self.network)
            .prefetch_related("asset")
            .first()
        )
        if existing:
            return await self._to_response(existing), False

        async with get_async_redis_adapter() as redis:
            order_key = self._pending_order_key(data.order_id)
            order = await redis.get_json(order_key)

        if not order:
            raise BusinessException(
                code=404, message="Pending order not found or expired"
            )
        if order.get("wallet_address") != wallet_address.lower():
            raise BusinessException(
                code=403, message="Order does not belong to current user"
            )

        expires_at = datetime.fromisoformat(order["expires_at"])
        if expires_at < datetime.now(timezone.utc):
            raise BusinessException(code=400, message="Pending order expired")

        receipt = await self.get_transaction_receipt(tx_hash)
        if receipt.status == "pending":
            raise BusinessException(code=409, message="Transaction is still pending")
        if receipt.status != "success":
            raise BusinessException(code=400, message="On-chain transaction failed")

        web3 = AsyncWeb3(AsyncHTTPProvider(self.rpc_url))
        chain_id = await web3.eth.chain_id
        expected_contract = await self._get_subscription_contract_address(int(chain_id))
        if expected_contract:
            tx = await web3.eth.get_transaction(tx_hash)
            tx_to = tx.get("to")
            if not tx_to or str(tx_to).lower() != expected_contract:
                raise BusinessException(
                    code=400,
                    message="Transaction target contract mismatch",
                )

        create_data = SubscriptionCreateRequest(
            asset_id=int(order["asset_id"]),
            amount=Decimal(str(order["amount"])),
            token_type=order["token_type"],
            lock_period=int(order["lock_period"]),
            tx_hash=tx_hash,
        )

        result = await self.create_subscription(
            wallet_address, create_data, using_db=using_db
        )

        async with get_async_redis_adapter() as redis:
            await redis.delete(self._pending_order_key(data.order_id))

        return result, True

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
        asset = await Asset.filter(id=data.asset_id, environment=self.network).first()

        if not asset:
            raise BusinessException(code=404, message="Asset not found")

        if not asset.is_available:
            raise BusinessException(
                code=400, message="Asset is not available for subscription"
            )

        self._validate_lock_period_for_asset_mode(asset, data.lock_period)

        # 检查最小认购金额
        if data.amount < asset.min_subscription:
            raise BusinessException(
                code=400,
                message=f"Minimum subscription amount is {asset.min_subscription}",
            )

        # 获取对应锁定期的 APY
        apy = self._get_apy_for_period(asset, data.lock_period)

        # 计算预期利息
        expected_interest = self.calculate_expected_interest(
            data.amount, apy, data.lock_period
        )

        # 计算到期日期
        start_date = datetime.now(timezone.utc)
        end_date = self.calculate_end_date(start_date, data.lock_period)

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
        self,
        wallet_address: str,
        data: SubscriptionCreateRequest,
        using_db=None,
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
            using_db: 可选的外部事务连接

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
                return await self._do_create_subscription(
                    wallet_address, data, using_db=using_db
                )

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
        self,
        wallet_address: str,
        data: SubscriptionCreateRequest,
        using_db=None,
    ) -> SubscriptionResponse:
        """
        执行实际的创建逻辑 (内部方法)

        事务由 API 层管理，本方法仅负责创建 Subscription 记录。

        参数:
            wallet_address: 用户钱包地址
            data: 创建请求
            using_db: 可选的外部事务连接

        返回:
            认购响应
        """
        # 获取资产
        asset = await Asset.filter(id=data.asset_id, environment=self.network).first()

        if not asset:
            raise BusinessException(code=404, message="Asset not found")

        # 检查认购时间窗口 (更精确的错误消息)
        now = datetime.now(timezone.utc)
        if asset.subscription_start_at and now < asset.subscription_start_at:
            raise BusinessException(
                code=400, message="Subscription has not started yet"
            )
        if asset.subscription_end_at and now >= asset.subscription_end_at:
            raise BusinessException(code=400, message="Subscription period has ended")

        if not asset.is_available:
            raise BusinessException(
                code=400, message="Asset is not available for subscription"
            )

        self._validate_lock_period_for_asset_mode(asset, data.lock_period)

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
        end_date = self.calculate_end_date(start_date, data.lock_period)
        expected_interest = self.calculate_expected_interest(
            data.amount, apy, data.lock_period
        )
        rwa_token_amount = (
            data.amount / asset.current_price
            if asset.current_price > 0
            else data.amount
        )

        try:
            # 创建认购记录（事务由 API 层管理）
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
                using_db=using_db,
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
        total_pages = calculate_total_pages(total, page_size)

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
        self,
        subscription_id: int,
        wallet_address: str,
        tx_hash: str,
        using_db=None,
    ) -> SubscriptionResponse:
        """
        赎回认购

        事务由 API 层管理，本方法仅负责更新 Subscription 状态。

        参数:
            subscription_id: 认购ID
            wallet_address: 用户钱包地址
            tx_hash: 赎回交易哈希
            using_db: 可选的外部事务连接

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

        # 更新状态（事务由 API 层管理）
        subscription.status = SubscriptionStatus.REDEEMED
        subscription.redeemed_at = datetime.now(timezone.utc)
        subscription.redeem_tx_hash = tx_hash
        subscription.actual_interest = (
            subscription.expected_interest
        )  # 简化：实际利息=预期利息
        await subscription.save(using_db=using_db)

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
                # 未赎回前不计入预期收益：当前价值按本金计算
                total_value += sub.amount
                active_count += 1
            elif sub.status == SubscriptionStatus.REDEEMED:
                # 已赎回后才计入已实现收益
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

    def _validate_lock_period_for_asset_mode(
        self, asset: Asset, lock_period: int
    ) -> None:
        """根据资产认购模式校验锁定期参数"""
        mode = getattr(asset, "subscription_mode", AssetSubscriptionMode.BOTH)

        if mode == AssetSubscriptionMode.CURRENT and lock_period != 0:
            raise BusinessException(
                code=400,
                message="This asset only supports current product (lock_period must be 0)",
            )

        if mode == AssetSubscriptionMode.FIXED and lock_period == 0:
            raise BusinessException(
                code=400,
                message="This asset only supports fixed-term product (lock_period must be 3/6/12)",
            )

    async def _to_response(self, subscription: Subscription) -> SubscriptionResponse:
        """转换为响应"""
        # 确保已加载关联的 asset
        if not hasattr(subscription, "asset") or subscription.asset is None:
            await subscription.fetch_related("asset")

        asset = subscription.asset

        if subscription.actual_interest > 0:
            display_interest = subscription.actual_interest
        elif subscription.lock_period == 0:
            display_interest = subscription.get_redeemable_interest()
        else:
            display_interest = subscription.expected_interest

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
            expected_interest=float(display_interest),
            actual_interest=float(subscription.actual_interest),
            total_return=float(subscription.amount + display_interest),
            days_remaining=subscription.days_remaining,
            is_matured=subscription.is_matured,
            status=subscription.status,
            tx_hash=subscription.tx_hash,
            redeem_tx_hash=subscription.redeem_tx_hash,
            environment=subscription.environment,
            created_at=subscription.created_at,
            updated_at=subscription.updated_at,
        )


# 全局服务实例
