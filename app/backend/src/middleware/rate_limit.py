"""
简易内存限流器

基于固定窗口计数算法，无需外部依赖。
适用于单实例部署，多实例部署请切换到 Redis 适配器。
"""

import asyncio
import time
from collections import defaultdict

from falib.utils.log import get_logger
from fastapi import HTTPException, Request, status

logger = get_logger("system.middleware.rate_limit")


class RateLimiter:
    """
    基于固定时间窗口的内存限流器

    Args:
        max_requests: 时间窗口内允许的最大请求数
        window_seconds: 时间窗口长度 (秒)
    """

    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: dict[str, list[float]] = defaultdict(list)
        self._locks: dict[str, asyncio.Lock] = defaultdict(asyncio.Lock)

    def _get_key(self, request: Request) -> str:
        """
        生成限流键

        优先使用认证用户地址 (request.state.auth_address)，
        回退到客户端 IP。
        """
        auth_address = getattr(getattr(request, "state", None), "auth_address", None)
        if auth_address:
            return f"user:{auth_address.lower()}"
        # 代理环境取 X-Forwarded-For
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return f"ip:{forwarded.split(',')[0].strip()}"
        client = request.client
        return f"ip:{client.host if client else 'unknown'}"

    async def check(self, request: Request) -> None:
        """
        检查请求是否超过限流阈值

        Raises:
            HTTPException(429): 超过限流
        """
        key = self._get_key(request)
        now = time.monotonic()

        async with self._locks[key]:
            timestamps = self._requests[key]
            # 清理过期记录
            cutoff = now - self.window_seconds
            self._requests[key] = [t for t in timestamps if t > cutoff]
            timestamps = self._requests[key]

            if len(timestamps) >= self.max_requests:
                retry_after = int(self.window_seconds - (now - timestamps[0])) + 1
                logger.warning(
                    f"Rate limit exceeded: key={key}, "
                    f"requests={len(timestamps)}/{self.max_requests} per {self.window_seconds}s"
                )
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded. Try again in {retry_after}s.",
                    headers={"Retry-After": str(retry_after)},
                )

            timestamps.append(now)

    async def cleanup(self) -> None:
        """
        清理所有过期记录 (可由定时任务调用)

        注意: check() 方法在每次请求时已对单个 key 做过期清理，
        此方法用于批量清理所有 key 的过期记录，减少内存占用。
        可通过外部定时任务调用，非必需。
        """
        now = time.monotonic()
        expired_keys = []
        for key in list(self._requests.keys()):
            async with self._locks[key]:
                timestamps = self._requests[key]
                cutoff = now - self.window_seconds
                self._requests[key] = [t for t in timestamps if t > cutoff]
                if not self._requests[key]:
                    expired_keys.append(key)
        for key in expired_keys:
            del self._requests[key]
            del self._locks[key]


# ============ 预置限流器实例 ============

# 链上操作限流: 每分钟最多 10 次 (admission / revocation)
chain_operation_limiter = RateLimiter(max_requests=10, window_seconds=60)

# 批量操作限流: 每分钟最多 5 次
batch_operation_limiter = RateLimiter(max_requests=5, window_seconds=60)


# ============ FastAPI Depends 封装 ============


async def require_chain_rate_limit(request: Request) -> None:
    """链上操作限流依赖 — 注入到 admission / revocation 端点"""
    await chain_operation_limiter.check(request)


async def require_batch_rate_limit(request: Request) -> None:
    """批量操作限流依赖 — 注入到 batch_review 端点"""
    await batch_operation_limiter.check(request)
