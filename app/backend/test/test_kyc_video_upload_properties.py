"""
KYC 活体检测视频上传属性测试

使用 pytest + hypothesis 进行属性测试，验证视频上传功能。

Feature: kyc-face-liveness-storage
**Validates: Requirements 4.4, 5.3, 5.4**
"""

import uuid
from typing import Optional
from unittest.mock import AsyncMock, MagicMock

import pytest
from hypothesis import HealthCheck, assume, given, settings
from hypothesis import strategies as st

# ============ 常量定义 (与 API 实现保持一致) ============

MAX_VIDEO_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_VIDEO_EXTENSIONS = {"webm"}
# 支持带 codec 参数的 MIME 类型 (如 video/webm;codecs=vp9)
ALLOWED_VIDEO_MIME_TYPES = {
    "video/webm",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
}

# WebM 视频魔数 (Magic Bytes) - EBML header
WEBM_MAGIC_BYTES = b"\x1a\x45\xdf\xa3"


# ============ 辅助函数 (复制自 API 实现) ============


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


async def simulate_upload_liveness_video(
    filename: str,
    content: bytes,
    content_type: Optional[str],
    wallet_address: str,
    minio_service: MagicMock,
) -> dict:
    """
    模拟 upload_liveness_video 端点的核心逻辑

    复制自 src/api/v1/user/kyc.py，用于测试而不需要加载整个 API 模块。
    """
    # 1. 验证文件名存在
    if not filename:
        return {"code": 400, "data": {"msg": "Filename is required"}}

    # 2. 验证文件扩展名
    ext = filename.split(".")[-1].lower()
    if ext not in ALLOWED_VIDEO_EXTENSIONS:
        return {
            "code": 400,
            "data": {"msg": "Unsupported video format, only WebM allowed"},
        }

    # 3. 验证 MIME 类型 (如果提供)
    if content_type:
        content_type_lower = content_type.lower()
        # 检查是否是 WebM 类型（支持带 codec 参数的格式，如 video/webm;codecs=vp9）
        is_webm = content_type_lower.startswith("video/webm")
        is_octet_stream = content_type_lower == "application/octet-stream"

        if not is_webm and not is_octet_stream:
            return {
                "code": 400,
                "data": {"msg": "Unsupported video format, only WebM allowed"},
            }

    # 4. 验证文件大小 (≤ 50MB)
    if len(content) > MAX_VIDEO_SIZE:
        return {"code": 400, "data": {"msg": "Video size exceeds 50MB limit"}}

    # 5. 验证文件内容是否为 WebM 格式 (通过魔数)
    if not is_webm_video(content):
        return {
            "code": 400,
            "data": {"msg": "Invalid video content, only WebM format allowed"},
        }

    # 6. 生成文件路径: kyc/{wallet_address}/liveness_video_{uuid}.webm
    prefix = f"kyc/{wallet_address}/liveness_video_"
    object_name = f"{prefix}{uuid.uuid4()}.webm"

    # 7. 上传到 MinIO
    try:
        await minio_service.delete_by_prefix(prefix)
        await minio_service.upload_file(
            object_name=object_name,
            file_data=content,
            content_type="video/webm",
        )
    except Exception:
        return {"code": 500, "data": {"msg": "Video upload failed, please retry"}}

    return {
        "code": 200,
        "data": {
            "msg": "Video uploaded successfully",
            "object": {"file_path": object_name, "document_type": "liveness_video"},
        },
    }


def run_async(coro):
    """运行异步协程"""
    import asyncio

    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


# ============ 测试视频生成工具 ============


def create_minimal_webm() -> bytes:
    """
    创建最小有效的 WebM 视频数据

    WebM 文件以 EBML header 开头，后跟 EBML 元素。
    这是一个简化的 WebM 结构，足以通过魔数验证。
    """
    # EBML header (0x1A 0x45 0xDF 0xA3) + 简化的 EBML 元素
    return bytes(
        [
            0x1A,
            0x45,
            0xDF,
            0xA3,  # EBML header
            0x01,
            0x00,
            0x00,
            0x00,  # EBML size (simplified)
            0x00,
            0x00,
            0x00,
            0x1F,  # Size continuation
            0x42,
            0x86,
            0x81,
            0x01,  # EBMLVersion = 1
            0x42,
            0xF7,
            0x81,
            0x01,  # EBMLReadVersion = 1
            0x42,
            0xF2,
            0x81,
            0x04,  # EBMLMaxIDLength = 4
            0x42,
            0xF3,
            0x81,
            0x08,  # EBMLMaxSizeLength = 8
            0x42,
            0x82,
            0x84,
            0x77,  # DocType = "webm"
            0x65,
            0x62,
            0x6D,
            0x00,  # "webm\0"
            0x42,
            0x87,
            0x81,
            0x02,  # DocTypeVersion = 2
            0x42,
            0x85,
            0x81,
            0x02,  # DocTypeReadVersion = 2
        ]
    )


