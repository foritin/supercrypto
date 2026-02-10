"""
链上操作结构化日志工具

P-01: 为所有链上操作提供一致的结构化日志格式，
包含 correlation fields (kyc_id, wallet_address, tx_hash, operation)
和 timing data。

用法:
    from src.shared.common.chain_logger import ChainLogger

    chain_log = ChainLogger("kyc.contract")

    # 带上下文的日志
    chain_log.chain_op(
        operation="add_investor",
        investor_address="0x...",
        message="Starting addInvestor transaction",
    )

    # 计时上下文管理器
    async with chain_log.timed_op("add_investor", investor_address="0x...") as ctx:
        # ... chain operations ...
        ctx.set_tx_hash("0xabc...")
"""

import time
from contextlib import asynccontextmanager
from typing import Any, Optional

from falib.utils.log import get_logger


class ChainOpContext:
    """链上操作上下文 — 在 timed_op 内部使用"""

    def __init__(self):
        self.tx_hash: Optional[str] = None
        self.gas_used: Optional[int] = None
        self.extra: dict[str, Any] = {}

    def set_tx_hash(self, tx_hash: str) -> None:
        self.tx_hash = tx_hash

    def set_gas_used(self, gas: int) -> None:
        self.gas_used = gas

    def set(self, **kwargs: Any) -> None:
        self.extra.update(kwargs)


class ChainLogger:
    """
    链上操作结构化日志器

    在基础 logger 之上增加:
    - 自动附加 operation / investor_address / tx_hash 等上下文字段
    - timed_op 上下文管理器，自动记录耗时
    - 统一的日志前缀格式: [operation] message | key=value
    """

    def __init__(self, name: str):
        self._logger = get_logger(name)

    @staticmethod
    def _format_fields(**fields: Any) -> str:
        """格式化 key-value 对为日志后缀"""
        parts = []
        for k, v in fields.items():
            if v is not None:
                # 截断过长的值
                sv = str(v)
                if len(sv) > 80:
                    sv = sv[:77] + "..."
                parts.append(f"{k}={sv}")
        return " | " + ", ".join(parts) if parts else ""

    def chain_op(
        self,
        operation: str,
        message: str,
        *,
        level: str = "info",
        kyc_id: Optional[int] = None,
        investor_address: Optional[str] = None,
        tx_hash: Optional[str] = None,
        duration_ms: Optional[float] = None,
        gas_used: Optional[int] = None,
        **extra: Any,
    ) -> None:
        """
        记录链上操作日志

        格式: [operation] message | kyc_id=N, investor=0x..., tx_hash=0x...
        """
        fields = {
            "kyc_id": kyc_id,
            "investor": investor_address[:16] + "..." if investor_address and len(investor_address) > 16 else investor_address,
            "tx_hash": tx_hash[:16] + "..." if tx_hash and len(tx_hash) > 16 else tx_hash,
            "duration_ms": f"{duration_ms:.0f}" if duration_ms is not None else None,
            "gas_used": gas_used,
            **extra,
        }
        suffix = self._format_fields(**fields)
        log_msg = f"[{operation}] {message}{suffix}"

        log_fn = getattr(self._logger, level, self._logger.info)
        log_fn(log_msg)

    @asynccontextmanager
    async def timed_op(
        self,
        operation: str,
        *,
        kyc_id: Optional[int] = None,
        investor_address: Optional[str] = None,
        **extra: Any,
    ):
        """
        链上操作计时上下文管理器

        自动记录:
        - 操作开始 (info)
        - 操作成功 + duration (info)
        - 操作失败 + duration + error (error)

        Usage:
            async with chain_log.timed_op("add_investor", investor_address=addr) as ctx:
                tx_hash, success = await contract.add_investor(...)
                ctx.set_tx_hash(tx_hash)
        """
        ctx = ChainOpContext()
        start = time.monotonic()

        self.chain_op(
            operation,
            "Starting",
            kyc_id=kyc_id,
            investor_address=investor_address,
            **extra,
        )

        try:
            yield ctx

            duration_ms = (time.monotonic() - start) * 1000
            self.chain_op(
                operation,
                "Completed",
                level="info",
                kyc_id=kyc_id,
                investor_address=investor_address,
                tx_hash=ctx.tx_hash,
                duration_ms=duration_ms,
                gas_used=ctx.gas_used,
                **ctx.extra,
            )
        except Exception as e:
            duration_ms = (time.monotonic() - start) * 1000
            self.chain_op(
                operation,
                f"Failed: {str(e)[:100]}",
                level="error",
                kyc_id=kyc_id,
                investor_address=investor_address,
                tx_hash=ctx.tx_hash,
                duration_ms=duration_ms,
                **ctx.extra,
            )
            raise
