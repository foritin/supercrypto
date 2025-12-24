# @version ^0.4.0

"""
@title DataAggregator - 混合数据聚合器
@author SuperCrypto Team
@notice 混合模式数据聚合：主数据源（可信预言机）+ 备用数据源（去中心化预言机）
@dev 支持中位数聚合、偏差检测、自动切换
"""

# 合约迁移接口
interface IDataAggregatorMigration:
    def owner() -> address: view
    def primary_oracle() -> address: view
    def paused() -> bool: view
    def cache_validity() -> uint256: view
    def deviation_threshold() -> uint256: view
    def min_secondary_oracles() -> uint256: view
    def secondary_enabled() -> bool: view
    def cachedAssetIds() -> DynArray[bytes32, 1000]: view
    def getSecondaryOracleList() -> DynArray[address, 50]: view
    def getSecondaryData(_assetId: bytes32, _oracle: address) -> OracleData: view
    def getAggregatedCache(_assetId: bytes32) -> AggregatedData: view
    def receiveMigration(oldContract: address): nonpayable
    def isMigrated() -> bool: view

# ============================================
# 接口定义
# ============================================

interface IRWAOracle:
    def get_apy(asset_id: bytes32) -> uint256: view
    def get_valuation(asset_id: bytes32) -> uint256: view
    def is_data_valid(asset_id: bytes32) -> bool: view
    def get_compliance_status(asset_id: bytes32) -> ComplianceStatus: view

# ============================================
# 数据结构
# ============================================

flag ComplianceStatus:
    COMPLIANT
    UNDER_REVIEW
    NON_COMPLIANT
    SUSPENDED

flag DataSource:
    PRIMARY      # 主数据源（可信预言机）
    SECONDARY    # 备用数据源（去中心化预言机）
    AGGREGATED   # 聚合数据

struct OracleData:
    apy: uint256
    valuation: uint256
    timestamp: uint256
    source: address

struct AggregatedData:
    apy: uint256
    valuation: uint256
    data_source: DataSource
    confidence: uint256      # 置信度（基点，10000 = 100%）
    timestamp: uint256

# ============================================
# 事件定义
# ============================================

event SecondaryOracleAdded:
    oracle: indexed(address)
    added_by: indexed(address)

event SecondaryOracleRemoved:
    oracle: indexed(address)
    removed_by: indexed(address)

event DataAggregated:
    asset_id: indexed(bytes32)
    apy: uint256
    valuation: uint256
    source: DataSource
    confidence: uint256

event DataSourceSwitched:
    asset_id: indexed(bytes32)
    old_source: DataSource
    new_source: DataSource
    reason: String[100]

event DeviationAlert:
    asset_id: indexed(bytes32)
    primary_value: uint256
    secondary_value: uint256
    deviation: uint256

event ThresholdUpdated:
    threshold_type: String[50]
    old_value: uint256
    new_value: uint256

# 迁移事件
event Migrated:
    oldContract: indexed(address)
    newContract: indexed(address)
    timestamp: uint256

# ============================================
# 状态变量
# ============================================

# 合约所有者
owner: public(address)

# 主预言机（可信源）
_primary_oracle: IRWAOracle

# 次级预言机列表（去中心化源）
secondary_oracles: public(HashMap[address, bool])
secondary_oracle_list: public(DynArray[address, 50])

# 次级预言机数据 asset_id => oracle => OracleData
secondary_data: public(HashMap[bytes32, HashMap[address, OracleData]])

# 聚合结果缓存 asset_id => AggregatedData
aggregated_cache: public(HashMap[bytes32, AggregatedData])

# 为迁移添加的缓存资产ID列表（追踪所有有缓存的资产）
cachedAssetIds: public(DynArray[bytes32, 1000])

# 合约迁移状态
migrated: public(bool)  # 迁移标志

# 缓存有效期（秒）
cache_validity: public(uint256)

# 偏差阈值（基点）1000 = 10%
deviation_threshold: public(uint256)

# 最小次级预言机数量
min_secondary_oracles: public(uint256)

# 是否启用次级预言机
secondary_enabled: public(bool)

# 合约暂停状态
paused: public(bool)

# ============================================
# 常量
# ============================================

