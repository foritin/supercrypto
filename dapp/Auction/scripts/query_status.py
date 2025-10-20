# 执行: cd dapp/Auction && ape run scripts/query_status.py --network ethereum:hardhat
"""
查询拍卖状态
"""
from ape import Contract
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
    print("拍卖状态查询")
    print("=" * 70)
    
    auction_address = load_auction_address()
    if not auction_address:
        return
    
    auction = Contract(auction_address)
    
    # 获取拍卖信息
    beneficiary, start_time, end_time, highest_bidder, highest_bid, ended = auction.getAuctionInfo()
    is_active = auction.isActive()
    time_left = auction.timeLeft()
    
    print(f"\n📋 基本信息")
    print("=" * 70)
    print(f"合约地址: {auction_address}")
    print(f"受益人: {beneficiary}")
    
    print(f"\n⏰ 时间信息")
    print("=" * 70)
    print(f"开始时间: {datetime.fromtimestamp(start_time).strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"结束时间: {datetime.fromtimestamp(end_time).strftime('%Y-%m-%d %H:%M:%S')}")
    
    if time_left > 0:
        hours = time_left // 3600
        minutes = (time_left % 3600) // 60
        seconds = time_left % 60
        print(f"剩余时间: {hours}小时 {minutes}分钟 {seconds}秒")
    else:
        print(f"剩余时间: 已结束")
    
    print(f"\n📊 拍卖状态")
    print("=" * 70)
    
    current_time = int(datetime.now().timestamp())
    if ended:
        print(f"状态: 🔴 已结束")
    elif current_time < start_time:
        print(f"状态: 🟡 尚未开始")
    elif is_active:
        print(f"状态: 🟢 正在进行")
    else:
        print(f"状态: 🟠 时间已到，等待结束")
    
    print(f"\n💰 出价信息")
    print("=" * 70)
    if highest_bidder != "0x0000000000000000000000000000000000000000":
        print(f"最高出价: {highest_bid / 10**18:.6f} ETH")
        print(f"最高出价者: {highest_bidder}")
    else:
        print(f"最高出价: 暂无出价")
    
    # 如果需要查询特定用户的待退款
    print(f"\n💵 查询用户待退款")
    print("=" * 70)
    user_address = input("输入用户地址（留空跳过）: ").strip()
    
    if user_address:
        try:
            pending = auction.getPendingReturn(user_address)
            if pending > 0:
                print(f"✅ 待退款: {pending / 10**18:.6f} ETH")
                print(f"该用户可以运行 'ape run user_withdraw' 提取退款")
            else:
                print(f"⚠️ 无待退款")
        except Exception as e:
            print(f"❌ 查询失败: {e}")
    
    print(f"\n" + "=" * 70)
    print("查询完成")
    print("=" * 70)
    
    # 提示下一步操作
    print(f"\n💡 可用操作:")
    if is_active:
        print("  - 出价: ape run user_bid")
    elif not ended and time_left == 0:
        print("  - 结束拍卖: ape run end_auction")
    
    if highest_bidder != "0x0000000000000000000000000000000000000000":
        print("  - 提取退款: ape run user_withdraw (未中标者)")

