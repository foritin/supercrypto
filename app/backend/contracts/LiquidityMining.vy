# @version 0.3.10
"""
@title Liquidity Mining Contract (STO Compliant)
@notice 流动性挖矿合约 - STO合规版本
@dev 质押Uniswap LP Token获得平台代币奖励
     添加KYC验证（可选，默认关闭）
"""

# 接口定义
interface IERC20:
    def transfer(_to: address, _amount: uint256) -> bool: nonpayable
    def transferFrom(_from: address, _to: address, _amount: uint256) -> bool: nonpayable
    def balanceOf(_account: address) -> uint256: view

interface IPlatformToken:
    def mint(_to: address, _amount: uint256): nonpayable

interface IKYCManager:
    def isVerified(_investor: address) -> bool: view

# 流动性挖矿信息
struct LPStakeInfo:
    amount: uint256           # LP Token质押数量
    stakeTime: uint256        # 质押时间
    lastRewardTime: uint256   # 上次领取奖励时间
    unstaked: bool            # 是否已解除质押

# 事件
event LPStake:
    user: indexed(address)
    amount: uint256

event LPUnstake:
    user: indexed(address)
    stakeId: uint256
    amount: uint256

event LPClaimReward:
    user: indexed(address)
    reward: uint256

event DailyEmissionUpdated:
    oldEmission: uint256
    newEmission: uint256

# 状态变量
owner: public(address)
lpToken: public(address)           # LP Token地址
platformToken: public(address)     # 平台代币地址
kycManager: public(address)        # KYC管理合约地址
requireKYC: public(bool)           # 是否要求KYC（默认关闭）
paused: public(bool)

# LP质押数据
lpStakes: public(HashMap[address, HashMap[uint256, LPStakeInfo]])
lpStakeCount: public(HashMap[address, uint256])
totalLPStaked: public(uint256)

# 奖励参数
dailyEmission: public(uint256)     # 每日固定释放量（18位精度）

# 常量
SECONDS_PER_DAY: constant(uint256) = 24 * 3600


@external
def __init__(_lpToken: address, _platformToken: address, _kycManager: address):
    """
    @notice 初始化流动性挖矿合约（STO合规版本）
    @param _lpToken LP Token地址
    @param _platformToken 平台代币地址
    @param _kycManager KYC管理合约地址
    """
    self.owner = msg.sender
    self.lpToken = _lpToken
    self.platformToken = _platformToken
    self.kycManager = _kycManager
    self.requireKYC = False  # 默认不要求KYC（流动性挖矿可选）
    self.paused = False
    
    # 默认每日释放5000个平台代币
    self.dailyEmission = 5_000 * 10 ** 18


@external
def setPaused(_paused: bool):
    """
    @notice 设置暂停状态
    @param _paused 是否暂停
    """
    assert msg.sender == self.owner, "Only owner"
    self.paused = _paused


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
def setRequireKYC(_require: bool):
    """
    @notice 设置是否要求KYC
    @param _require 是否要求
    """
    assert msg.sender == self.owner, "Only owner"
    self.requireKYC = _require


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
def stakeLPToken(_amount: uint256):
    """
    @notice 质押LP Token（STO合规版本）
    @param _amount 质押数量
    """
    assert not self.paused, "Contract paused"
    assert _amount > 0, "Amount must be positive"
    
    # STO合规：KYC验证（如果启用）
    if self.requireKYC:
        assert IKYCManager(self.kycManager).isVerified(msg.sender), "KYC verification required"
    
    # 转入LP Token
    assert IERC20(self.lpToken).transferFrom(msg.sender, self, _amount), "Transfer failed"
    
    # 创建质押记录
    stakeId: uint256 = self.lpStakeCount[msg.sender]
    
    self.lpStakes[msg.sender][stakeId] = LPStakeInfo({
        amount: _amount,
        stakeTime: block.timestamp,
        lastRewardTime: block.timestamp,
        unstaked: False
    })
    
    self.lpStakeCount[msg.sender] += 1
    self.totalLPStaked += _amount
    
    log LPStake(msg.sender, _amount)


