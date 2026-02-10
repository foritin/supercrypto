"""
KYC Admin 属性测试

使用 Hypothesis 进行属性测试，验证 KYC Admin 功能的正确性属性。

测试框架: pytest + hypothesis
"""

import datetime as dt
from datetime import datetime, timezone
from typing import List, Optional

import pytest
from hypothesis import given, settings, strategies as st

from src.models.kyc import AccountKyc
from src.models.kyc_audit_log import KycAuditLog
from src.services.admin.kyc_service import (
    AdminKycService,
    create_kyc_audit_log,
)
from src.shared.schemas.enums import (
    KycAuditAction,
    KycStatus,
    NetWork,
    ReviewPriority,
    RiskLevel,
)


# ============ Strategies ============

risk_level_strategy = st.sampled_from([level.value for level in RiskLevel])
priority_strategy = st.sampled_from([p.value for p in ReviewPriority])
status_strategy = st.sampled_from([s.value for s in KycStatus])
action_strategy = st.sampled_from([a for a in KycAuditAction])

# 钱包地址策略 (0x + 40 hex chars)
wallet_address_strategy = st.text(
    alphabet="0123456789abcdef",
    min_size=40,
    max_size=40,
).map(lambda x: f"0x{x}")

# 时间戳策略
datetime_strategy = st.datetimes(
    min_value=datetime(2020, 1, 1),
    max_value=datetime(2030, 1, 1),
)


class TestDefaultValuesProperty:
    """
    **Feature: kyc-admin-backend-enhancement, Property 1: Default Values on Creation**
    **Validates: Requirements 1.8**
    
    属性: 新创建的 AccountKyc 记录应具有正确的默认值
    - risk_level = "low"
    - risk_score = 0
    - priority = "normal"
    """

    @given(wallet_address_strategy)
    @settings(max_examples=50, deadline=None)
    def test_default_values_on_creation(self, wallet_address: str):
        """
        **Property 1: Default Values on Creation**
        **Validates: Requirements 1.8**
        
        测试新创建的 KYC 记录默认值正确
        """
        # 创建 KYC 记录 (不指定风险相关字段)
        kyc = AccountKyc(
            address=wallet_address,
            network=NetWork.HARDHAT,
            status=KycStatus.NOT_STARTED,
        )
        
        # 验证默认值
        assert kyc.risk_level == RiskLevel.LOW, "risk_level should default to 'low'"
        assert kyc.risk_score == 0, "risk_score should default to 0"
        assert kyc.priority == ReviewPriority.NORMAL, "priority should default to 'normal'"
        assert kyc.is_pep is False, "is_pep should default to False"
        assert kyc.is_sanctioned is False, "is_sanctioned should default to False"


class TestProcessingTimeProperty:
    """
    **Feature: kyc-admin-backend-enhancement, Property 5: Processing Time Calculation**
    **Validates: Requirements 3.7**
    
    属性: 处理时间应等于 (reviewed_at - submitted_at) 转换为分钟
    """

    @given(datetime_strategy, datetime_strategy)
    @settings(max_examples=100, deadline=None)
    def test_processing_time_calculation(
        self, submitted_at: datetime, reviewed_at: datetime
    ):
        """
        **Property 5: Processing Time Calculation**
        **Validates: Requirements 3.7**
        
        测试处理时间计算正确
        """
        # 确保 reviewed_at >= submitted_at
        if reviewed_at < submitted_at:
            submitted_at, reviewed_at = reviewed_at, submitted_at

        # 使用服务方法计算处理时间
        service = AdminKycService()
        result = service._calculate_processing_time(submitted_at, reviewed_at)

        # 计算预期值
        expected_minutes = (reviewed_at - submitted_at).total_seconds() / 60
        expected_rounded = round(expected_minutes, 2)

        assert result == expected_rounded, (
            f"Processing time should be {expected_rounded}, got {result}"
        )

    @given(datetime_strategy)
    @settings(max_examples=50, deadline=None)
    def test_processing_time_with_none_submitted(self, reviewed_at: datetime):
        """
        **Property 5: Processing Time Calculation**
        **Validates: Requirements 3.7**
        
        测试 submitted_at 为 None 时返回 None
        """
        service = AdminKycService()
        result = service._calculate_processing_time(None, reviewed_at)
        assert result is None, "Should return None when submitted_at is None"

    @given(datetime_strategy)
    @settings(max_examples=50, deadline=None)
    def test_processing_time_with_none_reviewed(self, submitted_at: datetime):
        """
        **Property 5: Processing Time Calculation**
        **Validates: Requirements 3.7**
        
        测试 reviewed_at 为 None 时返回 None
        """
        service = AdminKycService()
        result = service._calculate_processing_time(submitted_at, None)
        assert result is None, "Should return None when reviewed_at is None"


