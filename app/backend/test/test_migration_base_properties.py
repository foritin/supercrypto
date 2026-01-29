"""
迁移基础设施属性测试

使用 pytest + hypothesis 进行属性测试，验证迁移基础设施的核心正确性属性。

Feature: backend-model-refactoring
Property 10: dry-run 模式幂等性

**Validates: Requirements 6.2**
"""

import asyncio
import json
import os
import tempfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from hypothesis import given, settings, strategies as st, HealthCheck, assume

# 添加项目根目录到 path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.migrations.base import (
    MigrationBase,
    MigrationResult,
    MigrationStatus,
    BackupInfo,
)


def run_async(coro):
    """辅助函数：运行异步协程"""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


# ============ 测试数据生成策略 ============

# 表名策略
table_name_strategy = st.text(
    alphabet=st.characters(whitelist_categories=("Ll", "Nd"), whitelist_characters="_"),
    min_size=3,
    max_size=30,
).filter(lambda x: x and x[0].isalpha() and len(x) >= 3)

# 记录数策略
record_count_strategy = st.integers(min_value=0, max_value=100)

# 简单字段值策略
field_value_strategy = st.one_of(
    st.text(min_size=0, max_size=50),
    st.integers(min_value=-1000, max_value=1000),
    st.floats(min_value=-1000, max_value=1000, allow_nan=False, allow_infinity=False),
    st.booleans(),
    st.none(),
)

# 记录策略 (简单的键值对)
record_strategy = st.dictionaries(
    keys=st.text(
        alphabet=st.characters(whitelist_categories=("Ll",), whitelist_characters="_"),
        min_size=1,
        max_size=20,
    ).filter(lambda x: x and x[0].isalpha()),
    values=field_value_strategy,
    min_size=1,
    max_size=5,
)


# ============ 测试用迁移类 ============

class MockMigration(MigrationBase):
    """
    测试用迁移类
    
    用于验证 MigrationBase 的 dry-run 模式行为
    
    注意: 类名不能以 Test 开头，否则 pytest 会尝试将其作为测试类收集
    """
    
    name = "test_migration"
    description = "测试迁移"
    
    def __init__(
        self,
        dry_run: bool = False,
        skip_backup: bool = True,
        tables_to_backup: list[str] | None = None,
        records_to_migrate: int = 0,
        should_fail: bool = False,
        fail_message: str = "模拟迁移失败",
    ):
        super().__init__(dry_run=dry_run, skip_backup=skip_backup)
        self._tables_to_backup = tables_to_backup or []
        self._records_to_migrate = records_to_migrate
        self._should_fail = should_fail
        self._fail_message = fail_message
        self._migration_executed = False
        self._actual_changes_made = False
    
    def get_backup_tables(self) -> list[str]:
        return self._tables_to_backup
    
    async def migrate(self) -> MigrationResult:
        """
        模拟迁移逻辑
        
        在 dry-run 模式下，只统计要迁移的记录数，不执行实际变更
        在非 dry-run 模式下，模拟执行实际变更
        """
        result = MigrationResult(status=MigrationStatus.RUNNING)
        
        self._migration_executed = True
        
        if self._should_fail:
            result.add_error(self._fail_message)
            result.status = MigrationStatus.FAILED
            return result
        
        if self.dry_run:
            # dry-run 模式：只统计，不执行实际变更
            result.migrated_count = self._records_to_migrate
            result.status = MigrationStatus.DRY_RUN
            result.details["mode"] = "dry_run"
            result.details["would_migrate"] = self._records_to_migrate
        else:
            # 实际执行模式：模拟执行变更
            self._actual_changes_made = True
            result.migrated_count = self._records_to_migrate
            result.status = MigrationStatus.SUCCESS
            result.details["mode"] = "execute"
            result.details["migrated"] = self._records_to_migrate
        
        return result


