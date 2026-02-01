'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/hooks/use-wallet';
import { Wallet, Loader2 } from 'lucide-react';

export function ConnectButton() {
  const { isConnected, isConnecting, address, connectWallet, disconnectWallet } = useWallet();

  const truncatedAddress = React.useMemo(() => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, [address]);

  if (isConnected) {
    return (
      <Button
        variant="outline"
        onClick={disconnectWallet}
        className="gap-2"
      >
        <Wallet className="h-4 w-4" />
        {truncatedAddress}
      </Button>
    );
  }

  return (
    <Button
      variant="primary"
      onClick={connectWallet}
      disabled={isConnecting}
      className="gap-2"
    >
      {isConnecting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Wallet className="h-4 w-4" />
      )}
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </Button>
  );
}
