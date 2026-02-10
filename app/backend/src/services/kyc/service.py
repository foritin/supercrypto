"""
KYC Domain - 业务服务
"""

import hashlib
from datetime import datetime, timezone
from typing import List, Optional, Tuple

from falib.utils.config import SETTINGS
from falib.utils.log import get_logger

from src.models.kyc import AccountKyc, AccountKycDocument
from src.models.kyc_audit_log import KycAuditLog
from src.services.kyc.schemas import (
    ContractKycStatus,
    KycApplyRequest,
    KycContractComparisonResponse,
    KycDocumentResponse,
    KycFullResponse,
    KycReviewRequest,
    KycStatusResponse,
)
from src.shared.common.chain_logger import ChainLogger
from src.shared.common.exceptions import BusinessException
from src.shared.schemas.enums import KycAuditAction, KycStatus, OnChainSyncStatus

logger = get_logger("kyc.service")
chain_log = ChainLogger("kyc.service")


class KycService:
    """KYC 服务"""

    @property
    def environment(self) -> str:
        """获取当前网络（用于 DB 查询和环境判断）"""
        return SETTINGS.network

    async def get_status(self, wallet_address: str) -> KycStatusResponse:
        """
        获取钱包的 KYC 状态

        Args:
            wallet_address: 钱包地址

        Returns:
            KYC 状态响应
        """
        address = wallet_address.lower()

        kyc = await AccountKyc.filter(address=address, network=self.environment).first()

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
                on_chain_sync_status=None,
            )

        return KycStatusResponse(
            wallet_address=kyc.address,
            status=kyc.status,
            submitted_at=kyc.submitted_at,
            reviewed_at=kyc.reviewed_at,
            reject_reason=kyc.reject_reason,
            country_code=kyc.country_code,
            is_accredited=kyc.is_accredited,
            on_chain_sync_status=kyc.on_chain_sync_status,
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
                # 重置链上同步状态 - 提交时不需要同步，审核通过后才设 PENDING
                existing.on_chain_sync_status = OnChainSyncStatus.NOT_REQUIRED
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
                existing.liveness_video_url = data.liveness_video_url
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
            on_chain_sync_status=OnChainSyncStatus.NOT_REQUIRED,
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
            liveness_video_url=data.liveness_video_url,
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

    async def update_review_progress(
        self,
        kyc_id: int,
        current_step: int,
        confirmed_steps: list,
        reviewer_address: str,
    ) -> None:
        """
        更新审核步骤进度 (Stepper Modal)

        将审核员的当前步骤进度持久化到 AccountKyc.review_progress JSON 字段，
        确保审核员关闭浏览器后重新打开仍能恢复进度。

        Args:
            kyc_id: KYC 记录 ID
            current_step: 当前步骤索引 (0-3)
            confirmed_steps: 各步骤确认状态 (长度为4的布尔数组)
            reviewer_address: 审核员钱包地址

        Raises:
            BusinessException: 如果 KYC 不存在或状态不是 pending

        Requirements Reference: 8.2, 8.5
        """
        kyc = await AccountKyc.filter(id=kyc_id).first()

        if not kyc:
            raise BusinessException(code=404, message="KYC record not found")

        if kyc.status != KycStatus.PENDING:
            raise BusinessException(
                code=400,
                message=f"Cannot update review progress for KYC in status: {kyc.status}",
            )

        kyc.review_progress = {
            "current_step": current_step,
            "confirmed_steps": confirmed_steps,
            "reviewer_address": reviewer_address.lower(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await kyc.save()

        logger.info(
            f"Updated review progress: kyc_id={kyc_id}, step={current_step}, "
            f"reviewer={reviewer_address[:10]}..."
        )

    async def record_admission(
        self, kyc_id: int, tx_hash: str, admin_address: str
    ) -> KycFullResponse:
        """
        记录链上准入结果 - 前端钱包交易确认后调用

        管理员通过浏览器钱包发起 addInvestor() 交易成功后，
        前端调用此方法记录交易哈希并更新链上同步状态。

        Args:
            kyc_id: KYC 记录 ID
            tx_hash: 链上交易哈希
            admin_address: 管理员钱包地址

        Returns:
            更新后的 KYC 完整响应

        Raises:
            BusinessException: KYC 不存在、状态不是 APPROVED、或已经 SYNCED

        Requirements: 2.5, 2.7, 6.2, 6.5
        """
        kyc = await AccountKyc.filter(id=kyc_id).first()
        if not kyc:
            raise BusinessException(code=404, message="KYC record not found")
        if kyc.status != KycStatus.APPROVED:
            raise BusinessException(
                code=400, message="KYC must be approved before admission"
            )
        # B-03: 幂等性检查 — 同一 tx_hash 重复提交时直接返回，不重复处理
        if (
            kyc.on_chain_sync_status == OnChainSyncStatus.SYNCED
            and kyc.on_chain_tx_hash == tx_hash
        ):
            logger.info(
                f"Idempotent admission: kyc_id={kyc_id} already SYNCED with same tx_hash"
            )
            return await self._to_full_response(kyc)
        if kyc.on_chain_sync_status == OnChainSyncStatus.SYNCED:
            raise BusinessException(code=400, message="KYC already admitted on-chain")

        # 验证链上状态 — 确认 addInvestor() 交易确实生效
        try:
            from src.services.kyc.contract_service import KycContractService

            contract_service = KycContractService()
            is_verified = await contract_service.is_verified(kyc.address)
            if not is_verified:
                kyc.on_chain_sync_status = OnChainSyncStatus.FAILED
                kyc.on_chain_tx_hash = tx_hash
                kyc.on_chain_error = (
                    "Chain verification failed: investor not verified on-chain after tx"
                )
                await kyc.save()
                raise BusinessException(
                    code=400,
                    message="On-chain verification failed: investor not yet verified. The transaction may still be pending.",
                )
        except BusinessException:
            raise
        except Exception as e:
            logger.warning(f"Chain verification skipped for kyc_id={kyc_id}: {e}")
            # 链上验证异常时仍允许记录（降级处理），但记录警告

        kyc.on_chain_sync_status = OnChainSyncStatus.SYNCED
        kyc.on_chain_tx_hash = tx_hash
        kyc.on_chain_synced_at = datetime.now(timezone.utc)
        kyc.on_chain_error = None
        await kyc.save()

        await KycAuditLog.create(
            kyc_id=kyc_id,
            action=KycAuditAction.ADMIT,
            actor_address=admin_address.lower(),
            actor_role="admin",
            details={"tx_hash": tx_hash},
        )

        chain_log.chain_op(
            "record_admission",
            "On-chain admission recorded",
            kyc_id=kyc_id,
            investor_address=kyc.address,
            tx_hash=tx_hash,
            admin=admin_address[:10] + "...",
        )

        return await self._to_full_response(kyc)

    async def record_revocation(
        self, kyc_id: int, tx_hash: str, admin_address: str, reason: str
    ) -> KycFullResponse:
        """
        记录链上解除准入结果 - 前端钱包交易确认后调用

        管理员通过浏览器钱包发起 removeInvestor() 交易成功后，
        前端调用此方法记录交易哈希并更新链上同步状态。

        Args:
            kyc_id: KYC 记录 ID
            tx_hash: 链上交易哈希
            admin_address: 管理员钱包地址
            reason: 解除准入原因

        Returns:
            更新后的 KYC 完整响应

        Raises:
            BusinessException: KYC 不存在、或链上状态不是 SYNCED

        Requirements: 4.5, 6.3, 6.5
        """
        kyc = await AccountKyc.filter(id=kyc_id).first()
        if not kyc:
            raise BusinessException(code=404, message="KYC record not found")
        # B-03: 幂等性检查 — 同一 tx_hash 重复提交时直接返回
        if (
            kyc.on_chain_sync_status == OnChainSyncStatus.REVOKED
            and kyc.on_chain_tx_hash == tx_hash
        ):
            logger.info(
                f"Idempotent revocation: kyc_id={kyc_id} already REVOKED with same tx_hash"
            )
            return await self._to_full_response(kyc)
        if kyc.on_chain_sync_status != OnChainSyncStatus.SYNCED:
            raise BusinessException(
                code=400, message="KYC is not currently admitted on-chain"
            )

        kyc.on_chain_sync_status = OnChainSyncStatus.REVOKED
        kyc.on_chain_tx_hash = tx_hash
        kyc.on_chain_synced_at = None
        kyc.on_chain_error = None
        await kyc.save()

        await KycAuditLog.create(
            kyc_id=kyc_id,
            action=KycAuditAction.REVOKE,
            actor_address=admin_address.lower(),
            actor_role="admin",
            details={"tx_hash": tx_hash, "reason": reason},
        )

        chain_log.chain_op(
            "record_revocation",
            "On-chain revocation recorded",
            kyc_id=kyc_id,
            investor_address=kyc.address,
            tx_hash=tx_hash,
            admin=admin_address[:10] + "...",
            reason=reason[:50],
        )

        return await self._to_full_response(kyc)

    async def get_contract_info(self) -> dict:
        """
        获取 KYC 合约部署信息

        通过 scope=global + contract_type=kyc 唯一标识查找，
        用于前端验证管理员钱包是否为合约部署者。

        Returns:
            dict: {"contract_address": str, "deployer_address": str}

        Raises:
            BusinessException: 合约未部署

        Requirements: 6.1
        """
        from src.models.contracts.contract_deployment import ContractDeployment
        from src.shared.schemas.enums import ContractStatus
        from src.shared.schemas.enums.contract import ContractScope, ContractType

        contract = await ContractDeployment.filter(
            scope=ContractScope.GLOBAL,
            contract_type=ContractType.KYC,
            network=SETTINGS.NETWORK,
            status=ContractStatus.ACTIVE,
        ).first()

        if not contract:
            raise BusinessException(
                code=404,
                message="KYC 合约未部署 (scope=global, contract_type=kyc)",
            )

        return {
            "contract_address": contract.address,
            "deployer_address": contract.deployer_address,
        }

    async def review(
        self, kyc_id: int, data: KycReviewRequest, reviewer_address: str
    ) -> KycFullResponse:
        """
        审核 KYC 申请 (管理员用)

        审核通过后设置 on_chain_sync_status = PENDING，
        等待管理员通过浏览器钱包手动发起链上准入交易。

        Args:
            kyc_id: KYC ID
            data: 审核数据
            reviewer_address: 审核人钱包地址

        Returns:
            更新后的 KYC 响应

        Raises:
            BusinessException: 如果 KYC 不存在或状态不是 pending
        """
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

            # 审核通过后不再自动调用合约，设置 PENDING 等待管理员手动准入
            kyc.on_chain_sync_status = OnChainSyncStatus.PENDING
            kyc.on_chain_tx_hash = None
            kyc.on_chain_synced_at = None
            kyc.on_chain_error = None
        else:
            kyc.status = KycStatus.REJECTED
            kyc.reject_reason = data.reject_reason
            kyc.is_accredited = False
            kyc.on_chain_sync_status = OnChainSyncStatus.NOT_REQUIRED

        # Stepper Modal: 清除审核步骤进度 (Requirements 8.5)
        kyc.review_progress = None

        await kyc.save()

        # Stepper Modal: 将审核步骤确认轨迹写入 KycAuditLog.details (Requirements 8.5, 8.6)
        audit_action = (
            KycAuditAction.APPROVE if data.approved else KycAuditAction.REJECT
        )
        audit_details = {
            "approved": data.approved,
            "is_accredited": data.is_accredited,
        }
        if not data.approved:
            audit_details["reject_reason"] = data.reject_reason
        if data.review_steps:
            audit_details["review_steps"] = data.review_steps.model_dump()

        await KycAuditLog.create(
            kyc_id=kyc_id,
            action=audit_action,
            actor_address=reviewer_address.lower(),
            actor_role="admin",
            details=audit_details,
        )
        logger.info(
            f"Created KYC audit log: kyc_id={kyc_id}, action={audit_action.value}, "
            f"reviewer={reviewer_address[:10]}..., has_review_steps={data.review_steps is not None}"
        )

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

        deleted = await AccountKyc.filter(
            address=address, network=self.environment
        ).delete()

        return deleted > 0

    async def update_status(self, wallet_address: str, target_status: str) -> str:
        """
        更新 KYC 状态

        用户只能在以下情况下更新状态：
        - 当前状态为 rejected 时，可以设置为 not_started（重新提交）

        Args:
            wallet_address: 钱包地址
            target_status: 目标状态

        Returns:
            更新后的状态

        Raises:
            BusinessException: 如果状态转换不允许
        """
        address = wallet_address.lower()

        # 验证目标状态
        if target_status != "not_started":
            raise BusinessException(
                code=400,
                message=f"不支持的目标状态: {target_status}",
            )

        kyc = await AccountKyc.filter(address=address, network=self.environment).first()

        if not kyc:
            # 没有记录，直接返回 not_started
            return "not_started"

        # 只有 rejected 状态可以转换为 not_started
        if kyc.status != KycStatus.REJECTED:
            raise BusinessException(
                code=400,
                message=f"当前状态 {kyc.status.value} 不允许转换为 {target_status}",
            )

        # 删除关联的证件记录
        await AccountKycDocument.filter(kyc_id=kyc.id).delete()

        # 删除 KYC 记录，让用户可以重新填写
        await kyc.delete()

        logger.info(f"KYC status updated to {target_status} for address {address}")
        return target_status

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
            has_liveness_video=bool(kyc.liveness_video_url),
            # 链上同步状态
            on_chain_sync_status=kyc.on_chain_sync_status,
            on_chain_tx_hash=kyc.on_chain_tx_hash,
        )
