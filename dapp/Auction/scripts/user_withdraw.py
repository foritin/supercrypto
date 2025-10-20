# 执行: cd dapp/Auction && ape run scripts/user_withdraw.py --network ethereum:hardhat
"""
用户操作：提取退款
"""
from ape import accounts, Contract

def load_auction_address():
    try:
        with open("deployed_auction.txt", "r") as f:
            for line in f:
                if line.startswith("AUCTION_ADDRESS="):
                    return line.strip().split("=")[1]
    except FileNotFoundError:
        print("❌ 未找到部署信息")
        exit(1)
    return None

def main():
    print("=" * 70)
    print("用户操作：提取退款")
    print("=" * 70)
    
    auction_address = load_auction_address()
    if not auction_address:
        return
    
    # 选择用户
    print("\n选择用户账户：")
    print("1. 用户1 (accounts[1])")
    print("2. 用户2 (accounts[2])")
    print("3. 用户3 (accounts[3])")
    
    user_choice = input("选择账户 (默认: 1): ").strip() or "1"
    user_index = int(user_choice)
    
    user = accounts.test_accounts[user_index]
    auction = Contract(auction_address)
    
    print(f"\n用户信息:")
    print(f"  地址: {user.address}")
    print(f"  当前ETH余额: {user.balance / 10**18:.4f} ETH")
    
    # 查询待退款金额
    pending_return = auction.getPendingReturn(user.address)
    
    if pending_return == 0:
        print(f"\n❌ 没有可提取的退款")
        print("原因：")
        print("  - 您可能没有参与过出价")
        print("  - 您的出价可能仍是最高价")
        print("  - 您已经提取过退款了")
        return
    
    print(f"\n可提取退款: {pending_return / 10**18:.4f} ETH")
    
    confirm = input("\n确认提取? (yes/no): ").strip().lower()
    if confirm != "yes":
        print("已取消")
        return
    
    # 执行提取
    print("\n正在提取...")
    try:
        tx = auction.withdraw(sender=user)
        
        print(f"\n" + "=" * 70)
        print("✅ 提取成功！")
        print("=" * 70)
        print(f"交易哈希: {tx.txn_hash}")
        print(f"提取金额: {pending_return / 10**18:.4f} ETH")
        print(f"\n新余额: {user.balance / 10**18:.4f} ETH")
        
    except Exception as e:
        print(f"\n❌ 提取失败: {e}")

