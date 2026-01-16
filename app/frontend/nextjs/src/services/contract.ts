/**
 * Contract API Service
 * 合约相关 API
 *
 * 路由变更：
 * - 公开接口：/public/contracts/*
 * - 管理员接口：/admin/contracts/*
 */
import { api } from "@/services/api";
import { PUBLIC_PATHS, ADMIN_PATHS } from "@/constants/api-paths";
// API.ResponseData 类型已在 types/api.d.ts 中全局声明

// 合约地址响应
export interface ContractAddresses {
  mock_usdt: string | null;
  mock_usdc: string | null;
  kyc_manager: string | null;
  rwa_token: string | null;
  platform_token: string | null;
  subscription: string | null;
  staking: string | null;
  liquidity_mining: string | null;
  network: string;
}

// 认购合约参数
export interface SubscriptionParams {
  min_investment: number;
  max_investment: number;
  require_accredited: boolean;
  paused: boolean;
  apy_1m: number;
  apy_3m: number;
  apy_6m: number;
  apy_12m: number;
}

// 认购合约信息
export interface SubscriptionContractInfo {
  address: string;
  params: SubscriptionParams;
  usdt_address: string;
  rwa_token_address: string;
  kyc_manager_address: string;
}

// 单个合约地址
export interface ContractAddress {
  name: string;
  address: string | null;
  deploy_step: string;
  network: string;
}

export const contractService = {
  /**
   * 获取所有合约地址
   */
  async getAddresses(): Promise<ContractAddresses> {
    const response = await api.get<API.ResponseData<ContractAddresses>>(
      PUBLIC_PATHS.CONTRACT_ADDRESSES
    );
    return response.object_data as ContractAddresses;
  },

  /**
   * 获取认购合约信息
   */
  async getSubscriptionContract(): Promise<SubscriptionContractInfo | null> {
    const response = await api.get<API.ResponseData<SubscriptionContractInfo>>(
      PUBLIC_PATHS.CONTRACT_SUBSCRIPTION
    );
    return response.object_data;
  },

  /**
   * 获取单个合约地址
   */
  async getContractAddress(
    contractName: string,
    deployStep?: string
  ): Promise<ContractAddress> {
    const params = deployStep ? `?deploy_step=${deployStep}` : "";
    const response = await api.get<API.ResponseData<ContractAddress>>(
      `${PUBLIC_PATHS.CONTRACT_BY_NAME(contractName)}${params}`
    );
    return response.object_data as ContractAddress;
  },
};

// Subscription 合约 ABI (关键函数)
export const SUBSCRIPTION_ABI = [
  // 读取函数
  "function minInvestment() view returns (uint256)",
  "function maxInvestment() view returns (uint256)",
  "function requireAccredited() view returns (bool)",
  "function paused() view returns (bool)",
  "function lockPeriodAPY(uint256 lockPeriod) view returns (uint256)",
  "function subscriptionCount(address user) view returns (uint256)",
  "function getSubscription(address user, uint256 subscriptionId) view returns ((uint256 principal, uint256 lockPeriod, uint256 subscribeTime, uint256 redeemTime, uint256 apy, bool redeemed))",
  "function calculateInterest(uint256 principal, uint256 lockPeriod, uint256 apy) view returns (uint256)",
  "function getLockPeriods() view returns (uint256[4])",

  // 写入函数
  "function subscribe(uint256 amount, uint256 lockPeriod)",
  "function redeem(uint256 subscriptionId)",

  // 事件
  "event Subscribe(address indexed user, uint256 amount, uint256 lockPeriod, uint256 redeemTime, uint256 apy)",
  "event Redeem(address indexed user, uint256 principal, uint256 interest, uint256 total)",
] as const;

// ERC20 ABI (USDT/USDC)
export const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  // Mock token mint
  "function mint(address to, uint256 amount)",
] as const;

// 锁定期常量 (秒)
export const LOCK_PERIODS = {
  "1": 30 * 24 * 3600, // 30 days
  "3": 90 * 24 * 3600, // 90 days
  "6": 180 * 24 * 3600, // 180 days
  "12": 360 * 24 * 3600, // 360 days
} as const;

