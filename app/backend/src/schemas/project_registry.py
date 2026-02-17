"""
项目配置 Pydantic Schemas

Story 10.2: 项目配置 YAML 定义与加载
"""

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


class DependencyTypeEnum(str, Enum):
    """依赖类型枚举 (用于 YAML 验证)"""

    PRIMARY = "PRIMARY"
    REQUIRED = "REQUIRED"
    BUSINESS = "BUSINESS"
    OPTIONAL = "OPTIONAL"


class ContractConfigSchema(BaseModel):
    """单个合约配置 Schema"""

    name: str = Field(..., min_length=1, description="合约名称")
    type: DependencyTypeEnum = Field(
        default=DependencyTypeEnum.BUSINESS, description="依赖类型"
    )
    description: Optional[str] = Field(default=None, description="合约描述")
    module: Optional[str] = Field(
        default=None, pattern=r"^(common|mock|project)?$", description="所属模块"
    )
    required_deps: List[str] = Field(default_factory=list, description="必须依赖列表")
    optional_deps: List[str] = Field(default_factory=list, description="可选依赖列表")
    deploy_order: int = Field(default=0, ge=0, description="部署顺序")
    allow_zero_address: bool = Field(default=True, description="是否允许零地址绑定")
    environments: List[str] = Field(default_factory=list, description="适用环境")
    production_address: Optional[str] = Field(
        default=None, pattern=r"^0x[a-fA-F0-9]{40}$", description="生产环境固定地址"
    )

    @field_validator("required_deps", "optional_deps", mode="before")
    @classmethod
    def ensure_list(cls, v):
        if v is None:
            return []
        return v


class DeploymentPhaseSchema(BaseModel):
    """部署阶段 Schema"""

    phase: int = Field(..., ge=1, description="阶段编号")
    name: str = Field(..., description="阶段名称")
    description: Optional[str] = Field(default=None, description="阶段描述")
    contracts: List[str] = Field(..., description="该阶段合约列表")


class BindingRulesSchema(BaseModel):
    """绑定规则 Schema"""

    allow_late_binding: List[str] = Field(
        default_factory=list, description="允许后置绑定的依赖"
    )
    require_immediate_binding: List[str] = Field(
        default_factory=list, description="必须立即绑定的依赖"
    )


class ProjectConfigSchema(BaseModel):
    """项目配置 Schema"""

    project_name: str = Field(..., min_length=1, description="项目名称")
    description: Optional[str] = Field(default=None, description="项目描述")
    version: Optional[str] = Field(default=None, description="配置版本")
    primary_contract: str = Field(..., min_length=1, description="主合约名称")
    contracts: List[ContractConfigSchema] = Field(..., description="合约配置列表")
    deployment_phases: List[DeploymentPhaseSchema] = Field(
        default_factory=list, description="部署阶段"
    )
    binding_rules: Optional[BindingRulesSchema] = Field(
        default=None, description="绑定规则"
    )

    @model_validator(mode="after")
    def validate_primary_exists(self):
        """验证主合约存在于合约列表中"""
        contract_names = [c.name for c in self.contracts]
        if self.primary_contract not in contract_names:
            raise ValueError(
                f"主合约 '{self.primary_contract}' 未在 contracts 列表中定义"
            )
        return self

    @model_validator(mode="after")
    def validate_primary_type(self):
        """验证主合约类型为 PRIMARY"""
        for c in self.contracts:
            if c.name == self.primary_contract:
                if c.type != DependencyTypeEnum.PRIMARY:
                    raise ValueError(
                        f"主合约 '{self.primary_contract}' 的类型必须为 PRIMARY，当前为 {c.type.value}"
                    )
                break
        return self

    def get_contract_config(self, name: str) -> Optional[ContractConfigSchema]:
        """获取指定合约的配置"""
        for c in self.contracts:
            if c.name == name:
                return c
        return None

    def get_contracts_by_type(
        self, dep_type: DependencyTypeEnum
    ) -> List[ContractConfigSchema]:
        """获取指定类型的所有合约"""
        return [c for c in self.contracts if c.type == dep_type]


# ============================================
# 从 project_registry_service.py 提取的 dataclass
# ============================================

from dataclasses import dataclass, field
from typing import Dict, List, Optional

from src.schemas.enums.contract import (
    ContractRegistryStatus,
    DependencyType,
    ProjectReadiness,
)


@dataclass
class ContractReadinessInfo:
    """单个合约就绪信息"""

    contract_name: str
    config_id: Optional[int] = None
    dependency_type: DependencyType = DependencyType.BUSINESS
    is_primary: bool = False

    # 状态信息
    is_registered: bool = False
    is_deployed: bool = False
    current_status: Optional[ContractRegistryStatus] = None
    address: Optional[str] = None
    network: Optional[str] = None

    # 依赖信息
    required_deps: List[str] = field(default_factory=list)
    optional_deps: List[str] = field(default_factory=list)
    missing_required_deps: List[str] = field(default_factory=list)
    missing_optional_deps: List[str] = field(default_factory=list)
    zero_bound_deps: List[str] = field(default_factory=list)

    # 就绪判断
    is_ready: bool = False
    blocking_reason: Optional[str] = None

    @property
    def can_deploy(self) -> bool:
        """是否可以部署（所有必须依赖已部署）"""
        return len(self.missing_required_deps) == 0 and not self.is_deployed


@dataclass
class ProjectStatusReport:
    """项目状态报告"""

    project_name: str
    readiness: ProjectReadiness = ProjectReadiness.NOT_READY

    # 统计
    total_contracts: int = 0
    registered_count: int = 0
    deployed_count: int = 0
    active_count: int = 0

    # 分类
    primary_contract: Optional[ContractReadinessInfo] = None
    contracts: Dict[str, ContractReadinessInfo] = field(default_factory=dict)

    # 分析
    blocking_contracts: List[str] = field(default_factory=list)
    deployable_contracts: List[str] = field(default_factory=list)
    missing_dependencies: Dict[str, List[str]] = field(default_factory=dict)

    # 摘要
    summary: str = ""


@dataclass
class BindingSyncResult:
    """单个合约同步结果"""

    contract_name: str
    success: bool
    bindings_updated: int = 0
    status_changed: bool = False
    old_status: Optional[str] = None
    new_status: Optional[str] = None
    error: Optional[str] = None


@dataclass
class ProjectSyncResult:
    """项目同步结果"""

    project_name: str
    network: str
    total_contracts: int
    synced_count: int
    failed_count: int
    results: List[BindingSyncResult] = field(default_factory=list)
    elapsed_ms: float = 0.0
