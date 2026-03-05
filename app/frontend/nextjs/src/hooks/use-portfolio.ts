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
 * 用户交易历史 Mock 数据
 * 后端暂无用户级交易历史端点，使用模拟数据
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

const MOCK_TRANSACTIONS: PortfolioTransaction[] = [
  {
    id: '1',
    created_at: '2024-01-15T10:30:00Z',
    tx_type: 'subscribe',
    amount: '50000',
    status: 'confirmed',
    tx_hash: '0x1234567890abcdef1234567890abcdef12345678',
    network: 'ethereum',
  },
  {
    id: '2',
    created_at: '2023-09-01T14:20:00Z',
    tx_type: 'subscribe',
    amount: '25000',
    status: 'confirmed',
    tx_hash: '0xabcdef1234567890abcdef1234567890abcdef12',
    network: 'ethereum',
  },
];

/**
 * 用户交易历史 Hook
 * TODO: 后端实现用户级交易历史 API 后替换 mock 数据
 */
export function useTransactionHistory() {
  const { isConnected } = useAccount();

  return useQuery({
    queryKey: ['transactionHistory'],
    queryFn: async () => MOCK_TRANSACTIONS,
    enabled: isConnected,
  });
}

/** 交易历史是否为 Mock 数据 */
export const IS_TRANSACTION_MOCK = true;
