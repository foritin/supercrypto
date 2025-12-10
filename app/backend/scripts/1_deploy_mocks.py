#!/usr/bin/env python3
"""
部署脚本 1：Mock 代币
部署 MockUSDT 和 MockUSDC 用于测试环境

Usage:
    ape run 1_deploy_mocks --network ethereum:dev
    ape run 1_deploy_mocks --network ethereum:sepolia

    # 强制重新部署
    ape run 1_deploy_mocks --network ethereum:dev -- --force
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
)

# 部署阶段标识
DEPLOY_STEP = "1_mocks"


def main():
    """部署 Mock 代币合约"""
    # 解析命令行参数
    args = parse_deploy_args()
    network = get_current_network()
    force = args.force

    print("=" * 60)
    print("📦 部署 Mock 代币")
    print(f"   网络: {network}")
    print(f"   强制部署: {force}")
    print("=" * 60)

    # 获取部署账户
    deployer = get_deployer_from_db(network=network)

    deployed = {}
    new_deployments = []

    # ============================================
    # 1. 部署 MockUSDT
    # ============================================
    print("\n" + "-" * 60)
    print("1️⃣  MockUSDT")
    print("-" * 60)

    usdt, is_new = deploy_contract(
        contract_class=project.MockUSDT,
        contract_name="MockUSDT",
        deployer=deployer,
        deploy_step=DEPLOY_STEP,
        network=network,
        force=force,
    )
    deployed["MockUSDT"] = str(usdt.address)

    if is_new:
        new_deployments.append("MockUSDT")
        print(f"   名称: {usdt.name()}")
        print(f"   符号: {usdt.symbol()}")
        print(f"   精度: {usdt.decimals()}")

    # ============================================
    # 2. 部署 MockUSDC
    # ============================================
    print("\n" + "-" * 60)
    print("2️⃣  MockUSDC")
    print("-" * 60)

    usdc, is_new = deploy_contract(
        contract_class=project.MockUSDC,
        contract_name="MockUSDC",
        deployer=deployer,
        deploy_step=DEPLOY_STEP,
        network=network,
        force=force,
    )
    deployed["MockUSDC"] = str(usdc.address)

    if is_new:
        new_deployments.append("MockUSDC")
        print(f"   名称: {usdc.name()}")
        print(f"   符号: {usdc.symbol()}")
        print(f"   精度: {usdc.decimals()}")

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

    if new_deployments:
        print(f"\n  🆕 新部署: {', '.join(new_deployments)}")
    else:
        print("\n  ⏭️  所有合约已存在，无新部署")

    print(f"\n📖 下一步: ape run 2_deploy_sto_base --network ethereum:{network}")
    print("=" * 60)

    return deployed


if __name__ == "__main__":
    main()
