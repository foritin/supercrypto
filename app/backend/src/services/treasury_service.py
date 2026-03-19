"""
国库多签服务 - Treasury Multisig Service

处理赎回请求的全生命周期管理:
- 创建赎回请求
- 提交多签签名
- 检查阈值并执行
- 查询统计信息
"""

import asyncio
import re
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, List, Optional, Tuple

from falib.utils.config import SETTINGS
from falib.utils.log import get_logger
from web3 import AsyncHTTPProvider, AsyncWeb3

from src.common.adapters import get_async_web3_adapter
from src.common.exceptions import (
    BusinessException,
    NotFoundException,
    ValidationException,
)
from src.common.utils import calculate_total_pages
from src.models.account import Account
from src.models.contracts import ContractDeployment
from src.models.redemption import (
    RedemptionEvent,
    RedemptionRequest,
    RedemptionSignature,
)
from src.models.subscription import Subscription
from src.schemas.enums import (
    ContractScope,
    ContractStatus,
    ContractType,
    SubscriptionStatus,
)
from src.schemas.enums.redemption import RedemptionEventType, RedemptionStatus
from src.schemas.redemption import (
    RedemptionDetailResponse,
    RedemptionEventResponse,
    RedemptionQueueItemResponse,
    RedemptionRequestResponse,
    RedemptionSignatureResponse,
    SignerInfoResponse,
    TreasuryConfigResponse,
    TreasuryStatsResponse,
)
from src.services.storage_service import StorageService

logger = get_logger("business.treasury.service")
TX_HASH_PATTERN = re.compile(r"^0x[a-fA-F0-9]{64}$")

# 默认多签配置
DEFAULT_REQUIRED_SIGNATURES = 2
DEFAULT_SIGNER_COUNT = 3


