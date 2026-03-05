'use client';

import { Loader2, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useNativeBalance } from '@/hooks/use-balance';
import { useWallet } from '@/hooks/use-wallet';

interface BalanceDisplayProps {
  className?: string;
  showRefresh?: boolean;
}

export function BalanceDisplay({ className = '', showRefresh = true }: BalanceDisplayProps) {
  const { isConnected } = useWallet();
  const { formatted, compact, symbol, isLoading, isError, refetch } = useNativeBalance();

  if (!isConnected) {
    return (
      <div className={`text-white/50 text-sm ${className}`}>
        Connect wallet to view balance
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 text-white/70 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </div>
    );
  }

  if (isError) {
    return (
      <div className={`flex items-center gap-2 text-red-400 ${className}`}>
        <span>Failed to load balance</span>
        {showRefresh && (
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="text-right">
        <div className="text-white font-medium" title={`${formatted} ${symbol}`}>
          {compact} {symbol}
        </div>
      </div>
      {showRefresh && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      )}
    </div>
  );
}
