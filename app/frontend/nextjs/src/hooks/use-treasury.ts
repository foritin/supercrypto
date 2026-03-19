'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';

import {
  treasuryService,
  type TreasuryInitRequest,
  type SignRedemptionRequest,
  type ExecuteRedemptionRequest,
  type RejectRedemptionRequest,
  type RedemptionQueueQuery,
} from '@/services/treasury';

// ═══════════════════════════════════════════════════════════
// Query Hooks
// ═══════════════════════════════════════════════════════════

/**
 * 获取国库配置
 */
export function useTreasuryConfig() {
  return useQuery({
    queryKey: ['treasury', 'config'],
    queryFn: () => treasuryService.getConfig(),
  });
}

/**
 * 获取赎回队列
 */
export function useRedemptionQueue(query: RedemptionQueueQuery = {}) {
  return useQuery({
    queryKey: ['treasury', 'queue', query],
    queryFn: () => treasuryService.getQueue(query),
    refetchInterval: 30000, // 30s 轮询
  });
}

/**
 * 获取赎回详情
 */
export function useRedemptionDetail(redemptionId: string | null) {
  return useQuery({
    queryKey: ['treasury', 'redemption', redemptionId],
    queryFn: () => {
      if (!redemptionId) throw new Error('Redemption ID is required');
      return treasuryService.getRedemptionDetail(redemptionId);
    },
    enabled: !!redemptionId,
  });
}

/**
 * 获取国库统计
 */
export function useTreasuryStats() {
  return useQuery({
    queryKey: ['treasury', 'stats'],
    queryFn: () => treasuryService.getStats(),
    refetchInterval: 30000,
  });
}

/**
 * 获取多签状态
 */
export function useMultisigStatus() {
  return useQuery({
    queryKey: ['treasury', 'multisig', 'status'],
    queryFn: () => treasuryService.getMultisigStatus(),
  });
}

// ═══════════════════════════════════════════════════════════
// Mutation Hooks
// ═══════════════════════════════════════════════════════════

/**
 * 初始化国库多签
 */
export function useInitTreasury() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TreasuryInitRequest) => treasuryService.initTreasury(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treasury', 'config'] });
      queryClient.invalidateQueries({ queryKey: ['treasury', 'multisig', 'status'] });
    },
  });
}

/**
 * 签名赎回请求
 */
export function useSignRedemption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SignRedemptionRequest) => treasuryService.signRedemption(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['treasury', 'queue'] });
      queryClient.invalidateQueries({ queryKey: ['treasury', 'redemption', variables.redemptionId] });
      queryClient.invalidateQueries({ queryKey: ['treasury', 'stats'] });
    },
  });
}

/**
 * 执行赎回请求
 */
export function useExecuteRedemption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ExecuteRedemptionRequest) => treasuryService.executeRedemption(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['treasury', 'queue'] });
      queryClient.invalidateQueries({ queryKey: ['treasury', 'redemption', variables.redemptionId] });
      queryClient.invalidateQueries({ queryKey: ['treasury', 'stats'] });
    },
  });
}

/**
 * 拒绝赎回请求
 */
export function useRejectRedemption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RejectRedemptionRequest) => treasuryService.rejectRedemption(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['treasury', 'queue'] });
      queryClient.invalidateQueries({ queryKey: ['treasury', 'redemption', variables.redemptionId] });
      queryClient.invalidateQueries({ queryKey: ['treasury', 'stats'] });
    },
  });
}

// ═══════════════════════════════════════════════════════════
// Utility Hooks
// ═══════════════════════════════════════════════════════════

/**
 * 检查当前用户是否为签名者
 */
export function useIsMultisigSigner() {
  const { address } = useAccount();
  const { data: config } = useTreasuryConfig();

  const isSigner = Boolean(
    address && config?.signers?.some(
      (signer) => signer.address.toLowerCase() === address.toLowerCase()
    )
  );

  return {
    isSigner,
    isLoading: !config,
    signerInfo: config?.signers?.find(
      (signer) => signer.address.toLowerCase() === address?.toLowerCase()
    ),
  };
}

/**
 * 获取需要当前用户签名的赎回请求
 */
export function usePendingForCurrentUser() {
  const { address } = useAccount();
  const { data: queue, isLoading } = useRedemptionQueue({ status: 'signing' });

  const pendingForUser = queue?.items.filter((request) => {
    const hasSigned = request.signatures.some(
      (sig) => sig.signerAddress.toLowerCase() === address?.toLowerCase()
    );
    return !hasSigned && request.status === 'signing';
  }) || [];

  return {
    pendingForUser,
    count: pendingForUser.length,
    isLoading,
  };
}
