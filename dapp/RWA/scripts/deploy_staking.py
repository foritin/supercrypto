"""
部署质押合约
"""
from ape import accounts, project, Contract


def main(rwa_token_address=None, platform_token_address=None, subscription_address=None):
    # 获取部署账户
    deployer = accounts.test_accounts[0]
    print(f"部署账户: {deployer.address}")
    
    # 如果没有提供地址，需要先部署
    if not all([rwa_token_address, platform_token_address, subscription_address]):
        print("未提供完整地址，先部署所需合约...")
        from deploy_tokens import main as deploy_tokens
        from deploy_subscription import main as deploy_subscription
        
        addresses = deploy_tokens()
        rwa_token_address = addresses["rwa_token"]
        platform_token_address = addresses["platform_token"]
        subscription_address = deploy_subscription(
            addresses["usdt"],
            rwa_token_address
        )
    
    # 部署 Staking
    print(f"\n部署 Staking...")
    print(f"  RWA Token 地址: {rwa_token_address}")
    print(f"  Platform Token 地址: {platform_token_address}")
    print(f"  Subscription 地址: {subscription_address}")
    
    staking = project.Staking.deploy(
        rwa_token_address,
        platform_token_address,
        subscription_address,
        sender=deployer
    )
    print(f"Staking 部署地址: {staking.address}")
    
    # 设置 PlatformToken 的铸造权限
    print("\n设置 PlatformToken 权限...")
    platform_token = Contract(platform_token_address)
    
    # 允许 Staking 合约铸造平台代币
    tx = platform_token.setMinter(staking.address, True, sender=deployer)
    print(f"  设置铸造权限: {tx.txn_hash}")
    
    return staking.address


if __name__ == "__main__":
    main()

