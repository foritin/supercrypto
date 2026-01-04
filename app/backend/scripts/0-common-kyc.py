#!/usr/bin/env python3
"""
部署脚本 0：公共合约 - DefaultKYCManager
所有项目共享的 KYC 合约

每次运行都会部署新合约，旧记录标记为 is_active=False。
部署后通过 admin/contracts 页面管理依赖绑定。

Usage:
    ape run 0-common-kyc --network ethereum:hardhat
    ape run 0-common-kyc --network ethereum:sepolia
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

from src.shared.common.adapters import get_minio_adapter
from src.shared.schemas.enums import ChainID, ContractModule, NetWork

# 项目和部署阶段标识
PROJECT_NAME = ""


def main():
    """部署公共 DefaultKYCManager 合约"""
    network = get_current_network()

    print("=" * 60)
    print("📦 部署公共合约 - DefaultKYCManager")
    print(f"   网络: {network}")
    print("=" * 60)
    deployer = get_deployer_from_db(network=network, tag="admin")
    chain_id = DevTools.get_enum_value(ChainID, network)
    deployed = {}

    # 部署 DefaultKYCManager
    print("\n" + "-" * 60)
    print("🔐 DefaultKYCManager (公共合约)")
    print("-" * 60)

    exit_status, local_abi_path = check_abi_exists(
        contract_module=ContractModule.COMMON,
        contract_name="DefaultKYCManager",
        project_name=PROJECT_NAME,
    )

    if not exit_status:
        print(f"❌ ABI 文件不存在: {local_abi_path}")
        return

    remote_abi_path = upload_abi(
        contract_module=ContractModule.COMMON,
        contract_name="DefaultKYCManager",
        project_name=PROJECT_NAME,
    )

    contract = check_deployed(
        name="DefaultKYCManager",
        chain_id=chain_id,
        modules=ContractModule.COMMON,
        network=network,
    )
    if contract:
        print(f"⏭️  DefaultKYCManager 已经部署，不再重复部署: {contract.address}")
        return contract

    contract, _ = deploy_contract(
        contract_class=project.DefaultKYCManager,
        contract_name="DefaultKYCManager",
        deployer=deployer,
        network=network,
        chain_id=chain_id,
        modules=ContractModule.COMMON,
        remote_abi_path=remote_abi_path,
        project_name=PROJECT_NAME,
    )
    deployed["DefaultKYCManager"] = str(contract.address)

    # 部署摘要
    print("\n" + "=" * 60)
    print("📊 部署摘要")
    print("=" * 60)
    print(f"  DefaultKYCManager: {deployed['DefaultKYCManager']}")
    print(f"  网络: {network}")
    print("=" * 60)

    return deployed


if __name__ == "__main__":
    main()
