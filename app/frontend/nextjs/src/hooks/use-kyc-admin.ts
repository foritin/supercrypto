'use client'
/**
 * useKycAdmin Hooks
 * Admin hooks for KYC management
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { kycService, type KycStatus, type KycReviewRequest } from '@/services/kyc';

/**
 * Hook to list KYC records (admin)
 */
export function useKycList(params: {
  status?: KycStatus
  page?: number
  page_size?: number
} = {}) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['kycList', params],
    queryFn: () => kycService.list(params),
    staleTime: 30 * 1000, // 30 seconds
  })

  return {
    data: data ?? null,
    isLoading,
    error: error as Error | null,
    refetch,
  }
}

/**
 * Hook to get KYC by ID (admin)
 */
export function useKycById(id: number | null) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['kycById', id],
    queryFn: () => kycService.getById(id!),
    enabled: !!id,
    staleTime: 30 * 1000, // 30 seconds
  })

  return {
    data: data ?? null,
    isLoading,
    error: error as Error | null,
    refetch,
  }
}

/**
 * Hook to review KYC (admin)
 */
export function useKycReview() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: KycReviewRequest }) => kycService.review(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kycList'] })
      queryClient.invalidateQueries({ queryKey: ['kycById'] })
    },
  })

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isPending: mutation.isPending,
    error: mutation.error as Error | null,
  }
}
