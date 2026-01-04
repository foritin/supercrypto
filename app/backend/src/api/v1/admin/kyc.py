"""
管理员 KYC 路由 - KYC 审核、列表、同步

路由前缀: /api/v1/admin/kyc
"""

from typing import Optional

from falib.utils.log import get_logger
from fastapi import APIRouter, Depends

from src.services.kyc.schemas import (
    ContractKycStatus,
    KycContractComparisonResponse,
    KycFullResponse,
    KycReviewRequest,
)
from src.services.kyc.service import KycService
from src.shared.schemas.base import ApiResponse, PaginatedResponse
from src.shared.schemas.enums import KycStatus
from src.shared.security import require_admin

logger = get_logger(__name__)

router = APIRouter()


def get_kyc_service() -> KycService:
    """依赖注入：获取 KYC 服务"""
    return KycService()


@router.get(
    "/{kyc_id}",
    response_model=ApiResponse[KycFullResponse],
    summary="Get KYC by ID",
    description="Get KYC record by ID (admin only)",
)
async def get_kyc_by_id(kyc_id: int, service: KycService = Depends(get_kyc_service)):
    """
    根据 ID 获取 KYC 记录 (管理员用)

    - 需要管理员权限
    - **kyc_id**: KYC ID
    """
    result = await service.get_by_id(kyc_id)
    if not result:
        return ApiResponse(code=404, message="KYC record not found", data=None)
    return ApiResponse(data=result)


@router.get(
    "/",
    response_model=ApiResponse[PaginatedResponse[KycFullResponse]],
    summary="List KYC Records",
    description="List KYC records with pagination (admin only)",
)
async def list_kyc(
    kyc_status: Optional[KycStatus] = None,
    page: int = 1,
    page_size: int = 10,
    service: KycService = Depends(get_kyc_service),
):
    """
    获取 KYC 列表 (管理员用)

    - 需要管理员权限
    - **status**: 按状态筛选 (not_started/pending/approved/rejected)
    - **page**: 页码
    - **page_size**: 每页数量
    """
    items, total, total_pages = await service.list_kyc(
        status=kyc_status, page=page, page_size=page_size
    )

    paginated = PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )

    return ApiResponse(data=paginated)


@router.post(
    "/{kyc_id}/review",
    response_model=ApiResponse[KycFullResponse],
    summary="Review KYC",
    description="Approve or reject a KYC application (admin only)",
)
async def review_kyc(
    kyc_id: int,
    data: KycReviewRequest,
    admin_address: str = Depends(require_admin),
    service: KycService = Depends(get_kyc_service),
):
    """
    审核 KYC 申请 (管理员用)

    - 需要管理员权限
    - **kyc_id**: KYC ID
    - **approved**: 是否通过
    - **reject_reason**: 拒绝原因 (拒绝时必填)
    - **is_accredited**: 是否为合格投资者

    Updates the KYC status and optionally updates on-chain KYC status.
    """
    # 使用管理员地址作为 reviewer 标识
    result = await service.review(kyc_id, data, reviewer_address=admin_address)

    action = "approved" if data.approved else "rejected"
    return ApiResponse(data=result, message=f"KYC application {action} successfully")


@router.post(
    "/{kyc_id}/retry-sync",
    response_model=ApiResponse[KycFullResponse],
    summary="Retry On-chain Sync",
    description="Retry syncing KYC to blockchain (admin only)",
)
async def retry_kyc_sync(
    kyc_id: int,
    service: KycService = Depends(get_kyc_service),
):
    """
    重试链上同步 (Story 2.8)

    - 需要管理员权限
    - **kyc_id**: KYC ID

    当 on_chain_sync_status = FAILED 时，管理员可以手动重试同步。
    """
    result = await service.retry_sync(kyc_id)
    return ApiResponse(data=result, message="Retry sync completed")


@router.get(
    "/contract-status/{wallet_address}",
    response_model=ApiResponse[KycContractComparisonResponse],
    summary="Get Contract KYC Status",
    description="Compare database and on-chain KYC status (admin only)",
)
async def get_contract_kyc_status(
    wallet_address: str,
    service: KycService = Depends(get_kyc_service),
):
    """
    获取合约 KYC 状态对比 (Story 2.8)

    - 需要管理员权限
    - **wallet_address**: 钱包地址

    返回数据库状态和合约状态的对比，帮助管理员排查同步问题。
    """
    from src.services.kyc.contract_service import KycContractService
    from src.models.kyc import UserKyc

    address = wallet_address.lower()

    # 获取数据库状态
    kyc = await UserKyc.filter(
        wallet_address=address, environment=service.environment
    ).first()

    if not kyc:
        return ApiResponse(
            code=404,
            message="KYC record not found in database",
            data=None,
        )

    # 获取合约状态
    contract_service = KycContractService()
    contract_verified = None
    contract_info = None
    contract_error = None

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

    return ApiResponse(
        data=KycContractComparisonResponse(
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
    )

