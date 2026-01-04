#!/usr/bin/env python3
"""
部署脚本 2：Vanke 预言机系统
部署 MultiSigManager, Timelock, VankeRWAOracle, VankeDataAggregator, VankeOracleConsumer

依赖：
- 1-vanke-project (可选，预言机系统相对独立)

Usage:
    ape run 2-vanke-oracle --network ethereum:local
    ape run 2-vanke-oracle --network ethereum:sepolia
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from ape import accounts, project
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
    """部署 Vanke 预言机系统"""
    network = get_current_network()

    print("=" * 60)
    print("🔮 部署 Vanke 预言机系统")
    print(f"   网络: {network}")
    print("=" * 60)

    deployer = get_deployer_from_db(network=network, tag="admin")
    chain_id = DevTools.get_enum_value(ChainID, network)

    # 定义签名者（2-of-3 多签）
    # 在测试环境使用测试账户，生产环境应使用真实多签地址
    if network == NetWork.LOCAL.value:
        signers = [
            accounts.test_accounts[0].address,
            accounts.test_accounts[1].address,
            accounts.test_accounts[2].address,
        ]
    else:
        # TODO: 从配置文件或环境变量读取生产环境多签地址
        raise ValueError(
            f"❌ 网络 {network} 的多签地址未配置！\n   请在脚本中配置 signers 列表"
        )

    print(f"\n👥 多签签名者 (2-of-3):")
    for i, signer in enumerate(signers, 1):
        print(f"   签名者{i}: {signer}")

    deployed = {}

    # ============================================
    # 1. 部署 MultiSigManager
    # ============================================
    print("\n" + "-" * 60)
    print("1️⃣  MultiSigManager")
    print("-" * 60)

    exit_status, local_abi_path = check_abi_exists(
        contract_module=ContractModule.PROJECT,
        contract_name="MultiSigManager",
        project_name=PROJECT_NAME,
    )

    if not exit_status:
        print(f"❌ ABI 文件不存在: {local_abi_path}")
        return

    remote_abi_path = upload_abi(
        contract_module=ContractModule.PROJECT,
        contract_name="MultiSigManager",
        project_name=PROJECT_NAME,
    )

    contract = check_deployed(
        name="MultiSigManager",
        chain_id=chain_id,
        modules=ContractModule.PROJECT,
        network=network,
    )
    if contract:
        print(f"⏭️  MultiSigManager 已经部署，不再重复部署: {contract.address}")
        deployed["MultiSigManager"] = str(contract.address)
    else:
        multisig, _ = deploy_contract(
            contract_class=project.MultiSigManager,
            contract_name="MultiSigManager",
            deployer=deployer,
            network=network,
            chain_id=chain_id,
            remote_abi_path=remote_abi_path,
            modules=ContractModule.PROJECT,
            project_name=PROJECT_NAME,
            _initial_signers=signers,
        )
        deployed["MultiSigManager"] = str(multisig.address)
        print(f"   签名者数量: {multisig.signer_count()}")
        print(f"   所需签名: {multisig.required_signatures()}")

    # ============================================
    # 2. 部署 Timelock
    # ============================================
    print("\n" + "-" * 60)
    print("2️⃣  Timelock")
    print("-" * 60)

    exit_status, local_abi_path = check_abi_exists(
        contract_module=ContractModule.PROJECT,
        contract_name="Timelock",
        project_name=PROJECT_NAME,
    )

    if not exit_status:
        print(f"❌ ABI 文件不存在: {local_abi_path}")
        return

    remote_abi_path = upload_abi(
        contract_module=ContractModule.PROJECT,
        contract_name="Timelock",
        project_name=PROJECT_NAME,
    )

    contract = check_deployed(
        name="Timelock",
        chain_id=chain_id,
        modules=ContractModule.PROJECT,
        network=network,
    )
    if contract:
        print(f"⏭️  Timelock 已经部署，不再重复部署: {contract.address}")
        deployed["Timelock"] = str(contract.address)
    else:
        timelock, _ = deploy_contract(
            contract_class=project.Timelock,
            contract_name="Timelock",
            deployer=deployer,
            network=network,
            chain_id=chain_id,
            remote_abi_path=remote_abi_path,
            modules=ContractModule.PROJECT,
            project_name=PROJECT_NAME,
            _multiSigManager=deployed.get("MultiSigManager", ZERO_ADDRESS),
        )
        deployed["Timelock"] = str(timelock.address)
        print(f"   延迟时间: {timelock.delay() / 3600} 小时")
        print(f"   多签管理器: {timelock.multi_sig_manager()}")

    # ============================================
    # 3. 部署 VankeRWAOracle
    # ============================================
    print("\n" + "-" * 60)
    print("3️⃣  VankeRWAOracle")
    print("-" * 60)

    exit_status, local_abi_path = check_abi_exists(
        contract_module=ContractModule.PROJECT,
        contract_name="VankeRWAOracle",
        project_name=PROJECT_NAME,
    )

    if not exit_status:
        print(f"❌ ABI 文件不存在: {local_abi_path}")
        return

    remote_abi_path = upload_abi(
        contract_module=ContractModule.PROJECT,
        contract_name="VankeRWAOracle",
        project_name=PROJECT_NAME,
    )

    contract = check_deployed(
        name="VankeRWAOracle",
        chain_id=chain_id,
        modules=ContractModule.PROJECT,
        network=network,
    )
    if contract:
        print(f"⏭️  VankeRWAOracle 已经部署，不再重复部署: {contract.address}")
        deployed["VankeRWAOracle"] = str(contract.address)
    else:
        oracle, _ = deploy_contract(
            contract_class=project.VankeRWAOracle,
            contract_name="VankeRWAOracle",
            deployer=deployer,
            network=network,
            chain_id=chain_id,
            remote_abi_path=remote_abi_path,
            modules=ContractModule.PROJECT,
            project_name=PROJECT_NAME,
            _multi_sig_manager=deployed.get("MultiSigManager", ZERO_ADDRESS),
            _timelock=deployed.get("Timelock", ZERO_ADDRESS),
        )
        deployed["VankeRWAOracle"] = str(oracle.address)
        print(f"   多签管理器: {oracle.multi_sig_manager()}")
        print(f"   时间锁: {oracle.timelock()}")
        print(f"   最大变化率: {oracle.max_change_rate() / 100}%")
        print(f"   数据有效期: {oracle.data_validity_period() / 86400} 天")

    # ============================================
    # 4. 部署 VankeDataAggregator
    # ============================================
    print("\n" + "-" * 60)
    print("4️⃣  VankeDataAggregator")
    print("-" * 60)

    exit_status, local_abi_path = check_abi_exists(
        contract_module=ContractModule.PROJECT,
        contract_name="VankeDataAggregator",
        project_name=PROJECT_NAME,
    )

    if not exit_status:
        print(f"❌ ABI 文件不存在: {local_abi_path}")
        return

    remote_abi_path = upload_abi(
        contract_module=ContractModule.PROJECT,
        contract_name="VankeDataAggregator",
        project_name=PROJECT_NAME,
    )

    contract = check_deployed(
        name="VankeDataAggregator",
        chain_id=chain_id,
        modules=ContractModule.PROJECT,
        network=network,
    )
    if contract:
        print(f"⏭️  VankeDataAggregator 已经部署，不再重复部署: {contract.address}")
        deployed["VankeDataAggregator"] = str(contract.address)
    else:
        aggregator, _ = deploy_contract(
            contract_class=project.VankeDataAggregator,
            contract_name="VankeDataAggregator",
            deployer=deployer,
            network=network,
            chain_id=chain_id,
            remote_abi_path=remote_abi_path,
            modules=ContractModule.PROJECT,
            project_name=PROJECT_NAME,
            primary_oracle_addr=deployed.get("VankeRWAOracle", ZERO_ADDRESS),
        )
        deployed["VankeDataAggregator"] = str(aggregator.address)
        print(f"   主预言机: {aggregator.primary_oracle()}")
        print(f"   偏差阈值: {aggregator.deviation_threshold() / 100}%")
        print(f"   缓存有效期: {aggregator.cache_validity() / 60} 分钟")

    # ============================================
    # 5. 部署 VankeOracleConsumer
    # ============================================
    print("\n" + "-" * 60)
    print("5️⃣  VankeOracleConsumer")
    print("-" * 60)

    exit_status, local_abi_path = check_abi_exists(
        contract_module=ContractModule.PROJECT,
        contract_name="VankeOracleConsumer",
        project_name=PROJECT_NAME,
    )

    if not exit_status:
        print(f"❌ ABI 文件不存在: {local_abi_path}")
        return

    remote_abi_path = upload_abi(
        contract_module=ContractModule.PROJECT,
        contract_name="VankeOracleConsumer",
        project_name=PROJECT_NAME,
    )

    contract = check_deployed(
        name="VankeOracleConsumer",
        chain_id=chain_id,
        modules=ContractModule.PROJECT,
        network=network,
    )
    if contract:
        print(f"⏭️  VankeOracleConsumer 已经部署，不再重复部署: {contract.address}")
        deployed["VankeOracleConsumer"] = str(contract.address)
    else:
        consumer, _ = deploy_contract(
            contract_class=project.VankeOracleConsumer,
            contract_name="VankeOracleConsumer",
            deployer=deployer,
            network=network,
            chain_id=chain_id,
            remote_abi_path=remote_abi_path,
            modules=ContractModule.PROJECT,
            project_name=PROJECT_NAME,
            aggregator_addr=deployed.get("VankeDataAggregator", ZERO_ADDRESS),
            oracle_addr=deployed.get("VankeRWAOracle", ZERO_ADDRESS),
        )
        deployed["VankeOracleConsumer"] = str(consumer.address)
        print(f"   数据聚合器: {consumer.aggregator()}")
        print(f"   RWA预言机: {consumer.oracle()}")
        print(f"   使用聚合器: {consumer.use_aggregator()}")

    # 部署摘要
    print("\n" + "=" * 60)
    print("📊 部署摘要")
    print("=" * 60)
    print(f"  MultiSigManager:     {deployed['MultiSigManager']}")
    print(f"  Timelock:            {deployed['Timelock']}")
    print(f"  VankeRWAOracle:      {deployed['VankeRWAOracle']}")
    print(f"  VankeDataAggregator: {deployed['VankeDataAggregator']}")
    print(f"  VankeOracleConsumer: {deployed['VankeOracleConsumer']}")
    print(f"  网络: {network}")
    print("\n✅ 所有部署完成!")
    print("\n📖 使用说明:")
    print(f"   - 预言机系统已就绪，可以开始使用数据聚合和消费功能")
    print("=" * 60)

    return deployed


if __name__ == "__main__":
    main()
