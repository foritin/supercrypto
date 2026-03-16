#!/usr/bin/env python3
"""
部署公共合约
============

部署所有公共合约：AddressProvider, KYC, USDT, USDC。

Usage:
    # 部署到 Hardhat 节点 (地址配置在 ape-config.yaml)
    ape run deploy_common --network ethereum:hardhat:node

    # 或者分步部署
    ape run deploy_common --network ethereum:hardhat:node --only provider
    ape run deploy_common --network ethereum:hardhat:node --only kyc
    ape run deploy_common --network ethereum:hardhat:node --only stablecoins

Note:
    - hardhat 是自定义网络 (chain_id=31337)
    - 节点地址配置在 ape-config.yaml 的 node.ethereum.hardhat.uri
"""

from typing import Optional

from deploy.common.config import (
    KYC_CONTRACT,
    PROVIDER_CONTRACT,
    STABLECOIN_CONTRACTS,
)
from deploy.executor import (
    create_provider_registry_record,
    deploy_contract,
    get_all_deployed,
    get_chain_id,
    get_current_network,
    get_deployed_contract,
    get_deployer,
    get_network_enum,
    save_contract_config,
    save_external_contract_placeholder,
)


def deploy_provider(deployer, chain_id: int, network, deployed: dict):
    """部署 AddressProvider"""
    print("\n🔷 AddressProvider")
    print("─" * 60)

    contract, address = deploy_contract(
        config=PROVIDER_CONTRACT,
        deployer=deployer,
        chain_id=chain_id,
        network=network,
        project_name="common",
        deployed=deployed,
    )

    deployed["AddressProvider"] = address
    return contract


def deploy_kyc(deployer, chain_id: int, network, deployed: dict):
    """部署 KYC 合约"""
    print("\n🔷 KYC")
    print("─" * 60)

    contract, address = deploy_contract(
        config=KYC_CONTRACT,
        deployer=deployer,
        chain_id=chain_id,
        network=network,
        project_name="common",
        deployed=deployed,
    )

    deployed["KYC"] = address
    return contract


def deploy_stablecoins(deployer, chain_id: int, network, deployed: dict):
    """部署稳定币合约"""
    network_name = get_current_network()

    # hardhat: 部署 mock 稳定币；其它网络: 创建外部地址占位记录
    if network_name != "hardhat":
        provider_address = deployed.get("AddressProvider")
        for config in STABLECOIN_CONTRACTS:
            print(f"\n🔷 {config.name} (external placeholder)")
            print("─" * 60)

            existing_active = get_deployed_contract(
                config.name,
                chain_id,
                network,
                "common",
                scope=config.scope,
                contract_type=config.contract_type,
            )
            if existing_active:
                print(f"   ⏭️  已有 ACTIVE 记录，保留: {existing_active.address}")
                save_contract_config(config, "common")
                if config.provider_key and provider_address:
                    create_provider_registry_record(
                        config=config,
                        project_name="common",
                        provider_address=provider_address,
                        chain_id=chain_id,
                        network=network,
                    )
                continue

            placeholder = f"external://{network_name}/{config.name.lower()}"
            save_external_contract_placeholder(
                name=config.name,
                placeholder_address=placeholder,
                deployer_address=deployer.address,
                network=network,
                chain_id=chain_id,
                scope=config.scope,
                contract_type=config.contract_type,
                project_name="common",
            )
            save_contract_config(config, "common")
            if config.provider_key and provider_address:
                create_provider_registry_record(
                    config=config,
                    project_name="common",
                    provider_address=provider_address,
                    chain_id=chain_id,
                    network=network,
                )

            deployed[config.name] = placeholder
            print(
                "   📝 已创建外部地址占位记录，请在 Admin 合约管理中更新真实地址后再注册 Provider"
            )
        return

    for config in STABLECOIN_CONTRACTS:
        print(f"\n🔷 {config.name}")
        print("─" * 60)

        contract, address = deploy_contract(
            config=config,
            deployer=deployer,
            chain_id=chain_id,
            network=network,
            project_name="common",
            deployed=deployed,
        )

        deployed[config.name] = address


def main(only: Optional[str] = None):
    """
    部署公共合约

    Args:
        only: 仅部署指定类型 (provider/kyc/stablecoins)
    """
    network = get_current_network()
    chain_id = get_chain_id(network)
    net_enum = get_network_enum(network)

    print("=" * 60)
    print("📦 部署公共合约")
    print(f"   网络: {network} (chain_id={chain_id})")
    if only:
        print(f"   仅部署: {only}")
    print("=" * 60)

    deployer = get_deployer(network)
    deployed = get_all_deployed(chain_id, net_enum, "common")

    # 1. 部署 AddressProvider
    if only is None or only == "provider":
        deploy_provider(deployer, chain_id, net_enum, deployed)

    # 2. 部署 KYC
    if only is None or only == "kyc":
        deploy_kyc(deployer, chain_id, net_enum, deployed)

    # 3. 部署稳定币
    if only is None or only == "stablecoins":
        deploy_stablecoins(deployer, chain_id, net_enum, deployed)

    # 显示摘要
    print(f"\n{'=' * 60}")
    print("📊 部署摘要")
    print("=" * 60)
    print(f"   AddressProvider: {deployed.get('AddressProvider', 'N/A')}")
    print(f"   KYC: {deployed.get('KYC', 'N/A')}")
    print(f"   USDT: {deployed.get('USDT', 'N/A')}")
    print(f"   USDC: {deployed.get('USDC', 'N/A')}")
    print("=" * 60)


if __name__ == "__main__":
    main()
