"""
KYC Domain - API 路由

路由结构：
- public_router: 公开接口（状态查询）
- user_router: 用户接口（上传文件、提交申请）
- admin_router: 管理员接口（审核、列表、同步）
- dev_router: 开发工具（仅开发环境）
"""

import uuid
from typing import Optional

from falib.utils.config import SETTINGS
from falib.utils.log import get_logger
from fastapi import APIRouter, Depends, File, Form, Header, Query, UploadFile, status

from src.domains.kyc.schemas import (
    ALLOWED_DOCUMENT_TYPES,
    ContractKycStatus,
    KycApplyRequest,
    KycContractComparisonResponse,
    KycFullResponse,
    KycReviewRequest,
    KycStatusResponse,
    KycUploadResponse,
)
from src.domains.kyc.service import KycService
from src.models.kyc import KycStatus
from src.shared.exceptions import ForbiddenException
from src.shared.schemas.base import ApiResponse, PaginatedResponse
from src.shared.security import require_admin, require_user
from src.shared.services.minio_service import get_minio_service

logger = get_logger(__name__)

# 公开路由（无需认证）
public_router = APIRouter()

# 用户路由（需要认证，将在 router.py 中统一注入 require_user）
user_router = APIRouter()

# 管理员路由（需要管理员权限，将在 router.py 中统一注入 require_admin）
admin_router = APIRouter()

# 开发工具路由（仅开发环境）
dev_router = APIRouter(prefix="/dev", tags=["KYC Developer Tools"])

# Story 2.7: 文件上传配置
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "pdf"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


def get_kyc_service() -> KycService:
    """依赖注入：获取 KYC 服务"""
    return KycService()


# ============================================================================
# 公开接口
# ============================================================================


@public_router.get(
    "/status/{wallet_address}",
    response_model=ApiResponse[KycStatusResponse],
    summary="Get KYC Status",
    description="Get the KYC status for a wallet address",
)
async def get_kyc_status(
    wallet_address: str, service: KycService = Depends(get_kyc_service)
):
    """
    获取钱包的 KYC 状态（公开接口）

    - **wallet_address**: 钱包地址

    Returns the KYC status for the given wallet address in the current environment.
    If no KYC record exists, returns status 'not_started'.
    """
    result = await service.get_status(wallet_address)
    return ApiResponse(data=result)


# ============================================================================
# 用户接口（需要 JWT 认证）
# ============================================================================


