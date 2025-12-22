"""
MinIO 对象存储服务
用于 KYC 证件照片等私密文件存储

Code Review M3: 添加重试机制
"""

import asyncio
from functools import wraps
from typing import Callable, Optional, TypeVar

from falib.utils.config import SETTINGS
from falib.utils.log import get_logger

logger = get_logger(__name__)

T = TypeVar("T")


def with_retry(
    max_attempts: int = 3,
    delay: float = 1.0,
    backoff: float = 2.0,
    exceptions: tuple = (Exception,),
) -> Callable:
    """
    重试装饰器 (Code Review M3)

    Args:
        max_attempts: 最大重试次数
        delay: 初始延迟（秒）
        backoff: 退避系数
        exceptions: 需要重试的异常类型
    """

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_exception = None
            current_delay = delay

            for attempt in range(max_attempts):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    if attempt < max_attempts - 1:
                        logger.warning(
                            f"{func.__name__} failed (attempt {attempt + 1}/{max_attempts}): {e}, "
                            f"retrying in {current_delay}s..."
                        )
                        await asyncio.sleep(current_delay)
                        current_delay *= backoff
                    else:
                        logger.error(
                            f"{func.__name__} failed after {max_attempts} attempts: {e}"
                        )

            raise last_exception

        return wrapper

    return decorator


class MinIOService:
    """MinIO 对象存储服务"""

    def __init__(self):
        self._client = None
        self._bucket = None

    @property
    def bucket(self) -> str:
        """获取默认 bucket 名称"""
        if self._bucket is None:
            minio_config = getattr(SETTINGS, "minio", {})
            if isinstance(minio_config, dict):
                self._bucket = minio_config.get("bucket", "kyc-documents")
            else:
                self._bucket = "kyc-documents"
        return self._bucket

    @property
    def client(self):
        """懒加载 MinIO 客户端"""
        if self._client is None:
            from minio import Minio

            minio_config = getattr(SETTINGS, "minio", {})
            if isinstance(minio_config, dict):
                endpoint = minio_config.get("endpoint", "localhost:9000")
                access_key = minio_config.get("access_key", "minioadmin")
                secret_key = minio_config.get("secret_key", "minioadmin")
                secure = minio_config.get("secure", False)
            else:
                endpoint = "localhost:9000"
                access_key = "minioadmin"
                secret_key = "minioadmin"
                secure = False

            self._client = Minio(
                endpoint=endpoint,
                access_key=access_key,
                secret_key=secret_key,
                secure=secure,
            )

            # 确保 bucket 存在
            self._ensure_bucket_exists()

        return self._client

    def _ensure_bucket_exists(self):
        """确保 bucket 存在，不存在则创建"""
        try:
            if not self._client.bucket_exists(self.bucket):
                self._client.make_bucket(self.bucket)
                logger.info(f"Created MinIO bucket: {self.bucket}")
        except Exception as e:
            logger.warning(f"Failed to create bucket {self.bucket}: {e}")

    @with_retry(max_attempts=3, delay=0.5, exceptions=(Exception,))
    async def upload_file(
        self,
        object_name: str,
        file_data: bytes,
        content_type: str,
        bucket: Optional[str] = None,
    ) -> str:
        """
        上传文件到 MinIO (Code Review M3: 带重试)

        Args:
            object_name: 对象名称/路径
            file_data: 文件二进制数据
            content_type: 文件 MIME 类型
            bucket: 可选的 bucket 名称，默认使用配置的 bucket

        Returns:
            str: 对象名称/路径
        """
        import io

        target_bucket = bucket or self.bucket
        data_stream = io.BytesIO(file_data)
        data_length = len(file_data)

        self.client.put_object(
            bucket_name=target_bucket,
            object_name=object_name,
            data=data_stream,
            length=data_length,
            content_type=content_type,
        )
        logger.info(f"Uploaded file to MinIO: {target_bucket}/{object_name}")
        return object_name

    @with_retry(max_attempts=3, delay=0.5, exceptions=(Exception,))
    async def get_presigned_url(
        self,
        object_name: str,
        expires: int = 3600,
        bucket: Optional[str] = None,
    ) -> str:
        """
        获取预签名 URL (Code Review M3: 带重试)

        Args:
            object_name: 对象名称/路径
            expires: 过期时间（秒），默认 1 小时
            bucket: 可选的 bucket 名称

        Returns:
            str: 预签名 URL
        """
        from datetime import timedelta

        target_bucket = bucket or self.bucket

        url = self.client.presigned_get_object(
            bucket_name=target_bucket,
            object_name=object_name,
            expires=timedelta(seconds=expires),
        )
        return url

    async def delete_file(
        self,
        object_name: str,
        bucket: Optional[str] = None,
    ) -> bool:
        """
        删除文件

        Args:
            object_name: 对象名称/路径
            bucket: 可选的 bucket 名称

        Returns:
            bool: 是否成功
        """
        target_bucket = bucket or self.bucket

        try:
            self.client.remove_object(
                bucket_name=target_bucket,
                object_name=object_name,
            )
            logger.info(f"Deleted file from MinIO: {target_bucket}/{object_name}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete file from MinIO: {e}")
            raise

    async def file_exists(
        self,
        object_name: str,
        bucket: Optional[str] = None,
    ) -> bool:
        """
        检查文件是否存在

        Args:
            object_name: 对象名称/路径
            bucket: 可选的 bucket 名称

        Returns:
            bool: 文件是否存在
        """
        target_bucket = bucket or self.bucket

        try:
            self.client.stat_object(
                bucket_name=target_bucket,
                object_name=object_name,
            )
            return True
        except Exception:
            return False


# 单例实例
_minio_service: Optional[MinIOService] = None


def get_minio_service() -> MinIOService:
    """获取 MinIO 服务单例"""
    global _minio_service
    if _minio_service is None:
        _minio_service = MinIOService()
    return _minio_service
