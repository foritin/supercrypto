/**
 * Constants API Service - 常量表 API
 *
 * 提供统一的常量数据获取服务，支持中英文国际化。
 * 常量数据从后端 API 获取，支持缓存和 fallback。
 *
 * 路由：
 * - GET /public/constants - 获取所有常量分组
 * - GET /public/constants/{group} - 获取指定分组的常量
 */
import { PUBLIC_PATHS } from '@/constants/api-paths'
import { api } from '@/services/api'

/**
 * 单个常量项
 */
export interface ConstantItem {
  /** 常量值 (如 "real_estate") */
  value: string
  /** 多语言标签 */
  labels: {
    zh: string
    en: string
  }
  /** 额外元数据 (如颜色、图标等) */
  metadata?: Record<string, unknown>
}

/**
 * 常量分组
 */
export interface ConstantGroup {
  /** 分组名称 (如 "asset_type") */
  group: string
  /** 常量项列表 */
  items: ConstantItem[]
}

/**
 * 常量服务
 */
export const constantsService = {
  /**
   * 获取所有常量分组
   * @returns 所有常量分组的映射 { group_name: ConstantItem[] }
   */
  async getAllConstants(): Promise<Record<string, ConstantItem[]>> {
    const response = await api.get<API.ResponseData<Record<string, ConstantItem[]>>>(
      PUBLIC_PATHS.CONSTANTS
    )
    return response.object_data || {}
  },

  /**
   * 获取指定分组的常量
   * @param group 分组名称 (如 "asset_type", "asset_status")
   * @returns 常量项列表
   */
  async getConstants(group: string): Promise<ConstantItem[]> {
    const response = await api.get<API.ResponseData<ConstantItem>>(
      PUBLIC_PATHS.CONSTANTS_GROUP(group)
    )
    return response.list_data || []
  },
}
