#!/usr/bin/env python3
"""
Wallet → Account 数据迁移脚本
=============================

将 Wallet 表数据迁移到 Account 表。

迁移逻辑:
1. 遍历所有 Wallet 记录
2. 通过 address + network 匹配对应的 Account 记录
3. 将 Wallet 的 encrypted_private_key, balance, is_active 字段迁移到 Account
4. 如果 Account 不存在，记录警告

Requirements: 4.3

Usage:
    # 预览模式
    cd app/backend && source .venv/bin/activate
    PYTHONPATH=. python scripts/migrations/migrate_wallet_to_account.py --dry-run
    
    # 执行迁移
    PYTHONPATH=. python scripts/migrations/migrate_wallet_to_account.py
"""

import sys
from pathlib import Path

# 添加项目根目录到 path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from scripts.migrations.base import MigrationBase, MigrationResult, MigrationStatus


class MigrateWalletToAccount(MigrationBase):
    """Wallet → Account 数据迁移"""
    
    name = "migrate_wallet_to_account"
    description = "将 Wallet 表数据迁移到 Account 表"
    
    def get_backup_tables(self) -> list[str]:
        """需要备份的表"""
        return ["wallet", "account"]
    
    async def migrate(self) -> MigrationResult:
        """执行迁移"""
        from src.models.account import Account
        from src.models.wallet import Wallet
        
        result = MigrationResult(status=MigrationStatus.RUNNING)
        
        # 统计信息
        stats = {
            "total_wallets": 0,
            "wallets_migrated": 0,
            "wallets_skipped_no_account": 0,
            "wallets_skipped_already_migrated": 0,
            "accounts_updated": 0,
        }
        
        # 获取所有 Wallet 记录
        wallets = await Wallet.all()
        stats["total_wallets"] = len(wallets)
        
        for wallet in wallets:
            # 通过 address + network 查找对应的 Account
            account = await Account.filter(
                address=wallet.address,
                network=wallet.network,
            ).first()
            
            if not account:
                # 尝试只通过 address 查找
                account = await Account.filter(address=wallet.address).first()
                
                if not account:
                    stats["wallets_skipped_no_account"] += 1
                    result.add_warning(
                        f"Wallet {wallet.id} (address={wallet.address}, network={wallet.network}) "
                        f"没有对应的 Account 记录"
                    )
                    result.skipped_count += 1
                    continue
            
            # 检查 Account 是否已有钱包数据
            if account.encrypted_private_key and account.encrypted_private_key != wallet.encrypted_private_key:
                stats["wallets_skipped_already_migrated"] += 1
                result.add_warning(
                    f"Account {account.id} (address={account.address}) "
                    f"已有 encrypted_private_key，跳过迁移"
                )
                result.skipped_count += 1
                continue
            
            # 迁移数据
            if not self.dry_run:
                account.encrypted_private_key = wallet.encrypted_private_key
                account.balance = wallet.balance
                account.is_active = wallet.is_active
                await account.save()
            
            stats["wallets_migrated"] += 1
            stats["accounts_updated"] += 1
            result.migrated_count += 1
        
        # 设置详细信息
        result.details = stats
        
        # 设置状态
        if self.dry_run:
            result.status = MigrationStatus.DRY_RUN
        elif result.error_count == 0:
            result.status = MigrationStatus.SUCCESS
        else:
            result.status = MigrationStatus.FAILED
        
        return result


if __name__ == "__main__":
    MigrateWalletToAccount.run_cli()
