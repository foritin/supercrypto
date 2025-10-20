"""
部署代币合约：MockUSDT、RWAToken、PlatformToken
"""
from ape import accounts, project


def main():
    # 获取部署账户
    deployer = accounts.test_accounts[0]
    print(f"部署账户: {deployer.address}")
    print(f"余额: {deployer.balance / 10**18} ETH")
    
    # 部署 MockUSDT
    print("\n部署 MockUSDT...")
    usdt = project.MockUSDT.deploy(sender=deployer)
    print(f"MockUSDT 部署地址: {usdt.address}")
    
    # 部署 RWAToken
    print("\n部署 RWAToken...")
    rwa_token = project.RWAToken.deploy(sender=deployer)
    print(f"RWAToken 部署地址: {rwa_token.address}")
    
    # 部署 PlatformToken
    print("\n部署 PlatformToken...")
    platform_token = project.PlatformToken.deploy(sender=deployer)
    print(f"PlatformToken 部署地址: {platform_token.address}")
    
    # 返回合约地址
    return {
        "usdt": usdt.address,
        "rwa_token": rwa_token.address,
        "platform_token": platform_token.address
    }


if __name__ == "__main__":
    main()

