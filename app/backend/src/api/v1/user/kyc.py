"""
用户 KYC 路由 - KYC 申请、文件上传

路由前缀: /api/v1/user/kyc

多证件上传支持 (2026-02-01):
- 支持三种证件类型: passport, id_card, drivers_license
- 每种证件类型有独立的上传路径
- 护照只需正面，其他证件需要正面+背面
"""

import uuid

from falib.utils.handlers import create_success_response, error_response
from falib.utils.log import get_logger
from fastapi import APIRouter, Depends, File, Form, UploadFile, status

from src.services.kyc.schemas import (
    KycApplyRequest,
    KycUploadResponse,
)
from src.services.kyc.service import KycService
from src.shared.security import require_user
from src.shared.services.minio_service import get_minio_service

logger = get_logger("kyc.api")

router = APIRouter()

# 文件上传配置
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "pdf"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# 多证件上传支持的文档类型
# 格式: {证件类型}_{正面/背面} 或 selfie
ALLOWED_DOCUMENT_TYPES = {
    # 护照 (只需正面)
    "passport_front",
    # 身份证 (正面+背面)
    "id_card_front",
    "id_card_back",
    # 驾照 (正面+背面)
    "drivers_license_front",
    "drivers_license_back",
    # 自拍照
    "selfie",
}


def get_kyc_service() -> KycService:
    """依赖注入：获取 KYC 服务"""
    return KycService()


@router.post(
    "/upload-document",
    summary="Upload KYC Document",
    description="Upload a KYC document to MinIO. Supports multiple document types.",
)
async def upload_kyc_document(
    document_type: str = Form(
        ...,
        description="文档类型: passport_front, id_card_front, id_card_back, drivers_license_front, drivers_license_back, selfie",
    ),
    file: UploadFile = File(..., description="文件 (jpg/jpeg/png/pdf, max 10MB)"),
    wallet_address: str = Depends(require_user),
):
    """
    上传 KYC 证件照片 (多证件版本)

    - 需要 JWT 认证
    - **document_type**: 文档类型
      - `passport_front`: 护照数据页
      - `id_card_front`: 身份证正面
      - `id_card_back`: 身份证背面
      - `drivers_license_front`: 驾照正面
      - `drivers_license_back`: 驾照背面
      - `selfie`: 手持证件自拍
    - **file**: 文件 (jpg/jpeg/png/pdf, max 10MB)

    上传成功后返回文件路径，用于提交 KYC 申请时传入。
    
    文件路径格式: `kyc/{wallet_address}/{document_type}_{uuid}.{ext}`
    """
    # 验证文档类型
    if document_type not in ALLOWED_DOCUMENT_TYPES:
        return error_response(
            msg=f"不支持的文档类型，允许: {', '.join(sorted(ALLOWED_DOCUMENT_TYPES))}",
            code=400,
        )

    # 验证文件类型
    if not file.filename:
        return error_response(msg="文件名不能为空", code=400)

    ext = file.filename.split(".")[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return error_response(
            msg=f"不支持的文件格式，允许: {', '.join(ALLOWED_EXTENSIONS)}",
            code=400,
        )

    # 读取文件内容
    content = await file.read()

    # 验证文件大小
    if len(content) > MAX_FILE_SIZE:
        return error_response(
            msg=f"文件大小超过 {MAX_FILE_SIZE // (1024 * 1024)}MB 限制",
            code=400,
        )

    # 生成文件路径: kyc/{wallet_address}/{document_type}_{uuid}.{ext}
    # 前缀用于删除旧文件: kyc/{wallet_address}/{document_type}_
    prefix = f"kyc/{wallet_address}/{document_type}_"
    object_name = f"{prefix}{uuid.uuid4()}.{ext}"

    # 上传到 MinIO
    try:
        minio_service = get_minio_service()
        
        # 先删除该类型的旧文件 (覆盖上传)
        deleted_count = await minio_service.delete_by_prefix(prefix)
        if deleted_count > 0:
            logger.info(f"Deleted {deleted_count} old file(s) for {document_type}")
        
        # 上传新文件
        await minio_service.upload_file(
            object_name=object_name,
            file_data=content,
            content_type=file.content_type or f"image/{ext}",
        )
        logger.info(f"KYC document uploaded: {object_name}")
    except Exception as e:
        logger.error(f"Failed to upload KYC document: {e}")
        return error_response(msg="文件上传失败，请重试", code=500)

    return create_success_response(
        object_data=KycUploadResponse(
            file_path=object_name, document_type=document_type
        ).model_dump(),
        msg="文件上传成功",
    )


@router.get(
    "/document-url",
    summary="Get Document Presigned URL",
    description="Get a presigned URL for viewing an uploaded KYC document",
)
async def get_document_url(
    file_path: str,
    wallet_address: str = Depends(require_user),
):
    """
    获取已上传 KYC 文档的预签名 URL (用于预览)

    - 需要 JWT 认证
    - **file_path**: 文件路径 (上传时返回的 file_path)
    - 只能访问自己上传的文件

    返回预签名 URL，有效期 1 小时。
    """
    # 安全检查：确保只能访问自己的文件
    expected_prefix = f"kyc/{wallet_address}/"
    if not file_path.startswith(expected_prefix):
        return error_response(
            msg="无权访问该文件",
            code=403,
        )

    try:
        minio_service = get_minio_service()
        
        # 检查文件是否存在
        exists = await minio_service.file_exists(file_path)
        if not exists:
            return error_response(
                msg="文件不存在",
                code=404,
            )
        
        # 获取预签名 URL (1小时有效)
        url = await minio_service.get_presigned_url(file_path, expires=3600)
        
        return create_success_response(
            object_data={"url": url, "file_path": file_path},
            msg="获取成功",
        )
    except Exception as e:
        logger.error(f"Failed to get presigned URL: {e}")
        return error_response(msg="获取文件 URL 失败", code=500)


@router.post(
    "/apply",
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
    return create_success_response(
        object_data=result.model_dump() if hasattr(result, "model_dump") else result,
        msg="KYC application submitted successfully",
    )
