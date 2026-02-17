"""
Sprint 3 测试 — Polish & Observability

覆盖:
- P-01: ChainLogger 结构化日志
- P-02: ChainMetrics 指标收集
- F-07: i18n key 完整性
"""

import asyncio

import pytest

from src.common.chain_logger import ChainLogger, ChainOpContext
from src.common.metrics import ChainMetrics, start_timer

# ============================================================================
# P-01: ChainLogger
# ============================================================================


class TestP01ChainLogger:
    """ChainLogger 结构化日志测试"""

    def test_format_fields_basic(self):
        """格式化 key-value 对"""
        result = ChainLogger._format_fields(kyc_id=1, investor="0xabc")
        assert "kyc_id=1" in result
        assert "investor=0xabc" in result

    def test_format_fields_none_excluded(self):
        """None 值不包含在输出中"""
        result = ChainLogger._format_fields(kyc_id=1, investor=None, tx_hash=None)
        assert "kyc_id=1" in result
        assert "investor" not in result
        assert "tx_hash" not in result

    def test_format_fields_empty(self):
        """无字段时返回空字符串"""
        result = ChainLogger._format_fields()
        assert result == ""

    def test_format_fields_truncation(self):
        """超长值被截断"""
        long_value = "x" * 100
        result = ChainLogger._format_fields(data=long_value)
        assert "..." in result
        assert len(result) < 100

    def test_chain_op_context(self):
        """ChainOpContext 可设置 tx_hash 和 gas"""
        ctx = ChainOpContext()
        assert ctx.tx_hash is None
        ctx.set_tx_hash("0xdeadbeef")
        ctx.set_gas_used(21000)
        assert ctx.tx_hash == "0xdeadbeef"
        assert ctx.gas_used == 21000

    def test_chain_op_context_extra(self):
        """ChainOpContext.set() 扩展字典"""
        ctx = ChainOpContext()
        ctx.set(block=42, status="confirmed")
        assert ctx.extra == {"block": 42, "status": "confirmed"}

    def test_chain_log_instantiation(self):
        """ChainLogger 可正确实例化"""
        cl = ChainLogger("test.module")
        assert cl._logger is not None

    def test_chain_op_does_not_raise(self):
        """chain_op 调用不抛错"""
        cl = ChainLogger("test.safe")
        # Should not raise
        cl.chain_op(
            "add_investor",
            "Test message",
            kyc_id=42,
            investor_address="0x1234567890abcdef",
            tx_hash="0xdeadbeef",
            duration_ms=123.4,
            gas_used=21000,
        )

    def test_timed_op_success(self):
        """timed_op 完整流程不抛错"""
        cl = ChainLogger("test.timed")
        loop = asyncio.new_event_loop()

        async def _run():
            async with cl.timed_op("test_op", kyc_id=1) as ctx:
                await asyncio.sleep(0.01)
                ctx.set_tx_hash("0xabc")

        loop.run_until_complete(_run())
        loop.close()

    def test_timed_op_failure_propagates(self):
        """timed_op 内部异常正确传播"""
        cl = ChainLogger("test.timed")
        loop = asyncio.new_event_loop()

        async def _run():
            with pytest.raises(ValueError, match="boom"):
                async with cl.timed_op("fail_op", kyc_id=99):
                    raise ValueError("boom")

        loop.run_until_complete(_run())
        loop.close()


# ============================================================================
# P-02: ChainMetrics
# ============================================================================


