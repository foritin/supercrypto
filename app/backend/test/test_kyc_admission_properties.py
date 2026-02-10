"""
KYC On-Chain Admission 属性测试

使用 pytest + hypothesis 进行属性测试，验证 KYC 链上准入功能的正确性属性。

Feature: kyc-onchain-admission
测试框架: pytest + hypothesis
"""

import asyncio
from datetime import datetime, timezone
from typing import Optional
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from src.models.kyc import AccountKyc
from src.services.kyc.schemas import KycReviewRequest
from src.services.kyc.service import KycService
from src.shared.common.exceptions import BusinessException
from src.shared.schemas.enums import (
    KycAuditAction,
    KycStatus,
    NetWork,
    OnChainSyncStatus,
)


def run_async(coro):
    """辅助函数：运行异步协程"""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


# ============ Strategies ============

# 钱包地址策略 (0x + 40 hex chars)
wallet_address_strategy = st.text(
    alphabet="0123456789abcdef",
    min_size=40,
    max_size=40,
).map(lambda x: f"0x{x}")

# 交易哈希策略 (0x + 64 hex chars)
tx_hash_strategy = st.text(
    alphabet="0123456789abcdef",
    min_size=64,
    max_size=64,
).map(lambda x: f"0x{x}")

# KYC ID 策略
kyc_id_strategy = st.integers(min_value=1, max_value=10000)

# 解除准入原因策略
revocation_reason_strategy = st.text(
    min_size=1,
    max_size=200,
    alphabet=st.characters(whitelist_categories=("L", "N", "Zs")),
).filter(lambda x: len(x.strip()) > 0)

# 是否合格投资者策略
is_accredited_strategy = st.booleans()


def create_mock_kyc(
    kyc_id: int = 1,
    address: str = "0x" + "a" * 40,
    status: KycStatus = KycStatus.PENDING,
    on_chain_sync_status: OnChainSyncStatus = OnChainSyncStatus.PENDING,
    on_chain_tx_hash: Optional[str] = None,
    on_chain_synced_at: Optional[datetime] = None,
    is_accredited: bool = False,
) -> MagicMock:
    """创建模拟的 AccountKyc 记录"""
    kyc = MagicMock(spec=AccountKyc)
    kyc.id = kyc_id
    kyc.address = address
    kyc.network = NetWork.HARDHAT
    kyc.status = status
    kyc.on_chain_sync_status = on_chain_sync_status
    kyc.on_chain_tx_hash = on_chain_tx_hash
    kyc.on_chain_synced_at = on_chain_synced_at
    kyc.on_chain_error = None
    kyc.is_accredited = is_accredited
    kyc.submitted_at = datetime.now(timezone.utc)
    kyc.reviewed_at = None
    kyc.reviewer_address = None
    kyc.reject_reason = None
    kyc.external_kyc_id = None
    kyc.country_code = "US"
    kyc.full_name = "Test User"
    kyc.date_of_birth = None
    kyc.selfie_url = None
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
    kyc.created_at = datetime.now(timezone.utc)
    kyc.updated_at = datetime.now(timezone.utc)
    kyc.review_progress = None
    kyc.save = AsyncMock()
    return kyc


