/**
 * 项目注册表数据获取 Hooks
 *
 * Story 10.7: 前端项目状态仪表盘
 * Story 10.8: 依赖图可视化
 */

import { useQuery } from '@tanstack/react-query';
import type {
  ProjectListResponse,
  ProjectStatusResponse,
  DeploymentOrderResponse,
  DependencyGraphResponse,
  SyncResponse,
  ProjectBindingSyncResponse,
} from '@/types/project-registry';


const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1/dev';

const fetcher = async <T>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error('请求失败');
    throw error;
  }
  return res.json();
};


// ===== React Query Hooks =====

/**
 * 获取项目列表
 */
export function useProjects(network: string = 'local') {
  return useQuery<ProjectListResponse>({
    queryKey: ['projects', network],
    queryFn: () => fetcher(`${API_BASE}/projects?network=${network}`),
    refetchInterval: 30000, // 30 秒刷新
  });
}


/**
 * 获取项目状态
 */
export function useProjectStatus(name: string | null, network: string = 'local') {
  return useQuery<ProjectStatusResponse>({
    queryKey: ['projectStatus', name, network],
    queryFn: () => fetcher(`${API_BASE}/projects/${name}/status?network=${network}`),
    enabled: !!name,
    refetchInterval: 10000, // 10 秒刷新
  });
}


/**
 * 获取部署顺序
 */
export function useDeploymentOrder(name: string | null, network: string = 'local', excludeDeployed: boolean = false) {
  return useQuery<DeploymentOrderResponse>({
    queryKey: ['deploymentOrder', name, network, excludeDeployed],
    queryFn: () => fetcher(`${API_BASE}/projects/${name}/deployment-order?network=${network}&exclude_deployed=${excludeDeployed}`),
    enabled: !!name,
  });
}


/**
 * 获取依赖图数据
 */
export function useDependencyGraph(name: string | null, network: string = 'local') {
  return useQuery<DependencyGraphResponse>({
    queryKey: ['dependencyGraph', name, network],
    queryFn: () => fetcher(`${API_BASE}/projects/${name}/dependency-graph?network=${network}`),
    enabled: !!name,
    refetchInterval: 30000, // 30 秒刷新
  });
}


// ===== 操作函数 =====

/**
 * 同步项目配置到数据库
 */
export async function syncProjectConfig(name: string, force: boolean = false): Promise<SyncResponse> {
  const res = await fetch(`${API_BASE}/projects/${name}/sync?force=${force}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('同步失败');
  return res.json();
}


/**
 * 同步项目绑定状态（从链上读取）
 */
export async function syncProjectBindings(name: string, network: string = 'local'): Promise<ProjectBindingSyncResponse> {
  const res = await fetch(`${API_BASE}/projects/${name}/sync-bindings?network=${network}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('同步失败');
  return res.json();
}


/**
 * 更新合约部署状态
 */
export async function updateContractDeployment(
  projectName: string,
  contractName: string,
  address: string,
  status: string,
  network: string = 'local'
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/projects/${projectName}/contracts/${contractName}/deployment?network=${network}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, status }),
    }
  );
  if (!res.ok) throw new Error('更新失败');
}


/**
 * 更新合约绑定
 */
export async function updateContractBindings(
  projectName: string,
  contractName: string,
  bindings: Record<string, string>,
  network: string = 'local'
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/projects/${projectName}/contracts/${contractName}/bindings?network=${network}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bindings }),
    }
  );
  if (!res.ok) throw new Error('更新失败');
}
