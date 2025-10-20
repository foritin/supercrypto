"""
设置 Uniswap 流动性
创建 PlatformToken/USDT 交易对并注入初始流动性
"""
from ape import accounts, Contract
import json
import os


def load_deployed_addresses():
    """加载已部署的合约地址"""
    with open("deployed_addresses.json", "r") as f:
        return json.load(f)


def load_uniswap_addresses():
    """加载 Uniswap 合约地址"""
    with open("uniswap_addresses.json", "r") as f:
        return json.load(f)


def main():
    # 获取部署账户
    deployer = accounts.test_accounts[0]
    print(f"使用账户: {deployer.address}")
    print(f"余额: {deployer.balance / 10**18} ETH\n")
    
    # 检查地址文件是否存在
    if not os.path.exists("deployed_addresses.json"):
        print("错误: deployed_addresses.json 不存在")
        print("请先运行: ape run deploy_all --network ethereum:local")
        return
    
    if not os.path.exists("uniswap_addresses.json"):
        print("错误: uniswap_addresses.json 不存在")
        print("请先部署 Uniswap V2 合约")
        print("提示: 运行 Hardhat 脚本或手动部署 Uniswap")
        return
    
    # 加载地址
    rwa_addresses = load_deployed_addresses()
    uniswap_addresses = load_uniswap_addresses()
    
    print("=== 已加载合约地址 ===")
    print(f"Platform Token: {rwa_addresses['platform_token']}")
    print(f"USDT: {rwa_addresses['usdt']}")
    print(f"Uniswap Factory: {uniswap_addresses['factory']}")
    print(f"Uniswap Router: {uniswap_addresses['router']}")
    print()
    
    # 获取合约实例
    platform_token = Contract(rwa_addresses['platform_token'])
    usdt = Contract(rwa_addresses['usdt'])
    
    # Uniswap Factory ABI（简化）
    factory_abi = [
        {
            "constant": False,
            "inputs": [
                {"name": "tokenA", "type": "address"},
                {"name": "tokenB", "type": "address"}
            ],
            "name": "createPair",
            "outputs": [{"name": "pair", "type": "address"}],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "constant": True,
            "inputs": [
                {"name": "", "type": "address"},
                {"name": "", "type": "address"}
            ],
            "name": "getPair",
            "outputs": [{"name": "", "type": "address"}],
            "stateMutability": "view",
            "type": "function"
        }
    ]
    
    # Uniswap Router ABI（简化）
    router_abi = [
        {
            "constant": False,
            "inputs": [
                {"name": "tokenA", "type": "address"},
                {"name": "tokenB", "type": "address"},
                {"name": "amountADesired", "type": "uint256"},
                {"name": "amountBDesired", "type": "uint256"},
                {"name": "amountAMin", "type": "uint256"},
                {"name": "amountBMin", "type": "uint256"},
                {"name": "to", "type": "address"},
                {"name": "deadline", "type": "uint256"}
            ],
            "name": "addLiquidity",
            "outputs": [
                {"name": "amountA", "type": "uint256"},
                {"name": "amountB", "type": "uint256"},
                {"name": "liquidity", "type": "uint256"}
            ],
            "stateMutability": "nonpayable",
            "type": "function"
        }
    ]
    
    factory = Contract(uniswap_addresses['factory'], abi=factory_abi)
    router = Contract(uniswap_addresses['router'], abi=router_abi)
    
    # 1. 检查交易对是否已存在
    print("\n=== 检查交易对 ===")
    pair_address = factory.getPair(platform_token.address, usdt.address)
    
    if pair_address == "0x0000000000000000000000000000000000000000":
        print("交易对不存在，正在创建...")
        tx = factory.createPair(
            platform_token.address,
            usdt.address,
            sender=deployer
        )
        pair_address = factory.getPair(platform_token.address, usdt.address)
        print(f"✓ 交易对已创建: {pair_address}")
    else:
        print(f"✓ 交易对已存在: {pair_address}")
    
    # 2. 准备流动性
    print("\n=== 准备流动性 ===")
    
    # 初始流动性：100,000 USDT + 100,000,000 PLT
    # 初始价格：0.001 USDT per PLT
    usdt_amount = 100_000 * 10**6          # 100,000 USDT (6 decimals)
    plt_amount = 100_000_000 * 10**18      # 100,000,000 PLT (18 decimals)
    
    print(f"USDT 数量: {usdt_amount / 10**6:,.0f}")
    print(f"PLT 数量: {plt_amount / 10**18:,.0f}")
    print(f"初始价格: {usdt_amount / 10**6 / (plt_amount / 10**18)} USDT per PLT")
    
    # 铸造代币
    print("\n铸造代币...")
    usdt.mint(deployer.address, usdt_amount, sender=deployer)
    platform_token.mint(deployer.address, plt_amount, sender=deployer)
    print("✓ 代币已铸造")
    
    # 3. 授权 Router
    print("\n=== 授权 Router ===")
    usdt.approve(router.address, usdt_amount, sender=deployer)
    platform_token.approve(router.address, plt_amount, sender=deployer)
    print("✓ 授权完成")
    
    # 4. 添加流动性
    print("\n=== 添加流动性 ===")
    
    import time
    deadline = int(time.time()) + 3600  # 1小时后过期
    
    tx = router.addLiquidity(
        platform_token.address,
        usdt.address,
        plt_amount,
        usdt_amount,
        0,  # amountAMin
        0,  # amountBMin
        deployer.address,
        deadline,
        sender=deployer
    )
    
    print("✓ 流动性已添加")
    print(f"  交易哈希: {tx.txn_hash}")
    
    # 5. 更新流动性挖矿合约
    print("\n=== 更新流动性挖矿合约 ===")
    liquidity_mining = Contract(rwa_addresses['liquidity_mining'])
    
    current_lp = liquidity_mining.lpToken()
    if current_lp == "0x0000000000000000000000000000000000000000":
        liquidity_mining.setLPToken(pair_address, sender=deployer)
        print(f"✓ LP Token 地址已更新: {pair_address}")
    else:
        print(f"LP Token 地址已设置: {current_lp}")
    
    # 6. 保存更新的地址
    print("\n=== 保存地址 ===")
    rwa_addresses['uniswap_pair'] = pair_address
    rwa_addresses['uniswap_factory'] = uniswap_addresses['factory']
    rwa_addresses['uniswap_router'] = uniswap_addresses['router']
    
    with open("deployed_addresses.json", "w") as f:
        json.dump(rwa_addresses, f, indent=2)
    
    print("✓ 地址已更新到 deployed_addresses.json")
    
    # 7. 总结
    print("\n" + "="*60)
    print("Uniswap 流动性设置完成！")
    print("="*60)
    print(f"\n交易对地址: {pair_address}")
    print(f"流动性: {usdt_amount / 10**6:,.0f} USDT + {plt_amount / 10**18:,.0f} PLT")
    print(f"初始价格: 0.001 USDT per PLT")
    print("\n现在可以:")
    print("  1. 在 Uniswap 上交易 PLT/USDT")
    print("  2. 用户可以添加流动性获得 LP Token")
    print("  3. 质押 LP Token 进行流动性挖矿")
    print("  4. 运行完整的集成测试")


if __name__ == "__main__":
    main()

