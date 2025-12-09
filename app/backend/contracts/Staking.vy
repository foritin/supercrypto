# @version 0.3.10
"""
@title Staking Contract (STO Compliant)
@notice 权益代币质押挖矿合约 - STO合规版本
@dev 质押RWA代币获得平台代币奖励，双重奖励机制：APY + 固定释放
     添加KYC验证确保仅合规投资者参与
"""

# 接口定义
interface IERC20:
    def transfer(_to: address, _amount: uint256) -> bool: nonpayable
    def transferFrom(_from: address, _to: address, _amount: uint256) -> bool: nonpayable
    def balanceOf(_account: address) -> uint256: view

interface IPlatformToken:
    def mint(_to: address, _amount: uint256): nonpayable

interface ISubscription:
    def subscriptions(_user: address, _id: uint256) -> SubscriptionInfo: view
    def subscriptionCount(_user: address) -> uint256: view

interface IKYCManager:
    def isVerified(_investor: address) -> bool: view

# 订阅信息结构（需要与Subscription.vy保持一致）
struct SubscriptionInfo:
    principal: uint256
    lockPeriod: uint256
    subscribeTime: uint256
    redeemTime: uint256
    apy: uint256
    redeemed: bool

# 质押信息
struct StakeInfo:
    amount: uint256              # 质押数量
    stakeTime: uint256           # 质押时间
    lastRewardTime: uint256      # 上次领取奖励时间
    subscriptionId: uint256      # 关联的认购ID
    originalRedeemTime: uint256  # 原始赎回时间
    stakeDuration: uint256       # 质押时长（用于顺延赎回期）
    unstaked: bool               # 是否已解除质押

# 事件
event Stake:
    user: indexed(address)
    amount: uint256
    subscriptionId: uint256
    newRedeemTime: uint256

event Unstake:
    user: indexed(address)
    stakeId: uint256
    amount: uint256

event ClaimReward:
    user: indexed(address)
    reward: uint256

event DailyEmissionUpdated:
    oldEmission: uint256
    newEmission: uint256

# 状态变量
owner: public(address)
rwaToken: public(address)           # RWA代币地址
platformToken: public(address)      # 平台代币地址
subscription: public(address)       # 认购合约地址
kycManager: public(address)         # KYC管理合约地址
paused: public(bool)

# 质押数据
stakes: public(HashMap[address, HashMap[uint256, StakeInfo]])
stakeCount: public(HashMap[address, uint256])
totalStaked: public(uint256)

# 奖励参数
stakingAPY: public(uint256)         # 质押APY（基点，10000 = 100%）
dailyEmission: public(uint256)      # 每日固定释放量（18位精度）

# 常量
BASIS_POINTS: constant(uint256) = 10000
SECONDS_PER_YEAR: constant(uint256) = 365 * 24 * 3600
SECONDS_PER_DAY: constant(uint256) = 24 * 3600


@external
def __init__(_rwaToken: address, _platformToken: address, _subscription: address, _kycManager: address):
    """
    @notice 初始化质押合约（STO合规版本）
    @param _rwaToken RWA代币地址
    @param _platformToken 平台代币地址
    @param _subscription 认购合约地址
    @param _kycManager KYC管理合约地址
    """
    self.owner = msg.sender
    self.rwaToken = _rwaToken
    self.platformToken = _platformToken
    self.subscription = _subscription
    self.kycManager = _kycManager
    self.paused = False
    
    # 默认参数
    self.stakingAPY = 3000  # 30% APY
    self.dailyEmission = 10_000 * 10 ** 18  # 每日释放10000个平台代币


@external
def setPaused(_paused: bool):
    """
    @notice 设置暂停状态
    @param _paused 是否暂停
    """
    assert msg.sender == self.owner, "Only owner"
    self.paused = _paused


@external
def setStakingAPY(_apy: uint256):
    """
    @notice 设置质押APY
    @param _apy APY（基点）
    """
    assert msg.sender == self.owner, "Only owner"
    assert _apy <= 10000, "APY too high"
    self.stakingAPY = _apy


@external
def setDailyEmission(_emission: uint256):
    """
    @notice 设置每日释放量
    @param _emission 每日释放量
    """
    assert msg.sender == self.owner, "Only owner"
    oldEmission: uint256 = self.dailyEmission
    self.dailyEmission = _emission
    log DailyEmissionUpdated(oldEmission, _emission)


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
def stake(_amount: uint256, _subscriptionId: uint256):
    """
    @notice 质押RWA代币（STO合规版本）
    @param _amount 质押数量
    @param _subscriptionId 关联的认购ID
    """
    assert not self.paused, "Contract paused"
    assert _amount > 0, "Amount must be positive"
    
    # STO合规：KYC验证
    assert IKYCManager(self.kycManager).isVerified(msg.sender), "KYC verification required"
    
    # 验证认购信息
    subCount: uint256 = ISubscription(self.subscription).subscriptionCount(msg.sender)
    assert _subscriptionId < subCount, "Invalid subscription ID"
    
    subInfo: SubscriptionInfo = ISubscription(self.subscription).subscriptions(msg.sender, _subscriptionId)
    assert not subInfo.redeemed, "Subscription already redeemed"
    assert block.timestamp < subInfo.redeemTime, "Redeem period ended"
    
    # 转入RWA代币
    assert IERC20(self.rwaToken).transferFrom(msg.sender, self, _amount), "Transfer failed"
    
    # 创建质押记录
    stakeId: uint256 = self.stakeCount[msg.sender]
    
    self.stakes[msg.sender][stakeId] = StakeInfo({
        amount: _amount,
        stakeTime: block.timestamp,
        lastRewardTime: block.timestamp,
        subscriptionId: _subscriptionId,
        originalRedeemTime: subInfo.redeemTime,
        stakeDuration: 0,
        unstaked: False
    })
    
    self.stakeCount[msg.sender] += 1
    self.totalStaked += _amount
    
    log Stake(msg.sender, _amount, _subscriptionId, subInfo.redeemTime)