# 默认缓存有效期（1小时）
DEFAULT_CACHE_VALIDITY: constant(uint256) = 3600
# 默认偏差阈值（10%）
DEFAULT_DEVIATION_THRESHOLD: constant(uint256) = 1000
# 最小次级预言机数量
DEFAULT_MIN_SECONDARY: constant(uint256) = 3

# ============================================
# 构造函数
# ============================================

@deploy
def __init__(primary_oracle_addr: address):
    """
    @notice 初始化数据聚合器
    @param primary_oracle_addr 主预言机地址
    """
    assert primary_oracle_addr != empty(address), "Invalid primary oracle"
    
    self.owner = msg.sender
    self._primary_oracle = IRWAOracle(primary_oracle_addr)
    
    self.cache_validity = DEFAULT_CACHE_VALIDITY
    self.deviation_threshold = DEFAULT_DEVIATION_THRESHOLD
    self.min_secondary_oracles = DEFAULT_MIN_SECONDARY
    self.secondary_enabled = False
    self.paused = False

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
def _when_not_paused():
    """仅在未暂停时可调用"""
    assert not self.paused, "Contract is paused"

# ============================================
# 次级预言机管理
# ============================================

@external
def add_secondary_oracle(oracle: address):
    """
    @notice 添加次级预言机
    @param oracle 预言机地址
    """
    self._only_owner()
    
    assert oracle != empty(address), "Invalid oracle"
    assert not self.secondary_oracles[oracle], "Already added"
    assert len(self.secondary_oracle_list) < 50, "Max oracles reached"
    
    self.secondary_oracles[oracle] = True
    self.secondary_oracle_list.append(oracle)
    
    log SecondaryOracleAdded(oracle, msg.sender)

@external
def remove_secondary_oracle(oracle: address):
    """
    @notice 移除次级预言机
    @param oracle 预言机地址
    """
    self._only_owner()
    
    assert self.secondary_oracles[oracle], "Not a secondary oracle"
    
    self.secondary_oracles[oracle] = False
    
    # 从列表中移除
    new_list: DynArray[address, 50] = []
    for o: address in self.secondary_oracle_list:
        if o != oracle:
            new_list.append(o)
    self.secondary_oracle_list = new_list
    
    log SecondaryOracleRemoved(oracle, msg.sender)

@external
def submit_secondary_data(asset_id: bytes32, apy: uint256, valuation: uint256):
    """
    @notice 提交次级预言机数据
    @param asset_id 资产ID
    @param apy APY值（基点）
    @param valuation 估值（USD）
    """
    self._when_not_paused()
    
    assert self.secondary_oracles[msg.sender], "Not a secondary oracle"
    
    self.secondary_data[asset_id][msg.sender] = OracleData(
        apy=apy,
        valuation=valuation,
        timestamp=block.timestamp,
        source=msg.sender
    )

# ============================================
# 数据聚合
# ============================================