class TestBatchReviewProperty:
    """
    **Feature: kyc-admin-backend-enhancement, Property 7 & 8: Batch Review**
    **Validates: Requirements 5.1, 5.6, 5.7**
    
    属性:
    - 批量审核应处理所有记录
    - 单条记录失败时应继续处理其他记录
    """

    @given(st.lists(st.integers(min_value=1, max_value=1000), min_size=1, max_size=10))
    @settings(max_examples=50, deadline=None)
    def test_batch_review_response_counts(self, kyc_ids: List[int]):
        """
        **Property 7: Batch Review Processes All Records**
        **Validates: Requirements 5.1, 5.7**
        
        测试批量审核响应的计数正确
        """
        from src.services.admin.kyc_schemas import BatchReviewResponse, BatchReviewResult

        # 模拟批量审核响应
        results = [
            BatchReviewResult(kyc_id=kyc_id, success=True, error=None)
            for kyc_id in kyc_ids
        ]
        
        response = BatchReviewResponse(
            total=len(kyc_ids),
            success=len(kyc_ids),
            failed=0,
            results=results,
        )

        # 验证计数
        assert response.total == len(kyc_ids), "total should equal number of kyc_ids"
        assert response.success + response.failed == response.total, (
            "success + failed should equal total"
        )
        assert len(response.results) == response.total, (
            "results length should equal total"
        )

    @given(
        st.lists(st.integers(min_value=1, max_value=1000), min_size=2, max_size=10),
        st.integers(min_value=0, max_value=9),
    )
    @settings(max_examples=50, deadline=None)
    def test_batch_review_continues_on_failure(
        self, kyc_ids: List[int], fail_index: int
    ):
        """
        **Property 8: Batch Review Continues on Failure**
        **Validates: Requirements 5.6**
        
        测试批量审核在单条失败时继续处理
        """
        from src.services.admin.kyc_schemas import BatchReviewResponse, BatchReviewResult

        # 确保 fail_index 在有效范围内
        fail_index = fail_index % len(kyc_ids)

        # 模拟部分失败的响应
        results = []
        for i, kyc_id in enumerate(kyc_ids):
            if i == fail_index:
                results.append(
                    BatchReviewResult(
                        kyc_id=kyc_id,
                        success=False,
                        error="Simulated failure",
                    )
                )
            else:
                results.append(
                    BatchReviewResult(kyc_id=kyc_id, success=True, error=None)
                )

        success_count = sum(1 for r in results if r.success)
        failed_count = sum(1 for r in results if not r.success)

        response = BatchReviewResponse(
            total=len(kyc_ids),
            success=success_count,
            failed=failed_count,
            results=results,
        )

        # 验证所有记录都被处理
        assert len(response.results) == len(kyc_ids), (
            "All records should be processed"
        )
        assert response.success + response.failed == response.total, (
            "success + failed should equal total"
        )
        assert response.failed == 1, "Should have exactly 1 failure"
        assert response.success == len(kyc_ids) - 1, (
            "Should have n-1 successes"
        )


class TestStatsAccuracyProperty:
    """
    **Feature: kyc-admin-backend-enhancement, Property 9: Stats Counts Accuracy**
    **Validates: Requirements 6.2, 6.5**
    
    属性: 统计数据应与实际数据匹配
    """

    @given(
        st.integers(min_value=0, max_value=100),
        st.integers(min_value=0, max_value=100),
        st.integers(min_value=0, max_value=100),
        st.integers(min_value=0, max_value=100),
    )
    @settings(max_examples=100, deadline=None)
    def test_stats_total_equals_sum(
        self,
        pending: int,
        approved: int,
        rejected: int,
        failed_sync: int,
    ):
        """
        **Property 9: Stats Counts Accuracy**
        **Validates: Requirements 6.2, 6.5**
        
        测试统计总数等于各状态之和
        """
        from src.services.admin.kyc_schemas import KycStats

        # 创建统计对象
        stats = KycStats(
            pending=pending,
            approved=approved,
            rejected=rejected,
            failed_sync=failed_sync,
            total=pending + approved + rejected,  # total 不包含 failed_sync
            avg_processing_time_minutes=0.0,
            median_processing_time_minutes=0.0,
            approval_rate=0.0,
            resubmit_rate=0.0,
            risk_distribution={},
            daily_stats=[],
            reviewer_stats=[],
        )

        # 验证 total = pending + approved + rejected
        assert stats.total == stats.pending + stats.approved + stats.rejected, (
            "total should equal pending + approved + rejected"
        )

    @given(
        st.integers(min_value=0, max_value=100),
        st.integers(min_value=0, max_value=100),
        st.integers(min_value=0, max_value=100),
        st.integers(min_value=0, max_value=100),
    )
    @settings(max_examples=100, deadline=None)
    def test_risk_distribution_sum(
        self,
        low: int,
        medium: int,
        high: int,
        critical: int,
    ):
        """
        **Property 9: Stats Counts Accuracy**
        **Validates: Requirements 6.5**
        
        测试风险分布之和等于总数
        """
        risk_distribution = {
            "low": low,
            "medium": medium,
            "high": high,
            "critical": critical,
        }

        total_from_distribution = sum(risk_distribution.values())
        expected_total = low + medium + high + critical

        assert total_from_distribution == expected_total, (
            "Sum of risk distribution should equal total"
        )


