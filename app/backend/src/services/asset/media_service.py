"""
媒体管理服务
============

提供资产媒体文件的上传、删除、排序等功能。

用法:
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

logger = get_logger("business.asset.media")


class MediaServiceError(Exception):
    """媒体服务异常"""

    pass


class MediaService:
    """媒体管理服务"""

    def __init__(self):
        self.storage = get_storage_service()

    async def get_presigned_url(self, file_path: str, expires: int = 3600) -> str:
        """
        获取文件的预签名临时访问 URL
        
        参数:
            file_path: 文件相对路径
            expires: 过期时间（秒），默认 1 小时
            
        返回:
            预签名的临时访问 URL
        """
        return await self.storage.get_presigned_url(file_path, expires)

    async def get_presigned_urls_batch(
        self, file_paths: list[str], expires: int = 3600
    ) -> dict[str, str]:
        """
        批量获取文件的预签名临时访问 URL（复用连接）
        
        参数:
            file_paths: 文件相对路径列表
            expires: 过期时间（秒），默认 1 小时
            
        返回:
            {原始路径: 预签名URL} 的字典
        """
        return await self.storage.get_presigned_urls_batch(file_paths, expires)

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

        参数:
            asset_id: 资产 ID
            file: 上传的文件
            media_type: 媒体类型
            title: 标题
            description: 描述

        返回:
            创建的 AssetMedia 实例

        异常:
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

    async def upload_media_batch(
        self,
        asset_id: int,
        files: list[UploadFile],
        media_type: MediaType,
    ) -> list[tuple[bool, AssetMedia | None, str | None]]:
        """
        批量上传媒体文件（复用连接）

        参数:
            asset_id: 资产 ID
            files: 上传的文件列表
            media_type: 媒体类型

        返回:
            列表，每个元素为 (success, media, error_msg)
        """
        if not files:
            return []

        # 检查资产是否存在
        asset = await Asset.filter(id=asset_id).first()
        if not asset:
            raise MediaServiceError(f"资产 {asset_id} 不存在")

        # 获取当前最大排序号
        max_order_record = (
            await AssetMedia.filter(asset_id=asset_id, media_type=media_type)
            .order_by("-sort_order")
            .first()
        )
        next_order = (max_order_record.sort_order + 1) if max_order_record else 0

        # 检查是否需要设置主图（仅封面图）
        existing_cover_count = 0
        if media_type == MediaType.COVER:
            existing_cover_count = await AssetMedia.filter(
                asset_id=asset_id, media_type=MediaType.COVER
            ).count()

        results: list[tuple[bool, AssetMedia | None, str | None]] = []

        # 预处理文件：验证并读取内容
        prepared_files: list[tuple[UploadFile, bytes, int]] = []
        for file in files:
            try:
                # 验证文件
                file_size, _ = self.storage.validate_file(
                    file, media_type.value, file.content_type
                )
                # 读取内容
                content = await file.read()
                prepared_files.append((file, content, file_size))
            except (FileSizeExceeded, InvalidFileType) as e:
                results.append((False, None, str(e)))

        if not prepared_files:
            return results

        # 使用单个连接上传所有文件
        from src.shared.common.adapters import get_async_minio_adapter

        async with get_async_minio_adapter() as minio:
            for file, content, file_size in prepared_files:
                try:
                    # 生成文件路径
                    file_path = self.storage.generate_file_path(
                        asset_id, media_type.value, file.filename
                    )

                    # 上传到 MinIO
                    await minio.put_object(self.storage.bucket, file_path, content)
                    url = self.storage.get_file_url(file_path)

                    logger.info(f"File uploaded to MinIO: {file_path} ({file_size} bytes)")

                    # 确定是否为主图
                    is_primary = False
                    if media_type == MediaType.COVER and existing_cover_count == 0:
                        is_primary = True
                        existing_cover_count += 1

                    # 创建媒体记录
                    media = await AssetMedia.create(
                        asset_id=asset_id,
                        media_type=media_type,
                        title=file.filename,
                        url=url,
                        file_name=file.filename,
                        file_size=file.size,
                        mime_type=file.content_type,
                        sort_order=next_order,
                        is_primary=is_primary,
                    )
                    next_order += 1

                    logger.info(
                        f"媒体上传成功: asset_id={asset_id}, media_id={media.id}, type={media_type.value}"
                    )
                    results.append((True, media, None))

                except Exception as e:
                    logger.error(f"文件上传失败: {e}")
                    results.append((False, None, str(e)))

        return results

    async def delete_media_batch(
        self, asset_id: int, media_ids: list[int]
    ) -> list[tuple[int, bool, str | None]]:
        """
        批量删除媒体文件（复用连接）

        参数:
            asset_id: 资产 ID
            media_ids: 媒体 ID 列表

        返回:
            列表，每个元素为 (media_id, success, error_msg)
        """
        if not media_ids:
            return []

        # 查询所有媒体记录
        media_list = await AssetMedia.filter(
            id__in=media_ids, asset_id=asset_id
        ).all()
        media_map = {m.id: m for m in media_list}

        results: list[tuple[int, bool, str | None]] = []

        # 收集需要删除的文件路径
        files_to_delete: list[tuple[int, str, AssetMedia]] = []
        for media_id in media_ids:
            if media_id not in media_map:
                results.append(
                    (media_id, False, f"媒体 {media_id} 不存在或不属于资产 {asset_id}")
                )
            else:
                media = media_map[media_id]
                if media.url:
                    files_to_delete.append((media_id, media.url, media))
                else:
                    # 没有 URL 的直接删除数据库记录
                    await media.delete()
                    results.append((media_id, True, None))
                    logger.info(f"媒体删除成功: asset_id={asset_id}, media_id={media_id}")

        if not files_to_delete:
            return results

        # 使用单个连接删除所有文件
        from src.shared.common.adapters import get_async_minio_adapter

        async with get_async_minio_adapter() as minio:
            for media_id, file_path, media in files_to_delete:
                try:
                    # 移除开头的斜杠
                    object_path = file_path[1:] if file_path.startswith("/") else file_path
                    await minio.remove_object(self.storage.bucket, object_path)
                    logger.info(f"File deleted from MinIO: {object_path}")

                    # 删除数据库记录
                    await media.delete()
                    results.append((media_id, True, None))
                    logger.info(f"媒体删除成功: asset_id={asset_id}, media_id={media_id}")

                except Exception as e:
                    logger.warning(f"删除存储文件失败: {e}，继续删除数据库记录")
                    # 即使存储删除失败，也删除数据库记录
                    await media.delete()
                    results.append((media_id, True, None))

        return results

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

        参数:
            asset_id: 资产 ID
            media_id: 媒体 ID
            title: 新标题
            description: 新描述
            is_primary: 是否设为主图

        返回:
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

        参数:
            asset_id: 资产 ID
            media_ids: 按新顺序排列的媒体 ID 列表

        返回:
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

        参数:
            asset_id: 资产 ID
            media_type: 可选，按类型筛选

        返回:
            媒体列表
        """
        query = AssetMedia.filter(asset_id=asset_id)

        if media_type:
            query = query.filter(media_type=media_type)

        return await query.order_by("media_type", "sort_order").all()

    async def get_media_stats(self, asset_id: int) -> dict:
        """
        获取资产的媒体统计

        参数:
            asset_id: 资产 ID

        返回:
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
