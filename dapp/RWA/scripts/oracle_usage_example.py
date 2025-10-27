#!/usr/bin/env python3
"""
使用示例：RWA预言机系统
演示完整的数据更新流程和查询操作
"""

from ape import accounts, project, chain
from eth_abi import encode
import time


def main():
    """预言机系统使用示例"""
    
    print("=" * 80)
    print("📚 RWA预言机系统使用示例")
    print("=" * 80)
    
    # 加载已部署的合约（假设已部署）
    import json
    from pathlib import Path
    
    addresses_file = Path(__file__).parent.parent / "deployed_oracle_addresses.json"
    
    if not addresses_file.exists():
        print("❌ 请先运行部署脚本: ape run deploy_oracle_system")
        return
    
    with open(addresses_file) as f:
        deployment = json.load(f)
    
    contracts = deployment['contracts']
    signers_addrs = deployment['signers']
    
    # 获取账户
    deployer = accounts.test_accounts[0]
    signer1 = accounts.test_accounts[0]
    signer2 = accounts.test_accounts[1]
    signer3 = accounts.test_accounts[2]
    
    # 加载合约
    multisig = project.MultiSigManager.at(contracts['MultiSigManager'])
    timelock = project.Timelock.at(contracts['Timelock'])
    oracle = project.RWAOracle.at(contracts['RWAOracle'])
    aggregator = project.DataAggregator.at(contracts['DataAggregator'])
    consumer = project.OracleConsumer.at(contracts['OracleConsumer'])
    
    print("\n✅ 合约已加载")
    
    # ============================================
    # 示例 1: 注册新资产
    # ============================================
    print("\n" + "=" * 80)
    print("示例 1: 注册新资产")
    print("=" * 80)
    
    # 准备资产数据
    asset_id = bytes.fromhex("1234567890abcdef" * 4)
    asset_name = "Manhattan Office Building"
    initial_apy = 850  # 8.5%
    initial_valuation = 50_000_000 * 10**6  # $50M
    
    print(f"\n📋 资产信息:")
    print(f"   ID: 0x{asset_id.hex()}")
    print(f"   名称: {asset_name}")
    print(f"   初始APY: {initial_apy / 100}%")
    print(f"   初始估值: ${initial_valuation / 10**6:,.0f}")
    
    # 步骤1: 创建多签提案
    print("\n步骤 1/5: 创建多签提案...")
    
    # 计算数据哈希
    data_hash = chain.provider.web3.keccak(
        encode(
            ['bytes32', 'string', 'uint256', 'uint256'],
            [asset_id, asset_name, initial_apy, initial_valuation]
        )
    )
    
    proposal_id = multisig.create_proposal(
        oracle.address,
        data_hash,
        sender=signer1
    )
    
    print(f"✅ 提案已创建: ID = {proposal_id}")
    print(f"   签名数: 1/2")
    
    # 步骤2: 第二个签名者签名
    print("\n步骤 2/5: 第二个签名者签名...")
    
    multisig.sign_proposal(proposal_id, sender=signer2)
    
    print(f"✅ 签名完成")
    print(f"   签名数: 2/2 (已达到阈值)")
    
    # 验证提案已通过
    assert multisig.is_proposal_approved(proposal_id), "提案未通过"
    
    # 步骤3: 加入时间锁队列
    print("\n步骤 3/5: 加入时间锁队列...")
    
    operation_id = timelock.queue_operation(
        oracle.address,
        data_hash,
        proposal_id,
        sender=deployer
    )
    
    print(f"✅ 操作已排队: ID = 0x{operation_id.hex()}")
    
    # 查询剩余时间
    remaining = timelock.time_until_ready(operation_id)
    print(f"   ⏳ 剩余等待时间: {remaining / 3600:.1f} 小时")
    
    # 步骤4: 跳过时间（仅测试环境）
    print("\n步骤 4/5: 等待24小时（测试环境快进）...")
    
    chain.mine(deltatime=86400)  # 快进24小时
    
    print(f"✅ 时间已过")
    
    # 验证操作已就绪
    assert timelock.is_operation_ready(operation_id), "操作未就绪"
    
    # 步骤5: 执行时间锁操作
    print("\n步骤 5/5: 执行操作...")
    
    timelock.execute_operation(operation_id, sender=deployer)
    print(f"✅ 时间锁操作已执行")
    
    # 注册资产
    oracle.register_asset(
        asset_id,
        asset_name,
        initial_apy,
        initial_valuation,
        operation_id,
        sender=deployer
    )
    
    print(f"✅ 资产已注册")
    
    # ============================================
    # 示例 2: 查询资产数据
    # ============================================
    print("\n" + "=" * 80)
    print("示例 2: 查询资产数据")
    print("=" * 80)
    
    # 查询APY
    apy = oracle.get_apy(asset_id)
    print(f"\n📊 当前APY: {apy / 100}%")
    
    # 查询估值
    valuation = oracle.get_valuation(asset_id)
    print(f"💰 当前估值: ${valuation / 10**6:,.0f}")
    
    # 查询完整数据
    asset_data = oracle.get_asset_data(asset_id)
    print(f"\n📋 完整资产数据:")
    print(f"   名称: {asset_data[0]}")
    print(f"   激活: {asset_data[1]}")
    print(f"   APY: {asset_data[2] / 100}%")
    print(f"   估值: ${asset_data[3] / 10**6:,.0f}")
    print(f"   入住率: {asset_data[4] / 100}%")
    print(f"   月度收入: ${asset_data[5] / 10**6:,.0f}")
    print(f"   更新次数: {asset_data[10]}")
    
    # 检查数据是否有效
    is_valid = oracle.is_data_valid(asset_id)
    print(f"   数据有效: {'✅ 是' if is_valid else '❌ 否'}")
    
    # ============================================
    # 示例 3: 更新资产数据
    # ============================================
    print("\n" + "=" * 80)
    print("示例 3: 更新资产数据")
    print("=" * 80)
    
    # 新数据（APY从8.5%提升到8.7%）
    new_apy = 870
    new_valuation = 51_000_000 * 10**6
    new_occupancy = 9500  # 95%
    new_revenue = 425_000 * 10**6  # $425k/月
    
    print(f"\n📈 更新数据:")
    print(f"   APY: {initial_apy / 100}% → {new_apy / 100}%")
    print(f"   估值: ${initial_valuation / 10**6:,.0f} → ${new_valuation / 10**6:,.0f}")
    print(f"   入住率: → {new_occupancy / 100}%")
    print(f"   月收入: → ${new_revenue / 10**6:,.0f}")
    
    # 创建更新提案
    print("\n创建更新提案...")
    
    update_hash = chain.provider.web3.keccak(
        encode(
            ['bytes32', 'uint256', 'uint256', 'uint256', 'uint256'],
            [asset_id, new_apy, new_valuation, new_occupancy, new_revenue]
        )
    )
    
    update_proposal_id = multisig.create_proposal(
        oracle.address,
        update_hash,
        sender=signer1
    )
    
    multisig.sign_proposal(update_proposal_id, sender=signer2)
    
    print(f"✅ 更新提案已创建并签名: ID = {update_proposal_id}")
    
    # 加入时间锁
    update_operation_id = timelock.queue_operation(
        oracle.address,
        update_hash,
        update_proposal_id,
        sender=deployer
    )
    
    print(f"✅ 更新操作已排队: ID = 0x{update_operation_id.hex()}")
    
    # 快进时间
    chain.mine(deltatime=86400)
    
    # 执行更新
    timelock.execute_operation(update_operation_id, sender=deployer)
    
    oracle.update_asset_data(
        asset_id,
        new_apy,
        new_valuation,
        new_occupancy,
        new_revenue,
        update_operation_id,
        sender=deployer
    )
    
    print(f"✅ 资产数据已更新")
    
    # 验证更新
    updated_apy = oracle.get_apy(asset_id)
    updated_val = oracle.get_valuation(asset_id)
    
    print(f"\n✅ 验证更新:")
    print(f"   新APY: {updated_apy / 100}%")
    print(f"   新估值: ${updated_val / 10**6:,.0f}")
    
    # ============================================
    # 示例 4: 使用消费者合约
    # ============================================
    print("\n" + "=" * 80)
    print("示例 4: 使用消费者合约（动态定价）")
    print("=" * 80)
    
    # 设置定价配置
    print("\n设置定价配置...")
    
    consumer.set_pricing_config(
        asset_id,
        1_000_000,  # 基础价格 = 1 USDT
        8000,       # 最小置信度 = 80%
        5000,       # APY乘数 = 50%
        1000,       # 估值权重 = 10%
        sender=deployer
    )
    
    print(f"✅ 定价配置已设置")
    
    # 计算代币价格
    token_price = consumer.calculate_token_price(asset_id)
    print(f"\n💰 代币价格: ${token_price / 10**6:.4f} USDT")
    
    # 计算认购数量
    usdt_amount = 10_000 * 10**6  # $10,000
    token_amount = consumer.calculate_subscription_amount(asset_id, usdt_amount)
    
    print(f"\n💵 认购计算:")
    print(f"   投入USDT: ${usdt_amount / 10**6:,.0f}")
    print(f"   获得代币: {token_amount / 10**18:,.2f}")
    print(f"   单价: ${token_price / 10**6:.4f}")
    
    # 计算预期收益
    duration_days = 365
    expected_returns = consumer.get_expected_returns(
        asset_id,
        usdt_amount,
        duration_days
    )
    
    print(f"\n📈 预期收益（1年）:")
    print(f"   投入: ${usdt_amount / 10**6:,.0f}")
    print(f"   收益: ${expected_returns / 10**6:,.2f}")
    print(f"   回报率: {(expected_returns / usdt_amount) * 100:.2f}%")
    
    # 验证投资
    is_valid_investment = consumer.validate_investment(asset_id, usdt_amount)
    print(f"\n✅ 投资验证: {'通过' if is_valid_investment else '未通过'}")
    
    # ============================================
    # 示例 5: 数据聚合器（可选）
    # ============================================
    print("\n" + "=" * 80)
    print("示例 5: 数据聚合器（混合模式）")
    print("=" * 80)
    
    print("\n注意: 次级预言机需要先添加并启用")
    print("当前状态: 仅使用主预言机")
    
    # 获取聚合数据
    aggregated_apy = aggregator.get_aggregated_apy(asset_id)
    aggregated_val = aggregator.get_aggregated_valuation(asset_id)
    
    print(f"\n📊 聚合数据:")
    print(f"   APY: {aggregated_apy / 100}%")
    print(f"   估值: ${aggregated_val / 10**6:,.0f}")
    
    # 检查置信度
    confidence = aggregator.get_data_confidence(asset_id)
    if confidence > 0:
        print(f"   置信度: {confidence / 100}%")
    else:
        print(f"   置信度: 使用缓存或主数据")
    
    # ============================================
    # 总结
    # ============================================
    print("\n" + "=" * 80)
    print("📊 使用示例完成总结")
    print("=" * 80)
    
    print("\n✅ 完成的操作:")
    print("   1. 注册新资产（带多签+时间锁）")
    print("   2. 查询资产数据")
    print("   3. 更新资产数据（带多签+时间锁）")
    print("   4. 使用消费者合约计算价格和收益")
    print("   5. 查看数据聚合器状态")
    
    print("\n💡 进阶功能:")
    print("   - 添加次级预言机到聚合器")
    print("   - 使用紧急快速通道（3-of-3）")
    print("   - 设置合规状态和审计报告")
    print("   - 查询历史数据")
    print("   - 集成到Subscription合约")
    
    print("\n📖 详细文档:")
    print("   docs/02-智能合约/RWA-预言机系统.md")
    
    print("\n" + "=" * 80)
    print("✅ 示例完成！")
    print("=" * 80)


if __name__ == "__main__":
    main()

