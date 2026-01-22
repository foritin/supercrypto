#!/usr/bin/env python3
"""
工具脚本: 迁移媒体类型枚举值
============================

用途:
将旧的媒体类型迁移为新的 MVP 核心类型

背景:
根据枚举同步规范 (enum-synchronization)，MediaType 枚举移除了
image、evaluation、document 类型，统一使用 MVP 核心类型代替。

迁移映射:
- image -> gallery
- evaluation -> valuation
- document -> legal

Usage:
    cd app/backend
    source .venv/bin/activate
    
    # 预览模式 (不执行实际更新)
    PYTHONPATH=. python scripts/migrate_media_types.py --dry-run
    
    # 执行迁移
    PYTHONPATH=. python scripts/migrate_media_types.py

Requirements: 12.3, 12.4, 12.5
"""

import argparse
import asyncio
import sys
from pathlib import Path

# 添加项目根目录到 path
sys.path.insert(0, str(Path(__file__).parent.parent))

from tortoise import Tortoise
from tortoise.connection import connections

from src.shared.aerich_redirect import TORTOISE_ORM


# 旧类型 -> 新类型 映射
MIGRATION_MAPPING = {
    "image": "gallery",
    "evaluation": "valuation",
    "document": "legal",
}

# 表名
TABLE_NAME = "asset_media"


async def migrate_media_types(dry_run: bool = False) -> dict[str, int]:
    """
    执行媒体类型迁移
    
    使用原始 SQL 查询，避免模型加载时的枚举验证问题。
    
    Args:
        dry_run: 如果为 True，只预览不执行
        
    Returns:
        dict: {旧类型: 迁移记录数量}
    """
    conn = connections.get("default")
    results = {}
    
    for old_type, new_type in MIGRATION_MAPPING.items():
        # 使用原始 SQL 统计记录数 (PostgreSQL 使用 $1 作为参数占位符)
        count_sql = f"SELECT COUNT(*) as cnt FROM {TABLE_NAME} WHERE media_type = $1"
        count_result = await conn.execute_query_dict(count_sql, [old_type])
        count = count_result[0]["cnt"] if count_result else 0
        results[old_type] = count
        
        if count > 0:
            if dry_run:
                print(f"  📋 [预览] {old_type} -> {new_type}: {count} 条记录")
                # 显示部分记录详情
                detail_sql = f"SELECT id, asset_id, title FROM {TABLE_NAME} WHERE media_type = $1 LIMIT 3"
                details = await conn.execute_query_dict(detail_sql, [old_type])
                for record in details:
                    print(f"      - ID: {record['id']}, Asset: {record['asset_id']}, Title: {record['title']}")
                if count > 3:
                    print(f"      ... 还有 {count - 3} 条记录")
            else:
                # 执行批量更新
                update_sql = f"UPDATE {TABLE_NAME} SET media_type = $1 WHERE media_type = $2"
                await conn.execute_query(update_sql, [new_type, old_type])
                print(f"  ✅ {old_type} -> {new_type}: {count} 条记录已迁移")
        else:
            print(f"  ⏭️  {old_type}: 无需迁移 (0 条记录)")
    
    return results


def get_minimal_db_config() -> dict:
    """
    获取最小化数据库配置（不加载模型）
    
    这样可以避免模型加载时的枚举验证问题。
    """
    # 从原始配置中提取数据库连接信息
    original_config = TORTOISE_ORM
    db_url = original_config.get("connections", {}).get("default")
    
    return {
        "connections": {
            "default": db_url
        },
        "apps": {
            "models": {
                "models": [],  # 不加载任何模型
                "default_connection": "default",
            }
        },
    }


async def main(dry_run: bool = False):
    """主函数"""
    print("=" * 60)
    print("📦 媒体类型迁移脚本")
    print("=" * 60)
    
    if dry_run:
        print("🔍 模式: 预览 (dry-run)")
    else:
        print("⚡ 模式: 执行迁移")
    
    print("-" * 60)
    
    # 初始化数据库连接（使用最小配置，不加载模型）
    try:
        minimal_config = get_minimal_db_config()
        await Tortoise.init(config=minimal_config)
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
        results = await migrate_media_types(dry_run=dry_run)
        
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
        description="迁移媒体类型枚举值 (image->gallery, evaluation->valuation, document->legal)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="预览模式，不执行实际更新"
    )
    
    args = parser.parse_args()
    
    exit_code = asyncio.run(main(dry_run=args.dry_run))
    sys.exit(exit_code)
