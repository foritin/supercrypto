#!/usr/bin/env python3
"""
部署脚本 3：Fake 项目 - 业务合约
部署 Subscription, Staking, LiquidityMining

依赖：
- 0-common-kyc (KYCManager)
- 1-mock-tokens (MockUSDT) - 仅 local 网络
- 2-fake-tokens (RWATokenSTO, PlatformToken)

每次运行都会部署新合约。
部署后通过 admin/contracts 页面管理依赖绑定。

Usage:
    ape run 3-fake-business --network ethereum:local
    ape run 3-fake-business --network ethereum:sepolia
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
DEPLOY_STEP = "3-fake-business"


def main():
    """部署 Fake 项目业务合约"""
    network = get_current_network()

    print("=" * 60)
    print("📦 部署 Fake 项目 - 业务合约")
    print(f"   项目: {PROJECT}")
    print(f"   网络: {network}")
    print("=" * 60)
    
    deployer = get_deployer_from_db(network=network)
    
    # 检查依赖
    print("\n📋 检查依赖...")
    
    try:
        # 公共合约
        kyc_addr = require_deployed("0-common-kyc", "KYCManager", network)
        print(f"   ✅ KYCManager: {kyc_addr}")
        
        # Mock 合约（仅 local）
        if network == "local":
            usdt_addr = require_deployed("1-mock-tokens", "MockUSDT", network)
            print(f"   ✅ MockUSDT: {usdt_addr}")
        else:
            # 测试网/主网使用真实 USDT 地址
            # TODO: 从配置文件读取
            usdt_addr = None
            print(f"   ⚠️  MockUSDT: 需要配置真实 USDT 地址")
        
        # Fake 代币合约
        rwa_addr = require_deployed("2-fake-tokens", "RWATokenSTO", network)
        plt_addr = require_deployed("2-fake-tokens", "PlatformToken", network)
        print(f"   ✅ RWATokenSTO: {rwa_addr}")
        print(f"   ✅ PlatformToken: {plt_addr}")
        
    except ValueError as e:
        print(str(e))
        print("\n⚠️  请先运行依赖的部署脚本")
        return None
    
    if not usdt_addr:
        print("\n❌ 缺少 USDT 地址，无法继续部署")
        return None
    
    # 加载合约实例
    rwa_token = project.RWATokenSTO.at(rwa_addr)
    platform_token = project.PlatformToken.at(plt_addr)
    
    deployed = {}
    
    # 1. 部署 Subscription
    print("\n" + "-" * 60)
    print("1️⃣  Subscription")
    print("-" * 60)
    
    subscription, is_new = deploy_contract(
        contract_class=project.Subscription,
        contract_name="Subscription",
        deployer=deployer,
        deploy_step=DEPLOY_STEP,
        network=network,
        project=PROJECT,
        dependencies={
            "MockUSDT": usdt_addr,
            "RWATokenSTO": rwa_addr,
            "KYCManager": kyc_addr,
        },
        _usdt=usdt_addr,
        _rwaToken=rwa_addr,
        _kycManager=kyc_addr,
    )
    deployed['Subscription'] = str(subscription.address)
    
    print(f"   最小投资: ${subscription.minInvestment() / 10**6:,.0f}")
    print(f"   要求合格投资者: {subscription.requireAccredited()}")
    
    # 2. 部署 Staking
    print("\n" + "-" * 60)
    print("2️⃣  Staking")
    print("-" * 60)
    
    staking, is_new = deploy_contract(
        contract_class=project.Staking,
        contract_name="Staking",
        deployer=deployer,
        deploy_step=DEPLOY_STEP,
        network=network,
        project=PROJECT,
        dependencies={
            "RWATokenSTO": rwa_addr,
            "PlatformToken": plt_addr,
            "Subscription": deployed['Subscription'],
            "KYCManager": kyc_addr,
        },
        _rwaToken=rwa_addr,
        _platformToken=plt_addr,
        _subscription=subscription.address,
        _kycManager=kyc_addr,
    )
    deployed['Staking'] = str(staking.address)
    
    print(f"   质押APY: {staking.stakingAPY() / 100}%")
    print(f"   每日释放: {staking.dailyEmission() / 10**18:,.0f} PLT")
    
    # 3. 部署 LiquidityMining
    print("\n" + "-" * 60)
    print("3️⃣  LiquidityMining")
    print("-" * 60)
    
    zero_addr = "0x0000000000000000000000000000000000000000"
    
    liquidity_mining, is_new = deploy_contract(
        contract_class=project.LiquidityMining,
        contract_name="LiquidityMining",
        deployer=deployer,
        deploy_step=DEPLOY_STEP,
        network=network,
        project=PROJECT,
        dependencies={
            "PlatformToken": plt_addr,
            "KYCManager": kyc_addr,
        },
        _lpToken=zero_addr,
        _platformToken=plt_addr,
        _kycManager=kyc_addr,
    )
    deployed['LiquidityMining'] = str(liquidity_mining.address)
    
    print(f"   LP Token: {zero_addr} (待设置)")
    print(f"   要求KYC: {liquidity_mining.requireKYC()}")
    print(f"   每日释放: {liquidity_mining.dailyEmission() / 10**18:,.0f} PLT")
    
    # 4. 设置合约权限
    print("\n" + "-" * 60)
    print("4️⃣  设置合约权限")
    print("-" * 60)
    
    print("\n→ 设置 RWATokenSTO 权限...")
    rwa_token.setMinter(subscription.address, True, sender=deployer)
    rwa_token.setBurner(subscription.address, True, sender=deployer)
    print(f"✅ Subscription 可铸造/销毁 RWA Token")
    
    print("\n→ 设置 PlatformToken 权限 (Staking)...")
    platform_token.setMinter(staking.address, True, sender=deployer)
    print(f"✅ Staking 可铸造 Platform Token")
    
    print("\n→ 设置 PlatformToken 权限 (LiquidityMining)...")
    platform_token.setMinter(liquidity_mining.address, True, sender=deployer)
    print(f"✅ LiquidityMining 可铸造 Platform Token")
    
    # 部署摘要
    print("\n" + "=" * 60)
    print("📊 部署摘要")
    print("=" * 60)
    print(f"  Subscription:     {deployed['Subscription']}")
    print(f"  Staking:          {deployed['Staking']}")
    print(f"  LiquidityMining:  {deployed['LiquidityMining']}")
    print(f"  项目: {PROJECT}")
    print(f"  网络: {network}")
    
    print("\n⚠️  注意: LiquidityMining 的 LP Token 需要后续配置")
    print("📖 部署完成后，请访问 admin/contracts 页面确认依赖绑定")
    print("=" * 60)
    
    return deployed


if __name__ == "__main__":
    main()
