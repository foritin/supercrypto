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
interface IMigration:
    def owner() -> address: view
    def lp_token() -> address: view
    def platform_token() -> address: view
    def kyc_manager() -> address: view
    def require_kyc() -> bool: view
    def paused() -> bool: view
    def total_lp_staked() -> uint256: view
    def daily_emission() -> uint256: view
    def get_lp_stake(_user: address, _stakeId: uint256) -> LPStakeInfo: view
    def get_lp_stake_count(_user: address) -> uint256: view
    def get_user_list() -> DynArray[address, 1000]: view
    def receive_migration(oldContract: address): nonpayable
    def is_migrated() -> bool: view

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
lp_token: public(address)           # LP Token地址
platform_token: public(address)     # 平台代币地址
kyc_manager: public(address)        # KYC管理合约地址
require_kyc: public(bool)           # 是否要求KYC（默认关闭）
paused: public(bool)

# LP质押数据
lpStakes: public(HashMap[address, HashMap[uint256, LPStakeInfo]])
lpStakeCount: public(HashMap[address, uint256])
total_lp_staked: public(uint256)

# 合约迁移状态
migrated: public(bool)  # 迁移标志

# 为迁移添加的用户列表（追踪所有有LP质押记录的用户）
userList: public(DynArray[address, 1000])

# 奖励参数
daily_emission: public(uint256)     # 每日固定释放量（18位精度）

# 常量
SECONDS_PER_DAY: constant(uint256) = 24 * 3600


@deploy
def __init__(_lp_token: address, _platform_token: address, _kyc_manager: address):
    """
    @notice 初始化流动性挖矿合约（STO合规版本）
    @param _lp_token LP Token地址
    @param _platform_token 平台代币地址
    @param _kyc_manager KYC管理合约地址
    """
    self.owner = msg.sender
    self.lp_token = _lp_token
    self.platform_token = _platform_token
    self.kyc_manager = _kyc_manager
    self.require_kyc = False  # 默认不要求KYC（流动性挖矿可选）
    self.paused = False

    # 默认每日释放5000个平台代币
    self.daily_emission = 5_000 * 10 ** 18


@external
def pause():
    """
    @notice 暂停合约
    """
    assert msg.sender == self.owner, "Only owner"
    self.paused = True


@external
def unpause():
    """
    @notice 恢复合约
    """
    assert msg.sender == self.owner, "Only owner"
    self.paused = False


@external
def set_daily_emission(_emission: uint256):
    """
    @notice 设置每日释放量
    @param _emission 每日释放量
    """
    assert msg.sender == self.owner, "Only owner"
    old_emission: uint256 = self.daily_emission
    self.daily_emission = _emission
    log DailyEmissionUpdated(old_emission, _emission)


@external
def set_require_kyc(_require: bool):
    """
    @notice 设置是否要求KYC
    @param _require 是否要求
    """
    assert msg.sender == self.owner, "Only owner"
    self.require_kyc = _require


@external
def set_kyc_manager(_new_manager: address):
    """
    @notice 更新KYC管理合约地址
    @param _new_manager 新KYC管理合约地址
    """
    assert msg.sender == self.owner, "Only owner"
    assert _new_manager != empty(address), "Invalid address"
    self.kyc_manager = _new_manager


@external
def set_platform_token(_new_platform_token: address):
    """
    @notice 更新平台代币地址
    @param _new_platform_token 新平台代币地址
    """
    assert msg.sender == self.owner, "Only owner"
    assert _new_platform_token != empty(address), "Invalid address"
    self.platform_token = _new_platform_token


@external
def stake_lp_token(_amount: uint256):
    """
    @notice 质押LP Token（STO合规版本）
    @param _amount 质押数量
    """
    assert not self.migrated, "Contract migrated, use new contract"
    assert not self.paused, "Contract paused"
    assert _amount > 0, "Amount must be positive"

    # STO合规：KYC验证（如果启用）
    if self.require_kyc:
        assert staticcall IKYCManager(self.kyc_manager).isVerified(msg.sender), "KYC verification required"

    # 转入LP Token
    assert extcall IERC20(self.lp_token).transferFrom(msg.sender, self, _amount), "Transfer failed"

    # 创建质押记录
    stake_id: uint256 = self.lpStakeCount[msg.sender]

    self.lpStakes[msg.sender][stake_id] = LPStakeInfo(
        amount=_amount,
        stakeTime=block.timestamp,
        lastRewardTime=block.timestamp,
        unstaked=False
    )

    self.lpStakeCount[msg.sender] += 1
    self.total_lp_staked += _amount

    # 维护迁移用户列表（仅当这是用户的第一次质押时）
    if stake_id == 0:
        self.userList.append(msg.sender)

    log LPStake(msg.sender, _amount)