// 将月份转换为秒
export function monthsToSeconds(months: number): number {
  const mapping: Record<number, number> = {
    1: LOCK_PERIODS["1"],
    3: LOCK_PERIODS["3"],
    6: LOCK_PERIODS["6"],
    12: LOCK_PERIODS["12"],
  };
  return mapping[months] || LOCK_PERIODS["3"];
}

// 基点转换为百分比
export function basisPointsToPercent(bp: number): number {
  return bp / 100;
}

// USDT 金额转换 (6 decimals)
export function formatUSDTAmount(amount: number): bigint {
  return BigInt(Math.floor(amount * 1e6));
}

// 从链上读取的 USDT 金额转换
export function parseUSDTAmount(amount: bigint): number {
  return Number(amount) / 1e6;
}

// ============ 管理员 API ============

// 注册状态（纯 Provider 模式）
export type RegistrationStatus =
  | "synced"          // 已同步：DB 和链上一致
  | "mismatch"        // 不匹配：DB 和链上地址不一致
  | "not_registered"  // 未注册：已部署但未注册到 Provider
  | "not_deployed"    // 未部署
  | "unknown";        // 未知：不在 Provider 配置中

// 合约类型
export type ContractType =
  | "registry"     // 注册中心
  | "kyc"          // KYC
  | "governance"   // 治理
  | "stablecoin"   // 稳定币
  | "token"        // 代币
  | "defi";        // DeFi

// 合约类型配置
export interface ContractTypeConfig {
  label: string;
  color: string;
  icon: string;
}

// 依赖状态（纯 Provider 模式）
export interface DependencyStatusItem {
  key: string;              // Provider Key，如 "KYC_MANAGER"
  contract: string;         // 合约名称
  registered: boolean;      // 是否已注册到 Provider
  address: string | null;   // 注册的地址
}

// 合约状态（纯 Provider 模式）
export interface ContractStatusItem {
  name: string;
  project: string;                          // 项目分组
  address: string | null;                   // 本地 DB 地址
  deployed: boolean;
  deployed_at: string | null;
  registration_status: RegistrationStatus;  // 注册状态
  provider_address: string | null;          // Provider 上的地址
  provider_key: string | null;              // Provider Key
  dependencies: DependencyStatusItem[];     // 依赖列表
  scope: "global" | "project";              // 作用域：global(公共) / project(项目)
  contract_type: ContractType | null;       // 合约类型
  type_config?: ContractTypeConfig;         // 类型配置
  description?: string;                     // 描述
  last_synced?: string | null;              // 上次同步时间
  is_deleted?: boolean;                     // 是否已删除（解绑）
}

// 项目配置
export interface ProjectInfo {
  name: string;
  label: string;
  color: string;
}

// 项目合约分组
export interface ProjectContractsGroup {
  project: string;
  config: ProjectInfo;
  contracts: ContractStatusItem[];
}

// 统计信息
export interface ContractStats {
  total: number;
  global_count: number;
  project_count: number;
  deployed: number;
  registered: number;
}

// 合约状态响应（新结构）
export interface ContractStatusResponse {
  // 按 scope 分组的合约
  global_contracts: ContractStatusItem[];
  project_contracts: ProjectContractsGroup[];
  // 元数据
  contract_types: Record<ContractType, ContractTypeConfig>;
  projects: ProjectInfo[];
  network: string;
  needs_update_count: number;
  // 统计
  stats: ContractStats;
}

// 兼容旧结构的类型（用于筛选等）
export interface ContractStatusList {
  contracts: ContractStatusItem[];
  projects: ProjectInfo[];
  network: string;
  needs_update_count: number;
}

// 合约依赖
export interface ContractDependency {
  contract_name: string;
  depends_on: string[];
  set_functions: string[];
}

// 更新地址请求
export interface UpdateContractAddressRequest {
  target_contract: string;
  set_function: string;
  new_address: string;
}

// 更新地址响应
export interface UpdateContractAddressResponse {
  target_contract: string;
  target_address: string;
  function_name: string;
  function_args: string[];
  abi: string;
}

