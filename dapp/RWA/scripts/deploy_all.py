#!/usr/bin/env python3
"""
一键部署脚本：完整SuperCrypto系统
包含：RWA STO系统 + 预言机系统
"""

from ape import accounts, project
import json
from pathlib import Path


def main():
    """一键部署完整的SuperCrypto系统"""
    
    print("=" * 80)
    print("🚀 SuperCrypto 完整系统一键部署")
    print("=" * 80)
    print("\n包含：")
    print("  1️⃣  RWA STO系统（KYC + 证券型代币 + 认购 + 质押 + 流动性挖矿）")
    print("  2️⃣  预言机系统（多签 + 时间锁 + 数据聚合）")
    print()
    
    # 获取部署账户
    deployer = accounts.test_accounts[0]
    print(f"📝 部署账户: {deployer.address}")
    print(f"💰 余额: {deployer.balance / 10**18:.4f} ETH\n")
    
    all_contracts = {}
    
    # ============================================
    # 第一部分：部署 RWA STO 系统
    # ============================================
    print("\n" + "=" * 80)
    print("📦 第一部分：部署 RWA STO 系统")
    print("=" * 80)
    
    try:
        # 1. 部署 MockUSDT
        print("\n1️⃣  部署 MockUSDT...")
        usdt = project.MockUSDT.deploy(sender=deployer)
        all_contracts['USDT'] = usdt.address
        print(f"✅ MockUSDT: {usdt.address}")
        
        # 2. 部署 KYCManager
        print("\n2️⃣  部署 KYCManager...")
        kyc_manager = project.KYCManager.deploy(sender=deployer)
        all_contracts['KYCManager'] = kyc_manager.address
        print(f"✅ KYCManager: {kyc_manager.address}")
        
        # 3. 部署 RWATokenSTO
        print("\n3️⃣  部署 RWATokenSTO...")
        rwa_token = project.RWATokenSTO.deploy(
            kyc_manager.address,
            sender=deployer
        )
        all_contracts['RWATokenSTO'] = rwa_token.address
        print(f"✅ RWATokenSTO: {rwa_token.address}")
        
        # 4. 部署 PlatformToken
        print("\n4️⃣  部署 PlatformToken...")
        platform_token = project.PlatformToken.deploy(sender=deployer)
        all_contracts['PlatformToken'] = platform_token.address
        print(f"✅ PlatformToken: {platform_token.address}")
        
        # 5. 部署 Subscription
        print("\n5️⃣  部署 Subscription...")
        subscription = project.Subscription.deploy(
            usdt.address,
            rwa_token.address,
            kyc_manager.address,
            sender=deployer
        )
        all_contracts['Subscription'] = subscription.address
        print(f"✅ Subscription: {subscription.address}")
        
        # 6. 部署 Staking
        print("\n6️⃣  部署 Staking...")
        staking = project.Staking.deploy(
            rwa_token.address,
            platform_token.address,
            subscription.address,
            kyc_manager.address,
            sender=deployer
        )
        all_contracts['Staking'] = staking.address
        print(f"✅ Staking: {staking.address}")
        
        # 7. 部署 LiquidityMining
        print("\n7️⃣  部署 LiquidityMining...")
        liquidity_mining = project.LiquidityMining.deploy(
            platform_token.address,
            sender=deployer
        )
        all_contracts['LiquidityMining'] = liquidity_mining.address
        print(f"✅ LiquidityMining: {liquidity_mining.address}")
        
        # 8. 设置权限
        print("\n8️⃣  设置合约权限...")
        rwa_token.setMinter(subscription.address, True, sender=deployer)
        rwa_token.setBurner(subscription.address, True, sender=deployer)
        platform_token.setMinter(staking.address, True, sender=deployer)
        platform_token.setMinter(liquidity_mining.address, True, sender=deployer)
        print("✅ 权限设置完成")
        
        print("\n✅ RWA STO 系统部署完成！")
        
    except Exception as e:
        print(f"\n❌ RWA STO系统部署失败: {e}")
        raise
    
    # ============================================
    # 第二部分：部署预言机系统
    # ============================================
    print("\n" + "=" * 80)
    print("🔮 第二部分：部署预言机系统")
    print("=" * 80)
    
    try:
        # 定义签名者（2-of-3）
        signers = [
            accounts.test_accounts[0].address,
            accounts.test_accounts[1].address,
            accounts.test_accounts[2].address
        ]
        print(f"\n👥 多签签名者:")
        for i, signer in enumerate(signers, 1):
            print(f"   签名者{i}: {signer}")
        
        # 1. 部署 MultiSigManager
        print("\n1️⃣  部署 MultiSigManager...")
        multisig = project.MultiSigManager.deploy(signers, sender=deployer)
        all_contracts['MultiSigManager'] = multisig.address
        print(f"✅ MultiSigManager: {multisig.address}")
        
        # 2. 部署 Timelock
        print("\n2️⃣  部署 Timelock...")
        timelock = project.Timelock.deploy(multisig.address, sender=deployer)
        all_contracts['Timelock'] = timelock.address
        print(f"✅ Timelock: {timelock.address}")
        
        # 3. 部署 RWAOracle
        print("\n3️⃣  部署 RWAOracle...")
        oracle = project.RWAOracle.deploy(
            multisig.address,
            timelock.address,
            sender=deployer
        )
        all_contracts['RWAOracle'] = oracle.address
        print(f"✅ RWAOracle: {oracle.address}")
        
        # 4. 部署 DataAggregator
        print("\n4️⃣  部署 DataAggregator...")
        aggregator = project.DataAggregator.deploy(
            oracle.address,
            sender=deployer
        )
        all_contracts['DataAggregator'] = aggregator.address
        print(f"✅ DataAggregator: {aggregator.address}")
        
        # 5. 部署 OracleConsumer
        print("\n5️⃣  部署 OracleConsumer...")
        consumer = project.OracleConsumer.deploy(
            aggregator.address,
            oracle.address,
            sender=deployer
        )
        all_contracts['OracleConsumer'] = consumer.address
        print(f"✅ OracleConsumer: {consumer.address}")
        
        print("\n✅ 预言机系统部署完成！")
        
    except Exception as e:
        print(f"\n❌ 预言机系统部署失败: {e}")
        raise
    
    # ============================================
    # 保存部署地址
    # ============================================
    print("\n" + "=" * 80)
    print("💾 保存部署地址")
    print("=" * 80)
    
    output_file = Path(__file__).parent.parent / "deployed_addresses_all.json"
    
    deployment_info = {
        "network": "local",
        "deployer": deployer.address,
        "timestamp": str(project.chain.blocks.head.timestamp),
        "block_number": project.chain.blocks.head.number,
        "rwa_system": {
            "USDT": all_contracts['USDT'],
            "KYCManager": all_contracts['KYCManager'],
            "RWATokenSTO": all_contracts['RWATokenSTO'],
            "PlatformToken": all_contracts['PlatformToken'],
            "Subscription": all_contracts['Subscription'],
            "Staking": all_contracts['Staking'],
            "LiquidityMining": all_contracts['LiquidityMining'],
        },
        "oracle_system": {
            "MultiSigManager": all_contracts['MultiSigManager'],
            "Timelock": all_contracts['Timelock'],
            "RWAOracle": all_contracts['RWAOracle'],
            "DataAggregator": all_contracts['DataAggregator'],
            "OracleConsumer": all_contracts['OracleConsumer'],
        },
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
    
    print("\n🏦 RWA STO 系统:")
    for name in ['USDT', 'KYCManager', 'RWATokenSTO', 'PlatformToken', 
                 'Subscription', 'Staking', 'LiquidityMining']:
        print(f"   {name:20s} : {all_contracts[name]}")
    
    print("\n🔮 预言机系统:")
    for name in ['MultiSigManager', 'Timelock', 'RWAOracle', 
                 'DataAggregator', 'OracleConsumer']:
        print(f"   {name:20s} : {all_contracts[name]}")
    
    # ============================================
    # 使用说明
    # ============================================
    print("\n" + "=" * 80)
    print("📖 下一步操作")
    print("=" * 80)
    
    print("\n1️⃣  测试 RWA 系统:")
    print("   ape run example_usage --network ethereum:local")
    
    print("\n2️⃣  测试预言机系统:")
    print("   ape run oracle_usage_example --network ethereum:local")
    
    print("\n3️⃣  运行完整测试:")
    print("   ape test -v")
    
    print("\n4️⃣  查看文档:")
    print("   - RWA系统: docs/02-智能合约/RWA-权益代币系统.md")
    print("   - 预言机: docs/02-智能合约/RWA-预言机系统.md")
    
    print("\n" + "=" * 80)
    print("✅ 完整系统部署成功！")
    print("=" * 80)
    
    return deployment_info


if __name__ == "__main__":
    main()

