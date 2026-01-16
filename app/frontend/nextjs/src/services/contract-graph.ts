/**
 * Contract Graph API Service
 * 合约依赖关系图 API (纯 Provider 模式)
 *
 * 用于 React Flow 可视化组件
 */
import { api } from "@/services/api";
import { ADMIN_PATHS } from "@/constants/api-paths";

// 图节点数据（纯 Provider 模式）
export interface GraphNode {
  id: string;
  label: string;
  type: "exclusive" | "common" | "mock";
  module: "kyc" | "stablecoin" | "business" | "oracle" | null;
  address: string;
  status: "ready" | "not_deployed" | "not_registered" | "missing_deps";
  project: string;
  deployedAt: string | null;
  isRegistered: boolean;           // 是否注册到 Provider
  providerAddress: string | null;  // Provider 上的地址
  missingDeps: string[];           // 缺失的依赖 Key 列表
  isDeleted?: boolean;             // 是否已删除（解绑）
}

// 图边数据（纯 Provider 模式）
export interface GraphEdge {
  source: string;
  target: string;
  key: string;                      // Provider Key
  status: "registered" | "not_registered";
  registeredAddress: string | null;
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
   *   nodes: [{id, label, type, address, status, project, isRegistered, ...}],
   *   edges: [{source, target, key, status, registeredAddress}]
   * }
   */
  async getDependencyGraph(): Promise<DependencyGraphData> {
    const response = await api.get<API.ResponseData<DependencyGraphData>>(
      ADMIN_PATHS.CONTRACT_DEPENDENCY_GRAPH
    );
    return response.object_data as DependencyGraphData;
  },
};
