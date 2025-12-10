# @version ^0.4.0

"""
@title OracleConsumer - 预言机消费者示例
@author SuperCrypto Team
@notice 演示如何使用RWA预言机系统获取数据并应用到业务逻辑
@dev 包含与Subscription.vy集成的示例、基于收益率的动态定价
"""

# ============================================
# 接口定义
# ============================================

interface IDataAggregator:
    def get_aggregated_apy(asset_id: bytes32) -> uint256: view
    def get_aggregated_valuation(asset_id: bytes32) -> uint256: view
    def get_data_confidence(asset_id: bytes32) -> uint256: view
    def aggregate_data(asset_id: bytes32) -> AggregatedData: view

interface IRWAOracle:
    def get_apy(asset_id: bytes32) -> uint256: view
    def get_valuation(asset_id: bytes32) -> uint256: view
    def get_compliance_status(asset_id: bytes32) -> ComplianceStatus: view
    def is_data_valid(asset_id: bytes32) -> bool: view

# ============================================
# 数据结构
# ============================================

flag ComplianceStatus:
    COMPLIANT
    UNDER_REVIEW
    NON_COMPLIANT
    SUSPENDED

flag DataSource:
    PRIMARY
    SECONDARY
    AGGREGATED

struct AggregatedData:
    apy: uint256
    valuation: uint256
    data_source: DataSource
    confidence: uint256
    timestamp: uint256

struct PricingConfig:
    base_price: uint256          # 基础价格（USDT，6位小数）
    min_confidence: uint256      # 最小置信度（基点）
    apy_multiplier: uint256      # APY乘数（基点）
    valuation_weight: uint256    # 估值权重（基点）

# ============================================
# 事件定义
# ============================================

event PriceCalculated:
    asset_id: indexed(bytes32)
    price: uint256
    apy: uint256
    confidence: uint256

event PricingConfigUpdated:
    asset_id: indexed(bytes32)
    base_price: uint256
    min_confidence: uint256

event InvestmentValidated:
    asset_id: indexed(bytes32)
    investor: indexed(address)
    amount: uint256
    is_valid: bool

# ============================================
# 状态变量
# ============================================

# 合约所有者
owner: public(address)

# 数据聚合器
aggregator: public(IDataAggregator)

# RWA预言机（直接访问）
oracle: public(IRWAOracle)

# 定价配置 asset_id => PricingConfig
pricing_configs: public(HashMap[bytes32, PricingConfig])

# 是否使用聚合数据
use_aggregator: public(bool)

# ============================================
# 构造函数
# ============================================

@deploy
def __init__(aggregator_addr: address, oracle_addr: address):
    """
    @notice 初始化预言机消费者
    @param aggregator_addr 数据聚合器地址
    @param oracle_addr RWA预言机地址
    """
    assert aggregator_addr != empty(address), "Invalid aggregator"
    assert oracle_addr != empty(address), "Invalid oracle"
    
    self.owner = msg.sender
    self.aggregator = IDataAggregator(aggregator_addr)
    self.oracle = IRWAOracle(oracle_addr)
    self.use_aggregator = True

# ============================================
# 修饰器辅助函数
# ============================================

@internal
@view
def _only_owner():
    """仅所有者可调用"""
    assert msg.sender == self.owner, "Only owner"

# ============================================
# 定价功能
# ============================================

@external
def set_pricing_config(
    asset_id: bytes32,
    base_price: uint256,
    min_confidence: uint256,
    apy_multiplier: uint256,
    valuation_weight: uint256
):
    """
    @notice 设置资产定价配置
    @param asset_id 资产ID
    @param base_price 基础价格（USDT，6位小数）
    @param min_confidence 最小置信度（基点）
    @param apy_multiplier APY乘数（基点）
    @param valuation_weight 估值权重（基点）
    """
    self._only_owner()
    
    assert base_price > 0, "Invalid base price"
    assert min_confidence <= 10000, "Invalid confidence"
    
    self.pricing_configs[asset_id] = PricingConfig(
        base_price=base_price,
        min_confidence=min_confidence,
        apy_multiplier=apy_multiplier,
        valuation_weight=valuation_weight
    )
    
    log PricingConfigUpdated(asset_id, base_price, min_confidence)

