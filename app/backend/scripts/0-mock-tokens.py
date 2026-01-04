#!/usr/bin/env python3
"""
部署脚本 0：Mock 合约 - 测试用稳定币
仅在 hardhat 环境使用

每次运行都会部署新合约，旧记录标记为 is_active=False。
部署后通过 admin/contracts 页面管理依赖绑定。

Usage:
    ape run 0-mock-tokens --network ethereum:hardhat
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from ape import project
from deploy_utils import (
    check_abi_exists,
    check_deployed,
    deploy_contract,
    get_current_network,
    get_deployer_from_db,
    upload_abi,
)
from falib.utils.tools import DevTools

from src.shared.schemas.enums import ChainID, ContractModule, NetWork

# 项目和部署阶段标识
PROJECT_NAME = ""


def main():
    """部署 Mock 稳定币合约"""
    network = get_current_network()

    print("=" * 60)
    print("📦 部署 Mock 合约 - 测试用稳定币")
    print(f"   网络: {network}")
    print("=" * 60)

    deployer = get_deployer_from_db(network=network, tag="admin")
    chain_id = DevTools.get_enum_value(ChainID, network)
    deployed = {}

    # ============================================
    # 1. 部署 MockUSDT
    # ============================================
    print("\n" + "-" * 60)
    print("1️⃣  MockUSDT")
    print("-" * 60)

    exit_status, local_abi_path = check_abi_exists(
        contract_module=ContractModule.MOCK,
        contract_name="MockUSDT",
        project_name=PROJECT_NAME,
    )

    if not exit_status:
        print(f"❌ ABI 文件不存在: {local_abi_path}")
        return

    remote_abi_path = upload_abi(
        contract_module=ContractModule.MOCK,
        contract_name="MockUSDT",
        project_name=PROJECT_NAME,
    )

    contract = check_deployed(
        name="MockUSDT",
        chain_id=chain_id,
        modules=ContractModule.MOCK,
        network=network,
    )
    if contract:
        print(f"⏭️  MockUSDT 已经部署，不再重复部署: {contract.address}")
        deployed["MockUSDT"] = str(contract.address)
    else:
        mock_usdt, _ = deploy_contract(
            contract_class=project.MockUSDT,
            contract_name="MockUSDT",
            deployer=deployer,
            network=network,
            chain_id=chain_id,
            remote_abi_path=remote_abi_path,
            modules=ContractModule.MOCK,
            project_name=PROJECT_NAME,
        )
        deployed["MockUSDT"] = str(mock_usdt.address)

    # ============================================
    # 2. 部署 MockUSDC
    # ============================================
    print("\n" + "-" * 60)
    print("2️⃣  MockUSDC")
    print("-" * 60)

    exit_status, local_abi_path = check_abi_exists(
        contract_module=ContractModule.MOCK,
        contract_name="MockUSDC",
        project_name=PROJECT_NAME,
    )

    if not exit_status:
        print(f"❌ ABI 文件不存在: {local_abi_path}")
        return

    remote_abi_path = upload_abi(
        contract_module=ContractModule.MOCK,
        contract_name="MockUSDC",
        project_name=PROJECT_NAME,
    )

    contract = check_deployed(
        name="MockUSDC",
        chain_id=chain_id,
        modules=ContractModule.MOCK,
        network=network,
    )
    if contract:
        print(f"⏭️  MockUSDC 已经部署，不再重复部署: {contract.address}")
        deployed["MockUSDC"] = str(contract.address)
    else:
        mock_usdc, _ = deploy_contract(
            contract_class=project.MockUSDC,
            contract_name="MockUSDC",
            deployer=deployer,
            network=network,
            chain_id=chain_id,
            remote_abi_path=remote_abi_path,
            modules=ContractModule.MOCK,
            project_name=PROJECT_NAME,
        )
        deployed["MockUSDC"] = str(mock_usdc.address)

    # 部署摘要
    print("\n" + "=" * 60)
    print("📊 部署摘要")
    print("=" * 60)
    print(f"  MockUSDT: {deployed['MockUSDT']}")
    print(f"  MockUSDC: {deployed['MockUSDC']}")
    print(f"  网络: {network}")
    print("=" * 60)

    return deployed


if __name__ == "__main__":
    main()
