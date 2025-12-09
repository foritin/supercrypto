#!/usr/bin/env python3
"""
部署脚本 2：STO 基础合约
部署 KYCManager, RWATokenSTO, PlatformToken
"""

from ape import project
import json
from pathlib import Path

from deploy_utils import get_deployer


def main():
    """部署 STO 基础合约"""
    
    print("=" * 60)
    print("📦 部署 STO 基础合约")
    print("=" * 60)
    
    # 获取部署账户
    deployer = get_deployer()
    
    deployed = {}
    
    # ============================================
    # 1. 部署 KYCManager
    # ============================================
    print("\n" + "-" * 60)
    print("1️⃣  部署 KYCManager")
    print("-" * 60)
    
    kyc_manager = project.KYCManager.deploy(sender=deployer)
    deployed['KYCManager'] = str(kyc_manager.address)
    
    print(f"✅ KYCManager 已部署: {kyc_manager.address}")
    print(f"   最大投资者数: {kyc_manager.maxInvestors()}")
    print(f"   KYC有效期: {kyc_manager.kycExpiryPeriod() / (24*3600)} 天")
    
    # ============================================
    # 2. 部署 RWATokenSTO
    # ============================================
    print("\n" + "-" * 60)
    print("2️⃣  部署 RWATokenSTO")
    print("-" * 60)
    
    rwa_token = project.RWATokenSTO.deploy(
        kyc_manager.address,
        sender=deployer
    )
    deployed['RWATokenSTO'] = str(rwa_token.address)
    
    print(f"✅ RWATokenSTO 已部署: {rwa_token.address}")
    print(f"   名称: {rwa_token.name()}")
    print(f"   符号: {rwa_token.symbol()}")
    print(f"   精度: {rwa_token.decimals()}")
    print(f"   KYC管理器: {rwa_token.kycManager()}")
    
    # ============================================
    # 3. 部署 PlatformToken
    # ============================================
    print("\n" + "-" * 60)
    print("3️⃣  部署 PlatformToken")
    print("-" * 60)
    
    platform_token = project.PlatformToken.deploy(sender=deployer)
    deployed['PlatformToken'] = str(platform_token.address)
    
    print(f"✅ PlatformToken 已部署: {platform_token.address}")
    print(f"   名称: {platform_token.name()}")
    print(f"   符号: {platform_token.symbol()}")
    print(f"   最大供应量: {platform_token.maxSupply() / 10**18:,.0f}")
    
    # ============================================
    # 保存部署地址
    # ============================================
    output_file = Path(__file__).parent.parent / "deployed_2_sto_base.json"
    
    deployment_info = {
        "step": "2_sto_base",
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
    print(f"  KYCManager:    {deployed['KYCManager']}")
    print(f"  RWATokenSTO:   {deployed['RWATokenSTO']}")
    print(f"  PlatformToken: {deployed['PlatformToken']}")
    
    print("\n📖 下一步: ape run 3_deploy_sto_business --network ethereum:local")
    print("=" * 60)
    
    return deployed


if __name__ == "__main__":
    main()