@external
def unstake_lp_token(_stake_id: uint256):
    """
    @notice 解除LP Token质押（STO合规版本）
    @param _stake_id 质押ID
    """
    assert not self.migrated, "Contract migrated, use new contract"
    assert not self.paused, "Contract paused"
    assert _stake_id < self.lpStakeCount[msg.sender], "Invalid stake ID"

    # STO合规：KYC验证（如果启用）
    if self.require_kyc:
        assert staticcall IKYCManager(self.kyc_manager).isVerified(msg.sender), "KYC verification required"

    stake_info: LPStakeInfo = self.lpStakes[msg.sender][_stake_id]
    assert not stake_info.unstaked, "Already unstaked"

    # 自动领取奖励
    self._claim_lp_reward(msg.sender, _stake_id)

    # 返还LP Token
    assert extcall IERC20(self.lp_token).transfer(msg.sender, stake_info.amount), "Transfer failed"

    # 标记为已解除质押
    self.lpStakes[msg.sender][_stake_id].unstaked = True
    self.total_lp_staked -= stake_info.amount

    log LPUnstake(msg.sender, _stake_id, stake_info.amount)


@external
def claim_lp_reward(_stake_id: uint256):
    """
    @notice 领取LP挖矿奖励（STO合规版本）
    @param _stake_id 质押ID
    """
    assert not self.migrated, "Contract migrated, use new contract"
    assert not self.paused, "Contract paused"

    # STO合规：KYC验证（如果启用）
    if self.require_kyc:
        assert staticcall IKYCManager(self.kyc_manager).isVerified(msg.sender), "KYC verification required"

    self._claim_lp_reward(msg.sender, _stake_id)


@internal
def _claim_lp_reward(_user: address, _stake_id: uint256):
    """
    @notice 内部领取LP奖励函数
    @param _user 用户地址
    @param _stake_id 质押ID
    """
    assert _stake_id < self.lpStakeCount[_user], "Invalid stake ID"

    stake_info: LPStakeInfo = self.lpStakes[_user][_stake_id]
    assert not stake_info.unstaked, "Already unstaked"

    # 计算待领取奖励
    reward: uint256 = self._calculate_lp_reward(_user, _stake_id)

    if reward > 0:
        # 铸造平台代币作为奖励
        extcall IPlatformToken(self.platform_token).mint(_user, reward)

        # 更新上次领取时间
        self.lpStakes[_user][_stake_id].lastRewardTime = block.timestamp

        log LPClaimReward(_user, reward)


@view
@internal
def _calculate_lp_reward(_user: address, _stake_id: uint256) -> uint256:
    """
    @notice 计算LP挖矿奖励
    @param _user 用户地址
    @param _stake_id 质押ID
    @return 奖励数量
    """
    stake_info: LPStakeInfo = self.lpStakes[_user][_stake_id]

    if stake_info.unstaked:
        return 0

    time_diff: uint256 = block.timestamp - stake_info.lastRewardTime
    if time_diff == 0:
        return 0

    # 按质押占比分配每日释放奖励
    if self.total_lp_staked == 0:
        return 0

    reward: uint256 = self.daily_emission * time_diff * stake_info.amount // SECONDS_PER_DAY // self.total_lp_staked

    return reward


@view
@external
def calculate_lp_reward(_user: address, _stake_id: uint256) -> uint256:
    """
    @notice 计算LP挖矿奖励（外部调用）
    @param _user 用户地址
    @param _stake_id 质押ID
    @return 奖励数量
    """
    return self._calculate_lp_reward(_user, _stake_id)


@view
@external
def get_lp_stake(_user: address, _stake_id: uint256) -> LPStakeInfo:
    """
    @notice 获取LP质押信息
    @param _user 用户地址
    @param _stake_id 质押ID
    @return LP质押信息
    """
    return self.lpStakes[_user][_stake_id]


