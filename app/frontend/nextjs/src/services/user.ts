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
      const url = 'http://localhost:8000/api/v1/auth/me'
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'X-Wallet-Address': walletAddress,
      }
      
      const token = localStorage.getItem('supercrypto-jwt')
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
      })
      
      const data = await response.json()
      
      if (data.code !== 0 && data.code !== 200) {
        return null
      }
      
      return data.data.object as CurrentUser
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

