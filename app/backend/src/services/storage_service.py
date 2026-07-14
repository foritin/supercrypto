"""
文件存储服务
============

基于本地文件系统的存储服务，提供统一的文件操作封装。

用法::

    # 通过 services 包导入
    # from src.services import StorageService, storage_service

    # 使用模块级单例
    # url = await storage_service.upload_file(file, asset_id=123, category="cover")

    # 或通过依赖注入
    # from src.common.dependencies import get_storage_service
"""

import asyncio
import json
import os
import shutil
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional, Union

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
    """本地文件系统存储服务

    提供与原 MinIO 版本相同的接口，底层改为本地文件系统:
    - 资产文件上传 / 删除 / 访问 URL
    - KYC 文档等低级别文件操作
    - ABI JSON 读取
    - 批量操作
    """

    def __init__(
        self,
        base_dir: Optional[str] = None,
        bucket: Optional[str] = None,
        # 以下参数保留兼容性，不再使用
        endpoint: Optional[str] = None,
        access_key: Optional[str] = None,
        secret_key: Optional[str] = None,
        secure: Optional[bool] = None,
        redirect: Optional[str] = None,
    ):
        """初始化存储服务

        Args:
            base_dir: 文件存储根目录，未提供时从 SETTINGS.STORAGE.BASE_DIR 读取
            bucket: 子目录名（兼容旧参数），未提供时使用 SETTINGS.STORAGE.BUCKET 或 "default"
        """
        storage_config = getattr(SETTINGS, "STORAGE", None)
        default_base = getattr(storage_config, "BASE_DIR", "data/uploads") if storage_config else "data/uploads"
        default_bucket = getattr(storage_config, "BUCKET", "default") if storage_config else "default"

        self.base_dir: Path = Path(base_dir or default_base)
        self.bucket: str = bucket or default_bucket
        # redirect 保留兼容，本地存储不使用
        self.redirect: Optional[str] = redirect

        # 确保存储目录存在
        self._ensure_base_dir()

        logger.info(f"StorageService initialized: {self.base_dir} (bucket={self.bucket})")

    def _ensure_base_dir(self) -> None:
        """确保基础存储目录存在"""
        full_dir = self.base_dir / self.bucket
        full_dir.mkdir(parents=True, exist_ok=True)

    def _full_path(self, object_name: str) -> Path:
        """获取文件的完整本地路径"""
        object_name = self._strip_leading_slash(object_name)
        return self.base_dir / self.bucket / object_name

    async def _write_file(self, object_name: str, content: bytes) -> None:
        """将内容写入本地文件"""
        full_path = self._full_path(object_name)
        full_path.parent.mkdir(parents=True, exist_ok=True)

        def _write():
            with open(full_path, "wb") as f:
                f.write(content)

        await asyncio.to_thread(_write)

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
        上传文件到本地存储

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

        await self._write_file(file_path, content)

        logger.info(f"File uploaded: {file_path} ({file_size} bytes)")
        return self.get_file_url(file_path)

    async def upload_files_batch(
        self,
        files: list[tuple[Union[UploadFile, bytes], int, str, Optional[str]]],
    ) -> list[str]:
        """
        批量上传文件到本地存储

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

        # 逐个写入
        results = []
        for file_path, content, file_size in prepared:
            await self._write_file(file_path, content)
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
        上传原始文件到本地存储（低级别接口）

        不经过资产路径生成和文件验证，直接按指定路径上传。
        适用于 KYC 文档等非资产场景。

        Args:
            object_name: 存储路径
            file_data: 文件二进制数据
            content_type: 文件 MIME 类型（本地存储忽略）

        Returns:
            存储路径
        """
        await self._write_file(object_name, file_data)

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
        full_path = self._full_path(file_path)
        try:
            await asyncio.to_thread(os.remove, full_path)
            logger.info(f"File deleted: {file_path}")
            return True
        except FileNotFoundError:
            logger.warning(f"File not found for deletion: {file_path}")
            return True  # 文件不存在视为已删除
        except Exception as e:
            logger.error(f"Failed to delete file: {file_path}, error: {e}")
            return False

    async def delete_by_prefix(self, prefix: str) -> int:
        """
        按前缀删除文件

        Args:
            prefix: 路径前缀，如 "kyc/0x123.../id_card_front_" 或 "assets/1/"

        Returns:
            删除的文件数量
        """
        prefix = self._strip_leading_slash(prefix)
        search_dir = self.base_dir / self.bucket

        # 如果前缀指向一个目录，删除整个目录
        prefix_path = search_dir / prefix
        try:
            if prefix_path.is_dir():
                def _rmtree():
                    count = sum(1 for _ in prefix_path.rglob("*") if _.is_file())
                    shutil.rmtree(prefix_path)
                    return count
                deleted_count = await asyncio.to_thread(_rmtree)
                logger.info(f"Deleted {deleted_count} files with prefix '{prefix}'")
                return deleted_count

            # 如果前缀是文件名的一部分，按 glob 匹配
            parent_dir = prefix_path.parent
            pattern = prefix_path.name + "*"

            def _glob_delete():
                count = 0
                if parent_dir.is_dir():
                    for f in parent_dir.glob(pattern):
                        if f.is_file():
                            f.unlink()
                            count += 1
                return count

            deleted_count = await asyncio.to_thread(_glob_delete)
            logger.info(f"Deleted {deleted_count} files with prefix '{prefix}'")
            return deleted_count

        except Exception as e:
            logger.error(f"Failed to delete files by prefix '{prefix}': {e}")
            return 0

    # ============ 访问 URL ============

    async def get_presigned_url(self, file_path: str, expires: int = 3600) -> str:
        """
        获取文件访问 URL

        本地存储不需要预签名，直接返回文件路径。
        文件由 FastAPI StaticFiles 提供服务。

        Args:
            file_path: 文件相对路径
            expires: 过期时间（秒），本地存储忽略此参数

        Returns:
            文件访问 URL 路径
        """
        file_path = self._strip_leading_slash(file_path)
        return self.get_file_url(file_path)

    async def get_presigned_urls_batch(
        self, file_paths: list[str], expires: int = 3600
    ) -> dict[str, str]:
        """
        批量获取文件访问 URL

        Args:
            file_paths: 文件相对路径列表
            expires: 过期时间（秒），本地存储忽略此参数

        Returns:
            {原始路径: 访问URL} 的字典
        """
        if not file_paths:
            return {}

        results = {}
        for fp in file_paths:
            stripped = self._strip_leading_slash(fp)
            results[fp] = self.get_file_url(stripped)

        return results

    # ============ 查询 ============

    async def file_exists(self, object_name: str) -> bool:
        """
        检查文件是否存在

        Args:
            object_name: 文件路径
        """
        object_name = self._strip_leading_slash(object_name)
        full_path = self._full_path(object_name)
        return await asyncio.to_thread(full_path.exists)

    async def get_json(self, object_name: str) -> Optional[dict]:
        """
        从本地存储读取 JSON 文件

        Args:
            object_name: 文件路径（如 ABI 文件路径）

        Returns:
            解析后的字典/列表，失败返回 None
        """
        object_name = self._strip_leading_slash(object_name)
        full_path = self._full_path(object_name)

        def _read_json():
            if not full_path.exists():
                return None
            with open(full_path, "r", encoding="utf-8") as f:
                return json.load(f)

        try:
            return await asyncio.to_thread(_read_json)
        except Exception as e:
            logger.error(f"Failed to read JSON from {object_name}: {e}")
            return None


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