@external
def unstake(_stakeId: uint256):
    """
    @notice 解除质押（STO合规版本）
    @param _stakeId 质押ID
    """
    assert not self.paused, "Contract paused"
    assert _stakeId < self.stakeCount[msg.sender], "Invalid stake ID"
    
    # STO合规：KYC验证
    assert IKYCManager(self.kycManager).isVerified(msg.sender), "KYC verification required"
    
    stakeInfo: StakeInfo = self.stakes[msg.sender][_stakeId]
    assert not stakeInfo.unstaked, "Already unstaked"
    
    # 计算质押时长
    stakeDuration: uint256 = block.timestamp - stakeInfo.stakeTime
    
    # 更新质押时长（用于顺延赎回期）
    self.stakes[msg.sender][_stakeId].stakeDuration = stakeDuration
    
    # 自动领取奖励
    self._claimReward(msg.sender, _stakeId)
    
    # 返还RWA代币
    assert IERC20(self.rwaToken).transfer(msg.sender, stakeInfo.amount), "Transfer failed"
    
    # 标记为已解除质押
    self.stakes[msg.sender][_stakeId].unstaked = True
    self.totalStaked -= stakeInfo.amount
    
    log Unstake(msg.sender, _stakeId, stakeInfo.amount)


@external
def claimReward(_stakeId: uint256):
    """
    @notice 领取奖励（STO合规版本）
    @param _stakeId 质押ID
    """
    assert not self.paused, "Contract paused"
    
    # STO合规：KYC验证
    assert IKYCManager(self.kycManager).isVerified(msg.sender), "KYC verification required"
    
    self._claimReward(msg.sender, _stakeId)


@internal
def _claimReward(_user: address, _stakeId: uint256):
    """
    @notice 内部领取奖励函数
    @param _user 用户地址
    @param _stakeId 质押ID
    """
    assert _stakeId < self.stakeCount[_user], "Invalid stake ID"
    
    stakeInfo: StakeInfo = self.stakes[_user][_stakeId]
    assert not stakeInfo.unstaked, "Already unstaked"
    
    # 计算待领取奖励
    reward: uint256 = self._calculateReward(_user, _stakeId)
    
    if reward > 0:
        # 铸造平台代币作为奖励
        IPlatformToken(self.platformToken).mint(_user, reward)
        
        # 更新上次领取时间
        self.stakes[_user][_stakeId].lastRewardTime = block.timestamp
        
        log ClaimReward(_user, reward)


@view
@internal
def _calculateReward(_user: address, _stakeId: uint256) -> uint256:
    """
    @notice 计算奖励
    @param _user 用户地址
    @param _stakeId 质押ID
    @return 奖励数量
    """
    stakeInfo: StakeInfo = self.stakes[_user][_stakeId]
    
    if stakeInfo.unstaked:
        return 0
    
    timeDiff: uint256 = block.timestamp - stakeInfo.lastRewardTime
    if timeDiff == 0:
        return 0
    
    # 奖励1: APY奖励
    apyReward: uint256 = stakeInfo.amount * self.stakingAPY * timeDiff / SECONDS_PER_YEAR / BASIS_POINTS
    
    # 奖励2: 固定每日释放（按质押占比分配）
    dailyReward: uint256 = 0
    if self.totalStaked > 0:
        # 用户在这段时间内应得的固定释放奖励
        dailyReward = self.dailyEmission * timeDiff * stakeInfo.amount / SECONDS_PER_DAY / self.totalStaked
    
    return apyReward + dailyReward


@view
@external
def calculateReward(_user: address, _stakeId: uint256) -> uint256:
    """
    @notice 计算奖励（外部调用）
    @param _user 用户地址
    @param _stakeId 质押ID
    @return 奖励数量
    """
    return self._calculateReward(_user, _stakeId)


@view
@external
def getStake(_user: address, _stakeId: uint256) -> StakeInfo:
    """
    @notice 获取质押信息
    @param _user 用户地址
    @param _stakeId 质押ID
    @return 质押信息
    """
    return self.stakes[_user][_stakeId]


@view
@external
def getNewRedeemTime(_user: address, _stakeId: uint256) -> uint256:
    """
    @notice 获取顺延后的赎回时间
    @param _user 用户地址
    @param _stakeId 质押ID
    @return 新赎回时间
    """
    stakeInfo: StakeInfo = self.stakes[_user][_stakeId]
    
    if stakeInfo.unstaked:
        # 已解除质押，赎回时间 = 原始赎回时间 + 质押时长
        return stakeInfo.originalRedeemTime + stakeInfo.stakeDuration
    else:
        # 未解除质押，赎回时间 = 原始赎回时间 + 当前质押时长
        currentStakeDuration: uint256 = block.timestamp - stakeInfo.stakeTime
        return stakeInfo.originalRedeemTime + currentStakeDuration


@external
def transferOwnership(_newOwner: address):
    """
    @notice 转移所有权
    @param _newOwner 新所有者地址
    """
    assert msg.sender == self.owner, "Only owner"
    assert _newOwner != empty(address), "Invalid address"
    self.owner = _newOwner

