"""
KYC 域服务

单一 KycService 类，通过注释分割线组织四个职责分区:
- Contract Interaction: 链上 KYC 合约交互
- User KYC: 用户 KYC 申请与状态管理
- Admin Review: 管理员审核、统计、批量操作
- Media: 文件上传与验证（承接 user/kyc.py 下沉逻辑）
"""

import asyncio
import datetime as dt
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from falib.utils.config import SETTINGS
from falib.utils.log import get_logger
from tortoise.expressions import Q
from tortoise.transactions import in_transaction

from src.common.chain_logger import ChainLogger
from src.common.exceptions import BusinessException, StorageError, ValidationException
from src.common.metrics import start_timer
from src.common.utils import calculate_total_pages
from src.models.account import Account
from src.models.kyc import AccountKyc, AccountKycDocument
from src.models.kyc_audit_log import KycAuditLog
from src.schemas.admin_kyc import (
    BatchReviewRequest,
    BatchReviewResponse,
    BatchReviewResult,
    DailyStats,
    KycAuditLogEntry,
    KycDetail,
    KycListItem,
    KycListQuery,
    KycStats,
    ReviewerStats,
)
from src.schemas.enums import (
    ErrorCode,
    KycAuditAction,
    KycStatus,
    Network,
    OnChainSyncStatus,
)
from src.schemas.enums.contract import ContractScope, ContractType
from src.schemas.kyc import (
    ContractKycStatus,
    KycApplyRequest,
    KycContractComparisonResponse,
    KycDocumentResponse,
    KycFullResponse,
    KycReviewRequest,
    KycStatusResponse,
)
from src.services.storage_service import StorageService

logger = get_logger("business.kyc")
chain_log = ChainLogger("business.kyc")

# 本地 ABI 文件目录 (fallback)
LOCAL_ABI_PATH = Path(__file__).parent.parent.parent / ".build" / "abi"


