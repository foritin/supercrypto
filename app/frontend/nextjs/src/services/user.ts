/**
 * User API Service
 * 用户相关 API
 */
import { API_BASE_URL } from '@/constants/api'
import { ApiError, api } from '@/services/api'
import { clearAuthData } from '@/utils/auth'
// ApiResponseData 类型已在 types/api.d.ts 中全局声明

// 当前用户信息
export interface CurrentUser {
  address: string
  is_admin: boolean
  roles: string[]
  net_type: string
  kyc_status: string | null
}

// 获取钱包地址
function getWalletAddress(): string | null {
  return localStorage.getItem('supercrypto-wallet-address')
}

export const userService = {
  /**
   * 获取当前用户信息
   */
  async getCurrentUser(): Promise<CurrentUser | null> {
    const walletAddress = getWalletAddress()
    if (!walletAddress) return null
    
    try {
      const data = await api.get<{ object_data?: CurrentUser }>(`${API_BASE_URL}/user/auth/me`)
      return data?.object_data ?? null
    } catch (error) {
      // 后端会话失效时，立即清理本地登录状态并触发全局退出
      if (error instanceof ApiError && error.code === 401) {
        clearAuthData()
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:logout', {
            detail: { message: 'Session invalid. Please reconnect your wallet.' }
          }))
        }
      }
      return null
    }
  },
  
  /**
   * 检查是否为管理员
   */
  async isAdmin(): Promise<boolean> {
    const user = await this.getCurrentUser()
    return user?.is_admin ?? false
  },
}

