#!/usr/bin/env python3
"""
部署 Vanke 项目
===============

万科房地产 RWA 项目的合约部署。

项目合约:
    - VankeRWAToken: RWA 证券型代币 (ERC1404)
    - VankePlatformToken: 平台治理代币
    - VankeSubscription: 代币认购合约
    - VankeStaking: 代币质押合约
    - VankeLiquidityMining: 流动性挖矿合约

Usage:
    ape run deploy_vanke --network ethereum:hardhat

前置条件:
    - AddressProvider 已部署 (ape run deploy_provider)
    - KYC 已部署 (ape run deploy_kyc)
    - 稳定币已部署 (ape run deploy_stablecoins)
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from ape import project
from deploy.executor import (
    deploy_contract,
    get_chain_id,
    get_current_network,
    get_deployed_contract,
    get_deployer,
    get_global_and_project_deployed,
    get_network_enum,
    record_dependencies,
)
from deploy.projects.vanke import VANKE_PROJECT


def main():
    """部署 Vanke 项目合约"""
    network = get_current_network()
    chain_id = get_chain_id(network)
    net_enum = get_network_enum(network)

    project_config = VANKE_PROJECT

    print("=" * 60)
    print(f"📦 部署项目: {project_config.display_name}")
    print(f"   项目名称: {project_config.name}")
    print(f"   网络: {network} (chain_id={chain_id})")
    print("=" * 60)

    deployer = get_deployer(network)
    deployed = get_global_and_project_deployed(chain_id, net_enum, project_config.name)

    # 获取 Provider
    provider = None
    provider_contract = get_deployed_contract(
        "AddressProvider", chain_id, net_enum, "_common"
    )
    if provider_contract:
        provider = project.AddressProvider.at(provider_contract.address)
        deployed["AddressProvider"] = provider_contract.address
        print(f"✅ AddressProvider: {provider_contract.address}")
    else:
        print("❌ AddressProvider 未部署，请先运行: ape run deploy_provider")
        return

    # 检查 KYC
    kyc_addr = provider.get_kyc_manager()
    if kyc_addr == "0x0000000000000000000000000000000000000000":
        print("⚠️  KYC 未注册到 Provider，建议先运行: ape run deploy_kyc")

    # 部署项目合约
    for config in project_config.contracts:
        print(f"\n🔷 {config.name}")
        print("─" * 60)

        contract, address = deploy_contract(
            config=config,
            deployer=deployer,
            chain_id=chain_id,
            network=net_enum,
            project_name=project_config.name,
            deployed=deployed,
            provider=provider,
        )

        deployed[config.name] = address

        # 注册到 Provider
        if config.register_to_provider and provider and config.provider_key:
            print("   📥 注册到 AddressProvider...")
            try:
                provider.set_address(config.provider_key, address, sender=deployer)
                print("   ✅ 已注册")
            except Exception as e:
                print(f"   ⚠️  注册失败: {e}")

        # 记录依赖关系
        db_contract = get_deployed_contract(
            config.name, chain_id, net_enum, project_config.name
        )
        if db_contract and config.provider_deps:
            print("   📝 记录依赖关系...")
            record_dependencies(
                contract_name=config.name,
                contract_id=db_contract.id,
                contract_address=address,
                config=config,
                chain_id=chain_id,
                network=net_enum,
            )

    # 显示摘要
    print(f"\n{'=' * 60}")
    print("📊 部署摘要")
    print("=" * 60)
    for config in project_config.contracts:
        address = deployed.get(config.name, "未部署")
        print(f"   {config.name}: {address}")

    print("\n🔗 Provider 依赖:")
    for config in project_config.contracts:
        if config.provider_deps:
            print(f"   {config.name}: {', '.join(config.provider_deps)}")

    print("=" * 60)


if __name__ == "__main__":
    main()