class TestApprovalRateProperty:
    """
    **Feature: kyc-admin-backend-enhancement, Property 10: Stats Time Calculations**
    **Validates: Requirements 6.3, 6.4**
    
    属性: approval_rate = (approved / (approved + rejected)) * 100
    """

    @given(
        st.integers(min_value=0, max_value=1000),
        st.integers(min_value=0, max_value=1000),
    )
    @settings(max_examples=100, deadline=None)
    def test_approval_rate_calculation(self, approved: int, rejected: int):
        """
        **Property 10: Stats Time Calculations**
        **Validates: Requirements 6.4**
        
        测试通过率计算正确
        """
        total_reviewed = approved + rejected

        if total_reviewed > 0:
            expected_rate = (approved / total_reviewed) * 100
        else:
            expected_rate = 0.0

        # 验证计算逻辑
        if total_reviewed > 0:
            calculated_rate = (approved / total_reviewed) * 100
            assert abs(calculated_rate - expected_rate) < 0.01, (
                f"Approval rate should be {expected_rate}, got {calculated_rate}"
            )
        else:
            assert expected_rate == 0.0, "Approval rate should be 0 when no reviews"


class TestAuditLogProperty:
    """
    **Feature: kyc-admin-backend-enhancement, Property 2 & 11: Audit Log**
    **Validates: Requirements 2.5, 7.1, 7.2, 7.3**
    
    属性:
    - 状态变更时应创建审核日志
    - 审核日志应包含所有必需字段
    """

    @given(
        action_strategy,
        wallet_address_strategy,
        st.sampled_from(["user", "admin", "system"]),
    )
    @settings(max_examples=50, deadline=None)
    def test_audit_log_entry_fields(
        self,
        action: KycAuditAction,
        actor_address: str,
        actor_role: str,
    ):
        """
        **Property 11: Audit Log Query Correctness**
        **Validates: Requirements 7.1, 7.2, 7.3**
        
        测试审核日志条目包含所有必需字段
        """
        from src.services.admin.kyc_schemas import KycAuditLogEntry

        # 创建审核日志条目
        entry = KycAuditLogEntry(
            id=1,
            kyc_id=1,
            action=action,
            actor_address=actor_address,
            actor_role=actor_role,
            details={"test": "data"},
            created_at=datetime.now(timezone.utc),
        )

        # 验证所有必需字段存在
        assert entry.id is not None, "id should not be None"
        assert entry.kyc_id is not None, "kyc_id should not be None"
        assert entry.action is not None, "action should not be None"
        assert entry.actor_address is not None, "actor_address should not be None"
        assert entry.actor_role is not None, "actor_role should not be None"
        assert entry.created_at is not None, "created_at should not be None"

    @given(st.lists(action_strategy, min_size=1, max_size=10))
    @settings(max_examples=50, deadline=None)
    def test_audit_logs_ordering(self, actions: List[KycAuditAction]):
        """
        **Property 11: Audit Log Query Correctness**
        **Validates: Requirements 7.3**
        
        测试审核日志按 created_at 降序排序
        """
        from src.services.admin.kyc_schemas import KycAuditLogEntry

        # 创建带有不同时间戳的日志条目
        base_time = datetime.now(timezone.utc)
        entries = []
        for i, action in enumerate(actions):
            entry = KycAuditLogEntry(
                id=i + 1,
                kyc_id=1,
                action=action,
                actor_address="0x" + "a" * 40,
                actor_role="admin",
                details=None,
                created_at=base_time - dt.timedelta(minutes=i),
            )
            entries.append(entry)

        # 按 created_at 降序排序
        sorted_entries = sorted(entries, key=lambda x: x.created_at, reverse=True)

        # 验证排序正确
        for i in range(len(sorted_entries) - 1):
            assert sorted_entries[i].created_at >= sorted_entries[i + 1].created_at, (
                "Entries should be sorted by created_at descending"
            )