@user_router.post(
    "/upload-document",
    response_model=ApiResponse[KycUploadResponse],
    summary="Upload KYC Document",
    description="Upload a KYC document (ID front/back, selfie) to MinIO",
)
async def upload_kyc_document(
    document_type: str = Form(..., description="文档类型: id_front, id_back, selfie"),
    file: UploadFile = File(..., description="文件 (jpg/jpeg/png/pdf, max 10MB)"),
    wallet_address: str = Depends(require_user),
):
    """
    上传 KYC 证件照片 (Story 2.7)

    - 需要 JWT 认证
    - **document_type**: 文档类型 (id_front/id_back/selfie)
    - **file**: 文件 (jpg/jpeg/png/pdf, max 10MB)

    上传成功后返回文件路径，用于提交 KYC 申请时传入。
    """
    # 验证文档类型
    if document_type not in ALLOWED_DOCUMENT_TYPES:
        return ApiResponse(
            code=400,
            message=f"不支持的文档类型，允许: {', '.join(ALLOWED_DOCUMENT_TYPES)}",
            data=None,
        )

    # 验证文件类型
    if not file.filename:
        return ApiResponse(code=400, message="文件名不能为空", data=None)

    ext = file.filename.split(".")[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return ApiResponse(
            code=400,
            message=f"不支持的文件格式，允许: {', '.join(ALLOWED_EXTENSIONS)}",
            data=None,
        )

    # 读取文件内容
    content = await file.read()

    # 验证文件大小
    if len(content) > MAX_FILE_SIZE:
        return ApiResponse(
            code=400,
            message=f"文件大小超过 {MAX_FILE_SIZE // (1024 * 1024)}MB 限制",
            data=None,
        )

    # 生成文件路径: kyc/{wallet_address}/{document_type}_{uuid}.{ext}
    object_name = f"kyc/{wallet_address}/{document_type}_{uuid.uuid4()}.{ext}"

    # 上传到 MinIO
    try:
        minio_service = get_minio_service()
        await minio_service.upload_file(
            object_name=object_name,
            file_data=content,
            content_type=file.content_type or f"image/{ext}",
        )
        logger.info(f"KYC document uploaded: {object_name}")
    except Exception as e:
        logger.error(f"Failed to upload KYC document: {e}")
        return ApiResponse(code=500, message="文件上传失败，请重试", data=None)

    return ApiResponse(
        data=KycUploadResponse(file_path=object_name, document_type=document_type),
        message="文件上传成功",
    )


@user_router.post(
    "/apply",
    response_model=ApiResponse[KycFullResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Apply for KYC",
    description="Submit a KYC application with identity information",
)
async def apply_kyc(
    data: KycApplyRequest,
    wallet_address: str = Depends(require_user),
    service: KycService = Depends(get_kyc_service),
):
    """
    发起 KYC 申请 (Story 2.7 增强版)

    - 需要 JWT 认证
    - **country_code**: 国家代码 (可选, ISO 3166-1 alpha-2)
    - **id_type**: 证件类型 (id_card/passport/driver_license)
    - **id_number**: 证件号 (后端会哈希存储)
    - **full_name**: 证件姓名
    - **date_of_birth**: 出生日期
    - **id_front_url**: 证件正面照片路径 (可选)
    - **id_back_url**: 证件背面照片路径 (可选)
    - **selfie_url**: 手持证件自拍路径 (可选)

    Creates a new KYC record with status 'pending'.
    If a rejected KYC exists, it will be resubmitted.
    """
    # 确保使用 JWT 中的地址，防止伪造
    data.wallet_address = wallet_address
    result = await service.apply(data)
    return ApiResponse(data=result, message="KYC application submitted successfully")


# ============================================================================
# 管理员接口（需要管理员权限）
# ============================================================================


@admin_router.get(
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


@admin_router.get(
    "/",
    response_model=ApiResponse[PaginatedResponse[KycFullResponse]],
    summary="List KYC Records",
    description="List KYC records with pagination (admin only)",
)
async def list_kyc(
    kyc_status: Optional[KycStatus] = Query(
        None, alias="status", description="Filter by status"
    ),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Page size"),
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


@admin_router.post(
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


@admin_router.post(
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


@admin_router.get(
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
    from src.domains.kyc.contract_service import KycContractService
    from src.models.kyc import KycStatus, UserKyc

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


# ============================================================================
# 开发工具（仅开发环境）
# ============================================================================


async def require_dev_environment():
    """
    开发环境检查依赖

    仅允许在 local 或 test 环境下访问开发工具
    """
    environment = SETTINGS.environment or "local"
    if environment not in ("local", "test"):
        raise ForbiddenException(
            message="Developer tools only available in local/test environment"
        )


@dev_router.post(
    "/quick-approve/{wallet_address}",
    response_model=ApiResponse[KycFullResponse],
    summary="Quick KYC Approval (Dev Only)",
    description="Instantly approve KYC for development/testing (not available in production)",
    dependencies=[Depends(require_dev_environment)],
)
async def quick_approve_kyc(
    wallet_address: str, service: KycService = Depends(get_kyc_service)
):
    """
    快速通过 KYC (开发工具)

    - **wallet_address**: 钱包地址

    ⚠️ Only available in local/test environment.
    Will return 403 in production.
    """
    result = await service.quick_approve(wallet_address)
    return ApiResponse(data=result, message="KYC approved successfully (dev mode)")


@dev_router.delete(
    "/reset/{wallet_address}",
    response_model=ApiResponse[dict],
    summary="Reset KYC (Dev Only)",
    description="Reset KYC status for development/testing (not available in production)",
    dependencies=[Depends(require_dev_environment)],
)
async def reset_kyc(
    wallet_address: str, service: KycService = Depends(get_kyc_service)
):
    """
    重置 KYC 状态 (开发工具)

    - **wallet_address**: 钱包地址

    ⚠️ Only available in local/test environment.
    Will return 403 in production.
    """
    success = await service.reset_kyc(wallet_address)
    return ApiResponse(
        data={"wallet_address": wallet_address, "reset": success},
        message="KYC reset successfully" if success else "No KYC record found",
    )


# ============================================================================
# 保留旧的 router 导出（兼容期，后续移除）
# ============================================================================

# 临时兼容：创建一个包含所有路由的 router
router = APIRouter()
router.include_router(public_router)
router.include_router(user_router)
router.include_router(admin_router)
