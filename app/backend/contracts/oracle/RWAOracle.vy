# @version ^0.4.0

"""
@title RWAOracle - RWA资产预言机
@author SuperCrypto Team
@notice 管理RWA资产的链外数据上链，包含收益率、估值、合规状态等完整数据集
@dev 所有数据更新需经过多签+时间锁验证
"""

# ============================================
# 接口定义
# ============================================

interface IMultiSigManager:
    def verify_proposal(proposal_id: uint256, target: address, data_hash: bytes32) -> bool: view
    def mark_proposal_executed(proposal_id: uint256): nonpayable

interface ITimelock:
    def is_operation_ready(operation_id: bytes32) -> bool: view
    def get_operation(operation_id: bytes32) -> Operation: view

# ============================================
# 导入 Timelock 的数据结构
# ============================================

flag OperationStatus:
    PENDING
    QUEUED
    EXECUTED
    CANCELLED

struct Operation:
    target: address
    data_hash: bytes32
    proposal_id: uint256
    queued_at: uint256
    execute_time: uint256
    status: OperationStatus

# ============================================
# 事件定义
# ============================================

event AssetDataUpdated:
    asset_id: indexed(bytes32)
    apy: uint256
    valuation: uint256
    updated_by: indexed(address)
    timestamp: uint256

event AssetRegistered:
    asset_id: indexed(bytes32)
    asset_name: String[100]
    registered_by: indexed(address)

event AssetDeactivated:
    asset_id: indexed(bytes32)
    deactivated_by: indexed(address)

event DataProviderAdded:
    provider: indexed(address)
    added_by: indexed(address)

event DataProviderRemoved:
    provider: indexed(address)
    removed_by: indexed(address)

event ComplianceStatusChanged:
    asset_id: indexed(bytes32)
    old_status: ComplianceStatus
    new_status: ComplianceStatus

event MaxChangeRateUpdated:
    old_rate: uint256
    new_rate: uint256

# ============================================
# 数据结构
# ============================================

flag ComplianceStatus:
    COMPLIANT           # 合规
    UNDER_REVIEW        # 审查中
    NON_COMPLIANT       # 不合规
    SUSPENDED           # 暂停

struct AssetData:
    # 基础信息
    asset_name: String[100]      # 资产名称
    is_active: bool              # 是否激活
    
    # 财务数据
    apy: uint256                 # 年化收益率（基点，10000 = 100%）
    valuation: uint256           # 资产估值（USD，6位小数）
    occupancy_rate: uint256      # 入住率/使用率（基点）
    monthly_revenue: uint256     # 月度收入（USD，6位小数）
    
    # 合规信息
    compliance_status: ComplianceStatus  # 合规状态
    audit_report_hash: bytes32   # 审计报告IPFS哈希
    
    # 元数据
    data_provider: address       # 数据提供者
    last_updated: uint256        # 最后更新时间
    update_count: uint256        # 更新次数

struct HistoricalData:
    apy: uint256
    valuation: uint256
    timestamp: uint256

# ============================================
# 状态变量
# ============================================

# 合约所有者
owner: public(address)

# 多签管理合约
multi_sig_manager: public(IMultiSigManager)

# 时间锁合约
timelock: public(ITimelock)

# 资产数据 asset_id => AssetData
assets: public(HashMap[bytes32, AssetData])

# 资产ID列表
asset_ids: public(DynArray[bytes32, 1000])

# 历史数据 asset_id => index => HistoricalData (最多保存100条)
historical_data: public(HashMap[bytes32, HashMap[uint256, HistoricalData]])
historical_count: public(HashMap[bytes32, uint256])

# 数据提供者白名单
data_providers: public(HashMap[address, bool])

# 最大变化率（基点，防止数据突变）500 = 5%
max_change_rate: public(uint256)

# 数据有效期（秒）
data_validity_period: public(uint256)

# 合约暂停状态
paused: public(bool)

# ============================================
# 常量
# ============================================

# 最大APY（20% = 2000基点）
MAX_APY: constant(uint256) = 2000
# 最大变化率（50% = 5000基点）
DEFAULT_MAX_CHANGE_RATE: constant(uint256) = 500
# 数据有效期（7天）
DEFAULT_VALIDITY_PERIOD: constant(uint256) = 604800
# 历史数据最大条数
MAX_HISTORY: constant(uint256) = 100

# ============================================
# 构造函数
# ============================================

