# @version ^0.4.0
"""
@title Subscription Contract (STO Compliant)
@notice 权益代币认购和赎回合约 - 符合证券法合规要求
@dev 使用USDT购买权益代币，支持4种锁定期，动态年化收益率
     添加KYC验证、投资者限制等STO合规功能
     使用 AddressProvider 模式获取依赖地址
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

interface IAddressProvider:
    def get_usdt() -> address: view
    def get_kyc_manager() -> address: view
    def get_vanke_rwa_token() -> address: view

# 合约迁移接口
interface IMigration:
    def owner() -> address: view
    def ADDRESS_PROVIDER() -> address: view  # 纯 Provider 模式
    def paused() -> bool: view
    def min_investment() -> uint256: view
    def max_investment() -> uint256: view
    def require_accredited() -> bool: view
    def lock_period_apy(period: uint256) -> uint256: view
    def get_lock_periods() -> uint256[4]: view
    def get_subscription(_user: address, _subscriptionId: uint256) -> SubscriptionInfo: view
    def get_subscription_count(_user: address) -> uint256: view
    def get_user_list() -> DynArray[address, 1000]: view
    def receive_migration(oldContract: address): nonpayable
    def is_migrated() -> bool: view

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

# 迁移事件
event Migrated:
    oldContract: indexed(address)
    newContract: indexed(address)
    timestamp: uint256

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
paused: public(bool)         # 暂停标志

# AddressProvider (immutable) - 纯 Provider 模式
ADDRESS_PROVIDER: public(immutable(address))

# STO 合规参数
min_investment: public(uint256)      # 最小投资额
max_investment: public(uint256)      # 最大投资额（单次）
require_accredited: public(bool)     # 是否要求合格投资者

# 锁定期APY映射（秒 => 基点）
lock_period_apy: public(HashMap[uint256, uint256])

# 用户认购记录（用户 => 认购ID => 认购信息）
subscriptions: public(HashMap[address, HashMap[uint256, SubscriptionInfo]])
subscriptionCount: public(HashMap[address, uint256])

# 合约迁移状态
migrated: public(bool)  # 迁移标志

# 为迁移添加的用户列表（追踪所有有认购记录的用户）
userList: public(DynArray[address, 1000])

# 常量 - 锁定期（秒）
LOCK_1_MONTH: constant(uint256) = 30 * 24 * 3600       # 30天
LOCK_3_MONTHS: constant(uint256) = 90 * 24 * 3600      # 90天
LOCK_6_MONTHS: constant(uint256) = 180 * 24 * 3600     # 180天
LOCK_12_MONTHS: constant(uint256) = 360 * 24 * 3600    # 360天

# 基点常量
BASIS_POINTS: constant(uint256) = 10000  # 100% = 10000基点
SECONDS_PER_YEAR: constant(uint256) = 365 * 24 * 3600


@deploy
def __init__(_address_provider: address):
    """
    @notice 初始化认购合约（纯 Provider 模式）
    @param _address_provider AddressProvider 合约地址
    """
    ADDRESS_PROVIDER = _address_provider
    self.owner = msg.sender
    self.paused = False

    # STO 合规默认参数
    self.min_investment = 1000 * 10**6      # 最小投资 $1,000（符合Reg D要求）
    self.max_investment = 0                 # 0表示无上限
    self.require_accredited = False         # 默认不强制要求合格投资者

    # 设置默认APY（基点）
    self.lock_period_apy[LOCK_1_MONTH] = 800      # 8%
    self.lock_period_apy[LOCK_3_MONTHS] = 1000    # 10%
    self.lock_period_apy[LOCK_6_MONTHS] = 1200    # 12%
    self.lock_period_apy[LOCK_12_MONTHS] = 1500   # 15%


# ==================== Provider 查询 ====================

@view
@internal
def _get_usdt() -> address:
    """@notice 从 AddressProvider 获取 USDT 地址"""
    return staticcall IAddressProvider(ADDRESS_PROVIDER).get_usdt()


@view
@internal
def _get_kyc_manager() -> address:
    """@notice 从 AddressProvider 获取 KYC 管理合约地址"""
    return staticcall IAddressProvider(ADDRESS_PROVIDER).get_kyc_manager()


@view
@internal
def _get_rwa_token() -> address:
    """@notice 从 AddressProvider 获取 Vanke RWA Token 地址"""
    return staticcall IAddressProvider(ADDRESS_PROVIDER).get_vanke_rwa_token()


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
def set_apy(_lock_period: uint256, _apy: uint256):
    """
    @notice 设置锁定期的年化收益率
    @param _lock_period 锁定期（秒）
    @param _apy 年化收益率（基点，10000 = 100%）
    """
    assert msg.sender == self.owner, "Only owner"
    assert _lock_period == LOCK_1_MONTH or _lock_period == LOCK_3_MONTHS or \
           _lock_period == LOCK_6_MONTHS or _lock_period == LOCK_12_MONTHS, "Invalid lock period"
    assert _apy <= 10000, "APY too high"  # 最高100%

    old_apy: uint256 = self.lock_period_apy[_lock_period]
    self.lock_period_apy[_lock_period] = _apy

    log APYUpdated(_lock_period, old_apy, _apy)


@external
def set_min_investment(_min: uint256):
    """
    @notice 设置最小投资额（STO合规）
    @param _min 最小投资额（USDT，6位小数）
    """
    assert msg.sender == self.owner, "Only owner"
    self.min_investment = _min


@external
def set_max_investment(_max: uint256):
    """
    @notice 设置最大投资额（STO合规）
    @param _max 最大投资额（USDT，0表示无上限）
    """
    assert msg.sender == self.owner, "Only owner"
    self.max_investment = _max


@external
def set_require_accredited(_require: bool):
    """
    @notice 设置是否要求合格投资者（STO合规）
    @param _require 是否要求
    """
    assert msg.sender == self.owner, "Only owner"
    self.require_accredited = _require


# 注意: set_kyc_manager, set_usdt, set_rwa_token 已移除 - 纯 Provider 模式下通过 AddressProvider 管理


@external
def subscribe(_amount: uint256, _lock_period: uint256):
    """
    @notice 认购权益代币（STO合规版本 - 纯 Provider 模式）
    @param _amount USDT数量（6位小数）
    @param _lock_period 锁定期（秒）
    """
    assert not self.migrated, "Contract migrated, use new contract"
    assert not self.paused, "Contract paused"
    assert _amount > 0, "Amount must be positive"
    assert _lock_period == LOCK_1_MONTH or _lock_period == LOCK_3_MONTHS or \
           _lock_period == LOCK_6_MONTHS or _lock_period == LOCK_12_MONTHS, "Invalid lock period"

    # 从 Provider 获取依赖地址
    kyc: address = self._get_kyc_manager()
    usdt: address = self._get_usdt()
    rwa_token: address = self._get_rwa_token()

    # ========== STO 合规检查 ==========

    # 1. KYC验证（必须）
    assert staticcall IKYCManager(kyc).isVerified(msg.sender), "KYC verification required"

    # 2. 合格投资者检查（如果要求）
    if self.require_accredited:
        assert staticcall IKYCManager(kyc).isAccredited(msg.sender), "Accredited investor required"

    # 3. 最小投资额检查
    assert _amount >= self.min_investment, "Below minimum investment"

    # 4. 最大投资额检查
    if self.max_investment > 0:
        assert _amount <= self.max_investment, "Exceeds maximum investment"

    # 5. 投资能力检查
    assert staticcall IKYCManager(kyc).canInvest(msg.sender, _amount), "Cannot invest"

    # ===================================

    # 获取当前APY
    apy: uint256 = self.lock_period_apy[_lock_period]

    # 从用户转入USDT
    assert extcall IERC20(usdt).transferFrom(msg.sender, self, _amount), "Transfer failed"

    # 铸造等量RWA代币给用户（USDT 6位小数 -> RWA 18位小数）
    rwa_amount: uint256 = _amount * 10 ** 12  # 转换精度
    extcall IRWAToken(rwa_token).mint(msg.sender, rwa_amount)

    # 记录认购信息
    subscription_id: uint256 = self.subscriptionCount[msg.sender]
    redeem_time: uint256 = block.timestamp + _lock_period

    self.subscriptions[msg.sender][subscription_id] = SubscriptionInfo(
        principal=_amount,
        lockPeriod=_lock_period,
        subscribeTime=block.timestamp,
        redeemTime=redeem_time,
        apy=apy,
        redeemed=False
    )

    self.subscriptionCount[msg.sender] += 1

    # 维护迁移用户列表（仅当这是用户的第一次认购时）
    if subscription_id == 0:
        self.userList.append(msg.sender)

    log Subscribe(msg.sender, _amount, _lock_period, redeem_time, apy)


@external
def redeem(_subscription_id: uint256):
    """
    @notice 赎回权益代币（STO合规版本）
    @param _subscription_id 认购ID
    """
    assert not self.migrated, "Contract migrated, use new contract"
    assert not self.paused, "Contract paused"
    assert _subscription_id < self.subscriptionCount[msg.sender], "Invalid subscription ID"

    # 从 Provider 获取依赖地址
    kyc: address = self._get_kyc_manager()
    usdt: address = self._get_usdt()
    rwa_token: address = self._get_rwa_token()

    # STO合规：确保用户KYC仍然有效
    assert staticcall IKYCManager(kyc).isVerified(msg.sender), "KYC verification required"

    subscription: SubscriptionInfo = self.subscriptions[msg.sender][_subscription_id]
    assert not subscription.redeemed, "Already redeemed"
    assert block.timestamp >= subscription.redeemTime, "Lock period not ended"

    # 计算利息
    interest: uint256 = self._calculate_interest(
        subscription.principal,
        subscription.lockPeriod,
        subscription.apy
    )

    total: uint256 = subscription.principal + interest

    # 检查合约USDT余额
    assert staticcall IERC20(usdt).balanceOf(self) >= total, "Insufficient USDT balance"

    # 销毁RWA代币
    rwa_amount: uint256 = subscription.principal * 10 ** 12
    extcall IRWAToken(rwa_token).burn(msg.sender, rwa_amount)

    # 转出USDT（本金+利息）
    assert extcall IERC20(usdt).transfer(msg.sender, total), "Transfer failed"

    # 标记为已赎回
    self.subscriptions[msg.sender][_subscription_id].redeemed = True

    log Redeem(msg.sender, subscription.principal, interest, total)


@view
@internal
def _calculate_interest(_principal: uint256, _lock_period: uint256, _apy: uint256) -> uint256:
    """
    @notice 计算利息
    @param _principal 本金
    @param _lock_period 锁定期（秒）
    @param _apy 年化收益率（基点）
    @return 利息
    """
    # 利息 = 本金 * APY * 锁定期 / 年秒数 / 基点
    return _principal * _apy * _lock_period // SECONDS_PER_YEAR // BASIS_POINTS


@view
@external
def calculate_interest(_principal: uint256, _lock_period: uint256, _apy: uint256) -> uint256:
    """
    @notice 计算利息（外部调用）
    @param _principal 本金
    @param _lock_period 锁定期（秒）
    @param _apy 年化收益率（基点）
    @return 利息
    """
    return self._calculate_interest(_principal, _lock_period, _apy)


@view
@external
def get_subscription(_user: address, _subscription_id: uint256) -> SubscriptionInfo:
    """
    @notice 获取认购信息
    @param _user 用户地址
    @param _subscription_id 认购ID
    @return 认购信息
    """
    return self.subscriptions[_user][_subscription_id]


@view
@external
def get_pending_reward(_user: address, _subscription_id: uint256) -> uint256:
    """
    @notice 获取待赎回奖励
    @param _user 用户地址
    @param _subscription_id 认购ID
    @return 利息
    """
    assert _subscription_id < self.subscriptionCount[_user], "Invalid subscription ID"

    subscription: SubscriptionInfo = self.subscriptions[_user][_subscription_id]
    if subscription.redeemed:
        return 0

    return self._calculate_interest(
        subscription.principal,
        subscription.lockPeriod,
        subscription.apy
    )


@external
def emergency_withdraw(_token: address, _amount: uint256):
    """
    @notice 紧急提取代币（仅管理员）
    @param _token 代币地址
    @param _amount 提取数量
    """
    assert msg.sender == self.owner, "Only owner"
    assert extcall IERC20(_token).transfer(self.owner, _amount), "Transfer failed"
    log EmergencyWithdraw(_token, _amount)


@external
def transfer_ownership(_new_owner: address):
    """
    @notice 转移所有权
    @param _new_owner 新所有者地址
    """
    assert msg.sender == self.owner, "Only owner"
    assert _new_owner != empty(address), "Invalid address"
    self.owner = _new_owner


@view
@external
def get_lock_periods() -> uint256[4]:
    """
    @notice 获取所有锁定期
    @return 锁定期数组
    """
    return [LOCK_1_MONTH, LOCK_3_MONTHS, LOCK_6_MONTHS, LOCK_12_MONTHS]


# ==================== 依赖查询功能 ====================

@external
@view
def get_dependencies() -> (DynArray[String[50], 10], DynArray[String[50], 10], DynArray[String[50], 10]):
    """
    @notice 获取合约依赖（纯 Provider 模式）
    @return (unbound_required, bound_all, unbound_optional) 未绑定必须依赖、已绑定所有依赖、未绑定可选依赖
    @dev 必须依赖: USDT (稳定币接口), VankeRWAToken, KYC
    @dev 所有依赖通过 AddressProvider 获取
    """
    unbound_required: DynArray[String[50], 10] = []
    bound_all: DynArray[String[50], 10] = []
    unbound_optional: DynArray[String[50], 10] = []

    # 检查必须依赖（从 Provider 获取）
    usdt: address = self._get_usdt()
    if usdt == empty(address):
        unbound_required.append("USDT")
    else:
        bound_all.append("USDT")

    rwa_token: address = self._get_rwa_token()
    if rwa_token == empty(address):
        unbound_required.append("VankeRWAToken")
    else:
        bound_all.append("VankeRWAToken")

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
    return ADDRESS_PROVIDER


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
    @notice 从旧合约接收迁移状态（纯 Provider 模式）
    @param old_contract 旧合约地址
    @dev 只有旧合约可以调用此函数
    @dev 注意: usdt, rwa_token, kyc_manager 通过 AddressProvider 获取，不需要迁移
    """
    assert msg.sender == old_contract, "Only old contract"

    old: IMigration = IMigration(old_contract)

    # 迁移基本状态变量
    self.owner = staticcall old.owner()
    # 注意: usdt, rwa_token, kyc_manager 通过 AddressProvider 获取，不需要迁移
    self.paused = staticcall old.paused()
    self.min_investment = staticcall old.min_investment()
    self.max_investment = staticcall old.max_investment()
    self.require_accredited = staticcall old.require_accredited()

    # 迁移锁定期APY
    lock_periods: uint256[4] = staticcall old.get_lock_periods()
    for period: uint256 in lock_periods:
        apy: uint256 = staticcall old.lock_period_apy(period)
        self.lock_period_apy[period] = apy

    # 迁移用户认购记录
    users: DynArray[address, 1000] = staticcall old.get_user_list()
    for user: address in users:
        count: uint256 = staticcall old.get_subscription_count(user)
        self.subscriptionCount[user] = count

        # 迁移每个用户的认购记录
        # 注意：使用足够大的范围（10000）以确保覆盖所有记录
        for i: uint256 in range(10000):
            if i >= count:
                break
            sub: SubscriptionInfo = staticcall old.get_subscription(user, i)
            self.subscriptions[user][i] = sub

        # 添加到用户列表
        self.userList.append(user)


@external
@view
def get_subscription_count(_user: address) -> uint256:
    """
    @notice 获取用户认购数量（用于迁移）
    @param _user 用户地址
    @return 认购数量
    """
    return self.subscriptionCount[_user]


@external
@view
def get_user_list() -> DynArray[address, 1000]:
    """
    @notice 获取用户列表（用于迁移）
    @return 用户地址动态数组
    """
    return self.userList

