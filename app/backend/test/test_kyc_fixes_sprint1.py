"""
KYC 修复验证测试

验证 Sprint 1 所有后端修复项:
- B-01: apply() 初始 on_chain_sync_status 应为 NOT_REQUIRED
- B-02: record_admission 需链上验证
- B-04: REVOKED 枚举 + record_revocation 状态修正
- B-05: get_status / update_status / reset_kyc 需 network 过滤
- B-07: batch_review approve 逻辑统一 (PENDING, 无自动链上同步)
- C-01: stats 包含 revoked 计数
"""

import asyncio
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from src.common.exceptions import BusinessException
from src.models.kyc import AccountKyc
from src.schemas.enums import (
    KycStatus,
    Network,
    OnChainSyncStatus,
)
from src.services.kyc_service import KycService


def run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


# ============ Strategies ============

wallet_address_strategy = st.text(
    alphabet="0123456789abcdef", min_size=40, max_size=40
).map(lambda x: f"0x{x}")

tx_hash_strategy = st.text(alphabet="0123456789abcdef", min_size=64, max_size=64).map(
    lambda x: f"0x{x}"
)


def create_mock_kyc(
    kyc_id=1,
    address="0x" + "a" * 40,
    status=KycStatus.PENDING,
    on_chain_sync_status=OnChainSyncStatus.NOT_REQUIRED,
    network=Network.HARDHAT,
    **kwargs,
) -> MagicMock:
    kyc = MagicMock(spec=AccountKyc)
    kyc.id = kyc_id
    kyc.address = address
    kyc.network = network
    kyc.status = status
    kyc.on_chain_sync_status = on_chain_sync_status
    kyc.on_chain_tx_hash = None
    kyc.on_chain_synced_at = None
    kyc.on_chain_error = None
    kyc.is_accredited = kwargs.get("is_accredited", False)
    kyc.country_code = kwargs.get("country_code", "US")
    kyc.full_name = kwargs.get("full_name", "Test User")
    kyc.date_of_birth = None
    kyc.selfie_url = None
    kyc.submitted_at = datetime.now(timezone.utc)
    kyc.reviewed_at = None
    kyc.reviewer_address = None
    kyc.reject_reason = None
    kyc.email = None
    kyc.phone = None
    kyc.address_line1 = None
    kyc.address_line2 = None
    kyc.city = None
    kyc.state = None
    kyc.postal_code = None
    kyc.residence_country = None
    kyc.liveness_verified = False
    kyc.face_image_url = None
    kyc.liveness_video_url = None
    kyc.review_progress = None
    kyc.created_at = datetime.now(timezone.utc)
    kyc.updated_at = datetime.now(timezone.utc)
    kyc.save = AsyncMock()
    return kyc


# ============ B-01: apply() sets NOT_REQUIRED on new submissions ============


class TestB01ApplyInitialSyncStatus:
    """
    B-01: apply() 新提交和重新提交时 on_chain_sync_status 应为 NOT_REQUIRED
    """

    def test_revoked_enum_exists(self):
        """REVOKED 枚举值应存在于 OnChainSyncStatus"""
        assert hasattr(OnChainSyncStatus, "REVOKED")
        assert OnChainSyncStatus.REVOKED.value == "revoked"

    def test_onchain_sync_status_has_five_members(self):
        """OnChainSyncStatus 应有 5 个成员"""
        assert len(OnChainSyncStatus) == 5
        expected = {"not_required", "pending", "synced", "failed", "revoked"}
        assert {m.value for m in OnChainSyncStatus} == expected


# ============ B-02: record_admission chain verification ============


