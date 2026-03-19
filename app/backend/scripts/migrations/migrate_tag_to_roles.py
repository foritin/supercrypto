#!/usr/bin/env python3
"""
Account 模型数据迁移脚本
将 tag 字段迁移到 roles 数组字段

Usage:
    python scripts/migrations/migrate_tag_to_roles.py [--dry-run]

Options:
    --dry-run  仅预览变更，不实际执行
"""

import argparse
import asyncio
import sys
from pathlib import Path

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.models.account import Account
from falib.utils.db import init_db, close_db

# 预定义角色列表 (来自 PRD)
ACCOUNT_ROLES = [
    "admin",
    "treasury", 
    "multisig_signer",
    "contract_owner",  # 包含部署和合约所有权管理
]


async def migrate_tag_to_roles(dry_run: bool = False):
    """
    迁移 tag 到 roles
    
    迁移策略:
    1. 如果 tag 存在且不为空 -> 添加到 roles
    2. 如果 is_deployer = True -> 添加 "contract_owner" 到 roles
    3. 移除无效的 tag 值
    """
    
    print("=" * 60)
    print("Account 模型迁移: tag -> roles")
    print("=" * 60)
    print(f"Mode: {'DRY RUN (preview only)' if dry_run else 'EXECUTE'}")
    print()
    
    # 初始化数据库
    await init_db()
    
    try:
        # 获取所有账户
        accounts = await Account.all()
        print(f"Total accounts: {len(accounts)}")
        print()
        
        migrated_count = 0
        skipped_count = 0
        
        for account in accounts:
            address = account.address[:20] + "..."
            old_tag = getattr(account, 'tag', None)
            old_roles = account.roles if account.roles else []
            
            new_roles = list(old_roles) if old_roles else []
            
            # 1. 迁移 tag -> roles
            if old_tag and old_tag.strip():
                tag_value = old_tag.strip()
                # 只保留有效的角色值
                if tag_value in ACCOUNT_ROLES:
                    if tag_value not in new_roles:
                        new_roles.append(tag_value)
                        print(f"  [MIGRATE] {address}: add role '{tag_value}' from tag")
                else:
                    print(f"  [SKIP] {address}: tag '{tag_value}' not in valid roles")
            
            # 2. 处理 is_deployer
            if getattr(account, 'is_deployer', False):
                if "contract_owner" not in new_roles:
                    new_roles.append("contract_owner")
                    print(f"  [MIGRATE] {address}: add role 'contract_owner' from is_deployer")
            
            # 去重并排序
            new_roles = sorted(list(set(new_roles)))
            
            # 检查是否有变更
            if new_roles != old_roles:
                print(f"  {address}: {old_roles} -> {new_roles}")
                
                if not dry_run:
                    account.roles = new_roles
                    await account.save()
                    migrated_count += 1
            else:
                skipped_count += 1
        
        print()
        print("=" * 60)
        print("Migration Summary")
        print("=" * 60)
        print(f"Total accounts: {len(accounts)}")
        print(f"Migrated: {migrated_count}")
        print(f"Skipped (no change): {skipped_count}")
        
        if dry_run:
            print("\n[DRY RUN] No changes were actually made.")
            print("Run without --dry-run to execute migration.")
        else:
            print("\n[MIGRATION COMPLETE]")
        
    finally:
        await close_db()


def main():
    parser = argparse.ArgumentParser(
        description="Migrate Account model from tag to roles"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without executing"
    )
    args = parser.parse_args()
    
    asyncio.run(migrate_tag_to_roles(dry_run=args.dry_run))


if __name__ == "__main__":
    main()
