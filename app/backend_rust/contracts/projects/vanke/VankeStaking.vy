# @version ^0.4.0
"""
@title Staking Contract (STO Compliant)
@notice 权益代币质押挖矿合约 - STO合规版本
@dev 质押RWA代币获得平台代币奖励，双重奖励机制：APY + 固定释放
     添加KYC验证确保仅合规投资者参与
     使用 AddressProvider 模式获取依赖地址
"""

# ============ 接口定义 ============

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
    def is_verified(_investor: address) -> bool: view

interface IAddressProvider:
    def get_kyc_manager() -> address: view
    def get_vanke_rwa_token() -> address: view
    def get_vanke_platform_token() -> address: view
    def get_vanke_subscription() -> address: view

# 合约迁移接口（统一使用 IMigration）
interface IMigration:
    def owner() -> address: view
    def ADDRESS_PROVIDER() -> address: view  # 纯 Provider 模式
    def paused() -> bool: view
    def total_staked() -> uint256: view
    def staking_apy() -> uint256: view
    def daily_emission() -> uint256: view
    def get_stake(_user: address, _stakeId: uint256) -> StakeInfo: view
    def get_stake_count(_user: address) -> uint256: view
    def get_user_list() -> DynArray[address, 1000]: view
    def receive_migration(oldContract: address): nonpayable
    def is_migrated() -> bool: view

# ============ 事件定义 ============

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

event Migrated:
    oldContract: indexed(address)
    newContract: indexed(address)
    timestamp: uint256

# ============ 数据结构 ============

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

# ============ 常量定义 ============

BASIS_POINTS: constant(uint256) = 10000
SECONDS_PER_YEAR: constant(uint256) = 365 * 24 * 3600
SECONDS_PER_DAY: constant(uint256) = 24 * 3600

# ============ 存储变量 ============

owner: public(address)
paused: public(bool)

# AddressProvider - 纯 Provider 模式（部署后通过 Admin 设置）
ADDRESS_PROVIDER: public(address)

# 质押数据
stakes: public(HashMap[address, HashMap[uint256, StakeInfo]])
stakeCount: public(HashMap[address, uint256])
totalStaked: public(uint256)

# 合约迁移状态
migrated: public(bool)  # 迁移标志

# 为迁移添加的用户列表（追踪所有有质押记录的用户）
userList: public(DynArray[address, 1000])

# 奖励参数
stakingAPY: public(uint256)         # 质押APY（基点，10000 = 100%）
dailyEmission: public(uint256)      # 每日固定释放量（18位精度）

# ============ 构造函数 ============

@deploy
def __init__():
    """
    @notice 初始化质押合约
    @dev 部署后需要通过 admin_set_address_provider 设置 Provider 地址
    """
    self.owner = msg.sender
    self.paused = False

    # 默认参数
    self.stakingAPY = 3000  # 30% APY
    self.dailyEmission = 10_000 * 10 ** 18  # 每日释放10000个平台代币

# ============ Owner 函数 ============

@external
def owner_pause():
    """
    @notice 暂停合约
    """
    assert msg.sender == self.owner, "Only owner"
    self.paused = True


@external
def owner_unpause():
    """
    @notice 恢复合约
    """
    assert msg.sender == self.owner, "Only owner"
    self.paused = False


@external
def owner_transfer_ownership(_new_owner: address):
    """
    @notice 转移所有权
    @param _new_owner 新所有者地址
    """
    assert msg.sender == self.owner, "Only owner"
    assert _new_owner != empty(address), "Invalid address"
    self.owner = _new_owner

# ============ Admin 函数 ============

@external
def admin_set_address_provider(_address_provider: address):
    """
    @notice 设置 AddressProvider 地址
    @param _address_provider AddressProvider 合约地址
    @dev 仅 owner 可调用，通常部署后通过 Admin UI 设置
    """
    assert msg.sender == self.owner, "Only owner"
    assert _address_provider != empty(address), "Invalid address"
    self.ADDRESS_PROVIDER = _address_provider


