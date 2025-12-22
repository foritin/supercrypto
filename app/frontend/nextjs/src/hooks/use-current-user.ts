'use client'
/**
 * useCurrentUser Hook
 * 获取当前用户信息和权限
 */
import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { userService, type CurrentUser } from '@/services/user'

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
