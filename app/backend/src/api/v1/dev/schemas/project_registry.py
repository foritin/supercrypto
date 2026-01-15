"""
项目注册表 API Schemas

Story 10.5: 项目状态 API Endpoints
"""

from typing import Dict, List, Optional

from pydantic import BaseModel, Field


# ===== 通用响应 =====


class ProjectSummary(BaseModel):
    """项目摘要"""

    name: str
    description: Optional[str] = None
    contract_count: int
    readiness: str
    primary_contract: Optional[str] = None


class ProjectListResponse(BaseModel):
    """项目列表响应"""

    projects: List[ProjectSummary]


# ===== 状态响应 =====


class ContractStatusInfo(BaseModel):
    """合约状态信息"""

    name: str
    dependency_type: str
    status: Optional[str] = None
    address: Optional[str] = None
    is_primary: bool = False
    is_ready: bool = False
    is_deployed: bool = False
    missing_required_deps: List[str] = []
    missing_optional_deps: List[str] = []
    zero_bound_deps: List[str] = []
    blocking_reason: Optional[str] = None


class ProjectStatistics(BaseModel):
    """项目统计"""

    total_contracts: int
    registered_count: int
    deployed_count: int
    active_count: int


class ProjectStatusResponse(BaseModel):
    """项目状态响应"""

    project_name: str
    readiness: str
    summary: str
    statistics: ProjectStatistics
    primary_contract: Optional[ContractStatusInfo] = None
    contracts: List[ContractStatusInfo]
    blocking_contracts: List[str] = []
    deployable_contracts: List[str] = []


# ===== 部署顺序响应 =====


class DeploymentStepInfo(BaseModel):
    """部署步骤信息"""

    order: int
    name: str
    deploy_order: int = 0
    is_deployed: bool = False
    dependencies: List[str] = []


class DeploymentOrderResponse(BaseModel):
    """部署顺序响应"""

    project_name: str
    total_steps: int
    pending_count: int
    deployed_count: int
    phases: Dict[str, List[DeploymentStepInfo]]
    flat_order: List[str]
    next_deployable: List[str]


# ===== 依赖图响应 =====


class NodePosition(BaseModel):
    """节点位置"""

    x: float
    y: float


class NodeData(BaseModel):
    """节点数据"""

    label: str
    dependency_type: str
    status: Optional[str] = None
    address: Optional[str] = None
    is_ready: bool = False


class GraphNode(BaseModel):
    """React Flow 节点"""

    id: str
    type: str = "contract"
    position: NodePosition
    data: NodeData


class EdgeStyle(BaseModel):
    """边样式"""

    stroke: str = "#64748b"
    strokeWidth: int = 2


class GraphEdge(BaseModel):
    """React Flow 边"""

    id: str
    source: str
    target: str
    type: str = "smoothstep"
    animated: bool = False
    style: EdgeStyle = Field(default_factory=EdgeStyle)
    label: Optional[str] = None


class DependencyGraphResponse(BaseModel):
    """依赖图响应"""

    nodes: List[GraphNode]
    edges: List[GraphEdge]


# ===== 同步响应 =====


class SyncStats(BaseModel):
    """同步统计"""

    created: int
    updated: int
    unchanged: int
    contracts: List[str]


class SyncResponse(BaseModel):
    """同步响应"""

    success: bool
    project_name: str
    stats: SyncStats
    error: Optional[str] = None


# ===== 绑定同步 =====


class BindingInfo(BaseModel):
    """绑定信息"""

    address: str
    is_bound: bool = False
    is_zero: bool = False
    last_synced: Optional[str] = None


class ContractBindingStatus(BaseModel):
    """合约绑定状态"""

    contract_name: str
    address: Optional[str] = None
    status: Optional[str] = None
    is_deployed: bool = False
    bindings: Dict[str, BindingInfo] = {}
    updated_at: Optional[str] = None


class UpdateBindingsRequest(BaseModel):
    """更新绑定请求"""

    bindings: Dict[str, str] = Field(
        ..., description="绑定地址映射 {dependency_name: address}"
    )


class UpdateDeploymentRequest(BaseModel):
    """更新部署状态请求"""

    address: Optional[str] = Field(None, description="合约部署地址")
    status: Optional[str] = Field(None, description="合约状态")


class BindingSyncResultInfo(BaseModel):
    """单个合约同步结果"""

    contract_name: str
    success: bool
    bindings_updated: int = 0
    status_changed: bool = False
    old_status: Optional[str] = None
    new_status: Optional[str] = None
    error: Optional[str] = None


class ProjectBindingSyncResponse(BaseModel):
    """项目绑定同步响应"""

    project_name: str
    network: str
    total_contracts: int
    synced_count: int
    failed_count: int
    results: List[BindingSyncResultInfo]
    elapsed_ms: float
