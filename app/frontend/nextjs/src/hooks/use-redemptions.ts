'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';

import { redemptionService } from '@/services/redemption';
import type { RedemptionPreview, UserRedemption, UserRedemptionDetail } from '@/services/redemption';

// ═══════════════════════════════════════════════════════════
// User Redemption Hooks
// ═══════════════════════════════════════════════════════════

/**
 * 获取当前用户的赎回记录
 */
export function useUserRedemptions(status?: string) {
  const { isConnected } = useAccount();

  return useQuery({
    queryKey: ['redemptions', 'user', status],
    queryFn: () => redemptionService.getUserRedemptions(status),
    enabled: isConnected,
    retry: 1,
  });
}

/**
 * 获取赎回详情
 */
export function useRedemptionDetail(redemptionId: string) {
  return useQuery({
    queryKey: ['redemptions', 'detail', redemptionId],
    queryFn: () => redemptionService.getRedemptionDetail(redemptionId),
    enabled: !!redemptionId,
  });
}

/**
 * 发起赎回请求
 */
export function useRequestRedemption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ subscriptionId }: { subscriptionId: number }) =>
      redemptionService.requestRedemption(subscriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['redemptions', 'user'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
    },
  });
}

/**
 * 获取投资可赎回预览
 */
export function useRedemptionPreview(subscriptionId: number | null) {
  return useQuery({
    queryKey: ['redemptions', 'preview', subscriptionId],
    queryFn: () => {
      if (!subscriptionId) throw new Error('Subscription ID is required');
      return redemptionService.getRedemptionPreview(subscriptionId);
    },
    enabled: !!subscriptionId,
  });
}

export type { RedemptionPreview, UserRedemption, UserRedemptionDetail }
