"""
文件存储服务
============

基于 falib AsyncMinIOAdapter 的文件存储服务，提供统一的 MinIO 对象操作封装。

用法::

    # 通过 services 包导入
    # from src.services import StorageService, storage_service

    # 使用模块级单例
    # url = await storage_service.upload_file(file, asset_id=123, category="cover")

    # 或通过依赖注入
    # from src.common.dependencies import get_storage_service
"""

import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional, Union
from urllib.parse import urlparse, urlunparse

from falib.adapter.minio import AsyncMinIOAdapter
from falib.utils.config import SETTINGS
from falib.utils.log import get_logger
from fastapi import UploadFile

from src.common.exceptions import FileSizeExceeded, InvalidFileType, StorageError

logger = get_logger("business.storage")


# ============ 配置常量 ============

# 默认文件大小限制
DEFAULT_MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB
DEFAULT_MAX_DOCUMENT_SIZE = 10 * 1024 * 1024  # 10MB

# 允许的文件类型
ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
]

ALLOWED_DOCUMENT_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]

# Logo 专用常量
LOGO_MAX_SIZE = 2 * 1024 * 1024  # 2MB
LOGO_ALLOWED_TYPES = [
    "image/png",
    "image/jpeg",
    "image/svg+xml",
    "image/webp",
]

# 图片类别
IMAGE_CATEGORIES = ["cover", "gallery", "floor_plan", "logo"]

# 文档类别
DOCUMENT_CATEGORIES = [
    "valuation",
    "legal",
    "financial",
    "document",
    "evaluation",
    "other",
]


# ============ 存储服务 ============


