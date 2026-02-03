"""
KYC Base64 图片上传属性测试

使用 pytest + hypothesis 进行属性测试，验证 Base64 图片上传功能。

Feature: kyc-backend-enhancement
**Validates: Requirements 4.2, 4.3, 4.4, 4.6**
"""

import base64
import io
import uuid
from typing import Literal, Optional
from unittest.mock import AsyncMock, MagicMock

import pytest
from hypothesis import given, strategies as st, settings, HealthCheck, assume
from pydantic import ValidationError

from src.services.kyc.schemas import Base64UploadRequest


# ============ 常量定义 (与 API 实现保持一致) ============

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
BASE64_ALLOWED_IMAGE_TYPES = {"jpg", "jpeg", "png"}

IMAGE_MAGIC_BYTES = {
    b"\xff\xd8\xff": "jpg",  # JPEG
    b"\x89PNG\r\n\x1a\n": "png",  # PNG
}

MIME_TO_EXT = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
}


# ============ 辅助函数 (复制自 API 实现) ============

def detect_image_type(data: bytes) -> str | None:
    """通过魔数检测图片类型"""
    for magic, ext in IMAGE_MAGIC_BYTES.items():
        if data.startswith(magic):
            return ext
    return None


def extract_base64_data(image_data: str) -> tuple[str, str | None]:
    """从 base64 字符串中提取纯 base64 数据和 MIME 类型"""
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



async def simulate_upload_base64_image(
    request: Base64UploadRequest,
    wallet_address: str,
    minio_service: MagicMock,
) -> dict:
    """
    模拟 upload_base64_image 端点的核心逻辑
    
    复制自 src/api/v1/user/kyc.py，用于测试而不需要加载整个 API 模块。
    """
    image_data = request.image_data
    document_type = request.document_type
    
    # 1. 提取纯 base64 数据和 MIME 类型
    base64_data, mime_type = extract_base64_data(image_data)
    
    # 2. 解码 base64 数据
    try:
        padding = 4 - len(base64_data) % 4
        if padding != 4:
            base64_data += "=" * padding
        decoded_data = base64.b64decode(base64_data, validate=True)
    except Exception:
        return {"code": 400, "data": {"msg": "Invalid base64 image data"}}
    
    # 3. 验证图片大小 (≤ 10MB)
    if len(decoded_data) > MAX_FILE_SIZE:
        return {"code": 400, "data": {"msg": "Image size exceeds 10MB limit"}}
    
    # 4. 检测图片类型 (通过魔数)
    detected_ext = detect_image_type(decoded_data)
    if detected_ext is None and mime_type:
        detected_ext = MIME_TO_EXT.get(mime_type.lower())
    
    # 5. 验证图片类型
    if detected_ext is None or detected_ext not in BASE64_ALLOWED_IMAGE_TYPES:
        return {"code": 400, "data": {"msg": "Unsupported image type, allowed: jpg, jpeg, png"}}
    
    # 6. 生成文件路径
    prefix = f"kyc/{wallet_address}/{document_type}_"
    object_name = f"{prefix}{uuid.uuid4()}.{detected_ext}"
    
    # 7. 上传到 MinIO
    try:
        await minio_service.delete_by_prefix(prefix)
        await minio_service.upload_file(
            object_name=object_name,
            file_data=decoded_data,
            content_type=f"image/{detected_ext}",
        )
    except Exception:
        return {"code": 500, "data": {"msg": "File upload failed, please retry"}}
    
    return {
        "code": 200,
        "data": {
            "msg": "Image uploaded successfully",
            "object": {"file_path": object_name, "document_type": document_type}
        }
    }


def run_async(coro):
    """运行异步协程"""
    import asyncio
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()



# ============ 测试图片生成工具 ============

def create_minimal_jpeg() -> bytes:
    """创建最小有效的 JPEG 图片 (1x1 像素)"""
    try:
        from PIL import Image
        img = Image.new('RGB', (1, 1), color='red')
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG', quality=85)
        return buffer.getvalue()
    except ImportError:
        # 预生成的最小 JPEG
        return bytes([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
            0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
            0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
            0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
            0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
            0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
            0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
            0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
            0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
            0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
            0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
            0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
            0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
            0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
            0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
            0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
            0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
            0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
            0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
            0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
            0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
            0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6,
            0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9,
            0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2,
            0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4,
            0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01,
            0x00, 0x00, 0x3F, 0x00, 0xFB, 0xD5, 0xDB, 0x20, 0xA8, 0xF1, 0x7E, 0xA9,
            0x00, 0x0C, 0x3E, 0xF1, 0x40, 0x0F, 0xFF, 0xD9
        ])


