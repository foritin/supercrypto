'use client';

import { type Hash, type Address } from 'viem';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type TransactionStatus = 
  | 'pending' 
  | 'confirming' 
  | 'success' 
  | 'failed' 
  | 'cancelled';

export type TransactionType =
  | 'approve'
  | 'deposit'
  | 'withdraw'
  | 'claim'
  | 'stake'
  | 'unstake'
  | 'transfer'
  | 'contract-interaction';

export interface Transaction {
  hash: Hash;
  type: TransactionType;
  status: TransactionStatus;
  from: Address;
  to: Address;
  value?: string;
  chainId: number;
  
  // Timing
  createdAt: number;
  confirmedAt?: number;
  
  // Gas
  gasLimit?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  
  // Metadata
  description: string;
  tokenSymbol?: string;
  tokenAmount?: string;
  
  // Error info
  errorMessage?: string;
  
  // Receipt data (after confirmation)
  blockNumber?: number;
  blockHash?: Hash;
  gasUsed?: string;
  effectiveGasPrice?: string;
  transactionFee?: string;
}

interface TransactionState {
  // All transactions by hash
  transactions: Record<string, Transaction>;
  
  // Pending transaction hashes (for quick lookup)
  pendingHashes: Hash[];
  
  // Current transaction being executed
  currentTransaction: Transaction | null;
  
  // Loading states
  isSubmitting: boolean;
  isEstimatingGas: boolean;
  
  // Gas estimation cache
  gasEstimates: Record<string, { estimate: bigint; timestamp: number }>;
  
  // Actions
  addTransaction: (tx: Omit<Transaction, 'createdAt' | 'status'>) => void;
  updateTransaction: (hash: Hash, updates: Partial<Transaction>) => void;
  confirmTransaction: (hash: Hash, receipt: Partial<Transaction>) => void;
  failTransaction: (hash: Hash, errorMessage: string) => void;
  cancelTransaction: (hash: Hash) => void;
  removeTransaction: (hash: Hash) => void;
  clearCompleted: () => void;
  clearAll: () => void;
  
  // Current transaction actions
  setCurrentTransaction: (tx: Transaction | null) => void;
  setSubmitting: (isSubmitting: boolean) => void;
  setEstimatingGas: (isEstimating: boolean) => void;
  
  // Gas estimation cache
  setGasEstimate: (key: string, estimate: bigint) => void;
  getGasEstimate: (key: string) => bigint | undefined;
  clearExpiredEstimates: (maxAgeMs?: number) => void;
  
  // Selectors
  getPendingCount: () => number;
  getRecentTransactions: (limit?: number) => Transaction[];
  getTransactionsByType: (type: TransactionType) => Transaction[];
  getTransactionsByStatus: (status: TransactionStatus) => Transaction[];
}

const GAS_ESTIMATE_CACHE_TTL = 30 * 1000; // 30 seconds

