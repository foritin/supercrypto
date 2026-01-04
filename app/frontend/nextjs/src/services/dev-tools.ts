/**
 * 开发者工具 API Service
 * 
 * 路由：/dev/* (仅开发环境)
 */
import { api } from '@/services/api'
import { DEV_PATHS } from '@/constants/api-paths'
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
  tag: string | null
  label: string
}

export const devToolsService = {
  /**
   * 获取可重置数据的统计信息
   */
  async getResetInfo(): Promise<ResetableDataInfo> {
    const response = await api.get<API.ResponseData<ResetableDataInfo>>(DEV_PATHS.RESET_INFO)
    return response.object!
  },

  /**
   * 重置测试数据
   */
  async resetData(request: DataResetRequest): Promise<DataResetResponse> {
    const response = await api.post<API.ResponseData<DataResetResponse>>(DEV_PATHS.RESET_DATA, request)
    return response.object!
  },

  /**
   * 获取环境信息
   */
  async getEnvironment(): Promise<EnvironmentInfo> {
    const response = await api.get<API.ResponseData<EnvironmentInfo>>(DEV_PATHS.ENVIRONMENT)
    return response.object!
  },

  /**
   * 获取可接收代币的用户列表
   */
  async getTokenRecipients(): Promise<TokenRecipient[]> {
    const response = await api.get<API.ResponseData<TokenRecipient>>(DEV_PATHS.TOKEN_RECIPIENTS)
    return response.list || []
  },
}