@deploy
def __init__(multi_sig_addr: address, timelock_addr: address):
    """
    @notice 初始化RWA预言机
    @param multi_sig_addr 多签管理合约地址
    @param timelock_addr 时间锁合约地址
    """
    assert multi_sig_addr != empty(address), "Invalid multisig"
    assert timelock_addr != empty(address), "Invalid timelock"
    
    self.owner = msg.sender
    self.multi_sig_manager = IMultiSigManager(multi_sig_addr)
    self.timelock = ITimelock(timelock_addr)
    
    self.max_change_rate = DEFAULT_MAX_CHANGE_RATE
    self.data_validity_period = DEFAULT_VALIDITY_PERIOD
    self.paused = False
    
    # 添加部署者为初始数据提供者
    self.data_providers[msg.sender] = True
    log DataProviderAdded(msg.sender, msg.sender)

# ============================================
# 修饰器辅助函数
# ============================================

@internal
@view
def _only_owner():
    """仅所有者可调用"""
    assert msg.sender == self.owner, "Only owner"

@internal
@view
def _only_data_provider():
    """仅数据提供者可调用"""
    assert self.data_providers[msg.sender], "Only data provider"

@internal
@view
def _when_not_paused():
    """仅在未暂停时可调用"""
    assert not self.paused, "Contract is paused"

# ============================================
# 资产管理
# ============================================

@external
def register_asset(
    asset_id: bytes32,
    asset_name: String[100],
    initial_apy: uint256,
    initial_valuation: uint256,
    operation_id: bytes32
):
    """
    @notice 注册新资产（需要时间锁操作）
    @param asset_id 资产唯一ID
    @param asset_name 资产名称
    @param initial_apy 初始APY（基点）
    @param initial_valuation 初始估值（USD）
    @param operation_id 时间锁操作ID
    """
    self._only_data_provider()
    self._when_not_paused()
    
    # 验证时间锁
    assert staticcall self.timelock.is_operation_ready(operation_id), "Operation not ready"
    
    # 验证资产不存在
    assert not self.assets[asset_id].is_active, "Asset exists"
    assert initial_apy <= MAX_APY, "APY too high"
    
    # 创建资产
    self.assets[asset_id] = AssetData(
        asset_name=asset_name,
        is_active=True,
        apy=initial_apy,
        valuation=initial_valuation,
        occupancy_rate=0,
        monthly_revenue=0,
        compliance_status=ComplianceStatus.UNDER_REVIEW,
        audit_report_hash=empty(bytes32),
        data_provider=msg.sender,
        last_updated=block.timestamp,
        update_count=0
    )
    
    # 添加到列表
    self.asset_ids.append(asset_id)
    
    # 记录初始历史数据
    self.historical_data[asset_id][0] = HistoricalData(
        apy=initial_apy,
        valuation=initial_valuation,
        timestamp=block.timestamp
    )
    self.historical_count[asset_id] = 1
    
    log AssetRegistered(asset_id, asset_name, msg.sender)
    log AssetDataUpdated(asset_id, initial_apy, initial_valuation, msg.sender, block.timestamp)

@external
def deactivate_asset(asset_id: bytes32, operation_id: bytes32):
    """
    @notice 停用资产（需要时间锁）
    @param asset_id 资产ID
    @param operation_id 时间锁操作ID
    """
    self._only_owner()
    self._when_not_paused()
    
    # 验证时间锁
    assert staticcall self.timelock.is_operation_ready(operation_id), "Operation not ready"
    
    assert self.assets[asset_id].is_active, "Asset not active"
    
    self.assets[asset_id].is_active = False
    
    log AssetDeactivated(asset_id, msg.sender)

# ============================================
# 数据更新
# ============================================

