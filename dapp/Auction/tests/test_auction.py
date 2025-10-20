"""
拍卖合约测试
"""
import pytest
from ape import accounts, project
from datetime import datetime, timedelta

@pytest.fixture
def beneficiary():
    return accounts.test_accounts[0]

@pytest.fixture
def bidder1():
    return accounts.test_accounts[1]

@pytest.fixture
def bidder2():
    return accounts.test_accounts[2]

@pytest.fixture
def bidder3():
    return accounts.test_accounts[3]

@pytest.fixture
def auction(beneficiary):
    """部署一个立即开始、持续1小时的拍卖"""
    start_time = int(datetime.now().timestamp())
    duration = 3600  # 1小时
    return beneficiary.deploy(project.Auction, beneficiary.address, start_time, duration)

def test_deployment(auction, beneficiary):
    """测试：合约部署"""
    assert auction.beneficiary() == beneficiary.address
    assert auction.ended() == False
    assert auction.highestBid() == 0

def test_first_bid(auction, bidder1):
    """测试：第一次出价"""
    bid_amount = 10**18  # 1 ETH
    
    tx = auction.bid(sender=bidder1, value=bid_amount)
    
    assert auction.highestBidder() == bidder1.address
    assert auction.highestBid() == bid_amount

def test_higher_bid(auction, bidder1, bidder2):
    """测试：更高的出价"""
    # 第一次出价
    auction.bid(sender=bidder1, value=10**18)
    
    # 第二次出价（更高）
    higher_bid = 2 * 10**18
    auction.bid(sender=bidder2, value=higher_bid)
    
    assert auction.highestBidder() == bidder2.address
    assert auction.highestBid() == higher_bid
    
    # bidder1应该有待退款
    pending = auction.getPendingReturn(bidder1.address)
    assert pending == 10**18

def test_lower_bid_fails(auction, bidder1, bidder2):
    """测试：低于当前最高价的出价应该失败"""
    # 第一次出价
    auction.bid(sender=bidder1, value=10**18)
    
    # 尝试更低的出价
    with pytest.raises(Exception):
        auction.bid(sender=bidder2, value=5 * 10**17)  # 0.5 ETH

def test_withdraw(auction, bidder1, bidder2):
    """测试：提取退款"""
    # bidder1出价1 ETH
    bid1 = 10**18
    auction.bid(sender=bidder1, value=bid1)
    
    # bidder2出价2 ETH（更高）
    bid2 = 2 * 10**18
    auction.bid(sender=bidder2, value=bid2)
    
    # bidder1应该能提取1 ETH
    balance_before = bidder1.balance
    auction.withdraw(sender=bidder1)
    balance_after = bidder1.balance
    
    assert balance_after - balance_before == bid1
    assert auction.getPendingReturn(bidder1.address) == 0

def test_multiple_bids(auction, bidder1, bidder2, bidder3):
    """测试：多次出价"""
    # bidder1: 1 ETH
    auction.bid(sender=bidder1, value=10**18)
    assert auction.highestBid() == 10**18
    
    # bidder2: 2 ETH
    auction.bid(sender=bidder2, value=2 * 10**18)
    assert auction.highestBid() == 2 * 10**18
    
    # bidder3: 3 ETH
    auction.bid(sender=bidder3, value=3 * 10**18)
    assert auction.highestBid() == 3 * 10**18
    
    # bidder1再次出价: 4 ETH
    auction.bid(sender=bidder1, value=4 * 10**18)
    assert auction.highestBid() == 4 * 10**18
    assert auction.highestBidder() == bidder1.address
    
    # 检查待退款
    # bidder2应该有2 ETH待退款
    assert auction.getPendingReturn(bidder2.address) == 2 * 10**18
    # bidder3应该有3 ETH待退款
    assert auction.getPendingReturn(bidder3.address) == 3 * 10**18

def test_end_auction_before_time_fails(auction):
    """测试：时间未到不能结束拍卖"""
    with pytest.raises(Exception):
        auction.endAuction(sender=accounts.test_accounts[0])

def test_end_auction_success(beneficiary, bidder1):
    """测试：成功结束拍卖"""
    # 部署一个很短时间的拍卖（1秒）
    start_time = int(datetime.now().timestamp())
    duration = 1
    auction = beneficiary.deploy(project.Auction, beneficiary.address, start_time, duration)
    
    # 出价
    bid_amount = 10**18
    auction.bid(sender=bidder1, value=bid_amount)
    
    # 等待拍卖结束（在测试环境中可以直接调用，因为时间很短）
    import time
    time.sleep(2)
    
    # 结束拍卖
    beneficiary_balance_before = beneficiary.balance
    auction.endAuction(sender=accounts.test_accounts[0])
    beneficiary_balance_after = beneficiary.balance
    
    # 验证
    assert auction.ended() == True
    # 受益人应该收到出价金额（注意：部署时会花费gas）
    # 所以这里只检查是否增加了
    assert beneficiary_balance_after > beneficiary_balance_before

def test_cannot_bid_after_auction_ends(beneficiary, bidder1):
    """测试：拍卖结束后不能出价"""
    # 部署短时间拍卖
    start_time = int(datetime.now().timestamp())
    duration = 1
    auction = beneficiary.deploy(project.Auction, beneficiary.address, start_time, duration)
    
    # 等待结束
    import time
    time.sleep(2)
    
    # 结束拍卖
    auction.endAuction(sender=beneficiary)
    
    # 尝试出价应该失败
    with pytest.raises(Exception):
        auction.bid(sender=bidder1, value=10**18)

def test_get_auction_info(auction, bidder1):
    """测试：获取拍卖信息"""
    # 出价
    auction.bid(sender=bidder1, value=10**18)
    
    # 获取信息
    beneficiary, start, end, highest_bidder, highest_bid, ended = auction.getAuctionInfo()
    
    assert highest_bidder == bidder1.address
    assert highest_bid == 10**18
    assert ended == False

def test_is_active(auction):
    """测试：检查拍卖是否活跃"""
    assert auction.isActive() == True

def test_time_left(auction):
    """测试：获取剩余时间"""
    time_left = auction.timeLeft()
    assert time_left > 0
    assert time_left <= 3600  # 应该小于等于1小时

def test_no_bids_auction(beneficiary):
    """测试：无人出价的拍卖"""
    start_time = int(datetime.now().timestamp())
    duration = 1
    auction = beneficiary.deploy(project.Auction, beneficiary.address, start_time, duration)
    
    # 等待结束
    import time
    time.sleep(2)
    
    # 结束拍卖（即使无人出价也应该成功）
    auction.endAuction(sender=beneficiary)
    
    assert auction.ended() == True
    assert auction.highestBid() == 0

