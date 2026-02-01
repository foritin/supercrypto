'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { type Address, type Chain } from 'viem';

export interface Web3State {
  // Connection state
  isConnected: boolean;
  address: Address | null;
  chainId: number | null;
  chain: Chain | null;
  
  // UI state
  isConnecting: boolean;
  isSwitchingChain: boolean;
  connectionError: string | null;
  
  // User preferences
  preferredChainId: number | null;
  autoConnect: boolean;
  
  // Actions
  setConnected: (address: Address, chainId: number, chain: Chain) => void;
  setDisconnected: () => void;
  setConnecting: (isConnecting: boolean) => void;
  setSwitchingChain: (isSwitching: boolean) => void;
  setConnectionError: (error: string | null) => void;
  setPreferredChain: (chainId: number) => void;
  setAutoConnect: (autoConnect: boolean) => void;
  switchChain: (chainId: number, chain: Chain) => void;
  clearError: () => void;
}

export const useWeb3Store = create<Web3State>()(
  persist(
    (set) => ({
      // Initial state
      isConnected: false,
      address: null,
      chainId: null,
      chain: null,
      isConnecting: false,
      isSwitchingChain: false,
      connectionError: null,
      preferredChainId: null,
      autoConnect: true,

      // Actions
      setConnected: (address, chainId, chain) =>
        set({
          isConnected: true,
          address,
          chainId,
          chain,
          connectionError: null,
          isConnecting: false,
        }),

      setDisconnected: () =>
        set({
          isConnected: false,
          address: null,
          chainId: null,
          chain: null,
          isConnecting: false,
          connectionError: null,
        }),

      setConnecting: (isConnecting) => set({ isConnecting }),

      setSwitchingChain: (isSwitchingChain) => set({ isSwitchingChain }),

      setConnectionError: (connectionError) => set({ connectionError }),

      setPreferredChain: (preferredChainId) => set({ preferredChainId }),

      setAutoConnect: (autoConnect) => set({ autoConnect }),

      switchChain: (chainId, chain) =>
        set({
          chainId,
          chain,
          isSwitchingChain: false,
        }),

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
