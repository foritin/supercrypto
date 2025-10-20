# 执行: cd dapp/Auction && ape run scripts/deploy.py --network ethereum:hardhat
"""
管理员操作：部署拍卖合约

拍卖场景示例：
- 拍卖NFT
- 拍卖域名
- 拍卖实物商品
- 拍卖服务时间
"""
from ape import accounts, project
from datetime import datetime, timedelta

def main():
    print("=" * 70)
    print("管理员操作：部署拍卖合约")
    print("=" * 70)
    
    # 使用测试账户
    deployer = accounts.test_accounts[0]
    
    print(f"\n部署账户: {deployer.address}")
    print(f"余额: {deployer.balance / 10**18:.4f} ETH")
    
    # 拍卖参数配置
    print("\n" + "=" * 70)
    print("拍卖参数配置")
    print("=" * 70)
    
    # 受益人地址
    beneficiary_input = input(f"\n受益人地址（拍卖物品所有者，默认为部署者）: ").strip()
    if beneficiary_input:
        beneficiary = beneficiary_input
    else:
        beneficiary = deployer.address
    
    print(f"受益人: {beneficiary}")
    
    # 拍卖开始时间
    print("\n拍卖开始时间：")
    print("1. 立即开始")
    print("2. 指定未来时间")
    
    start_choice = input("选择 (默认: 1): ").strip() or "1"
    
    if start_choice == "1":
        auction_start = int(datetime.now().timestamp())
        print(f"立即开始：{datetime.fromtimestamp(auction_start)}")
    else:
        hours = int(input("几小时后开始? (默认: 1): ").strip() or "1")
        auction_start = int((datetime.now() + timedelta(hours=hours)).timestamp())
        print(f"开始时间：{datetime.fromtimestamp(auction_start)}")
    
    # 拍卖持续时间
    print("\n拍卖持续时间：")
    duration_hours = int(input("持续多少小时? (默认: 24): ").strip() or "24")
    bidding_time = duration_hours * 3600  # 转换为秒
    
    auction_end = auction_start + bidding_time
    
    print("\n" + "=" * 70)
    print("拍卖配置汇总")
    print("=" * 70)
    print(f"受益人: {beneficiary}")
    print(f"开始时间: {datetime.fromtimestamp(auction_start).strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"结束时间: {datetime.fromtimestamp(auction_end).strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"持续时间: {duration_hours} 小时")
    
    # 确认部署
    confirm = input("\n确认部署拍卖? (yes/no): ").strip().lower()
    if confirm != "yes":
        print("已取消")
        return
    
    # 部署合约
    print("\n正在部署拍卖合约...")
    auction = project.Auction.deploy(
        beneficiary,
        auction_start,
        bidding_time,
        sender=deployer
    )
    
    print(f"\n" + "=" * 70)
    print("✅ 拍卖合约部署成功！")
    print("=" * 70)
    print(f"\n合约地址: {auction.address}")
    print(f"受益人: {beneficiary}")
    print(f"开始时间: {datetime.fromtimestamp(auction_start).strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"结束时间: {datetime.fromtimestamp(auction_end).strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 保存部署信息
    with open("deployed_auction.txt", "w") as f:
        f.write(f"# 拍卖合约部署信息\n")
        f.write(f"AUCTION_ADDRESS={auction.address}\n")
        f.write(f"BENEFICIARY={beneficiary}\n")
        f.write(f"AUCTION_START={auction_start}\n")
        f.write(f"AUCTION_END={auction_end}\n")
        f.write(f"DURATION_HOURS={duration_hours}\n")
        f.write(f"DEPLOYER={deployer.address}\n")
    
    print("\n✅ 部署信息已保存到 deployed_auction.txt")
    print("\n下一步：")
    print("  - 用户出价: ape run user_bid")
    print("  - 查询状态: ape run query_status")
    print("  - 结束拍卖: ape run end_auction")

