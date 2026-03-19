/**
 * 开发者工具 / 运维工具 API Service
 *
 * 路由：/dev/*
 */
import { DEV_PATHS } from '@/constants/api-paths'
import { api } from '@/services/api'
// API.ResponseData 类型已在 types/api.d.ts 中全局声明

export interface ResetableDataInfo {
  kyc_count: number
  transaction_count: number
  environment: string
}

export interface DataResetRequest {
  confirmation: string
  data_types: ('kyc' | 'transaction' | 'all')[]
}

export interface DataResetResponse {
  success: boolean
  message: string
  reset_counts: Record<string, number | string>
  environment: string
}

export interface EnvironmentInfo {
  environment: string
  reset_allowed: boolean
}

export interface TokenRecipient {
  address: string
  kyc_status: string | null
  roles?: string[]
  tag?: string | null
  label: string
}

export interface FaucetRequest {
  address: string
  amount_eth: number
}

export interface FaucetResponse {
  address: string
  amount_eth: number
  old_balance_eth: number
  new_balance_eth: number
}

export interface TreasuryInitRequest {
  signer_addresses: string[]
  required_signatures: number
}

export interface TreasuryInitResponse {
  contract_address: string | null
  tx_hash: string
  signer_count: number
  required_signatures: number
}

export interface TreasuryInitPrepareResponse {
  contract_address: string
  function_name: string
  abi: readonly unknown[]
  signer_addresses: string[]
  required_signatures: number
}

export interface TreasuryInitConfirmRequest extends TreasuryInitRequest {
  tx_hash: string
}

export interface TreasuryConfigResponse {
  contract_address: string | null
  signers: string[]
  required_signatures: number
  threshold_ratio: string
  is_initialized: boolean
}

export const devToolsService = {
  /**
   * 获取可重置数据的统计信息
   */
  async getResetInfo(): Promise<ResetableDataInfo> {
    const response = await api.get<API.ResponseData<ResetableDataInfo>>(DEV_PATHS.RESET_INFO)
    return response.object_data!
  },

  /**
   * 重置测试数据
   */
  async resetData(request: DataResetRequest): Promise<DataResetResponse> {
    const response = await api.post<API.ResponseData<DataResetResponse>>(DEV_PATHS.RESET_DATA, request)
    return response.object_data!
  },

  /**
   * 获取环境信息
   */
  async getEnvironment(): Promise<EnvironmentInfo> {
    const response = await api.get<API.ResponseData<EnvironmentInfo>>(DEV_PATHS.ENVIRONMENT)
    return response.object_data!
  },

  /**
   * 获取可接收代币的用户列表
   */
  async getTokenRecipients(): Promise<TokenRecipient[]> {
    const response = await api.get<API.ResponseData<TokenRecipient>>(DEV_PATHS.TOKEN_RECIPIENTS)
    return response.list_data || []
  },

  /**
   * ETH 水龙头 - 给指定地址充值 ETH
   */
  async faucet(request: FaucetRequest): Promise<FaucetResponse> {
    const response = await api.post<API.ResponseData<FaucetResponse>>(DEV_PATHS.FAUCET, request)
    return response.object_data!
  },

  /**
   * 初始化 Treasury 多签配置
   */
  async initTreasury(request: TreasuryInitRequest): Promise<TreasuryInitResponse> {
    const response = await api.post<API.ResponseData<TreasuryInitResponse>>(
      DEV_PATHS.TREASURY_INIT,
      request
    )
    return response.object_data!
  },

  async prepareInitTreasury(request: TreasuryInitRequest): Promise<TreasuryInitPrepareResponse> {
    const response = await api.post<API.ResponseData<TreasuryInitPrepareResponse>>(
      DEV_PATHS.TREASURY_INIT_PREPARE,
      request
    )
    return response.object_data!
  },

  async confirmInitTreasury(request: TreasuryInitConfirmRequest): Promise<TreasuryInitResponse> {
    const response = await api.post<API.ResponseData<TreasuryInitResponse>>(
      DEV_PATHS.TREASURY_INIT_CONFIRM,
      request
    )
    return response.object_data!
  },

  async getTreasuryConfig(): Promise<TreasuryConfigResponse> {
    const response = await api.get<API.ResponseData<TreasuryConfigResponse>>(DEV_PATHS.TREASURY_CONFIG)
    return response.object_data!
  },
}