class KycService:
    """KYC 综合服务

    合并原 KycContractService、KycService、AdminKycService 三个类，
    通过注释分割线组织四个职责分区。
    """

    # C-02: 类级别 nonce 锁 — 防止并发交易 nonce 冲突
    _nonce_lock = asyncio.Lock()

    def __init__(self):
        self._web3 = None
        self._contract = None
        self._contract_address = None
        self._deployment = None
        self.storage = StorageService()

    @property
    def network(self) -> str:
        """获取当前网络（用于 DB 查询和环境判断）"""
        return SETTINGS.network

    # ============ Contract Interaction - 链上交互 ============

    @property
    def web3(self):
        """懒加载 Web3 实例"""
        if self._web3 is None:
            from web3 import AsyncHTTPProvider, AsyncWeb3

            rpc_url = SETTINGS.crypto.mainnet_url
            self._web3 = AsyncWeb3(AsyncHTTPProvider(rpc_url))
            logger.debug(f"Initialized Web3 with RPC: {rpc_url}")
        return self._web3

    async def get_admin_private_key(self) -> str:
        """
        获取 admin 账户私钥

        根据当前环境查找对应的 admin 账户
        """
        env = SETTINGS.environment

        # 环境映射到 Network 枚举
        net_type_map = {
            "hardhat": Network.HARDHAT,
            "sepolia": Network.SEPOLIA,
            "mainnet": Network.ETHEREUM,
        }
        net_type = net_type_map.get(env, Network.HARDHAT)

        admin = await Account.filter(tag="admin", network=net_type).first()
        if not admin:
            raise ValueError(f"Admin account not found for {env} environment")

        logger.debug(f"Found admin account: {admin.address}")
        return admin.private_key

    async def get_contract_deployment(self):
        """
        获取 KYC 合约部署记录

        通过 scope=global + contract_type=kyc 唯一标识查找，
        避免硬编码合约名称。
        """
        if self._deployment is None:
            from src.models.contracts.contract_deployment import ContractDeployment
            from src.schemas.enums import ContractStatus

            self._deployment = await ContractDeployment.filter(
                scope=ContractScope.GLOBAL,
                contract_type=ContractType.KYC,
                network=SETTINGS.network,
                status=ContractStatus.ACTIVE,
            ).first()

            if not self._deployment:
                raise ValueError("KYC 合约未部署 (scope=global, contract_type=kyc)")

            logger.debug(
                f"KYC contract: name={self._deployment.name}, "
                f"address={self._deployment.address}"
            )

        return self._deployment

    async def get_kyc_contract_address(self) -> str:
        """获取 KYC 合约地址"""
        if self._contract_address is None:
            deployment = await self.get_contract_deployment()
            self._contract_address = deployment.address

        return self._contract_address

    async def get_kyc_contract(self):
        """获取 KYC 合约实例，ABI 从部署记录的 abi_path 或本地文件加载"""
        if self._contract is None:
            deployment = await self.get_contract_deployment()
            address = deployment.address

            # 优先从 MinIO (abi_path) 加载
            abi = await self.load_abi(deployment)

            self._contract = self.web3.eth.contract(
                address=self.web3.to_checksum_address(address),
                abi=abi,
            )

        return self._contract

    async def load_abi(self, deployment) -> list:
        """
        加载合约 ABI，按优先级尝试:
        1. MinIO (deployment.abi_path)
        2. 本地 .build/abi/{name}.json

        兼容两种 JSON 格式:
        - 纯数组: [{...}, {...}]  (ape compile 输出)
        - 对象包装: {"abi": [{...}, {...}]}  (Hardhat/Foundry 输出)
        """
        # 1. 尝试从 MinIO 加载
        if deployment.abi_path:
            try:
                from src.common.adapters import get_async_minio_adapter

                async with get_async_minio_adapter() as minio:
                    artifact = await minio.get_json(deployment.abi_path)
                    abi = self.extract_abi(artifact)
                    logger.debug(f"ABI loaded from MinIO: {deployment.abi_path}")
                    return abi
            except Exception as e:
                logger.warning(f"Failed to load ABI from MinIO: {e}, trying local")

        # 2. 本地 fallback
        abi_file = LOCAL_ABI_PATH / f"{deployment.name}.json"
        if not abi_file.exists():
            raise FileNotFoundError(
                f"ABI 文件未找到: {abi_file} (合约: {deployment.name})"
            )

        with open(abi_file) as f:
            artifact = json.load(f)

        return self.extract_abi(artifact)

    @staticmethod
    def extract_abi(artifact) -> list:
        """
        从 JSON 内容提取 ABI 数组

        兼容:
        - list: 直接就是 ABI 数组 (ape compile)
        - dict with "abi": Hardhat/Foundry 格式
        """
        if isinstance(artifact, list):
            return artifact
        if isinstance(artifact, dict) and "abi" in artifact:
            return artifact["abi"]
        raise ValueError(
            f"无法识别的 ABI 格式: type={type(artifact).__name__}, "
            f"keys={list(artifact.keys()) if isinstance(artifact, dict) else 'N/A'}"
        )

    async def add_investor(
        self,
        investor_address: str,
        country_code: str,
        is_accredited: bool,
        wait_confirmation: bool = True,
    ) -> Tuple[str, bool]:
        """
        调用合约 addInvestor()

        参数:
            investor_address: 投资者地址
            country_code: 国家代码 (2 字符)
            is_accredited: 是否为合格投资者
            wait_confirmation: 是否等待确认

        返回:
            Tuple[str, bool]: (tx_hash, success)

        异常:
            ValueError: Admin 不是 verifier
        """
        contract = await self.get_kyc_contract()
        private_key = await self.get_admin_private_key()
        admin_account = self.web3.eth.account.from_key(private_key)

        logger.info(
            f"Adding investor: {investor_address}, "
            f"country: {country_code}, accredited: {is_accredited}"
        )

        chain_log.chain_op(
            "add_investor",
            "Initiating on-chain addInvestor",
            investor_address=investor_address,
            country=country_code,
            accredited=is_accredited,
        )

        # 检查 admin 是否为 verifier
        try:
            is_verifier = await contract.functions.verifiers(
                admin_account.address
            ).call()
            if not is_verifier:
                raise ValueError(
                    f"Admin {admin_account.address} is not a verifier in KYC contract"
                )
        except Exception as e:
            logger.warning(f"Failed to check verifier status: {e}")
            # 继续执行，让合约调用失败时返回更详细的错误

        # 构建交易 (Code Review M2: 使用 estimate_gas 代替硬编码)
        # C-02: nonce lock 保证并发安全
        async with self._nonce_lock:
            timer = start_timer("add_investor")
            try:
                # C-03: 预估 gas + 20% buffer
                investor_checksum = self.web3.to_checksum_address(investor_address)
                country_upper = country_code[:2].upper()

                estimated_gas = await contract.functions.addInvestor(
                    investor_checksum,
                    country_upper,
                    is_accredited,
                ).estimate_gas({"from": admin_account.address})

                gas_with_buffer = int(estimated_gas * 1.2)
                logger.debug(
                    f"Estimated gas: {estimated_gas}, with buffer: {gas_with_buffer}"
                )

                tx = await contract.functions.addInvestor(
                    investor_checksum,
                    country_upper,
                    is_accredited,
                ).build_transaction(
                    {
                        "from": admin_account.address,
                        "nonce": await self.web3.eth.get_transaction_count(
                            admin_account.address
                        ),
                        "gas": gas_with_buffer,
                        "gasPrice": await self.web3.eth.gas_price,
                    }
                )

                # 签名并发送
                signed = self.web3.eth.account.sign_transaction(tx, private_key)
                tx_hash = await self.web3.eth.send_raw_transaction(
                    signed.raw_transaction
                )
                tx_hash_hex = tx_hash.hex()

                logger.info(f"Transaction sent: {tx_hash_hex}")

                chain_log.chain_op(
                    "add_investor",
                    "Transaction sent, awaiting confirmation",
                    investor_address=investor_address,
                    tx_hash=tx_hash_hex,
                    gas_used=gas_with_buffer,
                )

                if wait_confirmation:
                    try:
                        receipt = await self.web3.eth.wait_for_transaction_receipt(
                            tx_hash, timeout=60
                        )
                        success = receipt.status == 1
                        if success:
                            chain_log.chain_op(
                                "add_investor",
                                "Transaction confirmed",
                                investor_address=investor_address,
                                tx_hash=tx_hash_hex,
                                block=receipt.get("blockNumber"),
                            )
                        else:
                            chain_log.chain_op(
                                "add_investor",
                                "Transaction failed on-chain",
                                level="warning",
                                investor_address=investor_address,
                                tx_hash=tx_hash_hex,
                                status=receipt.status,
                            )
                        await timer.finish(
                            success=success, error=None if success else "tx_reverted"
                        )
                        return tx_hash_hex, success
                    except Exception as e:
                        logger.error(f"Transaction confirmation failed: {e}")
                        await timer.finish(success=False, error=str(e)[:100])
                        return tx_hash_hex, False

                return tx_hash_hex, True

            except Exception as e:
                logger.error(f"Failed to add investor: {e}")
                await timer.finish(success=False, error=str(e)[:100])
                raise

    async def is_verified(self, investor_address: str) -> bool:
        """
        查询合约中的 KYC 状态

        参数:
            investor_address: 投资者地址

        返回:
            bool: 是否已验证
        """
        contract = await self.get_kyc_contract()
        return await contract.functions.isVerified(
            self.web3.to_checksum_address(investor_address)
        ).call()

    async def get_investor_info(self, investor_address: str) -> Optional[dict]:
        """
        获取投资者完整信息

        参数:
            investor_address: 投资者地址

        返回:
            dict: 投资者信息，如果不存在返回 None
        """
        contract = await self.get_kyc_contract()

        try:
            info = await contract.functions.getInvestorInfo(
                self.web3.to_checksum_address(investor_address)
            ).call()

            return {
                "verified": info[0],
                "country": info[1],
                "accredited_investor": info[2],
                "added_time": info[3],
                "verification_time": info[4],
                "expiry_time": info[5],
                "frozen": info[6],
            }
        except Exception as e:
            logger.warning(f"Failed to get investor info: {e}")
            return None

    # ============ User KYC - 用户申请 ============

    async def get_status(self, wallet_address: str) -> KycStatusResponse:
        """
        获取钱包的 KYC 状态

        参数:
            wallet_address: 钱包地址

        返回:
            KYC 状态响应
        """
        address = wallet_address.lower()

        kyc = await AccountKyc.filter(address=address, network=self.network).first()

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
        self,
        wallet_address: str,
        contract_verified: Optional[bool] = None,
        contract_info: Optional[dict] = None,
        contract_error: Optional[str] = None,
    ) -> Optional[KycContractComparisonResponse]:
        """
        获取数据库与合约 KYC 状态对比

        如果调用方未提供链上数据，方法内部自动查询链上状态（含降级处理）。

        参数:
            wallet_address: 钱包地址
            contract_verified: 链上验证状态 (可选，不传则内部查询)
            contract_info: 链上投资者信息字典 (可选，不传则内部查询)
            contract_error: 链上查询错误信息 (可选，不传则内部查询)

        返回:
            KycContractComparisonResponse 或 None (如果数据库中不存在记录)
        """
        address = wallet_address.lower()

        # 获取数据库状态
        kyc = await AccountKyc.filter(address=address, network=self.network).first()

        if not kyc:
            return None

        # 如果调用方未提供链上数据，内部自动查询（含降级处理）
        if (
            contract_verified is None
            and contract_info is None
            and contract_error is None
        ):
            try:
                contract_verified = await self.is_verified(wallet_address)
                contract_info = await self.get_investor_info(wallet_address)
            except BusinessException as e:
                contract_error = str(e)
                logger.warning(f"链上 KYC 状态查询失败: {e}")

        # 构建合约状态对象
        contract_status_info: Optional[ContractKycStatus] = None
        if contract_info:
            contract_status_info = ContractKycStatus(**contract_info)

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
            contract_info=contract_status_info,
            contract_error=contract_error,
            is_consistent=is_consistent,
        )

    async def apply(self, data: KycApplyRequest) -> KycFullResponse:
        """
        发起 KYC 申请 (多证件版本)

        参数:
            data: 申请数据 (包含多个证件信息)

        返回:
            KYC 完整响应

        异常:
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
                await self.create_documents(existing, data.documents)

                return await self.to_full_response(existing)

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
        await self.create_documents(kyc, data.documents)

        return await self.to_full_response(kyc)

    async def create_documents(
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

        参数:
            kyc_id: KYC ID

        返回:
            KYC 完整响应或 None
        """
        kyc = await AccountKyc.filter(id=kyc_id).first()

        if not kyc:
            return None

        return await self.to_full_response(kyc)

    async def list_kyc_user(
        self, status: Optional[KycStatus] = None, page: int = 1, page_size: int = 10
    ) -> Tuple[List[KycFullResponse], int, int]:
        """
        获取 KYC 列表 (管理员用，简单版)

        参数:
            status: 状态筛选
            page: 页码
            page_size: 每页数量

        返回:
            (列表, 总数, 总页数)
        """
        query = AccountKyc.all()

        if status:
            query = query.filter(status=status)

        total = await query.count()
        total_pages = calculate_total_pages(total, page_size)

        offset = (page - 1) * page_size
        kycs = await query.order_by("-submitted_at").offset(offset).limit(page_size)

        # 异步获取每个 KYC 的完整响应
        responses = []
        for k in kycs:
            responses.append(await self.to_full_response(k))
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

        参数:
            kyc_id: KYC 记录 ID
            current_step: 当前步骤索引 (0-3)
            confirmed_steps: 各步骤确认状态 (长度为4的布尔数组)
            reviewer_address: 审核员钱包地址

        异常:
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
        self,
        kyc_id: int,
        tx_hash: str,
        admin_address: str,
        chain_verified: Optional[bool] = None,
    ) -> KycFullResponse:
        """
        记录链上准入结果 - 前端钱包交易确认后调用

        管理员通过浏览器钱包发起 addInvestor() 交易成功后，
        前端调用此方法记录交易哈希并更新链上同步状态。

        内部自动调用链上 is_verified() 进行验证，合约服务不可用时降级处理。

        参数:
            kyc_id: KYC 记录 ID
            tx_hash: 链上交易哈希
            admin_address: 管理员钱包地址
            chain_verified: 链上验证结果（可选，向后兼容）
                - 如果不传（None），方法内部自动查询链上状态
                - 如果显式传入，使用传入值

        返回:
            更新后的 KYC 完整响应

        异常:
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
            return await self.to_full_response(kyc)
        if kyc.on_chain_sync_status == OnChainSyncStatus.SYNCED:
            raise BusinessException(code=400, message="KYC already admitted on-chain")

        # 如果调用方未提供 chain_verified，内部自动查询链上状态（含降级处理）
        if chain_verified is None:
            try:
                chain_verified = await self.is_verified(kyc.address)
            except BusinessException:
                # 合约服务调用失败时降级处理，chain_verified 保持 None
                logger.warning("链上验证查询失败，降级处理")

        # 验证链上状态 — 确认 addInvestor() 交易确实生效
        if chain_verified is not None and not chain_verified:
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
        # chain_verified 为 None 时跳过验证（降级处理）

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

        return await self.to_full_response(kyc)

    async def record_revocation(
        self, kyc_id: int, tx_hash: str, admin_address: str, reason: str
    ) -> KycFullResponse:
        """
        记录链上解除准入结果 - 前端钱包交易确认后调用

        参数:
            kyc_id: KYC 记录 ID
            tx_hash: 链上交易哈希
            admin_address: 管理员钱包地址
            reason: 解除准入原因

        返回:
            更新后的 KYC 完整响应

        异常:
            BusinessException: KYC 不存在、或链上状态不是 SYNCED
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
            return await self.to_full_response(kyc)
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

        return await self.to_full_response(kyc)

    async def get_contract_info(self) -> dict:
        """
        获取 KYC 合约部署信息

        通过 scope=global + contract_type=kyc 唯一标识查找，
        用于前端验证管理员钱包是否为合约部署者。

        返回:
            dict: {"contract_address": str, "deployer_address": str}

        异常:
            BusinessException: 合约未部署
        """
        from src.models.contracts.contract_deployment import ContractDeployment
        from src.schemas.enums import ContractStatus

        contract = await ContractDeployment.filter(
            scope=ContractScope.GLOBAL,
            contract_type=ContractType.KYC,
            network=SETTINGS.network,
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

        参数:
            kyc_id: KYC ID
            data: 审核数据
            reviewer_address: 审核人钱包地址

        返回:
            更新后的 KYC 响应

        异常:
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

        # Stepper Modal: 将审核步骤确认轨迹写入 KycAuditLog.details
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

        return await self.to_full_response(kyc)

    async def quick_approve(self, wallet_address: str) -> KycFullResponse:
        """
        快速通过 KYC (开发工具，仅 local/test 环境)

        参数:
            wallet_address: 钱包地址

        返回:
            KYC 响应

        异常:
            BusinessException: 如果不是 hardhat/sepolia 环境
        """
        if self.network not in ("hardhat", "sepolia"):
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

        return await self.to_full_response(kyc)

    async def reset_kyc(self, wallet_address: str) -> bool:
        """
        重置 KYC 状态 (开发工具，仅 hardhat 环境)

        参数:
            wallet_address: 钱包地址

        返回:
            是否成功

        异常:
            BusinessException: 如果不是 hardhat 环境
        """
        if self.network != "hardhat":
            raise BusinessException(
                code=403, message="KYC reset only allowed in hardhat environment"
            )

        address = wallet_address.lower()

        deleted = await AccountKyc.filter(
            address=address, network=self.network
        ).delete()

        return deleted > 0

    async def update_status(self, wallet_address: str, target_status: str) -> str:
        """
        更新 KYC 状态

        用户只能在以下情况下更新状态：
        - 当前状态为 rejected 时，可以设置为 not_started（重新提交）

        参数:
            wallet_address: 钱包地址
            target_status: 目标状态

        返回:
            更新后的状态

        异常:
            BusinessException: 如果状态转换不允许
        """
        address = wallet_address.lower()

        # 验证目标状态
        if target_status != "not_started":
            raise BusinessException(
                code=400,
                message=f"不支持的目标状态: {target_status}",
            )

        kyc = await AccountKyc.filter(address=address, network=self.network).first()

        if not kyc:
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

    async def to_full_response(self, kyc: AccountKyc) -> KycFullResponse:
        """转换为完整响应 (包含多证件信息和扩展字段)

        Requirements 6.5: 映射所有新字段到响应
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
            environment=self.network,
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
            # 联系信息字段
            email=kyc.email,
            phone=kyc.phone,
            # 居住地址字段
            address_line1=kyc.address_line1,
            address_line2=kyc.address_line2,
            city=kyc.city,
            state=kyc.state,
            postal_code=kyc.postal_code,
            residence_country=kyc.residence_country,
            # 活体检测字段
            liveness_verified=kyc.liveness_verified or False,
            has_face_image=bool(kyc.face_image_url),
            has_liveness_video=bool(kyc.liveness_video_url),
            # 链上同步状态
            on_chain_sync_status=kyc.on_chain_sync_status,
            on_chain_tx_hash=kyc.on_chain_tx_hash,
        )

    # ============ Admin Review - 管理员审核 ============

    async def list_pending(
        self, page: int = 1, page_size: int = 10
    ) -> Tuple[List[AccountKyc], int, int]:
        """
        获取待审核列表

        参数:
            page: 页码
            page_size: 每页数量

        返回:
            Tuple[List[AccountKyc], int, int]: (列表, 总数, 总页数)
        """
        query = AccountKyc.filter(
            status=KycStatus.PENDING, network=self.network
        ).order_by("-created_at")

        total = await query.count()
        total_pages = calculate_total_pages(total, page_size)
        items = await query.offset((page - 1) * page_size).limit(page_size)

        return items, total, total_pages

    async def list_by_status(
        self, status: Optional[KycStatus] = None, page: int = 1, page_size: int = 10
    ) -> Tuple[List[AccountKyc], int, int]:
        """
        按状态获取 KYC 列表

        参数:
            status: KYC 状态 (None 表示全部)
            page: 页码
            page_size: 每页数量

        返回:
            Tuple[List[AccountKyc], int, int]: (列表, 总数, 总页数)
        """
        query = AccountKyc.filter(network=self.network)

        if status:
            query = query.filter(status=status)

        query = query.order_by("-created_at")

        total = await query.count()
        total_pages = calculate_total_pages(total, page_size)
        items = await query.offset((page - 1) * page_size).limit(page_size)

        return items, total, total_pages

    def calculate_processing_time(
        self, submitted_at: Optional[dt.datetime], reviewed_at: Optional[dt.datetime]
    ) -> Optional[float]:
        """
        计算处理时间 (分钟)

        处理时间 = (reviewed_at - submitted_at) 转换为分钟

        参数:
            submitted_at: 提交时间
            reviewed_at: 审核时间

        返回:
            处理时间 (分钟)，如果任一时间为空则返回 None
        """
        if submitted_at is None or reviewed_at is None:
            return None

        time_diff = reviewed_at - submitted_at
        processing_minutes = time_diff.total_seconds() / 60

        return round(processing_minutes, 2)

    def kyc_to_list_item(self, kyc: AccountKyc) -> KycListItem:
        """
        将 AccountKyc 模型转换为 KycListItem Schema

        参数:
            kyc: AccountKyc 模型实例

        返回:
            KycListItem Schema 实例
        """
        return KycListItem(
            id=kyc.id,
            wallet_address=kyc.address,
            environment=kyc.network.value
            if hasattr(kyc.network, "value")
            else str(kyc.network),
            status=kyc.status,
            submitted_at=kyc.submitted_at,
            reviewed_at=kyc.reviewed_at,
            reviewer_address=kyc.reviewer_address,
            reject_reason=kyc.reject_reason,
            country_code=kyc.country_code,
            is_accredited=kyc.is_accredited,
            full_name=kyc.full_name,
            date_of_birth=kyc.date_of_birth,
            # 文档状态 - 检查 URL 是否存在
            has_id_front=False,  # 需要通过 documents 关系查询
            has_id_back=False,
            has_selfie=bool(kyc.selfie_url),
            # 链上同步状态
            on_chain_sync_status=kyc.on_chain_sync_status,
            on_chain_tx_hash=kyc.on_chain_tx_hash,
            on_chain_error=kyc.on_chain_error,
            # 扩展字段 - 风险评估
            risk_level=kyc.risk_level,
            risk_score=kyc.risk_score,
            priority=kyc.priority,
            processing_time_minutes=self.calculate_processing_time(
                kyc.submitted_at, kyc.reviewed_at
            ),
            is_pep=kyc.is_pep,
            is_sanctioned=kyc.is_sanctioned,
            # 时间戳
            created_at=kyc.created_at,
            updated_at=kyc.updated_at,
        )

    async def list_kyc(
        self, query_params: KycListQuery
    ) -> Tuple[List[KycListItem], int, int]:
        """
        获取 KYC 列表 (支持高级筛选和排序)

        支持以下筛选条件:
        - status: KYC 状态
        - risk_level: 风险等级
        - priority: 审核优先级
        - country_code: 国家代码
        - date_from/date_to: 提交日期范围
        - search_query: 搜索钱包地址或姓名

        参数:
            query_params: KycListQuery 查询参数

        返回:
            Tuple[List[KycListItem], int, int]: (列表项, 总数, 总页数)
        """
        # 基础查询 - 按当前环境筛选
        query = AccountKyc.filter(network=self.network)

        # ========== 筛选条件 ==========

        if query_params.status is not None:
            query = query.filter(status=query_params.status)

        if query_params.risk_level is not None:
            query = query.filter(risk_level=query_params.risk_level)

        if query_params.priority is not None:
            query = query.filter(priority=query_params.priority)

        if query_params.country_code is not None:
            query = query.filter(country_code=query_params.country_code)

        if query_params.date_from is not None:
            query = query.filter(submitted_at__gte=query_params.date_from)

        if query_params.date_to is not None:
            query = query.filter(submitted_at__lte=query_params.date_to)

        if query_params.search_query:
            search_term = query_params.search_query.strip()
            if search_term:
                query = query.filter(
                    Q(address__icontains=search_term)
                    | Q(full_name__icontains=search_term)
                )

        # ========== 排序 ==========

        sort_field = query_params.sort_by or "submitted_at"
        sort_order = query_params.sort_order or "desc"

        if sort_order == "desc":
            order_expr = f"-{sort_field}"
        else:
            order_expr = sort_field

        query = query.order_by(order_expr)

        # ========== 分页 ==========

        page = query_params.page
        page_size = query_params.page_size

        total = await query.count()
        total_pages = calculate_total_pages(total, page_size)

        offset = (page - 1) * page_size
        kyc_records = await query.offset(offset).limit(page_size)

        # ========== 转换为响应格式 ==========

        items = [self.kyc_to_list_item(kyc) for kyc in kyc_records]

        logger.debug(
            f"list_kyc: total={total}, page={page}, page_size={page_size}, "
            f"filters=(status={query_params.status}, risk_level={query_params.risk_level}, "
            f"priority={query_params.priority}, search={query_params.search_query})"
        )

        return items, total, total_pages

    async def get_detail(self, kyc_id: int) -> Optional[KycDetail]:
        """
        获取 KYC 详情 (增强版)

        返回完整的 KYC 详情，包括：
        - KYC 基本信息及扩展字段
        - 文档预签名 URL
        - 审核日志列表
        - 预留字段 (ocr_data, facial_comparison)

        参数:
            kyc_id: KYC ID

        返回:
            KycDetail 响应对象，如果 KYC 不存在则返回 None
        """
        kyc = await AccountKyc.filter(id=kyc_id, network=self.network).first()
        if not kyc:
            return None

        kyc_item = self.kyc_to_list_item(kyc)
        documents = await self.get_document_presigned_urls(kyc)
        audit_logs = await self.get_audit_logs_for_kyc(kyc_id)

        detail = KycDetail(
            kyc=kyc_item,
            documents=documents,
            audit_logs=audit_logs,
            ocr_data=None,
            facial_comparison=None,
            review_progress=kyc.review_progress,
        )

        logger.debug(
            f"get_detail: kyc_id={kyc_id}, status={kyc.status}, "
            f"documents_count={len([v for v in documents.values() if v])}, "
            f"audit_logs_count={len(audit_logs)}"
        )

        return detail

    async def get_document_presigned_urls(
        self, kyc: AccountKyc
    ) -> Dict[str, Optional[str]]:
        """
        获取 KYC 文档的预签名 URL

        从 AccountKycDocument 关联表获取证件照片，
        并从 AccountKyc 获取自拍照片、人脸图片和活体检测视频。

        参数:
            kyc: AccountKyc 模型实例

        返回:
            包含 id_front, id_back, selfie, face_image, liveness_video 预签名 URL 的字典
        """
        documents: Dict[str, Optional[str]] = {
            "id_front": None,
            "id_back": None,
            "selfie": None,
            "face_image": None,
            "liveness_video": None,
        }

        try:
            kyc_documents = await kyc.documents.all()

            for doc in kyc_documents:
                if doc.id_front_url:
                    documents["id_front"] = await self.storage.get_presigned_url(
                        doc.id_front_url
                    )
                if doc.id_back_url:
                    documents["id_back"] = await self.storage.get_presigned_url(
                        doc.id_back_url
                    )

            if kyc.selfie_url:
                documents["selfie"] = await self.storage.get_presigned_url(
                    kyc.selfie_url
                )

        except Exception as e:
            logger.warning(
                f"Failed to generate presigned URLs for kyc_id={kyc.id}: {e}"
            )

        try:
            if kyc.face_image_url:
                documents["face_image"] = await self.storage.get_presigned_url(
                    kyc.face_image_url
                )
        except Exception as e:
            logger.warning(
                f"Failed to generate face_image presigned URL for kyc_id={kyc.id}: {e}"
            )

        try:
            if kyc.liveness_video_url:
                documents["liveness_video"] = await self.storage.get_presigned_url(
                    kyc.liveness_video_url
                )
        except Exception as e:
            logger.warning(
                f"Failed to generate liveness_video presigned URL for kyc_id={kyc.id}: {e}"
            )

        return documents

    async def get_audit_logs_for_kyc(self, kyc_id: int) -> List[KycAuditLogEntry]:
        """
        获取指定 KYC 的所有审核日志

        按 created_at 降序排序 (最新的在前)。

        参数:
            kyc_id: KYC ID

        返回:
            KycAuditLogEntry 列表
        """
        audit_logs = await KycAuditLog.filter(kyc_id=kyc_id).order_by("-created_at")

        return [
            KycAuditLogEntry(
                id=log.id,
                kyc_id=log.kyc_id,
                action=log.action,
                actor_address=log.actor_address,
                actor_role=log.actor_role,
                details=log.details,
                created_at=log.created_at,
            )
            for log in audit_logs
        ]

    async def get_audit_logs(self, kyc_id: int) -> List[KycAuditLogEntry]:
        """
        获取指定 KYC 的所有审核日志 (公开 API 方法)

        参数:
            kyc_id: KYC ID

        返回:
            KycAuditLogEntry 列表，按 created_at 降序排序

        异常:
            ValueError: 当 kyc_id 对应的 KYC 记录不存在时
        """
        kyc = await AccountKyc.filter(id=kyc_id, network=self.network).first()
        if not kyc:
            raise ValueError(f"KYC record with id {kyc_id} not found")

        audit_logs = await self.get_audit_logs_for_kyc(kyc_id)

        logger.debug(f"get_audit_logs: kyc_id={kyc_id}, count={len(audit_logs)}")

        return audit_logs

    async def get_detail_with_documents(self, kyc_id: int) -> Optional[Dict[str, Any]]:
        """
        获取 KYC 详情，包含文件预签名 URL (向后兼容方法)

        注意: 此方法保留用于向后兼容，推荐使用 get_detail() 方法。

        参数:
            kyc_id: KYC ID

        返回:
            包含 kyc 和 documents 的字典，或 None
        """
        kyc = await AccountKyc.filter(id=kyc_id, network=self.network).first()
        if not kyc:
            return None

        documents = await self.get_document_presigned_urls(kyc)

        return {"kyc": kyc, "documents": documents}

    async def get_contract_comparison_admin(
        self,
        kyc_id: int,
        contract_verified: Optional[bool] = None,
        contract_info: Optional[dict] = None,
        contract_error: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        比较数据库和合约状态 (管理员视角，按 kyc_id 查询)

        参数:
            kyc_id: KYC ID
            contract_verified: 链上验证状态（由 API 层预获取）
            contract_info: 链上投资者信息（由 API 层预获取）
            contract_error: 链上查询错误信息（由 API 层预获取）

        返回:
            包含 database 和 on_chain 状态的字典
        """
        kyc = await AccountKyc.filter(id=kyc_id, network=self.network).first()
        if not kyc:
            return None

        return {
            "database": {
                "status": kyc.status.value,
                "sync_status": kyc.on_chain_sync_status.value
                if kyc.on_chain_sync_status
                else None,
                "tx_hash": kyc.on_chain_tx_hash,
                "synced_at": kyc.on_chain_synced_at.isoformat()
                if kyc.on_chain_synced_at
                else None,
                "error": kyc.on_chain_error,
            },
            "on_chain": {
                "verified": contract_verified,
                "info": contract_info,
                "error": contract_error,
            },
        }

    async def list_failed_sync(self) -> List[AccountKyc]:
        """
        获取同步失败的 KYC 列表

        返回:
            同步失败的 KYC 列表
        """
        return await AccountKyc.filter(
            on_chain_sync_status=OnChainSyncStatus.FAILED,
            network=self.network,
        ).order_by("-updated_at")

    async def get_stats(self) -> KycStats:
        """
        获取 KYC 扩展统计

        返回完整的 KYC 统计数据，包括：
        - 基础计数 (pending, approved, rejected, failed_sync, total)
        - 处理时间统计 (avg, median)
        - 转化率 (approval_rate, resubmit_rate)
        - 风险分布
        - 每日统计 (最近7天)
        - 审核者统计
        """
        basic_counts = await self.get_basic_counts()
        time_stats = await self.get_processing_time_stats()
        conversion_rates = await self.get_conversion_rates(basic_counts)
        risk_distribution = await self.get_risk_distribution()
        daily_stats = await self.get_daily_stats()
        reviewer_stats = await self.get_reviewer_stats()

        stats = KycStats(
            pending=basic_counts["pending"],
            approved=basic_counts["approved"],
            rejected=basic_counts["rejected"],
            failed_sync=basic_counts["failed_sync"],
            revoked=basic_counts["revoked"],
            total=basic_counts["total"],
            avg_processing_time_minutes=time_stats["avg"],
            median_processing_time_minutes=time_stats["median"],
            approval_rate=conversion_rates["approval_rate"],
            resubmit_rate=conversion_rates["resubmit_rate"],
            risk_distribution=risk_distribution,
            daily_stats=daily_stats,
            reviewer_stats=reviewer_stats,
        )

        logger.debug(
            f"get_stats: total={stats.total}, pending={stats.pending}, "
            f"approved={stats.approved}, rejected={stats.rejected}, "
            f"approval_rate={stats.approval_rate:.2f}%"
        )

        return stats

    async def get_basic_counts(self) -> Dict[str, int]:
        """获取基础计数统计"""
        base_query = AccountKyc.filter(network=self.network)

        pending = await base_query.filter(status=KycStatus.PENDING).count()
        approved = await base_query.filter(status=KycStatus.APPROVED).count()
        rejected = await base_query.filter(status=KycStatus.REJECTED).count()
        failed_sync = await base_query.filter(
            on_chain_sync_status=OnChainSyncStatus.FAILED
        ).count()
        revoked = await base_query.filter(
            on_chain_sync_status=OnChainSyncStatus.REVOKED
        ).count()

        return {
            "pending": pending,
            "approved": approved,
            "rejected": rejected,
            "failed_sync": failed_sync,
            "revoked": revoked,
            "total": pending + approved + rejected,
        }

    async def get_processing_time_stats(self) -> Dict[str, float]:
        """获取处理时间统计 (平均值和中位数，单位：分钟)"""
        reviewed_records = await AccountKyc.filter(
            network=self.network,
            submitted_at__isnull=False,
            reviewed_at__isnull=False,
        ).values("submitted_at", "reviewed_at")

        if not reviewed_records:
            return {"avg": 0.0, "median": 0.0}

        processing_times = []
        for record in reviewed_records:
            submitted_at = record["submitted_at"]
            reviewed_at = record["reviewed_at"]
            if submitted_at and reviewed_at:
                time_diff = (reviewed_at - submitted_at).total_seconds() / 60
                if time_diff >= 0:
                    processing_times.append(time_diff)

        if not processing_times:
            return {"avg": 0.0, "median": 0.0}

        avg_time = sum(processing_times) / len(processing_times)

        from statistics import median as calc_median

        median_time = calc_median(processing_times)

        return {
            "avg": round(avg_time, 2),
            "median": round(median_time, 2),
        }

    async def get_conversion_rates(
        self, basic_counts: Dict[str, int]
    ) -> Dict[str, float]:
        """获取转化率统计 (通过率和重新提交率)"""
        approved = basic_counts["approved"]
        rejected = basic_counts["rejected"]

        total_reviewed = approved + rejected
        if total_reviewed > 0:
            approval_rate = (approved / total_reviewed) * 100
        else:
            approval_rate = 0.0

        resubmit_count = await KycAuditLog.filter(
            kyc__network=self.network,
            action=KycAuditAction.RESUBMIT,
        ).count()

        submit_count = await KycAuditLog.filter(
            kyc__network=self.network,
            action=KycAuditAction.SUBMIT,
        ).count()

        if submit_count > 0:
            resubmit_rate = (resubmit_count / submit_count) * 100
        else:
            resubmit_rate = 0.0

        return {
            "approval_rate": round(approval_rate, 2),
            "resubmit_rate": round(resubmit_rate, 2),
        }

    async def get_risk_distribution(self) -> Dict[str, int]:
        """获取风险分布统计"""
        from src.schemas.enums import RiskLevel

        distribution = {level.value: 0 for level in RiskLevel}

        records = await AccountKyc.filter(network=self.network).values("risk_level")

        for record in records:
            risk_level = record["risk_level"]
            if hasattr(risk_level, "value"):
                level_value = risk_level.value
            else:
                level_value = str(risk_level)

            if level_value in distribution:
                distribution[level_value] += 1

        return distribution

    async def get_daily_stats(self) -> List[DailyStats]:
        """获取每日统计 (最近7天)"""
        import datetime as datetime_module

        today = datetime_module.date.today()
        seven_days_ago = today - datetime_module.timedelta(days=6)

        daily_data: Dict[datetime_module.date, Dict[str, int]] = {}
        for i in range(7):
            date = seven_days_ago + datetime_module.timedelta(days=i)
            daily_data[date] = {"submitted": 0, "approved": 0, "rejected": 0}

        submitted_records = await AccountKyc.filter(
            network=self.network,
            submitted_at__gte=datetime_module.datetime.combine(
                seven_days_ago, datetime_module.time.min
            ),
            submitted_at__lt=datetime_module.datetime.combine(
                today + datetime_module.timedelta(days=1), datetime_module.time.min
            ),
        ).values("submitted_at")

        for record in submitted_records:
            submitted_at = record["submitted_at"]
            if submitted_at:
                date = submitted_at.date()
                if date in daily_data:
                    daily_data[date]["submitted"] += 1

        reviewed_records = await AccountKyc.filter(
            network=self.network,
            reviewed_at__gte=datetime_module.datetime.combine(
                seven_days_ago, datetime_module.time.min
            ),
            reviewed_at__lt=datetime_module.datetime.combine(
                today + datetime_module.timedelta(days=1), datetime_module.time.min
            ),
        ).values("reviewed_at", "status")

        for record in reviewed_records:
            reviewed_at = record["reviewed_at"]
            status = record["status"]
            if reviewed_at:
                date = reviewed_at.date()
                if date in daily_data:
                    if hasattr(status, "value"):
                        status_value = status.value
                    else:
                        status_value = str(status)

                    if status_value == KycStatus.APPROVED.value:
                        daily_data[date]["approved"] += 1
                    elif status_value == KycStatus.REJECTED.value:
                        daily_data[date]["rejected"] += 1

        result = []
        for date in sorted(daily_data.keys()):
            data = daily_data[date]
            result.append(
                DailyStats(
                    date=date,
                    submitted=data["submitted"],
                    approved=data["approved"],
                    rejected=data["rejected"],
                )
            )

        return result

    async def get_reviewer_stats(self) -> List[ReviewerStats]:
        """获取审核者统计"""
        reviewed_records = await AccountKyc.filter(
            network=self.network,
            reviewer_address__isnull=False,
        ).values("reviewer_address", "status")

        if not reviewed_records:
            return []

        reviewer_data: Dict[str, Dict[str, int]] = {}
        for record in reviewed_records:
            reviewer = record["reviewer_address"]
            status = record["status"]

            if reviewer not in reviewer_data:
                reviewer_data[reviewer] = {"total": 0, "approved": 0}

            reviewer_data[reviewer]["total"] += 1

            if hasattr(status, "value"):
                status_value = status.value
            else:
                status_value = str(status)

            if status_value == KycStatus.APPROVED.value:
                reviewer_data[reviewer]["approved"] += 1

        result = []
        for reviewer_address, data in reviewer_data.items():
            total = data["total"]
            approved = data["approved"]
            approval_rate = (approved / total * 100) if total > 0 else 0.0

            result.append(
                ReviewerStats(
                    reviewer_address=reviewer_address,
                    reviewed_count=total,
                    approval_rate=round(approval_rate, 2),
                )
            )

        result.sort(key=lambda x: x.reviewed_count, reverse=True)

        return result

    async def batch_review(
        self, request: BatchReviewRequest, reviewer_address: str
    ) -> BatchReviewResponse:
        """
        批量审核 KYC 申请

        处理多个 KYC 记录的审核操作，支持批量通过或拒绝。
        采用"尽力而为"策略：遇到单条记录错误时继续处理其他记录。

        参数:
            request: 批量审核请求
            reviewer_address: 审核者钱包地址

        返回:
            BatchReviewResponse: 包含处理结果统计和各条记录的处理状态
        """
        results: List[BatchReviewResult] = []
        success_count = 0
        failed_count = 0

        # 验证拒绝操作必须提供原因代码
        if request.action == "reject" and not request.reject_reason_code:
            for kyc_id in request.kyc_ids:
                results.append(
                    BatchReviewResult(
                        kyc_id=kyc_id,
                        success=False,
                        error="reject_reason_code is required when rejecting",
                    )
                )
            return BatchReviewResponse(
                total=len(request.kyc_ids),
                success=0,
                failed=len(request.kyc_ids),
                results=results,
            )

        for kyc_id in request.kyc_ids:
            try:
                kyc = await AccountKyc.filter(id=kyc_id, network=self.network).first()

                if not kyc:
                    results.append(
                        BatchReviewResult(
                            kyc_id=kyc_id,
                            success=False,
                            error=f"KYC record {kyc_id} not found",
                        )
                    )
                    failed_count += 1
                    continue

                if kyc.status != KycStatus.PENDING:
                    results.append(
                        BatchReviewResult(
                            kyc_id=kyc_id,
                            success=False,
                            error=f"KYC record {kyc_id} is not in pending status (current: {kyc.status.value})",
                        )
                    )
                    failed_count += 1
                    continue

                async with in_transaction() as conn:
                    kyc.reviewed_at = datetime.now(timezone.utc)
                    kyc.reviewer_address = reviewer_address.lower()

                    if request.action == "approve":
                        kyc.status = KycStatus.APPROVED
                        kyc.is_accredited = request.is_accredited
                        kyc.on_chain_sync_status = OnChainSyncStatus.PENDING
                        kyc.on_chain_error = None

                        await create_kyc_audit_log(
                            kyc_id=kyc_id,
                            action=KycAuditAction.APPROVE,
                            actor_address=reviewer_address,
                            actor_role="admin",
                            details={
                                "is_accredited": request.is_accredited,
                                "batch_review": True,
                                "on_chain_sync_status": kyc.on_chain_sync_status.value
                                if kyc.on_chain_sync_status
                                else None,
                            },
                        )

                    else:
                        kyc.status = KycStatus.REJECTED
                        reject_reason_parts: List[str] = []
                        if request.reject_reason_code:
                            reject_reason_parts.append(request.reject_reason_code)
                        if request.reject_reason:
                            reject_reason_parts.append(request.reject_reason)
                        kyc.reject_reason = (
                            ": ".join(reject_reason_parts)
                            if reject_reason_parts
                            else None
                        )
                        kyc.is_accredited = False
                        kyc.on_chain_sync_status = OnChainSyncStatus.NOT_REQUIRED

                        await create_kyc_audit_log(
                            kyc_id=kyc_id,
                            action=KycAuditAction.REJECT,
                            actor_address=reviewer_address,
                            actor_role="admin",
                            details={
                                "reject_reason_code": request.reject_reason_code,
                                "reject_reason": request.reject_reason,
                                "batch_review": True,
                            },
                        )

                    await kyc.save(using_db=conn)

                results.append(
                    BatchReviewResult(
                        kyc_id=kyc_id,
                        success=True,
                        error=None,
                    )
                )
                success_count += 1

                logger.info(
                    f"Batch review: kyc_id={kyc_id} {request.action}d successfully"
                )

            except Exception as e:
                logger.error(f"Batch review: failed to process kyc_id={kyc_id}: {e}")
                results.append(
                    BatchReviewResult(
                        kyc_id=kyc_id,
                        success=False,
                        error=str(e),
                    )
                )
                failed_count += 1

        response = BatchReviewResponse(
            total=len(request.kyc_ids),
            success=success_count,
            failed=failed_count,
            results=results,
        )

        logger.info(
            f"Batch review completed: total={response.total}, "
            f"success={response.success}, failed={response.failed}, "
            f"action={request.action}"
        )

        return response

    # ============ Media - 文件上传与验证 ============

    # 文件上传配置
    ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "pdf"}
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

    # 视频上传配置
    ALLOWED_VIDEO_EXTENSIONS = {"webm"}
    MAX_VIDEO_SIZE = 50 * 1024 * 1024  # 50MB

    # 多证件上传支持的文档类型
    ALLOWED_DOCUMENT_TYPES = {
        "passport_front",
        "id_card_front",
        "id_card_back",
        "drivers_license_front",
        "drivers_license_back",
        "selfie",
    }

    # Base64 图片支持
    BASE64_ALLOWED_IMAGE_TYPES = {"jpg", "jpeg", "png"}
    MIME_TO_EXT = {
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/png": "png",
    }
    IMAGE_MAGIC_BYTES = {
        b"\xff\xd8\xff": "jpg",  # JPEG
        b"\x89PNG\r\n\x1a\n": "png",  # PNG
    }
    WEBM_MAGIC_BYTES = b"\x1a\x45\xdf\xa3"  # EBML header

    def detect_image_type(self, data: bytes) -> str | None:
        """通过魔数检测图片类型"""
        for magic, ext in self.IMAGE_MAGIC_BYTES.items():
            if data.startswith(magic):
                return ext
        return None

    def extract_base64_data(self, image_data: str) -> tuple[str, str | None]:
        """
        从 base64 字符串中提取纯 base64 数据和 MIME 类型

        支持两种格式:
        1. Data URI: data:image/jpeg;base64,/9j/4AAQSkZJRg...
        2. 纯 Base64: /9j/4AAQSkZJRg...
        """
        mime_type = None
        base64_data = image_data.strip()

        if base64_data.startswith("data:"):
            try:
                if ";base64," in base64_data:
                    header, base64_data = base64_data.split(";base64,", 1)
                    mime_type = header.replace("data:", "")
                elif "," in base64_data:
                    header, base64_data = base64_data.split(",", 1)
                    mime_type = header.replace("data:", "")
            except (ValueError, IndexError):
                pass

        return base64_data, mime_type

    def is_webm_video(self, data: bytes) -> bool:
        """通过魔数检测是否为 WebM 视频"""
        return data.startswith(self.WEBM_MAGIC_BYTES)

    async def upload_kyc_document(
        self,
        wallet_address: str,
        document_type: str,
        file_content: bytes,
        filename: str,
        content_type: str | None,
    ) -> str:
        """
        上传 KYC 证件照片

        验证文档类型、文件格式、文件大小，上传到 MinIO。

        参数:
            wallet_address: 钱包地址
            document_type: 文档类型
            file_content: 文件二进制内容
            filename: 文件名
            content_type: MIME 类型

        返回:
            上传后的文件路径 (object_name)
        """
        import uuid

        # 验证文档类型
        if document_type not in self.ALLOWED_DOCUMENT_TYPES:
            raise ValidationException(
                message=f"不支持的文档类型，允许: {', '.join(sorted(self.ALLOWED_DOCUMENT_TYPES))}",
                error_code=ErrorCode.VALIDATION_ERROR,
            )

        # 验证文件名
        if not filename:
            raise ValidationException(
                message="文件名不能为空",
                error_code=ErrorCode.VALIDATION_ERROR,
            )

        ext = filename.split(".")[-1].lower()
        if ext not in self.ALLOWED_EXTENSIONS:
            raise ValidationException(
                message=f"不支持的文件格式，允许: {', '.join(self.ALLOWED_EXTENSIONS)}",
                error_code=ErrorCode.VALIDATION_ERROR,
            )

        # 验证文件大小
        if len(file_content) > self.MAX_FILE_SIZE:
            raise ValidationException(
                message=f"文件大小超过 {self.MAX_FILE_SIZE // (1024 * 1024)}MB 限制",
                error_code=ErrorCode.VALIDATION_ERROR,
            )

        # 生成文件路径
        prefix = f"kyc/{wallet_address}/{document_type}_"
        object_name = f"{prefix}{uuid.uuid4()}.{ext}"

        # 上传到 MinIO
        try:
            # 先删除该类型的旧文件 (覆盖上传)
            deleted_count = await self.storage.delete_by_prefix(prefix)
            if deleted_count > 0:
                logger.info(f"Deleted {deleted_count} old file(s) for {document_type}")

            await self.storage.upload_raw(
                object_name=object_name,
                file_data=file_content,
                content_type=content_type or f"image/{ext}",
            )
            logger.info(f"KYC document uploaded: {object_name}")
        except BusinessException:
            raise
        except (StorageError, OSError, ConnectionError) as e:
            logger.error(f"Failed to upload KYC document: {e}")
            raise BusinessException(
                message="文件上传失败，请重试",
                code=500,
                error_code=ErrorCode.MEDIA_UPLOAD_FAILED,
            )

        return object_name

    async def upload_base64_image(
        self,
        wallet_address: str,
        document_type: str,
        image_data: str,
    ) -> str:
        """
        上传 Base64 编码的图片

        解码 base64 数据，验证图片类型和大小，上传到 MinIO。

        参数:
            wallet_address: 钱包地址
            document_type: 文档类型
            image_data: Base64 编码的图片数据

        返回:
            上传后的文件路径 (object_name)
        """
        import base64 as b64
        import uuid

        # 1. 提取纯 base64 数据和 MIME 类型
        base64_data, mime_type = self.extract_base64_data(image_data)

        # 2. 解码 base64 数据
        try:
            padding = 4 - len(base64_data) % 4
            if padding != 4:
                base64_data += "=" * padding
            decoded_data = b64.b64decode(base64_data, validate=True)
        except (ValueError, Exception) as e:
            logger.warning(f"Base64 decode failed: {e}")
            raise ValidationException(
                message="Invalid base64 image data",
                error_code=ErrorCode.VALIDATION_ERROR,
            )

        # 3. 验证图片大小
        if len(decoded_data) > self.MAX_FILE_SIZE:
            raise ValidationException(
                message="Image size exceeds 10MB limit",
                error_code=ErrorCode.VALIDATION_ERROR,
            )

        # 4. 检测图片类型 (通过魔数)
        detected_ext = self.detect_image_type(decoded_data)
        if detected_ext is None and mime_type:
            detected_ext = self.MIME_TO_EXT.get(mime_type.lower())

        # 5. 验证图片类型
        if detected_ext is None or detected_ext not in self.BASE64_ALLOWED_IMAGE_TYPES:
            raise ValidationException(
                message="Unsupported image type, allowed: jpg, jpeg, png",
                error_code=ErrorCode.VALIDATION_ERROR,
            )

        # 6. 生成文件路径
        prefix = f"kyc/{wallet_address}/{document_type}_"
        object_name = f"{prefix}{uuid.uuid4()}.{detected_ext}"

        content_type = f"image/{detected_ext}"
        if detected_ext == "jpg":
            content_type = "image/jpeg"

        # 7. 上传到 MinIO
        try:
            deleted_count = await self.storage.delete_by_prefix(prefix)
            if deleted_count > 0:
                logger.info(f"Deleted {deleted_count} old file(s) for {document_type}")

            await self.storage.upload_raw(
                object_name=object_name,
                file_data=decoded_data,
                content_type=content_type,
            )
            logger.info(f"Base64 image uploaded: {object_name}")
        except BusinessException:
            raise
        except (StorageError, OSError, ConnectionError) as e:
            logger.error(f"Failed to upload base64 image: {e}")
            raise BusinessException(
                message="File upload failed, please retry",
                code=500,
                error_code=ErrorCode.MEDIA_UPLOAD_FAILED,
            )

        return object_name

    async def upload_liveness_video(
        self,
        wallet_address: str,
        file_content: bytes,
        filename: str,
        content_type: str | None,
    ) -> str:
        """
        上传活体检测视频

        验证视频格式、大小、魔数，上传到 MinIO。

        参数:
            wallet_address: 钱包地址
            file_content: 视频二进制内容
            filename: 文件名
            content_type: MIME 类型

        返回:
            上传后的文件路径 (object_name)
        """
        import uuid

        # 1. 验证文件名
        if not filename:
            raise ValidationException(
                message="Filename is required",
                error_code=ErrorCode.VALIDATION_ERROR,
            )

        # 2. 验证文件扩展名
        ext = filename.split(".")[-1].lower()
        if ext not in self.ALLOWED_VIDEO_EXTENSIONS:
            raise ValidationException(
                message="Unsupported video format, only WebM allowed",
                error_code=ErrorCode.VALIDATION_ERROR,
            )

        # 3. 验证 MIME 类型
        if content_type:
            content_type_lower = content_type.lower()
            is_webm = content_type_lower.startswith("video/webm")
            is_octet_stream = content_type_lower == "application/octet-stream"
            if not is_webm and not is_octet_stream:
                raise ValidationException(
                    message="Unsupported video format, only WebM allowed",
                    error_code=ErrorCode.VALIDATION_ERROR,
                )

        # 4. 验证文件大小
        if len(file_content) > self.MAX_VIDEO_SIZE:
            raise ValidationException(
                message="Video size exceeds 50MB limit",
                error_code=ErrorCode.VALIDATION_ERROR,
            )

        # 5. 验证文件内容是否为 WebM 格式
        if not self.is_webm_video(file_content):
            raise ValidationException(
                message="Invalid video content, only WebM format allowed",
                error_code=ErrorCode.VALIDATION_ERROR,
            )

        # 6. 生成文件路径
        prefix = f"kyc/{wallet_address}/liveness_video_"
        object_name = f"{prefix}{uuid.uuid4()}.webm"

        # 7. 上传到 MinIO
        try:
            deleted_count = await self.storage.delete_by_prefix(prefix)
            if deleted_count > 0:
                logger.info(f"Deleted {deleted_count} old liveness video(s)")

            await self.storage.upload_raw(
                object_name=object_name,
                file_data=file_content,
                content_type="video/webm",
            )
            logger.info(f"Liveness video uploaded: {object_name}")
        except BusinessException:
            raise
        except (StorageError, OSError, ConnectionError) as e:
            logger.error(f"Failed to upload liveness video: {e}")
            raise BusinessException(
                message="Video upload failed, please retry",
                code=500,
                error_code=ErrorCode.MEDIA_UPLOAD_FAILED,
            )

        return object_name


