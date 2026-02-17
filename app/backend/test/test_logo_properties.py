"""
Logo 文件验证属性测试

**Feature: asset-logo-upload, Property 1: Logo 文件验证规则**

**Validates: Requirements 2.1, 2.2**

验证:
- 对于 category="logo"，当且仅当文件大小 ≤ 2MB 且 MIME 类型属于
  ["image/png", "image/jpeg", "image/svg+xml", "image/webp"] 时通过验证；
  否则抛出 FileSizeExceeded 或 InvalidFileType 异常。
"""

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from src.common.exceptions import FileSizeExceeded, InvalidFileType
from src.services.storage_service import (
    LOGO_ALLOWED_TYPES,
    LOGO_MAX_SIZE,
    StorageService,
)

# ============================================================
# 辅助常量与策略
# ============================================================

VALID_MIME_TYPES = LOGO_ALLOWED_TYPES

INVALID_MIME_TYPES = [
    "image/gif",
    "image/bmp",
    "image/tiff",
    "application/pdf",
    "text/plain",
    "application/octet-stream",
    "video/mp4",
    "audio/mpeg",
]

# 混合 MIME 类型策略
mime_type_strategy = st.one_of(
    st.sampled_from(VALID_MIME_TYPES),
    st.sampled_from(INVALID_MIME_TYPES),
)

# 文件大小策略：0 到 10MB
file_size_strategy = st.integers(min_value=0, max_value=10 * 1024 * 1024)

# 共享 StorageService 实例（无状态，可安全复用）
_storage = StorageService(
    endpoint="localhost:9000",
    access_key="test",
    secret_key="test",
    bucket="test-bucket",
)


# ============================================================
# Property 1: Logo 文件验证规则
# ============================================================


class TestLogoFileValidationProperty:
    """
    **Feature: asset-logo-upload, Property 1: Logo 文件验证规则**

    **Validates: Requirements 2.1, 2.2**

    For any 文件（具有随机大小和随机 MIME 类型），StorageService 对
    category="logo" 的验证结果 SHALL 为：当且仅当文件大小 ≤ 2MB 且
    MIME 类型属于 ["image/png", "image/jpeg", "image/svg+xml", "image/webp"]
    时通过验证；否则抛出 FileSizeExceeded 或 InvalidFileType 异常。
    """

    @given(size=file_size_strategy, mime_type=mime_type_strategy)
    @settings(max_examples=200)
    def test_logo_validation_property(self, size, mime_type):
        """属性: Logo 验证结果与规则严格一致"""
        file_data = b"\x00" * size

        is_valid_size = size <= LOGO_MAX_SIZE
        is_valid_type = mime_type in VALID_MIME_TYPES

        if is_valid_size and is_valid_type:
            # 应该通过验证
            result_size, result_type = _storage.validate_file(
                file=file_data, category="logo", content_type=mime_type
            )
            assert result_size == size
            assert result_type == mime_type
        elif not is_valid_size:
            # 文件大小超限 → FileSizeExceeded（先检查大小）
            with pytest.raises(FileSizeExceeded) as exc_info:
                _storage.validate_file(
                    file=file_data, category="logo", content_type=mime_type
                )
            assert exc_info.value.max_size == LOGO_MAX_SIZE
            assert exc_info.value.actual_size == size
        else:
            # 大小合法但类型不合法 → InvalidFileType
            with pytest.raises(InvalidFileType) as exc_info:
                _storage.validate_file(
                    file=file_data, category="logo", content_type=mime_type
                )
            assert exc_info.value.mime_type == mime_type
            assert exc_info.value.allowed_types == LOGO_ALLOWED_TYPES
