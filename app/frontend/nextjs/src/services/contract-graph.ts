/**
 * Contract Graph API Service
 * 合约依赖关系图 API
 *
 * 用于 React Flow 可视化组件
 */
import { api } from "@/services/api";
import { ADMIN_PATHS } from "@/constants/api-paths";

// 图节点数据
export interface GraphNode {
  id: string;
  label: string;
  type: "exclusive" | "common" | "mock";
  module: "kyc" | "stablecoin" | "business" | "oracle" | null;  // 原始模块类型
  address: string;
  status: "synced" | "needs_update";
  project: string;  // 项目归属（如 vanke）
  deployedAt: string | null;
}

// 图边数据
export interface GraphEdge {
  source: string;
  target: string;
  label: string;
  setFunction: string;
  status: "synced" | "needs_update" | "not_deployed";
  currentAddress: string | null;
  latestAddress: string | null;
  isBinded: boolean;
  isDeployed: boolean;
}

// 依赖关系图数据
export interface DependencyGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * 合约依赖关系图服务
 */
export const contractGraphService = {
  /**
   * 获取合约依赖关系图数据
   *
   * 返回用于前端可视化图的数据结构：
   * {
   *   nodes: [{id, label, type, address, status, project, deployedAt}],
   *   edges: [{source, target, label, setFunction, status, ...}]
   * }
   */
  async getDependencyGraph(): Promise<DependencyGraphData> {
    const response = await api.get<API.ResponseData<DependencyGraphData>>(
      ADMIN_PATHS.CONTRACT_DEPENDENCY_GRAPH
    );
    return response.object as DependencyGraphData;
  },
};
