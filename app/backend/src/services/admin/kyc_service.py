"""
Admin KYC 服务 (Story 2.9)

提供管理员 KYC 审核相关功能：
- 待审核列表
- 详情 + 文件预签名 URL
- 数据库与合约状态对比
- 同步失败列表
"""

from typing import Any, Dict, List, Optional, Tuple

from falib.utils.config import SETTINGS
from falib.utils.log import get_logger

from src.models.kyc import UserKyc
from src.shared.schemas.enums import KycStatus, OnChainSyncStatus
from src.shared.services.minio_service import get_minio_service

logger = get_logger("kyc.admin")


class AdminKycService:
    """Admin KYC 服务"""

    def __init__(self):
        self.minio_service = get_minio_service()

    @property
    def environment(self) -> str:
        """获取当前环境"""
        return SETTINGS.environment

    async def list_pending(
        self, page: int = 1, page_size: int = 10
    ) -> Tuple[List[UserKyc], int, int]:
        """
        获取待审核列表

        Args:
            page: 页码
            page_size: 每页数量

        Returns:
            Tuple[List[UserKyc], int, int]: (列表, 总数, 总页数)
        """
        query = UserKyc.filter(
            status=KycStatus.PENDING, environment=self.environment
        ).order_by("-created_at")

        total = await query.count()
        total_pages = (total + page_size - 1) // page_size
        items = await query.offset((page - 1) * page_size).limit(page_size)

        return items, total, total_pages

    async def list_by_status(
        self, status: Optional[KycStatus] = None, page: int = 1, page_size: int = 10
    ) -> Tuple[List[UserKyc], int, int]:
        """
        按状态获取 KYC 列表

        Args:
            status: KYC 状态 (None 表示全部)
            page: 页码
            page_size: 每页数量

        Returns:
            Tuple[List[UserKyc], int, int]: (列表, 总数, 总页数)
        """
        query = UserKyc.filter(environment=self.environment)

        if status:
            query = query.filter(status=status)

        query = query.order_by("-created_at")

        total = await query.count()
        total_pages = (total + page_size - 1) // page_size
        items = await query.offset((page - 1) * page_size).limit(page_size)

        return items, total, total_pages

    async def get_detail(self, kyc_id: int) -> Optional[UserKyc]:
        """
        获取 KYC 详情

        Args:
            kyc_id: KYC ID

        Returns:
            UserKyc 或 None
        """
        return await UserKyc.filter(id=kyc_id, environment=self.environment).first()

    async def get_detail_with_documents(self, kyc_id: int) -> Optional[Dict[str, Any]]:
        """
        获取 KYC 详情，包含文件预签名 URL

        Args:
            kyc_id: KYC ID

        Returns:
            包含 kyc 和 documents 的字典，或 None
        """
        kyc = await self.get_detail(kyc_id)
        if not kyc:
            return None

        # 生成预签名 URL
        documents = {}
        try:
            if kyc.id_front_url:
                documents["id_front"] = await self.minio_service.get_presigned_url(
                    kyc.id_front_url
                )
            if kyc.id_back_url:
                documents["id_back"] = await self.minio_service.get_presigned_url(
                    kyc.id_back_url
                )
            if kyc.selfie_url:
                documents["selfie"] = await self.minio_service.get_presigned_url(
                    kyc.selfie_url
                )
        except Exception as e:
            logger.warning(f"Failed to generate presigned URLs: {e}")

        return {"kyc": kyc, "documents": documents}

    async def get_contract_comparison(self, kyc_id: int) -> Optional[Dict[str, Any]]:
        """
        比较数据库和合约状态

        Args:
            kyc_id: KYC ID

        Returns:
            包含 database 和 on_chain 状态的字典
        """
        kyc = await self.get_detail(kyc_id)
        if not kyc:
            return None

        from src.services.kyc.contract_service import KycContractService

        contract_service = KycContractService()

        on_chain_verified = None
        on_chain_info = None
        on_chain_error = None

        try:
            on_chain_verified = await contract_service.is_verified(kyc.wallet_address)
            if on_chain_verified:
                on_chain_info = await contract_service.get_investor_info(
                    kyc.wallet_address
                )
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

    async def list_failed_sync(self) -> List[UserKyc]:
        """
        获取同步失败的 KYC 列表

        Returns:
            同步失败的 KYC 列表
        """
        return await UserKyc.filter(
            on_chain_sync_status=OnChainSyncStatus.FAILED,
            environment=self.environment,
        ).order_by("-updated_at")

    async def get_stats(self) -> Dict[str, int]:
        """
        获取 KYC 统计 (Code Review M1: 优化为单次聚合查询)

        Returns:
            各状态的数量统计
        """
        from tortoise.expressions import Q
        from tortoise.functions import Count

        # 使用单次聚合查询代替 N+4 查询
        result = (
            await UserKyc.filter(environment=self.environment)
            .annotate(
                pending_count=Count("id", _filter=Q(status=KycStatus.PENDING)),
                approved_count=Count("id", _filter=Q(status=KycStatus.APPROVED)),
                rejected_count=Count("id", _filter=Q(status=KycStatus.REJECTED)),
                failed_sync_count=Count(
                    "id", _filter=Q(on_chain_sync_status=OnChainSyncStatus.FAILED)
                ),
            )
            .first()
        )

        if result:
            pending = result.pending_count or 0
            approved = result.approved_count or 0
            rejected = result.rejected_count or 0
            failed_sync = result.failed_sync_count or 0
        else:
            pending = approved = rejected = failed_sync = 0

        return {
            "pending": pending,
            "approved": approved,
            "rejected": rejected,
            "failed_sync": failed_sync,
            "total": pending + approved + rejected,
        }


# 单例实例
_admin_kyc_service: Optional[AdminKycService] = None


def get_admin_kyc_service() -> AdminKycService:
    """获取 Admin KYC 服务单例"""
    global _admin_kyc_service
    if _admin_kyc_service is None:
        _admin_kyc_service = AdminKycService()
    return _admin_kyc_service
