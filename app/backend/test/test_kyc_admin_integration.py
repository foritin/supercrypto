"""
KYC Admin 集成测试

测试完整的 KYC 详情获取流程，验证 face_image 和 liveness_video 预签名 URL 正确返回。

测试框架: pytest

**Validates: Requirements 1.1, 1.2, 7.3**
"""

import asyncio
from typing import Optional
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.models.kyc import AccountKyc
from src.services.admin.kyc_service import AdminKycService
from src.shared.schemas.enums import KycStatus, NetWork

# ============ Helper Functions ============


def run_async(coro):
    """运行异步函数的辅助函数"""
    return asyncio.get_event_loop().run_until_complete(coro)


# ============ Fixtures ============


@pytest.fixture
def mock_kyc_record():
    """创建模拟的 KYC 记录"""

    def _create_kyc(
        kyc_id: int = 1,
        address: str = "0x" + "a" * 40,
        face_image_url: Optional[str] = None,
        liveness_video_url: Optional[str] = None,
        selfie_url: Optional[str] = None,
    ) -> MagicMock:
        kyc = MagicMock(spec=AccountKyc)
        kyc.id = kyc_id
        kyc.address = address
        kyc.network = NetWork.HARDHAT
        kyc.status = KycStatus.PENDING
        kyc.face_image_url = face_image_url
        kyc.liveness_video_url = liveness_video_url
        kyc.selfie_url = selfie_url
        kyc.submitted_at = None
        kyc.reviewed_at = None
        kyc.reviewer_address = None
        kyc.reject_reason = None
        kyc.country_code = "CN"
        kyc.is_accredited = False
        kyc.full_name = "Test User"
        kyc.date_of_birth = None
        kyc.risk_level = MagicMock(value="low")
        kyc.risk_score = 0
        kyc.priority = MagicMock(value="normal")
        kyc.is_pep = False
        kyc.is_sanctioned = False
        kyc.on_chain_sync_status = MagicMock(value="pending")
        kyc.on_chain_tx_hash = None
        kyc.on_chain_error = None
        kyc.created_at = None
        kyc.updated_at = None

        # Mock documents 关系
        kyc.documents = AsyncMock()
        kyc.documents.all = AsyncMock(return_value=[])

        return kyc

    return _create_kyc


@pytest.fixture
def mock_minio_service():
    """创建模拟的 MinIO 服务"""
    minio = AsyncMock()

    async def get_presigned_url(path: str) -> str:
        return f"https://minio.example.com/presigned/{path}?token=abc123"

    minio.get_presigned_url = AsyncMock(side_effect=get_presigned_url)
    return minio


# ============ Integration Tests ============


