#!/usr/bin/env python3
"""
清理 Asset 和 AssetPriceHistory 数据

Usage:
    cd app/backend
    source ../../.venv/bin/activate
    python scripts/clean_asset_data.py
    
    # 自动确认清理（非交互式）
    python scripts/clean_asset_data.py --yes
"""

import argparse
import asyncio
import sys
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from tortoise import Tortoise

from src.shared.aerich_redirect import TORTOISE_ORM


async def clean_data(auto_confirm: bool = False):
    """清理 asset 和 asset_price_history 数据"""
    
    # 初始化数据库连接
    await Tortoise.init(config=TORTOISE_ORM)
    
    try:
        from src.models.asset import Asset, AssetPriceHistory, AssetContractBinding
        
        # 统计当前数据
        asset_count = await Asset.all().count()
        price_history_count = await AssetPriceHistory.all().count()
        binding_count = await AssetContractBinding.all().count()
        
        print(f"📊 当前数据统计:")
        print(f"   - Asset: {asset_count} 条")
        print(f"   - AssetPriceHistory: {price_history_count} 条")
        print(f"   - AssetContractBinding: {binding_count} 条")
        
        if asset_count == 0 and price_history_count == 0 and binding_count == 0:
            print("\n✅ 数据已经是空的，无需清理")
            return
        
        # 确认清理
        if not auto_confirm:
            print(f"\n⚠️  即将清理以上所有数据...")
            confirm = input("确认清理? (输入 'yes' 确认): ")
            
            if confirm.lower() != 'yes':
                print("❌ 已取消清理")
                return
        else:
            print(f"\n⚠️  自动确认模式，即将清理以上所有数据...")
        
        # 按顺序清理（先清理有外键引用的表）
        print("\n🗑️  正在清理数据...")
        
        # 1. 清理价格历史
        deleted_history = await AssetPriceHistory.all().delete()
        print(f"   - 已删除 AssetPriceHistory: {deleted_history} 条")
        
        # 2. 清理合约绑定
        deleted_bindings = await AssetContractBinding.all().delete()
        print(f"   - 已删除 AssetContractBinding: {deleted_bindings} 条")
        
        # 3. 清理资产
        deleted_assets = await Asset.all().delete()
        print(f"   - 已删除 Asset: {deleted_assets} 条")
        
        print("\n✅ 数据清理完成!")
        
    finally:
        await Tortoise.close_connections()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="清理 Asset 和 AssetPriceHistory 数据")
    parser.add_argument("--yes", "-y", action="store_true", help="自动确认清理（非交互式）")
    args = parser.parse_args()
    
    asyncio.run(clean_data(auto_confirm=args.yes))

