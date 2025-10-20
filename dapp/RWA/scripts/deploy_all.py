"""
完整部署所有合约
"""
from ape import accounts, project, Contract
import json


def save_addresses(addresses, filename="deployed_addresses.json"):
    """保存部署的合约地址"""
    with open(filename, "w") as f:
        json.dump(addresses, f, indent=2)
    print(f"\n合约地址已保存到: {filename}")


def main():
    deployer = accounts.test_accounts[0]
    print("="*60)
    print("RWA 系统完整部署")
    print("="*60)
    print(f"部署账户: {deployer.address}")
    print(f"余额: {deployer.balance / 10**18} ETH\n")
    
    addresses = {}
    
    # 1. 部署代币
    print("\n" + "="*60)
    print("步骤 1: 部署代币")
    print("="*60)
    
    print("\n部署 MockUSDT...")
    usdt = project.MockUSDT.deploy(sender=deployer)
    addresses["usdt"] = usdt.address
    print(f"  ✓ MockUSDT: {usdt.address}")
    
    print("\n部署 RWAToken...")
    rwa_token = project.RWAToken.deploy(sender=deployer)
    addresses["rwa_token"] = rwa_token.address
    print(f"  ✓ RWAToken: {rwa_token.address}")
    
    print("\n部署 PlatformToken...")
    platform_token = project.PlatformToken.deploy(sender=deployer)
    addresses["platform_token"] = platform_token.address
    print(f"  ✓ PlatformToken: {platform_token.address}")
    
    # 2. 部署认购合约
    print("\n" + "="*60)
    print("步骤 2: 部署认购合约")
    print("="*60)
    
    subscription = project.Subscription.deploy(
        usdt.address,
        rwa_token.address,
        sender=deployer
    )
    addresses["subscription"] = subscription.address
    print(f"  ✓ Subscription: {subscription.address}")
    
    # 设置权限
    print("\n  设置 RWAToken 权限...")
    rwa_token.setMinter(subscription.address, True, sender=deployer)
    print("    ✓ 铸造权限")
    rwa_token.setBurner(subscription.address, True, sender=deployer)
    print("    ✓ 销毁权限")
    
    # 3. 部署质押合约
    print("\n" + "="*60)
    print("步骤 3: 部署质押合约")
    print("="*60)
    
    staking = project.Staking.deploy(
        rwa_token.address,
        platform_token.address,
        subscription.address,
        sender=deployer
    )
    addresses["staking"] = staking.address
    print(f"  ✓ Staking: {staking.address}")
    
    # 设置权限
    print("\n  设置 PlatformToken 权限...")
    platform_token.setMinter(staking.address, True, sender=deployer)
    print("    ✓ 质押合约铸造权限")
    
    # 4. 部署流动性挖矿（暂时使用零地址作为LP Token）
    print("\n" + "="*60)
    print("步骤 4: 部署流动性挖矿合约")
    print("="*60)
    
    # 注意：LP Token地址需要在创建Uniswap交易对后更新
    lp_token_placeholder = "0x0000000000000000000000000000000000000000"
    
    liquidity_mining = project.LiquidityMining.deploy(
        lp_token_placeholder,
        platform_token.address,
        sender=deployer
    )
    addresses["liquidity_mining"] = liquidity_mining.address
    print(f"  ✓ LiquidityMining: {liquidity_mining.address}")
    
    # 设置权限
    print("\n  设置 PlatformToken 权限...")
    platform_token.setMinter(liquidity_mining.address, True, sender=deployer)
    print("    ✓ 流动性挖矿铸造权限")
    
    # 5. 初始化设置
    print("\n" + "="*60)
    print("步骤 5: 初始化设置")
    print("="*60)
    
    # 给部署者铸造一些测试 USDT
    print("\n  铸造测试 USDT...")
    test_amount = 1_000_000 * 10**6  # 100万 USDT
    usdt.mint(deployer.address, test_amount, sender=deployer)
    print(f"    ✓ 铸造 {test_amount / 10**6} USDT 给部署者")
    
    # 给其他测试账户铸造 USDT
    for i in range(1, 5):
        test_account = accounts.test_accounts[i]
        usdt.mint(test_account.address, 100_000 * 10**6, sender=deployer)
        print(f"    ✓ 铸造 100,000 USDT 给测试账户 {i}")
    
    # 6. 总结
    print("\n" + "="*60)
    print("部署完成！")
    print("="*60)
    print("\n已部署合约:")
    for name, address in addresses.items():
        print(f"  {name:20s}: {address}")
    
    print("\n" + "="*60)
    print("后续步骤:")
    print("="*60)
    print("""
    1. 部署 Uniswap V2 或连接到现有 Uniswap 部署
    2. 创建 PlatformToken/USDT 交易对
    3. 注入初始流动性（100,000 USDT + 100,000,000 PLT）
    4. 获取 LP Token 地址
    5. 更新 LiquidityMining 合约的 LP Token 地址：
       liquidity_mining.setLPToken(lp_token_address)
    
    6. 开始测试系统功能：
       - 认购权益代币
       - 质押挖矿
       - 流动性挖矿
       - 赎回
    """)
    
    # 保存地址
    save_addresses(addresses)
    
    return addresses


if __name__ == "__main__":
    main()