@external
def admin_set_staking_apy(_apy: uint256):
    """
    @notice 设置质押APY
    @param _apy APY（基点）
    """
    assert msg.sender == self.owner, "Only owner"
    assert _apy <= 10000, "APY too high"
    self.stakingAPY = _apy


@external
def admin_set_daily_emission(_emission: uint256):
    """
    @notice 设置每日释放量
    @param _emission 每日释放量
    """
    assert msg.sender == self.owner, "Only owner"
    oldEmission: uint256 = self.dailyEmission
    self.dailyEmission = _emission
    log DailyEmissionUpdated(oldEmission, _emission)

# ============ 核心业务函数 ============

@external
def stake(_amount: uint256, _subscriptionId: uint256):
    """
    @notice 质押RWA代币（纯 Provider 模式）
    @param _amount 质押数量
    @param _subscriptionId 关联的认购ID
    """
    assert not self.migrated, "Contract migrated, use new contract"
    assert not self.paused, "Contract paused"
    assert _amount > 0, "Amount must be positive"

    # 从 Provider 获取依赖地址
    kyc: address = self._get_kyc_manager()
    subscription: address = self._get_subscription()
    rwa_token: address = self._get_rwa_token()

    # STO合规：KYC验证
    assert staticcall IKYCManager(kyc).is_verified(msg.sender), "KYC verification required"

    # 验证认购信息
    subCount: uint256 = staticcall ISubscription(subscription).subscriptionCount(msg.sender)
    assert _subscriptionId < subCount, "Invalid subscription ID"

    subInfo: SubscriptionInfo = staticcall ISubscription(subscription).subscriptions(msg.sender, _subscriptionId)
    assert not subInfo.redeemed, "Subscription already redeemed"
    assert block.timestamp < subInfo.redeemTime, "Redeem period ended"

    # 转入RWA代币
    assert extcall IERC20(rwa_token).transferFrom(msg.sender, self, _amount), "Transfer failed"

    # 创建质押记录
    stakeId: uint256 = self.stakeCount[msg.sender]

    self.stakes[msg.sender][stakeId] = StakeInfo(
        amount=_amount,
        stakeTime=block.timestamp,
        lastRewardTime=block.timestamp,
        subscriptionId=_subscriptionId,
        originalRedeemTime=subInfo.redeemTime,
        stakeDuration=0,
        unstaked=False
    )

    self.stakeCount[msg.sender] += 1
    self.totalStaked += _amount

    # 维护迁移用户列表（仅当这是用户的第一次质押时）
    if stakeId == 0:
        self.userList.append(msg.sender)

    log Stake(msg.sender, _amount, _subscriptionId, subInfo.redeemTime)


@external
def unstake(_stakeId: uint256):
    """
    @notice 解除质押（STO合规版本）
    @param _stakeId 质押ID
    """
    assert not self.migrated, "Contract migrated, use new contract"
    assert not self.paused, "Contract paused"
    assert _stakeId < self.stakeCount[msg.sender], "Invalid stake ID"

    # 从 Provider 获取依赖地址
    kyc: address = self._get_kyc_manager()
    rwa_token: address = self._get_rwa_token()

    # STO合规：KYC验证
    assert staticcall IKYCManager(kyc).is_verified(msg.sender), "KYC verification required"

    stakeInfo: StakeInfo = self.stakes[msg.sender][_stakeId]
    assert not stakeInfo.unstaked, "Already unstaked"

    # 计算质押时长
    stakeDuration: uint256 = block.timestamp - stakeInfo.stakeTime

    # 更新质押时长（用于顺延赎回期）
    self.stakes[msg.sender][_stakeId].stakeDuration = stakeDuration

    # 自动领取奖励
    self._claim_reward(msg.sender, _stakeId)

    # 返还RWA代币
    assert extcall IERC20(rwa_token).transfer(msg.sender, stakeInfo.amount), "Transfer failed"

    # 标记为已解除质押
    self.stakes[msg.sender][_stakeId].unstaked = True
    self.totalStaked -= stakeInfo.amount

    log Unstake(msg.sender, _stakeId, stakeInfo.amount)