class TestReviewApprovalStateTransition:
    """
    **Feature: kyc-onchain-admission, Property 1: Review approval does not trigger on-chain sync**
    **Validates: Requirements 1.1**

    属性: 审核通过后，KYC 状态应为 APPROVED，on_chain_sync_status 应为 PENDING，
    on_chain_tx_hash 应为 None，不应有任何合约交互。
    """

    @given(
        wallet_address=wallet_address_strategy,
        kyc_id=kyc_id_strategy,
        reviewer_address=wallet_address_strategy,
        is_accredited=is_accredited_strategy,
    )
    @settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[
            HealthCheck.function_scoped_fixture,
            HealthCheck.too_slow,
        ],
    )
    def test_review_approval_does_not_trigger_onchain_sync(
        self,
        wallet_address: str,
        kyc_id: int,
        reviewer_address: str,
        is_accredited: bool,
    ):
        """
        **Property 1: Review approval does not trigger on-chain sync**
        **Validates: Requirements 1.1**

        对于任何处于 PENDING 状态的 KYC 记录，当 review() 以 approved=true 调用时，
        结果记录应有 status=APPROVED, on_chain_sync_status=PENDING, on_chain_tx_hash=None，
        且不应发生任何合约交互。
        """
        # 创建 PENDING 状态的 KYC 记录
        mock_kyc = create_mock_kyc(
            kyc_id=kyc_id,
            address=wallet_address,
            status=KycStatus.PENDING,
            on_chain_sync_status=OnChainSyncStatus.PENDING,
        )

        # 创建审核请求
        review_request = KycReviewRequest(
            approved=True,
            is_accredited=is_accredited,
        )

        # 创建 KycService 实例
        with patch("src.services.kyc.service.SETTINGS") as mock_settings:
            mock_settings.environment = "hardhat"
            kyc_service = KycService()

        # Mock 数据库操作
        with (
            patch("src.services.kyc.service.AccountKyc") as MockAccountKyc,
            patch("src.services.kyc.service.KycAuditLog") as MockAuditLog,
            patch("src.services.kyc.service.AccountKycDocument") as MockDoc,
        ):
            MockAccountKyc.filter.return_value.first = AsyncMock(return_value=mock_kyc)
            MockAuditLog.create = AsyncMock()
            MockDoc.filter.return_value.all = AsyncMock(return_value=[])

            # 执行审核
            result = run_async(
                kyc_service.review(kyc_id, review_request, reviewer_address)
            )

        # 验证属性: status=APPROVED
        assert mock_kyc.status == KycStatus.APPROVED, (
            f"After approval, status should be APPROVED, got {mock_kyc.status}"
        )

        # 验证属性: on_chain_sync_status=PENDING (不是 SYNCED)
        assert mock_kyc.on_chain_sync_status == OnChainSyncStatus.PENDING, (
            f"After approval, on_chain_sync_status should be PENDING, "
            f"got {mock_kyc.on_chain_sync_status}"
        )

        # 验证属性: on_chain_tx_hash=None (没有合约交互)
        assert mock_kyc.on_chain_tx_hash is None, (
            f"After approval, on_chain_tx_hash should be None, "
            f"got {mock_kyc.on_chain_tx_hash}"
        )

        # 验证属性: on_chain_synced_at=None
        assert mock_kyc.on_chain_synced_at is None, (
            f"After approval, on_chain_synced_at should be None, "
            f"got {mock_kyc.on_chain_synced_at}"
        )

        # 验证 is_accredited 被正确设置
        assert mock_kyc.is_accredited == is_accredited, (
            f"is_accredited should be {is_accredited}, got {mock_kyc.is_accredited}"
        )

        # 验证 save 被调用
        mock_kyc.save.assert_called_once()

        # 验证审计日志被创建
        MockAuditLog.create.assert_called_once()
        audit_call_kwargs = MockAuditLog.create.call_args[1]
        assert audit_call_kwargs["action"] == KycAuditAction.APPROVE