class TreasuryService:
    """国库多签服务"""

    _nonce_lock = asyncio.Lock()

    def __init__(self):
        pass

    @property
    def network(self) -> str:
        """获取当前网络"""
        return SETTINGS.network

    # ============ Redemption Request Management ============

    async def create_redemption_request(
        self,
        subscription_id: int,
        wallet_address: str,
    ) -> RedemptionRequestResponse:
        """
        创建赎回请求

        流程:
        1. 验证 subscription 存在且属于用户
        2. 验证 subscription 已到期 (matured)
        3. 验证 KYC 状态 (通过合约层验证)
        4. 计算本金+利息
        5. 检查是否已有未完成的赎回请求
        6. 创建数据库记录
        7. 发送通知给多签成员 (待实现)

        Args:
            subscription_id: 认购ID
            wallet_address: 用户钱包地址

        Returns:
            创建的赎回请求响应

        Raises:
            NotFoundException: 认购不存在
            ValidationException: 认购未到期或已有未完成请求
        """
        wallet_address = wallet_address.lower()

        # 获取认购记录
        subscription = (
            await Subscription.filter(
                id=subscription_id,
                wallet_address=wallet_address,
                environment=self.network,
            )
            .prefetch_related("asset")
            .first()
        )

        if not subscription:
            raise NotFoundException("Subscription not found")

        # 检查是否已赎回
        if subscription.status == SubscriptionStatus.REDEEMED:
            raise ValidationException("Subscription already redeemed")

        # 检查是否到期
        if not subscription.can_redeem:
            raise ValidationException("Subscription has not matured yet")

        # 检查是否已有未完成的赎回请求
        existing = await RedemptionRequest.filter(
            subscription_id=subscription_id,
            wallet_address=wallet_address,
            status__in=[RedemptionStatus.PENDING, RedemptionStatus.APPROVED],
            environment=self.network,
        ).first()

        if existing:
            raise ValidationException(
                "There is already a pending redemption request for this subscription"
            )

        # 计算金额
        principal = subscription.amount
        if subscription.actual_interest > 0:
            interest = subscription.actual_interest
        elif subscription.lock_period == 0:
            interest = subscription.get_redeemable_interest()
        else:
            interest = subscription.expected_interest
        total_amount = principal + interest

        # 创建赎回请求（先落库，随后创建链上提案）
        redemption = await RedemptionRequest.create(
            subscription=subscription,
            wallet_address=wallet_address,
            principal=principal,
            interest=interest,
            total_amount=total_amount,
            status=RedemptionStatus.PENDING,
            environment=self.network,
        )
        await self._record_event(
            redemption=redemption,
            event_type=RedemptionEventType.REQUEST_CREATED,
            status=RedemptionStatus.PENDING,
            actor_address=wallet_address,
            message="Redemption request created",
            metadata={
                "subscription_id": subscription.id,
                "principal": str(principal),
                "interest": str(interest),
                "total_amount": str(total_amount),
            },
        )

        try:
            (
                proposal_id,
                proposal_tx_hash,
            ) = await self._create_onchain_redemption_proposal(
                redemption=redemption,
                subscription=subscription,
                token_type=subscription.token_type,
            )
        except Exception as exc:
            await redemption.delete()
            raise ValidationException(
                f"Failed to create on-chain redemption proposal: {exc}"
            ) from exc

        redemption.proposal_id = proposal_id
        redemption.proposal_tx_hash = proposal_tx_hash
        redemption.status = RedemptionStatus.APPROVED
        await redemption.save()
        await self._record_event(
            redemption=redemption,
            event_type=RedemptionEventType.PROPOSAL_CREATED,
            status=RedemptionStatus.APPROVED,
            tx_hash=proposal_tx_hash,
            message="On-chain redemption proposal created",
            metadata={"proposal_id": proposal_id},
        )

        logger.info(
            f"Redemption request created: id={redemption.id}, "
            f"subscription={subscription_id}, wallet={wallet_address[:10]}..., "
            f"amount={total_amount}, proposal_id={proposal_id}, tx={proposal_tx_hash[:10]}..."
        )

        return await self._to_response(redemption)

    async def submit_signature(
        self,
        redemption_id: int,
        signer_address: str,
        tx_hash: str,
    ) -> RedemptionRequestResponse:
        """
        提交签名

        流程:
        1. 验证赎回请求存在且状态正确
        2. 验证签名者身份 (是否为多签成员)
        3. 验证是否已签名
        4. 记录签名到数据库
        5. 检查是否达到阈值
        6. 如达到阈值，触发执行

        Args:
            redemption_id: 赎回请求ID
            signer_address: 签名者地址
            tx_hash: 签名交易哈希

        Returns:
            更新后的赎回请求响应
        """
        signer_address = signer_address.lower()
        tx_hash = tx_hash.lower()

        if not TX_HASH_PATTERN.match(tx_hash):
            raise ValidationException("Invalid transaction hash format")

        # 获取赎回请求
        redemption = await self._get_redemption_by_id(redemption_id)

        if redemption.status not in [
            RedemptionStatus.PENDING,
            RedemptionStatus.APPROVED,
        ]:
            raise ValidationException("Redemption request is not in signable status")

        if redemption.proposal_id is None:
            raise ValidationException(
                "Redemption request has no on-chain proposal id; cannot submit signature"
            )

        await self._verify_onchain_signature(
            proposal_id=redemption.proposal_id,
            signer_address=signer_address,
        )

        # 检查是否已签名
        existing_sig = await RedemptionSignature.filter(
            redemption=redemption,
            signer_address=signer_address,
        ).first()

        if existing_sig:
            raise ValidationException("You have already signed this redemption request")

        # 记录签名
        await RedemptionSignature.create(
            redemption=redemption,
            signer_address=signer_address,
            tx_hash=tx_hash,
        )

        required = await self._get_required_signatures()
        current_signature_count = await RedemptionSignature.filter(
            redemption=redemption
        ).count()

        # 更新状态为 APPROVED (已有签名)
        if redemption.status == RedemptionStatus.PENDING:
            redemption.status = RedemptionStatus.APPROVED
            await redemption.save()

        await self._record_event(
            redemption=redemption,
            event_type=RedemptionEventType.SIGNATURE_SUBMITTED,
            status=redemption.status,
            actor_address=signer_address,
            tx_hash=tx_hash,
            message="Multisig signer submitted signature",
            metadata={
                "signature_count": current_signature_count,
                "required_signatures": required,
            },
        )

        logger.info(
            f"Signature submitted: redemption={redemption_id}, "
            f"signer={signer_address[:10]}..., tx={tx_hash[:10]}..."
        )

        # 检查是否达到阈值（达到后需由 contract_owner 显式执行链上 proposal）
        await self.check_and_execute(redemption_id)

        # 重新加载并返回
        redemption = await self._get_redemption_by_id(redemption_id)
        return await self._to_response(redemption)

    async def check_and_execute(self, redemption_id: int) -> bool:
        """
        检查签名数量是否达到阈值

        注意：达到阈值后不会自动改为 EXECUTED，
        必须由 contract_owner 在链上调用 execute_proposal 后，
        再通过 execute_redemption 回写执行结果。

        Args:
            redemption_id: 赎回请求ID

        Returns:
            是否达到阈值
        """
        redemption = await self._get_redemption_by_id(redemption_id)

        if redemption.status not in [
            RedemptionStatus.PENDING,
            RedemptionStatus.APPROVED,
        ]:
            return False

        # 获取签名数量
        sig_count = await RedemptionSignature.filter(redemption=redemption).count()

        # 获取所需签名数 (从配置或默认)
        required = await self._get_required_signatures()

        if sig_count >= required:
            threshold_recorded = await RedemptionEvent.filter(
                redemption=redemption,
                event_type=RedemptionEventType.THRESHOLD_REACHED,
            ).exists()
            if not threshold_recorded:
                await self._record_event(
                    redemption=redemption,
                    event_type=RedemptionEventType.THRESHOLD_REACHED,
                    status=redemption.status,
                    message="Signature threshold reached",
                    metadata={
                        "signature_count": sig_count,
                        "required_signatures": required,
                    },
                )
            logger.info(
                f"Redemption threshold reached: id={redemption_id}, signatures={sig_count}/{required}"
            )
            return True

        return False

    async def execute_redemption(
        self,
        redemption_id: int,
        executor_address: str,
        tx_hash: str,
    ) -> RedemptionRequestResponse:
        """回写链上 execute_proposal 结果并闭环赎回状态。"""
        executor_address = executor_address.lower()
        tx_hash = tx_hash.lower()

        if not TX_HASH_PATTERN.match(tx_hash):
            raise ValidationException("Invalid transaction hash format")

        redemption = await self._get_redemption_by_id(redemption_id)

        if redemption.status == RedemptionStatus.EXECUTED:
            raise ValidationException("Redemption request already executed")

        if redemption.status == RedemptionStatus.REJECTED:
            raise ValidationException("Cannot execute redemption in current status")

        if redemption.proposal_id is None:
            raise ValidationException("Redemption request has no on-chain proposal id")

        await self._verify_onchain_execution(
            proposal_id=redemption.proposal_id,
            executor_address=executor_address,
        )

        now = datetime.now(timezone.utc)
        redemption.status = RedemptionStatus.EXECUTED
        redemption.executed_at = now
        redemption.execute_tx_hash = tx_hash
        await redemption.save()
        await self._record_event(
            redemption=redemption,
            event_type=RedemptionEventType.EXECUTED,
            status=RedemptionStatus.EXECUTED,
            actor_address=executor_address,
            tx_hash=tx_hash,
            message="Redemption executed on-chain",
        )

        subscription = await redemption.subscription
        if subscription.status != SubscriptionStatus.REDEEMED:
            subscription.status = SubscriptionStatus.REDEEMED
            subscription.redeemed_at = now
            await subscription.save()

        logger.info(
            f"Redemption executed (confirmed): id={redemption_id}, executor={executor_address[:10]}..., tx={tx_hash[:10]}..."
        )

        return await self._to_response(redemption)

    async def reject_redemption(
        self,
        redemption_id: int,
        rejected_by: str,
        reason: Optional[str] = None,
    ) -> RedemptionRequestResponse:
        """
        拒绝赎回请求

        Args:
            redemption_id: 赎回请求ID
            rejected_by: 拒绝者地址
            reason: 拒绝原因

        Returns:
            更新后的赎回请求响应
        """
        rejected_by = rejected_by.lower()

        redemption = await self._get_redemption_by_id(redemption_id)

        if redemption.status not in [
            RedemptionStatus.PENDING,
            RedemptionStatus.APPROVED,
        ]:
            raise ValidationException("Cannot reject redemption in current status")

        redemption.status = RedemptionStatus.REJECTED
        redemption.rejected_at = datetime.now(timezone.utc)
        redemption.rejected_by = rejected_by
        redemption.rejection_reason = reason
        await redemption.save()
        await self._record_event(
            redemption=redemption,
            event_type=RedemptionEventType.REJECTED,
            status=RedemptionStatus.REJECTED,
            actor_address=rejected_by,
            message="Redemption request rejected",
            metadata={"reason": reason} if reason else None,
        )

        logger.info(
            f"Redemption rejected: id={redemption_id}, by={rejected_by[:10]}..., reason={reason}"
        )

        return await self._to_response(redemption)

    # ============ Query Methods ============

    async def get_redemption_queue(
        self,
        status: Optional[RedemptionStatus] = None,
        page: int = 1,
        page_size: int = 50,
    ) -> Tuple[List[RedemptionQueueItemResponse], int, int]:
        """
        获取赎回队列 (Admin view)

        Args:
            status: 状态筛选
            page: 页码
            page_size: 每页数量

        Returns:
            (列表, 总数, 总页数)
        """
        query = RedemptionRequest.filter(environment=self.network)

        if status:
            query = query.filter(status=status)

        total = await query.count()
        total_pages = calculate_total_pages(total, page_size)

        offset = (page - 1) * page_size
        redemptions = (
            await query.order_by("-created_at")
            .offset(offset)
            .limit(page_size)
            .prefetch_related("subscription", "subscription__asset")
        )

        items = []
        for r in redemptions:
            subscription = await r.subscription
            asset = await subscription.asset if subscription else None
            sig_count = await RedemptionSignature.filter(redemption=r).count()

            items.append(
                RedemptionQueueItemResponse(
                    id=r.id,
                    subscription_id=r.subscription_id,
                    wallet_address=r.wallet_address,
                    asset_name=asset.name if asset else None,
                    asset_symbol=asset.symbol if asset else None,
                    principal=float(r.principal),
                    interest=float(r.interest),
                    total_amount=float(r.total_amount),
                    status=r.status,
                    proposal_id=r.proposal_id,
                    created_at=r.created_at,
                    signature_count=sig_count,
                    required_signatures=await self._get_required_signatures(),
                )
            )

        return items, total, total_pages

    async def get_redemption_detail(
        self, redemption_id: int
    ) -> RedemptionDetailResponse:
        """
        获取赎回详情

        Args:
            redemption_id: 赎回请求ID

        Returns:
            赎回详情响应
        """
        redemption = await self._get_redemption_by_id(redemption_id)
        subscription = await redemption.subscription
        asset = await subscription.asset if subscription else None

        # 获取签名信息
        signatures = await RedemptionSignature.filter(redemption=redemption).all()
        sig_count = len(signatures)

        # 构建签名者信息
        signers_info = []
        for sig in signatures:
            signers_info.append(
                SignerInfoResponse(
                    address=sig.signer_address,
                    has_signed=True,
                    signed_at=sig.signed_at,
                    tx_hash=sig.tx_hash,
                )
            )

        events = await RedemptionEvent.filter(redemption=redemption).order_by(
            "created_at"
        )
        event_responses = [
            RedemptionEventResponse(
                id=event.id,
                event_type=event.event_type,
                status=event.status,
                actor_address=event.actor_address,
                tx_hash=event.tx_hash,
                message=event.message,
                metadata=event.metadata,
                created_at=event.created_at,
            )
            for event in events
        ]

        return RedemptionDetailResponse(
            id=redemption.id,
            subscription_id=redemption.subscription_id,
            wallet_address=redemption.wallet_address,
            asset_id=asset.id if asset else 0,
            asset_name=asset.name if asset else None,
            asset_symbol=asset.symbol if asset else None,
            principal=float(redemption.principal),
            interest=float(redemption.interest),
            total_amount=float(redemption.total_amount),
            proposal_id=redemption.proposal_id,
            proposal_tx_hash=redemption.proposal_tx_hash,
            status=redemption.status,
            executed_at=redemption.executed_at,
            execute_tx_hash=redemption.execute_tx_hash,
            created_at=redemption.created_at,
            updated_at=redemption.updated_at,
            environment=redemption.environment,
            signers=signers_info,
            signature_count=sig_count,
            required_signatures=await self._get_required_signatures(),
            rejection_reason=redemption.rejection_reason,
            events=event_responses,
        )

    async def get_user_redemption_detail(
        self,
        redemption_id: int,
        wallet_address: str,
    ) -> RedemptionDetailResponse:
        """获取用户自己的赎回详情（含事件时间轴）。"""
        wallet_address = wallet_address.lower()
        exists = await RedemptionRequest.filter(
            id=redemption_id,
            wallet_address=wallet_address,
            environment=self.network,
        ).exists()
        if not exists:
            raise NotFoundException("Redemption request not found")
        return await self.get_redemption_detail(redemption_id)

    async def get_pending_for_signer(
        self,
        signer_address: str,
    ) -> List[RedemptionRequestResponse]:
        """
        获取需要指定签名者签名的赎回请求

        Args:
            signer_address: 签名者地址

        Returns:
            待签名的赎回请求列表
        """
        signer_address = signer_address.lower()

        # 获取所有待处理/已批准的请求
        redemptions = await RedemptionRequest.filter(
            status__in=[RedemptionStatus.PENDING, RedemptionStatus.APPROVED],
            environment=self.network,
        ).prefetch_related("subscription", "subscription__asset")

        # 过滤掉已签名的
        result = []
        for r in redemptions:
            has_signed = await RedemptionSignature.filter(
                redemption=r,
                signer_address=signer_address,
            ).exists()

            if not has_signed:
                result.append(await self._to_response(r))

        return result

    async def get_user_redemptions(
        self,
        wallet_address: str,
        status: Optional[RedemptionStatus] = None,
        page: int = 1,
        page_size: int = 10,
    ) -> Tuple[List[RedemptionRequestResponse], int, int]:
        """
        获取用户的赎回请求列表

        Args:
            wallet_address: 用户钱包地址
            status: 状态筛选
            page: 页码
            page_size: 每页数量

        Returns:
            (列表, 总数, 总页数)
        """
        wallet_address = wallet_address.lower()

        query = RedemptionRequest.filter(
            wallet_address=wallet_address,
            environment=self.network,
        )

        if status:
            query = query.filter(status=status)

        total = await query.count()
        total_pages = calculate_total_pages(total, page_size)

        offset = (page - 1) * page_size
        redemptions = (
            await query.order_by("-created_at")
            .offset(offset)
            .limit(page_size)
            .prefetch_related("subscription", "subscription__asset")
        )

        items = [await self._to_response(r) for r in redemptions]
        return items, total, total_pages

    async def get_multisig_status(self) -> dict:
        """
        获取多签合约状态

        Returns:
            多签状态信息
        """
        # 从数据库获取多签成员（multisig_signer）和合约所有者（可参与签名）
        multisig_signer_accounts = await Account.filter(
            network=self.network,
            roles__contains=["multisig_signer"],
            is_deleted=False,
        ).all()
        contract_owner_accounts = await Account.filter(
            network=self.network,
            roles__contains=["contract_owner"],
            is_deleted=False,
        ).all()

        signer_addresses = sorted(
            {
                account.address.lower()
                for account in [*multisig_signer_accounts, *contract_owner_accounts]
                if account.address
            }
        )
        required = await self._get_required_signatures()

        return {
            "contract_address": None,  # TODO: 从合约配置获取
            "signers": signer_addresses,
            "signer_count": len(signer_addresses),
            "required_signatures": required,
            "is_initialized": len(signer_addresses) > 0,
        }

    async def get_treasury_stats(self) -> TreasuryStatsResponse:
        """
        获取国库统计信息

        Returns:
            统计信息响应
        """
        # 基础统计
        total = await RedemptionRequest.filter(environment=self.network).count()
        pending = await RedemptionRequest.filter(
            status=RedemptionStatus.PENDING, environment=self.network
        ).count()
        approved = await RedemptionRequest.filter(
            status=RedemptionStatus.APPROVED, environment=self.network
        ).count()
        executed = await RedemptionRequest.filter(
            status=RedemptionStatus.EXECUTED, environment=self.network
        ).count()
        rejected = await RedemptionRequest.filter(
            status=RedemptionStatus.REJECTED, environment=self.network
        ).count()

        # 总赎回金额
        executed_redemptions = await RedemptionRequest.filter(
            status=RedemptionStatus.EXECUTED,
            environment=self.network,
        ).all()
        total_redeemed = sum(r.total_amount for r in executed_redemptions)

        # 平均签名时间 (从创建到执行的平均时间)
        avg_time = None
        if executed_redemptions:
            total_hours = 0
            count = 0
            for r in executed_redemptions:
                if r.executed_at and r.created_at:
                    diff = r.executed_at - r.created_at
                    total_hours += diff.total_seconds() / 3600
                    count += 1
            if count > 0:
                avg_time = total_hours / count

        return TreasuryStatsResponse(
            total_requests=total,
            pending_count=pending,
            approved_count=approved,
            executed_count=executed,
            rejected_count=rejected,
            total_redeemed_amount=float(total_redeemed),
            average_signature_time_hours=avg_time,
        )

    # ============ Dev Tools Methods ============

    async def init_treasury(
        self,
        signer_addresses: List[str],
        required_signatures: int,
    ) -> dict:
        """
        初始化 TreasuryMultisig 合约 (Dev Tools)

        Args:
            signer_addresses: 多签成员地址列表
            required_signatures: 所需签名数

        Returns:
            初始化结果
        """
        prepare_data = await self.prepare_init_treasury(
            signer_addresses=signer_addresses,
            required_signatures=required_signatures,
        )
        return {
            "contract_address": prepare_data["contract_address"],
            "tx_hash": "",
            "signer_count": len(prepare_data["signer_addresses"]),
            "required_signatures": prepare_data["required_signatures"],
        }

    async def prepare_init_treasury(
        self,
        signer_addresses: List[str],
        required_signatures: int,
    ) -> dict:
        """准备 TreasuryMultisig signer 配置交易参数。"""
        signers = self._normalize_signer_addresses(signer_addresses)
        await self._ensure_signers_include_contract_owner(signers)
        self._validate_signer_threshold(signers, required_signatures)

        treasury_contract = await self._get_treasury_multisig_contract()
        treasury_abi = await self._get_contract_abi(treasury_contract)

        return {
            "contract_address": treasury_contract.address,
            "function_name": "owner_configure_signers",
            "abi": treasury_abi,
            "signer_addresses": signers,
            "required_signatures": required_signatures,
        }

    async def confirm_init_treasury(
        self,
        signer_addresses: List[str],
        required_signatures: int,
        tx_hash: str,
    ) -> dict:
        """确认 TreasuryMultisig signer 配置已生效。"""
        signers = self._normalize_signer_addresses(signer_addresses)
        await self._ensure_signers_include_contract_owner(signers)
        self._validate_signer_threshold(signers, required_signatures)

        treasury_contract = await self._get_treasury_multisig_contract()
        treasury_abi = await self._get_contract_abi(treasury_contract)

        from src.common.adapters import get_async_web3_adapter

        async with get_async_web3_adapter() as adapter:
            adapter.register_contract(treasury_contract.address, treasury_abi)

            on_chain_signers = await adapter.call_function(
                treasury_contract.address,
                "get_signers",
                [],
            )
            on_chain_required = await adapter.call_function(
                treasury_contract.address,
                "required_signatures",
                [],
            )

        on_chain_normalized = [str(addr).lower() for addr in (on_chain_signers or [])]
        requested_set = set(signers)
        on_chain_set = set(on_chain_normalized)

        if (
            requested_set != on_chain_set
            or int(on_chain_required) != required_signatures
        ):
            raise ValidationException(
                "On-chain treasury signer configuration mismatch after transaction confirmation"
            )

        logger.info(
            f"Treasury signers configured on-chain: count={len(on_chain_normalized)}, "
            f"required={on_chain_required}, tx={tx_hash}"
        )

        await self._sync_signer_roles(signers)

        return {
            "contract_address": treasury_contract.address,
            "tx_hash": tx_hash,
            "signer_count": len(on_chain_normalized),
            "required_signatures": int(on_chain_required),
        }

    async def get_treasury_config(self) -> TreasuryConfigResponse:
        """
        获取 Treasury 配置

        Returns:
            配置响应
        """
        try:
            treasury_contract = await self._get_treasury_multisig_contract()
            treasury_abi = await self._get_contract_abi(treasury_contract)

            from src.common.adapters import get_async_web3_adapter

            async with get_async_web3_adapter() as adapter:
                adapter.register_contract(treasury_contract.address, treasury_abi)
                on_chain_signers = await adapter.call_function(
                    treasury_contract.address,
                    "get_signers",
                    [],
                )
                on_chain_required = await adapter.call_function(
                    treasury_contract.address,
                    "required_signatures",
                    [],
                )

            signer_addresses = [str(addr).lower() for addr in (on_chain_signers or [])]
            required = int(on_chain_required or 0)
            signer_count = len(signer_addresses)

            return TreasuryConfigResponse(
                contract_address=treasury_contract.address,
                signers=signer_addresses,
                required_signatures=required,
                threshold_ratio=f"{required}/{signer_count}" if signer_count else "0/0",
                is_initialized=signer_count >= 3 and required >= 2,
            )
        except NotFoundException:
            return TreasuryConfigResponse(
                contract_address=None,
                signers=[],
                required_signatures=0,
                threshold_ratio="0/0",
                is_initialized=False,
            )

    async def update_signers(
        self,
        signer_addresses: List[str],
        required_signatures: int,
    ) -> dict:
        """
        更新多签成员

        Args:
            signer_addresses: 新的多签成员地址列表
            required_signatures: 新的所需签名数

        Returns:
            更新结果
        """
        # TODO: 调用合约更新签名者

        logger.info(
            f"Treasury signers updated: {len(signer_addresses)} signers, "
            f"threshold={required_signatures}"
        )

        return {
            "success": True,
            "tx_hash": "",  # 待合约调用后填充
            "signers": signer_addresses,
            "required_signatures": required_signatures,
        }

    # ============ Internal Helpers ============

    async def _get_redemption_by_id(self, redemption_id: int) -> RedemptionRequest:
        """根据ID获取赎回请求，不存在则抛出异常"""
        redemption = await RedemptionRequest.filter(
            id=redemption_id,
            environment=self.network,
        ).first()

        if not redemption:
            raise NotFoundException(f"Redemption request {redemption_id} not found")

        return redemption

    async def _get_required_signatures(self) -> int:
        """获取所需签名数 (从配置或默认值)"""
        config = await self.get_treasury_config()
        if config.required_signatures > 0:
            return config.required_signatures
        return DEFAULT_REQUIRED_SIGNATURES

    async def _get_treasury_multisig_contract(self) -> ContractDeployment:
        """获取当前网络的 TreasuryMultisig 合约部署记录。"""
        treasury_contract = (
            await ContractDeployment.filter(
                network=self.network,
                status=ContractStatus.ACTIVE,
                name__icontains="treasurymultisig",
            )
            .order_by("-updated_at", "-created_at")
            .first()
        )

        if not treasury_contract or not treasury_contract.address:
            raise NotFoundException("TreasuryMultisig not deployed")

        return treasury_contract

    async def _get_stablecoin_contract(self, token_type: str) -> ContractDeployment:
        """按支付代币类型获取稳定币合约部署记录。"""
        raw_token = token_type.value if hasattr(token_type, "value") else token_type
        stablecoin_name = str(raw_token or "").strip().upper()

        if not stablecoin_name:
            raise ValidationException("Invalid token type for stablecoin lookup")

        stablecoin = (
            await ContractDeployment.filter(
                network=self.network,
                scope=ContractScope.GLOBAL,
                status=ContractStatus.ACTIVE,
                contract_type=ContractType.STABLECOIN,
                name__iexact=stablecoin_name,
            )
            .order_by("-updated_at", "-created_at")
            .first()
        )

        if not stablecoin or not stablecoin.address:
            raise NotFoundException(
                f"Stablecoin contract not found for token type: {token_type}"
            )

        return stablecoin

    async def _get_contract_abi(self, contract: ContractDeployment) -> list:
        """从 abi_path 加载合约 ABI。"""
        if not contract.abi_path:
            raise ValidationException(f"ABI path is empty for contract {contract.name}")

        storage = StorageService()
        abi = await storage.get_json(contract.abi_path)
        if not abi:
            raise ValidationException(f"Failed to load ABI from {contract.abi_path}")
        return abi if isinstance(abi, list) else []

    async def _verify_onchain_signature(
        self,
        proposal_id: int,
        signer_address: str,
    ) -> None:
        """验证 signer 是否为多签成员且已在链上完成 proposal 签名。"""
        try:
            signer_checksum = AsyncWeb3.to_checksum_address(signer_address)
        except ValueError as exc:
            raise ValidationException("Invalid signer address format") from exc

        treasury_contract = await self._get_treasury_multisig_contract()
        treasury_abi = await self._get_contract_abi(treasury_contract)

        async with get_async_web3_adapter() as adapter:
            adapter.register_contract(treasury_contract.address, treasury_abi)

            on_chain_signers = await adapter.call_function(
                treasury_contract.address,
                "get_signers",
                [],
            )

            normalized_signers = {
                str(addr).lower() for addr in (on_chain_signers or [])
            }
            if signer_checksum.lower() not in normalized_signers:
                raise ValidationException(
                    "Signer is not in on-chain multisig signer set"
                )

            has_signed = await adapter.call_function(
                treasury_contract.address,
                "has_signed",
                [proposal_id, signer_checksum],
            )

            if not bool(has_signed):
                raise ValidationException(
                    "On-chain signature not found for this proposal"
                )

    async def _verify_onchain_execution(
        self,
        proposal_id: int,
        executor_address: str,
    ) -> None:
        """验证执行者为 signer，且 proposal 已在链上执行。"""
        treasury_contract = await self._get_treasury_multisig_contract()
        treasury_abi = await self._get_contract_abi(treasury_contract)

        async with get_async_web3_adapter() as adapter:
            adapter.register_contract(treasury_contract.address, treasury_abi)

            on_chain_signers = await adapter.call_function(
                treasury_contract.address,
                "get_signers",
                [],
            )

            normalized_signers = {
                str(addr).lower() for addr in (on_chain_signers or [])
            }
            if executor_address not in normalized_signers:
                raise ValidationException(
                    "Executor is not in on-chain multisig signer set"
                )

            proposal = await adapter.call_function(
                treasury_contract.address,
                "get_proposal",
                [proposal_id],
            )

            if not proposal or len(proposal) < 7:
                raise ValidationException("Invalid on-chain proposal data")

            required_signatures = await adapter.call_function(
                treasury_contract.address,
                "required_signatures",
                [],
            )

            signature_count = int(proposal[5])
            executed = bool(proposal[6])

            if signature_count < int(required_signatures):
                raise ValidationException("On-chain proposal threshold not met")

            if not executed:
                raise ValidationException("On-chain proposal is not executed yet")

    async def _get_contract_owner_proposer_account(
        self,
        signer_addresses: List[str],
    ) -> Account:
        """选择 contract_owner 账户作为提案发起人（且必须是链上 signer）。"""
        normalized = {addr.lower() for addr in signer_addresses}

        candidates = await Account.filter(
            network=self.network,
            roles__contains=["contract_owner"],
            is_deleted=False,
            is_blocked=False,
            is_active=True,
        ).all()

        for account in candidates:
            if (
                account.address.lower() in normalized
                and account.private_key
                and account.private_key.startswith("0x")
                and len(account.private_key) >= 66
            ):
                return account

        raise ValidationException(
            "No contract_owner account with signer permission and private key is available for proposal creation"
        )

    async def _ensure_signers_include_contract_owner(
        self, signer_addresses: List[str]
    ) -> None:
        """校验 signer 集合中至少包含一个 contract_owner 账户。"""
        accounts = await Account.filter(network=self.network).all()
        account_by_address = {a.address.lower(): a for a in accounts}

        for signer in signer_addresses:
            if signer not in account_by_address:
                raise ValidationException(
                    f"Signer account not found in backend: {signer}"
                )

        if not any(
            "contract_owner" in (account_by_address[signer].roles or [])
            for signer in signer_addresses
        ):
            raise ValidationException(
                "Signer set must include at least one contract_owner account"
            )

    async def _sync_signer_roles(self, signer_addresses: List[str]) -> None:
        """
        将链上 signer 回写到后端账户角色：
        - contract_owner: 保持现状，不追加 signer 角色
        - 非 contract_owner signer: 追加 multisig_signer，并移除 treasury（统一角色）
        """
        signer_set = set(signer_addresses)
        accounts = await Account.filter(network=self.network).all()
        account_by_address = {a.address.lower(): a for a in accounts}

        for signer in signer_set:
            account = account_by_address.get(signer)
            if not account:
                continue

            roles = list(dict.fromkeys(account.roles or []))
            if "contract_owner" in roles:
                continue

            changed = False
            if "multisig_signer" not in roles:
                roles.append("multisig_signer")
                changed = True

            if "treasury" in roles:
                roles = [r for r in roles if r != "treasury"]
                changed = True

            if changed:
                account.roles = roles
                await account.save()
                logger.info(
                    f"Synced signer role for account {account.address}: roles={roles}"
                )

    async def _create_onchain_redemption_proposal(
        self,
        redemption: RedemptionRequest,
        subscription: Subscription,
        token_type: str,
    ) -> Tuple[int, str]:
        """在 TreasuryMultisig 上创建赎回提案并返回 (proposal_id, tx_hash)。"""
        treasury_contract = await self._get_treasury_multisig_contract()
        stablecoin_contract = await self._get_stablecoin_contract(token_type)

        treasury_abi = await self._get_contract_abi(treasury_contract)
        web3 = AsyncWeb3(AsyncHTTPProvider(SETTINGS.crypto.mainnet_url))
        contract = web3.eth.contract(
            address=web3.to_checksum_address(treasury_contract.address),
            abi=treasury_abi,
        )

        signer_addresses = await contract.functions.get_signers().call()
        if not signer_addresses:
            raise ValidationException("TreasuryMultisig has no configured signers")

        proposer = await self._get_contract_owner_proposer_account(
            [str(addr) for addr in signer_addresses]
        )
        proposer_account = web3.eth.account.from_key(proposer.private_key)

        recipient = web3.to_checksum_address(redemption.wallet_address)
        token = web3.to_checksum_address(stablecoin_contract.address)

        # Subscription amounts are stored in token units; convert to smallest unit (default 6 decimals).
        decimals = 6
        try:
            decimals = int(
                await web3.eth.contract(
                    address=token,
                    abi=[
                        {
                            "type": "function",
                            "name": "decimals",
                            "stateMutability": "view",
                            "inputs": [],
                            "outputs": [{"name": "", "type": "uint8"}],
                        }
                    ],
                )
                .functions.decimals()
                .call()
            )
        except Exception:
            decimals = 6

        amount = int(
            (
                Decimal(str(redemption.total_amount)) * (Decimal(10) ** decimals)
            ).to_integral_value()
        )
        description = (
            f"Redeem subscription #{subscription.id} for {redemption.wallet_address}"
        )

        async with self._nonce_lock:
            estimated_gas = await contract.functions.create_proposal(
                recipient,
                token,
                amount,
                description,
            ).estimate_gas({"from": proposer_account.address})

            tx = await contract.functions.create_proposal(
                recipient,
                token,
                amount,
                description,
            ).build_transaction(
                {
                    "from": proposer_account.address,
                    "nonce": await web3.eth.get_transaction_count(
                        proposer_account.address
                    ),
                    "gas": int(estimated_gas * 1.2),
                    "gasPrice": await web3.eth.gas_price,
                }
            )

            signed = web3.eth.account.sign_transaction(tx, proposer.private_key)
            tx_hash = await web3.eth.send_raw_transaction(signed.raw_transaction)
            tx_hash_hex = tx_hash.hex().lower()

            receipt = await web3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
            if receipt.status != 1:
                raise BusinessException(
                    message="Create proposal transaction reverted", code=500
                )

            proposal_id = int(await contract.functions.proposal_count().call())
            return proposal_id, tx_hash_hex

    @staticmethod
    def _normalize_signer_addresses(signer_addresses: List[str]) -> List[str]:
        """地址规范化并去重（保持顺序）。"""
        normalized: List[str] = []
        seen = set()
        for addr in signer_addresses:
            value = (addr or "").strip().lower()
            if not value.startswith("0x") or len(value) != 42:
                raise ValidationException(f"Invalid signer address: {addr}")
            if value in seen:
                raise ValidationException(f"Duplicate signer address: {addr}")
            seen.add(value)
            normalized.append(value)
        return normalized

    @staticmethod
    def _validate_signer_threshold(
        signer_addresses: List[str], required_signatures: int
    ) -> None:
        """校验签名者数量与阈值约束。"""
        signer_count = len(signer_addresses)
        if signer_count < 3:
            raise ValidationException("Need at least 3 signers")
        if signer_count > 10:
            raise ValidationException("Signer count cannot exceed 10")
        if required_signatures < 2:
            raise ValidationException("Required signatures must be at least 2")
        if required_signatures > signer_count:
            raise ValidationException("Required signatures cannot exceed signer count")

    async def _to_response(
        self, redemption: RedemptionRequest
    ) -> RedemptionRequestResponse:
        """转换为响应对象"""
        # 确保关联数据已加载
        subscription = await redemption.subscription
        asset = await subscription.asset if subscription else None

        # 获取签名数量
        sig_count = await RedemptionSignature.filter(redemption=redemption).count()

        # 获取签名列表
        signatures = await RedemptionSignature.filter(redemption=redemption).all()
        sig_responses = [
            RedemptionSignatureResponse(
                id=s.id,
                signer_address=s.signer_address,
                signed_at=s.signed_at,
                tx_hash=s.tx_hash,
            )
            for s in signatures
        ]

        return RedemptionRequestResponse(
            id=redemption.id,
            subscription_id=redemption.subscription_id,
            wallet_address=redemption.wallet_address,
            asset_id=asset.id if asset else 0,
            asset_name=asset.name if asset else None,
            asset_symbol=asset.symbol if asset else None,
            principal=float(redemption.principal),
            interest=float(redemption.interest),
            total_amount=float(redemption.total_amount),
            proposal_id=redemption.proposal_id,
            proposal_tx_hash=redemption.proposal_tx_hash,
            status=redemption.status,
            executed_at=redemption.executed_at,
            execute_tx_hash=redemption.execute_tx_hash,
            environment=redemption.environment,
            signatures=sig_responses,
            signature_count=sig_count,
            required_signatures=await self._get_required_signatures(),
            created_at=redemption.created_at,
            updated_at=redemption.updated_at,
        )

    async def _record_event(
        self,
        redemption: RedemptionRequest,
        event_type: RedemptionEventType,
        status: Optional[RedemptionStatus] = None,
        actor_address: Optional[str] = None,
        tx_hash: Optional[str] = None,
        message: Optional[str] = None,
        metadata: Optional[dict[str, Any]] = None,
    ) -> None:
        """记录赎回事件，不影响主流程。"""
        try:
            await RedemptionEvent.create(
                redemption=redemption,
                event_type=event_type,
                status=status,
                actor_address=actor_address,
                tx_hash=tx_hash,
                message=message,
                metadata=metadata,
            )
        except Exception as exc:
            logger.warning(
                f"Failed to record redemption event: redemption={redemption.id}, event={event_type}, error={exc}"
            )