@external
def claim_reward(_stakeId: uint256):
    """
    @notice 领取奖励（纯 Provider 模式）
    @param _stakeId 质押ID
    """
    assert not self.migrated, "Contract migrated, use new contract"
    assert not self.paused, "Contract paused"

    # STO合规：KYC验证
    kyc: address = self._get_kyc_manager()
    assert staticcall IKYCManager(kyc).is_verified(msg.sender), "KYC verification required"

    self._claim_reward(msg.sender, _stakeId)

# ============ 查询函数 ============

@view
@external
def calculate_reward(_user: address, _stakeId: uint256) -> uint256:
    """
    @notice 计算奖励（外部调用）
    @param _user 用户地址
    @param _stakeId 质押ID
    @return 奖励数量
    """
    return self._calculate_reward(_user, _stakeId)


@view
@external
def get_stake(_user: address, _stakeId: uint256) -> StakeInfo:
    """
    @notice 获取质押信息
    @param _user 用户地址
    @param _stakeId 质押ID
    @return 质押信息
    """
    return self.stakes[_user][_stakeId]


@view
@external
def get_new_redeem_time(_user: address, _stakeId: uint256) -> uint256:
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

# ============ 内部辅助函数 ============

@view
@internal
def _get_kyc_manager() -> address:
    """@notice 从 AddressProvider 获取 KYC 管理合约地址"""
    return staticcall IAddressProvider(self.ADDRESS_PROVIDER).get_kyc_manager()


@view
@internal
def _get_rwa_token() -> address:
    """@notice 从 AddressProvider 获取 Vanke RWA Token 地址"""
    return staticcall IAddressProvider(self.ADDRESS_PROVIDER).get_vanke_rwa_token()


@view
@internal
def _get_platform_token() -> address:
    """@notice 从 AddressProvider 获取 Vanke Platform Token 地址"""
    return staticcall IAddressProvider(self.ADDRESS_PROVIDER).get_vanke_platform_token()


@view
@internal
def _get_subscription() -> address:
    """@notice 从 AddressProvider 获取 Vanke Subscription 地址"""
    return staticcall IAddressProvider(self.ADDRESS_PROVIDER).get_vanke_subscription()


@internal
def _claim_reward(_user: address, _stakeId: uint256):
    """
    @notice 内部领取奖励函数
    @param _user 用户地址
    @param _stakeId 质押ID
    """
    assert _stakeId < self.stakeCount[_user], "Invalid stake ID"

    stakeInfo: StakeInfo = self.stakes[_user][_stakeId]
    assert not stakeInfo.unstaked, "Already unstaked"

    # 计算待领取奖励
    reward: uint256 = self._calculate_reward(_user, _stakeId)

    if reward > 0:
        # 铸造平台代币作为奖励
        platform_token: address = self._get_platform_token()
        extcall IPlatformToken(platform_token).mint(_user, reward)

        # 更新上次领取时间
        self.stakes[_user][_stakeId].lastRewardTime = block.timestamp

        log ClaimReward(_user, reward)


@view
@internal
def _calculate_reward(_user: address, _stakeId: uint256) -> uint256:
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
    apyReward: uint256 = stakeInfo.amount * self.stakingAPY * timeDiff // SECONDS_PER_YEAR // BASIS_POINTS

    # 奖励2: 固定每日释放（按质押占比分配）
    dailyReward: uint256 = 0
    if self.totalStaked > 0:
        # 用户在这段时间内应得的固定释放奖励
        dailyReward = self.dailyEmission * timeDiff * stakeInfo.amount // SECONDS_PER_DAY // self.totalStaked

    return apyReward + dailyReward

# ============ 依赖查询功能 ============

