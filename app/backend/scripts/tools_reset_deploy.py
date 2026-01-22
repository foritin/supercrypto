#!/usr/bin/env python3
"""
重置部署记录
============

清理数据库中的合约部署相关记录，用于重新部署测试。

清理的表:
    - contract: 合约部署记录
    - contract_dependency: 合约依赖关系
    - contract_meta: 合约元数据
    - provider_registry: Provider 注册状态
    - project_contract_config: 项目合约配置
    - contract_deployment_status: 合约部署状态
    - asset: 清除合约绑定字段 (project, contract_address)
    - asset_contract_binding: 资产-合约绑定关系

Usage:
    python scripts/reset_deploy.py

    # 指定项目清理
    python scripts/reset_deploy.py --project vanke
    python scripts/reset_deploy.py --project common

    # 清理所有
    python scripts/reset_deploy.py --all
"""

import argparse
import asyncio
import os
import sys
from pathlib import Path

# 添加 backend 目录到 path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

# 设置工作目录
os.chdir(backend_dir)

# ruff: noqa: E402  # 必须在 sys.path 设置后导入
from tortoise import Tortoise

from src.models.asset import Asset, AssetContractBinding
from src.models.contracts import Contract, ContractDependency, ContractMeta
from src.models.contracts.provider_registry import ProviderRegistry
from src.models.project_registry import ContractDeploymentStatus, ProjectContractConfig
from src.shared.aerich_redirect import TORTOISE_ORM


async def get_deploy_stats(project_name: str | None = None) -> dict:
    """获取部署统计信息"""
    stats: dict = {
        "contracts": [],
        "dependencies": 0,
        "metas": 0,
        "registries": 0,
        "project_configs": 0,
        "deployment_statuses": 0,
        "asset_bindings": 0,
        "assets_with_contract": 0,
    }

    # 查询合约
    if project_name:
        contracts = await Contract.filter(project_name=project_name).all()
    else:
        contracts = await Contract.all()

    for c in contracts:
        stats["contracts"].append(
            {
                "id": c.id,
                "name": c.name,
                "address": c.address,
                "project": c.project_name,
                "network": c.network,
            }
        )

    # 查询依赖
    if project_name:
        contract_ids = [c.id for c in contracts]
        if contract_ids:
            deps = await ContractDependency.filter(contract_id__in=contract_ids).count()
        else:
            deps = 0
    else:
        deps = await ContractDependency.all().count()
    stats["dependencies"] = deps

    # 查询合约元数据
    if project_name:
        metas = await ContractMeta.filter(project_name=project_name).count()
    else:
        metas = await ContractMeta.all().count()
    stats["metas"] = metas

    # 查询 Provider 注册
    if project_name:
        registries = await ProviderRegistry.filter(category=project_name).count()
    else:
        registries = await ProviderRegistry.all().count()
    stats["registries"] = registries

    # 查询项目合约配置
    if project_name:
        project_configs = await ProjectContractConfig.filter(project_name=project_name).count()
    else:
        project_configs = await ProjectContractConfig.all().count()
    stats["project_configs"] = project_configs

    # 查询部署状态 (通过 config 关联)
    if project_name:
        config_ids = await ProjectContractConfig.filter(project_name=project_name).values_list("id", flat=True)
        if config_ids:
            deployment_statuses = await ContractDeploymentStatus.filter(config_id__in=config_ids).count()
        else:
            deployment_statuses = 0
    else:
        deployment_statuses = await ContractDeploymentStatus.all().count()
    stats["deployment_statuses"] = deployment_statuses

    # 查询资产-合约绑定
    if project_name:
        # 获取该项目的合约地址
        contract_addresses = [c.address for c in contracts]
        if contract_addresses:
            asset_bindings = await AssetContractBinding.filter(
                contract_address__in=contract_addresses
            ).count()
        else:
            asset_bindings = 0
        # 查询绑定了该项目的资产
        assets_with_contract = await Asset.filter(project=project_name).count()
    else:
        asset_bindings = await AssetContractBinding.all().count()
        # 查询所有绑定了合约的资产
        assets_with_contract = await Asset.filter(contract_address__isnull=False).exclude(contract_address="").count()
    stats["asset_bindings"] = asset_bindings
    stats["assets_with_contract"] = assets_with_contract

    return stats


