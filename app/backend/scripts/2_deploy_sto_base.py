#!/usr/bin/env python3
"""
部署脚本 2：STO 基础合约
部署 KYCManager, RWATokenSTO, PlatformToken

Usage:
    ape run 2_deploy_sto_base --network ethereum:dev
    ape run 2_deploy_sto_base --network ethereum:sepolia

    # 强制重新部署
    ape run 2_deploy_sto_base --network ethereum:dev -- --force
"""

import json
import sys
from pathlib import Path

# 添加 scripts 目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent))

from ape import project
from deploy_utils import (
    check_deployed,
    deploy_contract,
    get_current_network,
    get_deployer_from_db,
    parse_deploy_args,
)

# 部署阶段标识
DEPLOY_STEP = "2_sto_base"


def main():
    """部署 STO 基础合约"""
    # 解析命令行参数
    args = parse_deploy_args()
    network = get_current_network()
    force = args.force

    print("=" * 60)
    print("📦 部署 STO 基础合约")
    print(f"   网络: {network}")
    print(f"   强制部署: {force}")
    print("=" * 60)
    
    # 获取部署账户
    deployer = get_deployer_from_db(network=network)
    
    deployed = {}
    new_deployments = []
    
    # ============================================
    # 1. 部署 KYCManager
    # ============================================
    print("\n" + "-" * 60)
    print("1️⃣  KYCManager")
    print("-" * 60)
    
    kyc_manager, is_new = deploy_contract(
        contract_class=project.KYCManager,
        contract_name="KYCManager",
        deployer=deployer,
        deploy_step=DEPLOY_STEP,
        network=network,
        force=force,
    )
    deployed['KYCManager'] = str(kyc_manager.address)
    
    if is_new:
        new_deployments.append("KYCManager")
        print(f"   最大投资者数: {kyc_manager.maxInvestors()}")
        print(f"   KYC有效期: {kyc_manager.kycExpiryPeriod() / (24*3600)} 天")
    
    # ============================================
    # 2. 部署 RWATokenSTO
    # ============================================
    print("\n" + "-" * 60)
    print("2️⃣  RWATokenSTO")
    print("-" * 60)
    
    # 检查是否需要部署（考虑依赖关系）
    rwa_existing = check_deployed(DEPLOY_STEP, "RWATokenSTO", network)
    
    # 如果 KYCManager 是新部署的，RWATokenSTO 也需要重新部署
    force_rwa = force or ("KYCManager" in new_deployments and rwa_existing is not None)
    
    if force_rwa and not force and rwa_existing:
        print("⚠️  KYCManager 已更新，需要重新部署 RWATokenSTO")
    
    rwa_token, is_new = deploy_contract(
        contract_class=project.RWATokenSTO,
        contract_name="RWATokenSTO",
        deployer=deployer,
        deploy_step=DEPLOY_STEP,
        network=network,
        force=force_rwa,
        dependencies={"KYCManager": deployed['KYCManager']},
        # 合约构造函数参数
        _kyc_manager=kyc_manager.address,
    )
    deployed['RWATokenSTO'] = str(rwa_token.address)
    
    if is_new:
        new_deployments.append("RWATokenSTO")
        print(f"   名称: {rwa_token.name()}")
        print(f"   符号: {rwa_token.symbol()}")
        print(f"   精度: {rwa_token.decimals()}")
        print(f"   KYC管理器: {rwa_token.kycManager()}")
    
    # ============================================
    # 3. 部署 PlatformToken
    # ============================================
    print("\n" + "-" * 60)
    print("3️⃣  PlatformToken")
    print("-" * 60)
    
    platform_token, is_new = deploy_contract(
        contract_class=project.PlatformToken,
        contract_name="PlatformToken",
        deployer=deployer,
        deploy_step=DEPLOY_STEP,
        network=network,
        force=force,
    )
    deployed['PlatformToken'] = str(platform_token.address)
    
    if is_new:
        new_deployments.append("PlatformToken")
        print(f"   名称: {platform_token.name()}")
        print(f"   符号: {platform_token.symbol()}")
        print(f"   最大供应量: {platform_token.maxSupply() / 10**18:,.0f}")
    
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
    
    if new_deployments:
        print(f"\n  🆕 新部署: {', '.join(new_deployments)}")
    else:
        print(f"\n  ⏭️  所有合约已存在，无新部署")
    
    print(f"\n📖 下一步: ape run 3_deploy_sto_business --network ethereum:{network}")
    print("=" * 60)
    
    return deployed


if __name__ == "__main__":
    main()
