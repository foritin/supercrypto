"""
用户 KYC 路由 - KYC 申请、文件上传

路由前缀: /api/v1/user/kyc

多证件上传支持 (2026-02-01):
- 支持三种证件类型: passport, id_card, drivers_license
- 每种证件类型有独立的上传路径
- 护照只需正面，其他证件需要正面+背面

Base64 图片上传支持 (KYC Backend Enhancement):
- 支持活体检测人脸图片上传
- 支持 data URI 格式和纯 base64 字符串
"""

from falib.utils.handlers import create_success_response
from falib.utils.log import get_logger
from fastapi import APIRouter, Depends, File, Form, UploadFile, status

from src.common.dependencies import get_kyc_service
from src.common.exceptions import ForbiddenException, NotFoundException
from src.schemas.enums import ErrorCode
from src.schemas.kyc import (
    Base64UploadRequest,
    KycApplyRequest,
    KycUploadResponse,
    UpdateKycStatusRequest,
)
from src.security import require_user
from src.services import KycService

logger = get_logger("business.api.user.kyc")

router = APIRouter()


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
    service: KycService = Depends(get_kyc_service),
):
    """上传 KYC 证件照片 (多证件版本)"""
    content = await file.read()
    object_name = await service.upload_kyc_document(
        wallet_address=wallet_address,
        document_type=document_type,
        file_content=content,
        filename=file.filename or "",
        content_type=file.content_type,
    )
    return create_success_response(
        object_data=KycUploadResponse(
            file_path=object_name, document_type=document_type
        ).model_dump(),
        msg="文件上传成功",
    )


@router.post(
    "/upload-base64",
    summary="Upload Base64 Image",
    description="Upload a base64 encoded image for liveness detection or selfie",
)
async def upload_base64_image(
    request: Base64UploadRequest,
    wallet_address: str = Depends(require_user),
    service: KycService = Depends(get_kyc_service),
):
    """上传 Base64 编码的图片"""
    object_name = await service.upload_base64_image(
        wallet_address=wallet_address,
        document_type=request.document_type,
        image_data=request.image_data,
    )
    return create_success_response(
        object_data=KycUploadResponse(
            file_path=object_name, document_type=request.document_type
        ).model_dump(),
        msg="Image uploaded successfully",
    )


@router.post(
    "/upload-video",
    summary="Upload Liveness Video",
    description="Upload a liveness detection video recording (WebM format, max 50MB)",
)
async def upload_liveness_video(
    file: UploadFile = File(..., description="视频文件 (WebM 格式, 最大 50MB)"),
    wallet_address: str = Depends(require_user),
    service: KycService = Depends(get_kyc_service),
):
    """上传活体检测视频"""
    content = await file.read()
    object_name = await service.upload_liveness_video(
        wallet_address=wallet_address,
        file_content=content,
        filename=file.filename or "",
        content_type=file.content_type,
    )
    return create_success_response(
        object_data=KycUploadResponse(
            file_path=object_name, document_type="liveness_video"
        ).model_dump(),
        msg="Video uploaded successfully",
    )


@router.get(
    "/document-url",
    summary="Get Document Presigned URL",
    description="Get a presigned URL for viewing an uploaded KYC document",
)
async def get_document_url(
    file_path: str,
    wallet_address: str = Depends(require_user),
    service: KycService = Depends(get_kyc_service),
):
    """获取已上传 KYC 文档的预签名 URL (用于预览)"""
    expected_prefix = f"kyc/{wallet_address}/"
    if not file_path.startswith(expected_prefix):
        raise ForbiddenException(
            message="无权访问该文件",
            error_code=ErrorCode.FORBIDDEN,
        )

    exists = await service.storage.file_exists(file_path)
    if not exists:
        raise NotFoundException(
            message="文件不存在",
            error_code=ErrorCode.NOT_FOUND,
        )

    url = await service.storage.get_presigned_url(file_path, expires=3600)
    return create_success_response(
        object_data={"url": url, "file_path": file_path},
        msg="获取成功",
    )


@router.post(
    "/status",
    summary="Update KYC Status",
    description="Update KYC status. Users can only set status to not_started when current status is rejected.",
)
async def update_kyc_status(
    data: UpdateKycStatusRequest,
    wallet_address: str = Depends(require_user),
    service: KycService = Depends(get_kyc_service),
):
    """更新 KYC 状态"""
    result = await service.update_status(wallet_address, data.target_status)
    return create_success_response(
        object_data={"status": result},
        msg="状态更新成功",
    )


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
    """发起 KYC 申请"""
    data.wallet_address = wallet_address
    result = await service.apply(data)
    return create_success_response(
        object_data=result.model_dump(mode="json")
        if hasattr(result, "model_dump")
        else result,
        msg="KYC application submitted successfully",
    )
