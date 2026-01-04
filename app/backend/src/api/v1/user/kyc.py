"""
用户 KYC 路由 - KYC 申请、文件上传

路由前缀: /api/v1/user/kyc
"""

import uuid

from falib.utils.log import get_logger
from fastapi import APIRouter, Depends, File, Form, UploadFile, status

from src.services.kyc.schemas import (
    ALLOWED_DOCUMENT_TYPES,
    KycApplyRequest,
    KycFullResponse,
    KycUploadResponse,
)
from src.services.kyc.service import KycService
from src.shared.schemas.base import ApiResponse
from src.shared.security import require_user
from src.shared.services.minio_service import get_minio_service

logger = get_logger(__name__)

router = APIRouter()

# 文件上传配置
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "pdf"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


def get_kyc_service() -> KycService:
    """依赖注入：获取 KYC 服务"""
    return KycService()


@router.post(
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


@router.post(
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

