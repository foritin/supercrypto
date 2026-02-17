'use client';

import { useBalance as useWagmiBalance, useAccount } from 'wagmi';
import { formatUnits } from 'viem';

interface TokenBalance {
  symbol: string;
  decimals: number;
  value: bigint;
  formatted: string;
}

export function useNativeBalance() {
  const { address, isConnected } = useAccount();
  
  const { data, isLoading, isError, error, refetch } = useWagmiBalance({
    address,
    query: {
      enabled: isConnected && !!address,
      staleTime: 30 * 1000, // 30 seconds
    },
  });

  const formatted = React.useMemo(() => {
    if (!data) return '0';
    return formatUnits(data.value, data.decimals);
  }, [data]);

  const compact = React.useMemo(() => {
    const value = parseFloat(formatted);
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
    return formatted;
  }, [formatted]);

  return {
    balance: data,
    formatted,
    compact,
    symbol: data?.symbol || 'ETH',
    decimals: data?.decimals || 18,
    isLoading,
    isError,
    error,
    refetch,
  };
}

import * as React from 'react';
import { useReadContract } from 'wagmi';
import { erc20Abi } from 'viem';

export function useTokenBalance(tokenAddress: `0x${string}` | undefined) {
  const { address, isConnected } = useAccount();

  const { data, isLoading, isError, error, refetch } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address && !!tokenAddress,
      staleTime: 30 * 1000,
    },
  });

  // decimals 和 symbol 是 ERC20 常量，只需读取一次，永不过期
  const { data: decimals } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'decimals',
    query: {
      enabled: !!tokenAddress,
      staleTime: Infinity,
      gcTime: Infinity,
    },
  });

  const { data: symbol } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'symbol',
    query: {
      enabled: !!tokenAddress,
      staleTime: Infinity,
      gcTime: Infinity,
    },
  });

  const formatted = React.useMemo(() => {
    if (!data || decimals === undefined) return '0';
    return formatUnits(data, decimals);
  }, [data, decimals]);

  return {
    balance: data,
    formatted,
    symbol: symbol || '',
    decimals: decimals || 18,
    isLoading,
    isError,
    error,
    refetch,
  };
}
