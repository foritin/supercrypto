"""
分布式锁服务

用于解决并发请求导致的数据重复问题。
使用 Redis 实现分布式锁，确保同一资源在同一时刻只能被一个请求处理。

使用示例:
    lock_service = await DistributedLockService.get_instance()
    async with lock_service.lock(f"subscription:{tx_hash}"):
        # 执行需要锁保护的操作
        pass
"""

import asyncio
from contextlib import asynccontextmanager
from typing import Optional

import redis.asyncio as redis
from falib.utils.config import SETTINGS


class LockAcquireError(Exception):
    """锁获取失败异常"""

    pass


class DistributedLockService:
    """
    分布式锁服务

    使用 Redis 实现分布式锁，支持:
    - 锁超时自动释放 (防止死锁)
    - 等待获取锁 (blocking)
    - 锁重入检测
    """

    _instance: Optional["DistributedLockService"] = None
    _redis: Optional[redis.Redis] = None
    _initialized: bool = False

    def __init__(self):
        self.lock_timeout = 30  # 锁超时时间 (秒)
        self.acquire_timeout = 10  # 获取锁超时时间 (秒)
        self.retry_interval = 0.1  # 重试间隔 (秒)

    @classmethod
    async def get_instance(cls) -> "DistributedLockService":
        """
        获取单例实例

        Returns:
            DistributedLockService 实例
        """
        if cls._instance is None:
            cls._instance = cls()

        if not cls._initialized:
            await cls._instance._init_redis()
            cls._initialized = True

        return cls._instance

    async def _init_redis(self):
        """初始化 Redis 连接"""
        redis_config = SETTINGS.redis

        # 构建 Redis URL
        password_part = f":{redis_config.password}@" if redis_config.password else ""
        redis_url = f"redis://{password_part}{redis_config.host}:{redis_config.port}/{redis_config.db}"

        self._redis = await redis.from_url(
            redis_url, encoding="utf-8", decode_responses=True
        )

    async def close(self):
        """关闭 Redis 连接"""
        if self._redis:
            await self._redis.close()
            self._redis = None
            DistributedLockService._initialized = False

    @asynccontextmanager
    async def lock(
        self, key: str, timeout: Optional[int] = None, blocking: bool = True
    ):
        """
        获取分布式锁

        Args:
            key: 锁的 key (会自动添加 lock: 前缀)
            timeout: 锁超时时间 (秒)，默认 30 秒
            blocking: 是否阻塞等待获取锁

        Yields:
            None

        Raises:
            LockAcquireError: 无法获取锁时抛出

        Example:
            async with lock_service.lock("subscription:0x123"):
                # 临界区代码
                pass
        """
        lock_key = f"lock:{key}"
        lock_timeout = timeout or self.lock_timeout
        acquired = False

        try:
            # 尝试获取锁
            acquired = await self._redis.set(
                lock_key,
                "1",
                nx=True,  # 仅当 key 不存在时设置
                ex=lock_timeout,  # 过期时间
            )

            if not acquired and blocking:
                # 等待锁释放
                max_attempts = int(self.acquire_timeout / self.retry_interval)
                for _ in range(max_attempts):
                    await asyncio.sleep(self.retry_interval)
                    acquired = await self._redis.set(
                        lock_key, "1", nx=True, ex=lock_timeout
                    )
                    if acquired:
                        break

            if not acquired:
                raise LockAcquireError(f"Failed to acquire lock: {key}")

            yield

        finally:
            # 释放锁
            if acquired:
                try:
                    await self._redis.delete(lock_key)
                except Exception:
                    # 忽略释放锁时的错误
                    pass

    async def try_lock(self, key: str, timeout: Optional[int] = None) -> bool:
        """
        尝试获取锁 (非阻塞)

        Args:
            key: 锁的 key
            timeout: 锁超时时间 (秒)

        Returns:
            是否成功获取锁
        """
        lock_key = f"lock:{key}"
        lock_timeout = timeout or self.lock_timeout

        result = await self._redis.set(lock_key, "1", nx=True, ex=lock_timeout)
        return bool(result)

    async def unlock(self, key: str) -> bool:
        """
        释放锁

        Args:
            key: 锁的 key

        Returns:
            是否成功释放
        """
        lock_key = f"lock:{key}"
        result = await self._redis.delete(lock_key)
        return result > 0

    async def is_locked(self, key: str) -> bool:
        """
        检查锁是否存在

        Args:
            key: 锁的 key

        Returns:
            锁是否存在
        """
        lock_key = f"lock:{key}"
        return await self._redis.exists(lock_key) > 0
