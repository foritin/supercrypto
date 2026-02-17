"""
Logo 上传单元测试

覆盖范围:
- MediaType.LOGO 枚举存在性验证
- IMAGE_CATEGORIES 包含 "logo"
- Logo 数量限制（每个资产最多 1 张）

_Requirements: 2.3, 2.4_
"""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.common.exceptions import MediaServiceError
from src.schemas.enums import MediaType
from src.services.asset_service import AssetService
from src.services.storage_service import IMAGE_CATEGORIES

# 抑制 DeprecationWarning
pytestmark = pytest.mark.filterwarnings("ignore::DeprecationWarning")


def run_async(coro):
    """在同步上下文中运行异步协程"""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


# ============================================================
# 测试类: MediaType 枚举
# ============================================================


class TestMediaTypeLogoEnum:
    """MediaType.LOGO 枚举验证"""

    def test_logo_enum_exists(self):
        """MediaType 枚举应包含 LOGO 成员"""
        assert hasattr(MediaType, "LOGO")

    def test_logo_enum_value(self):
        """MediaType.LOGO 的值应为 'logo'"""
        assert MediaType.LOGO.value == "logo"

    def test_logo_is_valid_media_type(self):
        """'logo' 应能通过 MediaType() 构造"""
        assert MediaType("logo") == MediaType.LOGO


# ============================================================
# 测试类: IMAGE_CATEGORIES
# ============================================================


class TestImageCategories:
    """IMAGE_CATEGORIES 列表验证"""

    def test_logo_in_image_categories(self):
        """IMAGE_CATEGORIES 应包含 'logo'"""
        assert "logo" in IMAGE_CATEGORIES


# ============================================================
# 测试类: Logo 数量限制
# ============================================================


class TestLogoCountLimit:
    """Logo 上传数量限制测试"""

    def test_upload_logo_rejected_when_already_exists(self):
        """当资产已有 1 张 Logo 时，应拒绝再次上传"""

        async def _test():
            service = AssetService()

            # Mock storage 服务
            service.storage = MagicMock()

            # Mock 文件
            mock_file = MagicMock()
            mock_file.filename = "logo.png"
            mock_file.size = 1024
            mock_file.content_type = "image/png"

            # Mock Asset.filter(...).first() 返回一个存在的资产
            mock_asset = MagicMock()
            mock_asset.id = 1

            # Mock AssetMedia.filter(...).count() 返回 1（已有 Logo）
            with (
                patch("src.services.asset_service.Asset") as MockAsset,
                patch("src.services.asset_service.AssetMedia") as MockAssetMedia,
            ):
                # 资产存在
                MockAsset.filter.return_value.first = AsyncMock(return_value=mock_asset)

                # 已有 1 张 Logo
                MockAssetMedia.filter.return_value.count = AsyncMock(return_value=1)

                with pytest.raises(MediaServiceError) as exc_info:
                    await service.upload_media(
                        asset_id=1,
                        file=mock_file,
                        media_type=MediaType.LOGO,
                    )

                assert "最多只能上传 1 张 Logo" in str(exc_info.value)

        run_async(_test())

    def test_upload_logo_allowed_when_none_exists(self):
        """当资产没有 Logo 时，应允许上传"""

        async def _test():
            service = AssetService()

            # Mock storage 服务
            service.storage = MagicMock()
            service.storage.upload_file = AsyncMock(
                return_value="/assets/1/logo/test.png"
            )

            # Mock 文件
            mock_file = MagicMock()
            mock_file.filename = "logo.png"
            mock_file.size = 1024
            mock_file.content_type = "image/png"

            # Mock 创建的媒体记录
            mock_media = MagicMock()
            mock_media.id = 10
            mock_media.asset_id = 1
            mock_media.media_type = MediaType.LOGO

            with (
                patch("src.services.asset_service.Asset") as MockAsset,
                patch("src.services.asset_service.AssetMedia") as MockAssetMedia,
            ):
                # 资产存在
                mock_asset = MagicMock()
                mock_asset.id = 1
                MockAsset.filter.return_value.first = AsyncMock(return_value=mock_asset)

                # 没有已有 Logo
                MockAssetMedia.filter.return_value.count = AsyncMock(return_value=0)

                # Mock 排序查询
                MockAssetMedia.filter.return_value.order_by.return_value.first = (
                    AsyncMock(return_value=None)
                )

                # Mock create
                MockAssetMedia.create = AsyncMock(return_value=mock_media)

                result = await service.upload_media(
                    asset_id=1,
                    file=mock_file,
                    media_type=MediaType.LOGO,
                )

                assert result == mock_media

        run_async(_test())