@external
def set_lp_token(_lp_token: address):
    """
    @notice 设置LP Token地址
    @param _lp_token LP Token地址
    """
    assert msg.sender == self.owner, "Only owner"
    assert _lp_token != empty(address), "Invalid address"
    self.lp_token = _lp_token


@external
def transfer_ownership(_new_owner: address):
    """
    @notice 转移所有权
    @param _new_owner 新所有者地址
    """
    assert msg.sender == self.owner, "Only owner"
    assert _new_owner != empty(address), "Invalid address"
    self.owner = _new_owner


# ==================== 依赖查询功能 ====================

@external
@view
def get_dependencies() -> (DynArray[String[50], 10], DynArray[String[50], 10]):
    """
    @notice 获取合约依赖（必须依赖 + 可选依赖）
    @return (required, optional) 必须依赖合约名称数组、可选依赖合约名称数组
    @dev 必须依赖: UniswapLP (LP Token接口), VankePlatformToken, DefaultKYCManager
    @dev 无可选依赖
    @dev UniswapLP可以是Mock LP Token或真实Uniswap LP Token
    """
    required: DynArray[String[50], 10] = []
    optional: DynArray[String[50], 10] = []

    # 检查必须依赖
    if self.lp_token == empty(address):
        required.append("UniswapLP")
    if self.platform_token == empty(address):
        required.append("VankePlatformToken")
    if self.kyc_manager == empty(address):
        required.append("DefaultKYCManager")

    return required, optional


# ==================== 合约迁移功能 ====================

@external
def migrate(new_contract: address):
    """
    @notice 迁移所有状态到新合约
    @param new_contract 新合约地址（必须实现 receive_migration 接口）
    @dev 迁移后设置 migrated 标志，不自动暂停
    """
    assert msg.sender == self.owner, "Only owner"
    assert not self.migrated, "Already migrated"
    assert new_contract != empty(address), "Invalid address"

    # CRITICAL FIX: 先设置迁移标志，防止重入攻击
    self.migrated = True

    # 调用新合约的接收函数，传入 self（旧合约地址）
    extcall IMigration(new_contract).receive_migration(self)

    log Migrated(self, new_contract, block.timestamp)


@external
@view
def is_migrated() -> bool:
    """
    @notice 检查合约是否已迁移
    @return True 如果已迁移到新合约
    """
    return self.migrated


@external
def receive_migration(old_contract: address):
    """
    @notice 从旧合约接收迁移状态
    @param old_contract 旧合约地址
    @dev 只有旧合约可以调用此函数
    """
    assert msg.sender == old_contract, "Only old contract"

    old: IMigration = IMigration(old_contract)

    # 迁移基本状态变量
    self.owner = staticcall old.owner()
    self.lp_token = staticcall old.lp_token()
    self.platform_token = staticcall old.platform_token()
    self.kyc_manager = staticcall old.kyc_manager()
    self.require_kyc = staticcall old.require_kyc()
    self.paused = staticcall old.paused()
    self.total_lp_staked = staticcall old.total_lp_staked()
    self.daily_emission = staticcall old.daily_emission()

    # 迁移用户LP质押记录
    users: DynArray[address, 1000] = staticcall old.get_user_list()
    for user: address in users:
        count: uint256 = staticcall old.get_lp_stake_count(user)
        self.lpStakeCount[user] = count

        # 迁移每个用户的LP质押记录
        # 注意：使用足够大的范围（10000）以确保覆盖所有记录
        for i: uint256 in range(10000):
            if i >= count:
                break
            stake: LPStakeInfo = staticcall old.get_lp_stake(user, i)
            self.lpStakes[user][i] = stake

        # 添加到用户列表
        self.userList.append(user)


@external
@view
def get_lp_stake_count(_user: address) -> uint256:
    """
    @notice 获取用户LP质押数量（用于迁移）
    @param _user 用户地址
    @return LP质押数量
    """
    return self.lpStakeCount[_user]


@external
@view
def get_user_list() -> DynArray[address, 1000]:
    """
    @notice 获取用户列表（用于迁移）
    @return 用户地址动态数组
    """
    return self.userList
