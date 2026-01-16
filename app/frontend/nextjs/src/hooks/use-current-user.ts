'use client'
/**
 * useCurrentUser Hook
 * 获取当前用户信息和权限
 */
import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { userService, type CurrentUser } from '@/services/user'
import { hasJwtToken } from '@/utils/auth'

export function useCurrentUser() {
  const { address, isConnected } = useAccount()
  const [data, setData] = useState<CurrentUser | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchUser = useCallback(async () => {
    if (!isConnected || !address) {
      setData(null)
      return
    }

    // 等待 JWT token 存在后再获取用户信息
    if (!hasJwtToken()) {
      setData(null)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const result = await userService.getCurrentUser()
      setData(result)
    } catch (err) {
      setError(err as Error)
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [address, isConnected])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  // 监听 storage 事件，当 JWT 变化时重新获取用户信息
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'supercrypto-jwt' && e.newValue) {
        // JWT 更新了，重新获取用户信息
        fetchUser()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [fetchUser])

  // 监听自定义事件，用于同一窗口内的登录通知
  useEffect(() => {
    const handleLoginSuccess = () => {
      fetchUser()
    }

    window.addEventListener('supercrypto-login-success', handleLoginSuccess)
    return () => window.removeEventListener('supercrypto-login-success', handleLoginSuccess)
  }, [fetchUser])

  return {
    user: data,
    isAdmin: data?.is_admin ?? false,
    isLoading,
    error,
    refetch: fetchUser,
    isConnected,
  }
}

export type { CurrentUser }
