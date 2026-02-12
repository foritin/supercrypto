'use client';

import { useCallback } from 'react';
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { supportedChains, chainNames } from '@/config/wagmi';

export function useWallet() {
  const { address, isConnected, isConnecting, isReconnecting, status } = useAccount();
  const chainId = useChainId();
  const { connect, error: connectError } = useConnect();
  const { disconnect, error: disconnectError } = useDisconnect();
  const { switchChain, error: switchError, isPending: isSwitching } = useSwitchChain();

  const connectWallet = useCallback(() => {
    connect({ connector: injected() });
  }, [connect]);

  const disconnectWallet = useCallback(() => {
    disconnect();
  }, [disconnect]);

  const switchToChain = useCallback(
    (targetChainId: number) => {
      switchChain({ chainId: targetChainId });
    },
    [switchChain]
  );

  const currentChainName = chainId ? chainNames[chainId] || 'Unknown' : '';
  const isSupportedChain = chainId ? supportedChains.some((c) => c.id === chainId) : false;

  return {
    // Account
    address,
    isConnected,
    isConnecting,
    isReconnecting,
    status,
    
    // Chain
    chainId,
    currentChainName,
    isSupportedChain,
    supportedChains,
    
    // Actions
    connectWallet,
    disconnectWallet,
    switchToChain,
    isSwitching,
    
    // Errors
    connectError,
    disconnectError,
    switchError,
  };
}
