'use client'
/**
 * useKycStatus Hook
 * Fetches and manages KYC status for the connected wallet
 */
import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { kycService, KycStatus, type KycStatusResponse, type KycApplyRequest } from '@/services/kyc'
import { message } from 'antd'

/**
 * Hook to get KYC status for the connected wallet
 */
export function useKycStatus() {
  const { address, isConnected } = useAccount()
  const [data, setData] = useState<KycStatusResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchStatus = useCallback(async () => {
    if (!isConnected || !address) return

    setIsLoading(true)
    setError(null)
    try {
      const result = await kycService.getStatus(address)
      setData(result)
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [address, isConnected])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  return {
    data,
    isLoading,
    error,
    isError: !!error,
    refetch: fetchStatus,
    status: data?.status ?? KycStatus.NOT_STARTED,
    isApproved: data?.status === KycStatus.APPROVED,
    isPending: data?.status === KycStatus.PENDING,
    isRejected: data?.status === KycStatus.REJECTED,
    isNotStarted: !data || data.status === KycStatus.NOT_STARTED,
  }
}

/**
 * Hook to apply for KYC
 */
export function useKycApply() {
  const { address } = useAccount()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const mutate = useCallback(
    async (data: Omit<KycApplyRequest, 'wallet_address'>, options?: { onSuccess?: () => void }) => {
      if (!address) return

      setIsLoading(true)
      setError(null)
      try {
        await kycService.apply({
          wallet_address: address.toLowerCase(),
          ...data,
        })
        message.success('KYC application submitted')
        options?.onSuccess?.()
      } catch (err) {
        setError(err as Error)
        message.error('Failed to submit KYC application')
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [address]
  )

  return {
    mutate,
    isLoading,
    isPending: isLoading,
    error,
  }
}

/**
 * Hook for dev tools - quick KYC approval
 */
export function useQuickKycApprove() {
  const { address } = useAccount()
  const [isLoading, setIsLoading] = useState(false)

  const mutate = useCallback(
    async (_?: unknown, options?: { onSuccess?: () => void; onError?: (error: Error) => void }) => {
      if (!address) return

      setIsLoading(true)
      try {
        await kycService.quickApprove(address)
        options?.onSuccess?.()
      } catch (err) {
        options?.onError?.(err as Error)
      } finally {
        setIsLoading(false)
      }
    },
    [address]
  )

  return {
    mutate,
    mutateAsync: mutate,
    isLoading,
    isPending: isLoading,
  }
}

/**
 * Hook for dev tools - reset KYC
 */
export function useKycReset() {
  const { address } = useAccount()
  const [isLoading, setIsLoading] = useState(false)

  const mutate = useCallback(
    async (_?: unknown, options?: { onSuccess?: () => void; onError?: (error: Error) => void }) => {
      if (!address) return

      setIsLoading(true)
      try {
        await kycService.reset(address)
        options?.onSuccess?.()
      } catch (err) {
        options?.onError?.(err as Error)
      } finally {
        setIsLoading(false)
      }
    },
    [address]
  )

  return {
    mutate,
    mutateAsync: mutate,
    isLoading,
    isPending: isLoading,
  }
}

/**
 * Get status display info
 */
export function getKycStatusInfo(status: KycStatus): {
  color: string
  label: string
  antdStatus: 'success' | 'processing' | 'error' | 'default' | 'warning'
} {
  switch (status) {
    case KycStatus.APPROVED:
      return { color: '#52c41a', label: 'kyc.status.approved', antdStatus: 'success' }
    case KycStatus.PENDING:
      return { color: '#1677ff', label: 'kyc.status.pending', antdStatus: 'processing' }
    case KycStatus.REJECTED:
      return { color: '#ff4d4f', label: 'kyc.status.rejected', antdStatus: 'error' }
    case KycStatus.NOT_STARTED:
    default:
      return { color: '#d9d9d9', label: 'kyc.status.notStarted', antdStatus: 'default' }
  }
}