class DatabaseStateMigration(MigrationBase):
    """
    带数据库状态跟踪的测试迁移类
    
    用于验证 dry-run 模式下数据库状态不变
    """
    
    name = "db_state_migration"
    description = "数据库状态测试迁移"
    
    def __init__(
        self,
        dry_run: bool = False,
        skip_backup: bool = True,
        initial_data: dict[str, list[dict]] | None = None,
    ):
        super().__init__(dry_run=dry_run, skip_backup=skip_backup)
        # 模拟数据库状态
        self._db_state: dict[str, list[dict]] = initial_data or {}
        self._initial_state_snapshot: dict[str, list[dict]] = {}
    
    def get_backup_tables(self) -> list[str]:
        return list(self._db_state.keys())
    
    def take_snapshot(self) -> dict[str, list[dict]]:
        """获取当前数据库状态快照"""
        return {
            table: [dict(row) for row in rows]
            for table, rows in self._db_state.items()
        }
    
    async def migrate(self) -> MigrationResult:
        """
        模拟迁移逻辑
        
        在 dry-run 模式下，不修改 _db_state
        在非 dry-run 模式下，修改 _db_state
        """
        result = MigrationResult(status=MigrationStatus.RUNNING)
        
        # 保存初始状态快照
        self._initial_state_snapshot = self.take_snapshot()
        
        total_records = sum(len(rows) for rows in self._db_state.values())
        
        if self.dry_run:
            # dry-run 模式：只统计，不修改数据
            result.migrated_count = total_records
            result.status = MigrationStatus.DRY_RUN
            result.details["mode"] = "dry_run"
            result.details["tables"] = list(self._db_state.keys())
            result.details["would_affect_records"] = total_records
        else:
            # 实际执行模式：修改数据
            for table, rows in self._db_state.items():
                for row in rows:
                    row["_migrated"] = True
                    row["_migrated_at"] = datetime.now(timezone.utc).isoformat()
            
            result.migrated_count = total_records
            result.status = MigrationStatus.SUCCESS
            result.details["mode"] = "execute"
            result.details["tables"] = list(self._db_state.keys())
            result.details["affected_records"] = total_records
        
        return result


# ============ 属性测试类 ============