// 确认同步请求
export interface ConfirmSyncRequest {
  contract_name: string;
  dependency_name: string;
  tx_hash: string;
  new_address: string;
}

// 清除部署请求
export interface ResetDeployRequest {
  confirm: string;
}

// 准备注册请求 (前端钱包签名模式)
export interface PrepareRegisterRequest {
  contract_name: string;
  provider_key?: string;
}

// 准备注册响应
export interface PrepareRegisterResponse {
  provider_address: string;      // AddressProvider 合约地址
  function_name: string;         // "set_address"
  key_hash: string;              // keccak256(provider_key)
  contract_address: string;      // 要注册的合约地址
  contract_name: string;
  provider_key: string;
  abi: Array<{
    name: string;
    type: string;
    stateMutability: string;
    inputs: Array<{ name: string; type: string }>;
    outputs: Array<{ name: string; type: string }>;
  }>;
}

// 确认注册请求
export interface ConfirmRegisterRequest {
  contract_name: string;
  provider_key: string;
  tx_hash: string;
}

// 确认注册响应
export interface ConfirmRegisterResponse {
  status: string;
  contract_name: string;
  provider_key: string;
  address: string;
  tx_hash: string;
}

// 准备解除注册请求 (前端钱包签名模式)
export interface PrepareUnregisterRequest {
  contract_name: string;
  provider_key?: string;
}

// 准备解除注册响应
export interface PrepareUnregisterResponse {
  provider_address: string;      // AddressProvider 合约地址
  function_name: string;         // "set_address"
  key_hash: string;              // keccak256(provider_key)
  contract_address: string;      // 零地址 (0x0000...0000)
  contract_name: string;
  provider_key: string;
  abi: Array<{
    name: string;
    type: string;
    stateMutability: string;
    inputs: Array<{ name: string; type: string }>;
    outputs: Array<{ name: string; type: string }>;
  }>;
}

// 确认解除注册请求
export interface ConfirmUnregisterRequest {
  contract_name: string;
  provider_key: string;
  tx_hash: string;
}

// 确认解除注册响应
export interface ConfirmUnregisterResponse {
  success: boolean;
  contract_name: string;
  provider_key: string;
  tx_hash: string;
  message: string;
}

