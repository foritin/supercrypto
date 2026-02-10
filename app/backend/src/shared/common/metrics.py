"""
KYC 链上操作指标收集器

P-02: 轻量级内存指标，无需外部依赖。
提供 chain operation 计数器、耗时分布、和错误追踪。

设计:
- 内存存储，实例重启时重置 (无持久化需求)
- 线程安全 (asyncio.Lock)
- 通过 /health 或专用端点暴露指标
- 后续可适配 Prometheus client_python

用法:
    from src.shared.common.metrics import chain_metrics

    # 记录操作
    chain_metrics.record_operation("add_investor", success=True, duration_ms=1234)
    chain_metrics.record_operation("add_investor", success=False, duration_ms=500)

    # 获取指标快照
    snapshot = chain_metrics.snapshot()
"""

import asyncio
import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class OperationStats:
    """单个操作类型的统计"""

    total: int = 0
    success: int = 0
    failed: int = 0
    total_duration_ms: float = 0
    min_duration_ms: float = float("inf")
    max_duration_ms: float = 0
    last_error: Optional[str] = None
    last_error_time: Optional[float] = None

    @property
    def avg_duration_ms(self) -> float:
        return self.total_duration_ms / self.total if self.total > 0 else 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "total": self.total,
            "success": self.success,
            "failed": self.failed,
            "avg_duration_ms": round(self.avg_duration_ms, 1),
            "min_duration_ms": round(self.min_duration_ms, 1)
            if self.min_duration_ms != float("inf")
            else None,
            "max_duration_ms": round(self.max_duration_ms, 1),
            "last_error": self.last_error,
        }


class ChainMetrics:
    """
    链上操作指标收集器

    追踪操作:
    - add_investor: addInvestor 合约调用
    - record_admission: 后端准入记录
    - record_revocation: 后端解除准入记录
    - retry_sync: 失败重试任务
    - event_reconcile: 事件对账
    - is_verified: 链上验证查询
    """

    def __init__(self):
        self._stats: dict[str, OperationStats] = defaultdict(OperationStats)
        self._lock = asyncio.Lock()
        self._start_time = time.monotonic()

    async def record_operation(
        self,
        operation: str,
        *,
        success: bool = True,
        duration_ms: Optional[float] = None,
        error: Optional[str] = None,
    ) -> None:
        """记录一次操作"""
        async with self._lock:
            stats = self._stats[operation]
            stats.total += 1
            if success:
                stats.success += 1
            else:
                stats.failed += 1
                if error:
                    stats.last_error = error[:200]
                    stats.last_error_time = time.time()

            if duration_ms is not None:
                stats.total_duration_ms += duration_ms
                stats.min_duration_ms = min(stats.min_duration_ms, duration_ms)
                stats.max_duration_ms = max(stats.max_duration_ms, duration_ms)

    def record_operation_sync(
        self,
        operation: str,
        *,
        success: bool = True,
        duration_ms: Optional[float] = None,
        error: Optional[str] = None,
    ) -> None:
        """同步记录一次操作 (用于非 async 上下文)"""
        stats = self._stats[operation]
        stats.total += 1
        if success:
            stats.success += 1
        else:
            stats.failed += 1
            if error:
                stats.last_error = error[:200]
                stats.last_error_time = time.time()

        if duration_ms is not None:
            stats.total_duration_ms += duration_ms
            stats.min_duration_ms = min(stats.min_duration_ms, duration_ms)
            stats.max_duration_ms = max(stats.max_duration_ms, duration_ms)

    def snapshot(self) -> dict[str, Any]:
        """获取所有指标快照"""
        uptime_s = time.monotonic() - self._start_time
        return {
            "uptime_seconds": round(uptime_s, 0),
            "operations": {
                name: stats.to_dict() for name, stats in sorted(self._stats.items())
            },
        }

    async def reset(self) -> None:
        """重置所有指标 (测试用)"""
        async with self._lock:
            self._stats.clear()
            self._start_time = time.monotonic()


# 全局单例
chain_metrics = ChainMetrics()


@dataclass
class TimerContext:
    """操作计时上下文"""

    operation: str
    _start: float = field(default_factory=time.monotonic)
    _metrics: ChainMetrics = field(default_factory=lambda: chain_metrics)

    async def finish(
        self, *, success: bool = True, error: Optional[str] = None
    ) -> float:
        """结束计时并记录"""
        duration_ms = (time.monotonic() - self._start) * 1000
        await self._metrics.record_operation(
            self.operation, success=success, duration_ms=duration_ms, error=error
        )
        return duration_ms


def start_timer(operation: str) -> TimerContext:
    """开始一个操作计时器"""
    return TimerContext(operation=operation)
