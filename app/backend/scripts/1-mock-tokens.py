#!/usr/bin/env python3
"""
部署脚本 1：Mock 合约 - 测试用稳定币
仅在 local 环境使用

每次运行都会部署新合约。

Usage:
    ape run 1-mock-tokens --network ethereum:local
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from ape import project
from deploy_utils import (
    deploy_contract,
    get_current_network,
    get_deployer_from_db,
)

# 项目和部署阶段标识
PROJECT = "mock"
DEPLOY_STEP = "1-mock-tokens"


def main():
    """部署 Mock 稳定币合约"""
    network = get_current_network()

    # 检查网络（Mock 合约只在 local 部署）
    if network != "local":
        print("⚠️  Mock 合约只在 local 网络部署")
        print(f"   当前网络: {network}")
        print("   如需测试网稳定币，请使用真实的 USDT/USDC 地址")
        return None

    print("=" * 60)
    print("📦 部署 Mock 合约 - 测试用稳定币")
    print(f"   项目: {PROJECT}")
    print(f"   网络: {network}")
    print("=" * 60)
    
    deployer = get_deployer_from_db(network=network)
    
    deployed = {}
    
    # 部署 MockUSDT
    print("\n" + "-" * 60)
    print("1️⃣  MockUSDT")
    print("-" * 60)
    
    mock_usdt, is_new = deploy_contract(
        contract_class=project.MockUSDT,
        contract_name="MockUSDT",
        deployer=deployer,
        deploy_step=DEPLOY_STEP,
        network=network,
        project=PROJECT,
    )
    deployed['MockUSDT'] = str(mock_usdt.address)
    
    if is_new:
        print(f"   符号: {mock_usdt.symbol()}")
        print(f"   精度: {mock_usdt.decimals()}")
    
    # 部署 MockUSDC
    print("\n" + "-" * 60)
    print("2️⃣  MockUSDC")
    print("-" * 60)
    
    mock_usdc, is_new = deploy_contract(
        contract_class=project.MockUSDC,
        contract_name="MockUSDC",
        deployer=deployer,
        deploy_step=DEPLOY_STEP,
        network=network,
        project=PROJECT,
    )
    deployed['MockUSDC'] = str(mock_usdc.address)
    
    if is_new:
        print(f"   符号: {mock_usdc.symbol()}")
        print(f"   精度: {mock_usdc.decimals()}")
    
    # 部署摘要
    print("\n" + "=" * 60)
    print("📊 部署摘要")
    print("=" * 60)
    print(f"  MockUSDT: {deployed['MockUSDT']}")
    print(f"  MockUSDC: {deployed['MockUSDC']}")
    print(f"  项目: {PROJECT}")
    print(f"  网络: {network}")
    print("=" * 60)
    
    return deployed


if __name__ == "__main__":
    main()

