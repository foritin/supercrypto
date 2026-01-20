"""
媒体管理服务
============

提供资产媒体文件的上传、删除、排序等功能。

Usage:
    from src.services.asset.media_service import MediaService

    service = MediaService()
    media = await service.upload_media(asset_id, file, category)
"""

from typing import Optional

from falib.utils.log import get_logger
from fastapi import UploadFile

from src.models import Asset, AssetMedia
from src.shared.common.storage import (
    FileSizeExceeded,
    InvalidFileType,
    get_storage_service,
)
from src.shared.schemas.enums import MediaType

logger = get_logger("asset.media")


class MediaServiceError(Exception):
    """媒体服务异常"""

    pass


class MediaService:
    """媒体管理服务"""

    def __init__(self):
        self.storage = get_storage_service()

    async def upload_media(
        self,
        asset_id: int,
        file: UploadFile,
        media_type: MediaType,
        title: Optional[str] = None,
        description: Optional[str] = None,
    ) -> AssetMedia:
        """
        上传媒体文件

        Args:
            asset_id: 资产 ID
            file: 上传的文件
            media_type: 媒体类型
            title: 标题
            description: 描述

        Returns:
            创建的 AssetMedia 实例

        Raises:
            MediaServiceError: 上传失败
            FileSizeExceeded: 文件大小超出限制
            InvalidFileType: 不支持的文件类型
        """
        # 检查资产是否存在
        asset = await Asset.filter(id=asset_id).first()
        if not asset:
            raise MediaServiceError(f"资产 {asset_id} 不存在")

        # 上传文件到存储
        try:
            url = await self.storage.upload_file(
                file=file,
                asset_id=asset_id,
                category=media_type.value,
                filename=file.filename,
            )
        except (FileSizeExceeded, InvalidFileType):
            raise
        except Exception as e:
            logger.error(f"文件上传失败: {e}")
            raise MediaServiceError(f"文件上传失败: {e}")

        # 获取当前最大排序号
        max_order = (
            await AssetMedia.filter(asset_id=asset_id, media_type=media_type)
            .order_by("-sort_order")
            .first()
        )
        next_order = (max_order.sort_order + 1) if max_order else 0

        # 如果是封面图且是第一张，自动设为主图
        is_primary = False
        if media_type == MediaType.COVER:
            existing = await AssetMedia.filter(
                asset_id=asset_id, media_type=MediaType.COVER
            ).count()
            is_primary = existing == 0

        # 创建媒体记录
        media = await AssetMedia.create(
            asset_id=asset_id,
            media_type=media_type,
            title=title or file.filename,
            description=description,
            url=url,
            file_name=file.filename,
            file_size=file.size,
            mime_type=file.content_type,
            sort_order=next_order,
            is_primary=is_primary,
        )

        logger.info(
            f"媒体上传成功: asset_id={asset_id}, media_id={media.id}, type={media_type.value}"
        )
        return media

    async def delete_media(self, asset_id: int, media_id: int) -> bool:
        """
        删除媒体文件

        Args:
            asset_id: 资产 ID
            media_id: 媒体 ID

        Returns:
            是否删除成功
        """
        media = await AssetMedia.filter(id=media_id, asset_id=asset_id).first()
        if not media:
            raise MediaServiceError(f"媒体 {media_id} 不存在或不属于资产 {asset_id}")

        # 从存储删除文件
        try:
            await self.storage.delete_file(media.url)
        except Exception as e:
            logger.warning(f"删除存储文件失败（继续删除数据库记录）: {e}")

        # 删除数据库记录
        await media.delete()

        logger.info(f"媒体删除成功: asset_id={asset_id}, media_id={media_id}")
        return True

    async def update_media(
        self,
        asset_id: int,
        media_id: int,
        title: Optional[str] = None,
        description: Optional[str] = None,
        is_primary: Optional[bool] = None,
    ) -> AssetMedia:
        """
        更新媒体信息

        Args:
            asset_id: 资产 ID
            media_id: 媒体 ID
            title: 新标题
            description: 新描述
            is_primary: 是否设为主图

        Returns:
            更新后的 AssetMedia 实例
        """
        media = await AssetMedia.filter(id=media_id, asset_id=asset_id).first()
        if not media:
            raise MediaServiceError(f"媒体 {media_id} 不存在或不属于资产 {asset_id}")

        # 更新字段
        if title is not None:
            media.title = title
        if description is not None:
            media.description = description

        # 处理主图设置
        if is_primary is not None and is_primary:
            # 取消同类型其他主图
            await (
                AssetMedia.filter(
                    asset_id=asset_id,
                    media_type=media.media_type,
                    is_primary=True,
                )
                .exclude(id=media_id)
                .update(is_primary=False)
            )
            media.is_primary = True
        elif is_primary is False:
            media.is_primary = False

        await media.save()

        logger.info(f"媒体更新成功: asset_id={asset_id}, media_id={media_id}")
        return media

    async def reorder_media(
        self,
        asset_id: int,
        media_ids: list[int],
    ) -> list[AssetMedia]:
        """
        批量排序媒体

        Args:
            asset_id: 资产 ID
            media_ids: 按新顺序排列的媒体 ID 列表

        Returns:
            排序后的媒体列表
        """
        # 验证所有媒体都属于该资产
        existing = await AssetMedia.filter(
            asset_id=asset_id, id__in=media_ids
        ).values_list("id", flat=True)

        if len(existing) != len(media_ids):
            raise MediaServiceError("部分媒体不存在或不属于该资产")

        # 批量更新排序
        for order, media_id in enumerate(media_ids):
            await AssetMedia.filter(id=media_id).update(sort_order=order)

        # 返回排序后的列表
        return (
            await AssetMedia.filter(asset_id=asset_id, id__in=media_ids)
            .order_by("sort_order")
            .all()
        )

    async def list_media(
        self,
        asset_id: int,
        media_type: Optional[MediaType] = None,
    ) -> list[AssetMedia]:
        """
        获取资产的媒体列表

        Args:
            asset_id: 资产 ID
            media_type: 可选，按类型筛选

        Returns:
            媒体列表
        """
        query = AssetMedia.filter(asset_id=asset_id)

        if media_type:
            query = query.filter(media_type=media_type)

        return await query.order_by("media_type", "sort_order").all()

    async def get_media_stats(self, asset_id: int) -> dict:
        """
        获取资产的媒体统计

        Args:
            asset_id: 资产 ID

        Returns:
            各类型媒体数量统计
        """
        from tortoise.functions import Count

        stats = (
            await AssetMedia.filter(asset_id=asset_id)
            .group_by("media_type")
            .annotate(count=Count("id"))
            .values("media_type", "count")
        )

        # 转换为字典
        return {s["media_type"]: s["count"] for s in stats}


# 全局服务实例
_media_service: Optional[MediaService] = None


def get_media_service() -> MediaService:
    """获取媒体服务实例"""
    global _media_service
    if _media_service is None:
        _media_service = MediaService()
    return _media_service


__all__ = [
    "MediaService",
    "MediaServiceError",
    "get_media_service",
]
