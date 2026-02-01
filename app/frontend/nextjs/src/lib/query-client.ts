'use client';

import { QueryClient } from '@tanstack/react-query';

// Query cache configuration
const STALE_TIME = {
  SHORT: 10 * 1000,      // 10 seconds - prices, balances
  MEDIUM: 60 * 1000,     // 1 minute - user profile
  LONG: 5 * 60 * 1000,   // 5 minutes - asset lists, static data
  INFINITY: Infinity,    // Never stale - reference data
};

const CACHE_TIME = {
  SHORT: 60 * 1000,      // 1 minute
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 30 * 60 * 1000,  // 30 minutes
};

// Create query client instance
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Stale time determines when data is considered fresh
        staleTime: STALE_TIME.MEDIUM,
        
        // Cache time determines how long to keep data in cache after inactive
        gcTime: CACHE_TIME.MEDIUM,
        
        // Retry configuration
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        
        // Refetch behavior
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        refetchOnMount: true,
        
        // Error handling
        throwOnError: false,
        
        // Network mode
        networkMode: 'online',
      },
      mutations: {
        // Retry mutations only for network errors
        retry: false,
        
        // Network mode
        networkMode: 'online',
      },
    },
  });
}

// Query keys factory for consistent cache management
export const queryKeys = {
  // Web3 / Wallet
  wallet: {
    all: ['wallet'] as const,
    balance: (address: string, chainId: number) => 
      [...queryKeys.wallet.all, 'balance', address, chainId] as const,
    tokenBalance: (address: string, token: string, chainId: number) =>
      [...queryKeys.wallet.all, 'tokenBalance', address, token, chainId] as const,
    ens: (address: string) => 
      [...queryKeys.wallet.all, 'ens', address] as const,
  },
  
  // User
  user: {
    all: ['user'] as const,
    profile: () => [...queryKeys.user.all, 'profile'] as const,
    kyc: () => [...queryKeys.user.all, 'kyc'] as const,
    portfolio: () => [...queryKeys.user.all, 'portfolio'] as const,
    investments: () => [...queryKeys.user.all, 'investments'] as const,
  },
  
  // Assets / Projects
  assets: {
    all: ['assets'] as const,
    list: () => [...queryKeys.assets.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.assets.all, 'detail', id] as const,
    prices: () => [...queryKeys.assets.all, 'prices'] as const,
    price: (id: string) => [...queryKeys.assets.all, 'price', id] as const,
  },
  
  // Transactions
  transactions: {
    all: ['transactions'] as const,
    list: () => [...queryKeys.transactions.all, 'list'] as const,
    detail: (hash: string) => [...queryKeys.transactions.all, 'detail', hash] as const,
    pending: () => [...queryKeys.transactions.all, 'pending'] as const,
    history: (address: string) => 
      [...queryKeys.transactions.all, 'history', address] as const,
  },
  
  // Staking
  staking: {
    all: ['staking'] as const,
    pools: () => [...queryKeys.staking.all, 'pools'] as const,
    userStakes: (address: string) => 
      [...queryKeys.staking.all, 'userStakes', address] as const,
    rewards: (address: string) => 
      [...queryKeys.staking.all, 'rewards', address] as const,
  },
  
  // Admin
  admin: {
    all: ['admin'] as const,
    users: () => [...queryKeys.admin.all, 'users'] as const,
    kycRequests: () => [...queryKeys.admin.all, 'kycRequests'] as const,
    auditLogs: () => [...queryKeys.admin.all, 'auditLogs'] as const,
    contracts: () => [...queryKeys.admin.all, 'contracts'] as const,
  },
};

// Stale time presets for different data types
export const staleTimePresets = {
  // Real-time data (prices, balances) - refresh frequently
  realtime: STALE_TIME.SHORT,
  
  // User data - refresh on focus/reconnect
  user: STALE_TIME.MEDIUM,
  
  // Static data - rarely changes
  static: STALE_TIME.LONG,
  
  // Reference data - almost never changes
  reference: STALE_TIME.INFINITY,
};

// Prefetch helper for common data
export function prefetchCommonData(queryClient: QueryClient) {
  // Prefetch asset list on app start
  // This will be populated when the query is used
}

// Invalidate related queries after mutations
export function invalidateRelatedQueries(
  queryClient: QueryClient,
  type: 'transaction' | 'investment' | 'kyc' | 'profile'
) {
  switch (type) {
    case 'transaction':
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.portfolio() });
      break;
    case 'investment':
      queryClient.invalidateQueries({ queryKey: queryKeys.user.portfolio() });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.investments() });
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet.all });
      break;
    case 'kyc':
      queryClient.invalidateQueries({ queryKey: queryKeys.user.kyc() });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile() });
      break;
    case 'profile':
      queryClient.invalidateQueries({ queryKey: queryKeys.user.all });
      break;
  }
}

export { STALE_TIME, CACHE_TIME };