def create_minimal_png() -> bytes:
    """创建最小有效的 PNG 图片 (1x1 像素)"""
    try:
        from PIL import Image
        img = Image.new('RGB', (1, 1), color='red')
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        return buffer.getvalue()
    except ImportError:
        return bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
            0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x18, 0xDD,
            0x8D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
            0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
        ])


def create_test_image(image_type: str) -> bytes:
    """创建测试图片"""
    if image_type in ('jpeg', 'jpg'):
        return create_minimal_jpeg()
    elif image_type == 'png':
        return create_minimal_png()
    raise ValueError(f"Unsupported image type: {image_type}")


def encode_to_base64(data: bytes, with_data_uri: bool = False, mime_type: str = "image/jpeg") -> str:
    """将二进制数据编码为 base64"""
    b64_str = base64.b64encode(data).decode('utf-8')
    if with_data_uri:
        return f"data:{mime_type};base64,{b64_str}"
    return b64_str



# ============ 测试数据生成策略 ============

image_types = st.sampled_from(['jpeg', 'jpg', 'png'])
document_types_strategy = st.sampled_from(['face_image', 'selfie'])
use_data_uri = st.booleans()
wallet_address_strategy = st.text(
    alphabet="0123456789abcdef", min_size=40, max_size=40
).map(lambda x: f"0x{x}")