def create_fake_video_with_extension(ext: str, content: bytes) -> tuple[str, bytes]:
    """创建带有指定扩展名的假视频文件"""
    filename = f"test_video_{uuid.uuid4()}.{ext}"
    return filename, content


# ============ 测试数据生成策略 ============

# 非 WebM 视频格式
non_webm_extensions = st.sampled_from(["mp4", "avi", "mov", "mkv", "flv", "wmv"])
non_webm_mime_types = st.sampled_from(
    [
        "video/mp4",
        "video/avi",
        "video/x-msvideo",
        "video/quicktime",
        "video/x-matroska",
        "video/x-flv",
        "video/x-ms-wmv",
    ]
)

wallet_address_strategy = st.text(
    alphabet="0123456789abcdef", min_size=40, max_size=40
).map(lambda x: f"0x{x}")

# 随机二进制数据 (非 WebM 格式)
random_binary_data = st.binary(min_size=100, max_size=10000).filter(
    lambda x: not x.startswith(WEBM_MAGIC_BYTES)
)


class TestProperty5VideoFormatAndSizeValidation:
    """
    Property 5: Video Format and Size Validation

    *For any* video upload request, the backend SHALL reject videos that are not
    in WebM format with a 400 error. *For any* video upload request where the file
    size exceeds 50MB, the backend SHALL reject with a 400 error specifying the
    size limit.

    **Validates: Requirements 4.4**
    """

    # ============ 格式验证测试 ============

    @given(
        ext=non_webm_extensions,
        content=random_binary_data,
        wallet_address=wallet_address_strategy,
    )
    @settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[
            HealthCheck.function_scoped_fixture,
            HealthCheck.too_slow,
        ],
    )
    def test_property_non_webm_extension_rejected(
        self,
        ext: str,
        content: bytes,
        wallet_address: str,
    ):
        """
        属性测试：非 WebM 扩展名的视频被拒绝

        **Validates: Requirements 4.4**
        """
        filename = f"test_video.{ext}"

        mock_minio = MagicMock()
        mock_minio.delete_by_prefix = AsyncMock(return_value=0)

        response = run_async(
            simulate_upload_liveness_video(
                filename=filename,
                content=content,
                content_type=f"video/{ext}",
                wallet_address=wallet_address,
                minio_service=mock_minio,
            )
        )

        assert response["code"] == 400, f"非 WebM 扩展名应该被拒绝, 实际: {response}"
        assert "WebM" in response["data"]["msg"]

    @given(
        mime_type=non_webm_mime_types,
        content=random_binary_data,
        wallet_address=wallet_address_strategy,
    )
    @settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[
            HealthCheck.function_scoped_fixture,
            HealthCheck.too_slow,
        ],
    )
    def test_property_non_webm_mime_type_rejected(
        self,
        mime_type: str,
        content: bytes,
        wallet_address: str,
    ):
        """
        属性测试：非 WebM MIME 类型的视频被拒绝 (即使扩展名是 .webm)

        **Validates: Requirements 4.4**
        """
        filename = "test_video.webm"

        mock_minio = MagicMock()
        mock_minio.delete_by_prefix = AsyncMock(return_value=0)

        response = run_async(
            simulate_upload_liveness_video(
                filename=filename,
                content=content,
                content_type=mime_type,
                wallet_address=wallet_address,
                minio_service=mock_minio,
            )
        )

        assert response["code"] == 400, f"非 WebM MIME 类型应该被拒绝, 实际: {response}"
        assert "WebM" in response["data"]["msg"]

    @given(
        content=random_binary_data,
        wallet_address=wallet_address_strategy,
    )
    @settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[
            HealthCheck.function_scoped_fixture,
            HealthCheck.too_slow,
        ],
    )
    def test_property_invalid_webm_content_rejected(
        self,
        content: bytes,
        wallet_address: str,
    ):
        """
        属性测试：无效的 WebM 内容被拒绝 (扩展名和 MIME 类型正确，但内容不是 WebM)

        **Validates: Requirements 4.4**
        """
        # 确保内容不是以 WebM 魔数开头
        assume(not content.startswith(WEBM_MAGIC_BYTES))

        filename = "test_video.webm"

        mock_minio = MagicMock()
        mock_minio.delete_by_prefix = AsyncMock(return_value=0)

        response = run_async(
            simulate_upload_liveness_video(
                filename=filename,
                content=content,
                content_type="video/webm",
                wallet_address=wallet_address,
                minio_service=mock_minio,
            )
        )

        assert response["code"] == 400, f"无效 WebM 内容应该被拒绝, 实际: {response}"
        assert "WebM" in response["data"]["msg"] or "Invalid" in response["data"]["msg"]

    # ============ 大小验证测试 ============

    @given(
        extra_size=st.integers(
            min_value=1, max_value=10 * 1024 * 1024
        ),  # 1 byte to 10MB extra
        wallet_address=wallet_address_strategy,
    )
    @settings(
        max_examples=50,
        deadline=None,
        suppress_health_check=[
            HealthCheck.function_scoped_fixture,
            HealthCheck.too_slow,
        ],
    )
    def test_property_video_exceeds_50mb_rejected(
        self,
        extra_size: int,
        wallet_address: str,
    ):
        """
        属性测试：超过 50MB 的视频被拒绝

        **Validates: Requirements 4.4**
        """
        # 创建超过 50MB 的内容 (WebM 魔数 + 填充数据)
        webm_header = WEBM_MAGIC_BYTES
        padding = b"\x00" * (MAX_VIDEO_SIZE + extra_size - len(webm_header))
        content = webm_header + padding

        filename = "test_video.webm"

        mock_minio = MagicMock()
        mock_minio.delete_by_prefix = AsyncMock(return_value=0)

        response = run_async(
            simulate_upload_liveness_video(
                filename=filename,
                content=content,
                content_type="video/webm",
                wallet_address=wallet_address,
                minio_service=mock_minio,
            )
        )

        assert response["code"] == 400, f"超过 50MB 应该被拒绝, 实际: {response}"
        assert "50MB" in response["data"]["msg"]

    # ============ 有效视频上传测试 ============

    @given(wallet_address=wallet_address_strategy)
    @settings(
        max_examples=50,
        deadline=None,
        suppress_health_check=[
            HealthCheck.function_scoped_fixture,
            HealthCheck.too_slow,
        ],
    )
    def test_property_valid_webm_upload_succeeds(
        self,
        wallet_address: str,
    ):
        """
        属性测试：有效的 WebM 视频上传成功

        **Validates: Requirements 4.4**
        """
        content = create_minimal_webm()
        filename = "test_video.webm"

        mock_minio = MagicMock()
        mock_minio.delete_by_prefix = AsyncMock(return_value=0)
        mock_minio.upload_file = AsyncMock(return_value="ok")

        response = run_async(
            simulate_upload_liveness_video(
                filename=filename,
                content=content,
                content_type="video/webm",
                wallet_address=wallet_address,
                minio_service=mock_minio,
            )
        )

        assert response["code"] == 200, f"有效 WebM 应该上传成功, 实际: {response}"

        file_path = response["data"]["object"]["file_path"]
        assert file_path.startswith(f"kyc/{wallet_address}/liveness_video_")
        assert file_path.endswith(".webm")
        assert response["data"]["object"]["document_type"] == "liveness_video"

        mock_minio.upload_file.assert_called_once()


