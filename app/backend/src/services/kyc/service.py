"""
KYC Domain - 业务服务
"""

import hashlib
from datetime import datetime, timezone
from typing import List, Optional, Tuple

from falib.utils.config import SETTINGS
from falib.utils.log import get_logger

from src.models.kyc import AccountKyc, AccountKycDocument
from src.services.kyc.schemas import (
    ContractKycStatus,
    KycApplyRequest,
    KycContractComparisonResponse,
    KycDocumentResponse,
    KycFullResponse,
    KycReviewRequest,
    KycStatusResponse,
)
from src.shared.common.exceptions import BusinessException
from src.shared.schemas.enums import KycStatus, OnChainSyncStatus

logger = get_logger("kyc.service")


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

        kyc = await AccountKyc.filter(address=address).first()

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
            wallet_address=kyc.address,
            status=kyc.status,
            submitted_at=kyc.submitted_at,
            reviewed_at=kyc.reviewed_at,
            reject_reason=kyc.reject_reason,
            country_code=kyc.country_code,
            is_accredited=kyc.is_accredited,
        )

    async def get_contract_comparison(
        self, wallet_address: str
    ) -> Optional[KycContractComparisonResponse]:
        """
        获取数据库与合约 KYC 状态对比

        将 Router 层的数据库和合约查询逻辑封装到 Service 层，
        遵循分层架构原则。

        Args:
            wallet_address: 钱包地址

        Returns:
            KycContractComparisonResponse 或 None (如果数据库中不存在记录)
        """
        from src.services.kyc.contract_service import KycContractService

        address = wallet_address.lower()

        # 获取数据库状态
        kyc = await AccountKyc.filter(address=address, network=self.environment).first()

        if not kyc:
            return None

        # 获取合约状态
        contract_service = KycContractService()
        contract_verified: Optional[bool] = None
        contract_info: Optional[ContractKycStatus] = None
        contract_error: Optional[str] = None

        try:
            contract_verified = await contract_service.is_verified(address)
            info = await contract_service.get_investor_info(address)
            if info:
                contract_info = ContractKycStatus(**info)
        except Exception as e:
            contract_error = str(e)
            logger.warning(f"Failed to get contract status for {address}: {e}")

        # 判断一致性
        is_consistent = False
        if contract_verified is not None:
            db_approved = kyc.status == KycStatus.APPROVED
            is_consistent = db_approved == contract_verified

        return KycContractComparisonResponse(
            wallet_address=address,
            db_status=kyc.status.value,
            db_is_accredited=kyc.is_accredited,
            db_sync_status=kyc.on_chain_sync_status.value
            if kyc.on_chain_sync_status
            else None,
            contract_verified=contract_verified,
            contract_info=contract_info,
            contract_error=contract_error,
            is_consistent=is_consistent,
        )

    async def apply(self, data: KycApplyRequest) -> KycFullResponse:
        """
        发起 KYC 申请 (多证件版本)

        Args:
            data: 申请数据 (包含多个证件信息)

        Returns:
            KYC 完整响应

        Raises:
            BusinessException: 如果已经申请过
        """
        address = data.wallet_address.lower()

        # 检查是否已存在申请
        existing = await AccountKyc.filter(address=address).first()

        if existing:
            if existing.status == KycStatus.PENDING:
                raise BusinessException(
                    code=400, message="KYC application already pending"
                )
            elif existing.status == KycStatus.APPROVED:
                raise BusinessException(code=400, message="KYC already approved")
            elif existing.status == KycStatus.REJECTED:
                # 允许重新申请 - 更新基本信息
                existing.status = KycStatus.PENDING
                existing.submitted_at = datetime.now(timezone.utc)
                existing.reject_reason = None
                existing.reviewed_at = None
                existing.reviewer_address = None
                existing.country_code = data.country_code
                existing.full_name = data.full_name
                existing.date_of_birth = data.date_of_birth
                existing.selfie_url = data.selfie_url
                # 重置链上同步状态
                existing.on_chain_sync_status = OnChainSyncStatus.PENDING
                existing.on_chain_tx_hash = None
                existing.on_chain_synced_at = None
                existing.on_chain_error = None
                # 更新联系信息字段 (Requirements 1.3)
                existing.email = data.email
                existing.phone = data.phone
                # 更新居住地址字段 (Requirements 2.7)
                existing.address_line1 = data.address_line1
                existing.address_line2 = data.address_line2
                existing.city = data.city
                existing.state = data.state
                existing.postal_code = data.postal_code
                existing.residence_country = data.residence_country
                # 更新活体检测字段 (Requirements 3.3)
                existing.liveness_verified = data.liveness_verified or False
                existing.face_image_url = data.face_image_url
                await existing.save()

                # 删除旧的证件记录，创建新的
                await AccountKycDocument.filter(kyc_id=existing.id).delete()
                await self._create_documents(existing, data.documents)

                return await self._to_full_response(existing)

        # 创建新申请
        kyc = await AccountKyc.create(
            address=address,
            status=KycStatus.PENDING,
            submitted_at=datetime.now(timezone.utc),
            country_code=data.country_code,
            full_name=data.full_name,
            date_of_birth=data.date_of_birth,
            selfie_url=data.selfie_url,
            on_chain_sync_status=OnChainSyncStatus.PENDING,
            # 联系信息字段 (Requirements 1.3)
            email=data.email,
            phone=data.phone,
            # 居住地址字段 (Requirements 2.7)
            address_line1=data.address_line1,
            address_line2=data.address_line2,
            city=data.city,
            state=data.state,
            postal_code=data.postal_code,
            residence_country=data.residence_country,
            # 活体检测字段 (Requirements 3.3)
            liveness_verified=data.liveness_verified or False,
            face_image_url=data.face_image_url,
        )

        # 创建证件记录
        await self._create_documents(kyc, data.documents)

        return await self._to_full_response(kyc)

    async def _create_documents(
        self, kyc: AccountKyc, documents: List
    ) -> List[AccountKycDocument]:
        """创建证件记录"""
        logger.info(f"Creating {len(documents)} document(s) for KYC {kyc.id}")
        created_docs = []
        for doc in documents:
            # 证件号哈希处理 (ADR-1)
            id_number_hash = hashlib.sha256(doc.id_number.encode()).hexdigest()
            id_number_last4 = doc.id_number[-4:]

            logger.info(
                f"Creating document: type={doc.id_type}, expiry={doc.document_expiry}, front={doc.id_front_url[:50] if doc.id_front_url else None}..."
            )

            kyc_doc = await AccountKycDocument.create(
                kyc=kyc,
                id_type=doc.id_type,
                id_number_hash=id_number_hash,
                id_number_last4=id_number_last4,
                document_expiry=doc.document_expiry,
                id_front_url=doc.id_front_url,
                id_back_url=doc.id_back_url,
            )
            created_docs.append(kyc_doc)
            logger.info(f"Created document ID: {kyc_doc.id}")

        return created_docs

    async def get_by_id(self, kyc_id: int) -> Optional[KycFullResponse]:
        """
        根据 ID 获取 KYC 记录

        Args:
            kyc_id: KYC ID

        Returns:
            KYC 完整响应或 None
        """
        kyc = await AccountKyc.filter(id=kyc_id).first()

        if not kyc:
            return None

        return await self._to_full_response(kyc)

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
        query = AccountKyc.all()

        if status:
            query = query.filter(status=status)

        total = await query.count()
        total_pages = (total + page_size - 1) // page_size

        offset = (page - 1) * page_size
        kycs = await query.order_by("-submitted_at").offset(offset).limit(page_size)

        # 异步获取每个 KYC 的完整响应
        responses = []
        for k in kycs:
            responses.append(await self._to_full_response(k))
        return (responses, total, total_pages)

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

        kyc = await AccountKyc.filter(id=kyc_id).first()

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
        return await self._to_full_response(kyc)

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

        kyc = await AccountKyc.filter(id=kyc_id).first()

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
        return await self._to_full_response(kyc)

    async def quick_approve(self, wallet_address: str) -> KycFullResponse:
        """
        快速通过 KYC (开发工具，仅 local/test 环境)

        Args:
            wallet_address: 钱包地址

        Returns:
            KYC 响应

        Raises:
            BusinessException: 如果不是 hardhat/sepolia 环境
        """
        if self.environment not in ("hardhat", "sepolia"):
            raise BusinessException(
                code=403,
                message="Quick KYC approval only allowed in hardhat/sepolia environment",
            )

        address = wallet_address.lower()

        kyc = await AccountKyc.filter(address=address).first()

        if kyc:
            kyc.status = KycStatus.APPROVED
            kyc.reviewed_at = datetime.now(timezone.utc)
            kyc.is_accredited = True
            # Story 2.7: 设置链上同步状态
            kyc.on_chain_sync_status = OnChainSyncStatus.SYNCED
            await kyc.save()
        else:
            kyc = await AccountKyc.create(
                address=address,
                status=KycStatus.APPROVED,
                submitted_at=datetime.now(timezone.utc),
                reviewed_at=datetime.now(timezone.utc),
                is_accredited=True,
                on_chain_sync_status=OnChainSyncStatus.SYNCED,
            )

        return await self._to_full_response(kyc)

    async def reset_kyc(self, wallet_address: str) -> bool:
        """
        重置 KYC 状态 (开发工具，仅 hardhat 环境)

        Args:
            wallet_address: 钱包地址

        Returns:
            是否成功

        Raises:
            BusinessException: 如果不是 hardhat 环境
        """
        if self.environment != "hardhat":
            raise BusinessException(
                code=403, message="KYC reset only allowed in hardhat environment"
            )

        address = wallet_address.lower()

        deleted = await AccountKyc.filter(address=address).delete()

        return deleted > 0

    async def _to_full_response(self, kyc: AccountKyc) -> KycFullResponse:
        """转换为完整响应 (包含多证件信息和扩展字段)
        
        Requirements 6.5: 映射所有新字段到响应
        - 联系信息: email, phone
        - 居住地址: address_line1, address_line2, city, state, postal_code, residence_country
        - 活体检测: liveness_verified, has_face_image (基于 face_image_url 是否存在)
        """
        # 获取关联的证件记录
        documents = await AccountKycDocument.filter(kyc_id=kyc.id).all()
        logger.info(f"Found {len(documents)} document(s) for KYC {kyc.id}")

        doc_responses = [
            KycDocumentResponse(
                id_type=doc.id_type.value if doc.id_type else None,
                id_number_last4=doc.id_number_last4,
                document_expiry=doc.document_expiry,
                has_front=bool(doc.id_front_url),
                has_back=bool(doc.id_back_url),
            )
            for doc in documents
        ]
        logger.info(f"Document responses: {[d.id_type for d in doc_responses]}")

        return KycFullResponse(
            id=kyc.id,
            wallet_address=kyc.address,
            environment=self.environment,
            status=kyc.status,
            submitted_at=kyc.submitted_at,
            reviewed_at=kyc.reviewed_at,
            reviewer_address=kyc.reviewer_address,
            reject_reason=kyc.reject_reason,
            external_kyc_id=kyc.external_kyc_id,
            country_code=kyc.country_code,
            is_accredited=kyc.is_accredited,
            created_at=kyc.created_at,
            updated_at=kyc.updated_at,
            # 基本信息
            full_name=kyc.full_name,
            date_of_birth=kyc.date_of_birth,
            # 多证件信息
            documents=doc_responses,
            has_selfie=bool(kyc.selfie_url),
            # 联系信息字段 (Requirements 6.1)
            email=kyc.email,
            phone=kyc.phone,
            # 居住地址字段 (Requirements 6.2)
            address_line1=kyc.address_line1,
            address_line2=kyc.address_line2,
            city=kyc.city,
            state=kyc.state,
            postal_code=kyc.postal_code,
            residence_country=kyc.residence_country,
            # 活体检测字段 (Requirements 6.3, 6.4)
            liveness_verified=kyc.liveness_verified or False,
            has_face_image=bool(kyc.face_image_url),
            # 链上同步状态
            on_chain_sync_status=kyc.on_chain_sync_status,
            on_chain_tx_hash=kyc.on_chain_tx_hash,
        )
