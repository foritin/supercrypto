'use client'
/**
 * useCurrentUser Hook
 * 获取当前用户信息和权限
 */
import { useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { userService, type CurrentUser } from '@/services/user'
import { hasJwtToken } from '@/utils/auth'

export function useCurrentUser() {
  const { address, isConnected } = useAccount()
  const queryClient = useQueryClient()

  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['currentUser', address],
    queryFn: async () => {
      console.log('Fetching currentUser for address:', address)
      if (!isConnected || !address || !hasJwtToken()) {
        return null
      }
      return await userService.getCurrentUser()
    },
    enabled: !!isConnected && !!address && hasJwtToken(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  })

  // 监听 storage 事件，当 JWT 变化时重新获取用户信息
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'supercrypto-jwt' && e.newValue) {
        // JWT 更新了，重新获取用户信息
        refetch()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [refetch])

  // 监听自定义事件，用于同一窗口内的登录通知
  useEffect(() => {
    const handleLoginSuccess = () => {
      refetch()
    }

    window.addEventListener('supercrypto-login-success', handleLoginSuccess)
    return () => window.removeEventListener('supercrypto-login-success', handleLoginSuccess)
  }, [refetch])

  // 监听登出事件，清除缓存
  useEffect(() => {
    const handleLogout = () => {
      queryClient.setQueryData(['currentUser', address], null)
    }

    window.addEventListener('auth:logout', handleLogout)
    return () => window.removeEventListener('auth:logout', handleLogout)
  }, [queryClient, address])

  return {
    user: data ?? null,
    isAdmin: data?.is_admin ?? false,
    isLoading,
    error: error as Error | null,
    refetch,
    isConnected,
  }
}

export type { CurrentUser }