@external
def update_asset_data(
    asset_id: bytes32,
    new_apy: uint256,
    new_valuation: uint256,
    new_occupancy_rate: uint256,
    new_monthly_revenue: uint256,
    operation_id: bytes32
):
    """
    @notice 更新资产数据（需要时间锁）
    @param asset_id 资产ID
    @param new_apy 新APY（基点）
    @param new_valuation 新估值（USD）
    @param new_occupancy_rate 新入住率（基点）
    @param new_monthly_revenue 新月度收入（USD）
    @param operation_id 时间锁操作ID
    """
    self._only_data_provider()
    self._when_not_paused()
    
    # 验证时间锁
    assert staticcall self.timelock.is_operation_ready(operation_id), "Operation not ready"
    
    # 验证资产
    asset: AssetData = self.assets[asset_id]
    assert asset.is_active, "Asset not active"
    assert new_apy <= MAX_APY, "APY too high"
    assert new_occupancy_rate <= 10000, "Invalid occupancy rate"
    
    # 验证变化率（防止数据突变）
    if asset.apy > 0:
        apy_change: uint256 = 0
        if new_apy > asset.apy:
            apy_change = (new_apy - asset.apy) * 10000 // asset.apy
        else:
            apy_change = (asset.apy - new_apy) * 10000 // asset.apy
        assert apy_change <= self.max_change_rate, "APY change too large"
    
    if asset.valuation > 0:
        val_change: uint256 = 0
        if new_valuation > asset.valuation:
            val_change = (new_valuation - asset.valuation) * 10000 // asset.valuation
        else:
            val_change = (asset.valuation - new_valuation) * 10000 // asset.valuation
        assert val_change <= self.max_change_rate, "Valuation change too large"
    
    # 更新数据
    self.assets[asset_id].apy = new_apy
    self.assets[asset_id].valuation = new_valuation
    self.assets[asset_id].occupancy_rate = new_occupancy_rate
    self.assets[asset_id].monthly_revenue = new_monthly_revenue
    self.assets[asset_id].last_updated = block.timestamp
    self.assets[asset_id].update_count += 1
    
    # 保存历史数据
    history_index: uint256 = self.historical_count[asset_id]
    if history_index >= MAX_HISTORY:
        # 循环覆盖最旧的数据
        history_index = self.assets[asset_id].update_count % MAX_HISTORY
    
    self.historical_data[asset_id][history_index] = HistoricalData(
        apy=new_apy,
        valuation=new_valuation,
        timestamp=block.timestamp
    )
    
    if self.historical_count[asset_id] < MAX_HISTORY:
        self.historical_count[asset_id] += 1
    
    log AssetDataUpdated(asset_id, new_apy, new_valuation, msg.sender, block.timestamp)

@external
def update_compliance_status(
    asset_id: bytes32,
    new_status: ComplianceStatus,
    audit_report_hash: bytes32,
    operation_id: bytes32
):
    """
    @notice 更新合规状态（需要时间锁）
    @param asset_id 资产ID
    @param new_status 新合规状态
    @param audit_report_hash 审计报告IPFS哈希
    @param operation_id 时间锁操作ID
    """
    self._only_data_provider()
    self._when_not_paused()
    
    # 验证时间锁
    assert staticcall self.timelock.is_operation_ready(operation_id), "Operation not ready"
    
    assert self.assets[asset_id].is_active, "Asset not active"
    
    old_status: ComplianceStatus = self.assets[asset_id].compliance_status
    
    self.assets[asset_id].compliance_status = new_status
    self.assets[asset_id].audit_report_hash = audit_report_hash
    self.assets[asset_id].last_updated = block.timestamp
    
    log ComplianceStatusChanged(asset_id, old_status, new_status)

# ============================================
# 查询函数
# ============================================

@external
@view
def get_asset_data(asset_id: bytes32) -> AssetData:
    """
    @notice 获取资产完整数据
    @param asset_id 资产ID
    @return 资产数据
    """
    assert self.assets[asset_id].is_active, "Asset not active"
    return self.assets[asset_id]

@external
@view
def get_apy(asset_id: bytes32) -> uint256:
    """
    @notice 获取资产APY
    @param asset_id 资产ID
    @return APY（基点）
    """
    asset: AssetData = self.assets[asset_id]
    assert asset.is_active, "Asset not active"
    assert self._is_data_valid(asset.last_updated), "Data expired"
    return asset.apy

@external
@view
def get_valuation(asset_id: bytes32) -> uint256:
    """
    @notice 获取资产估值
    @param asset_id 资产ID
    @return 估值（USD，6位小数）
    """
    asset: AssetData = self.assets[asset_id]
    assert asset.is_active, "Asset not active"
    assert self._is_data_valid(asset.last_updated), "Data expired"
    return asset.valuation

@external
@view
def get_compliance_status(asset_id: bytes32) -> ComplianceStatus:
    """
    @notice 获取合规状态
    @param asset_id 资产ID
    @return 合规状态
    """
    assert self.assets[asset_id].is_active, "Asset not active"
    return self.assets[asset_id].compliance_status

@external
@view
def get_occupancy_rate(asset_id: bytes32) -> uint256:
    """
    @notice 获取入住率/使用率
    @param asset_id 资产ID
    @return 入住率（基点）
    """
    asset: AssetData = self.assets[asset_id]
    assert asset.is_active, "Asset not active"
    return asset.occupancy_rate

