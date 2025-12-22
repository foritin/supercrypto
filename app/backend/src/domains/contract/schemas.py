"""
Contract Schemas
合约相关的数据模式
"""
from pydantic import BaseModel, Field
from typing import Optional, List


class ContractAddress(BaseModel):
    """单个合约地址"""
    name: str = Field(..., description="合约名称")
    address: str = Field(..., description="合约地址")
    deploy_step: str = Field(..., description="部署阶段")
    network: str = Field(..., description="网络")


class ContractDependency(BaseModel):
    """合约依赖关系"""
    contract_name: str = Field(..., description="合约名称")
    depends_on: List[str] = Field(default=[], description="依赖的合约列表")
    set_functions: List[str] = Field(default=[], description="可用的 set 函数")


class ContractStatus(BaseModel):
    """合约状态"""
    name: str = Field(..., description="合约名称")
    address: Optional[str] = Field(None, description="合约地址")
    deploy_step: str = Field(..., description="部署阶段")
    deployed: bool = Field(..., description="是否已部署")
    deployed_at: Optional[str] = Field(None, description="部署时间 (ISO format)")
    dependencies: dict = Field(default={}, description="依赖的合约地址")
    set_functions: List[str] = Field(default=[], description="可用的 set 函数")


class ContractStatusList(BaseModel):
    """合约状态列表"""
    contracts: List[ContractStatus] = Field(..., description="合约列表")
    network: str = Field(..., description="当前网络")


class UpdateContractAddressRequest(BaseModel):
    """更新合约地址请求"""
    target_contract: str = Field(..., description="目标合约名称 (调用 set 函数的合约)")
    set_function: str = Field(..., description="要调用的 set 函数名称")
    new_address: str = Field(..., description="新地址")


# ========== 依赖状态相关 ==========

class DependencyStatus(BaseModel):
    """单个依赖的状态"""
    dependency_name: str = Field(..., description="被依赖的合约名称")
    set_function: str = Field(..., description="更新函数名")
    status: str = Field(..., description="状态: synced/needs_update/not_deployed")
    current_address: Optional[str] = Field(None, description="当前同步的地址")
    latest_address: Optional[str] = Field(None, description="最新部署的地址")
    last_synced_at: Optional[str] = Field(None, description="上次同步时间")


class ContractStatusEnhanced(BaseModel):
    """增强版合约状态（含依赖检测）"""
    name: str = Field(..., description="合约名称")
    project: str = Field(..., description="项目分组: common/mock/fake")
    address: Optional[str] = Field(None, description="合约地址")
    deploy_step: str = Field(..., description="部署阶段")
    deployed: bool = Field(..., description="是否已部署")
    deployed_at: Optional[str] = Field(None, description="部署时间")
    # 依赖状态
    dependency_status: str = Field("synced", description="总体依赖状态: synced/needs_update/not_deployed")
    dependencies: List[DependencyStatus] = Field(default=[], description="依赖列表")
    set_functions: List[str] = Field(default=[], description="可用的 set 函数")


class ProjectInfo(BaseModel):
    """项目信息"""
    name: str = Field(..., description="项目标识")
    label: str = Field(..., description="项目显示名称")
    description: str = Field(..., description="项目描述")
    color: str = Field(..., description="项目颜色")
    order: int = Field(..., description="排序顺序")


class ContractStatusListEnhanced(BaseModel):
    """增强版合约状态列表"""
    contracts: List[ContractStatusEnhanced] = Field(..., description="合约列表")
    projects: List[ProjectInfo] = Field(..., description="项目列表")
    network: str = Field(..., description="当前网络")
    needs_update_count: int = Field(0, description="需要更新的合约数量")


class ConfirmSyncRequest(BaseModel):
    """确认同步请求"""
    contract_name: str = Field(..., description="合约名称")
    dependency_name: str = Field(..., description="被依赖的合约名称")
    tx_hash: str = Field(..., description="交易哈希")
    new_address: str = Field(..., description="新地址")


class ResetDeployRequest(BaseModel):
    """重置部署记录请求"""
    confirm: str = Field(..., description="确认字符串，必须为 'RESET'")


class ContractAddressesResponse(BaseModel):
    """所有合约地址响应"""
    # Mock Tokens
    mock_usdt: Optional[str] = Field(None, description="MockUSDT 合约地址")
    mock_usdc: Optional[str] = Field(None, description="MockUSDC 合约地址")
    
    # STO Base
    kyc_manager: Optional[str] = Field(None, description="KYCManager 合约地址")
    rwa_token: Optional[str] = Field(None, description="RWATokenSTO 合约地址")
    platform_token: Optional[str] = Field(None, description="PlatformToken 合约地址")
    
    # STO Business
    subscription: Optional[str] = Field(None, description="Subscription 合约地址")
    staking: Optional[str] = Field(None, description="Staking 合约地址")
    liquidity_mining: Optional[str] = Field(None, description="LiquidityMining 合约地址")
    
    # Network info
    network: str = Field(..., description="当前网络")


class SubscriptionParams(BaseModel):
    """认购合约参数"""
    min_investment: int = Field(..., description="最小投资额 (USDT, 6 decimals)")
    max_investment: int = Field(..., description="最大投资额 (0=无限制)")
    require_accredited: bool = Field(..., description="是否要求合格投资者")
    paused: bool = Field(..., description="是否暂停")
    
    # APY (basis points, 10000 = 100%)
    apy_1m: int = Field(..., description="1个月锁定期 APY (基点)")
    apy_3m: int = Field(..., description="3个月锁定期 APY (基点)")
    apy_6m: int = Field(..., description="6个月锁定期 APY (基点)")
    apy_12m: int = Field(..., description="12个月锁定期 APY (基点)")


class SubscriptionContractInfo(BaseModel):
    """认购合约完整信息"""
    address: str = Field(..., description="合约地址")
    params: SubscriptionParams = Field(..., description="合约参数")
    usdt_address: str = Field(..., description="USDT 代币地址")
    rwa_token_address: str = Field(..., description="RWA Token 地址")
    kyc_manager_address: str = Field(..., description="KYC Manager 地址")

