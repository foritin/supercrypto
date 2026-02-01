'use client';

import * as React from 'react';
import { useWallet } from '@/hooks/use-wallet';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@radix-ui/react-dropdown-menu';
import { Globe, Loader2, AlertCircle } from 'lucide-react';

export function NetworkSwitcher() {
  const { chainId, isConnected, currentChainName, isSupportedChain, supportedChains, switchToChain, isSwitching } = useWallet();

  if (!isConnected) {
    return (
      <Button variant="outline" disabled className="gap-2 opacity-50">
        <Globe className="h-4 w-4" />
        Not Connected
      </Button>
    );
  }

  if (!isSupportedChain) {
    return (
      <Button variant="destructive" className="gap-2">
        <AlertCircle className="h-4 w-4" />
        Wrong Network
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2" disabled={isSwitching}>
          {isSwitching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Globe className="h-4 w-4" />
          )}
          {currentChainName}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-48 bg-[#111815] border border-[#00D4AA]/20 rounded-lg shadow-xl p-1"
      >
        {supportedChains.map((chain) => (
          <DropdownMenuItem
            key={chain.id}
            onClick={() => switchToChain(chain.id)}
            className={`px-3 py-2 text-sm rounded-md cursor-pointer transition-colors ${
              chain.id === chainId
                ? 'bg-[#00D4AA]/20 text-[#00D4AA]'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span>{chain.name}</span>
              {chain.id === chainId && (
                <span className="h-2 w-2 rounded-full bg-[#00D4AA]" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
