#!/usr/bin/env python3
"""
部署脚本：RWA预言机系统
部署顺序：MultiSigManager -> Timelock -> RWAOracle -> DataAggregator -> OracleConsumer
"""

from ape import accounts, project
import json
from pathlib import Path


def main():
    """部署完整的RWA预言机系统"""
    
    print("=" * 80)
    print("🚀 RWA预言机系统部署脚本")
    print("=" * 80)
    
    # 获取部署账户
    deployer = accounts.test_accounts[0]
    print(f"\n📝 部署账户: {deployer.address}")
    print(f"💰 余额: {deployer.balance / 10**18:.4f} ETH")
    
    # 定义签名者（2-of-3）
    signers = [
        accounts.test_accounts[0].address,  # 签名者1
        accounts.test_accounts[1].address,  # 签名者2
        accounts.test_accounts[2].address   # 签名者3
    ]
    
    print(f"\n👥 多签签名者:")
    for i, signer in enumerate(signers, 1):
        print(f"   签名者{i}: {signer}")
    
    deployed_contracts = {}
    
    try:
        # ============================================
        # 1. 部署 MultiSigManager
        # ============================================
        print("\n" + "=" * 80)
        print("1️⃣ 部署 MultiSigManager (2-of-3 多签)")
        print("=" * 80)
        
        multisig = project.MultiSigManager.deploy(
            signers,
            sender=deployer
        )
        
        deployed_contracts['MultiSigManager'] = multisig.address
        print(f"✅ MultiSigManager 已部署: {multisig.address}")
        print(f"   - 签名者数量: {multisig.signer_count()}")
        print(f"   - 所需签名: {multisig.required_signatures()}")
        
        # ============================================
        # 2. 部署 Timelock
        # ============================================
        print("\n" + "=" * 80)
        print("2️⃣ 部署 Timelock (24小时延迟)")
        print("=" * 80)
        
        timelock = project.Timelock.deploy(
            multisig.address,
            sender=deployer
        )
        
        deployed_contracts['Timelock'] = timelock.address
        print(f"✅ Timelock 已部署: {timelock.address}")
        print(f"   - 延迟时间: {timelock.delay() / 3600} 小时")
        print(f"   - 多签管理器: {timelock.multi_sig_manager()}")
        
        # ============================================
        # 3. 部署 RWAOracle
        # ============================================
        print("\n" + "=" * 80)
        print("3️⃣ 部署 RWAOracle (主预言机)")
        print("=" * 80)
        
        oracle = project.RWAOracle.deploy(
            multisig.address,
            timelock.address,
            sender=deployer
        )
        
        deployed_contracts['RWAOracle'] = oracle.address
        print(f"✅ RWAOracle 已部署: {oracle.address}")
        print(f"   - 多签管理器: {oracle.multi_sig_manager()}")
        print(f"   - 时间锁: {oracle.timelock()}")
        print(f"   - 最大变化率: {oracle.max_change_rate() / 100}%")
        print(f"   - 数据有效期: {oracle.data_validity_period() / 86400} 天")
        
        # ============================================
        # 4. 部署 DataAggregator
        # ============================================
        print("\n" + "=" * 80)
        print("4️⃣ 部署 DataAggregator (数据聚合器)")
        print("=" * 80)
        
        aggregator = project.DataAggregator.deploy(
            oracle.address,
            sender=deployer
        )
        
        deployed_contracts['DataAggregator'] = aggregator.address
        print(f"✅ DataAggregator 已部署: {aggregator.address}")
        print(f"   - 主预言机: {aggregator.primary_oracle()}")
        print(f"   - 偏差阈值: {aggregator.deviation_threshold() / 100}%")
        print(f"   - 缓存有效期: {aggregator.cache_validity() / 60} 分钟")
        print(f"   - 次级预言机启用: {aggregator.secondary_enabled()}")
        
        # ============================================
        # 5. 部署 OracleConsumer
        # ============================================
        print("\n" + "=" * 80)
        print("5️⃣ 部署 OracleConsumer (消费者示例)")
        print("=" * 80)
        
        consumer = project.OracleConsumer.deploy(
            aggregator.address,
            oracle.address,
            sender=deployer
        )
        
        deployed_contracts['OracleConsumer'] = consumer.address
        print(f"✅ OracleConsumer 已部署: {consumer.address}")
        print(f"   - 数据聚合器: {consumer.aggregator()}")
        print(f"   - RWA预言机: {consumer.oracle()}")
        print(f"   - 使用聚合器: {consumer.use_aggregator()}")
        
        # ============================================
        # 保存部署地址
        # ============================================
        print("\n" + "=" * 80)
        print("💾 保存部署地址")
        print("=" * 80)
        
        output_file = Path(__file__).parent.parent / "deployed_oracle_addresses.json"
        
        deployment_info = {
            "network": "local",
            "deployer": deployer.address,
            "timestamp": str(project.chain.blocks.head.timestamp),
            "block_number": project.chain.blocks.head.number,
            "contracts": deployed_contracts,
            "signers": signers
        }
        
        with open(output_file, "w") as f:
            json.dump(deployment_info, f, indent=2)
        
        print(f"✅ 地址已保存到: {output_file}")
        
        # ============================================
        # 部署摘要
        # ============================================
        print("\n" + "=" * 80)
        print("📊 部署摘要")
        print("=" * 80)
        
        print("\n已部署合约:")
        for name, address in deployed_contracts.items():
            print(f"   {name:20s} : {address}")
        
        print("\n多签签名者:")
        for i, signer in enumerate(signers, 1):
            print(f"   签名者{i:2d}              : {signer}")
        
        # ============================================
        # 使用说明
        # ============================================
        print("\n" + "=" * 80)
        print("📖 下一步操作")
        print("=" * 80)
        
        print("\n1️⃣ 注册资产示例:")
        print(f"""
   from ape import accounts, project
   from eth_abi import encode
   
   # 加载合约
   multisig = project.MultiSigManager.at("{multisig.address}")
   timelock = project.Timelock.at("{timelock.address}")
   oracle = project.RWAOracle.at("{oracle.address}")
   
   # 准备资产数据
   asset_id = keccak256(b"PROPERTY_001")
   asset_name = "Manhattan Office Building"
   initial_apy = 850  # 8.5%
   initial_valuation = 50_000_000 * 10**6  # $50M
   
   # 创建多签提案
   data_hash = keccak256(encode(['bytes32', 'string', 'uint256', 'uint256'], 
                                 [asset_id, asset_name, initial_apy, initial_valuation]))
   proposal_id = multisig.create_proposal(oracle.address, data_hash, sender=accounts[0])
   
   # 第二个签名者签名
   multisig.sign_proposal(proposal_id, sender=accounts[1])
   
   # 加入时间锁队列
   operation_id = timelock.queue_operation(oracle.address, data_hash, proposal_id, sender=accounts[0])
   
   # 等待24小时后执行...
   # timelock.execute_operation(operation_id, sender=accounts[0])
   # oracle.register_asset(asset_id, asset_name, initial_apy, initial_valuation, operation_id, sender=accounts[0])
        """)
        
        print("\n2️⃣ 查看完整文档:")
        print("   docs/02-智能合约/RWA-预言机系统.md")
        
        print("\n3️⃣ 运行测试:")
        print("   ape test tests/test_oracle_*.py -v")
        
        print("\n" + "=" * 80)
        print("✅ 部署完成！")
        print("=" * 80)
        
        return deployed_contracts
        
    except Exception as e:
        print(f"\n❌ 部署失败: {e}")
        raise


if __name__ == "__main__":
    main()

