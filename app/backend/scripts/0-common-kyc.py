#!/usr/bin/env python3
"""
部署脚本 0：公共合约 - KYCManager
所有项目共享的 KYC 合约

每次运行都会部署新合约，旧记录标记为 is_active=False。
部署后通过 admin/contracts 页面管理依赖绑定。

Usage:
    ape run 0-common-kyc --network ethereum:local
    ape run 0-common-kyc --network ethereum:sepolia
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
PROJECT = "common"
DEPLOY_STEP = "0-common-kyc"


def main():
    """部署公共 KYCManager 合约"""
    network = get_current_network()

    print("=" * 60)
    print("📦 部署公共合约 - KYCManager")
    print(f"   项目: {PROJECT}")
    print(f"   网络: {network}")
    print("=" * 60)
    
    deployer = get_deployer_from_db(network=network)
    
    deployed = {}
    
    # 部署 KYCManager
    print("\n" + "-" * 60)
    print("🔐 KYCManager (公共合约)")
    print("-" * 60)
    
    kyc_manager, is_new = deploy_contract(
        contract_class=project.KYCManager,
        contract_name="KYCManager",
        deployer=deployer,
        deploy_step=DEPLOY_STEP,
        network=network,
        project=PROJECT,
    )
    deployed['KYCManager'] = str(kyc_manager.address)
    
    if is_new:
        print(f"   最大投资者数: {kyc_manager.maxInvestors()}")
        print(f"   KYC有效期: {kyc_manager.kycExpiryPeriod() / (24*3600)} 天")
    
    # 部署摘要
    print("\n" + "=" * 60)
    print("📊 部署摘要")
    print("=" * 60)
    print(f"  KYCManager: {deployed['KYCManager']}")
    print(f"  项目: {PROJECT}")
    print(f"  网络: {network}")
    print("=" * 60)
    
    return deployed


if __name__ == "__main__":
    main()