@external
@view
def get_monthly_revenue(asset_id: bytes32) -> uint256:
    """
    @notice 获取月度收入
    @param asset_id 资产ID
    @return 月度收入（USD）
    """
    asset: AssetData = self.assets[asset_id]
    assert asset.is_active, "Asset not active"
    return asset.monthly_revenue

@external
@view
def is_data_valid(asset_id: bytes32) -> bool:
    """
    @notice 检查数据是否在有效期内
    @param asset_id 资产ID
    @return 是否有效
    """
    asset: AssetData = self.assets[asset_id]
    if not asset.is_active:
        return False
    return self._is_data_valid(asset.last_updated)

@internal
@view
def _is_data_valid(last_updated: uint256) -> bool:
    """内部：检查数据是否有效"""
    return (block.timestamp - last_updated) <= self.data_validity_period

@external
@view
def get_historical_data(asset_id: bytes32, index: uint256) -> HistoricalData:
    """
    @notice 获取历史数据
    @param asset_id 资产ID
    @param index 历史记录索引
    @return 历史数据
    """
    assert index < self.historical_count[asset_id], "Invalid index"
    return self.historical_data[asset_id][index]

@external
@view
def get_asset_count() -> uint256:
    """
    @notice 获取资产总数
    @return 资产数量
    """
    return len(self.asset_ids)

@external
@view
def get_all_asset_ids() -> DynArray[bytes32, 1000]:
    """
    @notice 获取所有资产ID
    @return 资产ID列表
    """
    return self.asset_ids

# ============================================
# 数据提供者管理
# ============================================

@external
def add_data_provider(provider: address, operation_id: bytes32):
    """
    @notice 添加数据提供者（需要时间锁）
    @param provider 数据提供者地址
    @param operation_id 时间锁操作ID
    """
    self._only_owner()
    
    # 验证时间锁
    assert staticcall self.timelock.is_operation_ready(operation_id), "Operation not ready"
    
    assert provider != empty(address), "Invalid provider"
    assert not self.data_providers[provider], "Already a provider"
    
    self.data_providers[provider] = True
    
    log DataProviderAdded(provider, msg.sender)

@external
def remove_data_provider(provider: address, operation_id: bytes32):
    """
    @notice 移除数据提供者（需要时间锁）
    @param provider 数据提供者地址
    @param operation_id 时间锁操作ID
    """
    self._only_owner()
    
    # 验证时间锁
    assert staticcall self.timelock.is_operation_ready(operation_id), "Operation not ready"
    
    assert self.data_providers[provider], "Not a provider"
    
    self.data_providers[provider] = False
    
    log DataProviderRemoved(provider, msg.sender)

@external
@view
def is_data_provider(addr: address) -> bool:
    """
    @notice 检查是否为数据提供者
    @param addr 地址
    @return 是否为数据提供者
    """
    return self.data_providers[addr]

# ============================================
# 管理函数
# ============================================

@external
def set_max_change_rate(new_rate: uint256, operation_id: bytes32):
    """
    @notice 设置最大变化率（需要时间锁）
    @param new_rate 新变化率（基点）
    @param operation_id 时间锁操作ID
    """
    self._only_owner()
    
    # 验证时间锁
    assert staticcall self.timelock.is_operation_ready(operation_id), "Operation not ready"
    
    assert new_rate <= 10000, "Rate too high"
    
    old_rate: uint256 = self.max_change_rate
    self.max_change_rate = new_rate
    
    log MaxChangeRateUpdated(old_rate, new_rate)

@external
def set_data_validity_period(new_period: uint256):
    """
    @notice 设置数据有效期（仅所有者）
    @param new_period 新有效期（秒）
    """
    self._only_owner()
    
    assert new_period >= 3600, "Period too short"  # 至少1小时
    assert new_period <= 2592000, "Period too long"  # 最多30天
    
    self.data_validity_period = new_period

@external
def pause():
    """
    @notice 暂停合约（仅所有者）
    """
    self._only_owner()
    self.paused = True

@external
def unpause():
    """
    @notice 恢复合约（仅所有者）
    """
    self._only_owner()
    self.paused = False

@external
def transfer_ownership(new_owner: address):
    """
    @notice 转移所有权
    @param new_owner 新所有者地址
    """
    self._only_owner()
    assert new_owner != empty(address), "Invalid owner"
    self.owner = new_owner

