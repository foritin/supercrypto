#!/usr/bin/env python3
"""
重置部署记录
============

清理数据库中的合约部署相关记录，用于重新部署测试。

清理的表:
    - contract_deployment: 合约部署记录
    - contract_config: 合约配置
    - provider_registry: Provider 注册状态
    - asset: 清除合约绑定字段 (project, contract_address)
    - asset_contract_binding: 资产-合约绑定关系

Usage:
    python scripts/tools_reset_deploy.py

    # 指定项目清理
    python scripts/tools_reset_deploy.py --project vanke
    python scripts/tools_reset_deploy.py --project common

    # 清理所有
    python scripts/tools_reset_deploy.py --all
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

from src.aerich_redirect import TORTOISE_ORM
from src.models.asset import Asset, AssetContractBinding
from src.models.contracts import ContractConfig, ContractDeployment
from src.models.contracts.provider_registry import ProviderRegistry


async def get_deploy_stats(project_name: str | None = None) -> dict:
    """获取部署统计信息"""
    stats: dict = {
        "deployments": [],
        "configs": 0,
        "registries": 0,
        "asset_bindings": 0,
        "assets_with_contract": 0,
    }

    # 查询部署记录
    if project_name:
        deployments = await ContractDeployment.filter(project_name=project_name).all()
    else:
        deployments = await ContractDeployment.all()

    for d in deployments:
        stats["deployments"].append(
            {
                "id": d.id,
                "name": d.name,
                "address": d.address,
                "project": d.project_name,
                "network": d.network.value if d.network else None,
            }
        )

    # 查询合约配置
    if project_name:
        configs = await ContractConfig.filter(project_name=project_name).count()
    else:
        configs = await ContractConfig.all().count()
    stats["configs"] = configs

    # 查询 Provider 注册
    if project_name:
        registries = await ProviderRegistry.filter(category=project_name).count()
    else:
        registries = await ProviderRegistry.all().count()
    stats["registries"] = registries

    # 查询资产-合约绑定
    if project_name:
        # 获取该项目的合约地址
        contract_addresses = [d.address for d in deployments]
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
        assets_with_contract = (
            await Asset.filter(contract_address__isnull=False)
            .exclude(contract_address="")
            .count()
        )
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

    # 显示部署记录列表
    if stats["deployments"]:
        print(f"\n🔷 部署记录 ({len(stats['deployments'])} 条):")
        for d in stats["deployments"]:
            print(
                f"   • {d['name']} @ {d['address'][:16]}... ({d['project']}/{d['network']})"
            )
    else:
        print("\n🔷 部署记录: 0 条")

    print(f"\n📄 合约配置: {stats['configs']} 条")
    print(f"📝 Provider 注册: {stats['registries']} 条")
    print(f"🔗 资产绑定: {stats['asset_bindings']} 条")
    print(f"📦 绑定合约的资产: {stats['assets_with_contract']} 个")

    total = (
        len(stats["deployments"])
        + stats["configs"]
        + stats["registries"]
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

    deleted_deployments = 0
    deleted_configs = 0
    deleted_registries = 0
    deleted_asset_bindings = 0
    updated_assets = 0

    if project_name:
        # 清理指定项目
        contract_addresses = [d["address"] for d in stats["deployments"]]

        # 删除部署记录
        deleted_deployments = await ContractDeployment.filter(
            project_name=project_name
        ).delete()

        # 删除合约配置
        deleted_configs = await ContractConfig.filter(
            project_name=project_name
        ).delete()

        # 删除 Provider 注册
        deleted_registries = await ProviderRegistry.filter(
            category=project_name
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
        deleted_deployments = await ContractDeployment.all().delete()
        deleted_configs = await ContractConfig.all().delete()
        deleted_registries = await ProviderRegistry.all().delete()
        deleted_asset_bindings = await AssetContractBinding.all().delete()
        # 清除所有资产的合约绑定字段
        updated_assets = await Asset.filter(contract_address__isnull=False).update(
            project=None, contract_address=None
        )

    print("\n✅ 清理完成:")
    print(f"   • 部署记录: {deleted_deployments} 条")
    print(f"   • 合约配置: {deleted_configs} 条")
    print(f"   • Provider 注册: {deleted_registries} 条")
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

        if stats["deployments"]:
            print(f"\n🔷 部署记录 ({len(stats['deployments'])} 条):")
            for d in stats["deployments"]:
                print(f"   • {d['name']} @ {d['address'][:16]}...")
        else:
            print("\n🔷 部署记录: 0 条")

        print(f"\n📄 合约配置: {stats['configs']} 条")
        print(f"📝 Provider 注册: {stats['registries']} 条")
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