@internal
@view
def _calculate_token_price(asset_id: bytes32) -> uint256:
    """
    @notice 内部：计算代币价格
    """
    config: PricingConfig = self.pricing_configs[asset_id]
    assert config.base_price > 0, "Config not set"
    
    # 获取数据
    apy: uint256 = 0
    confidence: uint256 = 0
    
    if self.use_aggregator:
        apy = staticcall self.aggregator.get_aggregated_apy(asset_id)
        confidence = staticcall self.aggregator.get_data_confidence(asset_id)
    else:
        apy = staticcall self.oracle.get_apy(asset_id)
        confidence = 10000  # 直接使用预言机时假设100%置信度
    
    # 检查置信度
    assert confidence >= config.min_confidence, "Confidence too low"
    
    # 计算价格调整因子
    # adjustment = 10000 + (apy * apy_multiplier / 10000)
    adjustment: uint256 = 10000 + (apy * config.apy_multiplier // 10000)
    
    # 计算最终价格
    price: uint256 = config.base_price * adjustment // 10000
    
    return price

@external
@view
def calculate_token_price(asset_id: bytes32) -> uint256:
    """
    @notice 计算代币价格（基于APY和估值）
    @param asset_id 资产ID
    @return 价格（USDT，6位小数）
    """
    return self._calculate_token_price(asset_id)

@external
@view
def calculate_subscription_amount(
    asset_id: bytes32,
    usdt_amount: uint256
) -> uint256:
    """
    @notice 计算认购数量（USDT兑换多少代币）
    @param asset_id 资产ID
    @param usdt_amount USDT数量（6位小数）
    @return 代币数量（18位小数）
    
    @dev 示例：如果价格是1.1 USDT/token，投入1000 USDT可获得 1000/1.1 = 909.09 tokens
    """
    price: uint256 = self._calculate_token_price(asset_id)
    assert price > 0, "Invalid price"
    
    # token_amount = usdt_amount * 10^18 / price
    # 因为USDT是6位小数，token是18位小数
    token_amount: uint256 = usdt_amount * 10**18 // price
    
    return token_amount

# ============================================
# 投资验证
# ============================================

@internal
@view
def _validate_investment(asset_id: bytes32, amount: uint256) -> bool:
    """
    @notice 内部：验证投资是否符合条件
    """
    # 检查数据有效性
    if not staticcall self.oracle.is_data_valid(asset_id):
        return False
    
    # 检查合规状态
    compliance: ComplianceStatus = staticcall self.oracle.get_compliance_status(asset_id)
    if compliance != ComplianceStatus.COMPLIANT:
        return False
    
    # 检查置信度（如果使用聚合器）
    if self.use_aggregator:
        config: PricingConfig = self.pricing_configs[asset_id]
        confidence: uint256 = staticcall self.aggregator.get_data_confidence(asset_id)
        if confidence < config.min_confidence:
            return False
    
    return True

@external
@view
def validate_investment(asset_id: bytes32, amount: uint256) -> bool:
    """
    @notice 验证投资是否符合条件
    @param asset_id 资产ID
    @param amount 投资金额（USDT）
    @return 是否有效
    """
    return self._validate_investment(asset_id, amount)

@external
def check_and_log_investment(
    asset_id: bytes32,
    investor: address,
    amount: uint256
) -> bool:
    """
    @notice 检查并记录投资验证
    @param asset_id 资产ID
    @param investor 投资者地址
    @param amount 投资金额
    @return 是否有效
    """
    is_valid: bool = self._validate_investment(asset_id, amount)
    
    log InvestmentValidated(asset_id, investor, amount, is_valid)
    
    return is_valid

# ============================================
# 数据查询（带示例）
# ============================================

@internal
@view
def _get_asset_apy(asset_id: bytes32) -> uint256:
    """
    @notice 内部：获取资产APY
    """
    if self.use_aggregator:
        return staticcall self.aggregator.get_aggregated_apy(asset_id)
    else:
        return staticcall self.oracle.get_apy(asset_id)

@external
@view
def get_asset_apy(asset_id: bytes32) -> uint256:
    """
    @notice 获取资产APY
    @param asset_id 资产ID
    @return APY（基点）
    """
    return self._get_asset_apy(asset_id)

@external
@view
def get_asset_valuation(asset_id: bytes32) -> uint256:
    """
    @notice 获取资产估值
    @param asset_id 资产ID
    @return 估值（USD，6位小数）
    """
    if self.use_aggregator:
        return staticcall self.aggregator.get_aggregated_valuation(asset_id)
    else:
        return staticcall self.oracle.get_valuation(asset_id)

@external
@view
def get_full_asset_info(asset_id: bytes32) -> (uint256, uint256, ComplianceStatus, uint256, bool):
    """
    @notice 获取资产完整信息
    @param asset_id 资产ID
    @return (APY, 估值, 合规状态, 置信度, 数据是否有效)
    """
    apy: uint256 = 0
    valuation: uint256 = 0
    confidence: uint256 = 0
    
    if self.use_aggregator:
        apy = staticcall self.aggregator.get_aggregated_apy(asset_id)
        valuation = staticcall self.aggregator.get_aggregated_valuation(asset_id)
        confidence = staticcall self.aggregator.get_data_confidence(asset_id)
    else:
        apy = staticcall self.oracle.get_apy(asset_id)
        valuation = staticcall self.oracle.get_valuation(asset_id)
        confidence = 10000
    
    compliance: ComplianceStatus = staticcall self.oracle.get_compliance_status(asset_id)
    is_valid: bool = staticcall self.oracle.is_data_valid(asset_id)
    
    return (apy, valuation, compliance, confidence, is_valid)

# ============================================
# 高级查询示例
# ============================================

@external
@view
def get_expected_returns(
    asset_id: bytes32,
    investment_amount: uint256,
    duration_days: uint256
) -> uint256:
    """
    @notice 计算预期收益
    @param asset_id 资产ID
    @param investment_amount 投资金额（USDT）
    @param duration_days 投资天数
    @return 预期收益（USDT）
    
    @dev 公式：returns = investment * (apy / 10000) * (days / 365)
    """
    apy: uint256 = self._get_asset_apy(asset_id)
    
    # 计算年化收益率对应的日收益率
    # daily_rate = apy / 10000 / 365
    # returns = investment * daily_rate * days
    returns: uint256 = investment_amount * apy * duration_days // (10000 * 365)
    
    return returns

@external
@view
def compare_assets(asset_id1: bytes32, asset_id2: bytes32) -> (uint256, uint256):
    """
    @notice 比较两个资产的APY
    @param asset_id1 资产1 ID
    @param asset_id2 资产2 ID
    @return (资产1 APY, 资产2 APY)
    """
    apy1: uint256 = self._get_asset_apy(asset_id1)
    apy2: uint256 = self._get_asset_apy(asset_id2)
    
    return (apy1, apy2)

# ============================================
# 管理函数
# ============================================

@external
def toggle_aggregator():
    """
    @notice 切换是否使用聚合器
    """
    self._only_owner()
    self.use_aggregator = not self.use_aggregator

@external
def set_aggregator(new_aggregator: address):
    """
    @notice 设置新的聚合器地址
    @param new_aggregator 新聚合器地址
    """
    self._only_owner()
    assert new_aggregator != empty(address), "Invalid aggregator"
    self.aggregator = IDataAggregator(new_aggregator)

@external
def set_oracle(new_oracle: address):
    """
    @notice 设置新的预言机地址
    @param new_oracle 新预言机地址
    """
    self._only_owner()
    assert new_oracle != empty(address), "Invalid oracle"
    self.oracle = IRWAOracle(new_oracle)

@external
def transfer_ownership(new_owner: address):
    """
    @notice 转移所有权
    @param new_owner 新所有者地址
    """
    self._only_owner()
    assert new_owner != empty(address), "Invalid owner"
    self.owner = new_owner