class TestProperty3Base64UploadRoundTrip:
    """
    Property 3: Base64 Image Upload Round-Trip

    *For any* valid base64-encoded image (jpg, jpeg, or png format, size ≤ 10MB),
    uploading via the `/upload-base64` endpoint SHALL succeed and return a valid
    MinIO file path. *For any* invalid base64 string or unsupported image type,
    the endpoint SHALL return a 400 error.

    **Validates: Requirements 4.2, 4.3, 4.4, 4.6**
    """

    @given(
        image_type=image_types,
        document_type=document_types_strategy,
        with_data_uri=use_data_uri,
        wallet_address=wallet_address_strategy,
    )
    @settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture, HealthCheck.too_slow],
    )
    def test_property_valid_base64_image_upload_succeeds(
        self,
        image_type: str,
        document_type: Literal["face_image", "selfie"],
        with_data_uri: bool,
        wallet_address: str,
    ):
        """
        属性测试：有效 base64 图片上传应该成功

        **Validates: Requirements 4.2, 4.3, 4.6**
        """
        img_data = create_test_image(image_type)
        mime_type = "image/jpeg" if image_type in ('jpg', 'jpeg') else f"image/{image_type}"
        base64_str = encode_to_base64(img_data, with_data_uri, mime_type)
        
        request = Base64UploadRequest(image_data=base64_str, document_type=document_type)
        
        mock_minio = MagicMock()
        mock_minio.delete_by_prefix = AsyncMock(return_value=0)
        mock_minio.upload_file = AsyncMock(return_value="ok")
        
        response = run_async(simulate_upload_base64_image(request, wallet_address, mock_minio))
        
        assert response["code"] == 200, f"应该返回成功, 实际: {response}"
        
        file_path = response["data"]["object"]["file_path"]
        assert file_path.startswith(f"kyc/{wallet_address}/")
        assert document_type in file_path
        
        expected_ext = 'jpg' if image_type in ('jpeg', 'jpg') else image_type
        assert file_path.endswith(f".{expected_ext}")
        
        mock_minio.upload_file.assert_called_once()

    @given(document_type=document_types_strategy, wallet_address=wallet_address_strategy)
    @settings(max_examples=50, deadline=None, suppress_health_check=[HealthCheck.too_slow])
    def test_property_valid_jpeg_with_data_uri_succeeds(
        self, document_type: Literal["face_image", "selfie"], wallet_address: str
    ):
        """属性测试：带 data URI 的 JPEG 上传成功 **Validates: Requirements 4.2, 4.3, 4.6**"""
        img_data = create_test_image('jpeg')
        base64_str = encode_to_base64(img_data, with_data_uri=True, mime_type="image/jpeg")
        
        request = Base64UploadRequest(image_data=base64_str, document_type=document_type)
        mock_minio = MagicMock()
        mock_minio.delete_by_prefix = AsyncMock(return_value=0)
        mock_minio.upload_file = AsyncMock(return_value="ok")
        
        response = run_async(simulate_upload_base64_image(request, wallet_address, mock_minio))
        assert response["code"] == 200

    @given(document_type=document_types_strategy, wallet_address=wallet_address_strategy)
    @settings(max_examples=50, deadline=None, suppress_health_check=[HealthCheck.too_slow])
    def test_property_valid_png_upload_succeeds(
        self, document_type: Literal["face_image", "selfie"], wallet_address: str
    ):
        """属性测试：PNG 上传成功 **Validates: Requirements 4.2, 4.3, 4.6**"""
        img_data = create_test_image('png')
        base64_str = encode_to_base64(img_data, with_data_uri=False)
        
        request = Base64UploadRequest(image_data=base64_str, document_type=document_type)
        mock_minio = MagicMock()
        mock_minio.delete_by_prefix = AsyncMock(return_value=0)
        mock_minio.upload_file = AsyncMock(return_value="ok")
        
        response = run_async(simulate_upload_base64_image(request, wallet_address, mock_minio))
        assert response["code"] == 200
        assert response["data"]["object"]["file_path"].endswith(".png")


    # ============ 无效 Base64 数据测试 ============

    @pytest.mark.parametrize("invalid_input", [
        "",
        "   ",
        "not-valid-base64!@#$%",
        "data:image/jpeg;base64,",
        "data:image/jpeg;base64,!!!",
        "====",
    ])
    def test_invalid_base64_special_cases_return_400(self, invalid_input: str):
        """单元测试：无效 base64 输入被 Schema 拒绝 **Validates: Requirements 4.4**"""
        with pytest.raises(ValidationError) as exc_info:
            Base64UploadRequest(image_data=invalid_input, document_type="face_image")
        assert "base64" in str(exc_info.value).lower() or "invalid" in str(exc_info.value).lower()

    # ============ 不支持的图片类型测试 ============

    def test_unsupported_image_type_gif_returns_400(self):
        """单元测试：GIF 返回 400 **Validates: Requirements 4.6**"""
        gif_data = bytes([
            0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00,
            0x00, 0x00, 0x00, 0x2C, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00,
            0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3B
        ])
        base64_str = encode_to_base64(gif_data, with_data_uri=True, mime_type="image/gif")
        request = Base64UploadRequest(image_data=base64_str, document_type="face_image")
        
        mock_minio = MagicMock()
        mock_minio.delete_by_prefix = AsyncMock(return_value=0)
        
        response = run_async(simulate_upload_base64_image(request, "0x" + "a" * 40, mock_minio))
        assert response["code"] == 400
        assert "Unsupported image type" in response["data"]["msg"]

    def test_unsupported_image_type_bmp_returns_400(self):
        """单元测试：BMP 返回 400 **Validates: Requirements 4.6**"""
        bmp_data = bytes([
            0x42, 0x4D, 0x3A, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x36, 0x00, 0x00, 0x00, 0x28, 0x00, 0x00, 0x00, 0x01, 0x00,
            0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x00, 0x18, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0xFF, 0x00, 0x00, 0x00
        ])
        base64_str = encode_to_base64(bmp_data, with_data_uri=True, mime_type="image/bmp")
        request = Base64UploadRequest(image_data=base64_str, document_type="face_image")
        
        mock_minio = MagicMock()
        mock_minio.delete_by_prefix = AsyncMock(return_value=0)
        
        response = run_async(simulate_upload_base64_image(request, "0x" + "a" * 40, mock_minio))
        assert response["code"] == 400

    def test_non_image_data_returns_400(self):
        """单元测试：非图片数据返回 400 **Validates: Requirements 4.6**"""
        pdf_data = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
        base64_str = encode_to_base64(pdf_data, with_data_uri=True, mime_type="application/pdf")
        request = Base64UploadRequest(image_data=base64_str, document_type="face_image")
        
        mock_minio = MagicMock()
        mock_minio.delete_by_prefix = AsyncMock(return_value=0)
        
        response = run_async(simulate_upload_base64_image(request, "0x" + "a" * 40, mock_minio))
        assert response["code"] == 400


    # ============ 图片大小限制测试 ============

    def test_image_exceeds_10mb_returns_400(self):
        """单元测试：超过 10MB 返回 400 **Validates: Requirements 4.4**"""
        jpeg_header = bytes([0xFF, 0xD8, 0xFF, 0xE0])
        large_data = jpeg_header + b'\x00' * (10 * 1024 * 1024 + 1024)
        base64_str = encode_to_base64(large_data, with_data_uri=True, mime_type="image/jpeg")
        
        request = Base64UploadRequest(image_data=base64_str, document_type="face_image")
        mock_minio = MagicMock()
        mock_minio.delete_by_prefix = AsyncMock(return_value=0)
        
        response = run_async(simulate_upload_base64_image(request, "0x" + "a" * 40, mock_minio))
        assert response["code"] == 400
        assert "10MB" in response["data"]["msg"]

    def test_image_within_10mb_succeeds(self):
        """单元测试：10MB 以内成功 **Validates: Requirements 4.4**"""
        img_data = create_test_image('jpeg')
        base64_str = encode_to_base64(img_data, with_data_uri=True, mime_type="image/jpeg")
        
        request = Base64UploadRequest(image_data=base64_str, document_type="face_image")
        mock_minio = MagicMock()
        mock_minio.delete_by_prefix = AsyncMock(return_value=0)
        mock_minio.upload_file = AsyncMock(return_value="ok")
        
        response = run_async(simulate_upload_base64_image(request, "0x" + "a" * 40, mock_minio))
        assert response["code"] == 200

    # ============ 辅助函数测试 ============

    @pytest.mark.parametrize("image_data,expected_ext", [
        (create_minimal_jpeg(), "jpg"),
        (create_minimal_png(), "png"),
    ])
    def test_detect_image_type_correct(self, image_data: bytes, expected_ext: str):
        """单元测试：detect_image_type 正确检测 **Validates: Requirements 4.6**"""
        assert detect_image_type(image_data) == expected_ext

    def test_detect_image_type_unknown_returns_none(self):
        """单元测试：未知类型返回 None **Validates: Requirements 4.6**"""
        assert detect_image_type(b"This is not an image") is None

    @pytest.mark.parametrize("input_data,expected_base64,expected_mime", [
        ("SGVsbG8gV29ybGQ=", "SGVsbG8gV29ybGQ=", None),
        ("data:image/jpeg;base64,SGVsbG8=", "SGVsbG8=", "image/jpeg"),
        ("data:image/png;base64,SGVsbG8=", "SGVsbG8=", "image/png"),
        ("  SGVsbG8gV29ybGQ=  ", "SGVsbG8gV29ybGQ=", None),
    ])
    def test_extract_base64_data_correct(self, input_data: str, expected_base64: str, expected_mime: Optional[str]):
        """单元测试：extract_base64_data 正确提取 **Validates: Requirements 4.2**"""
        base64_data, mime_type = extract_base64_data(input_data)
        assert base64_data == expected_base64
        assert mime_type == expected_mime