@external
def aggregate_data(asset_id: bytes32) -> AggregatedData:
    """
    @notice 聚合数据（主+次级预言机）
    @param asset_id 资产ID
    @return 聚合后的数据
    """
    self._when_not_paused()
    
    # 检查缓存
    cached: AggregatedData = self.aggregated_cache[asset_id]
    if cached.timestamp > 0 and (block.timestamp - cached.timestamp) < self.cache_validity:
        return cached
    
    # 尝试从主预言机获取数据
    use_primary: bool = True
    primary_apy: uint256 = 0
    primary_val: uint256 = 0
    
    if staticcall self._primary_oracle.is_data_valid(asset_id):
        primary_apy = staticcall self._primary_oracle.get_apy(asset_id)
        primary_val = staticcall self._primary_oracle.get_valuation(asset_id)
    else:
        use_primary = False
    
    # 如果次级预言机未启用，直接返回主数据
    if not self.secondary_enabled or not use_primary:
        # 检查是否已有缓存
        existing: AggregatedData = self.aggregated_cache[asset_id]
        was_cached: bool = existing.timestamp > 0

        result: AggregatedData = AggregatedData(
            apy=primary_apy,
            valuation=primary_val,
            data_source=DataSource.PRIMARY,
            confidence=10000 if use_primary else 0,
            timestamp=block.timestamp
        )
        self.aggregated_cache[asset_id] = result

        # 维护迁移缓存列表（如果之前没有缓存）
        if not was_cached:
            self.cachedAssetIds.append(asset_id)

        log DataAggregated(asset_id, primary_apy, primary_val, DataSource.PRIMARY, result.confidence)
        return result
    
    # 收集次级预言机数据
    secondary_apys: DynArray[uint256, 50] = []
    secondary_vals: DynArray[uint256, 50] = []
    
    for oracle: address in self.secondary_oracle_list:
        data: OracleData = self.secondary_data[asset_id][oracle]
        # 数据需在1小时内
        if data.timestamp > 0 and (block.timestamp - data.timestamp) < 3600:
            secondary_apys.append(data.apy)
            secondary_vals.append(data.valuation)
    
    # 如果次级数据不足，使用主数据
    if len(secondary_apys) < self.min_secondary_oracles:
        # 检查是否已有缓存
        existing: AggregatedData = self.aggregated_cache[asset_id]
        was_cached: bool = existing.timestamp > 0

        result: AggregatedData = AggregatedData(
            apy=primary_apy,
            valuation=primary_val,
            data_source=DataSource.PRIMARY,
            confidence=10000,
            timestamp=block.timestamp
        )
        self.aggregated_cache[asset_id] = result

        # 维护迁移缓存列表（如果之前没有缓存）
        if not was_cached:
            self.cachedAssetIds.append(asset_id)

        log DataAggregated(asset_id, primary_apy, primary_val, DataSource.PRIMARY, 10000)
        return result
    
    # 计算中位数
    median_apy: uint256 = self._calculate_median(secondary_apys)
    median_val: uint256 = self._calculate_median(secondary_vals)
    
    # 检查偏差
    apy_deviation: uint256 = self._calculate_deviation(primary_apy, median_apy)
    val_deviation: uint256 = self._calculate_deviation(primary_val, median_val)
    
    # 如果偏差过大，发出警报
    if apy_deviation > self.deviation_threshold or val_deviation > self.deviation_threshold:
        log DeviationAlert(asset_id, primary_apy, median_apy, apy_deviation)

        # 检查是否已有缓存
        existing: AggregatedData = self.aggregated_cache[asset_id]
        was_cached: bool = existing.timestamp > 0

        # 使用次级数据
        result: AggregatedData = AggregatedData(
            apy=median_apy,
            valuation=median_val,
            data_source=DataSource.SECONDARY,
            confidence=8000,  # 80%置信度
            timestamp=block.timestamp
        )
        self.aggregated_cache[asset_id] = result

        # 维护迁移缓存列表（如果之前没有缓存）
        if not was_cached:
            self.cachedAssetIds.append(asset_id)

        log DataSourceSwitched(asset_id, DataSource.PRIMARY, DataSource.SECONDARY, "High deviation detected")
        log DataAggregated(asset_id, median_apy, median_val, DataSource.SECONDARY, 8000)
        return result

    # 加权平均：主70% + 次级30%
    weighted_apy: uint256 = (primary_apy * 7000 + median_apy * 3000) // 10000
    weighted_val: uint256 = (primary_val * 7000 + median_val * 3000) // 10000

    # 检查是否已有缓存
    existing2: AggregatedData = self.aggregated_cache[asset_id]
    was_cached2: bool = existing2.timestamp > 0

    result: AggregatedData = AggregatedData(
        apy=weighted_apy,
        valuation=weighted_val,
        data_source=DataSource.AGGREGATED,
        confidence=9500,  # 95%置信度
        timestamp=block.timestamp
    )

    self.aggregated_cache[asset_id] = result

    # 维护迁移缓存列表（如果之前没有缓存）
    if not was_cached2:
        self.cachedAssetIds.append(asset_id)

    log DataAggregated(asset_id, weighted_apy, weighted_val, DataSource.AGGREGATED, 9500)

    return result

# ============================================
# 查询函数
# ============================================

@external
@view
def get_aggregated_apy(asset_id: bytes32) -> uint256:
    """
    @notice 获取聚合后的APY
    @param asset_id 资产ID
    @return APY（基点）
    """
    cached: AggregatedData = self.aggregated_cache[asset_id]
    
    # 如果缓存有效，返回缓存
    if cached.timestamp > 0 and (block.timestamp - cached.timestamp) < self.cache_validity:
        return cached.apy
    
    # 否则返回主数据源
    return staticcall self._primary_oracle.get_apy(asset_id)

