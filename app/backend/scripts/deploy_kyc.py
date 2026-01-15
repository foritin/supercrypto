#!/usr/bin/env python3
"""
部署 KYC 合约
=============

KYC 合约用于管理投资者身份验证。

Usage:
    ape run deploy_kyc --network ethereum:hardhat

前置条件:
    - AddressProvider 已部署 (ape run deploy_provider)
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from ape import project
from deploy.base import KYC_CONTRACT
from deploy.executor import (
    deploy_contract,
    get_all_deployed,
    get_chain_id,
    get_current_network,
    get_deployed_contract,
    get_deployer,
    get_network_enum,
)


def main():
    """部署 KYC 合约"""
    network = get_current_network()
    chain_id = get_chain_id(network)
    net_enum = get_network_enum(network)

    print("=" * 60)
    print("📦 部署 KYC 合约")
    print(f"   网络: {network} (chain_id={chain_id})")
    print("=" * 60)

    deployer = get_deployer(network)
    deployed = get_all_deployed(chain_id, net_enum, "_common")

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

    config = KYC_CONTRACT
    print(f"\n🔷 {config.name}")
    print("─" * 60)

    contract, address = deploy_contract(
        config=config,
        deployer=deployer,
        chain_id=chain_id,
        network=net_enum,
        project_name="_common",
        deployed=deployed,
    )

    # 注册到 Provider
    if config.register_to_provider and config.provider_key:
        current = provider.get_address(config.provider_key)
        if current != address:
            print("   📝 注册到 Provider...")
            provider.set_address(config.provider_key, address, sender=deployer)
            print("   ✅ 已注册")
        else:
            print("   ✅ 已在 Provider 中注册")

    print(f"\n{'=' * 60}")
    print(f"✅ KYC: {address}")
    print(f"   Provider.KYC_MANAGER: {provider.get_kyc_manager()}")
    print("=" * 60)


if __name__ == "__main__":
    main()
