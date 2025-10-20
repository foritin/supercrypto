"""
部署流动性挖矿合约
"""
from ape import accounts, project, Contract


def main(lp_token_address=None, platform_token_address=None):
    # 获取部署账户
    deployer = accounts.test_accounts[0]
    print(f"部署账户: {deployer.address}")
    
    # 如果没有提供 LP Token 地址，使用占位符
    if not lp_token_address:
        print("\n警告: 未提供 LP Token 地址")
        print("需要先创建 Uniswap 交易对获取 LP Token 地址")
        # 使用零地址作为占位符
        lp_token_address = "0x0000000000000000000000000000000000000000"
    
    if not platform_token_address:
        print("\n未提供平台代币地址，先部署代币...")
        from deploy_tokens import main as deploy_tokens
        addresses = deploy_tokens()
        platform_token_address = addresses["platform_token"]
    
    # 部署 LiquidityMining
    print(f"\n部署 LiquidityMining...")
    print(f"  LP Token 地址: {lp_token_address}")
    print(f"  Platform Token 地址: {platform_token_address}")
    
    liquidity_mining = project.LiquidityMining.deploy(
        lp_token_address,
        platform_token_address,
        sender=deployer
    )
    print(f"LiquidityMining 部署地址: {liquidity_mining.address}")
    
    # 设置 PlatformToken 的铸造权限
    print("\n设置 PlatformToken 权限...")
    platform_token = Contract(platform_token_address)
    
    # 允许 LiquidityMining 合约铸造平台代币
    tx = platform_token.setMinter(liquidity_mining.address, True, sender=deployer)
    print(f"  设置铸造权限: {tx.txn_hash}")
    
    if lp_token_address == "0x0000000000000000000000000000000000000000":
        print("\n注意: LP Token 地址为零地址，需要后续更新")
        print("部署 Uniswap 交易对后，使用 setLPToken() 更新地址")
    
    return liquidity_mining.address


if __name__ == "__main__":
    main()

