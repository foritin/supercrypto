"""
文件存储服务
============

支持本地文件存储和 MinIO 对象存储，通过配置切换。

Usage:
    from src.shared.common.storage import get_storage_service

    storage = get_storage_service()

    # 上传文件
    url = await storage.upload_file(file, asset_id=123, category="cover")

    # 删除文件
    await storage.delete_file(file_path)
"""

import os
import uuid
from abc import ABC, abstractmethod
from datetime import datetime
from pathlib import Path
from typing import BinaryIO, Optional, Union

from falib.utils.config import SETTINGS
from falib.utils.log import get_logger
from fastapi import UploadFile

logger = get_logger("system.storage")


# ============================================
# 异常定义
# ============================================


class StorageError(Exception):
    """存储服务基础异常"""

    pass


class FileSizeExceeded(StorageError):
    """文件大小超出限制"""

    def __init__(self, max_size: int, actual_size: int):
        self.max_size = max_size
        self.actual_size = actual_size
        super().__init__(
            f"文件大小 {actual_size / 1024 / 1024:.2f}MB 超出限制 {max_size / 1024 / 1024:.2f}MB"
        )


class InvalidFileType(StorageError):
    """不支持的文件类型"""

    def __init__(self, mime_type: str, allowed_types: list[str]):
        self.mime_type = mime_type
        self.allowed_types = allowed_types
        super().__init__(
            f"不支持的文件类型 {mime_type}，允许的类型: {', '.join(allowed_types)}"
        )


# ============================================
# 配置常量
# ============================================

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

# 图片类别
IMAGE_CATEGORIES = ["cover", "gallery", "floor_plan"]

# 文档类别
DOCUMENT_CATEGORIES = ["valuation", "legal", "financial", "document", "evaluation"]


# ============================================
# 存储服务抽象基类
# ============================================