@external
@view
def get_dependencies() -> (DynArray[String[50], 10], DynArray[String[50], 10], DynArray[String[50], 10]):
    """
    @notice 获取合约依赖（纯 Provider 模式）
    @return (unbound_required, bound_all, unbound_optional) 未绑定必须依赖、已绑定所有依赖、未绑定可选依赖
    @dev 必须依赖: VankeRWAToken, VankePlatformToken, VankeSubscription, KYC
    @dev 所有依赖通过 AddressProvider 获取
    """
    unbound_required: DynArray[String[50], 10] = []
    bound_all: DynArray[String[50], 10] = []
    unbound_optional: DynArray[String[50], 10] = []

    # 检查必须依赖（从 Provider 获取）
    rwa_token: address = self._get_rwa_token()
    if rwa_token == empty(address):
        unbound_required.append("VankeRWAToken")
    else:
        bound_all.append("VankeRWAToken")

    platform_token: address = self._get_platform_token()
    if platform_token == empty(address):
        unbound_required.append("VankePlatformToken")
    else:
        bound_all.append("VankePlatformToken")

    subscription: address = self._get_subscription()
    if subscription == empty(address):
        unbound_required.append("VankeSubscription")
    else:
        bound_all.append("VankeSubscription")

    kyc: address = self._get_kyc_manager()
    if kyc == empty(address):
        unbound_required.append("KYC")
    else:
        bound_all.append("KYC")

    return unbound_required, bound_all, unbound_optional


@view
@external
def get_address_provider() -> address:
    """
    @notice 获取 AddressProvider 地址
    @return AddressProvider 合约地址
    """
    return self.ADDRESS_PROVIDER

# ============ 合约迁移功能 ============

@external
def owner_migrate(newContract: address):
    """
    @notice 迁移所有状态到新合约
    @param newContract 新合约地址（必须实现 receive_migration 接口）
    @dev 迁移后设置 migrated 标志，不自动暂停
    """
    assert msg.sender == self.owner, "Only owner"
    assert not self.migrated, "Already migrated"
    assert newContract != empty(address), "Invalid address"

    # CRITICAL FIX: 先设置迁移标志，防止重入攻击
    self.migrated = True

    # 调用新合约的接收函数，传入 self（旧合约地址）
    extcall IMigration(newContract).receive_migration(self)

    log Migrated(self, newContract, block.timestamp)


@external
def receive_migration(oldContract: address):
    """
    @notice 从旧合约接收迁移状态（纯 Provider 模式）
    @param oldContract 旧合约地址
    @dev 只有旧合约可以调用此函数
    @dev 注意: rwaToken, platformToken, subscription, kycManager 通过 AddressProvider 获取，不需要迁移
    """
    assert msg.sender == oldContract, "Only old contract"

    old: IMigration = IMigration(oldContract)

    # 迁移基本状态变量
    self.owner = staticcall old.owner()
    # 注意: rwaToken, platformToken, subscription, kycManager 通过 AddressProvider 获取，不需要迁移
    self.dailyEmission = staticcall old.daily_emission()

    # 迁移用户质押记录
    users: DynArray[address, 1000] = staticcall old.get_user_list()
    for user: address in users:
        count: uint256 = staticcall old.get_stake_count(user)
        self.stakeCount[user] = count

        # 迁移每个用户的质押记录
        # 注意：使用足够大的范围（10000）以确保覆盖所有记录
        for i: uint256 in range(10000):
            if i >= count:
                break
            stake: StakeInfo = staticcall old.get_stake(user, i)
            self.stakes[user][i] = stake

        # 添加到用户列表
        self.userList.append(user)


@external
@view
def is_migrated() -> bool:
    """
    @notice 检查合约是否已迁移
    @return True 如果已迁移到新合约
    """
    return self.migrated


@external
@view
def get_stake_count(_user: address) -> uint256:
    """
    @notice 获取用户质押数量（用于迁移）
    @param _user 用户地址
    @return 质押数量
    """
    return self.stakeCount[_user]


@external
@view
def get_user_list() -> DynArray[address, 1000]:
    """
    @notice 获取用户列表（用于迁移）
    @return 用户地址动态数组
    """
    return self.userList