export const useTransactionStore = create<TransactionState>()(
  persist(
    (set, get) => ({
      // Initial state
      transactions: {},
      pendingHashes: [],
      currentTransaction: null,
      isSubmitting: false,
      isEstimatingGas: false,
      gasEstimates: {},

      // Actions
      addTransaction: (tx) =>
        set((state) => {
          const newTx: Transaction = {
            ...tx,
            status: 'pending',
            createdAt: Date.now(),
          };
          
          return {
            transactions: { ...state.transactions, [tx.hash]: newTx },
            pendingHashes: [...state.pendingHashes, tx.hash],
            currentTransaction: newTx,
          };
        }),

      updateTransaction: (hash, updates) =>
        set((state) => {
          const tx = state.transactions[hash];
          if (!tx) return state;

          return {
            transactions: {
              ...state.transactions,
              [hash]: { ...tx, ...updates },
            },
          };
        }),

      confirmTransaction: (hash, receipt) =>
        set((state) => {
          const tx = state.transactions[hash];
          if (!tx) return state;

          const confirmedTx: Transaction = {
            ...tx,
            ...receipt,
            status: 'success',
            confirmedAt: Date.now(),
          };

          return {
            transactions: { ...state.transactions, [hash]: confirmedTx },
            pendingHashes: state.pendingHashes.filter((h) => h !== hash),
            currentTransaction: state.currentTransaction?.hash === hash 
              ? null 
              : state.currentTransaction,
          };
        }),

      failTransaction: (hash, errorMessage) =>
        set((state) => {
          const tx = state.transactions[hash];
          if (!tx) return state;

          return {
            transactions: {
              ...state.transactions,
              [hash]: { ...tx, status: 'failed', errorMessage },
            },
            pendingHashes: state.pendingHashes.filter((h) => h !== hash),
            currentTransaction: state.currentTransaction?.hash === hash
              ? null
              : state.currentTransaction,
          };
        }),

      cancelTransaction: (hash) =>
        set((state) => {
          const tx = state.transactions[hash];
          if (!tx) return state;

          return {
            transactions: {
              ...state.transactions,
              [hash]: { ...tx, status: 'cancelled' },
            },
            pendingHashes: state.pendingHashes.filter((h) => h !== hash),
            currentTransaction: state.currentTransaction?.hash === hash
              ? null
              : state.currentTransaction,
          };
        }),

      removeTransaction: (hash) =>
        set((state) => {
          const { [hash]: _, ...rest } = state.transactions;
          return {
            transactions: rest,
            pendingHashes: state.pendingHashes.filter((h) => h !== hash),
          };
        }),

      clearCompleted: () =>
        set((state) => {
          const pending: Record<string, Transaction> = {};
          const pendingHashes: Hash[] = [];

          for (const [hash, tx] of Object.entries(state.transactions)) {
            if (tx.status === 'pending' || tx.status === 'confirming') {
              pending[hash] = tx;
              pendingHashes.push(hash as Hash);
            }
          }

          return { transactions: pending, pendingHashes };
        }),

      clearAll: () =>
        set({
          transactions: {},
          pendingHashes: [],
          currentTransaction: null,
        }),

      // Current transaction
      setCurrentTransaction: (tx) => set({ currentTransaction: tx }),
      setSubmitting: (isSubmitting) => set({ isSubmitting }),
      setEstimatingGas: (isEstimatingGas) => set({ isEstimatingGas }),

      // Gas estimation cache
      setGasEstimate: (key, estimate) =>
        set((state) => ({
          gasEstimates: {
            ...state.gasEstimates,
            [key]: { estimate, timestamp: Date.now() },
          },
        })),

      getGasEstimate: (key) => {
        const cached = get().gasEstimates[key];
        if (!cached) return undefined;
        
        // Check if expired
        if (Date.now() - cached.timestamp > GAS_ESTIMATE_CACHE_TTL) {
          return undefined;
        }
        
        return cached.estimate;
      },

      clearExpiredEstimates: (maxAgeMs = GAS_ESTIMATE_CACHE_TTL) =>
        set((state) => {
          const now = Date.now();
          const filtered: Record<string, { estimate: bigint; timestamp: number }> = {};
          
          for (const [key, value] of Object.entries(state.gasEstimates)) {
            if (now - value.timestamp <= maxAgeMs) {
              filtered[key] = value;
            }
          }
          
          return { gasEstimates: filtered };
        }),

      // Selectors
      getPendingCount: () => get().pendingHashes.length,

      getRecentTransactions: (limit = 10) => {
        const txs = Object.values(get().transactions);
        return txs
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, limit);
      },

      getTransactionsByType: (type) =>
        Object.values(get().transactions).filter((tx) => tx.type === type),

      getTransactionsByStatus: (status) =>
        Object.values(get().transactions).filter((tx) => tx.status === status),
    }),
    {
      name: 'supercrypto-transactions',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist completed transactions
        transactions: Object.fromEntries(
          Object.entries(state.transactions).filter(
            ([_, tx]) => tx.status !== 'pending' && tx.status !== 'confirming'
          )
        ),
        pendingHashes: [],
        currentTransaction: null,
        gasEstimates: {},
      }),
    }
  )
);
