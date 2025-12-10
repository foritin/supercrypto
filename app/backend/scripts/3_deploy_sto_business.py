#!/usr/bin/env python3
"""
部署脚本 3：STO 业务合约
部署 Subscription, Staking, LiquidityMining

依赖：需要先运行脚本 1 和 2

Usage:
    ape run 3_deploy_sto_business --network ethereum:dev
    ape run 3_deploy_sto_business --network ethereum:sepolia

    # 强制重新部署
    ape run 3_deploy_sto_business --network ethereum:dev -- --force
"""

import json
import sys
from pathlib import Path

# 添加 scripts 目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent))

from ape import project
from deploy_utils import (
    deploy_contract,
    get_current_network,
    get_deployer_from_db,
    parse_deploy_args,
    require_deployed,
)

# 部署阶段标识
DEPLOY_STEP = "3_sto_business"


def main():
    """部署 STO 业务合约"""
    # 解析命令行参数
    args = parse_deploy_args()
    network = get_current_network()
    force = args.force

    print("=" * 60)
    print("📦 部署 STO 业务合约")
    print(f"   网络: {network}")
    print(f"   强制部署: {force}")
    print("=" * 60)
    
    # 获取部署账户
    deployer = get_deployer_from_db(network=network)
    
    # ============================================
    # 加载前置合约地址（从数据库）
    # ============================================
    print("\n📋 加载前置合约...")
    
    try:
        usdt_addr = require_deployed("1_mocks", "MockUSDT", network)
        kyc_addr = require_deployed("2_sto_base", "KYCManager", network)
        rwa_addr = require_deployed("2_sto_base", "RWATokenSTO", network)
        plt_addr = require_deployed("2_sto_base", "PlatformToken", network)
    except ValueError as e:
        print(str(e))
        return None
    
    print(f"   MockUSDT:      {usdt_addr}")
    print(f"   KYCManager:    {kyc_addr}")
    print(f"   RWATokenSTO:   {rwa_addr}")
    print(f"   PlatformToken: {plt_addr}")
    
    # 加载合约实例（用于设置权限）
    rwa_token = project.RWATokenSTO.at(rwa_addr)
    platform_token = project.PlatformToken.at(plt_addr)
    
    deployed = {}
    new_deployments = []
    
    # ============================================
    # 1. 部署 Subscription
    # ============================================
    print("\n" + "-" * 60)
    print("1️⃣  Subscription")
    print("-" * 60)
    
    subscription, is_new = deploy_contract(
        contract_class=project.Subscription,
        contract_name="Subscription",
        deployer=deployer,
        deploy_step=DEPLOY_STEP,
        network=network,
        force=force,
        dependencies={
            "MockUSDT": usdt_addr,
            "RWATokenSTO": rwa_addr,
            "KYCManager": kyc_addr,
        },
        # 合约构造函数参数
        _payment_token=usdt_addr,
        _rwa_token=rwa_addr,
        _kyc_manager=kyc_addr,
    )
    deployed['Subscription'] = str(subscription.address)
    
    if is_new:
        new_deployments.append("Subscription")
        print(f"   最小投资: ${subscription.minInvestment() / 10**6:,.0f}")
        print(f"   要求合格投资者: {subscription.requireAccredited()}")
    
    # ============================================
    # 2. 部署 Staking
    # ============================================
    print("\n" + "-" * 60)
    print("2️⃣  Staking")
    print("-" * 60)
    
    staking, is_new = deploy_contract(
        contract_class=project.Staking,
        contract_name="Staking",
        deployer=deployer,
        deploy_step=DEPLOY_STEP,
        network=network,
        force=force,
        dependencies={
            "RWATokenSTO": rwa_addr,
            "PlatformToken": plt_addr,
            "Subscription": deployed['Subscription'],
            "KYCManager": kyc_addr,
        },
        # 合约构造函数参数
        _rwa_token=rwa_addr,
        _platform_token=plt_addr,
        _subscription=subscription.address,
        _kyc_manager=kyc_addr,
    )
    deployed['Staking'] = str(staking.address)
    
    if is_new:
        new_deployments.append("Staking")
        print(f"   质押APY: {staking.stakingAPY() / 100}%")
        print(f"   每日释放: {staking.dailyEmission() / 10**18:,.0f} PLT")
    
    # ============================================
    # 3. 部署 LiquidityMining
    # ============================================
    print("\n" + "-" * 60)
    print("3️⃣  LiquidityMining")
    print("-" * 60)
    
    # LP Token 地址暂时用零地址，后续配置 Uniswap 后再更新
    zero_addr = "0x0000000000000000000000000000000000000000"
    
    liquidity_mining, is_new = deploy_contract(
        contract_class=project.LiquidityMining,
        contract_name="LiquidityMining",
        deployer=deployer,
        deploy_step=DEPLOY_STEP,
        network=network,
        force=force,
        dependencies={
            "LPToken": zero_addr,
            "PlatformToken": plt_addr,
            "KYCManager": kyc_addr,
        },
        # 合约构造函数参数
        _lp_token=zero_addr,
        _reward_token=plt_addr,
        _kyc_manager=kyc_addr,
    )
    deployed['LiquidityMining'] = str(liquidity_mining.address)
    
    if is_new:
        new_deployments.append("LiquidityMining")
        print(f"   LP Token: {zero_addr} (待设置)")
        print(f"   要求KYC: {liquidity_mining.requireKYC()}")
        print(f"   每日释放: {liquidity_mining.dailyEmission() / 10**18:,.0f} PLT")
    
    # ============================================
    # 4. 设置合约权限（仅新部署时）
    # ============================================
    if new_deployments:
        print("\n" + "-" * 60)
        print("4️⃣  设置合约权限")
        print("-" * 60)
        
        # RWA Token: 授权 Subscription 铸造/销毁
        if "Subscription" in new_deployments:
            print("\n→ 设置 RWATokenSTO 权限...")
            rwa_token.setMinter(subscription.address, True, sender=deployer)
            rwa_token.setBurner(subscription.address, True, sender=deployer)
            print(f"✅ Subscription 可铸造/销毁 RWA Token")
        
        # Platform Token: 授权 Staking 和 LiquidityMining 铸造
        if "Staking" in new_deployments:
            print("\n→ 设置 PlatformToken 权限 (Staking)...")
            platform_token.setMinter(staking.address, True, sender=deployer)
            print(f"✅ Staking 可铸造 Platform Token")
        
        if "LiquidityMining" in new_deployments:
            print("\n→ 设置 PlatformToken 权限 (LiquidityMining)...")
            platform_token.setMinter(liquidity_mining.address, True, sender=deployer)
            print(f"✅ LiquidityMining 可铸造 Platform Token")
    
    # ============================================
    # 保存部署地址到 JSON（向后兼容）
    # ============================================
    output_dir = Path(__file__).parent.parent / "output"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / f"deployed_{DEPLOY_STEP}.json"
    
    deployment_info = {
        "step": DEPLOY_STEP,
        "network": network,
        "deployer": deployer.address,
        "contracts": deployed,
        "dependencies": {
            "1_mocks": ["MockUSDT"],
            "2_sto_base": ["KYCManager", "RWATokenSTO", "PlatformToken"]
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
    
    if new_deployments:
        print(f"\n  🆕 新部署: {', '.join(new_deployments)}")
    else:
        print(f"\n  ⏭️  所有合约已存在，无新部署")
    
    print("\n⚠️  注意: LiquidityMining 的 LP Token 需要后续配置")
    print(f"\n📖 下一步: ape run 4_deploy_oracle --network ethereum:{network}")
    print("=" * 60)
    
    return deployed


if __name__ == "__main__":
    main()
