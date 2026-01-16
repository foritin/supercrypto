"""
KYC Domain - 业务服务
"""

import hashlib
from datetime import datetime, timezone
from typing import List, Optional, Tuple

from falib.utils.config import SETTINGS

from src.models.kyc import UserKyc
from src.services.kyc.schemas import (
    KycApplyRequest,
    KycFullResponse,
    KycReviewRequest,
    KycStatusResponse,
)
from src.shared.common.exceptions import BusinessException
from src.shared.schemas.enums import KycStatus, OnChainSyncStatus


class KycService:
    """KYC 服务"""

    @property
    def environment(self) -> str:
        """获取当前环境"""
        return SETTINGS.environment

    async def get_status(self, wallet_address: str) -> KycStatusResponse:
        """
        获取钱包的 KYC 状态

        Args:
            wallet_address: 钱包地址

        Returns:
            KYC 状态响应
        """
        address = wallet_address.lower()

        kyc = await UserKyc.filter(wallet_address=address).first()

        if not kyc:
            # 返回默认状态 (not_started)
            return KycStatusResponse(
                wallet_address=address,
                status=KycStatus.NOT_STARTED,
                submitted_at=None,
                reviewed_at=None,
                reject_reason=None,
                country_code=None,
                is_accredited=False,
            )

        return KycStatusResponse(
            wallet_address=kyc.wallet_address,
            status=kyc.status,
            submitted_at=kyc.submitted_at,
            reviewed_at=kyc.reviewed_at,
            reject_reason=kyc.reject_reason,
            country_code=kyc.country_code,
            is_accredited=kyc.is_accredited,
        )

    async def apply(self, data: KycApplyRequest) -> KycFullResponse:
        """
        发起 KYC 申请 (Story 2.7 增强版)

        Args:
            data: 申请数据 (包含身份信息)

        Returns:
            KYC 完整响应

        Raises:
            BusinessException: 如果已经申请过
        """
        address = data.wallet_address.lower()

        # Story 2.7: 证件号哈希处理 (ADR-1)
        id_number_hash = hashlib.sha256(data.id_number.encode()).hexdigest()
        id_number_last4 = data.id_number[-4:]

        # 检查是否已存在申请
        existing = await UserKyc.filter(wallet_address=address).first()

        if existing:
            if existing.status == KycStatus.PENDING:
                raise BusinessException(
                    code=400, message="KYC application already pending"
                )
            elif existing.status == KycStatus.APPROVED:
                raise BusinessException(code=400, message="KYC already approved")
            elif existing.status == KycStatus.REJECTED:
                # 允许重新申请 - 更新所有字段
                existing.status = KycStatus.PENDING
                existing.submitted_at = datetime.now(timezone.utc)
                existing.reject_reason = None
                existing.reviewed_at = None
                existing.reviewer_id = None
                existing.reviewer_address = None
                existing.country_code = data.country_code
                # Story 2.7: 更新身份信息
                existing.id_type = data.id_type
                existing.id_number_hash = id_number_hash
                existing.id_number_last4 = id_number_last4
                existing.full_name = data.full_name
                existing.date_of_birth = data.date_of_birth
                existing.id_front_url = data.id_front_url
                existing.id_back_url = data.id_back_url
                existing.selfie_url = data.selfie_url
                # 重置链上同步状态
                existing.on_chain_sync_status = OnChainSyncStatus.PENDING
                existing.on_chain_tx_hash = None
                existing.on_chain_synced_at = None
                existing.on_chain_error = None
                await existing.save()
                return self._to_full_response(existing)

        # 创建新申请
        kyc = await UserKyc.create(
            wallet_address=address,
            status=KycStatus.PENDING,
            submitted_at=datetime.now(timezone.utc),
            country_code=data.country_code,
            # Story 2.7: 新增身份信息字段
            id_type=data.id_type,
            id_number_hash=id_number_hash,
            id_number_last4=id_number_last4,
            full_name=data.full_name,
            date_of_birth=data.date_of_birth,
            id_front_url=data.id_front_url,
            id_back_url=data.id_back_url,
            selfie_url=data.selfie_url,
            on_chain_sync_status=OnChainSyncStatus.PENDING,
        )

        return self._to_full_response(kyc)

    async def get_by_id(self, kyc_id: int) -> Optional[KycFullResponse]:
        """
        根据 ID 获取 KYC 记录

        Args:
            kyc_id: KYC ID

        Returns:
            KYC 完整响应或 None
        """
        kyc = await UserKyc.filter(id=kyc_id).first()

        if not kyc:
            return None

        return self._to_full_response(kyc)

    async def list_kyc(
        self, status: Optional[KycStatus] = None, page: int = 1, page_size: int = 10
    ) -> Tuple[List[KycFullResponse], int, int]:
        """
        获取 KYC 列表 (管理员用)

        Args:
            status: 状态筛选
            page: 页码
            page_size: 每页数量

        Returns:
            (列表, 总数, 总页数)
        """
        query = UserKyc.all()

        if status:
            query = query.filter(status=status)

        total = await query.count()
        total_pages = (total + page_size - 1) // page_size

        offset = (page - 1) * page_size
        kycs = await query.order_by("-submitted_at").offset(offset).limit(page_size)

        return ([self._to_full_response(k) for k in kycs], total, total_pages)

    async def review(
        self, kyc_id: int, data: KycReviewRequest, reviewer_address: str
    ) -> KycFullResponse:
        """
        审核 KYC 申请 (管理员用) - Story 2.8 增强版

        集成审核策略，审核通过后自动同步到 KYCManager 合约。

        Args:
            kyc_id: KYC ID
            data: 审核数据
            reviewer_address: 审核人钱包地址

        Returns:
            更新后的 KYC 响应

        Raises:
            BusinessException: 如果 KYC 不存在或状态不是 pending
        """
        from src.services.kyc.strategies import get_kyc_strategy

        kyc = await UserKyc.filter(id=kyc_id).first()

        if not kyc:
            raise BusinessException(code=404, message="KYC record not found")

        if kyc.status != KycStatus.PENDING:
            raise BusinessException(
                code=400, message=f"Cannot review KYC in status: {kyc.status}"
            )

        kyc.reviewed_at = datetime.now(timezone.utc)
        kyc.reviewer_address = reviewer_address.lower()

        if data.approved:
            kyc.status = KycStatus.APPROVED
            kyc.is_accredited = data.is_accredited

            # Story 2.8: 获取策略并处理审核通过
            strategy = get_kyc_strategy()
            try:
                tx_hash, success = await strategy.process_approval(
                    kyc, reviewer_address
                )
                kyc.on_chain_tx_hash = tx_hash if tx_hash else None

                if success:
                    kyc.on_chain_sync_status = OnChainSyncStatus.SYNCED
                    kyc.on_chain_synced_at = datetime.now(timezone.utc)
                    kyc.on_chain_error = None
                else:
                    kyc.on_chain_sync_status = OnChainSyncStatus.FAILED
                    kyc.on_chain_error = "Transaction failed or not confirmed"
            except Exception as e:
                kyc.on_chain_sync_status = OnChainSyncStatus.FAILED
                kyc.on_chain_error = str(e)
        else:
            kyc.status = KycStatus.REJECTED
            kyc.reject_reason = data.reject_reason
            kyc.is_accredited = False
            kyc.on_chain_sync_status = OnChainSyncStatus.NOT_REQUIRED

        await kyc.save()
        return self._to_full_response(kyc)

    async def retry_sync(self, kyc_id: int) -> KycFullResponse:
        """
        重试链上同步 (Story 2.8)

        当 on_chain_sync_status = FAILED 时，管理员可以手动重试同步。

        Args:
            kyc_id: KYC ID

        Returns:
            更新后的 KYC 响应

        Raises:
            BusinessException: 如果 KYC 不存在或状态不允许重试
        """
        from src.services.kyc.strategies import get_kyc_strategy

        kyc = await UserKyc.filter(id=kyc_id).first()

        if not kyc:
            raise BusinessException(code=404, message="KYC record not found")

        if kyc.status != KycStatus.APPROVED:
            raise BusinessException(
                code=400, message="Only approved KYC can retry sync"
            )

        if kyc.on_chain_sync_status == OnChainSyncStatus.SYNCED:
            raise BusinessException(code=400, message="KYC already synced to chain")

        if kyc.on_chain_sync_status == OnChainSyncStatus.NOT_REQUIRED:
            raise BusinessException(
                code=400, message="On-chain sync not required for this environment"
            )

        # 重试同步
        strategy = get_kyc_strategy()
        try:
            tx_hash, success = await strategy.process_approval(
                kyc, kyc.reviewer_address or ""
            )
            kyc.on_chain_tx_hash = tx_hash if tx_hash else None

            if success:
                kyc.on_chain_sync_status = OnChainSyncStatus.SYNCED
                kyc.on_chain_synced_at = datetime.now(timezone.utc)
                kyc.on_chain_error = None
            else:
                kyc.on_chain_sync_status = OnChainSyncStatus.FAILED
                kyc.on_chain_error = "Transaction failed or not confirmed (retry)"
        except Exception as e:
            kyc.on_chain_sync_status = OnChainSyncStatus.FAILED
            kyc.on_chain_error = f"Retry failed: {str(e)}"

        await kyc.save()
        return self._to_full_response(kyc)

    async def quick_approve(self, wallet_address: str) -> KycFullResponse:
        """
        快速通过 KYC (开发工具，仅 local/test 环境)

        Args:
            wallet_address: 钱包地址

        Returns:
            KYC 响应

        Raises:
            BusinessException: 如果不是 local/test 环境
        """
        if self.environment not in ("local", "test"):
            raise BusinessException(
                code=403,
                message="Quick KYC approval only allowed in local/test environment",
            )

        address = wallet_address.lower()

        kyc = await UserKyc.filter(wallet_address=address).first()

        if kyc:
            kyc.status = KycStatus.APPROVED
            kyc.reviewed_at = datetime.now(timezone.utc)
            kyc.is_accredited = True
            # Story 2.7: 设置链上同步状态
            kyc.on_chain_sync_status = OnChainSyncStatus.SYNCED
            await kyc.save()
        else:
            kyc = await UserKyc.create(
                wallet_address=address,
                status=KycStatus.APPROVED,
                submitted_at=datetime.now(timezone.utc),
                reviewed_at=datetime.now(timezone.utc),
                is_accredited=True,
                on_chain_sync_status=OnChainSyncStatus.SYNCED,
            )

        return self._to_full_response(kyc)

    async def reset_kyc(self, wallet_address: str) -> bool:
        """
        重置 KYC 状态 (开发工具，仅 local 环境)

        Args:
            wallet_address: 钱包地址

        Returns:
            是否成功

        Raises:
            BusinessException: 如果不是 local 环境
        """
        if self.environment != "local":
            raise BusinessException(
                code=403, message="KYC reset only allowed in local environment"
            )

        address = wallet_address.lower()

        deleted = await UserKyc.filter(wallet_address=address).delete()

        return deleted > 0

    def _to_full_response(self, kyc: UserKyc) -> KycFullResponse:
        """转换为完整响应"""
        return KycFullResponse(
            id=kyc.id,
            wallet_address=kyc.wallet_address,
            environment=self.environment,  # 使用当前环境
            status=kyc.status,
            submitted_at=kyc.submitted_at,
            reviewed_at=kyc.reviewed_at,
            reviewer_id=kyc.reviewer_id,
            reviewer_address=kyc.reviewer_address,
            reject_reason=kyc.reject_reason,
            external_kyc_id=kyc.external_kyc_id,
            country_code=kyc.country_code,
            is_accredited=kyc.is_accredited,
            created_at=kyc.created_at,
            updated_at=kyc.updated_at,
            # Story 2.7: 新增身份信息字段
            id_type=kyc.id_type.value if kyc.id_type else None,
            id_number_last4=kyc.id_number_last4,
            full_name=kyc.full_name,
            date_of_birth=kyc.date_of_birth,
            # 不直接返回 MinIO 路径，只返回是否上传
            has_id_front=bool(kyc.id_front_url),
            has_id_back=bool(kyc.id_back_url),
            has_selfie=bool(kyc.selfie_url),
            # 链上同步状态
            on_chain_sync_status=kyc.on_chain_sync_status,
            on_chain_tx_hash=kyc.on_chain_tx_hash,
        )
