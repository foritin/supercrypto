# 执行: cd dapp/Auction && ape run scripts/end_auction.py --network ethereum:hardhat
"""
管理员/任何人操作：结束拍卖

注意：任何人都可以调用此函数，但只有在拍卖时间结束后才能生效
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
        print("❌ 未找到部署信息")
        exit(1)
    return None

def main():
    print("=" * 70)
    print("结束拍卖")
    print("=" * 70)
    
    auction_address = load_auction_address()
    if not auction_address:
        return
    
    # 可以使用任何账户
    caller = accounts.test_accounts[0]
    auction = Contract(auction_address)
    
    # 获取拍卖信息
    beneficiary, start_time, end_time, highest_bidder, highest_bid, ended = auction.getAuctionInfo()
    
    print(f"\n拍卖信息:")
    print(f"  合约地址: {auction_address}")
    print(f"  受益人: {beneficiary}")
    print(f"  结束时间: {datetime.fromtimestamp(end_time).strftime('%Y-%m-%d %H:%M:%S')}")
    
    if highest_bidder != "0x0000000000000000000000000000000000000000":
        print(f"  最高出价者: {highest_bidder}")
        print(f"  最高出价: {highest_bid / 10**18:.4f} ETH")
    else:
        print(f"  最高出价者: 无人出价")
        print(f"  最高出价: 0 ETH")
    
    # 检查是否已结束
    if ended:
        print(f"\n⚠️ 拍卖已经结束")
        return
    
    # 检查时间
    current_time = int(datetime.now().timestamp())
    if current_time < end_time:
        time_left = end_time - current_time
        hours_left = time_left // 3600
        minutes_left = (time_left % 3600) // 60
        print(f"\n❌ 拍卖尚未结束")
        print(f"剩余时间: {hours_left}小时 {minutes_left}分钟")
        print(f"请在 {datetime.fromtimestamp(end_time).strftime('%Y-%m-%d %H:%M:%S')} 之后再试")
        return
    
    print(f"\n✅ 拍卖时间已到，可以结束拍卖")
    
    confirm = input("\n确认结束拍卖? (yes/no): ").strip().lower()
    if confirm != "yes":
        print("已取消")
        return
    
    # 结束拍卖
    print("\n正在结束拍卖...")
    try:
        tx = auction.endAuction(sender=caller)
        
        print(f"\n" + "=" * 70)
        print("✅ 拍卖已结束！")
        print("=" * 70)
        print(f"交易哈希: {tx.txn_hash}")
        
        if highest_bidder != "0x0000000000000000000000000000000000000000":
            print(f"\n🏆 获胜者: {highest_bidder}")
            print(f"💰 中标价格: {highest_bid / 10**18:.4f} ETH")
            print(f"📤 资金已转给受益人: {beneficiary}")
        else:
            print(f"\n⚠️ 无人出价，拍卖流拍")
        
        print(f"\n其他出价者可以运行 'ape run user_withdraw' 提取退款")
        
    except Exception as e:
        print(f"\n❌ 结束拍卖失败: {e}")

