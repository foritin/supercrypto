'use client'
/**
 * useKycAdmin Hooks
 * Admin hooks for KYC management
 */
import { useState, useEffect, useCallback } from 'react'
import { kycService, KycStatus, type KycFullResponse, type KycReviewRequest, type PaginatedResponse } from '@/services/kyc'

/**
 * Hook to list KYC records (admin)
 */
export function useKycList(params: {
  status?: KycStatus
  page?: number
  page_size?: number
} = {}) {
  const [data, setData] = useState<PaginatedResponse<KycFullResponse> | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchList = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await kycService.list(params)
      setData(result)
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [params.status, params.page, params.page_size])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  return {
    data,
    isLoading,
    error,
    refetch: fetchList,
  }
}

/**
 * Hook to get KYC by ID (admin)
 */
export function useKycById(id: number | null) {
  const [data, setData] = useState<KycFullResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchKyc = useCallback(async () => {
    if (!id) return

    setIsLoading(true)
    setError(null)
    try {
      const result = await kycService.getById(id)
      setData(result)
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchKyc()
  }, [fetchKyc])

  return {
    data,
    isLoading,
    error,
    refetch: fetchKyc,
  }
}

/**
 * Hook to review KYC (admin)
 */
export function useKycReview() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const mutate = useCallback(
    async (
      { id, data }: { id: number; data: KycReviewRequest },
      options?: { onSuccess?: () => void; onError?: (error: Error) => void }
    ) => {
      setIsLoading(true)
      setError(null)
      try {
        await kycService.review(id, data)
        options?.onSuccess?.()
      } catch (err) {
        const error = err as Error
        setError(error)
        options?.onError?.(error)
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  return {
    mutate,
    mutateAsync: mutate,
    isLoading,
    isPending: isLoading,
    error,
  }
}
