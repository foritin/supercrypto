#!/usr/bin/env python3
"""
部署脚本 2：Fake 项目 - 代币合约
部署 RWATokenSTO, PlatformToken

依赖：需要先部署 0-common-kyc

每次运行都会部署新合约。
部署后通过 admin/contracts 页面管理依赖绑定。

Usage:
    ape run 2-fake-tokens --network ethereum:local
    ape run 2-fake-tokens --network ethereum:sepolia
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from ape import project
from deploy_utils import (
    deploy_contract,
    get_current_network,
    get_deployer_from_db,
    require_deployed,
)

# 项目和部署阶段标识
PROJECT = "fake"
DEPLOY_STEP = "2-fake-tokens"


def main():
    """部署 Fake 项目代币合约"""
    network = get_current_network()

    print("=" * 60)
    print("📦 部署 Fake 项目 - 代币合约")
    print(f"   项目: {PROJECT}")
    print(f"   网络: {network}")
    print("=" * 60)

    deployer = get_deployer_from_db(network=network)

    # 检查依赖：KYCManager
    print("\n📋 检查依赖...")
    try:
        kyc_addr = require_deployed("0-common-kyc", "KYCManager", network)
        print(f"   ✅ KYCManager: {kyc_addr}")
    except ValueError as e:
        print(str(e))
        print("\n⚠️  请先运行: ape run 0-common-kyc --network ethereum:local")
        return None

    kyc_manager = project.KYCManager.at(kyc_addr)

    deployed = {}

    # 部署 RWATokenSTO
    print("\n" + "-" * 60)
    print("1️⃣  RWATokenSTO")
    print("-" * 60)

    rwa_token, is_new = deploy_contract(
        contract_class=project.RWATokenSTO,
        contract_name="RWATokenSTO",
        deployer=deployer,
        deploy_step=DEPLOY_STEP,
        network=network,
        project=PROJECT,
        dependencies={"KYCManager": kyc_addr},
        _kycManager=kyc_manager.address,
    )
    deployed["RWATokenSTO"] = str(rwa_token.address)

    print(f"   名称: {rwa_token.name()}")
    print(f"   符号: {rwa_token.symbol()}")
    print(f"   精度: {rwa_token.decimals()}")
    print(f"   KYC管理器: {rwa_token.kycManager()}")

    # 部署 PlatformToken
    print("\n" + "-" * 60)
    print("2️⃣  PlatformToken")
    print("-" * 60)

    platform_token, is_new = deploy_contract(
        contract_class=project.PlatformToken,
        contract_name="PlatformToken",
        deployer=deployer,
        deploy_step=DEPLOY_STEP,
        network=network,
        project=PROJECT,
    )
    deployed["PlatformToken"] = str(platform_token.address)

    print(f"   名称: {platform_token.name()}")
    print(f"   符号: {platform_token.symbol()}")
    print(f"   最大供应量: {platform_token.maxSupply() / 10**18:,.0f}")

    # 部署摘要
    print("\n" + "=" * 60)
    print("📊 部署摘要")
    print("=" * 60)
    print(f"  RWATokenSTO:   {deployed['RWATokenSTO']}")
    print(f"  PlatformToken: {deployed['PlatformToken']}")
    print(f"  项目: {PROJECT}")
    print(f"  网络: {network}")

    print(f"\n📖 下一步: ape run 3-fake-business --network ethereum:{network}")
    print("=" * 60)

    return deployed


if __name__ == "__main__":
    main()