@external
@view
def get_aggregated_valuation(asset_id: bytes32) -> uint256:
    """
    @notice 获取聚合后的估值
    @param asset_id 资产ID
    @return 估值（USD）
    """
    cached: AggregatedData = self.aggregated_cache[asset_id]
    
    # 如果缓存有效，返回缓存
    if cached.timestamp > 0 and (block.timestamp - cached.timestamp) < self.cache_validity:
        return cached.valuation
    
    # 否则返回主数据源
    return staticcall self._primary_oracle.get_valuation(asset_id)

@external
@view
def get_aggregated_data(asset_id: bytes32) -> AggregatedData:
    """
    @notice 获取完整的聚合数据
    @param asset_id 资产ID
    @return 聚合数据
    """
    return self.aggregated_cache[asset_id]

@external
@view
def get_data_confidence(asset_id: bytes32) -> uint256:
    """
    @notice 获取数据置信度
    @param asset_id 资产ID
    @return 置信度（基点）
    """
    cached: AggregatedData = self.aggregated_cache[asset_id]
    
    # 检查缓存是否有效
    if cached.timestamp == 0 or (block.timestamp - cached.timestamp) >= self.cache_validity:
        return 0
    
    return cached.confidence

@external
@view
def get_secondary_oracle_count() -> uint256:
    """
    @notice 获取次级预言机数量
    @return 数量
    """
    return len(self.secondary_oracle_list)

@external
@view
def is_secondary_oracle(addr: address) -> bool:
    """
    @notice 检查是否为次级预言机
    @param addr 地址
    @return 是否为次级预言机
    """
    return self.secondary_oracles[addr]

# ============================================
# 内部辅助函数
# ============================================

@internal
@view
def _calculate_median(values: DynArray[uint256, 50]) -> uint256:
    """
    @notice 计算中位数
    @param values 数值数组
    @return 中位数
    """
    if len(values) == 0:
        return 0
    
    # 冒泡排序（简单实现）
    sorted_values: DynArray[uint256, 50] = values
    n: uint256 = len(sorted_values)
    
    for i: uint256 in range(50):
        if i >= n:
            break
        for j: uint256 in range(50):
            if j >= n - i - 1:
                break
            if sorted_values[j] > sorted_values[j + 1]:
                temp: uint256 = sorted_values[j]
                sorted_values[j] = sorted_values[j + 1]
                sorted_values[j + 1] = temp
    
    # 返回中位数
    mid: uint256 = n // 2
    if n % 2 == 0:
        return (sorted_values[mid - 1] + sorted_values[mid]) // 2
    else:
        return sorted_values[mid]

@internal
@view
def _calculate_deviation(value1: uint256, value2: uint256) -> uint256:
    """
    @notice 计算偏差率
    @param value1 值1
    @param value2 值2
    @return 偏差率（基点）
    """
    if value1 == 0:
        return 0
    
    if value1 > value2:
        return (value1 - value2) * 10000 // value1
    else:
        return (value2 - value1) * 10000 // value1

# ============================================
# 管理函数
# ============================================

@external
def set_cache_validity(new_validity: uint256):
    """
    @notice 设置缓存有效期
    @param new_validity 新有效期（秒）
    """
    self._only_owner()
    
    assert new_validity >= 60, "Validity too short"  # 至少1分钟
    assert new_validity <= 86400, "Validity too long"  # 最多1天
    
    old_validity: uint256 = self.cache_validity
    self.cache_validity = new_validity
    
    log ThresholdUpdated("cache_validity", old_validity, new_validity)

@external
def set_deviation_threshold(new_threshold: uint256):
    """
    @notice 设置偏差阈值
    @param new_threshold 新阈值（基点）
    """
    self._only_owner()
    
    assert new_threshold <= 5000, "Threshold too high"  # 最多50%
    
    old_threshold: uint256 = self.deviation_threshold
    self.deviation_threshold = new_threshold
    
    log ThresholdUpdated("deviation_threshold", old_threshold, new_threshold)

@external
def set_min_secondary_oracles(new_min: uint256):
    """
    @notice 设置最小次级预言机数量
    @param new_min 新的最小数量
    """
    self._only_owner()
    
    assert new_min >= 3, "Min too low"
    assert new_min <= len(self.secondary_oracle_list), "Exceeds oracle count"
    
    old_min: uint256 = self.min_secondary_oracles
    self.min_secondary_oracles = new_min
    
    log ThresholdUpdated("min_secondary_oracles", old_min, new_min)

