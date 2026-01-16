/**
 * User API Service
 * 用户相关 API
 */
import { api } from '@/services/api'
// ApiResponseData 类型已在 types/api.d.ts 中全局声明

// 当前用户信息
export interface CurrentUser {
  address: string
  is_admin: boolean
  tag: string | null
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
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
      const url = `${baseUrl}/user/auth/me`
      
      const token = localStorage.getItem('supercrypto-jwt')
      if (!token) return null
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
      })
      
      const data = await response.json()
      
      if (data.code !== 0 && data.code !== 200) {
        return null
      }
      
      return data.data.object_data as CurrentUser
    } catch {
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