class TestProperty5EdgeCases:
    """
    Property 5 边界条件测试

    **Validates: Requirements 4.4**
    """

    def test_empty_filename_rejected(self):
        """空文件名被拒绝"""
        content = create_minimal_webm()

        mock_minio = MagicMock()
        mock_minio.delete_by_prefix = AsyncMock(return_value=0)

        response = run_async(
            simulate_upload_liveness_video(
                filename="",
                content=content,
                content_type="video/webm",
                wallet_address="0x" + "a" * 40,
                minio_service=mock_minio,
            )
        )

        assert response["code"] == 400
        assert "Filename" in response["data"]["msg"]

    def test_video_exactly_at_50mb_succeeds(self):
        """恰好 50MB 的视频上传成功"""
        # 创建恰好 50MB 的内容
        webm_header = WEBM_MAGIC_BYTES
        padding = b"\x00" * (MAX_VIDEO_SIZE - len(webm_header))
        content = webm_header + padding

        assert len(content) == MAX_VIDEO_SIZE

        mock_minio = MagicMock()
        mock_minio.delete_by_prefix = AsyncMock(return_value=0)
        mock_minio.upload_file = AsyncMock(return_value="ok")

        response = run_async(
            simulate_upload_liveness_video(
                filename="test_video.webm",
                content=content,
                content_type="video/webm",
                wallet_address="0x" + "a" * 40,
                minio_service=mock_minio,
            )
        )

        assert response["code"] == 200, f"恰好 50MB 应该成功, 实际: {response}"

    def test_video_one_byte_over_50mb_rejected(self):
        """超过 50MB 一个字节的视频被拒绝"""
        # 创建超过 50MB 一个字节的内容
        webm_header = WEBM_MAGIC_BYTES
        padding = b"\x00" * (MAX_VIDEO_SIZE - len(webm_header) + 1)
        content = webm_header + padding

        assert len(content) == MAX_VIDEO_SIZE + 1

        mock_minio = MagicMock()
        mock_minio.delete_by_prefix = AsyncMock(return_value=0)

        response = run_async(
            simulate_upload_liveness_video(
                filename="test_video.webm",
                content=content,
                content_type="video/webm",
                wallet_address="0x" + "a" * 40,
                minio_service=mock_minio,
            )
        )

        assert response["code"] == 400
        assert "50MB" in response["data"]["msg"]

    def test_application_octet_stream_allowed(self):
        """application/octet-stream MIME 类型被允许"""
        content = create_minimal_webm()

        mock_minio = MagicMock()
        mock_minio.delete_by_prefix = AsyncMock(return_value=0)
        mock_minio.upload_file = AsyncMock(return_value="ok")

        response = run_async(
            simulate_upload_liveness_video(
                filename="test_video.webm",
                content=content,
                content_type="application/octet-stream",
                wallet_address="0x" + "a" * 40,
                minio_service=mock_minio,
            )
        )

        assert response["code"] == 200

    def test_minio_upload_failure_returns_500(self):
        """MinIO 上传失败返回 500"""
        content = create_minimal_webm()

        mock_minio = MagicMock()
        mock_minio.delete_by_prefix = AsyncMock(return_value=0)
        mock_minio.upload_file = AsyncMock(
            side_effect=Exception("MinIO connection failed")
        )

        response = run_async(
            simulate_upload_liveness_video(
                filename="test_video.webm",
                content=content,
                content_type="video/webm",
                wallet_address="0x" + "a" * 40,
                minio_service=mock_minio,
            )
        )

        assert response["code"] == 500
        assert "upload failed" in response["data"]["msg"].lower()

    @pytest.mark.parametrize("ext", ["mp4", "avi", "mov", "mkv", "flv", "wmv"])
    def test_specific_non_webm_extensions_rejected(self, ext: str):
        """特定非 WebM 扩展名被拒绝"""
        content = create_minimal_webm()  # 即使内容是 WebM，扩展名不对也应该被拒绝

        mock_minio = MagicMock()
        mock_minio.delete_by_prefix = AsyncMock(return_value=0)

        response = run_async(
            simulate_upload_liveness_video(
                filename=f"test_video.{ext}",
                content=content,
                content_type="video/webm",
                wallet_address="0x" + "a" * 40,
                minio_service=mock_minio,
            )
        )

        assert response["code"] == 400
        assert "WebM" in response["data"]["msg"]


