#!/usr/bin/env python3
"""
部署 Vanke 项目（异步版本）
===============

万科房地产 RWA 项目的合约部署。

项目合约:
    - VankeRWAToken: RWA 证券型代币 (ERC1404)
    - VankePlatformToken: 平台治理代币
    - VankeSubscription: 代币认购合约
    - VankeStaking: 代币质押合约
    - VankeLiquidityMining: 流动性挖矿合约

Usage:
    # 部署到 Hardhat 节点 (地址配置在 ape-config.yaml)
    ape run deploy_vanke --network ethereum:hardhat:node

注意:
    - 部署后需要通过 Admin UI 手动注册到 Provider
    - 部署后需要通过 Admin UI 设置 AddressProvider (setAddressProvider)
"""

import asyncio
import os
import sys
from pathlib import Path

from tortoise import Tortoise

# 添加 backend 目录到 path
scripts_dir = Path(__file__).parent
backend_dir = scripts_dir.parent  # 指向 backend 目录
sys.path.insert(0, str(backend_dir))

# 设置工作目录
os.chdir(backend_dir)

# ruff: noqa: E402  # 必须在 sys.path 设置后导入
from deploy.executor import (
    deploy_contract,
    get_chain_id,
    get_current_network,
    get_deployed_contract,
    get_deployer,
    get_global_and_project_deployed,
    get_network_enum,
    record_dependencies,
    sync_project_registry_before_deploy,
)
from deploy.projects.vanke.config import VANKE_PROJECT
from src.aerich_redirect import TORTOISE_ORM


async def init_db():
    """初始化数据库连接"""
    await Tortoise.init(config=TORTOISE_ORM)


async def close_db():
    """关闭数据库连接"""
    await Tortoise.close_connections()


async def main_async():
    """部署 Vanke 项目合约（异步实现）"""
    # 初始化数据库
    await init_db()
    
    try:
        network = get_current_network()
        chain_id = get_chain_id(network)
        net_enum = get_network_enum(network)

        project_config = VANKE_PROJECT

        print("=" * 60)
        print(f"📦 部署项目: {project_config.display_name}")
        print(f"   项目名称: {project_config.name}")
        print(f"   网络: {network} (chain_id={chain_id})")
        print("=" * 60)

        # 部署前同步项目注册表配置
        sync_project_registry_before_deploy(project_config.name)

        deployer = await get_deployer(network)
        deployed = await get_global_and_project_deployed(chain_id, net_enum, project_config.name)
        deployed_instances = {}

        # 部署项目合约
        for config in project_config.contracts:
            print(f"\n🔷 {config.name}")
            print("─" * 60)

            contract, address = await deploy_contract(
                config=config,
                deployer=deployer,
                chain_id=chain_id,
                network=net_enum,
                project_name=project_config.name,
                deployed=deployed,
            )

            deployed[config.name] = address
            deployed_instances[config.name] = contract

            # 记录依赖关系到数据库
            db_contract = await get_deployed_contract(
                config.name, chain_id, net_enum, project_config.name
            )
            if db_contract and config.provider_deps:
                print("   📝 记录依赖关系...")
                await record_dependencies(
                    contract_name=config.name,
                    contract_id=db_contract.id,
                    contract_address=address,
                    config=config,
                    chain_id=chain_id,
                    network=net_enum,
                )

        # 部署后自动授权: Subscription 需要 RWA Token 的 mint 权限
        rwa_contract = deployed_instances.get("VankeRWAToken")
        subscription_address = deployed.get("VankeSubscription")
        if rwa_contract and subscription_address:
            try:
                current = rwa_contract.minters(subscription_address)
                if not current:
                    print("\n🔐 授权 VankeSubscription 为 RWA minter...")
                    tx = rwa_contract.admin_set_minter(
                        subscription_address, True, sender=deployer
                    )
                    print(f"   ✅ 已授权 (tx: {tx.txn_hash})")
                else:
                    print("\n🔐 RWA minter 权限已存在，跳过")
            except Exception as exc:
                print(f"\n⚠️ 自动授权 minter 失败，请手动执行 admin_set_minter: {exc}")

        # 显示摘要
        print(f"\n{'=' * 60}")
        print("📊 部署摘要")
        print("=" * 60)
        for config in project_config.contracts:
            address = deployed.get(config.name, "未部署")
            print(f"   {config.name}: {address}")

        print("\n📋 后续操作:")
        print("   1. 通过 Admin UI 将合约注册到 Provider")
        print("   2. 通过 Admin UI 调用 setAddressProvider 设置 Provider 地址")

        print("=" * 60)
    finally:
        # 关闭数据库连接
        await close_db()


def main():
    """部署 Vanke 项目合约（入口函数）"""
    asyncio.run(main_async())


if __name__ == "__main__":
    main()
