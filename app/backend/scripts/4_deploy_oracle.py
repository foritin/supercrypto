#!/usr/bin/env python3
"""
部署脚本 4：预言机系统
部署 MultiSigManager, Timelock, RWAOracle, DataAggregator, OracleConsumer
"""

from ape import accounts, project
import json
from pathlib import Path

from deploy_utils import get_deployer


def main():
    """部署预言机系统"""
    
    print("=" * 60)
    print("🔮 部署预言机系统")
    print("=" * 60)
    
    # 获取部署账户
    deployer = get_deployer()
    
    # 定义签名者（2-of-3 多签）
    signers = [
        accounts.test_accounts[0].address,
        accounts.test_accounts[1].address,
        accounts.test_accounts[2].address
    ]
    
    print(f"\n👥 多签签名者 (2-of-3):")
    for i, signer in enumerate(signers, 1):
        print(f"   签名者{i}: {signer}")
    
    deployed = {}
    
    # ============================================
    # 1. 部署 MultiSigManager
    # ============================================
    print("\n" + "-" * 60)
    print("1️⃣  部署 MultiSigManager")
    print("-" * 60)
    
    multisig = project.MultiSigManager.deploy(
        signers,
        sender=deployer
    )
    deployed['MultiSigManager'] = str(multisig.address)
    
    print(f"✅ MultiSigManager 已部署: {multisig.address}")
    print(f"   签名者数量: {multisig.signer_count()}")
    print(f"   所需签名: {multisig.required_signatures()}")
    
    # ============================================
    # 2. 部署 Timelock
    # ============================================
    print("\n" + "-" * 60)
    print("2️⃣  部署 Timelock")
    print("-" * 60)
    
    timelock = project.Timelock.deploy(
        multisig.address,
        sender=deployer
    )
    deployed['Timelock'] = str(timelock.address)
    
    print(f"✅ Timelock 已部署: {timelock.address}")
    print(f"   延迟时间: {timelock.delay() / 3600} 小时")
    print(f"   多签管理器: {timelock.multi_sig_manager()}")
    
    # ============================================
    # 3. 部署 RWAOracle
    # ============================================
    print("\n" + "-" * 60)
    print("3️⃣  部署 RWAOracle")
    print("-" * 60)
    
    oracle = project.RWAOracle.deploy(
        multisig.address,
        timelock.address,
        sender=deployer
    )
    deployed['RWAOracle'] = str(oracle.address)
    
    print(f"✅ RWAOracle 已部署: {oracle.address}")
    print(f"   多签管理器: {oracle.multi_sig_manager()}")
    print(f"   时间锁: {oracle.timelock()}")
    print(f"   最大变化率: {oracle.max_change_rate() / 100}%")
    print(f"   数据有效期: {oracle.data_validity_period() / 86400} 天")
    
    # ============================================
    # 4. 部署 DataAggregator
    # ============================================
    print("\n" + "-" * 60)
    print("4️⃣  部署 DataAggregator")
    print("-" * 60)
    
    aggregator = project.DataAggregator.deploy(
        oracle.address,
        sender=deployer
    )
    deployed['DataAggregator'] = str(aggregator.address)
    
    print(f"✅ DataAggregator 已部署: {aggregator.address}")
    print(f"   主预言机: {aggregator.primary_oracle()}")
    print(f"   偏差阈值: {aggregator.deviation_threshold() / 100}%")
    print(f"   缓存有效期: {aggregator.cache_validity() / 60} 分钟")
    
    # ============================================
    # 5. 部署 OracleConsumer
    # ============================================
    print("\n" + "-" * 60)
    print("5️⃣  部署 OracleConsumer")
    print("-" * 60)
    
    consumer = project.OracleConsumer.deploy(
        aggregator.address,
        oracle.address,
        sender=deployer
    )
    deployed['OracleConsumer'] = str(consumer.address)
    
    print(f"✅ OracleConsumer 已部署: {consumer.address}")
    print(f"   数据聚合器: {consumer.aggregator()}")
    print(f"   RWA预言机: {consumer.oracle()}")
    print(f"   使用聚合器: {consumer.use_aggregator()}")
    
    # ============================================
    # 保存部署地址
    # ============================================
    base_path = Path(__file__).parent.parent
    output_file = base_path / "deployed_4_oracle.json"
    
    deployment_info = {
        "step": "4_oracle",
        "network": "local",
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
    
    print("\n✅ 所有部署完成!")
    print("\n📖 使用说明:")
    print("   - 运行示例: ape run example_usage --network ethereum:local")
    print("   - 预言机示例: ape run oracle_usage_example --network ethereum:local")
    print("=" * 60)
    
    return deployed


if __name__ == "__main__":
    main()

