"""
部署认购合约
"""
from ape import accounts, project, Contract


def main(usdt_address=None, rwa_token_address=None):
    # 获取部署账户
    deployer = accounts.test_accounts[0]
    print(f"部署账户: {deployer.address}")
    
    # 如果没有提供地址，需要先部署代币
    if not usdt_address or not rwa_token_address:
        print("未提供代币地址，先部署代币合约...")
        from deploy_tokens import main as deploy_tokens
        addresses = deploy_tokens()
        usdt_address = addresses["usdt"]
        rwa_token_address = addresses["rwa_token"]
    
    # 部署 Subscription
    print(f"\n部署 Subscription...")
    print(f"  USDT 地址: {usdt_address}")
    print(f"  RWA Token 地址: {rwa_token_address}")
    
    subscription = project.Subscription.deploy(
        usdt_address,
        rwa_token_address,
        sender=deployer
    )
    print(f"Subscription 部署地址: {subscription.address}")
    
    # 设置 RWAToken 的铸造和销毁权限
    print("\n设置 RWAToken 权限...")
    rwa_token = Contract(rwa_token_address)
    
    # 允许 Subscription 合约铸造 RWA Token
    tx1 = rwa_token.setMinter(subscription.address, True, sender=deployer)
    print(f"  设置铸造权限: {tx1.txn_hash}")
    
    # 允许 Subscription 合约销毁 RWA Token
    tx2 = rwa_token.setBurner(subscription.address, True, sender=deployer)
    print(f"  设置销毁权限: {tx2.txn_hash}")
    
    return subscription.address


if __name__ == "__main__":
    main()