@external
def enable_secondary_oracles():
    """
    @notice 启用次级预言机
    """
    self._only_owner()
    
    assert len(self.secondary_oracle_list) >= self.min_secondary_oracles, "Not enough oracles"
    
    self.secondary_enabled = True

@external
def disable_secondary_oracles():
    """
    @notice 禁用次级预言机
    """
    self._only_owner()
    
    self.secondary_enabled = False

@external
def clear_cache(asset_id: bytes32):
    """
    @notice 清除缓存
    @param asset_id 资产ID
    """
    self._only_owner()
    
    self.aggregated_cache[asset_id] = AggregatedData(
        apy=0,
        valuation=0,
        data_source=DataSource.PRIMARY,
        confidence=0,
        timestamp=0
    )

@external
def pause():
    """
    @notice 暂停合约
    """
    self._only_owner()
    self.paused = True

@external
def unpause():
    """
    @notice 恢复合约
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


# ==================== 依赖查询功能 ====================

@external
def getDependencies() -> address[1]:
    """
    @notice 获取合约依赖地址
    @return [primary_oracle] 主预言机合约地址
    @dev DataAggregator 依赖 RWAOracle
    """
    return [self._primary_oracle.address]


@external
def checkDependenciesBound() -> bool:
    """
    @notice 检查依赖是否已绑定
    @return True 如果所有依赖已配置（非零地址）
    @dev RWAOracle 必须已配置
    """
    return self._primary_oracle.address != empty(address)


@external
@view
def primary_oracle() -> address:
    """
    @notice 获取主预言机地址（用于迁移）
    @return 主预言机合约地址
    """
    return self._primary_oracle.address


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
    extcall IDataAggregatorMigration(newContract).receiveMigration(self)

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
@view
def getSecondaryOracleList() -> DynArray[address, 50]:
    """
    @notice 获取次级预言机列表（用于迁移）
    @return 次级预言机地址动态数组
    """
    return self.secondary_oracle_list


@external
@view
def getSecondaryData(_assetId: bytes32, _oracle: address) -> OracleData:
    """
    @notice 获取次级预言机数据（用于迁移）
    @param _assetId 资产ID
    @param _oracle 预言机地址
    @return 预言机数据
    """
    return self.secondary_data[_assetId][_oracle]


@external
@view
def getAggregatedCache(_assetId: bytes32) -> AggregatedData:
    """
    @notice 获取聚合缓存数据（用于迁移）
    @param _assetId 资产ID
    @return 聚合数据
    """
    return self.aggregated_cache[_assetId]


@external
def receiveMigration(oldContract: address):
    """
    @notice 从旧合约接收迁移状态
    @param oldContract 旧合约地址
    @dev 只有旧合约可以调用此函数
    """
    assert msg.sender == oldContract, "Only old contract"

    old: IDataAggregatorMigration = IDataAggregatorMigration(oldContract)

    # 迁移基本状态变量
    self.owner = staticcall old.owner()
    self.paused = staticcall old.paused()
    self.cache_validity = staticcall old.cache_validity()
    self.deviation_threshold = staticcall old.deviation_threshold()
    self.min_secondary_oracles = staticcall old.min_secondary_oracles()
    self.secondary_enabled = staticcall old.secondary_enabled()

    # 迁移主预言机地址（需要重新转换为接口类型）
    primary_oracle_addr: address = staticcall old.primary_oracle()
    self._primary_oracle = IRWAOracle(primary_oracle_addr)

    # 迁移次级预言机列表
    secondary_oracles: DynArray[address, 50] = staticcall old.getSecondaryOracleList()
    for oracle: address in secondary_oracles:
        self.secondary_oracles[oracle] = True
        self.secondary_oracle_list.append(oracle)

    # 迁移缓存资产ID列表和聚合缓存
    cached_asset_ids: DynArray[bytes32, 1000] = staticcall old.cachedAssetIds()
    for asset_id: bytes32 in cached_asset_ids:
        # 迁移聚合缓存数据
        agg_data: AggregatedData = staticcall old.getAggregatedCache(asset_id)
        self.aggregated_cache[asset_id] = agg_data
        self.cachedAssetIds.append(asset_id)

        # 迁移该资产的所有次级预言机数据
        for oracle: address in secondary_oracles:
            sec_data: OracleData = staticcall old.getSecondaryData(asset_id, oracle)
            self.secondary_data[asset_id][oracle] = sec_data

