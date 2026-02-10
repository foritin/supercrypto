"""
Sprint 2 后端测试

验证:
- S-02: tx_hash 格式校验 (validator + schema)
- B-03: 幂等性 (admission / revocation)
- S-01: RateLimiter 内存限流器
- B-06: retry_failed_kyc_syncs 逻辑
- B-08: _notify_sync_failure 审计日志
- C-02: nonce lock 存在性
"""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from src.shared.common.validators import TX_HASH_PATTERN, validate_tx_hash


def run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


# ============ Strategies ============

# 合法 tx_hash: 0x + 64 hex
valid_tx_hash_strategy = st.text(
    alphabet="0123456789abcdef", min_size=64, max_size=64
).map(lambda x: f"0x{x}")

# 非法 tx_hash: 各种格式错误
invalid_tx_hash_strategy = st.one_of(
    # 太短
    st.text(alphabet="0123456789abcdef", min_size=1, max_size=63).map(
        lambda x: f"0x{x}"
    ),
    # 太长
    st.text(alphabet="0123456789abcdef", min_size=65, max_size=80).map(
        lambda x: f"0x{x}"
    ),
    # 无 0x 前缀
    st.text(alphabet="0123456789abcdef", min_size=64, max_size=64),
    # 含非法字符
    st.text(alphabet="0123456789abcdefg", min_size=64, max_size=64).map(
        lambda x: f"0x{x}"
    ),
    # 空字符串
    st.just(""),
    st.just("0x"),
)

wallet_address_strategy = st.text(
    alphabet="0123456789abcdef", min_size=40, max_size=40
).map(lambda x: f"0x{x}")


# ============ S-02: tx_hash 格式校验 ============