# ============================================================
# 模块级函数和兼容性代码
# ============================================================


async def create_kyc_audit_log(
    kyc_id: int,
    action: KycAuditAction,
    actor_address: str,
    actor_role: str,
    details: Optional[Dict[str, Any]] = None,
) -> KycAuditLog:
    """
    创建 KYC 审核日志记录

    当 KYC 状态发生变更时，自动调用此函数记录审核日志。

    参数:
        kyc_id: KYC 记录 ID
        action: 操作类型 (submit/review/approve/reject/resubmit/sync/reset)
        actor_address: 操作者钱包地址
        actor_role: 操作者角色 (user/admin/system)
        details: 操作详情 (可选，JSON 格式)

    返回:
        KycAuditLog: 创建的审核日志记录

    异常:
        ValueError: 当 kyc_id 对应的 KYC 记录不存在时
    """
    kyc = await AccountKyc.filter(id=kyc_id).first()
    if not kyc:
        raise ValueError(f"KYC record with id {kyc_id} not found")

    audit_log = await KycAuditLog.create(
        kyc_id=kyc_id,
        action=action,
        actor_address=actor_address,
        actor_role=actor_role,
        details=details,
    )

    logger.info(
        f"Created KYC audit log: kyc_id={kyc_id}, action={action.value}, "
        f"actor={actor_address[:10]}..., role={actor_role}"
    )

    return audit_log
