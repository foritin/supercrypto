# @version 0.3.10
"""
@title Subscription Contract (STO Compliant)
@notice 权益代币认购和赎回合约 - 符合证券法合规要求
@dev 使用USDT购买权益代币，支持4种锁定期，动态年化收益率
     添加KYC验证、投资者限制等STO合规功能
"""

# 接口定义
interface IERC20:
    def transfer(_to: address, _amount: uint256) -> bool: nonpayable
    def transferFrom(_from: address, _to: address, _amount: uint256) -> bool: nonpayable
    def balanceOf(_account: address) -> uint256: view

interface IRWAToken:
    def mint(_to: address, _amount: uint256): nonpayable
    def burn(_from: address, _amount: uint256): nonpayable

interface IKYCManager:
    def isVerified(_investor: address) -> bool: view
    def isAccredited(_investor: address) -> bool: view
    def canInvest(_investor: address, _amount: uint256) -> bool: view

# 事件
event Subscribe:
    user: indexed(address)
    amount: uint256
    lockPeriod: uint256
    redeemTime: uint256
    apy: uint256

event Redeem:
    user: indexed(address)
    principal: uint256
    interest: uint256
    total: uint256

event APYUpdated:
    lockPeriod: uint256
    oldAPY: uint256
    newAPY: uint256

event EmergencyWithdraw:
    token: indexed(address)
    amount: uint256

# 认购记录
struct SubscriptionInfo:
    principal: uint256       # 本金（USDT数量）
    lockPeriod: uint256      # 锁定期（秒）
    subscribeTime: uint256   # 认购时间
    redeemTime: uint256      # 可赎回时间
    apy: uint256             # 年化收益率（基点，10000 = 100%）
    redeemed: bool           # 是否已赎回

# 状态变量
owner: public(address)
usdt: public(address)        # USDT代币地址
rwaToken: public(address)    # RWA STO代币地址
kycManager: public(address)  # KYC管理合约地址
paused: public(bool)         # 暂停标志

# STO 合规参数
minInvestment: public(uint256)      # 最小投资额
maxInvestment: public(uint256)      # 最大投资额（单次）
requireAccredited: public(bool)     # 是否要求合格投资者

# 锁定期APY映射（秒 => 基点）
lockPeriodAPY: public(HashMap[uint256, uint256])

# 用户认购记录（用户 => 认购ID => 认购信息）
subscriptions: public(HashMap[address, HashMap[uint256, SubscriptionInfo]])
subscriptionCount: public(HashMap[address, uint256])

# 常量 - 锁定期（秒）
LOCK_1_MONTH: constant(uint256) = 30 * 24 * 3600       # 30天
LOCK_3_MONTHS: constant(uint256) = 90 * 24 * 3600      # 90天
LOCK_6_MONTHS: constant(uint256) = 180 * 24 * 3600     # 180天
LOCK_12_MONTHS: constant(uint256) = 360 * 24 * 3600    # 360天

# 基点常量
BASIS_POINTS: constant(uint256) = 10000  # 100% = 10000基点
SECONDS_PER_YEAR: constant(uint256) = 365 * 24 * 3600


@external
def __init__(_usdt: address, _rwaToken: address, _kycManager: address):
    """
    @notice 初始化认购合约（STO版本）
    @param _usdt USDT代币地址
    @param _rwaToken RWA STO代币地址
    @param _kycManager KYC管理合约地址
    """
    self.owner = msg.sender
    self.usdt = _usdt
    self.rwaToken = _rwaToken
    self.kycManager = _kycManager
    self.paused = False
    
    # STO 合规默认参数
    self.minInvestment = 1000 * 10**6      # 最小投资 $1,000（符合Reg D要求）
    self.maxInvestment = 0                 # 0表示无上限
    self.requireAccredited = False         # 默认不强制要求合格投资者
    
    # 设置默认APY（基点）
    self.lockPeriodAPY[LOCK_1_MONTH] = 800      # 8%
    self.lockPeriodAPY[LOCK_3_MONTHS] = 1000    # 10%
    self.lockPeriodAPY[LOCK_6_MONTHS] = 1200    # 12%
    self.lockPeriodAPY[LOCK_12_MONTHS] = 1500   # 15%


@external
def setPaused(_paused: bool):
    """
    @notice 设置暂停状态
    @param _paused 是否暂停
    """
    assert msg.sender == self.owner, "Only owner"
    self.paused = _paused


