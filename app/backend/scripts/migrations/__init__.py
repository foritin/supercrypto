"""
数据迁移脚本包
==============

提供数据迁移基础设施，支持:
- dry-run 模式预览变更
- 数据备份和恢复
- 自动回滚
- 迁移报告生成

Usage:
    from scripts.migrations.base import MigrationBase
    
    class MyMigration(MigrationBase):
        name = "my_migration"
        description = "迁移描述"
        
        async def migrate(self) -> MigrationResult:
            # 实现迁移逻辑
            pass
"""

from scripts.migrations.base import (
    MigrationBase,
    MigrationResult,
    MigrationStatus,
    BackupInfo,
)

__all__ = [
    "MigrationBase",
    "MigrationResult",
    "MigrationStatus",
    "BackupInfo",
]
