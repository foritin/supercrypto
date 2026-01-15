/**
 * 项目注册表类型定义
 *
 * Story 10.7: 前端项目状态仪表盘
 */

// ===== 枚举类型 =====

export type ProjectReadiness = 'not_ready' | 'partially_ready' | 'fully_ready' | 'unknown' | 'error';
export type ContractStatus = 'not_registered' | 'registered' | 'deployed' | 'bound' | 'active' | 'deprecated';
export type DependencyType = 'primary' | 'required' | 'business' | 'optional';


// ===== 项目列表 =====

export interface ProjectSummary {
  name: string;
  description: string | null;
  contract_count: number;
  readiness: ProjectReadiness;
  primary_contract: string | null;
}

export interface ProjectListResponse {
  projects: ProjectSummary[];
}


// ===== 项目状态 =====

export interface ContractStatusInfo {
  name: string;
  dependency_type: DependencyType;
  status: ContractStatus | null;
  address: string | null;
  is_primary: boolean;
  is_ready: boolean;
  is_deployed: boolean;
  missing_required_deps: string[];
  missing_optional_deps: string[];
  zero_bound_deps: string[];
  blocking_reason: string | null;
}

export interface ProjectStatistics {
  total_contracts: number;
  registered_count: number;
  deployed_count: number;
  active_count: number;
}

export interface ProjectStatusResponse {
  project_name: string;
  readiness: ProjectReadiness;
  summary: string;
  statistics: ProjectStatistics;
  primary_contract: ContractStatusInfo | null;
  contracts: ContractStatusInfo[];
  blocking_contracts: string[];
  deployable_contracts: string[];
}


// ===== 部署顺序 =====

export interface DeploymentStep {
  order: number;
  name: string;
  deploy_order: number;
  is_deployed: boolean;
  dependencies: string[];
}

export interface DeploymentOrderResponse {
  project_name: string;
  total_steps: number;
  pending_count: number;
  deployed_count: number;
  phases: Record<string, DeploymentStep[]>;
  flat_order: string[];
  next_deployable: string[];
}


// ===== 绑定同步 =====

export interface BindingInfo {
  address: string;
  is_bound: boolean;
  is_zero: boolean;
  last_synced: string | null;
}

export interface ContractBindingStatus {
  contract_name: string;
  address: string | null;
  status: ContractStatus | null;
  is_deployed: boolean;
  bindings: Record<string, BindingInfo>;
  updated_at: string | null;
}

export interface BindingSyncResult {
  contract_name: string;
  success: boolean;
  bindings_updated: number;
  status_changed: boolean;
  old_status: string | null;
  new_status: string | null;
  error: string | null;
}

export interface ProjectBindingSyncResponse {
  project_name: string;
  network: string;
  total_contracts: number;
  synced_count: number;
  failed_count: number;
  results: BindingSyncResult[];
  elapsed_ms: number;
}


// ===== 同步操作 =====

export interface SyncStats {
  created: number;
  updated: number;
  unchanged: number;
  contracts: string[];
}

export interface SyncResponse {
  success: boolean;
  project_name: string;
  stats: SyncStats;
  error: string | null;
}


// ===== 依赖图 =====

export interface NodePosition {
  x: number;
  y: number;
}

export interface NodeData {
  label: string;
  dependency_type: DependencyType;
  status: ContractStatus | null;
  address: string | null;
  is_ready: boolean;
}

export interface GraphNode {
  id: string;
  type: string;
  position: NodePosition;
  data: NodeData;
}

export interface EdgeStyle {
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  animated: boolean;
  style: EdgeStyle;
  label?: string;
}

export interface DependencyGraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