@external
def setAPY(_lockPeriod: uint256, _apy: uint256):
    """
    @notice 设置锁定期的年化收益率
    @param _lockPeriod 锁定期（秒）
    @param _apy 年化收益率（基点，10000 = 100%）
    """
    assert msg.sender == self.owner, "Only owner"
    assert _lockPeriod == LOCK_1_MONTH or _lockPeriod == LOCK_3_MONTHS or \
           _lockPeriod == LOCK_6_MONTHS or _lockPeriod == LOCK_12_MONTHS, "Invalid lock period"
    assert _apy <= 10000, "APY too high"  # 最高100%
    
    oldAPY: uint256 = self.lockPeriodAPY[_lockPeriod]
    self.lockPeriodAPY[_lockPeriod] = _apy
    
    log APYUpdated(_lockPeriod, oldAPY, _apy)


@external
def setMinInvestment(_min: uint256):
    """
    @notice 设置最小投资额（STO合规）
    @param _min 最小投资额（USDT，6位小数）
    """
    assert msg.sender == self.owner, "Only owner"
    self.minInvestment = _min


@external
def setMaxInvestment(_max: uint256):
    """
    @notice 设置最大投资额（STO合规）
    @param _max 最大投资额（USDT，0表示无上限）
    """
    assert msg.sender == self.owner, "Only owner"
    self.maxInvestment = _max


@external
def setRequireAccredited(_require: bool):
    """
    @notice 设置是否要求合格投资者（STO合规）
    @param _require 是否要求
    """
    assert msg.sender == self.owner, "Only owner"
    self.requireAccredited = _require


@external
def setKYCManager(_newManager: address):
    """
    @notice 更新KYC管理合约地址
    @param _newManager 新KYC管理合约地址
    """
    assert msg.sender == self.owner, "Only owner"
    assert _newManager != empty(address), "Invalid address"
    self.kycManager = _newManager


@external
def subscribe(_amount: uint256, _lockPeriod: uint256):
    """
    @notice 认购权益代币（STO合规版本）
    @param _amount USDT数量（6位小数）
    @param _lockPeriod 锁定期（秒）
    """
    assert not self.paused, "Contract paused"
    assert _amount > 0, "Amount must be positive"
    assert _lockPeriod == LOCK_1_MONTH or _lockPeriod == LOCK_3_MONTHS or \
           _lockPeriod == LOCK_6_MONTHS or _lockPeriod == LOCK_12_MONTHS, "Invalid lock period"
    
    # ========== STO 合规检查 ==========
    
    # 1. KYC验证（必须）
    assert IKYCManager(self.kycManager).isVerified(msg.sender), "KYC verification required"
    
    # 2. 合格投资者检查（如果要求）
    if self.requireAccredited:
        assert IKYCManager(self.kycManager).isAccredited(msg.sender), "Accredited investor required"
    
    # 3. 最小投资额检查
    assert _amount >= self.minInvestment, "Below minimum investment"
    
    # 4. 最大投资额检查
    if self.maxInvestment > 0:
        assert _amount <= self.maxInvestment, "Exceeds maximum investment"
    
    # 5. 投资能力检查
    assert IKYCManager(self.kycManager).canInvest(msg.sender, _amount), "Cannot invest"
    
    # ===================================
    
    # 获取当前APY
    apy: uint256 = self.lockPeriodAPY[_lockPeriod]
    
    # 从用户转入USDT
    assert IERC20(self.usdt).transferFrom(msg.sender, self, _amount), "Transfer failed"
    
    # 铸造等量RWA代币给用户（USDT 6位小数 -> RWA 18位小数）
    rwaAmount: uint256 = _amount * 10 ** 12  # 转换精度
    IRWAToken(self.rwaToken).mint(msg.sender, rwaAmount)
    
    # 记录认购信息
    subscriptionId: uint256 = self.subscriptionCount[msg.sender]
    redeemTime: uint256 = block.timestamp + _lockPeriod
    
    self.subscriptions[msg.sender][subscriptionId] = SubscriptionInfo({
        principal: _amount,
        lockPeriod: _lockPeriod,
        subscribeTime: block.timestamp,
        redeemTime: redeemTime,
        apy: apy,
        redeemed: False
    })
    
    self.subscriptionCount[msg.sender] += 1
    
    log Subscribe(msg.sender, _amount, _lockPeriod, redeemTime, apy)


