# @version ^0.4.0
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

# 合约迁移接口
interface ILiquidityMiningMigration:
    def owner() -> address: view
    def lpToken() -> address: view
    def platformToken() -> address: view
    def kycManager() -> address: view
    def requireKYC() -> bool: view
    def paused() -> bool: view
    def totalLPStaked() -> uint256: view
    def dailyEmission() -> uint256: view
    def getLPStake(_user: address, _stakeId: uint256) -> LPStakeInfo: view
    def getLPStakeCount(_user: address) -> uint256: view
    def getUserList() -> DynArray[address, 1000]: view
    def receiveMigration(oldContract: address): nonpayable
    def isMigrated() -> bool: view

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

# 迁移事件
event Migrated:
    oldContract: indexed(address)
    newContract: indexed(address)
    timestamp: uint256

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

# 合约迁移状态
migrated: public(bool)  # 迁移标志

# 为迁移添加的用户列表（追踪所有有LP质押记录的用户）
userList: public(DynArray[address, 1000])

# 奖励参数
dailyEmission: public(uint256)     # 每日固定释放量（18位精度）

# 常量
SECONDS_PER_DAY: constant(uint256) = 24 * 3600


@deploy
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
def setPlatformToken(_newPlatformToken: address):
    """
    @notice 更新平台代币地址
    @param _newPlatformToken 新平台代币地址
    """
    assert msg.sender == self.owner, "Only owner"
    assert _newPlatformToken != empty(address), "Invalid address"
    self.platformToken = _newPlatformToken


@external
def stakeLPToken(_amount: uint256):
    """
    @notice 质押LP Token（STO合规版本）
    @param _amount 质押数量
    """
    assert not self.migrated, "Contract migrated, use new contract"
    assert not self.paused, "Contract paused"
    assert _amount > 0, "Amount must be positive"
    
    # STO合规：KYC验证（如果启用）
    if self.requireKYC:
        assert staticcall IKYCManager(self.kycManager).isVerified(msg.sender), "KYC verification required"
    
    # 转入LP Token
    assert extcall IERC20(self.lpToken).transferFrom(msg.sender, self, _amount), "Transfer failed"
    
    # 创建质押记录
    stakeId: uint256 = self.lpStakeCount[msg.sender]
    
    self.lpStakes[msg.sender][stakeId] = LPStakeInfo(
        amount=_amount,
        stakeTime=block.timestamp,
        lastRewardTime=block.timestamp,
        unstaked=False
    )
    
    self.lpStakeCount[msg.sender] += 1
    self.totalLPStaked += _amount

    # 维护迁移用户列表（仅当这是用户的第一次质押时）
    if stakeId == 0:
        self.userList.append(msg.sender)

    log LPStake(msg.sender, _amount)


@external
def unstakeLPToken(_stakeId: uint256):
    """
    @notice 解除LP Token质押（STO合规版本）
    @param _stakeId 质押ID
    """
    assert not self.migrated, "Contract migrated, use new contract"
    assert not self.paused, "Contract paused"
    assert _stakeId < self.lpStakeCount[msg.sender], "Invalid stake ID"
    
    # STO合规：KYC验证（如果启用）
    if self.requireKYC:
        assert staticcall IKYCManager(self.kycManager).isVerified(msg.sender), "KYC verification required"
    
    stakeInfo: LPStakeInfo = self.lpStakes[msg.sender][_stakeId]
    assert not stakeInfo.unstaked, "Already unstaked"
    
    # 自动领取奖励
    self._claimLPReward(msg.sender, _stakeId)
    
    # 返还LP Token
    assert extcall IERC20(self.lpToken).transfer(msg.sender, stakeInfo.amount), "Transfer failed"
    
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
    assert not self.migrated, "Contract migrated, use new contract"
    assert not self.paused, "Contract paused"
    
    # STO合规：KYC验证（如果启用）
    if self.requireKYC:
        assert staticcall IKYCManager(self.kycManager).isVerified(msg.sender), "KYC verification required"
    
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
        extcall IPlatformToken(self.platformToken).mint(_user, reward)
        
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
    
    reward: uint256 = self.dailyEmission * timeDiff * stakeInfo.amount // SECONDS_PER_DAY // self.totalLPStaked
    
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


# ==================== 依赖查询功能 ====================

@external
@view
def getDependencies() -> address[3]:
    """
    @notice 获取合约依赖地址
    @return [lpToken, platformToken, kycManager] 依赖合约地址数组
    @dev LiquidityMining 依赖 LP Token、PlatformToken 和 KYCManager
    """
    return [self.lpToken, self.platformToken, self.kycManager]


@external
@view
def checkDependenciesBound() -> bool:
    """
    @notice 检查依赖是否已绑定
    @return True 如果所有依赖已配置（非零地址）
    @dev 所有依赖（LPToken、PlatformToken、KYCManager）必须已配置
    """
    return (
        self.lpToken != empty(address) and
        self.platformToken != empty(address) and
        self.kycManager != empty(address)
    )


# ==================== 合约迁移功能 ====================

@external
def migrate(newContract: address):
    """
    @notice 迁移所有状态到新合约
    @param newContract 新合约地址（必须实现 receiveMigration 接口）
    @dev 迁移后设置 migrated 标志，不自动暂停
    """
    assert msg.sender == self.owner, "Only owner"
    assert not self.migrated, "Already migrated"
    assert newContract != empty(address), "Invalid address"

    # CRITICAL FIX: 先设置迁移标志，防止重入攻击
    self.migrated = True

    # 调用新合约的接收函数，传入 self（旧合约地址）
    extcall ILiquidityMiningMigration(newContract).receiveMigration(self)

    log Migrated(self, newContract, block.timestamp)


@external
@view
def isMigrated() -> bool:
    """
    @notice 检查合约是否已迁移
    @return True 如果已迁移到新合约
    """
    return self.migrated


@external
def receiveMigration(oldContract: address):
    """
    @notice 从旧合约接收迁移状态
    @param oldContract 旧合约地址
    @dev 只有旧合约可以调用此函数
    """
    assert msg.sender == oldContract, "Only old contract"

    old: ILiquidityMiningMigration = ILiquidityMiningMigration(oldContract)

    # 迁移基本状态变量
    self.owner = staticcall old.owner()
    self.lpToken = staticcall old.lpToken()
    self.platformToken = staticcall old.platformToken()
    self.kycManager = staticcall old.kycManager()
    self.requireKYC = staticcall old.requireKYC()
    self.paused = staticcall old.paused()
    self.totalLPStaked = staticcall old.totalLPStaked()
    self.dailyEmission = staticcall old.dailyEmission()

    # 迁移用户LP质押记录
    users: DynArray[address, 1000] = staticcall old.getUserList()
    for user: address in users:
        count: uint256 = staticcall old.getLPStakeCount(user)
        self.lpStakeCount[user] = count

        # 迁移每个用户的LP质押记录
        # 注意：使用足够大的范围（10000）以确保覆盖所有记录
        for i: uint256 in range(10000):
            if i >= count:
                break
            stake: LPStakeInfo = staticcall old.getLPStake(user, i)
            self.lpStakes[user][i] = stake

        # 添加到用户列表
        self.userList.append(user)


@external
@view
def getLPStakeCount(_user: address) -> uint256:
    """
    @notice 获取用户LP质押数量（用于迁移）
    @param _user 用户地址
    @return LP质押数量
    """
    return self.lpStakeCount[_user]


@external
@view
def getUserList() -> DynArray[address, 1000]:
    """
    @notice 获取用户列表（用于迁移）
    @return 用户地址动态数组
    """
    return self.userList

