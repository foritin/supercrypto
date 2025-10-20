# 执行: cd dapp/Auction && ape run scripts/user_bid.py --network ethereum:hardhat
"""
用户操作：出价
"""
from ape import accounts, Contract
from datetime import datetime

def load_auction_address():
    try:
        with open("deployed_auction.txt", "r") as f:
            for line in f:
                if line.startswith("AUCTION_ADDRESS="):
                    return line.strip().split("=")[1]
    except FileNotFoundError:
        print("❌ 未找到部署信息，请先部署拍卖合约")
        exit(1)
    return None

def main():
    print("=" * 70)
    print("用户操作：出价")
    print("=" * 70)
    
    auction_address = load_auction_address()
    if not auction_address:
        print("❌ 无法获取拍卖地址")
        return
    
    # 使用不同的账户模拟不同用户
    print("\n选择出价者账户：")
    print("1. 用户1 (accounts[1])")
    print("2. 用户2 (accounts[2])")
    print("3. 用户3 (accounts[3])")
    
    user_choice = input("选择账户 (默认: 1): ").strip() or "1"
    user_index = int(user_choice)
    
    bidder = accounts.test_accounts[user_index]
    auction = Contract(auction_address)
    
    # 获取拍卖信息
    beneficiary, start_time, end_time, highest_bidder, highest_bid, ended = auction.getAuctionInfo()
    
    print(f"\n拍卖信息:")
    print(f"  合约地址: {auction_address}")
    print(f"  受益人: {beneficiary}")
    print(f"  开始时间: {datetime.fromtimestamp(start_time).strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  结束时间: {datetime.fromtimestamp(end_time).strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  当前最高出价: {highest_bid / 10**18:.4f} ETH")
    
    if highest_bidder != "0x0000000000000000000000000000000000000000":
        print(f"  当前最高出价者: {highest_bidder}")
    else:
        print(f"  当前最高出价者: 暂无")
    
    # 检查拍卖状态
    is_active = auction.isActive()
    if not is_active:
        print(f"\n❌ 拍卖未激活")
        if ended:
            print("原因：拍卖已结束")
        else:
            current_time = datetime.now().timestamp()
            if current_time < start_time:
                print(f"原因：拍卖尚未开始")
            elif current_time >= end_time:
                print(f"原因：拍卖时间已过")
        return
    
    # 显示剩余时间
    time_left = auction.timeLeft()
    hours_left = time_left // 3600
    minutes_left = (time_left % 3600) // 60
    print(f"  剩余时间: {hours_left}小时 {minutes_left}分钟")
    
    # 出价者信息
    print(f"\n出价者信息:")
    print(f"  地址: {bidder.address}")
    print(f"  ETH余额: {bidder.balance / 10**18:.4f} ETH")
    
    # 查询待退款
    pending_return = auction.getPendingReturn(bidder.address)
    if pending_return > 0:
        print(f"  待退款: {pending_return / 10**18:.4f} ETH (可以提取)")
    
    # 出价
    print("\n" + "=" * 70)
    min_bid = (highest_bid / 10**18) + 0.001  # 最少要比当前高价高0.001 ETH
    
    bid_amount_input = input(f"出价金额（ETH，至少 {min_bid:.4f}）: ").strip()
    if not bid_amount_input:
        print("已取消")
        return
    
    try:
        bid_amount_eth = float(bid_amount_input)
        bid_amount_wei = int(bid_amount_eth * 10**18)
    except ValueError:
        print("❌ 无效的金额")
        return
    
    # 检查余额
    if bidder.balance < bid_amount_wei:
        print(f"❌ ETH余额不足")
        return
    
    # 检查是否高于当前价格
    if bid_amount_wei <= highest_bid:
        print(f"❌ 出价必须高于当前最高价 {highest_bid / 10**18:.4f} ETH")
        return
    
    print(f"\n您的出价: {bid_amount_eth} ETH")
    confirm = input("确认出价? (yes/no): ").strip().lower()
    if confirm != "yes":
        print("已取消")
        return
    
    # 执行出价
    print("\n正在出价...")
    try:
        tx = auction.bid(sender=bidder, value=bid_amount_wei)
        
        print(f"\n" + "=" * 70)
        print("✅ 出价成功！")
        print("=" * 70)
        print(f"交易哈希: {tx.txn_hash}")
        print(f"您的出价: {bid_amount_eth} ETH")
        print(f"您现在是最高出价者！")
        
        # 显示新余额
        print(f"\n新余额: {bidder.balance / 10**18:.4f} ETH")
        
    except Exception as e:
        print(f"\n❌ 出价失败: {e}")