async def reset_deploy(project_name: str | None = None, force: bool = False) -> None:
    """重置部署记录"""
    # 初始化数据库
    await Tortoise.init(config=TORTOISE_ORM)

    # 获取统计信息
    stats = await get_deploy_stats(project_name)

    # 显示将要清理的内容
    print("=" * 60)
    print("🗑️  重置部署记录")
    if project_name:
        print(f"   项目: {project_name}")
    else:
        print("   范围: 所有项目")
    print("=" * 60)

    print("\n📋 将要清理的内容:")
    print("-" * 60)

    # 显示合约列表
    if stats["contracts"]:
        print(f"\n🔷 合约记录 ({len(stats['contracts'])} 条):")
        for c in stats["contracts"]:
            print(
                f"   • {c['name']} @ {c['address'][:16]}... ({c['project']}/{c['network']})"
            )
    else:
        print("\n🔷 合约记录: 0 条")

    print(f"\n🔗 依赖关系: {stats['dependencies']} 条")
    print(f"📄 合约元数据: {stats['metas']} 条")
    print(f"📝 Provider 注册: {stats['registries']} 条")
    print(f"⚙️  项目配置: {stats['project_configs']} 条")
    print(f"🚀 部署状态: {stats['deployment_statuses']} 条")
    print(f"🔗 资产绑定: {stats['asset_bindings']} 条")
    print(f"📦 绑定合约的资产: {stats['assets_with_contract']} 个")

    total = (
        len(stats["contracts"])
        + stats["dependencies"]
        + stats["metas"]
        + stats["registries"]
        + stats["project_configs"]
        + stats["deployment_statuses"]
        + stats["asset_bindings"]
        + stats["assets_with_contract"]
    )
    print("-" * 60)
    print(f"📊 总计: {total} 条记录")

    if total == 0:
        print("\n✅ 没有需要清理的记录")
        await Tortoise.close_connections()
        return

    # 交互式确认
    if not force:
        print("\n⚠️  此操作不可逆！")
        confirm = input("请输入 'CONFIRM' 继续: ")
        if confirm.lower() != "confirm":
            print("❌ 操作已取消")
            await Tortoise.close_connections()
            return

    # 执行清理
    print("\n🔄 正在清理...")

    deleted_contracts = 0
    deleted_deps = 0
    deleted_metas = 0
    deleted_registries = 0
    deleted_project_configs = 0
    deleted_deployment_statuses = 0
    deleted_asset_bindings = 0
    updated_assets = 0

    if project_name:
        # 清理指定项目
        contract_ids = [c["id"] for c in stats["contracts"]]
        contract_addresses = [c["address"] for c in stats["contracts"]]

        if contract_ids:
            deleted_deps = await ContractDependency.filter(
                contract_id__in=contract_ids
            ).delete()

        deleted_contracts = await Contract.filter(project_name=project_name).delete()
        deleted_metas = await ContractMeta.filter(project_name=project_name).delete()
        deleted_registries = await ProviderRegistry.filter(
            category=project_name
        ).delete()

        # 清理项目注册表 (先删除部署状态，再删除配置)
        config_ids = await ProjectContractConfig.filter(
            project_name=project_name
        ).values_list("id", flat=True)
        if config_ids:
            deleted_deployment_statuses = await ContractDeploymentStatus.filter(
                config_id__in=config_ids
            ).delete()
        deleted_project_configs = await ProjectContractConfig.filter(
            project_name=project_name
        ).delete()

        # 清理资产绑定
        if contract_addresses:
            deleted_asset_bindings = await AssetContractBinding.filter(
                contract_address__in=contract_addresses
            ).delete()
        # 清除资产的合约绑定字段
        updated_assets = await Asset.filter(project=project_name).update(
            project=None, contract_address=None
        )
    else:
        # 清理所有
        deleted_deps = await ContractDependency.all().delete()
        deleted_contracts = await Contract.all().delete()
        deleted_metas = await ContractMeta.all().delete()
        deleted_registries = await ProviderRegistry.all().delete()
        deleted_deployment_statuses = await ContractDeploymentStatus.all().delete()
        deleted_project_configs = await ProjectContractConfig.all().delete()
        deleted_asset_bindings = await AssetContractBinding.all().delete()
        # 清除所有资产的合约绑定字段
        updated_assets = await Asset.filter(contract_address__isnull=False).update(
            project=None, contract_address=None
        )

    print("\n✅ 清理完成:")
    print(f"   • 合约记录: {deleted_contracts} 条")
    print(f"   • 依赖关系: {deleted_deps} 条")
    print(f"   • 合约元数据: {deleted_metas} 条")
    print(f"   • Provider 注册: {deleted_registries} 条")
    print(f"   • 项目配置: {deleted_project_configs} 条")
    print(f"   • 部署状态: {deleted_deployment_statuses} 条")
    print(f"   • 资产绑定: {deleted_asset_bindings} 条")
    print(f"   • 更新资产: {updated_assets} 个 (清除合约绑定)")
    print("=" * 60)

    await Tortoise.close_connections()


