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

import base64
import uuid

from falib.utils.handlers import create_error_response, create_success_response
from falib.utils.log import get_logger
from fastapi import APIRouter, Depends, File, Form, UploadFile, status

from src.services.kyc.schemas import (
    Base64UploadRequest,
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

# 视频上传配置 (Requirements 4.3, 4.4, 4.5)
ALLOWED_VIDEO_EXTENSIONS = {"webm"}
# 支持带 codec 参数的 MIME 类型 (如 video/webm;codecs=vp9)
ALLOWED_VIDEO_MIME_TYPES = {
    "video/webm",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
}
MAX_VIDEO_SIZE = 50 * 1024 * 1024  # 50MB

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
        return create_error_response(
            msg=f"不支持的文档类型，允许: {', '.join(sorted(ALLOWED_DOCUMENT_TYPES))}",
            code=400,
        )

    # 验证文件类型
    if not file.filename:
        return create_error_response(msg="文件名不能为空", code=400)

    ext = file.filename.split(".")[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return create_error_response(
            msg=f"不支持的文件格式，允许: {', '.join(ALLOWED_EXTENSIONS)}",
            code=400,
        )

    # 读取文件内容
    content = await file.read()

    # 验证文件大小
    if len(content) > MAX_FILE_SIZE:
        return create_error_response(
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
        return create_error_response(msg="文件上传失败，请重试", code=500)

    return create_success_response(
        object_data=KycUploadResponse(
            file_path=object_name, document_type=document_type
        ).model_dump(),
        msg="文件上传成功",
    )


# ========== Base64 图片上传支持 (KYC Backend Enhancement) ==========

# 支持的图片类型及其 MIME 类型映射
BASE64_ALLOWED_IMAGE_TYPES = {"jpg", "jpeg", "png"}
MIME_TO_EXT = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
}
# 图片魔数 (Magic Bytes) 用于检测图片类型
IMAGE_MAGIC_BYTES = {
    b"\xff\xd8\xff": "jpg",  # JPEG
    b"\x89PNG\r\n\x1a\n": "png",  # PNG
}


def detect_image_type(data: bytes) -> str | None:
    """
    通过魔数检测图片类型

    Args:
        data: 图片二进制数据

    Returns:
        图片类型 (jpg/png) 或 None
    """
    for magic, ext in IMAGE_MAGIC_BYTES.items():
        if data.startswith(magic):
            return ext
    return None


def extract_base64_data(image_data: str) -> tuple[str, str | None]:
    """
    从 base64 字符串中提取纯 base64 数据和 MIME 类型

    支持两种格式:
    1. Data URI: data:image/jpeg;base64,/9j/4AAQSkZJRg...
    2. 纯 Base64: /9j/4AAQSkZJRg...

    Args:
        image_data: base64 编码的图片数据

    Returns:
        (纯 base64 数据, MIME 类型或 None)
    """
    mime_type = None
    base64_data = image_data.strip()

    if base64_data.startswith("data:"):
        # 解析 data URI 格式
        try:
            # 格式: data:image/jpeg;base64,xxxxx
            if ";base64," in base64_data:
                header, base64_data = base64_data.split(";base64,", 1)
                # 提取 MIME 类型: data:image/jpeg -> image/jpeg
                mime_type = header.replace("data:", "")
            elif "," in base64_data:
                # 简化格式: data:image/jpeg,xxxxx
                header, base64_data = base64_data.split(",", 1)
                mime_type = header.replace("data:", "")
        except (ValueError, IndexError):
            pass

    return base64_data, mime_type


@router.post(
    "/upload-base64",
    summary="Upload Base64 Image",
    description="Upload a base64 encoded image for liveness detection or selfie",
)
async def upload_base64_image(
    request: Base64UploadRequest,
    wallet_address: str = Depends(require_user),
):
    """
    上传 Base64 编码的图片 (Requirements 4.1-4.7)

    用于活体检测等场景，前端直接提交 base64 编码的图片数据。

    - 需要 JWT 认证
    - **image_data**: Base64 编码的图片数据 (支持 data URI 格式或纯 base64)
    - **document_type**: 文档类型
      - `face_image`: 活体检测人脸图片
      - `selfie`: 手持证件自拍

    验证规则:
    - 支持图片类型: jpg, jpeg, png
    - 最大图片大小: 10MB

    上传成功后返回文件路径，用于提交 KYC 申请时传入。

    文件路径格式: `kyc/{wallet_address}/{document_type}_{uuid}.{ext}`
    """
    image_data = request.image_data
    document_type = request.document_type

    # 1. 提取纯 base64 数据和 MIME 类型
    base64_data, mime_type = extract_base64_data(image_data)

    # 2. 解码 base64 数据
    try:
        # 添加必要的 padding
        padding = 4 - len(base64_data) % 4
        if padding != 4:
            base64_data += "=" * padding

        decoded_data = base64.b64decode(base64_data, validate=True)
    except Exception as e:
        logger.warning(f"Base64 decode failed: {e}")
        return create_error_response(
            msg="Invalid base64 image data",
            code=status.HTTP_400_BAD_REQUEST,
        )

    # 3. 验证图片大小 (≤ 10MB)
    if len(decoded_data) > MAX_FILE_SIZE:
        return create_error_response(
            msg="Image size exceeds 10MB limit",
            code=status.HTTP_400_BAD_REQUEST,
        )

    # 4. 检测图片类型 (通过魔数)
    detected_ext = detect_image_type(decoded_data)

    # 如果魔数检测失败，尝试从 MIME 类型推断
    if detected_ext is None and mime_type:
        detected_ext = MIME_TO_EXT.get(mime_type.lower())

    # 5. 验证图片类型
    if detected_ext is None or detected_ext not in BASE64_ALLOWED_IMAGE_TYPES:
        return create_error_response(
            msg="Unsupported image type, allowed: jpg, jpeg, png",
            code=status.HTTP_400_BAD_REQUEST,
        )

    # 6. 生成文件路径: kyc/{wallet_address}/{document_type}_{uuid}.{ext}
    prefix = f"kyc/{wallet_address}/{document_type}_"
    object_name = f"{prefix}{uuid.uuid4()}.{detected_ext}"

    # 确定 content_type
    content_type = f"image/{detected_ext}"
    if detected_ext == "jpg":
        content_type = "image/jpeg"

    # 7. 上传到 MinIO
    try:
        minio_service = get_minio_service()

        # 先删除该类型的旧文件 (覆盖上传)
        deleted_count = await minio_service.delete_by_prefix(prefix)
        if deleted_count > 0:
            logger.info(f"Deleted {deleted_count} old file(s) for {document_type}")

        # 上传新文件
        await minio_service.upload_file(
            object_name=object_name,
            file_data=decoded_data,
            content_type=content_type,
        )
        logger.info(f"Base64 image uploaded: {object_name}")
    except Exception as e:
        logger.error(f"Failed to upload base64 image: {e}")
        return create_error_response(
            msg="File upload failed, please retry",
            code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return create_success_response(
        object_data=KycUploadResponse(
            file_path=object_name, document_type=document_type
        ).model_dump(),
        msg="Image uploaded successfully",
    )


# ========== 活体检测视频上传支持 (KYC Face Image and Liveness Video Storage) ==========

# WebM 视频魔数 (Magic Bytes)
WEBM_MAGIC_BYTES = b"\x1a\x45\xdf\xa3"  # EBML header


def is_webm_video(data: bytes) -> bool:
    """
    通过魔数检测是否为 WebM 视频

    WebM 文件以 EBML header (0x1A 0x45 0xDF 0xA3) 开头

    Args:
        data: 视频二进制数据

    Returns:
        是否为 WebM 格式
    """
    return data.startswith(WEBM_MAGIC_BYTES)


@router.post(
    "/upload-video",
    summary="Upload Liveness Video",
    description="Upload a liveness detection video recording (WebM format, max 50MB)",
)
async def upload_liveness_video(
    file: UploadFile = File(..., description="视频文件 (WebM 格式, 最大 50MB)"),
    wallet_address: str = Depends(require_user),
):
    """
    上传活体检测视频 (Requirements 4.3, 4.4, 4.5)

    用于存储活体检测过程的视频录制，供合规审核使用。

    - 需要 JWT 认证
    - **file**: 视频文件 (WebM 格式, 最大 50MB)

    验证规则:
    - 支持格式: WebM (通过文件扩展名和 MIME 类型验证)
    - 最大文件大小: 50MB
    - 通过魔数验证文件内容确实是 WebM 格式

    上传成功后返回文件路径，用于提交 KYC 申请时传入。

    文件路径格式: `kyc/{wallet_address}/liveness_video_{uuid}.webm`
    """
    # 1. 验证文件名存在
    if not file.filename:
        return create_error_response(
            msg="Filename is required",
            code=status.HTTP_400_BAD_REQUEST,
        )

    # 2. 验证文件扩展名
    ext = file.filename.split(".")[-1].lower()
    if ext not in ALLOWED_VIDEO_EXTENSIONS:
        return create_error_response(
            msg="Unsupported video format, only WebM allowed",
            code=status.HTTP_400_BAD_REQUEST,
        )

    # 3. 验证 MIME 类型 (如果提供)
    if file.content_type:
        content_type_lower = file.content_type.lower()
        # 检查是否是 WebM 类型（支持带 codec 参数的格式，如 video/webm;codecs=vp9）
        is_webm = content_type_lower.startswith("video/webm")
        is_octet_stream = content_type_lower == "application/octet-stream"

        if not is_webm and not is_octet_stream:
            return create_error_response(
                msg="Unsupported video format, only WebM allowed",
                code=status.HTTP_400_BAD_REQUEST,
            )

    # 4. 读取文件内容
    content = await file.read()

    # 5. 验证文件大小 (≤ 50MB)
    if len(content) > MAX_VIDEO_SIZE:
        return create_error_response(
            msg="Video size exceeds 50MB limit",
            code=status.HTTP_400_BAD_REQUEST,
        )

    # 6. 验证文件内容是否为 WebM 格式 (通过魔数)
    if not is_webm_video(content):
        return create_error_response(
            msg="Invalid video content, only WebM format allowed",
            code=status.HTTP_400_BAD_REQUEST,
        )

    # 7. 生成文件路径: kyc/{wallet_address}/liveness_video_{uuid}.webm
    prefix = f"kyc/{wallet_address}/liveness_video_"
    object_name = f"{prefix}{uuid.uuid4()}.webm"

    # 8. 上传到 MinIO
    try:
        minio_service = get_minio_service()

        # 先删除旧的活体检测视频 (覆盖上传)
        deleted_count = await minio_service.delete_by_prefix(prefix)
        if deleted_count > 0:
            logger.info(f"Deleted {deleted_count} old liveness video(s)")

        # 上传新文件
        await minio_service.upload_file(
            object_name=object_name,
            file_data=content,
            content_type="video/webm",
        )
        logger.info(f"Liveness video uploaded: {object_name}")
    except Exception as e:
        logger.error(f"Failed to upload liveness video: {e}")
        return create_error_response(
            msg="Video upload failed, please retry",
            code=status.HTTP_500_INTERNAL_SERVER_ERROR,
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
        return create_error_response(
            msg="无权访问该文件",
            code=403,
        )

    try:
        minio_service = get_minio_service()

        # 检查文件是否存在
        exists = await minio_service.file_exists(file_path)
        if not exists:
            return create_error_response(
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
        return create_error_response(msg="获取文件 URL 失败", code=500)


@router.post(
    "/status",
    summary="Update KYC Status",
    description="Update KYC status. Users can only set status to not_started when current status is rejected.",
)
async def update_kyc_status(
    target_status: str = Form(..., description="目标状态: not_started"),
    wallet_address: str = Depends(require_user),
    service: KycService = Depends(get_kyc_service),
):
    """
    更新 KYC 状态

    用户只能在以下情况下更新状态：
    - 当前状态为 rejected 时，可以设置为 not_started（重新提交）
    """
    try:
        result = await service.update_status(wallet_address, target_status)
        return create_success_response(
            object_data={"status": result},
            msg="状态更新成功",
        )
    except Exception as e:
        logger.error(f"Failed to update KYC status: {e}")
        return create_error_response(
            msg=str(e),
            code=status.HTTP_400_BAD_REQUEST,
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
        # 使用 mode='json' 确保 datetime 等对象被正确序列化为 ISO 字符串
        object_data=result.model_dump(mode="json")
        if hasattr(result, "model_dump")
        else result,
        msg="KYC application submitted successfully",
    )