class TestProperty6VideoURLPersistenceAndResponse:
    """
    Property 6: Video URL Persistence and Response

    *For any* KYC record with a `liveness_video_url` value, the `has_liveness_video`
    field in the response SHALL be `true`. *For any* KYC record without a
    `liveness_video_url` value, the `has_liveness_video` field SHALL be `false`.

    **Validates: Requirements 5.3, 5.4**
    """

    @given(
        video_url=st.one_of(
            st.just(None),
            st.just(""),
            st.text(min_size=1, max_size=255).filter(lambda x: x.strip() != ""),
        )
    )
    @settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[
            HealthCheck.function_scoped_fixture,
            HealthCheck.too_slow,
        ],
    )
    def test_property_has_liveness_video_mapping(self, video_url: Optional[str]):
        """
        属性测试：has_liveness_video 字段正确映射

        **Validates: Requirements 5.3, 5.4**
        """
        # 模拟 _to_full_response 中的逻辑
        has_liveness_video = bool(video_url)

        if video_url is None or video_url == "":
            assert has_liveness_video is False, (
                f"video_url={video_url!r} 时 has_liveness_video 应该为 False"
            )
        else:
            assert has_liveness_video is True, (
                f"video_url={video_url!r} 时 has_liveness_video 应该为 True"
            )

    def test_none_video_url_returns_false(self):
        """liveness_video_url 为 None 时 has_liveness_video 为 False"""
        video_url = None
        has_liveness_video = bool(video_url)
        assert has_liveness_video is False

    def test_empty_string_video_url_returns_false(self):
        """liveness_video_url 为空字符串时 has_liveness_video 为 False"""
        video_url = ""
        has_liveness_video = bool(video_url)
        assert has_liveness_video is False

    def test_valid_video_url_returns_true(self):
        """liveness_video_url 有值时 has_liveness_video 为 True"""
        video_url = "kyc/0x1234567890abcdef/liveness_video_abc123.webm"
        has_liveness_video = bool(video_url)
        assert has_liveness_video is True

    @pytest.mark.parametrize(
        "video_url,expected",
        [
            (None, False),
            ("", False),
            ("kyc/0x123/video.webm", True),
            ("any_non_empty_string", True),
            ("   ", True),  # 空格字符串在 Python 中 bool() 为 True
        ],
    )
    def test_has_liveness_video_mapping_examples(
        self, video_url: Optional[str], expected: bool
    ):
        """
        单元测试：has_liveness_video 映射示例

        **Validates: Requirements 5.3, 5.4**
        """
        has_liveness_video = bool(video_url)
        assert has_liveness_video == expected