async def show_stats(project_name: str | None = None) -> None:
    """显示部署统计信息"""
    await Tortoise.init(config=TORTOISE_ORM)
    try:
        stats = await get_deploy_stats(project_name)

        print("=" * 60)
        print("📊 部署统计")
        if project_name:
            print(f"   项目: {project_name}")
        print("=" * 60)

        if stats["contracts"]:
            print(f"\n🔷 合约 ({len(stats['contracts'])} 条):")
            for c in stats["contracts"]:
                print(f"   • {c['name']} @ {c['address'][:16]}...")
        else:
            print("\n🔷 合约: 0 条")

        print(f"\n🔗 依赖: {stats['dependencies']} 条")
        print(f"📄 元数据: {stats['metas']} 条")
        print(f"📝 注册: {stats['registries']} 条")
        print(f"⚙️  项目配置: {stats['project_configs']} 条")
        print(f"🚀 部署状态: {stats['deployment_statuses']} 条")
        print(f"🔗 资产绑定: {stats['asset_bindings']} 条")
        print(f"📦 绑定合约的资产: {stats['assets_with_contract']} 个")
    finally:
        await Tortoise.close_connections()


def main() -> None:
    """主函数"""
    parser = argparse.ArgumentParser(description="重置部署记录")
    parser.add_argument(
        "--project",
        "-p",
        type=str,
        help="指定项目名称 (common/vanke/...)",
    )
    parser.add_argument(
        "--all",
        "-a",
        action="store_true",
        help="清理所有项目",
    )
    parser.add_argument(
        "--force",
        "-f",
        action="store_true",
        help="跳过确认提示",
    )
    parser.add_argument(
        "--stats",
        "-s",
        action="store_true",
        help="仅显示统计信息，不执行清理",
    )

    args = parser.parse_args()

    if not args.project and not args.all:
        print("❌ 请指定 --project <name> 或 --all")
        print("\n可用选项:")
        print("  --project common   清理公共合约")
        print("  --project vanke    清理 Vanke 项目")
        print("  --all              清理所有项目")
        sys.exit(1)

    project_name: str | None = args.project if args.project else None

    if args.stats:
        asyncio.run(show_stats(project_name))
    else:
        asyncio.run(reset_deploy(project_name, args.force))


if __name__ == "__main__":
    main()
