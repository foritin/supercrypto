/**
 * 合约状态类型定义
 *
 * 项目就绪状态与 Asset 绑定功能
 * Requirements: 3.1-3.6
 */

// ===== 就绪状态详情 =====

/**
 * 就绪状态详情 - 三个条件的具体状态
 * Requirements: 1.1-1.6, 3.2
 */
export interface ReadinessDetails {
  /** 所有合约已注册到 Provider */
  all_registered: boolean;
  /** 没有必须依赖未绑定 */
  no_missing_deps: boolean;
  /** 已设置主合约 */
  has_primary: boolean;
  /** 已配置 TREASURY 地址 */
  treasury_configured: boolean;
}

// ===== 绑定的 Asset 信息 =====

/**
 * 绑定的 Asset 信息
 * Requirements: 2.4, 2.5
 */
export interface BoundAssetInfo {
  /** 资产 ID */
  asset_id: number;
  /** 资产名称 */
  asset_name: string;
}

// ===== 合约操作权限 =====

/**
 * 合约操作权限
 * Requirements: 5.1-5.5, 8.5-8.6
 */
export interface ContractActions {
  /** 是否可设为主合约 */
  can_set_primary: boolean;
  /** 是否可取消主合约 */
  can_unset_primary: boolean;
  /** 禁用原因（当操作被禁用时） */
  disabled_reason: string | null;
}

// ===== 项目就绪状态枚举 =====

/**
 * 项目就绪状态
 * Requirements: 1.1, 1.5, 1.6
 */
export type ProjectReadinessStatus = 'ready' | 'partially_ready' | 'not_ready';


// ===== 从 services/contract.ts 重新导出合约管理类型 =====

export type {
  ContractAddresses,
  ContractAddressItem,
  SubscriptionParams,
  SubscriptionContractInfo,
  ContractAddress,
  RegistrationStatus,
  ContractType,
  ContractTypeConfig,
  DependencyStatusItem,
  ContractStatusItem,
  ProjectInfo,
  ProjectContractsGroup,
  ContractStats,
  ContractStatusResponse,
  ContractStatusList,
  ContractDependency,
  UpdateContractAddressRequest,
  UpdateContractAddressResponse,
  ConfirmSyncRequest,
  ResetDeployRequest,
  PrepareRegisterRequest,
  PrepareRegisterResponse,
  ConfirmRegisterRequest,
  ConfirmRegisterResponse,
  PrepareUnregisterRequest,
  PrepareUnregisterResponse,
  ConfirmUnregisterRequest,
  ConfirmUnregisterResponse,
  PrepareSetTreasuryRequest,
  ConfirmSetTreasuryRequest,
  TreasuryBindingResponse,
  ContractValidationResult,
  ContractValidationResponse,
} from '@/services/contract'
