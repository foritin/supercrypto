#pragma version ^0.3.10

"""
@title Open Auction
@notice 公开拍卖合约
@dev 拍卖物品，最高出价者获胜
"""

# 拍卖参数
beneficiary: public(address)  # 受益人地址（拍卖发起者）
auctionStart: public(uint256)  # 拍卖开始时间
auctionEnd: public(uint256)    # 拍卖结束时间

# 当前拍卖状态
highestBidder: public(address)  # 最高出价者
highestBid: public(uint256)     # 最高出价

# 拍卖结束标志
ended: public(bool)

# 记录待退款的出价，使用提现模式避免重入攻击
pendingReturns: public(HashMap[address, uint256])

event BidPlaced:
    bidder: indexed(address)
    amount: uint256

event Withdrawal:
    bidder: indexed(address)
    amount: uint256

event AuctionEnded:
    winner: indexed(address)
    amount: uint256

@external
def __init__(_beneficiary: address, _auction_start: uint256, _bidding_time: uint256):
    """
    @notice 创建拍卖
    @param _beneficiary 受益人地址
    @param _auction_start 拍卖开始时间（Unix时间戳）
    @param _bidding_time 拍卖持续时间（秒）
    """
    self.beneficiary = _beneficiary
    self.auctionStart = _auction_start
    self.auctionEnd = self.auctionStart + _bidding_time
    assert block.timestamp < self.auctionEnd, "Auction end time should be in the future"

@external
@payable
def bid():
    """
    @notice 出价
    @dev 发送ETH来出价，必须高于当前最高价
    """
    # 检查拍卖是否已开始
    assert block.timestamp >= self.auctionStart, "Auction not started yet"
    # 检查拍卖是否已结束
    assert block.timestamp < self.auctionEnd, "Auction already ended"
    # 检查出价是否足够高
    assert msg.value > self.highestBid, "Bid not high enough"
    
    # 记录前一个最高出价者的退款
    if self.highestBidder != empty(address):
        self.pendingReturns[self.highestBidder] += self.highestBid
    
    # 更新最高出价
    self.highestBidder = msg.sender
    self.highestBid = msg.value
    
    log BidPlaced(msg.sender, msg.value)

@external
def withdraw():
    """
    @notice 提取退款
    @dev 未中标的出价者可以提取自己的出价
    """
    pending_amount: uint256 = self.pendingReturns[msg.sender]
    assert pending_amount > 0, "No funds to withdraw"
    
    # 先清零再转账（防止重入攻击）
    self.pendingReturns[msg.sender] = 0
    send(msg.sender, pending_amount)
    
    log Withdrawal(msg.sender, pending_amount)

@external
def endAuction():
    """
    @notice 结束拍卖
    @dev 任何人都可以调用，但只有在拍卖结束时间后才能生效
    """
    # 1. 检查条件
    assert block.timestamp >= self.auctionEnd, "Auction not yet ended"
    assert not self.ended, "Auction already ended"
    
    # 2. 更新状态
    self.ended = True
    
    # 3. 转账给受益人
    if self.highestBid > 0:
        send(self.beneficiary, self.highestBid)
    
    log AuctionEnded(self.highestBidder, self.highestBid)

@view
@external
def getAuctionInfo() -> (address, uint256, uint256, address, uint256, bool):
    """
    @notice 获取拍卖信息
    @return 受益人, 开始时间, 结束时间, 最高出价者, 最高出价, 是否结束
    """
    return (
        self.beneficiary,
        self.auctionStart,
        self.auctionEnd,
        self.highestBidder,
        self.highestBid,
        self.ended
    )

@view
@external
def getPendingReturn(bidder: address) -> uint256:
    """
    @notice 查询待退款金额
    @param bidder 出价者地址
    @return 待退款金额
    """
    return self.pendingReturns[bidder]

@view
@external
def isActive() -> bool:
    """
    @notice 检查拍卖是否正在进行
    @return 是否活跃
    """
    return (
        block.timestamp >= self.auctionStart and
        block.timestamp < self.auctionEnd and
        not self.ended
    )

@view
@external
def timeLeft() -> uint256:
    """
    @notice 获取剩余时间
    @return 剩余秒数（如果已结束则返回0）
    """
    if block.timestamp >= self.auctionEnd:
        return 0
    return self.auctionEnd - block.timestamp