class TestAdmissionRecordingStateAndAudit:
    """
    **Feature: kyc-onchain-admission, Property 2: Admission recording sets SYNCED state and creates audit log**
    **Validates: Requirements 2.5, 2.7, 6.2**

    属性: 对于任何 status=APPROVED 且 on_chain_sync_status=PENDING 的 KYC 记录，
    当 record_admission() 被调用时，结果记录应有 on_chain_sync_status=SYNCED，
    on_chain_tx_hash 等于提供的哈希，且应存在 action=ADMIT 的 KycAuditLog 条目。
    """

    @given(
        kyc_id=kyc_id_strategy,
        tx_hash=tx_hash_strategy,
        admin_address=wallet_address_strategy,
    )
    @settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[
            HealthCheck.function_scoped_fixture,
            HealthCheck.too_slow,
        ],
    )
    def test_admission_recording_sets_synced_state(
        self,
        kyc_id: int,
        tx_hash: str,
        admin_address: str,
    ):
        """
        **Property 2: Admission recording sets SYNCED state and creates audit log**
        **Validates: Requirements 2.5, 2.7, 6.2**

        对于任何 APPROVED + PENDING 的 KYC 记录，record_admission() 应将
        on_chain_sync_status 设为 SYNCED，记录 tx_hash，并创建 ADMIT 审计日志。
        """
        # 创建 APPROVED + PENDING 状态的 KYC 记录
        mock_kyc = create_mock_kyc(
            kyc_id=kyc_id,
            status=KycStatus.APPROVED,
            on_chain_sync_status=OnChainSyncStatus.PENDING,
        )

        with patch("src.services.kyc.service.SETTINGS") as mock_settings:
            mock_settings.environment = "hardhat"
            kyc_service = KycService()

        with (
            patch("src.services.kyc.service.AccountKyc") as MockAccountKyc,
            patch("src.services.kyc.service.KycAuditLog") as MockAuditLog,
            patch("src.services.kyc.service.AccountKycDocument") as MockDoc,
        ):
            MockAccountKyc.filter.return_value.first = AsyncMock(return_value=mock_kyc)
            MockAuditLog.create = AsyncMock()
            MockDoc.filter.return_value.all = AsyncMock(return_value=[])

            result = run_async(
                kyc_service.record_admission(kyc_id, tx_hash, admin_address)
            )

        # 验证属性: on_chain_sync_status=SYNCED
        assert mock_kyc.on_chain_sync_status == OnChainSyncStatus.SYNCED, (
            f"After admission, on_chain_sync_status should be SYNCED, "
            f"got {mock_kyc.on_chain_sync_status}"
        )

        # 验证属性: on_chain_tx_hash 等于提供的哈希
        assert mock_kyc.on_chain_tx_hash == tx_hash, (
            f"on_chain_tx_hash should be {tx_hash}, got {mock_kyc.on_chain_tx_hash}"
        )

        # 验证属性: on_chain_synced_at 不为 None
        assert mock_kyc.on_chain_synced_at is not None, (
            "on_chain_synced_at should be set after admission"
        )

        # 验证属性: on_chain_error 被清除
        assert mock_kyc.on_chain_error is None, (
            "on_chain_error should be None after successful admission"
        )

        # 验证 save 被调用
        mock_kyc.save.assert_called_once()

        # 验证审计日志被创建，action=ADMIT
        MockAuditLog.create.assert_called_once()
        audit_kwargs = MockAuditLog.create.call_args[1]
        assert audit_kwargs["action"] == KycAuditAction.ADMIT, (
            f"Audit action should be ADMIT, got {audit_kwargs['action']}"
        )
        assert audit_kwargs["actor_address"] == admin_address.lower(), (
            f"Actor address should be {admin_address.lower()}"
        )
        assert audit_kwargs["details"]["tx_hash"] == tx_hash, (
            f"Audit details should contain tx_hash={tx_hash}"
        )


class TestRevocationRecordingStateAndAudit:
    """
    **Feature: kyc-onchain-admission, Property 3: Revocation recording sets PENDING state and creates audit log**
    **Validates: Requirements 4.5, 6.3**

    属性: 对于任何 on_chain_sync_status=SYNCED 的 KYC 记录，
    当 record_revocation() 被调用时，结果记录应有 on_chain_sync_status=PENDING，
    且应存在 action=REVOKE 的 KycAuditLog 条目，包含 tx_hash、admin 地址和原因。
    """

    @given(
        kyc_id=kyc_id_strategy,
        tx_hash=tx_hash_strategy,
        admin_address=wallet_address_strategy,
        reason=revocation_reason_strategy,
    )
    @settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[
            HealthCheck.function_scoped_fixture,
            HealthCheck.too_slow,
        ],
    )
    def test_revocation_recording_sets_pending_state(
        self,
        kyc_id: int,
        tx_hash: str,
        admin_address: str,
        reason: str,
    ):
        """
        **Property 3: Revocation recording sets PENDING state and creates audit log**
        **Validates: Requirements 4.5, 6.3**

        对于任何 SYNCED 的 KYC 记录，record_revocation() 应将
        on_chain_sync_status 设为 REVOKED，并创建 REVOKE 审计日志。
        """
        # 创建 SYNCED 状态的 KYC 记录
        mock_kyc = create_mock_kyc(
            kyc_id=kyc_id,
            status=KycStatus.APPROVED,
            on_chain_sync_status=OnChainSyncStatus.SYNCED,
            on_chain_tx_hash="0x" + "b" * 64,
            on_chain_synced_at=datetime.now(timezone.utc),
        )

        with patch("src.services.kyc.service.SETTINGS") as mock_settings:
            mock_settings.environment = "hardhat"
            kyc_service = KycService()

        with (
            patch("src.services.kyc.service.AccountKyc") as MockAccountKyc,
            patch("src.services.kyc.service.KycAuditLog") as MockAuditLog,
            patch("src.services.kyc.service.AccountKycDocument") as MockDoc,
        ):
            MockAccountKyc.filter.return_value.first = AsyncMock(return_value=mock_kyc)
            MockAuditLog.create = AsyncMock()
            MockDoc.filter.return_value.all = AsyncMock(return_value=[])

            result = run_async(
                kyc_service.record_revocation(kyc_id, tx_hash, admin_address, reason)
            )

        # 验证属性: on_chain_sync_status=REVOKED
        assert mock_kyc.on_chain_sync_status == OnChainSyncStatus.REVOKED, (
            f"After revocation, on_chain_sync_status should be REVOKED, "
            f"got {mock_kyc.on_chain_sync_status}"
        )

        # 验证属性: on_chain_tx_hash 更新为新的 tx_hash
        assert mock_kyc.on_chain_tx_hash == tx_hash, (
            f"on_chain_tx_hash should be updated to {tx_hash}"
        )

        # 验证属性: on_chain_synced_at 被清除
        assert mock_kyc.on_chain_synced_at is None, (
            "on_chain_synced_at should be None after revocation"
        )

        # 验证 save 被调用
        mock_kyc.save.assert_called_once()

        # 验证审计日志被创建，action=REVOKE
        MockAuditLog.create.assert_called_once()
        audit_kwargs = MockAuditLog.create.call_args[1]
        assert audit_kwargs["action"] == KycAuditAction.REVOKE, (
            f"Audit action should be REVOKE, got {audit_kwargs['action']}"
        )
        assert audit_kwargs["actor_address"] == admin_address.lower(), (
            f"Actor address should be {admin_address.lower()}"
        )
        assert audit_kwargs["details"]["tx_hash"] == tx_hash, (
            f"Audit details should contain tx_hash={tx_hash}"
        )
        assert audit_kwargs["details"]["reason"] == reason, (
            f"Audit details should contain reason={reason}"
        )


