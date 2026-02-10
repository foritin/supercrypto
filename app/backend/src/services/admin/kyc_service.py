"""
Admin KYC 服务 (Story 2.9)

提供管理员 KYC 审核相关功能：
- 待审核列表
- 详情 + 文件预签名 URL
- 数据库与合约状态对比
- 同步失败列表
- 审核日志记录
- 高级筛选和排序
"""

import datetime as dt
from typing import Any, Dict, List, Optional, Tuple

from falib.utils.config import SETTINGS
from falib.utils.log import get_logger
from tortoise.expressions import Q

from src.models.kyc import AccountKyc
from src.models.kyc_audit_log import KycAuditLog
from src.services.admin.kyc_schemas import (
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
from src.shared.schemas.enums import (
    KycAuditAction,
    KycStatus,
    OnChainSyncStatus,
)
from src.shared.services.minio_service import get_minio_service

logger = get_logger("kyc.admin")


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

    Args:
        kyc_id: KYC 记录 ID
        action: 操作类型 (submit/review/approve/reject/resubmit/sync/reset)
        actor_address: 操作者钱包地址
        actor_role: 操作者角色 (user/admin/system)
        details: 操作详情 (可选，JSON 格式)

    Returns:
        KycAuditLog: 创建的审核日志记录

    Raises:
        ValueError: 当 kyc_id 对应的 KYC 记录不存在时

    Example:
        >>> await create_kyc_audit_log(
        ...     kyc_id=1,
        ...     action=KycAuditAction.APPROVE,
        ...     actor_address="0x1234567890abcdef1234567890abcdef12345678",
        ...     actor_role="admin",
        ...     details={"reason": "Documents verified successfully"},
        ... )

    Requirements Reference: 2.5
    """
    # 验证 KYC 记录存在
    kyc = await AccountKyc.filter(id=kyc_id).first()
    if not kyc:
        raise ValueError(f"KYC record with id {kyc_id} not found")

    # 创建审核日志记录
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


class AdminKycService:
    """Admin KYC 服务"""

    def __init__(self):
        self.minio_service = get_minio_service()

    @property
    def environment(self) -> str:
        """获取当前网络环境 (用于过滤 KYC 记录)"""
        return SETTINGS.network

    async def list_pending(
        self, page: int = 1, page_size: int = 10
    ) -> Tuple[List[AccountKyc], int, int]:
        """
        获取待审核列表

        Args:
            page: 页码
            page_size: 每页数量

        Returns:
            Tuple[List[AccountKyc], int, int]: (列表, 总数, 总页数)
        """
        query = AccountKyc.filter(
            status=KycStatus.PENDING, network=self.environment
        ).order_by("-created_at")

        total = await query.count()
        total_pages = (total + page_size - 1) // page_size
        items = await query.offset((page - 1) * page_size).limit(page_size)

        return items, total, total_pages

    async def list_by_status(
        self, status: Optional[KycStatus] = None, page: int = 1, page_size: int = 10
    ) -> Tuple[List[AccountKyc], int, int]:
        """
        按状态获取 KYC 列表

        Args:
            status: KYC 状态 (None 表示全部)
            page: 页码
            page_size: 每页数量

        Returns:
            Tuple[List[AccountKyc], int, int]: (列表, 总数, 总页数)
        """
        query = AccountKyc.filter(network=self.environment)

        if status:
            query = query.filter(status=status)

        query = query.order_by("-created_at")

        total = await query.count()
        total_pages = (total + page_size - 1) // page_size
        items = await query.offset((page - 1) * page_size).limit(page_size)

        return items, total, total_pages

    def _calculate_processing_time(
        self, submitted_at: Optional[dt.datetime], reviewed_at: Optional[dt.datetime]
    ) -> Optional[float]:
        """
        计算处理时间 (分钟)

        处理时间 = (reviewed_at - submitted_at) 转换为分钟

        Args:
            submitted_at: 提交时间
            reviewed_at: 审核时间

        Returns:
            处理时间 (分钟)，如果任一时间为空则返回 None

        Requirements Reference: 3.7
        """
        if submitted_at is None or reviewed_at is None:
            return None

        # 计算时间差并转换为分钟
        time_diff = reviewed_at - submitted_at
        processing_minutes = time_diff.total_seconds() / 60

        # 返回保留两位小数的结果
        return round(processing_minutes, 2)

    def _kyc_to_list_item(self, kyc: AccountKyc) -> KycListItem:
        """
        将 AccountKyc 模型转换为 KycListItem Schema

        Args:
            kyc: AccountKyc 模型实例

        Returns:
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
            processing_time_minutes=self._calculate_processing_time(
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

        支持以下排序:
        - sort_by: submitted_at, risk_score, priority
        - sort_order: asc, desc

        Args:
            query_params: KycListQuery 查询参数

        Returns:
            Tuple[List[KycListItem], int, int]: (列表项, 总数, 总页数)

        Requirements Reference: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
        """
        # 基础查询 - 按当前环境筛选
        query = AccountKyc.filter(network=self.environment)

        # ========== 筛选条件 ==========

        # 状态筛选 (Requirement 3.2)
        if query_params.status is not None:
            query = query.filter(status=query_params.status)

        # 风险等级筛选 (Requirement 3.2)
        if query_params.risk_level is not None:
            query = query.filter(risk_level=query_params.risk_level)

        # 优先级筛选 (Requirement 3.2)
        if query_params.priority is not None:
            query = query.filter(priority=query_params.priority)

        # 国家代码筛选 (Requirement 3.2)
        if query_params.country_code is not None:
            query = query.filter(country_code=query_params.country_code)

        # 日期范围筛选 (Requirement 3.2)
        if query_params.date_from is not None:
            query = query.filter(submitted_at__gte=query_params.date_from)

        if query_params.date_to is not None:
            query = query.filter(submitted_at__lte=query_params.date_to)

        # 搜索查询 - 钱包地址或姓名 (Requirement 3.3)
        if query_params.search_query:
            search_term = query_params.search_query.strip()
            if search_term:
                # 使用 Q 对象进行 OR 查询
                query = query.filter(
                    Q(address__icontains=search_term)
                    | Q(full_name__icontains=search_term)
                )

        # ========== 排序 ==========

        # 确定排序字段 (Requirement 3.4)
        sort_field = query_params.sort_by or "submitted_at"

        # 确定排序方向 (Requirement 3.5)
        sort_order = query_params.sort_order or "desc"

        # 构建排序表达式
        if sort_order == "desc":
            order_expr = f"-{sort_field}"
        else:
            order_expr = sort_field

        query = query.order_by(order_expr)

        # ========== 分页 ==========

        page = query_params.page
        page_size = query_params.page_size

        # 计算总数和总页数
        total = await query.count()
        total_pages = (total + page_size - 1) // page_size if total > 0 else 0

        # 获取分页数据
        offset = (page - 1) * page_size
        kyc_records = await query.offset(offset).limit(page_size)

        # ========== 转换为响应格式 ==========

        # 转换为 KycListItem 列表 (Requirement 3.6, 3.7)
        items = [self._kyc_to_list_item(kyc) for kyc in kyc_records]

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
        - 文档预签名 URL (id_front, id_back, selfie)
        - 审核日志列表
        - 预留字段 (ocr_data, facial_comparison)

        Args:
            kyc_id: KYC ID

        Returns:
            KycDetail 响应对象，如果 KYC 不存在则返回 None

        Requirements Reference: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
        """
        # 获取 KYC 记录
        kyc = await AccountKyc.filter(id=kyc_id, network=self.environment).first()
        if not kyc:
            return None

        # 转换为 KycListItem (Requirement 4.2)
        kyc_item = self._kyc_to_list_item(kyc)

        # 获取文档预签名 URL (Requirement 4.3)
        documents = await self._get_document_presigned_urls(kyc)

        # 获取审核日志 (Requirement 4.4)
        audit_logs = await self._get_audit_logs_for_kyc(kyc_id)

        # 构建 KycDetail 响应 (Requirement 4.1, 4.5, 4.6)
        detail = KycDetail(
            kyc=kyc_item,
            documents=documents,
            audit_logs=audit_logs,
            ocr_data=None,  # 预留字段 (Requirement 4.5)
            facial_comparison=None,  # 预留字段 (Requirement 4.6)
            review_progress=kyc.review_progress,  # Stepper Modal 审核步骤进度 (Requirement 8.3)
        )

        logger.debug(
            f"get_detail: kyc_id={kyc_id}, status={kyc.status}, "
            f"documents_count={len([v for v in documents.values() if v])}, "
            f"audit_logs_count={len(audit_logs)}"
        )

        return detail

    async def _get_document_presigned_urls(
        self, kyc: AccountKyc
    ) -> Dict[str, Optional[str]]:
        """
        获取 KYC 文档的预签名 URL

        从 AccountKycDocument 关联表获取证件照片，
        并从 AccountKyc 获取自拍照片、人脸图片和活体检测视频。

        Args:
            kyc: AccountKyc 模型实例

        Returns:
            包含 id_front, id_back, selfie, face_image, liveness_video 预签名 URL 的字典

        Requirements Reference: 4.3, 1.1, 1.2, 1.3, 1.4
        """
        documents: Dict[str, Optional[str]] = {
            "id_front": None,
            "id_back": None,
            "selfie": None,
            "face_image": None,
            "liveness_video": None,
        }

        try:
            # 获取关联的证件文档
            kyc_documents = await kyc.documents.all()

            for doc in kyc_documents:
                # 获取证件正面 URL
                if doc.id_front_url:
                    documents["id_front"] = await self.minio_service.get_presigned_url(
                        doc.id_front_url
                    )
                # 获取证件背面 URL
                if doc.id_back_url:
                    documents["id_back"] = await self.minio_service.get_presigned_url(
                        doc.id_back_url
                    )

            # 获取自拍照片 URL (存储在 AccountKyc 表中)
            if kyc.selfie_url:
                documents["selfie"] = await self.minio_service.get_presigned_url(
                    kyc.selfie_url
                )

        except Exception as e:
            logger.warning(
                f"Failed to generate presigned URLs for kyc_id={kyc.id}: {e}"
            )

        # 获取人脸图片 URL (存储在 AccountKyc 表中)
        try:
            if kyc.face_image_url:
                documents["face_image"] = await self.minio_service.get_presigned_url(
                    kyc.face_image_url
                )
        except Exception as e:
            logger.warning(
                f"Failed to generate face_image presigned URL for kyc_id={kyc.id}: {e}"
            )

        # 获取活体检测视频 URL (存储在 AccountKyc 表中)
        try:
            if kyc.liveness_video_url:
                documents[
                    "liveness_video"
                ] = await self.minio_service.get_presigned_url(kyc.liveness_video_url)
        except Exception as e:
            logger.warning(
                f"Failed to generate liveness_video presigned URL for kyc_id={kyc.id}: {e}"
            )

        return documents

    async def _get_audit_logs_for_kyc(self, kyc_id: int) -> List[KycAuditLogEntry]:
        """
        获取指定 KYC 的所有审核日志

        按 created_at 降序排序 (最新的在前)。

        Args:
            kyc_id: KYC ID

        Returns:
            KycAuditLogEntry 列表

        Requirements Reference: 4.4
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

        查询指定 KYC 的所有审核日志记录，按 created_at 降序排序 (最新的在前)。
        返回的每条日志包含 action, actor_address, actor_role, details, created_at 字段。

        Args:
            kyc_id: KYC ID

        Returns:
            KycAuditLogEntry 列表，按 created_at 降序排序

        Raises:
            ValueError: 当 kyc_id 对应的 KYC 记录不存在时

        Example:
            >>> service = get_admin_kyc_service()
            >>> logs = await service.get_audit_logs(kyc_id=1)
            >>> for log in logs:
            ...     print(f"{log.action}: {log.actor_address} at {log.created_at}")

        Requirements Reference: 7.1, 7.2, 7.3
        """
        # 验证 KYC 记录存在
        kyc = await AccountKyc.filter(id=kyc_id, network=self.environment).first()
        if not kyc:
            raise ValueError(f"KYC record with id {kyc_id} not found")

        # 获取审核日志 (复用内部方法)
        audit_logs = await self._get_audit_logs_for_kyc(kyc_id)

        logger.debug(f"get_audit_logs: kyc_id={kyc_id}, count={len(audit_logs)}")

        return audit_logs

    async def get_detail_with_documents(self, kyc_id: int) -> Optional[Dict[str, Any]]:
        """
        获取 KYC 详情，包含文件预签名 URL (向后兼容方法)

        注意: 此方法保留用于向后兼容，推荐使用 get_detail() 方法。

        Args:
            kyc_id: KYC ID

        Returns:
            包含 kyc 和 documents 的字典，或 None
        """
        kyc = await AccountKyc.filter(id=kyc_id, network=self.environment).first()
        if not kyc:
            return None

        # 获取文档预签名 URL
        documents = await self._get_document_presigned_urls(kyc)

        return {"kyc": kyc, "documents": documents}

    async def get_contract_comparison(self, kyc_id: int) -> Optional[Dict[str, Any]]:
        """
        比较数据库和合约状态

        Args:
            kyc_id: KYC ID

        Returns:
            包含 database 和 on_chain 状态的字典
        """
        # 直接查询 AccountKyc 模型，而不是使用 get_detail()
        kyc = await AccountKyc.filter(id=kyc_id, network=self.environment).first()
        if not kyc:
            return None

        from src.services.kyc.contract_service import KycContractService

        contract_service = KycContractService()

        on_chain_verified = None
        on_chain_info = None
        on_chain_error = None

        try:
            on_chain_verified = await contract_service.is_verified(kyc.address)
            if on_chain_verified:
                on_chain_info = await contract_service.get_investor_info(kyc.address)
        except Exception as e:
            on_chain_error = str(e)
            logger.warning(f"Failed to get contract status: {e}")

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
                "verified": on_chain_verified,
                "info": on_chain_info,
                "error": on_chain_error,
            },
        }

    async def list_failed_sync(self) -> List[AccountKyc]:
        """
        获取同步失败的 KYC 列表

        Returns:
            同步失败的 KYC 列表
        """
        return await AccountKyc.filter(
            on_chain_sync_status=OnChainSyncStatus.FAILED,
            network=self.environment,
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

        Returns:
            KycStats 响应对象

        Requirements Reference: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
        """

        # ========== 基础计数统计 (Requirement 6.2) ==========
        basic_counts = await self._get_basic_counts()

        # ========== 处理时间统计 (Requirement 6.3) ==========
        time_stats = await self._get_processing_time_stats()

        # ========== 转化率计算 (Requirement 6.4) ==========
        conversion_rates = await self._get_conversion_rates(basic_counts)

        # ========== 风险分布统计 (Requirement 6.5) ==========
        risk_distribution = await self._get_risk_distribution()

        # ========== 每日统计 (Requirement 6.6) ==========
        daily_stats = await self._get_daily_stats()

        # ========== 审核者统计 (Requirement 6.7) ==========
        reviewer_stats = await self._get_reviewer_stats()

        # 构建 KycStats 响应
        stats = KycStats(
            # 基础计数
            pending=basic_counts["pending"],
            approved=basic_counts["approved"],
            rejected=basic_counts["rejected"],
            failed_sync=basic_counts["failed_sync"],
            revoked=basic_counts["revoked"],
            total=basic_counts["total"],
            # 时间统计
            avg_processing_time_minutes=time_stats["avg"],
            median_processing_time_minutes=time_stats["median"],
            # 转化率
            approval_rate=conversion_rates["approval_rate"],
            resubmit_rate=conversion_rates["resubmit_rate"],
            # 风险分布
            risk_distribution=risk_distribution,
            # 详细统计
            daily_stats=daily_stats,
            reviewer_stats=reviewer_stats,
        )

        logger.debug(
            f"get_stats: total={stats.total}, pending={stats.pending}, "
            f"approved={stats.approved}, rejected={stats.rejected}, "
            f"approval_rate={stats.approval_rate:.2f}%"
        )

        return stats

    async def _get_basic_counts(self) -> Dict[str, int]:
        """
        获取基础计数统计

        分别查询各状态的数量。

        Returns:
            包含 pending, approved, rejected, failed_sync, total 的字典

        Requirements Reference: 6.2
        """
        # 分别查询各状态数量 (Tortoise ORM 聚合查询兼容性更好)
        base_query = AccountKyc.filter(network=self.environment)

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

    async def _get_processing_time_stats(self) -> Dict[str, float]:
        """
        获取处理时间统计

        计算已审核记录的平均处理时间和中位数处理时间。
        处理时间 = reviewed_at - submitted_at (分钟)

        Returns:
            包含 avg 和 median 的字典

        Requirements Reference: 6.3
        """
        # 获取所有已审核的记录 (有 submitted_at 和 reviewed_at)
        reviewed_records = await AccountKyc.filter(
            network=self.environment,
            submitted_at__isnull=False,
            reviewed_at__isnull=False,
        ).values("submitted_at", "reviewed_at")

        if not reviewed_records:
            return {"avg": 0.0, "median": 0.0}

        # 计算每条记录的处理时间 (分钟)
        processing_times = []
        for record in reviewed_records:
            submitted_at = record["submitted_at"]
            reviewed_at = record["reviewed_at"]
            if submitted_at and reviewed_at:
                time_diff = (reviewed_at - submitted_at).total_seconds() / 60
                # 只计算正数时间 (reviewed_at > submitted_at)
                if time_diff >= 0:
                    processing_times.append(time_diff)

        if not processing_times:
            return {"avg": 0.0, "median": 0.0}

        # 计算平均值
        avg_time = sum(processing_times) / len(processing_times)

        # 计算中位数
        from statistics import median as calc_median

        median_time = calc_median(processing_times)

        return {
            "avg": round(avg_time, 2),
            "median": round(median_time, 2),
        }

    async def _get_conversion_rates(
        self, basic_counts: Dict[str, int]
    ) -> Dict[str, float]:
        """
        获取转化率统计

        - approval_rate = approved / (approved + rejected) * 100
        - resubmit_rate = 重新提交次数 / 总提交次数 * 100

        Args:
            basic_counts: 基础计数统计

        Returns:
            包含 approval_rate 和 resubmit_rate 的字典

        Requirements Reference: 6.4
        """
        approved = basic_counts["approved"]
        rejected = basic_counts["rejected"]

        # 计算通过率
        total_reviewed = approved + rejected
        if total_reviewed > 0:
            approval_rate = (approved / total_reviewed) * 100
        else:
            approval_rate = 0.0

        # 计算重新提交率
        # 通过审核日志中的 RESUBMIT 操作来统计
        resubmit_count = await KycAuditLog.filter(
            kyc__network=self.environment,
            action=KycAuditAction.RESUBMIT,
        ).count()

        # 总提交次数 = SUBMIT 操作次数
        submit_count = await KycAuditLog.filter(
            kyc__network=self.environment,
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

    async def _get_risk_distribution(self) -> Dict[str, int]:
        """
        获取风险分布统计

        统计各风险等级的 KYC 记录数量。

        Returns:
            风险等级到数量的映射 (如 {"low": 10, "medium": 5, "high": 2, "critical": 0})

        Requirements Reference: 6.5
        """
        from src.shared.schemas.enums import RiskLevel

        # 初始化所有风险等级为 0
        distribution = {level.value: 0 for level in RiskLevel}

        # 按风险等级分组统计
        records = await AccountKyc.filter(network=self.environment).values("risk_level")

        for record in records:
            risk_level = record["risk_level"]
            # 处理枚举值
            if hasattr(risk_level, "value"):
                level_value = risk_level.value
            else:
                level_value = str(risk_level)

            if level_value in distribution:
                distribution[level_value] += 1

        return distribution

    async def _get_daily_stats(self) -> List[DailyStats]:
        """
        获取每日统计 (最近7天)

        统计每天的提交、通过、拒绝数量。

        Returns:
            DailyStats 列表 (按日期升序)

        Requirements Reference: 6.6
        """
        import datetime as datetime_module

        # 计算最近7天的日期范围
        today = datetime_module.date.today()
        seven_days_ago = today - datetime_module.timedelta(days=6)

        # 初始化每日统计
        daily_data: Dict[datetime_module.date, Dict[str, int]] = {}
        for i in range(7):
            date = seven_days_ago + datetime_module.timedelta(days=i)
            daily_data[date] = {"submitted": 0, "approved": 0, "rejected": 0}

        # 统计提交数量 (按 submitted_at)
        submitted_records = await AccountKyc.filter(
            network=self.environment,
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

        # 统计审核数量 (按 reviewed_at)
        reviewed_records = await AccountKyc.filter(
            network=self.environment,
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
                    # 处理枚举值
                    if hasattr(status, "value"):
                        status_value = status.value
                    else:
                        status_value = str(status)

                    if status_value == KycStatus.APPROVED.value:
                        daily_data[date]["approved"] += 1
                    elif status_value == KycStatus.REJECTED.value:
                        daily_data[date]["rejected"] += 1

        # 转换为 DailyStats 列表 (按日期升序)
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

    async def _get_reviewer_stats(self) -> List[ReviewerStats]:
        """
        获取审核者统计

        统计每个审核者的审核数量和通过率。

        Returns:
            ReviewerStats 列表 (按审核数量降序)

        Requirements Reference: 6.7
        """
        # 获取所有有审核者的记录
        reviewed_records = await AccountKyc.filter(
            network=self.environment,
            reviewer_address__isnull=False,
        ).values("reviewer_address", "status")

        if not reviewed_records:
            return []

        # 按审核者分组统计
        reviewer_data: Dict[str, Dict[str, int]] = {}
        for record in reviewed_records:
            reviewer = record["reviewer_address"]
            status = record["status"]

            if reviewer not in reviewer_data:
                reviewer_data[reviewer] = {"total": 0, "approved": 0}

            reviewer_data[reviewer]["total"] += 1

            # 处理枚举值
            if hasattr(status, "value"):
                status_value = status.value
            else:
                status_value = str(status)

            if status_value == KycStatus.APPROVED.value:
                reviewer_data[reviewer]["approved"] += 1

        # 转换为 ReviewerStats 列表
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

        # 按审核数量降序排序
        result.sort(key=lambda x: x.reviewed_count, reverse=True)

        return result

    async def batch_review(
        self, request: BatchReviewRequest, reviewer_address: str
    ) -> BatchReviewResponse:
        """
        批量审核 KYC 申请

        处理多个 KYC 记录的审核操作，支持批量通过或拒绝。
        采用"尽力而为"策略：遇到单条记录错误时继续处理其他记录。

        Args:
            request: 批量审核请求，包含:
                - kyc_ids: KYC ID 列表
                - action: 审核操作 (approve/reject)
                - reject_reason_code: 拒绝原因代码 (仅 reject 时需要)
                - reject_reason: 拒绝原因详情 (可选)
                - is_accredited: 是否为合格投资者 (仅 approve 时有效)
            reviewer_address: 审核者钱包地址

        Returns:
            BatchReviewResponse: 包含处理结果统计和各条记录的处理状态

        Requirements Reference: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
        """
        from datetime import datetime, timezone

        results: List[BatchReviewResult] = []
        success_count = 0
        failed_count = 0

        # 验证拒绝操作必须提供原因代码 (Requirement 5.3)
        if request.action == "reject" and not request.reject_reason_code:
            # 返回所有记录都失败的响应
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

        # 遍历处理每条记录 (Requirement 5.1, 5.6)
        for kyc_id in request.kyc_ids:
            try:
                # 获取 KYC 记录
                kyc = await AccountKyc.filter(
                    id=kyc_id, network=self.environment
                ).first()

                if not kyc:
                    # KYC 记录不存在
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
                    # 状态不是 pending
                    results.append(
                        BatchReviewResult(
                            kyc_id=kyc_id,
                            success=False,
                            error=f"KYC record {kyc_id} is not in pending status (current: {kyc.status.value})",
                        )
                    )
                    failed_count += 1
                    continue

                # 执行审核操作
                kyc.reviewed_at = datetime.now(timezone.utc)
                kyc.reviewer_address = reviewer_address.lower()

                if request.action == "approve":
                    # 通过审核 (Requirement 5.2, 5.4)
                    kyc.status = KycStatus.APPROVED
                    kyc.is_accredited = request.is_accredited

                    # 链上准入由前端 MetaMask 发起 (与单条审核一致)
                    # 此处仅标记为 PENDING，等待前端调用 record_admission
                    kyc.on_chain_sync_status = OnChainSyncStatus.PENDING
                    kyc.on_chain_error = None

                    # 创建审核日志 (Requirement 5.7)
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
                    # 拒绝审核 (Requirement 5.2, 5.3)
                    kyc.status = KycStatus.REJECTED
                    # 组合拒绝原因
                    reject_reason_parts: List[str] = []
                    if request.reject_reason_code:
                        reject_reason_parts.append(request.reject_reason_code)
                    if request.reject_reason:
                        reject_reason_parts.append(request.reject_reason)
                    kyc.reject_reason = (
                        ": ".join(reject_reason_parts) if reject_reason_parts else None
                    )
                    kyc.is_accredited = False
                    kyc.on_chain_sync_status = OnChainSyncStatus.NOT_REQUIRED

                    # 创建审核日志 (Requirement 5.7)
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

                # 保存 KYC 记录
                await kyc.save()

                # 记录成功
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
                # 处理异常，继续处理其他记录 (Requirement 5.6)
                logger.error(f"Batch review: failed to process kyc_id={kyc_id}: {e}")
                results.append(
                    BatchReviewResult(
                        kyc_id=kyc_id,
                        success=False,
                        error=str(e),
                    )
                )
                failed_count += 1

        # 返回批量审核响应 (Requirement 5.5)
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


# 单例实例
_admin_kyc_service: Optional[AdminKycService] = None


def get_admin_kyc_service() -> AdminKycService:
    """获取 Admin KYC 服务单例"""
    global _admin_kyc_service
    if _admin_kyc_service is None:
        _admin_kyc_service = AdminKycService()
    return _admin_kyc_service