@external
def unstakeLPToken(_stakeId: uint256):
    """
    @notice 解除LP Token质押（STO合规版本）
    @param _stakeId 质押ID
    """
    assert not self.paused, "Contract paused"
    assert _stakeId < self.lpStakeCount[msg.sender], "Invalid stake ID"
    
    # STO合规：KYC验证（如果启用）
    if self.requireKYC:
        assert IKYCManager(self.kycManager).isVerified(msg.sender), "KYC verification required"
    
    stakeInfo: LPStakeInfo = self.lpStakes[msg.sender][_stakeId]
    assert not stakeInfo.unstaked, "Already unstaked"
    
    # 自动领取奖励
    self._claimLPReward(msg.sender, _stakeId)
    
    # 返还LP Token
    assert IERC20(self.lpToken).transfer(msg.sender, stakeInfo.amount), "Transfer failed"
    
    # 标记为已解除质押
    self.lpStakes[msg.sender][_stakeId].unstaked = True
    self.totalLPStaked -= stakeInfo.amount
    
    log LPUnstake(msg.sender, _stakeId, stakeInfo.amount)


@external
def claimLPReward(_stakeId: uint256):
    """
    @notice 领取LP挖矿奖励（STO合规版本）
    @param _stakeId 质押ID
    """
    assert not self.paused, "Contract paused"
    
    # STO合规：KYC验证（如果启用）
    if self.requireKYC:
        assert IKYCManager(self.kycManager).isVerified(msg.sender), "KYC verification required"
    
    self._claimLPReward(msg.sender, _stakeId)


@internal
def _claimLPReward(_user: address, _stakeId: uint256):
    """
    @notice 内部领取LP奖励函数
    @param _user 用户地址
    @param _stakeId 质押ID
    """
    assert _stakeId < self.lpStakeCount[_user], "Invalid stake ID"
    
    stakeInfo: LPStakeInfo = self.lpStakes[_user][_stakeId]
    assert not stakeInfo.unstaked, "Already unstaked"
    
    # 计算待领取奖励
    reward: uint256 = self._calculateLPReward(_user, _stakeId)
    
    if reward > 0:
        # 铸造平台代币作为奖励
        IPlatformToken(self.platformToken).mint(_user, reward)
        
        # 更新上次领取时间
        self.lpStakes[_user][_stakeId].lastRewardTime = block.timestamp
        
        log LPClaimReward(_user, reward)


@view
@internal
def _calculateLPReward(_user: address, _stakeId: uint256) -> uint256:
    """
    @notice 计算LP挖矿奖励
    @param _user 用户地址
    @param _stakeId 质押ID
    @return 奖励数量
    """
    stakeInfo: LPStakeInfo = self.lpStakes[_user][_stakeId]
    
    if stakeInfo.unstaked:
        return 0
    
    timeDiff: uint256 = block.timestamp - stakeInfo.lastRewardTime
    if timeDiff == 0:
        return 0
    
    # 按质押占比分配每日释放奖励
    if self.totalLPStaked == 0:
        return 0
    
    reward: uint256 = self.dailyEmission * timeDiff * stakeInfo.amount / SECONDS_PER_DAY / self.totalLPStaked
    
    return reward


@view
@external
def calculateLPReward(_user: address, _stakeId: uint256) -> uint256:
    """
    @notice 计算LP挖矿奖励（外部调用）
    @param _user 用户地址
    @param _stakeId 质押ID
    @return 奖励数量
    """
    return self._calculateLPReward(_user, _stakeId)


@view
@external
def getLPStake(_user: address, _stakeId: uint256) -> LPStakeInfo:
    """
    @notice 获取LP质押信息
    @param _user 用户地址
    @param _stakeId 质押ID
    @return LP质押信息
    """
    return self.lpStakes[_user][_stakeId]


@external
def setLPToken(_lpToken: address):
    """
    @notice 设置LP Token地址
    @param _lpToken LP Token地址
    """
    assert msg.sender == self.owner, "Only owner"
    assert _lpToken != empty(address), "Invalid address"
    self.lpToken = _lpToken


@external
def transferOwnership(_newOwner: address):
    """
    @notice 转移所有权
    @param _newOwner 新所有者地址
    """
    assert msg.sender == self.owner, "Only owner"
    assert _newOwner != empty(address), "Invalid address"
    self.owner = _newOwner