class TestStateValidationRejectsInvalidTransitions:
    """
    **Feature: kyc-onchain-admission, Property 5: State validation rejects invalid transitions**
    **Validates: Requirements 6.5**

    属性:
    - record_admission() 在 status != APPROVED 时应抛出 BusinessException
    - record_admission() 在 on_chain_sync_status == SYNCED 时应抛出 BusinessException
    - record_revocation() 在 on_chain_sync_status != SYNCED 时应抛出 BusinessException
    - 两个方法在 KYC 不存在时应抛出 BusinessException
    """

    @given(
        kyc_id=kyc_id_strategy,
        tx_hash=tx_hash_strategy,
        admin_address=wallet_address_strategy,
        invalid_status=st.sampled_from(
            [
                KycStatus.NOT_STARTED,
                KycStatus.PENDING,
                KycStatus.REJECTED,
            ]
        ),
    )
    @settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[
            HealthCheck.function_scoped_fixture,
            HealthCheck.too_slow,
        ],
    )
    def test_admission_rejects_non_approved_status(
        self,
        kyc_id: int,
        tx_hash: str,
        admin_address: str,
        invalid_status: KycStatus,
    ):
        """
        **Property 5: State validation rejects invalid transitions**
        **Validates: Requirements 6.5**

        record_admission() 在 status != APPROVED 时应抛出 BusinessException。
        """
        mock_kyc = create_mock_kyc(
            kyc_id=kyc_id,
            status=invalid_status,
            on_chain_sync_status=OnChainSyncStatus.PENDING,
        )

        with patch("src.services.kyc.service.SETTINGS") as mock_settings:
            mock_settings.environment = "hardhat"
            kyc_service = KycService()

        with patch("src.services.kyc.service.AccountKyc") as MockAccountKyc:
            MockAccountKyc.filter.return_value.first = AsyncMock(return_value=mock_kyc)

            with pytest.raises(BusinessException) as exc_info:
                run_async(kyc_service.record_admission(kyc_id, tx_hash, admin_address))

            assert exc_info.value.code == 400
            assert "approved" in exc_info.value.message.lower()

    @given(
        kyc_id=kyc_id_strategy,
        tx_hash=tx_hash_strategy,
        admin_address=wallet_address_strategy,
    )
    @settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[
            HealthCheck.function_scoped_fixture,
            HealthCheck.too_slow,
        ],
    )
    def test_admission_rejects_already_synced(
        self,
        kyc_id: int,
        tx_hash: str,
        admin_address: str,
    ):
        """
        **Property 5: State validation rejects invalid transitions**
        **Validates: Requirements 6.5**

        record_admission() 在 on_chain_sync_status == SYNCED 时应抛出 BusinessException。
        """
        mock_kyc = create_mock_kyc(
            kyc_id=kyc_id,
            status=KycStatus.APPROVED,
            on_chain_sync_status=OnChainSyncStatus.SYNCED,
        )

        with patch("src.services.kyc.service.SETTINGS") as mock_settings:
            mock_settings.environment = "hardhat"
            kyc_service = KycService()

        with patch("src.services.kyc.service.AccountKyc") as MockAccountKyc:
            MockAccountKyc.filter.return_value.first = AsyncMock(return_value=mock_kyc)

            with pytest.raises(BusinessException) as exc_info:
                run_async(kyc_service.record_admission(kyc_id, tx_hash, admin_address))

            assert exc_info.value.code == 400
            assert "already" in exc_info.value.message.lower()

    @given(
        kyc_id=kyc_id_strategy,
        tx_hash=tx_hash_strategy,
        admin_address=wallet_address_strategy,
        reason=revocation_reason_strategy,
        invalid_sync_status=st.sampled_from(
            [
                OnChainSyncStatus.PENDING,
                OnChainSyncStatus.NOT_REQUIRED,
                OnChainSyncStatus.FAILED,
            ]
        ),
    )
    @settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[
            HealthCheck.function_scoped_fixture,
            HealthCheck.too_slow,
        ],
    )
    def test_revocation_rejects_non_synced_status(
        self,
        kyc_id: int,
        tx_hash: str,
        admin_address: str,
        reason: str,
        invalid_sync_status: OnChainSyncStatus,
    ):
        """
        **Property 5: State validation rejects invalid transitions**
        **Validates: Requirements 6.5**

        record_revocation() 在 on_chain_sync_status != SYNCED 时应抛出 BusinessException。
        """
        mock_kyc = create_mock_kyc(
            kyc_id=kyc_id,
            status=KycStatus.APPROVED,
            on_chain_sync_status=invalid_sync_status,
        )

        with patch("src.services.kyc.service.SETTINGS") as mock_settings:
            mock_settings.environment = "hardhat"
            kyc_service = KycService()

        with patch("src.services.kyc.service.AccountKyc") as MockAccountKyc:
            MockAccountKyc.filter.return_value.first = AsyncMock(return_value=mock_kyc)

            with pytest.raises(BusinessException) as exc_info:
                run_async(
                    kyc_service.record_revocation(
                        kyc_id, tx_hash, admin_address, reason
                    )
                )

            assert exc_info.value.code == 400
            assert "not currently admitted" in exc_info.value.message.lower()

    @given(
        kyc_id=kyc_id_strategy,
        tx_hash=tx_hash_strategy,
        admin_address=wallet_address_strategy,
    )
    @settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[
            HealthCheck.function_scoped_fixture,
            HealthCheck.too_slow,
        ],
    )
    def test_admission_rejects_nonexistent_kyc(
        self,
        kyc_id: int,
        tx_hash: str,
        admin_address: str,
    ):
        """
        **Property 5: State validation rejects invalid transitions**
        **Validates: Requirements 6.5**

        record_admission() 在 KYC 不存在时应抛出 BusinessException (404)。
        """
        with patch("src.services.kyc.service.SETTINGS") as mock_settings:
            mock_settings.environment = "hardhat"
            kyc_service = KycService()

        with patch("src.services.kyc.service.AccountKyc") as MockAccountKyc:
            MockAccountKyc.filter.return_value.first = AsyncMock(return_value=None)

            with pytest.raises(BusinessException) as exc_info:
                run_async(kyc_service.record_admission(kyc_id, tx_hash, admin_address))

            assert exc_info.value.code == 404

    @given(
        kyc_id=kyc_id_strategy,
        tx_hash=tx_hash_strategy,
        admin_address=wallet_address_strategy,
        reason=revocation_reason_strategy,
    )
    @settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[
            HealthCheck.function_scoped_fixture,
            HealthCheck.too_slow,
        ],
    )
    def test_revocation_rejects_nonexistent_kyc(
        self,
        kyc_id: int,
        tx_hash: str,
        admin_address: str,
        reason: str,
    ):
        """
        **Property 5: State validation rejects invalid transitions**
        **Validates: Requirements 6.5**

        record_revocation() 在 KYC 不存在时应抛出 BusinessException (404)。
        """
        with patch("src.services.kyc.service.SETTINGS") as mock_settings:
            mock_settings.environment = "hardhat"
            kyc_service = KycService()

        with patch("src.services.kyc.service.AccountKyc") as MockAccountKyc:
            MockAccountKyc.filter.return_value.first = AsyncMock(return_value=None)

            with pytest.raises(BusinessException) as exc_info:
                run_async(
                    kyc_service.record_revocation(
                        kyc_id, tx_hash, admin_address, reason
                    )
                )

            assert exc_info.value.code == 404