class TestProperty10DryRunIdempotency:
    """
    Property 10: dry-run 模式幂等性
    
    *For any* 迁移脚本在 dry-run 模式下执行，数据库中的所有表数据应与执行前完全一致，
    不产生任何变更。
    
    **Validates: Requirements 6.2**
    """
    
    @given(
        records_to_migrate=st.integers(min_value=0, max_value=1000),
    )
    @settings(
        max_examples=50,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture],
    )
    def test_property_dry_run_does_not_execute_changes(
        self,
        records_to_migrate: int,
    ):
        """
        属性测试：dry-run 模式不执行实际变更
        
        验证：
        1. 给定任意数量的待迁移记录
        2. 在 dry-run 模式下执行迁移
        3. 迁移类的 _actual_changes_made 标志应为 False
        
        **Validates: Requirements 6.2**
        """
        # 创建 dry-run 模式的迁移
        migration = MockMigration(
            dry_run=True,
            skip_backup=True,
            records_to_migrate=records_to_migrate,
        )
        
        # Mock 数据库连接
        with patch.object(migration, "init_db", new=AsyncMock()), \
             patch.object(migration, "close_db", new=AsyncMock()), \
             patch.object(migration, "generate_report", new=AsyncMock(return_value="/tmp/report.md")):
            
            result = run_async(migration.run())
        
        # 验证属性：dry-run 模式下不执行实际变更
        assert migration._migration_executed is True, "迁移应该被执行"
        assert migration._actual_changes_made is False, (
            "dry-run 模式下不应该执行实际变更"
        )
        assert result.status == MigrationStatus.DRY_RUN, (
            f"状态应该是 DRY_RUN，但得到 {result.status}"
        )
        assert result.migrated_count == records_to_migrate, (
            f"迁移记录数应该是 {records_to_migrate}，但得到 {result.migrated_count}"
        )
    
    @given(
        table_data=st.dictionaries(
            keys=table_name_strategy,
            values=st.lists(record_strategy, min_size=0, max_size=10),
            min_size=1,
            max_size=3,
        ),
    )
    @settings(
        max_examples=30,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture],
    )
    def test_property_dry_run_preserves_database_state(
        self,
        table_data: dict[str, list[dict]],
    ):
        """
        属性测试：dry-run 模式保持数据库状态不变
        
        验证：
        1. 给定任意初始数据库状态
        2. 在 dry-run 模式下执行迁移
        3. 迁移后数据库状态应与迁移前完全一致
        
        **Validates: Requirements 6.2**
        """
        # 创建带初始数据的迁移
        migration = DatabaseStateMigration(
            dry_run=True,
            skip_backup=True,
            initial_data=table_data,
        )
        
        # 记录迁移前的状态
        state_before = migration.take_snapshot()
        
        # Mock 数据库连接
        with patch.object(migration, "init_db", new=AsyncMock()), \
             patch.object(migration, "close_db", new=AsyncMock()), \
             patch.object(migration, "generate_report", new=AsyncMock(return_value="/tmp/report.md")):
            
            result = run_async(migration.run())
        
        # 记录迁移后的状态
        state_after = migration.take_snapshot()
        
        # 验证属性：数据库状态应该完全一致
        assert state_before == state_after, (
            f"dry-run 模式下数据库状态应该保持不变\n"
            f"迁移前: {state_before}\n"
            f"迁移后: {state_after}"
        )
        
        # 验证没有添加 _migrated 标记
        for table, rows in state_after.items():
            for row in rows:
                assert "_migrated" not in row, (
                    f"dry-run 模式下不应该添加 _migrated 标记到表 {table}"
                )
                assert "_migrated_at" not in row, (
                    f"dry-run 模式下不应该添加 _migrated_at 标记到表 {table}"
                )
    
    @given(
        records_to_migrate=st.integers(min_value=1, max_value=100),
    )
    @settings(
        max_examples=30,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture],
    )
    def test_property_dry_run_vs_execute_mode_difference(
        self,
        records_to_migrate: int,
    ):
        """
        属性测试：dry-run 模式与执行模式的行为差异
        
        验证：
        1. 给定相同的迁移配置
        2. dry-run 模式不执行实际变更
        3. 执行模式执行实际变更
        4. 两种模式的迁移记录数相同
        
        **Validates: Requirements 6.2**
        """
        # 创建 dry-run 模式的迁移
        dry_run_migration = MockMigration(
            dry_run=True,
            skip_backup=True,
            records_to_migrate=records_to_migrate,
        )
        
        # 创建执行模式的迁移
        execute_migration = MockMigration(
            dry_run=False,
            skip_backup=True,
            records_to_migrate=records_to_migrate,
        )
        
        # Mock 数据库连接
        with patch.object(dry_run_migration, "init_db", new=AsyncMock()), \
             patch.object(dry_run_migration, "close_db", new=AsyncMock()), \
             patch.object(dry_run_migration, "generate_report", new=AsyncMock(return_value="/tmp/report.md")):
            
            dry_run_result = run_async(dry_run_migration.run())
        
        with patch.object(execute_migration, "init_db", new=AsyncMock()), \
             patch.object(execute_migration, "close_db", new=AsyncMock()), \
             patch.object(execute_migration, "generate_report", new=AsyncMock(return_value="/tmp/report.md")):
            
            execute_result = run_async(execute_migration.run())
        
        # 验证属性：两种模式的行为差异
        assert dry_run_migration._actual_changes_made is False, (
            "dry-run 模式不应该执行实际变更"
        )
        assert execute_migration._actual_changes_made is True, (
            "执行模式应该执行实际变更"
        )
        
        # 验证迁移记录数相同
        assert dry_run_result.migrated_count == execute_result.migrated_count, (
            f"两种模式的迁移记录数应该相同: "
            f"dry-run={dry_run_result.migrated_count}, "
            f"execute={execute_result.migrated_count}"
        )
        
        # 验证状态不同
        assert dry_run_result.status == MigrationStatus.DRY_RUN, (
            f"dry-run 模式状态应该是 DRY_RUN，但得到 {dry_run_result.status}"
        )
        assert execute_result.status == MigrationStatus.SUCCESS, (
            f"执行模式状态应该是 SUCCESS，但得到 {execute_result.status}"
        )
    
    @given(
        num_runs=st.integers(min_value=2, max_value=5),
        records_to_migrate=st.integers(min_value=0, max_value=100),
    )
    @settings(
        max_examples=20,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture],
    )
    def test_property_dry_run_multiple_executions_idempotent(
        self,
        num_runs: int,
        records_to_migrate: int,
    ):
        """
        属性测试：多次 dry-run 执行的幂等性
        
        验证：
        1. 给定任意数量的 dry-run 执行次数
        2. 每次执行后数据库状态应该保持一致
        3. 每次执行的结果应该相同
        
        **Validates: Requirements 6.2**
        """
        # 初始数据
        initial_data = {
            "test_table": [
                {"id": i, "value": f"value_{i}"}
                for i in range(records_to_migrate)
            ]
        }
        
        results = []
        states = []
        
        for _ in range(num_runs):
            # 每次创建新的迁移实例，但使用相同的初始数据
            migration = DatabaseStateMigration(
                dry_run=True,
                skip_backup=True,
                initial_data={
                    table: [dict(row) for row in rows]
                    for table, rows in initial_data.items()
                },
            )
            
            # Mock 数据库连接
            with patch.object(migration, "init_db", new=AsyncMock()), \
                 patch.object(migration, "close_db", new=AsyncMock()), \
                 patch.object(migration, "generate_report", new=AsyncMock(return_value="/tmp/report.md")):
                
                result = run_async(migration.run())
            
            results.append(result)
            states.append(migration.take_snapshot())
        
        # 验证属性：所有执行的结果应该相同
        for i, result in enumerate(results):
            assert result.status == MigrationStatus.DRY_RUN, (
                f"第 {i+1} 次执行的状态应该是 DRY_RUN"
            )
            assert result.migrated_count == results[0].migrated_count, (
                f"第 {i+1} 次执行的迁移记录数应该与第 1 次相同"
            )
        
        # 验证属性：所有执行后的状态应该相同
        for i, state in enumerate(states):
            assert state == states[0], (
                f"第 {i+1} 次执行后的状态应该与第 1 次相同"
            )
    
    @given(
        table_data=st.dictionaries(
            keys=table_name_strategy,
            values=st.lists(record_strategy, min_size=1, max_size=5),
            min_size=1,
            max_size=2,
        ),
    )
    @settings(
        max_examples=20,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture],
    )
    def test_property_dry_run_reports_correct_statistics(
        self,
        table_data: dict[str, list[dict]],
    ):
        """
        属性测试：dry-run 模式报告正确的统计信息
        
        验证：
        1. 给定任意初始数据
        2. dry-run 模式应该正确报告将要迁移的记录数
        3. 报告的统计信息应该与实际数据一致
        
        **Validates: Requirements 6.2**
        """
        # 创建迁移
        migration = DatabaseStateMigration(
            dry_run=True,
            skip_backup=True,
            initial_data=table_data,
        )
        
        # 计算预期的记录数
        expected_count = sum(len(rows) for rows in table_data.values())
        
        # Mock 数据库连接
        with patch.object(migration, "init_db", new=AsyncMock()), \
             patch.object(migration, "close_db", new=AsyncMock()), \
             patch.object(migration, "generate_report", new=AsyncMock(return_value="/tmp/report.md")):
            
            result = run_async(migration.run())
        
        # 验证属性：报告的统计信息正确
        assert result.migrated_count == expected_count, (
            f"报告的迁移记录数 ({result.migrated_count}) 应该等于实际记录数 ({expected_count})"
        )
        assert result.details.get("would_affect_records") == expected_count, (
            f"详情中的 would_affect_records ({result.details.get('would_affect_records')}) "
            f"应该等于实际记录数 ({expected_count})"
        )
        assert set(result.details.get("tables", [])) == set(table_data.keys()), (
            f"详情中的表列表应该与实际表列表一致"
        )