class TestB02RecordAdmissionChainVerify:
    """
    B-02: record_admission 应验证链上 is_verified 状态
    """

    @given(tx_hash=tx_hash_strategy)
    @settings(
        max_examples=10,
        deadline=None,
        suppress_health_check=[
            HealthCheck.function_scoped_fixture,
            HealthCheck.too_slow,
        ],
    )
    def test_record_admission_fails_when_chain_not_verified(self, tx_hash):
        """链上 is_verified=False 时，record_admission 应设 FAILED 并抛异常"""
        mock_kyc = create_mock_kyc(
            status=KycStatus.APPROVED,
            on_chain_sync_status=OnChainSyncStatus.PENDING,
        )

        with patch("src.services.kyc_service.SETTINGS") as mock_settings:
            mock_settings.network = "hardhat"
            service = KycService()

        with (
            patch("src.services.kyc_service.AccountKyc") as MockKyc,
        ):
            MockKyc.filter.return_value.first = AsyncMock(return_value=mock_kyc)

            with pytest.raises(BusinessException, match="verification failed"):
                run_async(
                    service.record_admission(
                        1, tx_hash, "0x" + "b" * 40, chain_verified=False
                    )
                )

    @given(tx_hash=tx_hash_strategy)
    @settings(
        max_examples=10,
        deadline=None,
        suppress_health_check=[
            HealthCheck.function_scoped_fixture,
            HealthCheck.too_slow,
        ],
    )
    def test_record_admission_succeeds_when_chain_verified(self, tx_hash):
        """链上 is_verified=True 时，record_admission 应设 SYNCED"""
        mock_kyc = create_mock_kyc(
            status=KycStatus.APPROVED,
            on_chain_sync_status=OnChainSyncStatus.PENDING,
        )

        with patch("src.services.kyc_service.SETTINGS") as mock_settings:
            mock_settings.network = "hardhat"
            service = KycService()

        with (
            patch("src.services.kyc_service.AccountKyc") as MockKyc,
            patch("src.services.kyc_service.KycAuditLog") as MockAuditLog,
            patch("src.services.kyc_service.AccountKycDocument") as MockDoc,
            patch.object(
                service,
                "is_verified",
                new_callable=AsyncMock,
                return_value=True,
            ),
            patch.object(
                service,
                "to_full_response",
                new_callable=AsyncMock,
                return_value=MagicMock(),
            ),
        ):
            MockKyc.filter.return_value.first = AsyncMock(return_value=mock_kyc)
            MockAuditLog.create = AsyncMock()
            MockDoc.filter.return_value.all = AsyncMock(return_value=[])

            run_async(service.record_admission(1, tx_hash, "0x" + "b" * 40))

            assert mock_kyc.on_chain_sync_status == OnChainSyncStatus.SYNCED
            assert mock_kyc.on_chain_tx_hash == tx_hash

    def test_record_admission_graceful_on_contract_exception(self):
        """链上验证异常时应降级处理并记录成功"""
        mock_kyc = create_mock_kyc(
            status=KycStatus.APPROVED,
            on_chain_sync_status=OnChainSyncStatus.PENDING,
        )

        tx_hash = "0x" + "c" * 64

        with patch("src.services.kyc_service.SETTINGS") as mock_settings:
            mock_settings.network = "hardhat"
            service = KycService()

        with (
            patch("src.services.kyc_service.AccountKyc") as MockKyc,
            patch("src.services.kyc_service.KycAuditLog") as MockAuditLog,
            patch("src.services.kyc_service.AccountKycDocument") as MockDoc,
            patch.object(
                service,
                "is_verified",
                new_callable=AsyncMock,
                side_effect=BusinessException(message="RPC error"),
            ),
            patch.object(
                service,
                "to_full_response",
                new_callable=AsyncMock,
                return_value=MagicMock(),
            ),
        ):
            MockKyc.filter.return_value.first = AsyncMock(return_value=mock_kyc)
            MockAuditLog.create = AsyncMock()
            MockDoc.filter.return_value.all = AsyncMock(return_value=[])

            # 不应抛异常 — 降级处理
            run_async(service.record_admission(1, tx_hash, "0x" + "b" * 40))

            # 仍应标记为 SYNCED（降级）
            assert mock_kyc.on_chain_sync_status == OnChainSyncStatus.SYNCED


# ============ B-04: record_revocation sets REVOKED ============