export const contractAdminService = {
  /**
   * 获取合约状态（管理员）
   * 返回按 scope 分组的合约状态
   */
  async getContractStatus(): Promise<ContractStatusResponse> {
    const response = await api.get<API.ResponseData<ContractStatusResponse>>(
      ADMIN_PATHS.CONTRACT_STATUS
    );
    return response.object_data as ContractStatusResponse;
  },

  /**
   * 获取扁平化的合约列表（兼容旧组件）
   * 将新结构转换为旧的 contracts 数组格式
   */
  async getContractStatusFlat(): Promise<ContractStatusList> {
    const data = await this.getContractStatus();
    const contracts = [
      ...data.global_contracts,
      ...data.project_contracts.flatMap(p => p.contracts),
    ];
    return {
      contracts,
      projects: data.projects,
      network: data.network,
      needs_update_count: data.needs_update_count,
    };
  },

  /**
   * 获取合约依赖关系（管理员）
   */
  async getContractDependencies(
    contractName: string
  ): Promise<ContractDependency> {
    const response = await api.get<API.ResponseData<ContractDependency>>(
      ADMIN_PATHS.CONTRACT_DEPENDENCIES(contractName)
    );
    return response.object_data as ContractDependency;
  },

  /**
   * 更新合约地址（管理员）
   * 返回需要调用的合约函数信息
   */
  async updateContractAddress(
    request: UpdateContractAddressRequest
  ): Promise<UpdateContractAddressResponse> {
    const response = await api.post<
      API.ResponseData<UpdateContractAddressResponse>
    >(ADMIN_PATHS.CONTRACT_UPDATE_ADDRESS, request);
    return response.object_data as UpdateContractAddressResponse;
  },

  /**
   * 确认绑定更新完成（管理员）
   * 前端完成链上调用后，调用此接口更新绑定记录
   */
  async confirmBinding(request: ConfirmSyncRequest): Promise<void> {
    await api.post(ADMIN_PATHS.CONTRACT_CONFIRM_BINDING, request);
  },

  /**
   * 按项目清除部署记录（管理员）
   * 危险操作，需要输入 RESET 确认
   */
  async resetProjectDeployments(
    project: "common" | "mock" | "fake",
    confirm: string
  ): Promise<{ deleted_count: number; project: string; network: string }> {
    const response = await api.delete<
      API.ResponseData<{
        deleted_count: number;
        project: string;
        network: string;
      }>
    >(ADMIN_PATHS.CONTRACT_RESET_PROJECT(project), { confirm });
    return response.object_data as {
      deleted_count: number;
      project: string;
      network: string;
    };
  },

  /**
   * 清除所有部署记录（管理员）
   * 危险操作，需要输入 RESET 确认
   */
  async resetAllDeployments(
    confirm: string
  ): Promise<{ deleted_count: number; network: string }> {
    const response = await api.delete<
      API.ResponseData<{ deleted_count: number; network: string }>
    >(ADMIN_PATHS.CONTRACT_RESET_ALL, { confirm });
    return response.object_data as { deleted_count: number; network: string };
  },

  /**
   * 准备注册合约到 Provider（管理员）
   * 返回前端钱包签名需要的调用参数
   */
  async prepareRegister(
    request: PrepareRegisterRequest
  ): Promise<PrepareRegisterResponse> {
    const response = await api.post<API.ResponseData<PrepareRegisterResponse>>(
      ADMIN_PATHS.CONTRACT_REGISTER_PREPARE,
      request
    );
    return response.object_data as PrepareRegisterResponse;
  },

  /**
   * 确认注册完成（管理员）
   * 前端完成链上交易后，调用此接口更新数据库缓存
   */
  async confirmRegister(
    request: ConfirmRegisterRequest
  ): Promise<ConfirmRegisterResponse> {
    const response = await api.post<API.ResponseData<ConfirmRegisterResponse>>(
      ADMIN_PATHS.CONTRACT_REGISTER_CONFIRM,
      request
    );
    return response.object_data as ConfirmRegisterResponse;
  },

  /**
   * 准备解除注册合约（管理员）
   * 返回前端钱包签名需要的调用参数（target_address 为零地址）
   */
  async prepareUnregister(
    request: PrepareUnregisterRequest
  ): Promise<PrepareUnregisterResponse> {
    const response = await api.post<API.ResponseData<PrepareUnregisterResponse>>(
      ADMIN_PATHS.CONTRACT_UNREGISTER_PREPARE,
      request
    );
    return response.object_data as PrepareUnregisterResponse;
  },

  /**
   * 确认解除注册完成（管理员）
   * 前端完成链上交易后，调用此接口更新数据库缓存
   */
  async confirmUnregister(
    request: ConfirmUnregisterRequest
  ): Promise<ConfirmUnregisterResponse> {
    const response = await api.post<API.ResponseData<ConfirmUnregisterResponse>>(
      ADMIN_PATHS.CONTRACT_UNREGISTER_CONFIRM,
      request
    );
    return response.object_data as ConfirmUnregisterResponse;
  },
};

// 合约 set 函数 ABI
export const CONTRACT_SET_ABIS: Record<string, string[]> = {
  setKYCManager: ["function setKYCManager(address _newManager)"],
  setUSDT: ["function setUSDT(address _newUsdt)"],
  setRWAToken: ["function setRWAToken(address _newRwaToken)"],
  setPlatformToken: ["function setPlatformToken(address _newPlatformToken)"],
  setSubscription: ["function setSubscription(address _newSubscription)"],
  setLPToken: ["function setLPToken(address _lpToken)"],
};

// AddressProvider ABI (用于注册和 owner 检查)
export const ADDRESS_PROVIDER_ABI = [
  {
    name: "owner",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "set_address",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_key", type: "bytes32" },
      { name: "_address", type: "address" },
    ],
    outputs: [],
  },
] as const;