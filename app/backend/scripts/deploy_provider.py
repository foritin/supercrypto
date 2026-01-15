#!/usr/bin/env python3
"""
部署 AddressProvider
====================

AddressProvider 是所有合约的中心注册表，必须最先部署。

Usage:
    ape run deploy_provider --network ethereum:hardhat
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from deploy.base import PROVIDER_CONTRACT
from deploy.executor import (
    deploy_contract,
    get_all_deployed,
    get_chain_id,
    get_current_network,
    get_deployer,
    get_network_enum,
)


def main():
    """部署 AddressProvider"""
    network = get_current_network()
    chain_id = get_chain_id(network)
    net_enum = get_network_enum(network)

    print("=" * 60)
    print("📦 部署 AddressProvider")
    print(f"   网络: {network} (chain_id={chain_id})")
    print("=" * 60)

    deployer = get_deployer(network)
    deployed = get_all_deployed(chain_id, net_enum, "_common")

    config = PROVIDER_CONTRACT
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

    print(f"\n{'=' * 60}")
    print(f"✅ AddressProvider: {address}")
    print("=" * 60)


if __name__ == "__main__":
    main()