class TestDryRunModeBasicBehavior:
    """
    dry-run 模式基本行为测试
    
    验证 MigrationBase 的 dry-run 模式基本功能
    """
    
    def test_dry_run_flag_is_set_correctly(self):
        """测试 dry_run 标志正确设置"""
        dry_run_migration = MockMigration(dry_run=True)
        execute_migration = MockMigration(dry_run=False)
        
        assert dry_run_migration.dry_run is True
        assert execute_migration.dry_run is False
    
    def test_dry_run_result_status(self):
        """测试 dry-run 模式返回正确的状态"""
        migration = MockMigration(dry_run=True, records_to_migrate=10)
        
        with patch.object(migration, "init_db", new=AsyncMock()), \
             patch.object(migration, "close_db", new=AsyncMock()), \
             patch.object(migration, "generate_report", new=AsyncMock(return_value="/tmp/report.md")):
            
            result = run_async(migration.run())
        
        assert result.status == MigrationStatus.DRY_RUN
        assert result.is_success is True
    
    def test_dry_run_does_not_create_backup(self):
        """测试 dry-run 模式不创建备份"""
        migration = MockMigration(
            dry_run=True,
            skip_backup=False,  # 即使不跳过备份
            tables_to_backup=["test_table"],
        )
        
        backup_created = False
        
        async def mock_create_backup():
            nonlocal backup_created
            backup_created = True
            return None
        
        with patch.object(migration, "init_db", new=AsyncMock()), \
             patch.object(migration, "close_db", new=AsyncMock()), \
             patch.object(migration, "create_backup", new=mock_create_backup), \
             patch.object(migration, "generate_report", new=AsyncMock(return_value="/tmp/report.md")):
            
            result = run_async(migration.run())
        
        # dry-run 模式下不应该创建备份
        assert backup_created is False, "dry-run 模式下不应该创建备份"
    
    def test_dry_run_result_details_contain_mode(self):
        """测试 dry-run 结果详情包含模式信息"""
        migration = MockMigration(dry_run=True, records_to_migrate=5)
        
        with patch.object(migration, "init_db", new=AsyncMock()), \
             patch.object(migration, "close_db", new=AsyncMock()), \
             patch.object(migration, "generate_report", new=AsyncMock(return_value="/tmp/report.md")):
            
            result = run_async(migration.run())
        
        assert "mode" in result.details
        assert result.details["mode"] == "dry_run"


