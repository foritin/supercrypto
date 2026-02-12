'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Web3 Store — 仅管理 wagmi hooks 无法提供的 UI 状态和用户偏好
 *
 * 钱包连接状态 (isConnected, address, chainId, chain) 已移除，
 * 请直接使用 wagmi hooks:
 *   - useAccount()    → isConnected, address
 *   - useChainId()    → chainId
 *   - useChains()     → chain
 */
export interface Web3State {
  // UI state (wagmi 不提供)
  isConnecting: boolean;
  isSwitchingChain: boolean;
  connectionError: string | null;

  // User preferences (需要持久化)
  preferredChainId: number | null;
  autoConnect: boolean;

  // Actions
  setConnecting: (isConnecting: boolean) => void;
  setSwitchingChain: (isSwitching: boolean) => void;
  setConnectionError: (error: string | null) => void;
  setPreferredChain: (chainId: number) => void;
  setAutoConnect: (autoConnect: boolean) => void;
  clearError: () => void;
}

export const useWeb3Store = create<Web3State>()(
  persist(
    (set) => ({
      // Initial state
      isConnecting: false,
      isSwitchingChain: false,
      connectionError: null,
      preferredChainId: null,
      autoConnect: true,

      // Actions
      setConnecting: (isConnecting) => set({ isConnecting }),

      setSwitchingChain: (isSwitchingChain) => set({ isSwitchingChain }),

      setConnectionError: (connectionError) => set({ connectionError }),

      setPreferredChain: (preferredChainId) => set({ preferredChainId }),

      setAutoConnect: (autoConnect) => set({ autoConnect }),

      clearError: () => set({ connectionError: null }),
    }),
    {
      name: 'supercrypto-web3-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        preferredChainId: state.preferredChainId,
        autoConnect: state.autoConnect,
      }),
    }
  )
);
