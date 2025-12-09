#!/usr/bin/env python3
"""
部署脚本 1：Mock 代币
部署 MockUSDT 和 MockUSDC 用于测试环境
"""

from ape import project
import json
from pathlib import Path

from deploy_utils import get_deployer



def main():
    """部署 Mock 代币合约"""
    
    print("=" * 60)
    print("📦 部署 Mock 代币")
    print("=" * 60)
    
    # 获取部署账户
    deployer = get_deployer()
    
    deployed = {}
    
    # ============================================
    # 1. 部署 MockUSDT
    # ============================================
    print("\n" + "-" * 60)
    print("1️⃣  部署 MockUSDT")
    print("-" * 60)
    
    usdt = project.MockUSDT.deploy(sender=deployer)
    deployed['MockUSDT'] = str(usdt.address)
    
    print(f"✅ MockUSDT 已部署: {usdt.address}")
    print(f"   名称: {usdt.name()}")
    print(f"   符号: {usdt.symbol()}")
    print(f"   精度: {usdt.decimals()}")
    
    # ============================================
    # 2. 部署 MockUSDC
    # ============================================
    print("\n" + "-" * 60)
    print("2️⃣  部署 MockUSDC")
    print("-" * 60)
    
    usdc = project.MockUSDC.deploy(sender=deployer)
    deployed['MockUSDC'] = str(usdc.address)
    
    print(f"✅ MockUSDC 已部署: {usdc.address}")
    print(f"   名称: {usdc.name()}")
    print(f"   符号: {usdc.symbol()}")
    print(f"   精度: {usdc.decimals()}")
    
    # ============================================
    # 保存部署地址
    # ============================================
    output_file = Path(__file__).parent.parent / "deployed_1_mocks.json"
    
    deployment_info = {
        "step": "1_mocks",
        "network": "local",
        "deployer": deployer.address,
        "contracts": deployed
    }
    
    with open(output_file, "w") as f:
        json.dump(deployment_info, f, indent=2)
    
    print(f"\n💾 地址已保存到: {output_file}")
    
    # ============================================
    # 部署摘要
    # ============================================
    print("\n" + "=" * 60)
    print("📊 部署摘要")
    print("=" * 60)
    print(f"  MockUSDT: {deployed['MockUSDT']}")
    print(f"  MockUSDC: {deployed['MockUSDC']}")
    
    print("\n📖 下一步: ape run 2_deploy_sto_base --network ethereum:local")
    print("=" * 60)
    
    return deployed


if __name__ == "__main__":
    main()