class StorageService(ABC):
    """存储服务抽象基类"""

    @abstractmethod
    async def upload_file(
        self,
        file: Union[UploadFile, BinaryIO, bytes],
        asset_id: int,
        category: str,
        filename: Optional[str] = None,
    ) -> str:
        """
        上传文件

        Args:
            file: 文件对象或字节数据
            asset_id: 资产 ID
            category: 分类（cover, gallery, valuation, legal, financial 等）
            filename: 原始文件名（可选）

        Returns:
            文件访问 URL
        """
        pass

    @abstractmethod
    async def delete_file(self, file_path: str) -> bool:
        """
        删除文件

        Args:
            file_path: 文件路径或 URL

        Returns:
            是否删除成功
        """
        pass

    @abstractmethod
    def get_file_url(self, file_path: str) -> str:
        """
        获取文件访问 URL

        Args:
            file_path: 文件路径

        Returns:
            完整的访问 URL
        """
        pass

    def validate_file(
        self,
        file: Union[UploadFile, BinaryIO, bytes],
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
        elif hasattr(file, "file"):
            # UploadFile
            file.file.seek(0, 2)  # 移到文件末尾
            file_size = file.file.tell()
            file.file.seek(0)  # 重置到开头
            content_type = content_type or file.content_type
        else:
            # BinaryIO
            file.seek(0, 2)
            file_size = file.tell()
            file.seek(0)

        # 确定是图片还是文档
        is_image = category in IMAGE_CATEGORIES

        # 验证文件大小
        max_size = DEFAULT_MAX_IMAGE_SIZE if is_image else DEFAULT_MAX_DOCUMENT_SIZE
        if file_size > max_size:
            raise FileSizeExceeded(max_size, file_size)

        # 验证文件类型
        allowed_types = ALLOWED_IMAGE_TYPES if is_image else ALLOWED_DOCUMENT_TYPES
        if content_type and content_type not in allowed_types:
            raise InvalidFileType(content_type, allowed_types)

        return file_size, content_type or "application/octet-stream"

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

        Args:
            asset_id: 资产 ID
            category: 分类
            filename: 原始文件名（可选，用于提取扩展名）
            extension: 扩展名（可选）

        Returns:
            文件路径
        """
        # 确定扩展名
        if not extension and filename:
            extension = Path(filename).suffix.lstrip(".")
        if not extension:
            extension = "bin"

        # 生成唯一文件名
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        unique_id = uuid.uuid4().hex[:8]
        new_filename = f"{timestamp}_{unique_id}.{extension}"

        return f"assets/{asset_id}/{category}/{new_filename}"


# ============================================
# 本地文件存储实现
# ============================================


class LocalStorageService(StorageService):
    """本地文件存储服务（开发环境）"""

    def __init__(self, base_path: str = "uploads", base_url: str = "/static/uploads"):
        """
        初始化本地存储

        Args:
            base_path: 本地存储根目录
            base_url: 访问 URL 前缀
        """
        self.base_path = Path(base_path)
        self.base_url = base_url.rstrip("/")

        # 确保目录存在
        self.base_path.mkdir(parents=True, exist_ok=True)
        logger.info(f"LocalStorageService initialized: {self.base_path}")

    async def upload_file(
        self,
        file: Union[UploadFile, BinaryIO, bytes],
        asset_id: int,
        category: str,
        filename: Optional[str] = None,
    ) -> str:
        """上传文件到本地"""
        # 获取原始文件名
        if filename is None and hasattr(file, "filename"):
            filename = file.filename

        # 获取 content_type
        content_type = None
        if hasattr(file, "content_type"):
            content_type = file.content_type

        # 验证文件
        file_size, mime_type = self.validate_file(file, category, content_type)

        # 生成文件路径
        file_path = self.generate_file_path(asset_id, category, filename)
        full_path = self.base_path / file_path

        # 确保目录存在
        full_path.parent.mkdir(parents=True, exist_ok=True)

        # 读取文件内容
        if isinstance(file, bytes):
            content = file
        elif hasattr(file, "file"):
            content = await file.read()
        else:
            content = file.read()

        # 写入文件
        with open(full_path, "wb") as f:
            f.write(content)

        logger.info(f"File uploaded to local: {file_path} ({file_size} bytes)")

        return self.get_file_url(file_path)

    async def delete_file(self, file_path: str) -> bool:
        """从本地删除文件"""
        # 从 URL 提取相对路径
        if file_path.startswith(self.base_url):
            file_path = file_path[len(self.base_url) :].lstrip("/")

        full_path = self.base_path / file_path

        if full_path.exists():
            os.remove(full_path)
            logger.info(f"File deleted from local: {file_path}")
            return True

        logger.warning(f"File not found for deletion: {file_path}")
        return False

    def get_file_url(self, file_path: str) -> str:
        """获取本地文件访问 URL"""
        return f"{self.base_url}/{file_path}"


# ============================================
# MinIO 存储实现
# ============================================


class MinIOStorageService(StorageService):
    """MinIO 对象存储服务（生产环境）"""

    def __init__(
        self,
        endpoint: str,
        access_key: str,
        secret_key: str,
        bucket: str,
        secure: bool = False,
    ):
        """
        初始化 MinIO 存储

        Args:
            endpoint: MinIO 服务地址
            access_key: 访问密钥
            secret_key: 私密密钥
            bucket: 存储桶名称
            secure: 是否使用 HTTPS
        """
        self.endpoint = endpoint
        self.access_key = access_key
        self.secret_key = secret_key
        self.bucket = bucket
        self.secure = secure

        logger.info(f"MinIOStorageService initialized: {endpoint}/{bucket}")

    def _get_adapter(self):
        """获取 MinIO 适配器"""
        from src.shared.common.adapters import get_async_minio_adapter

        return get_async_minio_adapter()

    async def upload_file(
        self,
        file: Union[UploadFile, BinaryIO, bytes],
        asset_id: int,
        category: str,
        filename: Optional[str] = None,
    ) -> str:
        """上传文件到 MinIO"""
        # 获取原始文件名
        if filename is None and hasattr(file, "filename"):
            filename = file.filename

        # 获取 content_type
        content_type = None
        if hasattr(file, "content_type"):
            content_type = file.content_type

        # 验证文件
        file_size, mime_type = self.validate_file(file, category, content_type)

        # 生成文件路径
        file_path = self.generate_file_path(asset_id, category, filename)

        # 读取文件内容
        if isinstance(file, bytes):
            content = file
        elif hasattr(file, "file"):
            content = await file.read()
        else:
            content = file.read()

        # 上传到 MinIO
        async with self._get_adapter() as minio:
            # 使用 put_object 方法
            from io import BytesIO

            await minio.upload_fileobj(
                BytesIO(content),
                file_path,
                content_type=mime_type,
                content_length=file_size,
            )

        logger.info(f"File uploaded to MinIO: {file_path} ({file_size} bytes)")

        return self.get_file_url(file_path)

    async def delete_file(self, file_path: str) -> bool:
        """从 MinIO 删除文件"""
        # 从 URL 提取对象路径
        if file_path.startswith("http"):
            # 从完整 URL 提取路径
            # 格式: http://endpoint/bucket/path
            parts = file_path.split(f"/{self.bucket}/", 1)
            if len(parts) > 1:
                file_path = parts[1]

        try:
            async with self._get_adapter() as minio:
                await minio.delete_object(file_path)
            logger.info(f"File deleted from MinIO: {file_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete file from MinIO: {file_path}, error: {e}")
            return False

    def get_file_url(self, file_path: str) -> str:
        """获取 MinIO 文件访问 URL"""
        protocol = "https" if self.secure else "http"
        return f"{protocol}://{self.endpoint}/{self.bucket}/{file_path}"


# ============================================
# 工厂函数
# ============================================


_storage_service: Optional[StorageService] = None


def get_storage_service() -> StorageService:
    """
    获取存储服务实例（单例）

    根据配置自动选择本地存储或 MinIO 存储

    Returns:
        存储服务实例
    """
    global _storage_service

    if _storage_service is not None:
        return _storage_service

    # 检查是否配置了 MinIO
    try:
        minio_config = SETTINGS.MINIO
        if minio_config and minio_config.ENDPOINT:
            _storage_service = MinIOStorageService(
                endpoint=minio_config.ENDPOINT,
                access_key=minio_config.ACCESS_KEY,
                secret_key=minio_config.SECRET_KEY,
                bucket=minio_config.BUCKET,
                secure=getattr(minio_config, "SECURE", False),
            )
            logger.info("Using MinIO storage service")
            return _storage_service
    except AttributeError:
        pass

    # 默认使用本地存储
    _storage_service = LocalStorageService()
    logger.info("Using local storage service")
    return _storage_service


def reset_storage_service():
    """重置存储服务（用于测试）"""
    global _storage_service
    _storage_service = None


__all__ = [
    "StorageService",
    "LocalStorageService",
    "MinIOStorageService",
    "get_storage_service",
    "reset_storage_service",
    "StorageError",
    "FileSizeExceeded",
    "InvalidFileType",
    "ALLOWED_IMAGE_TYPES",
    "ALLOWED_DOCUMENT_TYPES",
    "IMAGE_CATEGORIES",
    "DOCUMENT_CATEGORIES",
]
