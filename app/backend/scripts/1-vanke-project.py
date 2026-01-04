#!/usr/bin/env python3
"""
部署脚本 1：Vanke 项目 - 完整合约套件
部署 VankeRWAToken, VankePlatformToken, VankeSubscription, VankeStaking, VankeLiquidityMining

依赖：
- 0-common-kyc (KYCManager)
- 0-mock-tokens (MockUSDT) - 仅 hardhat 网络

每次运行都会部署新合约，旧记录标记为 is_active=False。
部署后通过 admin/contracts 页面管理依赖绑定。

Usage:
    ape run 1-vanke-project --network ethereum:hardhat
    ape run 1-vanke-project --network ethereum:sepolia
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
PROJECT_NAME = "vanke"

# 零地址占位符（后续通过 admin/contracts 页面配置真实地址）
ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"


def main():
    """部署 Vanke 项目完整合约套件"""
    network = get_current_network()

    print("=" * 60)
    print("📦 部署 Vanke 项目 - 完整合约套件")
    print(f"   网络: {network}")
    print("=" * 60)

    deployer = get_deployer_from_db(network=network, tag="admin")
    chain_id = DevTools.get_enum_value(ChainID, network)

    deployed = {}

    # ============================================
    # 代币合约
    # ============================================

    # 1. 部署 VankeRWAToken
    print("\n" + "-" * 60)
    print("1️⃣  VankeRWAToken")
    print("-" * 60)

    exit_status, local_abi_path = check_abi_exists(
        contract_module=ContractModule.PROJECT,
        contract_name="VankeRWAToken",
        project_name=PROJECT_NAME,
    )

    if not exit_status:
        print(f"❌ ABI 文件不存在: {local_abi_path}")
        return

    remote_abi_path = upload_abi(
        contract_module=ContractModule.PROJECT,
        contract_name="VankeRWAToken",
        project_name=PROJECT_NAME,
    )

    contract = check_deployed(
        name="VankeRWAToken",
        chain_id=chain_id,
        modules=ContractModule.PROJECT,
        network=network,
    )
    if contract:
        print(f"⏭️  VankeRWAToken 已经部署，不再重复部署: {contract.address}")
        deployed["VankeRWAToken"] = str(contract.address)
    else:
        rwa_token, _ = deploy_contract(
            contract_class=project.VankeRWAToken,
            contract_name="VankeRWAToken",
            deployer=deployer,
            network=network,
            chain_id=chain_id,
            remote_abi_path=remote_abi_path,
            modules=ContractModule.PROJECT,
            project_name=PROJECT_NAME,
            _kyc_manager=ZERO_ADDRESS,  # 占位符，后续通过 admin 页面配置
        )
        deployed["VankeRWAToken"] = str(rwa_token.address)

    # 2. 部署 VankePlatformToken
    print("\n" + "-" * 60)
    print("2️⃣  VankePlatformToken")
    print("-" * 60)

    exit_status, local_abi_path = check_abi_exists(
        contract_module=ContractModule.PROJECT,
        contract_name="VankePlatformToken",
        project_name=PROJECT_NAME,
    )

    if not exit_status:
        print(f"❌ ABI 文件不存在: {local_abi_path}")
        return

    remote_abi_path = upload_abi(
        contract_module=ContractModule.PROJECT,
        contract_name="VankePlatformToken",
        project_name=PROJECT_NAME,
    )

    contract = check_deployed(
        name="VankePlatformToken",
        chain_id=chain_id,
        modules=ContractModule.PROJECT,
        network=network,
    )
    if contract:
        print(f"⏭️  VankePlatformToken 已经部署，不再重复部署: {contract.address}")
        deployed["VankePlatformToken"] = str(contract.address)
    else:
        platform_token, _ = deploy_contract(
            contract_class=project.VankePlatformToken,
            contract_name="VankePlatformToken",
            deployer=deployer,
            network=network,
            chain_id=chain_id,
            remote_abi_path=remote_abi_path,
            modules=ContractModule.PROJECT,
            project_name=PROJECT_NAME,
        )
        deployed["VankePlatformToken"] = str(platform_token.address)

    # ============================================
    # 业务合约
    # ============================================

    # 3. 部署 VankeSubscription
    print("\n" + "-" * 60)
    print("3️⃣  VankeSubscription")
    print("-" * 60)

    exit_status, local_abi_path = check_abi_exists(
        contract_module=ContractModule.PROJECT,
        contract_name="VankeSubscription",
        project_name=PROJECT_NAME,
    )

    if not exit_status:
        print(f"❌ ABI 文件不存在: {local_abi_path}")
        return

    remote_abi_path = upload_abi(
        contract_module=ContractModule.PROJECT,
        contract_name="VankeSubscription",
        project_name=PROJECT_NAME,
    )

    contract = check_deployed(
        name="VankeSubscription",
        chain_id=chain_id,
        modules=ContractModule.PROJECT,
        network=network,
    )
    if contract:
        print(f"⏭️  VankeSubscription 已经部署，不再重复部署: {contract.address}")
        deployed["VankeSubscription"] = str(contract.address)
    else:
        subscription, _ = deploy_contract(
            contract_class=project.VankeSubscription,
            contract_name="VankeSubscription",
            deployer=deployer,
            network=network,
            chain_id=chain_id,
            remote_abi_path=remote_abi_path,
            modules=ContractModule.PROJECT,
            project_name=PROJECT_NAME,
            _usdt=ZERO_ADDRESS,  # 占位符，后续通过 admin 页面配置
            _rwa_token=ZERO_ADDRESS,  # 占位符，后续通过 admin 页面配置
            _kyc_manager=ZERO_ADDRESS,  # 占位符，后续通过 admin 页面配置
        )
        deployed["VankeSubscription"] = str(subscription.address)

    # 4. 部署 VankeStaking
    print("\n" + "-" * 60)
    print("4️⃣  VankeStaking")
    print("-" * 60)

    exit_status, local_abi_path = check_abi_exists(
        contract_module=ContractModule.PROJECT,
        contract_name="VankeStaking",
        project_name=PROJECT_NAME,
    )

    if not exit_status:
        print(f"❌ ABI 文件不存在: {local_abi_path}")
        return

    remote_abi_path = upload_abi(
        contract_module=ContractModule.PROJECT,
        contract_name="VankeStaking",
        project_name=PROJECT_NAME,
    )

    contract = check_deployed(
        name="VankeStaking",
        chain_id=chain_id,
        modules=ContractModule.PROJECT,
        network=network,
    )
    if contract:
        print(f"⏭️  VankeStaking 已经部署，不再重复部署: {contract.address}")
        deployed["VankeStaking"] = str(contract.address)
    else:
        staking, _ = deploy_contract(
            contract_class=project.VankeStaking,
            contract_name="VankeStaking",
            deployer=deployer,
            network=network,
            chain_id=chain_id,
            remote_abi_path=remote_abi_path,
            modules=ContractModule.PROJECT,
            project_name=PROJECT_NAME,
            _rwaToken=ZERO_ADDRESS,  # 占位符，后续通过 admin 页面配置
            _platformToken=ZERO_ADDRESS,  # 占位符，后续通过 admin 页面配置
            _subscription=ZERO_ADDRESS,  # 占位符，后续通过 admin 页面配置
            _kycManager=ZERO_ADDRESS,  # 占位符，后续通过 admin 页面配置
        )
        deployed["VankeStaking"] = str(staking.address)

    # 5. 部署 VankeLiquidityMining
    print("\n" + "-" * 60)
    print("5️⃣  VankeLiquidityMining")
    print("-" * 60)

    exit_status, local_abi_path = check_abi_exists(
        contract_module=ContractModule.PROJECT,
        contract_name="VankeLiquidityMining",
        project_name=PROJECT_NAME,
    )

    if not exit_status:
        print(f"❌ ABI 文件不存在: {local_abi_path}")
        return

    remote_abi_path = upload_abi(
        contract_module=ContractModule.PROJECT,
        contract_name="VankeLiquidityMining",
        project_name=PROJECT_NAME,
    )

    contract = check_deployed(
        name="VankeLiquidityMining",
        chain_id=chain_id,
        modules=ContractModule.PROJECT,
        network=network,
    )
    if contract:
        print(f"⏭️  VankeLiquidityMining 已经部署，不再重复部署: {contract.address}")
        deployed["VankeLiquidityMining"] = str(contract.address)
    else:
        liquidity_mining, _ = deploy_contract(
            contract_class=project.VankeLiquidityMining,
            contract_name="VankeLiquidityMining",
            deployer=deployer,
            network=network,
            chain_id=chain_id,
            remote_abi_path=remote_abi_path,
            modules=ContractModule.PROJECT,
            project_name=PROJECT_NAME,
            _lp_token=ZERO_ADDRESS,  # 占位符，后续通过 admin 页面配置
            _platform_token=ZERO_ADDRESS,  # 占位符，后续通过 admin 页面配置
            _kyc_manager=ZERO_ADDRESS,  # 占位符，后续通过 admin 页面配置
        )
        deployed["VankeLiquidityMining"] = str(liquidity_mining.address)

    # 部署摘要
    print("\n" + "=" * 60)
    print("📊 部署摘要")
    print("=" * 60)
    print("  代币合约:")
    print(f"    VankeRWAToken:       {deployed['VankeRWAToken']}")
    print(f"    VankePlatformToken:  {deployed['VankePlatformToken']}")
    print("  业务合约:")
    print(f"    VankeSubscription:      {deployed['VankeSubscription']}")
    print(f"    VankeStaking:           {deployed['VankeStaking']}")
    print(f"    VankeLiquidityMining:   {deployed['VankeLiquidityMining']}")
    print(f"  网络: {network}")

    print(f"\n📖 下一步: ape run 2-vanke-oracle --network ethereum:{network}")
    print("\n⚠️  注意: 合约依赖和权限配置需要通过 admin/contracts 页面管理")
    print("       - KYCManager 地址需要绑定到 VankeRWAToken")
    print("       - USDT 地址需要绑定到 VankeSubscription")
    print("       - LP Token 地址需要绑定到 VankeLiquidityMining")
    print("       - 其他依赖关系也需在后台配置")
    print("=" * 60)

    return deployed


if __name__ == "__main__":
    main()