@external
def redeem(_subscriptionId: uint256):
    """
    @notice 赎回权益代币（STO合规版本）
    @param _subscriptionId 认购ID
    """
    assert not self.paused, "Contract paused"
    assert _subscriptionId < self.subscriptionCount[msg.sender], "Invalid subscription ID"
    
    # STO合规：确保用户KYC仍然有效
    assert IKYCManager(self.kycManager).isVerified(msg.sender), "KYC verification required"
    
    subscription: SubscriptionInfo = self.subscriptions[msg.sender][_subscriptionId]
    assert not subscription.redeemed, "Already redeemed"
    assert block.timestamp >= subscription.redeemTime, "Lock period not ended"
    
    # 计算利息
    interest: uint256 = self._calculateInterest(
        subscription.principal,
        subscription.lockPeriod,
        subscription.apy
    )
    
    total: uint256 = subscription.principal + interest
    
    # 检查合约USDT余额
    assert IERC20(self.usdt).balanceOf(self) >= total, "Insufficient USDT balance"
    
    # 销毁RWA代币
    rwaAmount: uint256 = subscription.principal * 10 ** 12
    IRWAToken(self.rwaToken).burn(msg.sender, rwaAmount)
    
    # 转出USDT（本金+利息）
    assert IERC20(self.usdt).transfer(msg.sender, total), "Transfer failed"
    
    # 标记为已赎回
    self.subscriptions[msg.sender][_subscriptionId].redeemed = True
    
    log Redeem(msg.sender, subscription.principal, interest, total)


@view
@internal
def _calculateInterest(_principal: uint256, _lockPeriod: uint256, _apy: uint256) -> uint256:
    """
    @notice 计算利息
    @param _principal 本金
    @param _lockPeriod 锁定期（秒）
    @param _apy 年化收益率（基点）
    @return 利息
    """
    # 利息 = 本金 * APY * 锁定期 / 年秒数 / 基点
    return _principal * _apy * _lockPeriod / SECONDS_PER_YEAR / BASIS_POINTS


@view
@external
def calculateInterest(_principal: uint256, _lockPeriod: uint256, _apy: uint256) -> uint256:
    """
    @notice 计算利息（外部调用）
    @param _principal 本金
    @param _lockPeriod 锁定期（秒）
    @param _apy 年化收益率（基点）
    @return 利息
    """
    return self._calculateInterest(_principal, _lockPeriod, _apy)


@view
@external
def getSubscription(_user: address, _subscriptionId: uint256) -> SubscriptionInfo:
    """
    @notice 获取认购信息
    @param _user 用户地址
    @param _subscriptionId 认购ID
    @return 认购信息
    """
    return self.subscriptions[_user][_subscriptionId]


@view
@external
def getPendingReward(_user: address, _subscriptionId: uint256) -> uint256:
    """
    @notice 获取待赎回奖励
    @param _user 用户地址
    @param _subscriptionId 认购ID
    @return 利息
    """
    assert _subscriptionId < self.subscriptionCount[_user], "Invalid subscription ID"
    
    subscription: SubscriptionInfo = self.subscriptions[_user][_subscriptionId]
    if subscription.redeemed:
        return 0
    
    return self._calculateInterest(
        subscription.principal,
        subscription.lockPeriod,
        subscription.apy
    )


@external
def emergencyWithdraw(_token: address, _amount: uint256):
    """
    @notice 紧急提取代币（仅管理员）
    @param _token 代币地址
    @param _amount 提取数量
    """
    assert msg.sender == self.owner, "Only owner"
    assert IERC20(_token).transfer(self.owner, _amount), "Transfer failed"
    log EmergencyWithdraw(_token, _amount)


@external
def transferOwnership(_newOwner: address):
    """
    @notice 转移所有权
    @param _newOwner 新所有者地址
    """
    assert msg.sender == self.owner, "Only owner"
    assert _newOwner != empty(address), "Invalid address"
    self.owner = _newOwner


@view
@external
def getLockPeriods() -> uint256[4]:
    """
    @notice 获取所有锁定期
    @return 锁定期数组
    """
    return [LOCK_1_MONTH, LOCK_3_MONTHS, LOCK_6_MONTHS, LOCK_12_MONTHS]

