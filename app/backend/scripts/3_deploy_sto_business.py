#!/usr/bin/env python3
"""
部署脚本 3：STO 业务合约
部署 Subscription, Staking, LiquidityMining
依赖：需要先运行脚本 1 和 2
"""

from ape import project
import json
from pathlib import Path

from deploy_utils import get_deployer


def main():
    """部署 STO 业务合约"""
    
    print("=" * 60)
    print("📦 部署 STO 业务合约")
    print("=" * 60)
    
    # 获取部署账户
    deployer = get_deployer()
    
    # ============================================
    # 加载前置合约地址
    # ============================================
    base_path = Path(__file__).parent.parent
    
    # 加载 Mock 合约地址
    mocks_file = base_path / "deployed_1_mocks.json"
    if not mocks_file.exists():
        print("❌ 请先运行 1_deploy_mocks.py")
        return None
    
    with open(mocks_file) as f:
        mocks = json.load(f)
    
    # 加载 STO 基础合约地址
    sto_base_file = base_path / "deployed_2_sto_base.json"
    if not sto_base_file.exists():
        print("❌ 请先运行 2_deploy_sto_base.py")
        return None
    
    with open(sto_base_file) as f:
        sto_base = json.load(f)
    
    # 获取合约实例
    usdt_addr = mocks['contracts']['MockUSDT']
    kyc_addr = sto_base['contracts']['KYCManager']
    rwa_addr = sto_base['contracts']['RWATokenSTO']
    plt_addr = sto_base['contracts']['PlatformToken']
    
    print(f"\n📋 加载前置合约:")
    print(f"   MockUSDT:      {usdt_addr}")
    print(f"   KYCManager:    {kyc_addr}")
    print(f"   RWATokenSTO:   {rwa_addr}")
    print(f"   PlatformToken: {plt_addr}")
    
    # 加载合约实例（用于设置权限）
    rwa_token = project.RWATokenSTO.at(rwa_addr)
    platform_token = project.PlatformToken.at(plt_addr)
    
    deployed = {}
    
    # ============================================
    # 1. 部署 Subscription
    # ============================================
    print("\n" + "-" * 60)
    print("1️⃣  部署 Subscription")
    print("-" * 60)
    
    subscription = project.Subscription.deploy(
        usdt_addr,
        rwa_addr,
        kyc_addr,
        sender=deployer
    )
    deployed['Subscription'] = str(subscription.address)
    
    print(f"✅ Subscription 已部署: {subscription.address}")
    print(f"   最小投资: ${subscription.minInvestment() / 10**6:,.0f}")
    print(f"   要求合格投资者: {subscription.requireAccredited()}")
    
    # ============================================
    # 2. 部署 Staking
    # ============================================
    print("\n" + "-" * 60)
    print("2️⃣  部署 Staking")
    print("-" * 60)
    
    staking = project.Staking.deploy(
        rwa_addr,
        plt_addr,
        subscription.address,
        kyc_addr,
        sender=deployer
    )
    deployed['Staking'] = str(staking.address)
    
    print(f"✅ Staking 已部署: {staking.address}")
    print(f"   质押APY: {staking.stakingAPY() / 100}%")
    print(f"   每日释放: {staking.dailyEmission() / 10**18:,.0f} PLT")
    
    # ============================================
    # 3. 部署 LiquidityMining
    # ============================================
    print("\n" + "-" * 60)
    print("3️⃣  部署 LiquidityMining")
    print("-" * 60)
    
    # LP Token 地址暂时用零地址，后续配置 Uniswap 后再更新
    zero_addr = "0x0000000000000000000000000000000000000000"
    
    liquidity_mining = project.LiquidityMining.deploy(
        zero_addr,  # LP Token 稍后设置
        plt_addr,
        kyc_addr,
        sender=deployer
    )
    deployed['LiquidityMining'] = str(liquidity_mining.address)
    
    print(f"✅ LiquidityMining 已部署: {liquidity_mining.address}")
    print(f"   LP Token: {zero_addr} (待设置)")
    print(f"   要求KYC: {liquidity_mining.requireKYC()}")
    print(f"   每日释放: {liquidity_mining.dailyEmission() / 10**18:,.0f} PLT")
    
    # ============================================
    # 4. 设置合约权限
    # ============================================
    print("\n" + "-" * 60)
    print("4️⃣  设置合约权限")
    print("-" * 60)
    
    # RWA Token: 授权 Subscription 铸造/销毁
    print("\n→ 设置 RWATokenSTO 权限...")
    rwa_token.setMinter(subscription.address, True, sender=deployer)
    rwa_token.setBurner(subscription.address, True, sender=deployer)
    print(f"✅ Subscription 可铸造/销毁 RWA Token")
    
    # Platform Token: 授权 Staking 和 LiquidityMining 铸造
    print("\n→ 设置 PlatformToken 权限...")
    platform_token.setMinter(staking.address, True, sender=deployer)
    platform_token.setMinter(liquidity_mining.address, True, sender=deployer)
    print(f"✅ Staking 可铸造 Platform Token")
    print(f"✅ LiquidityMining 可铸造 Platform Token")
    
    # ============================================
    # 保存部署地址
    # ============================================
    output_file = base_path / "deployed_3_sto_business.json"
    
    deployment_info = {
        "step": "3_sto_business",
        "network": "local",
        "deployer": deployer.address,
        "contracts": deployed,
        "dependencies": {
            "mocks": mocks_file.name,
            "sto_base": sto_base_file.name
        }
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
    print(f"  Subscription:     {deployed['Subscription']}")
    print(f"  Staking:          {deployed['Staking']}")
    print(f"  LiquidityMining:  {deployed['LiquidityMining']}")
    
    print("\n⚠️  注意: LiquidityMining 的 LP Token 需要后续配置")
    print("\n📖 下一步: ape run 4_deploy_oracle --network ethereum:local")
    print("=" * 60)
    
    return deployed


if __name__ == "__main__":
    main()