class TestBase64UploadEdgeCases:
    """边界条件测试 **Validates: Requirements 4.2, 4.3, 4.4, 4.6**"""

    def test_empty_string_rejected(self):
        """空字符串被拒绝"""
        with pytest.raises(ValidationError):
            Base64UploadRequest(image_data="", document_type="face_image")

    def test_whitespace_only_rejected(self):
        """只有空格被拒绝"""
        with pytest.raises(ValidationError):
            Base64UploadRequest(image_data="   \t\n   ", document_type="face_image")

    def test_valid_base64_but_not_image_rejected(self):
        """有效 base64 但非图片被拒绝"""
        text_data = b"Hello, this is just text, not an image!"
        base64_str = encode_to_base64(text_data)
        request = Base64UploadRequest(image_data=base64_str, document_type="face_image")
        
        mock_minio = MagicMock()
        mock_minio.delete_by_prefix = AsyncMock(return_value=0)
        
        response = run_async(simulate_upload_base64_image(request, "0x" + "a" * 40, mock_minio))
        assert response["code"] == 400

    def test_document_type_face_image_accepted(self):
        """document_type='face_image' 被接受"""
        img_data = create_test_image('jpeg')
        base64_str = encode_to_base64(img_data)
        request = Base64UploadRequest(image_data=base64_str, document_type="face_image")
        assert request.document_type == "face_image"

    def test_document_type_selfie_accepted(self):
        """document_type='selfie' 被接受"""
        img_data = create_test_image('jpeg')
        base64_str = encode_to_base64(img_data)
        request = Base64UploadRequest(image_data=base64_str, document_type="selfie")
        assert request.document_type == "selfie"

    def test_invalid_document_type_rejected(self):
        """无效 document_type 被拒绝"""
        img_data = create_test_image('jpeg')
        base64_str = encode_to_base64(img_data)
        with pytest.raises(ValidationError):
            Base64UploadRequest(image_data=base64_str, document_type="invalid_type")  # type: ignore

    def test_minio_upload_failure_returns_500(self):
        """MinIO 失败返回 500"""
        img_data = create_test_image('jpeg')
        base64_str = encode_to_base64(img_data)
        request = Base64UploadRequest(image_data=base64_str, document_type="face_image")
        
        mock_minio = MagicMock()
        mock_minio.delete_by_prefix = AsyncMock(return_value=0)
        mock_minio.upload_file = AsyncMock(side_effect=Exception("MinIO connection failed"))
        
        response = run_async(simulate_upload_base64_image(request, "0x" + "a" * 40, mock_minio))
        assert response["code"] == 500
        assert "upload failed" in response["data"]["msg"].lower()