class TestP02ChainMetrics:
    """ChainMetrics 指标测试"""

    def _run(self, coro):
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(coro)
        finally:
            loop.close()

    def test_record_success(self):
        """记录成功操作"""
        m = ChainMetrics()
        self._run(m.record_operation("test_op", success=True, duration_ms=100))
        snap = m.snapshot()
        assert snap["operations"]["test_op"]["total"] == 1
        assert snap["operations"]["test_op"]["success"] == 1
        assert snap["operations"]["test_op"]["failed"] == 0

    def test_record_failure(self):
        """记录失败操作"""
        m = ChainMetrics()
        self._run(m.record_operation("test_op", success=False, error="timeout"))
        snap = m.snapshot()
        assert snap["operations"]["test_op"]["failed"] == 1
        assert snap["operations"]["test_op"]["last_error"] == "timeout"

    def test_duration_stats(self):
        """耗时统计: min/max/avg"""
        m = ChainMetrics()
        self._run(m.record_operation("op", success=True, duration_ms=100))
        self._run(m.record_operation("op", success=True, duration_ms=300))
        snap = m.snapshot()
        stats = snap["operations"]["op"]
        assert stats["min_duration_ms"] == 100.0
        assert stats["max_duration_ms"] == 300.0
        assert stats["avg_duration_ms"] == 200.0

    def test_multiple_operations(self):
        """多种操作独立统计"""
        m = ChainMetrics()
        self._run(m.record_operation("add_investor", success=True))
        self._run(m.record_operation("is_verified", success=True))
        self._run(m.record_operation("is_verified", success=False))
        snap = m.snapshot()
        assert snap["operations"]["add_investor"]["total"] == 1
        assert snap["operations"]["is_verified"]["total"] == 2

    def test_snapshot_has_uptime(self):
        """快照包含 uptime"""
        m = ChainMetrics()
        snap = m.snapshot()
        assert "uptime_seconds" in snap
        assert snap["uptime_seconds"] >= 0

    def test_reset_clears_all(self):
        """reset 清空所有指标"""
        m = ChainMetrics()
        self._run(m.record_operation("op", success=True))
        self._run(m.reset())
        snap = m.snapshot()
        assert len(snap["operations"]) == 0

    def test_sync_record(self):
        """同步记录"""
        m = ChainMetrics()
        m.record_operation_sync("sync_op", success=True, duration_ms=50)
        snap = m.snapshot()
        assert snap["operations"]["sync_op"]["total"] == 1

    def test_timer_context(self):
        """start_timer + finish 自动计时"""
        m = ChainMetrics()

        async def _run():
            timer = start_timer("timed_op")
            timer._metrics = m
            await asyncio.sleep(0.01)
            duration = await timer.finish(success=True)
            assert duration >= 5  # at least 5ms
            snap = m.snapshot()
            assert snap["operations"]["timed_op"]["total"] == 1
            assert snap["operations"]["timed_op"]["avg_duration_ms"] >= 5

        self._run(_run())


# ============================================================================
# F-07: i18n Key 完整性
# ============================================================================


class TestF07I18nKeys:
    """验证所有链操作 i18n key 存在于 locale 文件"""

    REQUIRED_ADMISSION_KEYS = [
        "admit",
        "reAdmit",
        "recoverySuccess",
        "recoveryFailed",
        "txTimeout",
        "txPending",
        "verifying",
        "signing",
        "broadcasting",
        "confirming",
        "recording",
        "success",
        "failed",
        "txReverted",
        "userRejected",
        "walletNotConnected",
        "notAdmin",
        "notDeployer",
        "notVerifier",
    ]

    REQUIRED_ONCHAIN_KEYS = [
        "revocationRecoverySuccess",
        "revocationRecoveryFailed",
        "defaultRevocationReason",
        "revocationTimeout",
        "revocationSuccess",
        "revocationFailed",
        "revocationTxReverted",
    ]

    def _read_locale_file(self, lang: str) -> str:
        """Read locale file content"""
        import os

        # test/ is at app/backend/test/, locale is at app/frontend/nextjs/src/locales/
        base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        locale_path = os.path.join(
            base, "..", "frontend", "nextjs", "src", "locales", lang, "admin.ts"
        )
        with open(locale_path) as f:
            return f.read()

    @pytest.mark.parametrize("lang", ["en-US", "zh-CN"])
    def test_admission_keys_exist(self, lang: str):
        """admission section 包含所有必需 key"""
        content = self._read_locale_file(lang)
        for key in self.REQUIRED_ADMISSION_KEYS:
            assert f"{key}:" in content, (
                f"Missing key 'admission.{key}' in {lang}/admin.ts"
            )

    @pytest.mark.parametrize("lang", ["en-US", "zh-CN"])
    def test_onchain_keys_exist(self, lang: str):
        """onchain section 包含所有必需 key"""
        content = self._read_locale_file(lang)
        for key in self.REQUIRED_ONCHAIN_KEYS:
            assert f"{key}:" in content, (
                f"Missing key 'onchain.{key}' in {lang}/admin.ts"
            )

    @pytest.mark.parametrize("lang", ["en-US", "zh-CN"])
    def test_no_hardcoded_manual_revocation(self, lang: str):
        """onchain-status-panel 不含硬编码 'Manual revocation' 在 recordRevocation 调用中"""
        import os

        base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        panel_path = os.path.join(
            base,
            "..",
            "frontend",
            "nextjs",
            "src",
            "components",
            "admin-kyc",
            "onchain-status-panel.tsx",
        )
        with open(panel_path) as f:
            content = f.read()

        lines = content.split("\n")
        for i, line in enumerate(lines, 1):
            if "recordRevocation" in line and "'Manual revocation'" in line:
                pytest.fail(
                    f"Hardcoded 'Manual revocation' in onchain-status-panel.tsx line {i}"
                )
