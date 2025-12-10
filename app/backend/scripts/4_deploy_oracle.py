#!/usr/bin/env python3
"""
部署脚本 4：预言机系统
部署 MultiSigManager, Timelock, RWAOracle, DataAggregator, OracleConsumer

Usage:
    ape run 4_deploy_oracle --network ethereum:dev
    ape run 4_deploy_oracle --network ethereum:sepolia

    # 强制重新部署
    ape run 4_deploy_oracle --network ethereum:dev -- --force
"""

import json
import sys
from pathlib import Path

# 添加 scripts 目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent))

from ape import accounts, project
from deploy_utils import (
    check_deployed,
    deploy_contract,
    get_current_network,
    get_deployer_from_db,
    parse_deploy_args,
)

# 部署阶段标识
DEPLOY_STEP = "4_oracle"


def main():
    """部署预言机系统"""
    # 解析命令行参数
    args = parse_deploy_args()
    network = get_current_network()
    force = args.force

    print("=" * 60)
    print("🔮 部署预言机系统")
    print(f"   网络: {network}")
    print(f"   强制部署: {force}")
    print("=" * 60)
    
    # 获取部署账户
    deployer = get_deployer_from_db(network=network)
    
    # 定义签名者（2-of-3 多签）
    # 在测试环境使用测试账户，生产环境应使用真实多签地址
    if network == "local":
        signers = [
            accounts.test_accounts[0].address,
            accounts.test_accounts[1].address,
            accounts.test_accounts[2].address
        ]
    else:
        # TODO: 从配置文件或环境变量读取生产环境多签地址
        raise ValueError(
            f"❌ 网络 {network} 的多签地址未配置！\n"
            f"   请在脚本中配置 signers 列表"
        )
    
    print(f"\n👥 多签签名者 (2-of-3):")
    for i, signer in enumerate(signers, 1):
        print(f"   签名者{i}: {signer}")
    
    deployed = {}
    new_deployments = []
    
    # ============================================
    # 1. 部署 MultiSigManager
    # ============================================
    print("\n" + "-" * 60)
    print("1️⃣  MultiSigManager")
    print("-" * 60)
    
    multisig, is_new = deploy_contract(
        contract_class=project.MultiSigManager,
        contract_name="MultiSigManager",
        deployer=deployer,
        deploy_step=DEPLOY_STEP,
        network=network,
        force=force,
        # 合约构造函数参数
        _signers=signers,
    )
    deployed['MultiSigManager'] = str(multisig.address)
    
    if is_new:
        new_deployments.append("MultiSigManager")
        print(f"   签名者数量: {multisig.signer_count()}")
        print(f"   所需签名: {multisig.required_signatures()}")
    
    # ============================================
    # 2. 部署 Timelock
    # ============================================
    print("\n" + "-" * 60)
    print("2️⃣  Timelock")
    print("-" * 60)
    
    # 如果 MultiSigManager 是新部署的，Timelock 也需要重新部署
    timelock_existing = check_deployed(DEPLOY_STEP, "Timelock", network)
    force_timelock = force or ("MultiSigManager" in new_deployments and timelock_existing is not None)
    
    if force_timelock and not force and timelock_existing:
        print("⚠️  MultiSigManager 已更新，需要重新部署 Timelock")
    
    timelock, is_new = deploy_contract(
        contract_class=project.Timelock,
        contract_name="Timelock",
        deployer=deployer,
        deploy_step=DEPLOY_STEP,
        network=network,
        force=force_timelock,
        dependencies={"MultiSigManager": deployed['MultiSigManager']},
        # 合约构造函数参数
        _multi_sig=multisig.address,
    )
    deployed['Timelock'] = str(timelock.address)
    
    if is_new:
        new_deployments.append("Timelock")
        print(f"   延迟时间: {timelock.delay() / 3600} 小时")
        print(f"   多签管理器: {timelock.multi_sig_manager()}")
    
    # ============================================
    # 3. 部署 RWAOracle
    # ============================================
    print("\n" + "-" * 60)
    print("3️⃣  RWAOracle")
    print("-" * 60)
    
    # 如果依赖更新了，Oracle 也需要重新部署
    oracle_existing = check_deployed(DEPLOY_STEP, "RWAOracle", network)
    force_oracle = force or (
        ("MultiSigManager" in new_deployments or "Timelock" in new_deployments) 
        and oracle_existing is not None
    )
    
    if force_oracle and not force and oracle_existing:
        print("⚠️  依赖合约已更新，需要重新部署 RWAOracle")
    
    oracle, is_new = deploy_contract(
        contract_class=project.RWAOracle,
        contract_name="RWAOracle",
        deployer=deployer,
        deploy_step=DEPLOY_STEP,
        network=network,
        force=force_oracle,
        dependencies={
            "MultiSigManager": deployed['MultiSigManager'],
            "Timelock": deployed['Timelock'],
        },
        # 合约构造函数参数
        _multi_sig=multisig.address,
        _timelock=timelock.address,
    )
    deployed['RWAOracle'] = str(oracle.address)
    
    if is_new:
        new_deployments.append("RWAOracle")
        print(f"   多签管理器: {oracle.multi_sig_manager()}")
        print(f"   时间锁: {oracle.timelock()}")
        print(f"   最大变化率: {oracle.max_change_rate() / 100}%")
        print(f"   数据有效期: {oracle.data_validity_period() / 86400} 天")
    
    # ============================================
    # 4. 部署 DataAggregator
    # ============================================
    print("\n" + "-" * 60)
    print("4️⃣  DataAggregator")
    print("-" * 60)
    
    # 如果 Oracle 更新了，Aggregator 也需要重新部署
    aggregator_existing = check_deployed(DEPLOY_STEP, "DataAggregator", network)
    force_aggregator = force or ("RWAOracle" in new_deployments and aggregator_existing is not None)
    
    if force_aggregator and not force and aggregator_existing:
        print("⚠️  RWAOracle 已更新，需要重新部署 DataAggregator")
    
    aggregator, is_new = deploy_contract(
        contract_class=project.DataAggregator,
        contract_name="DataAggregator",
        deployer=deployer,
        deploy_step=DEPLOY_STEP,
        network=network,
        force=force_aggregator,
        dependencies={"RWAOracle": deployed['RWAOracle']},
        # 合约构造函数参数
        _primary_oracle=oracle.address,
    )
    deployed['DataAggregator'] = str(aggregator.address)
    
    if is_new:
        new_deployments.append("DataAggregator")
        print(f"   主预言机: {aggregator.primary_oracle()}")
        print(f"   偏差阈值: {aggregator.deviation_threshold() / 100}%")
        print(f"   缓存有效期: {aggregator.cache_validity() / 60} 分钟")
    
    # ============================================
    # 5. 部署 OracleConsumer
    # ============================================
    print("\n" + "-" * 60)
    print("5️⃣  OracleConsumer")
    print("-" * 60)
    
    # 如果依赖更新了，Consumer 也需要重新部署
    consumer_existing = check_deployed(DEPLOY_STEP, "OracleConsumer", network)
    force_consumer = force or (
        ("DataAggregator" in new_deployments or "RWAOracle" in new_deployments) 
        and consumer_existing is not None
    )
    
    if force_consumer and not force and consumer_existing:
        print("⚠️  依赖合约已更新，需要重新部署 OracleConsumer")
    
    consumer, is_new = deploy_contract(
        contract_class=project.OracleConsumer,
        contract_name="OracleConsumer",
        deployer=deployer,
        deploy_step=DEPLOY_STEP,
        network=network,
        force=force_consumer,
        dependencies={
            "DataAggregator": deployed['DataAggregator'],
            "RWAOracle": deployed['RWAOracle'],
        },
        # 合约构造函数参数
        _aggregator=aggregator.address,
        _oracle=oracle.address,
    )
    deployed['OracleConsumer'] = str(consumer.address)
    
    if is_new:
        new_deployments.append("OracleConsumer")
        print(f"   数据聚合器: {consumer.aggregator()}")
        print(f"   RWA预言机: {consumer.oracle()}")
        print(f"   使用聚合器: {consumer.use_aggregator()}")
    
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
        "signers": signers
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
    print(f"  MultiSigManager: {deployed['MultiSigManager']}")
    print(f"  Timelock:        {deployed['Timelock']}")
    print(f"  RWAOracle:       {deployed['RWAOracle']}")
    print(f"  DataAggregator:  {deployed['DataAggregator']}")
    print(f"  OracleConsumer:  {deployed['OracleConsumer']}")
    
    if new_deployments:
        print(f"\n  🆕 新部署: {', '.join(new_deployments)}")
    else:
        print(f"\n  ⏭️  所有合约已存在，无新部署")
    
    print("\n✅ 所有部署完成!")
    print("\n📖 使用说明:")
    print(f"   - 运行示例: ape run example_usage --network ethereum:{network}")
    print(f"   - 预言机示例: ape run oracle_usage_example --network ethereum:{network}")
    print("=" * 60)
    
    return deployed


if __name__ == "__main__":
    main()
