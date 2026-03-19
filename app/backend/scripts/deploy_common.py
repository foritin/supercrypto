#!/usr/bin/env python3
"""
部署公共合约（异步版本）
============

部署所有公共合约：AddressProvider, KYC, USDT, USDC, TreasuryMultisig。

Usage:
    # 部署到 Hardhat 节点 (地址配置在 ape-config.yaml)
    ape run deploy_common --network ethereum:hardhat:node

    # 或者分步部署
    ape run deploy_common --network ethereum:hardhat:node --only provider
    ape run deploy_common --network ethereum:hardhat:node --only kyc
    ape run deploy_common --network ethereum:hardhat:node --only stablecoins
    ape run deploy_common --network ethereum:hardhat:node --only treasury

Note:
    - hardhat 是自定义网络 (chain_id=31337)
    - 节点地址配置在 ape-config.yaml 的 node.ethereum.hardhat.uri
"""

import asyncio
import os
import sys
from pathlib import Path
from typing import Optional

from tortoise import Tortoise

# 添加 backend 目录到 path
scripts_dir = Path(__file__).parent
backend_dir = scripts_dir.parent  # 指向 backend 目录
sys.path.insert(0, str(backend_dir))

# 设置工作目录
os.chdir(backend_dir)

# ruff: noqa: E402, I001  # 必须在 sys.path 设置后导入
from deploy.common.config import (
    KYC_CONTRACT,
    PROVIDER_CONTRACT,
    STABLECOIN_CONTRACTS,
    TREASURY_MULTISIG_CONTRACT,
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
from src.aerich_redirect import TORTOISE_ORM


async def init_db():
    """初始化数据库连接"""
    await Tortoise.init(config=TORTOISE_ORM)


async def close_db():
    """关闭数据库连接"""
    await Tortoise.close_connections()


async def deploy_provider(deployer, chain_id: int, network, deployed: dict):
    """部署 AddressProvider"""
    print("\n🔷 AddressProvider")
    print("─" * 60)

    contract, address = await deploy_contract(
        config=PROVIDER_CONTRACT,
        deployer=deployer,
        chain_id=chain_id,
        network=network,
        project_name="common",
        deployed=deployed,
    )

    deployed["AddressProvider"] = address
    return contract


async def deploy_kyc(deployer, chain_id: int, network, deployed: dict):
    """部署 KYC 合约"""
    print("\n🔷 KYC")
    print("─" * 60)

    contract, address = await deploy_contract(
        config=KYC_CONTRACT,
        deployer=deployer,
        chain_id=chain_id,
        network=network,
        project_name="common",
        deployed=deployed,
    )

    deployed["KYC"] = address
    return contract


async def deploy_treasury_multisig(deployer, chain_id: int, network, deployed: dict):
    """
    部署 TreasuryMultisig 合约（零签名者模式）

    注意：部署后需要通过 Dev Tools 配置签名者
    """
    print("\n🔷 TreasuryMultisig")
    print("─" * 60)

    # 获取已部署的 AddressProvider 地址
    provider_address = deployed.get("AddressProvider")
    if not provider_address:
        print("   ❌ AddressProvider not deployed yet, skipping TreasuryMultisig")
        return None

    # 复制配置并设置构造函数参数（零签名者）
    config = TREASURY_MULTISIG_CONTRACT
    config.constructor_args = {
        "_signers": [],  # 零签名者
        "_required_signatures": 0,  # 零阈值
        "_address_provider": provider_address,
    }

    contract, address = await deploy_contract(
        config=config,
        deployer=deployer,
        chain_id=chain_id,
        network=network,
        project_name="common",
        deployed=deployed,
    )

    if address:
        deployed["TreasuryMultisig"] = address
        print("\n   ⚠️  IMPORTANT: TreasuryMultisig deployed in ZERO-SIGNER mode")
        print("      下一步：通过 Dev Tools 或 Admin 界面配置签名者")
        print(f"      地址: {address}")

    return contract


def print_manual_treasury_binding_notice(treasury_address: str):
    """提示手动在 Contract Management 绑定 TREASURY 键。"""
    if not treasury_address:
        return

    print("\n⚠️  待完成: 手动绑定 AddressProvider Treasury 键")
    print("─" * 60)
    print(
        "   为避免部署流程自动写链造成治理绕过，默认不在 deploy_common 中自动上链写入。"
    )
    print("   请在 Contract Management 中执行:")
    print(f"   1) TREASURY_MULTISIG -> {treasury_address}")
    print(f"   2) TREASURY -> {treasury_address}")
    print("   完成后再继续进行资金流验证与业务联调。")


async def deploy_stablecoins(deployer, chain_id: int, network, deployed: dict):
    """部署稳定币合约"""
    network_name = get_current_network()
    provider_address = deployed.get("AddressProvider")

    # hardhat: 部署 mock 稳定币；其它网络: 创建外部地址占位记录
    if network_name != "hardhat":
        for config in STABLECOIN_CONTRACTS:
            print(f"\n🔷 {config.name} (external placeholder)")
            print("─" * 60)

            existing_active = await get_deployed_contract(
                config.name,
                chain_id,
                network,
                "common",
                scope=config.scope,
                contract_type=config.contract_type,
            )
            if existing_active:
                print(f"   ⏭️  已有 ACTIVE 记录，保留: {existing_active.address}")
                await save_contract_config(config, "common")
                if config.provider_key and provider_address:
                    await create_provider_registry_record(
                        config=config,
                        project_name="common",
                        provider_address=provider_address,
                        chain_id=chain_id,
                        network=network,
                    )
                continue

            placeholder = f"external://{network_name}/{config.name.lower()}"
            await save_external_contract_placeholder(
                name=config.name,
                placeholder_address=placeholder,
                deployer_address=deployer.address,
                network=network,
                chain_id=chain_id,
                scope=config.scope,
                contract_type=config.contract_type,
                project_name="common",
            )
            await save_contract_config(config, "common")
            if config.provider_key and provider_address:
                await create_provider_registry_record(
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

        contract, address = await deploy_contract(
            config=config,
            deployer=deployer,
            chain_id=chain_id,
            network=network,
            project_name="common",
            deployed=deployed,
        )

        deployed[config.name] = address


async def main_async(only: Optional[str] = None):
    """
    部署公共合约（异步实现）

    Args:
        only: 仅部署指定类型 (provider/kyc/stablecoins/treasury)
    """
    # 初始化数据库
    await init_db()

    try:
        network = get_current_network()
        chain_id = get_chain_id(network)
        net_enum = get_network_enum(network)

        print("=" * 60)
        print("📦 部署公共合约")
        print(f"   网络: {network} (chain_id={chain_id})")
        if only:
            print(f"   仅部署: {only}")
        print("=" * 60)

        deployer = await get_deployer(network)
        deployed = await get_all_deployed(chain_id, net_enum, "common")

        # 1. 部署 AddressProvider
        if only is None or only == "provider":
            await deploy_provider(deployer, chain_id, net_enum, deployed)

        # 2. 部署 KYC
        if only is None or only == "kyc":
            await deploy_kyc(deployer, chain_id, net_enum, deployed)

        # 3. 部署稳定币
        if only is None or only == "stablecoins":
            await deploy_stablecoins(deployer, chain_id, net_enum, deployed)

        # 4. 部署 TreasuryMultisig（零签名者模式）
        if only is None or only == "treasury":
            await deploy_treasury_multisig(deployer, chain_id, net_enum, deployed)
            treasury_address = deployed.get("TreasuryMultisig")
            if treasury_address:
                print_manual_treasury_binding_notice(treasury_address)

        # 显示摘要
        print(f"\n{'=' * 60}")
        print("📊 部署摘要")
        print("=" * 60)
        print(f"   AddressProvider: {deployed.get('AddressProvider', 'N/A')}")
        print(f"   KYC: {deployed.get('KYC', 'N/A')}")
        print(f"   USDT: {deployed.get('USDT', 'N/A')}")
        print(f"   USDC: {deployed.get('USDC', 'N/A')}")
        print(f"   TreasuryMultisig: {deployed.get('TreasuryMultisig', 'N/A')}")
        if deployed.get("TreasuryMultisig"):
            print("   ⚠️  TreasuryMultisig 需要配置签名者（通过 Dev Tools）")
        print("=" * 60)
    finally:
        # 关闭数据库连接
        await close_db()


def main(only: Optional[str] = None):
    """
    部署公共合约（入口函数）

    Args:
        only: 仅部署指定类型 (provider/kyc/stablecoins/treasury)
    """
    asyncio.run(main_async(only))


if __name__ == "__main__":
    main()
