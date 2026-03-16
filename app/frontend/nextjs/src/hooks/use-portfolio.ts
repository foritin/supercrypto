import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';

import { subscriptionService } from '@/services/subscription';
import type { SubscriptionListQuery } from '@/types/subscription';

/**
 * 用户认购列表 Hook
 * 使用 React Query 管理缓存、加载状态和错误处理
 */
export function useSubscriptions(query: SubscriptionListQuery = {}) {
  const { isConnected } = useAccount();

  return useQuery({
    queryKey: ['subscriptions', query],
    queryFn: () => subscriptionService.getSubscriptions(query),
    enabled: isConnected,
  });
}

/**
 * 用户投资统计 Hook
 */
export function useUserStats() {
  const { isConnected } = useAccount();

  return useQuery({
    queryKey: ['userStats'],
    queryFn: () => subscriptionService.getUserStats(),
    enabled: isConnected,
  });
}

/**
 * 用户交易历史类型定义
 */
export interface PortfolioTransaction {
  id: string;
  created_at: string;
  tx_type: string;
  amount: string;
  status: string;
  tx_hash: string;
  network?: string;
}

/**
 * 用户交易历史 Hook
 * TODO: 后端实现用户级交易历史 API 后替换为真实接口调用
 */
export function useTransactionHistory() {
  const { isConnected } = useAccount();

  return useQuery({
    queryKey: ['transactionHistory'],
    queryFn: async () => {
      // TODO: 后端实现交易历史 API 后替换为真实接口
      // return transactionService.getTransactionHistory();
      return [];
    },
    enabled: isConnected,
  });
}
