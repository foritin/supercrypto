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

from deploy.common.config import (
    KYC_CONTRACT,
    PROVIDER_CONTRACT,
    STABLECOIN_CONTRACTS,
)
from deploy.executor import (
    deploy_contract,
    get_all_deployed,
    get_chain_id,
    get_current_network,
    get_deployer,
    get_network_enum,
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

    # 仅在测试网络部署自有稳定币
    if network_name not in ["hardhat", "sepolia", "goerli"]:
        print("⚠️  跳过: 自有稳定币仅部署到测试网络")
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


def main(only: str = None):
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
