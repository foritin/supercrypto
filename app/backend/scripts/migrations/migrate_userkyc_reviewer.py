#!/usr/bin/env python3
"""
UserKyc reviewer_id → reviewer_address 迁移脚本
================================================

将 UserKyc 表中的 reviewer_id 字段数据迁移到 reviewer_address 字段。

迁移逻辑:
- 如果 reviewer_id 有值但 reviewer_address 为空
- 通过 Account 表查找对应的 address
- 填充到 reviewer_address 字段

Usage:
    # 预览模式
    cd app/backend && source .venv/bin/activate
    PYTHONPATH=. python scripts/migrations/migrate_userkyc_reviewer.py --dry-run
    
    # 执行迁移
    PYTHONPATH=. python scripts/migrations/migrate_userkyc_reviewer.py

Requirements: 2.3, 2.4
"""

import sys
from pathlib import Path

# 添加项目根目录到 path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from falib.utils.log import get_logger
from scripts.migrations.base import MigrationBase, MigrationResult, MigrationStatus

logger = get_logger("supercrypto.migration.userkyc_reviewer")


class MigrateUserKycReviewer(MigrationBase):
    """UserKyc reviewer_id → reviewer_address 迁移"""
    
    name = "migrate_userkyc_reviewer"
    description = "将 UserKyc.reviewer_id 数据迁移到 reviewer_address 字段"
    
    def get_backup_tables(self) -> list[str]:
        """需要备份的表"""
        return ["user_kyc"]
    
    async def migrate(self) -> MigrationResult:
        """执行迁移"""
        from src.models.account import Account
        from src.models.kyc import UserKyc
        
        result = MigrationResult(status=MigrationStatus.RUNNING)
        
        # 查找需要迁移的记录:
        # reviewer_id 有值 且 reviewer_address 为空
        records_to_migrate = await UserKyc.filter(
            reviewer_id__isnull=False,
            reviewer_address__isnull=True,
        ).all()
        
        # 也包括 reviewer_address 为空字符串的情况
        records_with_empty_address = await UserKyc.filter(
            reviewer_id__isnull=False,
            reviewer_address="",
        ).all()
        
        # 合并去重
        all_records = {r.id: r for r in records_to_migrate}
        for r in records_with_empty_address:
            all_records[r.id] = r
        
        records = list(all_records.values())
        
        logger.info(f"找到 {len(records)} 条需要迁移的记录")
        result.details["total_records"] = len(records)
        
        if not records:
            result.status = MigrationStatus.SUCCESS
            result.details["message"] = "没有需要迁移的记录"
            return result
        
        # 收集所有需要查询的 reviewer_id
        reviewer_ids = list(set(r.reviewer_id for r in records if r.reviewer_id))
        
        # 批量查询 Account 表
        accounts = await Account.filter(id__in=reviewer_ids).all()
        account_map = {a.id: a.address for a in accounts}
        
        logger.info(f"找到 {len(account_map)} 个对应的 Account 记录")
        result.details["found_accounts"] = len(account_map)
        
        # 执行迁移
        migrated_count = 0
        skipped_count = 0
        
        for record in records:
            reviewer_id = record.reviewer_id
            
            if reviewer_id not in account_map:
                # 找不到对应的 Account
                result.add_warning(
                    f"UserKyc(id={record.id}): reviewer_id={reviewer_id} 对应的 Account 不存在"
                )
                skipped_count += 1
                continue
            
            address = account_map[reviewer_id]
            
            if self.dry_run:
                logger.info(
                    f"[DRY-RUN] UserKyc(id={record.id}): "
                    f"reviewer_id={reviewer_id} → reviewer_address={address}"
                )
            else:
                record.reviewer_address = address.lower()
                await record.save(update_fields=["reviewer_address"])
                logger.info(
                    f"UserKyc(id={record.id}): "
                    f"reviewer_id={reviewer_id} → reviewer_address={address}"
                )
            
            migrated_count += 1
        
        result.migrated_count = migrated_count
        result.skipped_count = skipped_count
        
        if self.dry_run:
            result.status = MigrationStatus.DRY_RUN
        else:
            result.status = MigrationStatus.SUCCESS
        
        result.details["migrated"] = migrated_count
        result.details["skipped"] = skipped_count
        
        return result


if __name__ == "__main__":
    MigrateUserKycReviewer.run_cli()
