"""
部署脚本 - STO合规版本
部署所有STO合规的智能合约
"""
from ape import accounts, project
import json


def main():
    """
    部署所有STO合规合约
    """
    print("\n" + "="*60)
    print("  RWA STO 合约部署脚本")
    print("  Security Token Offering - Compliant Version")
    print("="*60 + "\n")
    
    # 使用测试账户
    deployer = accounts.test_accounts[0]
    print(f"✓ 部署账户: {deployer.address}")
    print(f"  余额: {deployer.balance / 10**18:.4f} ETH\n")
    
    deployed_addresses = {}
    
    # ========== 第1步：部署KYC管理合约 ==========
    print("=" * 60)
    print("第1步：部署 KYC 管理合约")
    print("=" * 60)
    
    kyc_manager = project.KYCManager.deploy(sender=deployer)
    deployed_addresses['KYCManager'] = str(kyc_manager.address)
    print(f"✓ KYCManager 部署成功")
    print(f"  地址: {kyc_manager.address}")
    print(f"  最大投资者数: {kyc_manager.maxInvestors()}")
    print(f"  KYC有效期: {kyc_manager.kycExpiryPeriod() / (24*3600)} 天\n")
    
    # ========== 第2步：部署代币合约 ==========
    print("=" * 60)
    print("第2步：部署代币合约")
    print("=" * 60)
    
    # 部署 MockUSDT（测试用）
    print("\n→ 部署 MockUSDT...")
    usdt = project.MockUSDT.deploy(sender=deployer)
    deployed_addresses['MockUSDT'] = str(usdt.address)
    print(f"✓ MockUSDT: {usdt.address}")
    print(f"  名称: {usdt.name()}")
    print(f"  符号: {usdt.symbol()}")
    print(f"  精度: {usdt.decimals()}")
    
    # 部署 RWA Security Token
    print("\n→ 部署 RWA Security Token...")
    rwa_token = project.RWATokenSTO.deploy(kyc_manager.address, sender=deployer)
    deployed_addresses['RWATokenSTO'] = str(rwa_token.address)
    print(f"✓ RWATokenSTO: {rwa_token.address}")
    print(f"  名称: {rwa_token.name()}")
    print(f"  符号: {rwa_token.symbol()}")
    print(f"  精度: {rwa_token.decimals()}")
    print(f"  KYC管理器: {rwa_token.kycManager()}")
    
    # 部署 Platform Token
    print("\n→ 部署 Platform Token...")
    platform_token = project.PlatformToken.deploy(sender=deployer)
    deployed_addresses['PlatformToken'] = str(platform_token.address)
    print(f"✓ PlatformToken: {platform_token.address}")
    print(f"  名称: {platform_token.name()}")
    print(f"  符号: {platform_token.symbol()}")
    print(f"  最大供应量: {platform_token.maxSupply() / 10**18:,.0f}\n")
    
    # ========== 第3步：部署业务合约 ==========
    print("=" * 60)
    print("第3步：部署业务合约")
    print("=" * 60)
    
    # 部署认购合约
    print("\n→ 部署 Subscription (STO)...")
    subscription = project.Subscription.deploy(
        usdt.address,
        rwa_token.address,
        kyc_manager.address,
        sender=deployer
    )
    deployed_addresses['Subscription'] = str(subscription.address)
    print(f"✓ Subscription: {subscription.address}")
    print(f"  最小投资: ${subscription.minInvestment() / 10**6:,.0f}")
    print(f"  要求合格投资者: {subscription.requireAccredited()}")
    
    # 部署质押合约
    print("\n→ 部署 Staking (STO)...")
    staking = project.Staking.deploy(
        rwa_token.address,
        platform_token.address,
        subscription.address,
        kyc_manager.address,
        sender=deployer
    )
    deployed_addresses['Staking'] = str(staking.address)
    print(f"✓ Staking: {staking.address}")
    print(f"  质押APY: {staking.stakingAPY() / 100}%")
    print(f"  每日释放: {staking.dailyEmission() / 10**18:,.0f} PLT")
    
    # 部署流动性挖矿合约（暂时用零地址作为LP token）
    print("\n→ 部署 LiquidityMining (STO)...")
    liquidity_mining = project.LiquidityMining.deploy(
        "0x0000000000000000000000000000000000000000",  # LP Token稍后设置
        platform_token.address,
        kyc_manager.address,
        sender=deployer
    )
    deployed_addresses['LiquidityMining'] = str(liquidity_mining.address)
    print(f"✓ LiquidityMining: {liquidity_mining.address}")
    print(f"  要求KYC: {liquidity_mining.requireKYC()}")
    print(f"  每日释放: {liquidity_mining.dailyEmission() / 10**18:,.0f} PLT\n")
    
    # ========== 第4步：设置权限 ==========
    print("=" * 60)
    print("第4步：设置合约权限")
    print("=" * 60)
    
    # RWA Token 权限
    print("\n→ 设置 RWATokenSTO 权限...")
    rwa_token.setMinter(subscription.address, True, sender=deployer)
    rwa_token.setBurner(subscription.address, True, sender=deployer)
    print(f"✓ Subscription 可铸造/销毁 RWA Token")
    
    # Platform Token 权限
    print("\n→ 设置 PlatformToken 权限...")
    platform_token.setMinter(staking.address, True, sender=deployer)
    platform_token.setMinter(liquidity_mining.address, True, sender=deployer)
    print(f"✓ Staking 可铸造 Platform Token")
    print(f"✓ LiquidityMining 可铸造 Platform Token\n")
    
    # ========== 第5步：设置示例文档（STO要求）==========
    print("=" * 60)
    print("第5步：设置法律文档（STO合规）")
    print("=" * 60)
    
    print("\n→ 设置招股说明书...")
    # 示例：设置招股书文档
    rwa_token.setDocument(
        "Prospectus",
        "ipfs://QmExampleProspectusHash123456",
        b'\x12\x34\x56\x78' + b'\x00' * 28,  # 示例文档哈希
        sender=deployer
    )
    print(f"✓ 招股说明书已关联")
    
    print("\n→ 设置风险披露...")
    rwa_token.setDocument(
        "Risk Disclosure",
        "ipfs://QmExampleRiskDisclosureHash789",
        b'\x9a\xbc\xde\xf0' + b'\x00' * 28,
        sender=deployer
    )
    print(f"✓ 风险披露已关联\n")
    
    # ========== 第6步：添加示例KYC投资者 ==========
    print("=" * 60)
    print("第6步：添加示例KYC投资者（测试用）")
    print("=" * 60)
    
    # 添加几个测试投资者
    test_investors = accounts.test_accounts[1:4]
    
    for i, investor in enumerate(test_investors, 1):
        kyc_manager.addInvestor(
            investor.address,
            "US",  # 国家代码
            i == 1,  # 第一个是合格投资者
            sender=deployer
        )
        investor_info = kyc_manager.getInvestorInfo(investor.address)
        print(f"\n✓ 投资者 {i}: {investor.address}")
        print(f"  国家: {investor_info[1]}")
        print(f"  合格投资者: {investor_info[2]}")
        print(f"  KYC验证: {kyc_manager.isVerified(investor.address)}")
    
    print(f"\n当前投资者数量: {kyc_manager.investorCount()}")
    print(f"剩余名额: {kyc_manager.getRemainingSlots()}\n")
    
    # ========== 第7步：保存部署地址 ==========
    print("=" * 60)
    print("第7步：保存部署信息")
    print("=" * 60)
    
    # 添加额外信息
    deployed_addresses['deployer'] = str(deployer.address)
    deployed_addresses['network'] = 'local'
    deployed_addresses['version'] = 'STO-v1.0'
    
    # 保存到文件
    with open('deployed_addresses_sto.json', 'w') as f:
        json.dump(deployed_addresses, f, indent=2)
    
    print(f"\n✓ 部署地址已保存到: deployed_addresses_sto.json\n")
    
    # ========== 部署总结 ==========
    print("\n" + "=" * 60)
    print("  部署完成 - STO 合规系统")
    print("=" * 60)
    
    print("\n📋 已部署合约:")
    print(f"  1. KYCManager:       {kyc_manager.address}")
    print(f"  2. MockUSDT:         {usdt.address}")
    print(f"  3. RWATokenSTO:      {rwa_token.address}")
    print(f"  4. PlatformToken:    {platform_token.address}")
    print(f"  5. Subscription:     {subscription.address}")
    print(f"  6. Staking:          {staking.address}")
    print(f"  7. LiquidityMining:  {liquidity_mining.address}")
    
    print("\n🔐 STO 合规功能:")
    print(f"  ✓ KYC/AML 验证系统")
    print(f"  ✓ ERC1404 转账限制")
    print(f"  ✓ 投资者白名单")
    print(f"  ✓ 投资额限制")
    print(f"  ✓ 法律文档关联")
    print(f"  ✓ 监管强制转账功能")
    print(f"  ✓ 账户冻结功能")
    
    print("\n⚠️  重要提示:")
    print("  1. 部署到生产环境前必须:")
    print("     - 聘请证券律师审查")
    print("     - 进行专业安全审计")
    print("     - 获得监管批准（SEC/MAS等）")
    print("     - 集成真实的KYC服务商")
    print("  2. 更新法律文档URI为真实文档")
    print("  3. 设置正确的最小/最大投资额")
    print("  4. 配置投资者上限符合Reg D/S/A+要求")
    
    print("\n📖 下一步:")
    print("  1. 查看 STO_MIGRATION_GUIDE.md")
    print("  2. 查看 STO_COMPLIANCE_CHECKLIST.md")
    print("  3. 运行测试: ape test tests/test_sto_*")
    print("  4. 设置 Uniswap 流动性池")
    
    print("\n" + "=" * 60 + "\n")
    
    return deployed_addresses


if __name__ == "__main__":
    main()

