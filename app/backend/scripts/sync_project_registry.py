#!/usr/bin/env python
"""
项目注册表同步脚本

将 config.dev.yaml 中的 project_registry.projects 配置同步到数据库

用法:
    cd app/backend
    source .venv/bin/activate
    PYTHONPATH=. python scripts/sync_project_registry.py [--project PROJECT] [--force]

参数:
    --project: 指定项目名称，不指定则同步所有项目
    --force: 强制覆盖已存在的配置
"""

import argparse
import asyncio
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from tortoise import Tortoise

from src.services.project_registry import get_config_loader
from src.shared.aerich_redirect import TORTOISE_ORM


async def sync_project(project_name: str, force: bool = False) -> dict:
    """同步单个项目配置到数据库"""
    loader = get_config_loader()
    
    print(f"\n{'='*60}")
    print(f"同步项目: {project_name}")
    print(f"{'='*60}")
    
    try:
        stats = await loader.sync_to_database(project_name, force=force)
        
        print(f"✅ 同步成功!")
        print(f"   - 新建: {stats['created']} 条")
        print(f"   - 更新: {stats['updated']} 条")
        print(f"   - 未变: {stats['unchanged']} 条")
        print(f"   - 合约: {', '.join(stats['contracts'])}")
        
        return stats
    except Exception as e:
        print(f"❌ 同步失败: {e}")
        raise


async def sync_all_projects(force: bool = False) -> dict:
    """同步所有项目配置到数据库"""
    loader = get_config_loader()
    projects = loader.list_projects()
    
    if not projects:
        print("⚠️ 未找到任何项目配置")
        return {"total": 0, "projects": []}
    
    print(f"\n发现 {len(projects)} 个项目: {', '.join(projects)}")
    
    results = {
        "total": len(projects),
        "success": 0,
        "failed": 0,
        "projects": [],
    }
    
    for project_name in projects:
        try:
            stats = await sync_project(project_name, force=force)
            results["success"] += 1
            results["projects"].append({
                "name": project_name,
                "status": "success",
                "stats": stats,
            })
        except Exception as e:
            results["failed"] += 1
            results["projects"].append({
                "name": project_name,
                "status": "failed",
                "error": str(e),
            })
    
    return results


async def main():
    parser = argparse.ArgumentParser(description="同步项目注册表配置到数据库")
    parser.add_argument(
        "--project", "-p",
        type=str,
        default=None,
        help="指定项目名称，不指定则同步所有项目"
    )
    parser.add_argument(
        "--force", "-f",
        action="store_true",
        help="强制覆盖已存在的配置"
    )
    parser.add_argument(
        "--list", "-l",
        action="store_true",
        help="仅列出可用项目，不执行同步"
    )
    
    args = parser.parse_args()
    
    # 初始化数据库连接
    print("正在连接数据库...")
    await Tortoise.init(config=TORTOISE_ORM)
    print("✅ 数据库连接成功")
    
    try:
        if args.list:
            # 仅列出项目
            loader = get_config_loader()
            projects = loader.list_projects()
            print(f"\n可用项目 ({len(projects)}):")
            for p in projects:
                print(f"  - {p}")
            return
        
        if args.project:
            # 同步指定项目
            await sync_project(args.project, force=args.force)
        else:
            # 同步所有项目
            results = await sync_all_projects(force=args.force)
            
            print(f"\n{'='*60}")
            print("同步完成汇总")
            print(f"{'='*60}")
            print(f"总计: {results['total']} 个项目")
            print(f"成功: {results['success']} 个")
            print(f"失败: {results['failed']} 个")
            
    finally:
        await Tortoise.close_connections()
        print("\n数据库连接已关闭")


if __name__ == "__main__":
    asyncio.run(main())