class TestMigrationResultDataClass:
    """
    MigrationResult 数据类测试
    """
    
    def test_migration_result_default_values(self):
        """测试 MigrationResult 默认值"""
        result = MigrationResult(status=MigrationStatus.PENDING)
        
        assert result.status == MigrationStatus.PENDING
        assert result.migrated_count == 0
        assert result.skipped_count == 0
        assert result.error_count == 0
        assert result.duration_seconds == 0.0
        assert result.errors == []
        assert result.warnings == []
        assert result.details == {}
        assert result.backup_info is None
    
    def test_migration_result_add_error(self):
        """测试添加错误"""
        result = MigrationResult(status=MigrationStatus.RUNNING)
        
        result.add_error("错误1")
        result.add_error("错误2")
        
        assert len(result.errors) == 2
        assert result.error_count == 2
        assert "错误1" in result.errors
        assert "错误2" in result.errors
    
    def test_migration_result_add_warning(self):
        """测试添加警告"""
        result = MigrationResult(status=MigrationStatus.RUNNING)
        
        result.add_warning("警告1")
        result.add_warning("警告2")
        
        assert len(result.warnings) == 2
        assert "警告1" in result.warnings
        assert "警告2" in result.warnings
    
    def test_migration_result_is_success(self):
        """测试 is_success 属性"""
        success_result = MigrationResult(status=MigrationStatus.SUCCESS)
        dry_run_result = MigrationResult(status=MigrationStatus.DRY_RUN)
        failed_result = MigrationResult(status=MigrationStatus.FAILED)
        rolled_back_result = MigrationResult(status=MigrationStatus.ROLLED_BACK)
        
        assert success_result.is_success is True
        assert dry_run_result.is_success is True
        assert failed_result.is_success is False
        assert rolled_back_result.is_success is False
    
    def test_migration_result_to_dict(self):
        """测试转换为字典"""
        result = MigrationResult(
            status=MigrationStatus.SUCCESS,
            migrated_count=10,
            skipped_count=2,
            error_count=1,
            duration_seconds=5.5,
            errors=["error1"],
            warnings=["warning1"],
            details={"key": "value"},
        )
        
        result_dict = result.to_dict()
        
        assert result_dict["status"] == "success"
        assert result_dict["migrated_count"] == 10
        assert result_dict["skipped_count"] == 2
        assert result_dict["error_count"] == 1
        assert result_dict["duration_seconds"] == 5.5
        assert result_dict["errors"] == ["error1"]
        assert result_dict["warnings"] == ["warning1"]
        assert result_dict["details"] == {"key": "value"}


class TestBackupInfoDataClass:
    """
    BackupInfo 数据类测试
    """
    
    def test_backup_info_to_dict(self):
        """测试转换为字典"""
        backup_time = datetime(2024, 1, 15, 10, 30, 0, tzinfo=timezone.utc)
        backup_info = BackupInfo(
            backup_path="/tmp/backup",
            backup_time=backup_time,
            tables=["table1", "table2"],
            record_counts={"table1": 10, "table2": 20},
        )
        
        info_dict = backup_info.to_dict()
        
        assert info_dict["backup_path"] == "/tmp/backup"
        assert info_dict["backup_time"] == backup_time.isoformat()
        assert info_dict["tables"] == ["table1", "table2"]
        assert info_dict["record_counts"] == {"table1": 10, "table2": 20}
    
    def test_backup_info_from_dict(self):
        """测试从字典创建"""
        backup_time = datetime(2024, 1, 15, 10, 30, 0, tzinfo=timezone.utc)
        data = {
            "backup_path": "/tmp/backup",
            "backup_time": backup_time.isoformat(),
            "tables": ["table1", "table2"],
            "record_counts": {"table1": 10, "table2": 20},
        }
        
        backup_info = BackupInfo.from_dict(data)
        
        assert backup_info.backup_path == "/tmp/backup"
        assert backup_info.backup_time == backup_time
        assert backup_info.tables == ["table1", "table2"]
        assert backup_info.record_counts == {"table1": 10, "table2": 20}