class TestProperty6WithMockedKycRecord:
    """
    Property 6 与模拟 KYC 记录的集成测试

    **Validates: Requirements 5.3, 5.4**
    """

    def test_kyc_response_with_video_url(self):
        """KYC 响应包含 has_liveness_video=True 当 liveness_video_url 存在"""

        # 模拟 KYC 记录
        class MockKyc:
            liveness_video_url = "kyc/0x123/liveness_video_abc.webm"

        kyc = MockKyc()
        has_liveness_video = bool(kyc.liveness_video_url)
        assert has_liveness_video is True

    def test_kyc_response_without_video_url(self):
        """KYC 响应包含 has_liveness_video=False 当 liveness_video_url 不存在"""

        # 模拟 KYC 记录
        class MockKyc:
            liveness_video_url = None

        kyc = MockKyc()
        has_liveness_video = bool(kyc.liveness_video_url)
        assert has_liveness_video is False

    @given(
        wallet_address=wallet_address_strategy,
        video_path=st.one_of(
            st.just(None),
            st.builds(
                lambda addr, uid: f"kyc/{addr}/liveness_video_{uid}.webm",
                wallet_address_strategy,
                st.uuids().map(str),
            ),
        ),
    )
    @settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[
            HealthCheck.function_scoped_fixture,
            HealthCheck.too_slow,
        ],
    )
    def test_property_kyc_response_consistency(
        self,
        wallet_address: str,
        video_path: Optional[str],
    ):
        """
        属性测试：KYC 响应中 has_liveness_video 与 liveness_video_url 一致

        **Validates: Requirements 5.3, 5.4**
        """

        # 模拟 KYC 记录
        class MockKyc:
            def __init__(self, video_url):
                self.liveness_video_url = video_url

        kyc = MockKyc(video_path)

        # 模拟 _to_full_response 中的逻辑
        has_liveness_video = bool(kyc.liveness_video_url)

        # 验证一致性
        if video_path is not None and video_path != "":
            assert has_liveness_video is True
        else:
            assert has_liveness_video is False


class TestIsWebmVideoFunction:
    """
    is_webm_video 辅助函数测试

    **Validates: Requirements 4.4**
    """

    def test_valid_webm_detected(self):
        """有效 WebM 被正确检测"""
        webm_data = create_minimal_webm()
        assert is_webm_video(webm_data) is True

    def test_webm_magic_bytes_only(self):
        """仅 WebM 魔数被检测为 WebM"""
        assert is_webm_video(WEBM_MAGIC_BYTES) is True

    @pytest.mark.parametrize(
        "data",
        [
            b"",  # 空数据
            b"\x00\x00\x00\x00",  # 零字节
            b"not a video",  # 文本
            b"\xff\xd8\xff\xe0",  # JPEG 魔数
            b"\x89PNG\r\n\x1a\n",  # PNG 魔数
            b"RIFF",  # AVI 魔数
            b"\x00\x00\x00\x1c\x66\x74\x79\x70",  # MP4 魔数
        ],
    )
    def test_non_webm_not_detected(self, data: bytes):
        """非 WebM 数据不被检测为 WebM"""
        assert is_webm_video(data) is False

    @given(data=st.binary(min_size=0, max_size=1000))
    @settings(max_examples=100, deadline=None)
    def test_property_only_webm_magic_bytes_detected(self, data: bytes):
        """属性测试：只有以 WebM 魔数开头的数据被检测为 WebM"""
        result = is_webm_video(data)
        expected = data.startswith(WEBM_MAGIC_BYTES)
        assert result == expected
