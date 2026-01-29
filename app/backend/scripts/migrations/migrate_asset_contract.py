#!/usr/bin/env python3
"""
Asset 合约地址迁移脚本
======================

将 Asset.contract_address 数据迁移到 AssetContractBinding 表。

迁移逻辑:
1. 遍历所有 Asset 记录
2. 如果 contract_address 不为空，创建 AssetContractBinding 记录 (is_primary=True)
3. 跳过已存在的绑定记录

Requirements: 5.1

Usage:
    # 预览模式
    cd app/backend && source .venv/bin/activate
    PYTHONPATH=. python scripts/migrations/migrate_asset_contract.py --dry-run
    
    # 执行迁移
    PYTHONPATH=. python scripts/migrations/migrate_asset_contract.py
"""

import sys
from pathlib import Path

# 添加项目根目录到 path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from scripts.migrations.base import MigrationBase, MigrationResult, MigrationStatus


class MigrateAssetContract(MigrationBase):
    """Asset 合约地址迁移"""
    
    name = "migrate_asset_contract"
    description = "将 Asset.contract_address 迁移到 AssetContractBinding 表"
    
    def get_backup_tables(self) -> list[str]:
        """需要备份的表"""
        return ["asset", "asset_contract_binding"]
    
    async def migrate(self) -> MigrationResult:
        """执行迁移"""
        from src.models.asset import Asset, AssetContractBinding
        
        result = MigrationResult(status=MigrationStatus.RUNNING)
        
        # 统计信息
        stats = {
            "total_assets": 0,
            "assets_with_contract": 0,
            "bindings_created": 0,
            "bindings_skipped": 0,
            "assets_without_contract": 0,
        }
        
        # 获取所有 Asset 记录
        assets = await Asset.all()
        stats["total_assets"] = len(assets)
        
        for asset in assets:
            # 检查是否有 contract_address
            if not asset.contract_address:
                stats["assets_without_contract"] += 1
                result.skipped_count += 1
                continue
            
            stats["assets_with_contract"] += 1
            
            # 检查是否已存在绑定记录
            existing_binding = await AssetContractBinding.filter(
                asset_id=asset.id,
                contract_address=asset.contract_address,
            ).first()
            
            if existing_binding:
                stats["bindings_skipped"] += 1
                result.skipped_count += 1
                result.add_warning(
                    f"Asset {asset.id} ({asset.name}) 已存在绑定记录，跳过"
                )
                continue
            
            # 检查是否已有主合约绑定
            existing_primary = await AssetContractBinding.filter(
                asset_id=asset.id,
                is_primary=True,
            ).first()
            
            if existing_primary:
                # 如果已有主合约但地址不同，记录警告
                if existing_primary.contract_address != asset.contract_address:
                    result.add_warning(
                        f"Asset {asset.id} ({asset.name}) 已有主合约 "
                        f"{existing_primary.contract_address}，"
                        f"但 Asset.contract_address 为 {asset.contract_address}"
                    )
                stats["bindings_skipped"] += 1
                result.skipped_count += 1
                continue
            
            # 创建绑定记录
            if not self.dry_run:
                await AssetContractBinding.create(
                    asset_id=asset.id,
                    contract_name=f"{asset.symbol}Token" if asset.symbol else "RWAToken",
                    contract_address=asset.contract_address,
                    contract_type="project",
                    is_primary=True,
                )
            
            stats["bindings_created"] += 1
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
    MigrateAssetContract.run_cli()