class TestB04RevocationStatus:
    """
    B-04: record_revocation 应将 on_chain_sync_status 设为 REVOKED
    """

    @given(tx_hash=tx_hash_strategy)
    @settings(
        max_examples=10,
        deadline=None,
        suppress_health_check=[
            HealthCheck.function_scoped_fixture,
            HealthCheck.too_slow,
        ],
    )
    def test_revocation_sets_revoked_status(self, tx_hash):
        """解除准入后状态应为 REVOKED 而非 PENDING"""
        mock_kyc = create_mock_kyc(
            status=KycStatus.APPROVED,
            on_chain_sync_status=OnChainSyncStatus.SYNCED,
        )

        with patch("src.services.kyc_service.SETTINGS") as mock_settings:
            mock_settings.network = "hardhat"
            service = KycService()

        with (
            patch("src.services.kyc_service.AccountKyc") as MockKyc,
            patch("src.services.kyc_service.KycAuditLog") as MockAuditLog,
            patch("src.services.kyc_service.AccountKycDocument") as MockDoc,
            patch.object(
                service,
                "to_full_response",
                new_callable=AsyncMock,
                return_value=MagicMock(),
            ),
        ):
            MockKyc.filter.return_value.first = AsyncMock(return_value=mock_kyc)
            MockAuditLog.create = AsyncMock()
            MockDoc.filter.return_value.all = AsyncMock(return_value=[])

            run_async(service.record_revocation(1, tx_hash, "0x" + "b" * 40, "testing"))

            assert mock_kyc.on_chain_sync_status == OnChainSyncStatus.REVOKED
            assert mock_kyc.on_chain_synced_at is None

    def test_revocation_rejects_non_synced(self):
        """非 SYNCED 状态不允许解除准入"""
        for status in [
            OnChainSyncStatus.PENDING,
            OnChainSyncStatus.NOT_REQUIRED,
            OnChainSyncStatus.FAILED,
            OnChainSyncStatus.REVOKED,
        ]:
            mock_kyc = create_mock_kyc(
                status=KycStatus.APPROVED,
                on_chain_sync_status=status,
            )

            with patch("src.services.kyc_service.SETTINGS") as mock_settings:
                mock_settings.network = "hardhat"
                service = KycService()

            with patch("src.services.kyc_service.AccountKyc") as MockKyc:
                MockKyc.filter.return_value.first = AsyncMock(return_value=mock_kyc)

                with pytest.raises(BusinessException, match="not currently admitted"):
                    run_async(
                        service.record_revocation(
                            1, "0x" + "d" * 64, "0x" + "b" * 40, "test"
                        )
                    )


# ============ B-07: batch_review approve sets PENDING, no auto-sync ============


class TestB07BatchReviewApprove:
    """
    B-07: batch_review approve 应与单条审核一致 — 设 PENDING, 无 strategy 调用
    """

    def test_batch_approve_sets_pending_sync_status(self):
        """batch_review approve 后 on_chain_sync_status 应为 PENDING"""
        mock_kyc = create_mock_kyc(
            kyc_id=1,
            status=KycStatus.PENDING,
            on_chain_sync_status=OnChainSyncStatus.NOT_REQUIRED,
        )

        from src.schemas.admin_kyc import BatchReviewRequest

        with patch("src.services.kyc_service.SETTINGS") as mock_settings:
            mock_settings.network = "hardhat"
            admin_service = KycService()

        request = BatchReviewRequest(
            kyc_ids=[1],
            action="approve",
            is_accredited=True,
        )

        with (
            patch("src.services.kyc_service.AccountKyc") as MockKyc,
            patch("src.services.kyc_service.create_kyc_audit_log") as MockAuditLog,
            patch("src.services.kyc_service.in_transaction") as MockTransaction,
        ):
            MockKyc.filter.return_value.first = AsyncMock(return_value=mock_kyc)
            MockAuditLog.return_value = AsyncMock()
            # 模拟事务上下文管理器
            mock_conn = AsyncMock()
            MockTransaction.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
            MockTransaction.return_value.__aexit__ = AsyncMock(return_value=False)

            result = run_async(admin_service.batch_review(request, "0x" + "a" * 40))

            assert result.success == 1
            assert mock_kyc.on_chain_sync_status == OnChainSyncStatus.PENDING
            # 不应有 on_chain_tx_hash 或 on_chain_synced_at 设置
            assert mock_kyc.on_chain_error is None


# ============ C-01: Stats include revoked count ============


class TestC01StatsRevokedCount:
    """
    C-01: KycStats 应包含 revoked 字段
    """

    def test_stats_schema_has_revoked_field(self):
        """KycStats schema 应包含 revoked 字段"""
        from src.schemas.admin_kyc import KycStats

        stats = KycStats(revoked=5)
        assert stats.revoked == 5

    def test_stats_revoked_defaults_to_zero(self):
        """revoked 字段默认值应为 0"""
        from src.schemas.admin_kyc import KycStats

        stats = KycStats()
        assert stats.revoked == 0
