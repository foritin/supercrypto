#!/usr/bin/env python3
"""
工具脚本: 迁移交易类型枚举值
============================

用途:
将旧的交易类型 (swap, contract) 迁移为 other

背景:
根据枚举同步规范 (enum-synchronization)，TransactionType 枚举移除了
swap 和 contract 类型，统一使用 other 代替。

Usage:
    cd app/backend
    source .venv/bin/activate
    
    # 预览模式 (不执行实际更新)
    PYTHONPATH=. python scripts/migrate_transaction_types.py --dry-run
    
    # 执行迁移
    PYTHONPATH=. python scripts/migrate_transaction_types.py

Requirements: 12.2
"""

import argparse
import asyncio
import sys
from pathlib import Path

# 添加项目根目录到 path
sys.path.insert(0, str(Path(__file__).parent.parent))

from tortoise import Tortoise
from tortoise.expressions import Q

from src.shared.aerich_redirect import TORTOISE_ORM


# 旧类型 -> 新类型 映射
MIGRATION_MAPPING = {
    "swap": "other",
    "contract": "other",
}


async def count_records_to_migrate() -> dict[str, int]:
    """
    统计需要迁移的记录数量
    
    Returns:
        dict: {旧类型: 记录数量}
    """
    from src.models.transaction import Transaction
    
    counts = {}
    for old_type in MIGRATION_MAPPING.keys():
        # 使用原始 SQL 查询，因为枚举可能已经不包含旧值
        count = await Transaction.filter(tx_type=old_type).count()
        counts[old_type] = count
    
    return counts


async def migrate_transaction_types(dry_run: bool = False) -> dict[str, int]:
    """
    执行交易类型迁移
    
    Args:
        dry_run: 如果为 True，只预览不执行
        
    Returns:
        dict: {旧类型: 迁移记录数量}
    """
    from src.models.transaction import Transaction
    
    results = {}
    
    for old_type, new_type in MIGRATION_MAPPING.items():
        # 查询需要迁移的记录
        records = await Transaction.filter(tx_type=old_type).all()
        count = len(records)
        results[old_type] = count
        
        if count > 0:
            if dry_run:
                print(f"  📋 [预览] {old_type} -> {new_type}: {count} 条记录")
            else:
                # 执行批量更新
                await Transaction.filter(tx_type=old_type).update(tx_type=new_type)
                print(f"  ✅ {old_type} -> {new_type}: {count} 条记录已迁移")
        else:
            print(f"  ⏭️  {old_type}: 无需迁移 (0 条记录)")
    
    return results


async def main(dry_run: bool = False):
    """主函数"""
    print("=" * 60)
    print("📦 交易类型迁移脚本")
    print("=" * 60)
    
    if dry_run:
        print("🔍 模式: 预览 (dry-run)")
    else:
        print("⚡ 模式: 执行迁移")
    
    print("-" * 60)
    
    # 初始化数据库连接
    try:
        await Tortoise.init(config=TORTOISE_ORM)
        print("✅ 数据库连接成功")
    except Exception as e:
        print(f"❌ 数据库连接失败: {e}")
        return 1
    
    print("-" * 60)
    print("📊 迁移映射:")
    for old_type, new_type in MIGRATION_MAPPING.items():
        print(f"  • {old_type} -> {new_type}")
    
    print("-" * 60)
    print("🔄 开始迁移...")
    
    try:
        results = await migrate_transaction_types(dry_run=dry_run)
        
        print("-" * 60)
        total = sum(results.values())
        
        if dry_run:
            print(f"📊 预览完成: 共 {total} 条记录需要迁移")
            if total > 0:
                print("\n💡 提示: 移除 --dry-run 参数执行实际迁移")
        else:
            print(f"📊 迁移完成: 共 {total} 条记录已迁移")
        
    except Exception as e:
        print(f"❌ 迁移失败: {e}")
        import traceback
        traceback.print_exc()
        return 1
    finally:
        await Tortoise.close_connections()
        print("✅ 数据库连接已关闭")
    
    print("=" * 60)
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="迁移交易类型枚举值 (swap/contract -> other)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="预览模式，不执行实际更新"
    )
    
    args = parser.parse_args()
    
    exit_code = asyncio.run(main(dry_run=args.dry_run))
    sys.exit(exit_code)