class TestKycDetailIntegration:
    """
    KYC 详情获取集成测试

    **Validates: Requirements 1.1, 1.2, 7.3**
    """

    def test_get_document_presigned_urls_with_face_image(
        self, mock_kyc_record, mock_minio_service
    ):
        """
        **Validates: Requirements 1.1**

        测试当 face_image_url 存在时，返回预签名 URL
        """
        # Arrange
        face_image_path = "kyc/0xaaa/face_image_123.jpg"
        kyc = mock_kyc_record(face_image_url=face_image_path)

        service = AdminKycService()
        service.minio_service = mock_minio_service

        # Act
        documents = run_async(service._get_document_presigned_urls(kyc))

        # Assert
        assert documents["face_image"] is not None
        assert "presigned" in documents["face_image"]
        assert face_image_path in documents["face_image"]
        mock_minio_service.get_presigned_url.assert_any_call(face_image_path)

    def test_get_document_presigned_urls_with_liveness_video(
        self, mock_kyc_record, mock_minio_service
    ):
        """
        **Validates: Requirements 1.2**

        测试当 liveness_video_url 存在时，返回预签名 URL
        """
        # Arrange
        liveness_video_path = "kyc/0xaaa/liveness_video_123.webm"
        kyc = mock_kyc_record(liveness_video_url=liveness_video_path)

        service = AdminKycService()
        service.minio_service = mock_minio_service

        # Act
        documents = run_async(service._get_document_presigned_urls(kyc))

        # Assert
        assert documents["liveness_video"] is not None
        assert "presigned" in documents["liveness_video"]
        assert liveness_video_path in documents["liveness_video"]
        mock_minio_service.get_presigned_url.assert_any_call(liveness_video_path)

    def test_get_document_presigned_urls_with_all_media(
        self, mock_kyc_record, mock_minio_service
    ):
        """
        **Validates: Requirements 1.1, 1.2, 7.3**

        测试当所有媒体字段都存在时，返回完整的预签名 URL
        """
        # Arrange
        face_image_path = "kyc/0xaaa/face_image_123.jpg"
        liveness_video_path = "kyc/0xaaa/liveness_video_123.webm"
        selfie_path = "kyc/0xaaa/selfie_123.jpg"

        kyc = mock_kyc_record(
            face_image_url=face_image_path,
            liveness_video_url=liveness_video_path,
            selfie_url=selfie_path,
        )

        service = AdminKycService()
        service.minio_service = mock_minio_service

        # Act
        documents = run_async(service._get_document_presigned_urls(kyc))

        # Assert
        assert documents["face_image"] is not None
        assert documents["liveness_video"] is not None
        assert documents["selfie"] is not None

        # 验证所有必需的键都存在
        required_keys = [
            "id_front",
            "id_back",
            "selfie",
            "face_image",
            "liveness_video",
        ]
        for key in required_keys:
            assert key in documents

    def test_get_document_presigned_urls_with_null_values(
        self, mock_kyc_record, mock_minio_service
    ):
        """
        **Validates: Requirements 1.3**

        测试当 face_image_url 和 liveness_video_url 为 null 时，返回 null
        """
        # Arrange
        kyc = mock_kyc_record(
            face_image_url=None,
            liveness_video_url=None,
            selfie_url=None,
        )

        service = AdminKycService()
        service.minio_service = mock_minio_service

        # Act
        documents = run_async(service._get_document_presigned_urls(kyc))

        # Assert
        assert documents["face_image"] is None
        assert documents["liveness_video"] is None
        assert documents["selfie"] is None

    def test_get_document_presigned_urls_partial_media(
        self, mock_kyc_record, mock_minio_service
    ):
        """
        **Validates: Requirements 1.1, 1.2, 1.3**

        测试部分媒体字段存在时的行为
        """
        # Arrange - 只有 face_image，没有 liveness_video
        face_image_path = "kyc/0xaaa/face_image_123.jpg"
        kyc = mock_kyc_record(
            face_image_url=face_image_path,
            liveness_video_url=None,
        )

        service = AdminKycService()
        service.minio_service = mock_minio_service

        # Act
        documents = run_async(service._get_document_presigned_urls(kyc))

        # Assert
        assert documents["face_image"] is not None
        assert documents["liveness_video"] is None

    def test_get_document_presigned_urls_minio_error_face_image(self, mock_kyc_record):
        """
        **Validates: Requirements 1.3, 1.4**

        测试当 MinIO 服务获取 face_image 预签名 URL 失败时，返回 null
        """
        # Arrange
        face_image_path = "kyc/0xaaa/face_image_123.jpg"
        kyc = mock_kyc_record(face_image_url=face_image_path)

        # 创建会抛出异常的 MinIO 服务
        mock_minio = AsyncMock()
        mock_minio.get_presigned_url = AsyncMock(
            side_effect=Exception("MinIO connection failed")
        )

        service = AdminKycService()
        service.minio_service = mock_minio

        # Act
        documents = run_async(service._get_document_presigned_urls(kyc))

        # Assert - 应该返回 null 而不是抛出异常
        assert documents["face_image"] is None

    def test_get_document_presigned_urls_minio_error_liveness_video(
        self, mock_kyc_record
    ):
        """
        **Validates: Requirements 1.3, 1.4**

        测试当 MinIO 服务获取 liveness_video 预签名 URL 失败时，返回 null
        """
        # Arrange
        liveness_video_path = "kyc/0xaaa/liveness_video_123.webm"
        kyc = mock_kyc_record(liveness_video_url=liveness_video_path)

        # 创建会抛出异常的 MinIO 服务
        mock_minio = AsyncMock()
        mock_minio.get_presigned_url = AsyncMock(
            side_effect=Exception("MinIO connection failed")
        )

        service = AdminKycService()
        service.minio_service = mock_minio

        # Act
        documents = run_async(service._get_document_presigned_urls(kyc))

        # Assert - 应该返回 null 而不是抛出异常
        assert documents["liveness_video"] is None

    def test_get_document_presigned_urls_independent_error_handling(
        self, mock_kyc_record
    ):
        """
        **Validates: Requirements 1.3, 1.4**

        测试 face_image 和 liveness_video 的错误处理是独立的
        """
        # Arrange
        face_image_path = "kyc/0xaaa/face_image_123.jpg"
        liveness_video_path = "kyc/0xaaa/liveness_video_123.webm"
        kyc = mock_kyc_record(
            face_image_url=face_image_path,
            liveness_video_url=liveness_video_path,
        )

        # 创建只对 face_image 失败的 MinIO 服务
        async def selective_failure(path: str) -> str:
            if "face_image" in path:
                raise Exception("Face image fetch failed")
            return f"https://minio.example.com/presigned/{path}"

        mock_minio = AsyncMock()
        mock_minio.get_presigned_url = AsyncMock(side_effect=selective_failure)

        service = AdminKycService()
        service.minio_service = mock_minio

        # Act
        documents = run_async(service._get_document_presigned_urls(kyc))

        # Assert - face_image 失败不应影响 liveness_video
        assert documents["face_image"] is None
        assert documents["liveness_video"] is not None


class TestKycDetailResponseStructure:
    """
    KYC 详情响应结构测试

    **Validates: Requirements 7.3**
    """

    def test_documents_dict_structure(self, mock_kyc_record, mock_minio_service):
        """
        **Validates: Requirements 7.3**

        测试 documents 字典包含所有必需的键
        """
        # Arrange
        kyc = mock_kyc_record()

        service = AdminKycService()
        service.minio_service = mock_minio_service

        # Act
        documents = run_async(service._get_document_presigned_urls(kyc))

        # Assert
        expected_keys = {
            "id_front",
            "id_back",
            "selfie",
            "face_image",
            "liveness_video",
        }
        assert set(documents.keys()) == expected_keys

    def test_presigned_url_format(self, mock_kyc_record, mock_minio_service):
        """
        **Validates: Requirements 1.4**

        测试预签名 URL 格式正确
        """
        # Arrange
        face_image_path = "kyc/0xaaa/face_image_123.jpg"
        kyc = mock_kyc_record(face_image_url=face_image_path)

        service = AdminKycService()
        service.minio_service = mock_minio_service

        # Act
        documents = run_async(service._get_document_presigned_urls(kyc))

        # Assert
        url = documents["face_image"]
        assert url is not None
        assert url.startswith("https://")
        assert "presigned" in url