class TestS02TxHashValidation:
    """S-02: 交易哈希格式校验测试"""

    @given(tx_hash=valid_tx_hash_strategy)
    @settings(
        max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_valid_tx_hash_accepted(self, tx_hash: str):
        """合法的 tx_hash 应通过校验并转为小写"""
        result = validate_tx_hash(tx_hash)
        assert result == tx_hash.lower()
        assert TX_HASH_PATTERN.match(result)

    @given(tx_hash=invalid_tx_hash_strategy)
    @settings(
        max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_invalid_tx_hash_rejected(self, tx_hash: str):
        """非法的 tx_hash 应抛出 ValueError"""
        # 过滤掉碰巧合法的值 (含 g 的字符串偶尔全为 hex)
        if TX_HASH_PATTERN.match(tx_hash):
            return
        with pytest.raises(ValueError, match="Invalid tx_hash format"):
            validate_tx_hash(tx_hash)

    def test_pydantic_schema_validates_admission(self):
        """RecordAdmissionRequest 应拒绝非法 tx_hash"""
        from pydantic import ValidationError

        from src.services.kyc.schemas import RecordAdmissionRequest

        # 合法
        req = RecordAdmissionRequest(tx_hash="0x" + "a" * 64)
        assert req.tx_hash == "0x" + "a" * 64

        # 非法
        with pytest.raises(ValidationError):
            RecordAdmissionRequest(tx_hash="bad")

    def test_pydantic_schema_validates_revocation(self):
        """RecordRevocationRequest 应拒绝非法 tx_hash"""
        from pydantic import ValidationError

        from src.services.kyc.schemas import RecordRevocationRequest

        # 合法
        req = RecordRevocationRequest(tx_hash="0x" + "b" * 64, reason="test")
        assert req.tx_hash == "0x" + "b" * 64

        # 非法
        with pytest.raises(ValidationError):
            RecordRevocationRequest(tx_hash="short", reason="test")


# ============ B-03: 幂等性 ============


class TestB03Idempotency:
    """B-03: admission/revocation 幂等性测试"""

    @given(tx_hash=valid_tx_hash_strategy, address=wallet_address_strategy)
    @settings(
        max_examples=30, suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_admission_idempotent_same_tx_hash(self, tx_hash: str, address: str):
        """同一 tx_hash 重复提交 record_admission 应直接返回成功"""
        from src.services.kyc.service import KycService
        from src.shared.schemas.enums import KycStatus, OnChainSyncStatus

        service = KycService()
        mock_kyc = MagicMock()
        mock_kyc.id = 1
        mock_kyc.address = address
        mock_kyc.status = KycStatus.APPROVED
        mock_kyc.on_chain_sync_status = OnChainSyncStatus.SYNCED
        mock_kyc.on_chain_tx_hash = tx_hash.lower()
        mock_response = MagicMock()

        with (
            patch(
                "src.services.kyc.service.AccountKyc.filter",
                return_value=MagicMock(first=AsyncMock(return_value=mock_kyc)),
            ),
            patch.object(
                service,
                "_to_full_response",
                new_callable=AsyncMock,
                return_value=mock_response,
            ),
        ):
            result = run_async(
                service.record_admission(1, tx_hash.lower(), "0x" + "a" * 40)
            )
            assert result is mock_response
            # save() 不应被调用 (幂等返回)
            mock_kyc.save.assert_not_called()

    @given(tx_hash=valid_tx_hash_strategy, address=wallet_address_strategy)
    @settings(
        max_examples=30, suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_revocation_idempotent_same_tx_hash(self, tx_hash: str, address: str):
        """同一 tx_hash 重复提交 record_revocation 应直接返回成功"""
        from src.services.kyc.service import KycService
        from src.shared.schemas.enums import OnChainSyncStatus

        service = KycService()
        mock_kyc = MagicMock()
        mock_kyc.id = 1
        mock_kyc.address = address
        mock_kyc.on_chain_sync_status = OnChainSyncStatus.REVOKED
        mock_kyc.on_chain_tx_hash = tx_hash.lower()
        mock_response = MagicMock()

        with (
            patch(
                "src.services.kyc.service.AccountKyc.filter",
                return_value=MagicMock(first=AsyncMock(return_value=mock_kyc)),
            ),
            patch.object(
                service,
                "_to_full_response",
                new_callable=AsyncMock,
                return_value=mock_response,
            ),
        ):
            result = run_async(
                service.record_revocation(1, tx_hash.lower(), "0x" + "a" * 40, "test")
            )
            assert result is mock_response
            mock_kyc.save.assert_not_called()

    def test_admission_different_tx_hash_raises(self):
        """不同 tx_hash 提交到已 SYNCED 的 KYC 应抛出异常"""
        from src.services.kyc.service import KycService
        from src.shared.common.exceptions import BusinessException
        from src.shared.schemas.enums import KycStatus, OnChainSyncStatus

        service = KycService()
        mock_kyc = MagicMock()
        mock_kyc.id = 1
        mock_kyc.status = KycStatus.APPROVED
        mock_kyc.on_chain_sync_status = OnChainSyncStatus.SYNCED
        mock_kyc.on_chain_tx_hash = "0x" + "a" * 64  # 已有不同的 tx_hash

        with patch(
            "src.services.kyc.service.AccountKyc.filter",
            return_value=MagicMock(first=AsyncMock(return_value=mock_kyc)),
        ):
            with pytest.raises(BusinessException, match="already admitted"):
                run_async(service.record_admission(1, "0x" + "b" * 64, "0x" + "c" * 40))


# ============ S-01: RateLimiter ============


class TestS01RateLimiter:
    """S-01: 内存限流器测试"""

    def test_allows_within_limit(self):
        """请求数未超限时应通过"""
        from src.shared.middleware.rate_limit import RateLimiter

        limiter = RateLimiter(max_requests=5, window_seconds=60)
        mock_request = MagicMock()
        mock_request.client.host = "127.0.0.1"
        mock_request.headers = {}
        mock_request.state = MagicMock(spec=[])  # 无 auth_address

        for _ in range(5):
            run_async(limiter.check(mock_request))

    def test_blocks_over_limit(self):
        """请求数超限时应抛出 429"""
        from fastapi import HTTPException

        from src.shared.middleware.rate_limit import RateLimiter

        limiter = RateLimiter(max_requests=3, window_seconds=60)
        mock_request = MagicMock()
        mock_request.client.host = "192.168.1.1"
        mock_request.headers = {}
        mock_request.state = MagicMock(spec=[])

        for _ in range(3):
            run_async(limiter.check(mock_request))

        with pytest.raises(HTTPException) as exc_info:
            run_async(limiter.check(mock_request))

        assert exc_info.value.status_code == 429

    def test_different_users_independent(self):
        """不同用户的限流计数应独立"""
        from src.shared.middleware.rate_limit import RateLimiter

        limiter = RateLimiter(max_requests=2, window_seconds=60)

        req1 = MagicMock()
        req1.client.host = "10.0.0.1"
        req1.headers = {}
        req1.state = MagicMock(spec=[])

        req2 = MagicMock()
        req2.client.host = "10.0.0.2"
        req2.headers = {}
        req2.state = MagicMock(spec=[])

        # 用户 1 用完额度
        for _ in range(2):
            run_async(limiter.check(req1))

        # 用户 2 仍然可请求
        run_async(limiter.check(req2))

    def test_auth_user_key_preferred(self):
        """有 auth_address 时应按用户计数而非 IP"""
        from fastapi import HTTPException

        from src.shared.middleware.rate_limit import RateLimiter

        limiter = RateLimiter(max_requests=2, window_seconds=60)

        # 两个不同 IP 但相同 auth_address
        req1 = MagicMock()
        req1.client.host = "10.0.0.1"
        req1.headers = {}
        req1.state.auth_address = "0xABC"

        req2 = MagicMock()
        req2.client.host = "10.0.0.2"
        req2.headers = {}
        req2.state.auth_address = "0xABC"

        run_async(limiter.check(req1))
        run_async(limiter.check(req2))

        # 第三次应超限 (同一 auth_address)
        with pytest.raises(HTTPException) as exc_info:
            run_async(limiter.check(req1))
        assert exc_info.value.status_code == 429


# ============ B-06: Retry Failed Syncs ============


class TestB06RetryFailedSyncs:
    """B-06: 失败同步重试逻辑测试"""

    def test_parse_retry_count_zero(self):
        """无错误信息时返回 0"""
        from src.tasks.kyc_sync_task import _parse_retry_count

        assert _parse_retry_count(None) == 0
        assert _parse_retry_count("") == 0
        assert _parse_retry_count("Some other error") == 0

    def test_parse_retry_count_incremental(self):
        """能正确解析重试计数"""
        from src.tasks.kyc_sync_task import _parse_retry_count

        assert _parse_retry_count("Auto-retry attempt 1/3: investor not verified") == 1
        assert _parse_retry_count("Auto-retry attempt 2/3: investor not verified") == 2

    def test_parse_retry_count_exhausted(self):
        """已耗尽重试时返回最大值"""
        from src.tasks.kyc_sync_task import MAX_RETRY_ATTEMPTS, _parse_retry_count

        assert (
            _parse_retry_count("Auto-retry exhausted (3/3): Manual intervention")
            == MAX_RETRY_ATTEMPTS
        )

    def test_retry_recovers_verified_record(self):
        """链上已验证的记录应自动恢复为 SYNCED"""
        from src.shared.schemas.enums import OnChainSyncStatus
        from src.tasks.kyc_sync_task import retry_failed_kyc_syncs

        mock_kyc = MagicMock()
        mock_kyc.id = 42
        mock_kyc.address = "0x" + "a" * 40
        mock_kyc.on_chain_sync_status = OnChainSyncStatus.FAILED
        mock_kyc.on_chain_tx_hash = "0x" + "b" * 64
        mock_kyc.on_chain_error = "Chain verification failed"
        mock_kyc.save = AsyncMock()

        mock_contract_service = MagicMock()
        mock_contract_service.is_verified = AsyncMock(return_value=True)

        with (
            patch(
                "src.tasks.kyc_sync_task.Tortoise.init",
                new_callable=AsyncMock,
            ),
            patch(
                "src.tasks.kyc_sync_task.Tortoise.close_connections",
                new_callable=AsyncMock,
            ),
            patch(
                "src.models.kyc.AccountKyc.filter",
                return_value=MagicMock(all=AsyncMock(return_value=[mock_kyc])),
            ),
            patch(
                "src.services.kyc.contract_service.KycContractService",
                return_value=mock_contract_service,
            ),
            patch(
                "src.models.kyc_audit_log.KycAuditLog.create",
                new_callable=AsyncMock,
            ) as mock_log,
        ):
            run_async(retry_failed_kyc_syncs())

            assert mock_kyc.on_chain_sync_status == OnChainSyncStatus.SYNCED
            assert mock_kyc.on_chain_error is None
            mock_kyc.save.assert_called()
            mock_log.assert_called()


# ============ C-02: Nonce Lock ============


class TestC02NonceLock:
    """C-02: nonce 并发锁存在性检查"""

    def test_nonce_lock_exists(self):
        """KycContractService 应有 _nonce_lock 类属性"""
        import asyncio

        from src.services.kyc.contract_service import KycContractService

        assert hasattr(KycContractService, "_nonce_lock")
        assert isinstance(KycContractService._nonce_lock, asyncio.Lock)