class StorageService:
    """MinIO 对象存储服务

    基于 falib AsyncMinIOAdapter 的高级封装，提供:
    - 资产文件上传 / 删除 / 预签名 URL
    - KYC 文档等低级别文件操作
    - ABI JSON 读取
    - 批量操作（复用连接减少开销）
    """

    def __init__(
        self,
        endpoint: Optional[str] = None,
        access_key: Optional[str] = None,
        secret_key: Optional[str] = None,
        bucket: Optional[str] = None,
        secure: Optional[bool] = None,
        redirect: Optional[str] = None,
    ):
        """初始化存储服务

        未提供的参数从 SETTINGS.MINIO 读取默认值。
        """
        minio_config = SETTINGS.MINIO
        self.endpoint: str = endpoint or minio_config.ENDPOINT
        self.access_key: str = access_key or minio_config.ACCESS_KEY
        self.secret_key: str = secret_key or minio_config.SECRET_KEY
        self.bucket: str = bucket or minio_config.BUCKET
        self.secure: bool = (
            secure if secure is not None else getattr(minio_config, "SECURE", False)
        )
        self.redirect: Optional[str] = (
            redirect
            if redirect is not None
            else getattr(minio_config, "REDIRECT", None)
        )

        logger.info(f"StorageService initialized: {self.endpoint}/{self.bucket}")

    def _get_adapter(self) -> AsyncMinIOAdapter:
        """获取 AsyncMinIOAdapter（每次创建，通过 async with 管理生命周期）"""
        return AsyncMinIOAdapter(
            endpoint=self.endpoint,
            access_key=self.access_key,
            secret_key=self.secret_key,
            default_bucket_name=self.bucket,
            secure=self.secure,
        )

    # ============ 文件验证 ============

    def validate_file(
        self,
        file: Union[UploadFile, bytes],
        category: str,
        content_type: Optional[str] = None,
    ) -> tuple[int, str]:
        """
        验证文件（大小和类型）

        Args:
            file: 文件对象
            category: 分类
            content_type: MIME 类型

        Returns:
            (文件大小, MIME 类型)

        Raises:
            FileSizeExceeded: 文件大小超出限制
            InvalidFileType: 不支持的文件类型
        """
        # 获取文件大小
        if isinstance(file, bytes):
            file_size = len(file)
        else:
            file.file.seek(0, 2)
            file_size = file.file.tell()
            file.file.seek(0)
            content_type = content_type or file.content_type

        # 确定验证规则
        if category == "logo":
            max_size = LOGO_MAX_SIZE
            allowed_types = LOGO_ALLOWED_TYPES
        elif category in IMAGE_CATEGORIES:
            max_size = DEFAULT_MAX_IMAGE_SIZE
            allowed_types = ALLOWED_IMAGE_TYPES
        else:
            max_size = DEFAULT_MAX_DOCUMENT_SIZE
            allowed_types = ALLOWED_DOCUMENT_TYPES

        if file_size > max_size:
            raise FileSizeExceeded(max_size, file_size)

        if content_type and content_type not in allowed_types:
            raise InvalidFileType(content_type, allowed_types)

        return file_size, content_type or "application/octet-stream"

    # ============ 路径生成 ============

    def generate_file_path(
        self,
        asset_id: int,
        category: str,
        filename: Optional[str] = None,
        extension: Optional[str] = None,
    ) -> str:
        """
        生成文件存储路径

        格式: assets/{asset_id}/{category}/{timestamp}_{uuid}.{ext}
        """
        if not extension and filename:
            extension = Path(filename).suffix.lstrip(".")
        if not extension:
            extension = "bin"

        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        unique_id = uuid.uuid4().hex[:8]
        new_filename = f"{timestamp}_{unique_id}.{extension}"

        return f"assets/{asset_id}/{category}/{new_filename}"

    @staticmethod
    def get_file_url(file_path: str) -> str:
        """获取文件访问路径（相对路径）"""
        if file_path.startswith("/"):
            return file_path
        return f"/{file_path}"

    def _apply_redirect(self, url: str) -> str:
        """应用 redirect 配置，替换 URL 的 host 部分"""
        if not self.redirect or not url:
            return url

        parsed_url = urlparse(url)
        redirect_parsed = urlparse(self.redirect)

        return urlunparse(
            (
                redirect_parsed.scheme or parsed_url.scheme,
                redirect_parsed.netloc,
                parsed_url.path,
                parsed_url.params,
                parsed_url.query,
                parsed_url.fragment,
            )
        )

    @staticmethod
    def _strip_leading_slash(file_path: str) -> str:
        """移除路径开头的斜杠"""
        return file_path[1:] if file_path.startswith("/") else file_path

    # ============ 上传 ============

    async def upload_file(
        self,
        file: Union[UploadFile, bytes],
        asset_id: int,
        category: str,
        filename: Optional[str] = None,
    ) -> str:
        """
        上传文件到 MinIO

        Args:
            file: 文件对象或字节数据
            asset_id: 资产 ID
            category: 分类（cover, gallery, valuation, legal, financial 等）
            filename: 原始文件名（可选）

        Returns:
            文件相对路径
        """
        if filename is None and isinstance(file, UploadFile):
            filename = file.filename

        content_type = None
        if isinstance(file, UploadFile):
            content_type = file.content_type

        file_size, _ = self.validate_file(file, category, content_type)
        file_path = self.generate_file_path(asset_id, category, filename)

        content = file if isinstance(file, bytes) else await file.read()

        async with self._get_adapter() as minio:
            await minio.put_object(self.bucket, file_path, content)

        logger.info(f"File uploaded: {file_path} ({file_size} bytes)")
        return self.get_file_url(file_path)

    async def upload_files_batch(
        self,
        files: list[tuple[Union[UploadFile, bytes], int, str, Optional[str]]],
    ) -> list[str]:
        """
        批量上传文件到 MinIO（复用连接）

        Args:
            files: 文件列表，每个元素为 (file, asset_id, category, filename)

        Returns:
            文件相对路径列表
        """
        if not files:
            return []

        # 预处理：验证 + 读取内容
        prepared = []
        for file, asset_id, category, filename in files:
            if filename is None and isinstance(file, UploadFile):
                filename = file.filename  # noqa: PLW2901
            content_type = file.content_type if isinstance(file, UploadFile) else None
            file_size, _ = self.validate_file(file, category, content_type)
            file_path = self.generate_file_path(asset_id, category, filename)
            content = file if isinstance(file, bytes) else await file.read()
            prepared.append((file_path, content, file_size))

        # 单连接批量上传
        results = []
        async with self._get_adapter() as minio:
            for file_path, content, file_size in prepared:
                await minio.put_object(self.bucket, file_path, content)
                logger.info(f"File uploaded: {file_path} ({file_size} bytes)")
                results.append(self.get_file_url(file_path))

        return results

    async def upload_raw(
        self,
        object_name: str,
        file_data: bytes,
        content_type: str = "application/octet-stream",
    ) -> str:
        """
        上传原始文件到 MinIO（低级别接口）

        不经过资产路径生成和文件验证，直接按指定路径上传。
        适用于 KYC 文档等非资产场景。

        Args:
            object_name: 对象存储路径
            file_data: 文件二进制数据
            content_type: 文件 MIME 类型

        Returns:
            对象存储路径
        """
        async with self._get_adapter() as minio:
            await minio.put_object(self.bucket, object_name, file_data)

        logger.info(f"Raw file uploaded: {object_name} ({len(file_data)} bytes)")
        return object_name

    # ============ 删除 ============

    async def delete_file(self, file_path: str) -> bool:
        """
        删除单个文件

        Args:
            file_path: 文件相对路径

        Returns:
            是否删除成功
        """
        file_path = self._strip_leading_slash(file_path)
        try:
            async with self._get_adapter() as minio:
                await minio.remove_object(self.bucket, file_path)
            logger.info(f"File deleted: {file_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete file: {file_path}, error: {e}")
            return False

    async def delete_by_prefix(self, prefix: str) -> int:
        """
        按前缀删除文件

        Args:
            prefix: 对象名称前缀，如 "kyc/0x123.../id_card_front_"

        Returns:
            删除的文件数量
        """
        import asyncio  # noqa: PLC0415

        from minio.deleteobjects import DeleteObject  # noqa: PLC0415

        try:
            async with self._get_adapter() as minio:
                objects_list = await asyncio.to_thread(
                    lambda: list(
                        minio.client.list_objects(
                            bucket_name=self.bucket,
                            prefix=prefix,
                            recursive=False,
                        )
                    )
                )

                delete_objects = [DeleteObject(obj.object_name) for obj in objects_list]
                if not delete_objects:
                    return 0

                errors = await asyncio.to_thread(
                    lambda: list(
                        minio.client.remove_objects(self.bucket, delete_objects)
                    )
                )
                deleted_count = len(delete_objects) - len(errors)

                for error in errors:
                    logger.warning(f"Failed to delete {error.name}: {error.message}")

                logger.info(f"Deleted {deleted_count} files with prefix '{prefix}'")
                return deleted_count

        except Exception as e:
            logger.error(f"Failed to delete files by prefix '{prefix}': {e}")
            return 0

    # ============ 预签名 URL ============

    async def get_presigned_url(self, file_path: str, expires: int = 3600) -> str:
        """
        获取预签名临时访问 URL

        Args:
            file_path: 文件相对路径
            expires: 过期时间（秒），默认 1 小时

        Returns:
            预签名的临时访问 URL
        """
        file_path = self._strip_leading_slash(file_path)
        async with self._get_adapter() as minio:
            url = await minio.presigned_get_object(self.bucket, file_path, expires)
        return self._apply_redirect(url or "")

    async def get_presigned_urls_batch(
        self, file_paths: list[str], expires: int = 3600
    ) -> dict[str, str]:
        """
        批量获取预签名临时访问 URL（复用连接）

        Args:
            file_paths: 文件相对路径列表
            expires: 过期时间（秒），默认 1 小时

        Returns:
            {原始路径: 预签名URL} 的字典
        """
        if not file_paths:
            return {}

        results = {}
        async with self._get_adapter() as minio:
            for fp in file_paths:
                original = fp
                fp = self._strip_leading_slash(fp)  # noqa: PLW2901
                url = await minio.presigned_get_object(self.bucket, fp, expires)
                results[original] = self._apply_redirect(url or "")

        return results

    # ============ 查询 ============

    async def file_exists(self, object_name: str) -> bool:
        """
        检查文件是否存在

        Args:
            object_name: 对象名称/路径
        """
        import asyncio  # noqa: PLC0415

        try:
            async with self._get_adapter() as minio:
                await asyncio.to_thread(
                    minio.client.stat_object, self.bucket, object_name
                )
            return True
        except Exception:
            return False

    async def get_json(self, object_name: str) -> Optional[dict]:
        """
        从 MinIO 读取 JSON 文件

        Args:
            object_name: 对象存储路径（如 ABI 文件路径）

        Returns:
            解析后的字典，失败返回 None
        """
        async with self._get_adapter() as minio:
            return await minio.get_json(object_name, self.bucket)


__all__ = [
    "StorageService",
    # 异常 (re-export from common.exceptions)
    "StorageError",
    "FileSizeExceeded",
    "InvalidFileType",
    # 常量
    "DEFAULT_MAX_IMAGE_SIZE",
    "DEFAULT_MAX_DOCUMENT_SIZE",
    "LOGO_MAX_SIZE",
    "LOGO_ALLOWED_TYPES",
    "ALLOWED_IMAGE_TYPES",
    "ALLOWED_DOCUMENT_TYPES",
    "IMAGE_CATEGORIES",
    "DOCUMENT_CATEGORIES",
]
