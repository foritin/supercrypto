'use client';

import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/hooks/use-wallet';

interface NetworkCheckProps {
  requiredChainId?: number;
  children: React.ReactNode;
}

export function NetworkCheck({ requiredChainId, children }: NetworkCheckProps) {
  const { t } = useTranslation();
  const { 
    isConnected, 
    chainId, 
    isSupportedChain, 
    switchToChain, 
    isSwitching,
    currentChainName,
    supportedChains: availableChains,
  } = useWallet();

  const [isAutoSwitching, setIsAutoSwitching] = React.useState(false);

  // Auto-switch to required network
  React.useEffect(() => {
    if (
      isConnected && 
      requiredChainId && 
      chainId !== requiredChainId && 
      !isAutoSwitching &&
      !isSwitching
    ) {
      setIsAutoSwitching(true);
      switchToChain(requiredChainId);
    }
  }, [isConnected, requiredChainId, chainId, isAutoSwitching, isSwitching, switchToChain]);

  if (!isConnected) {
    return (
      <Alert className="bg-amber-500/10 border-amber-500/30">
        <AlertCircle className="h-4 w-4 text-amber-400" />
        <AlertTitle className="text-amber-400">
          {t('network.walletNotConnected', 'Wallet Not Connected')}
        </AlertTitle>
        <AlertDescription className="text-amber-400/80">
          {t('network.connectToContinue', 'Please connect your wallet to continue')}
        </AlertDescription>
      </Alert>
    );
  }

  if (!isSupportedChain) {
    return (
      <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
        <AlertCircle className="h-4 w-4 text-red-400" />
        <AlertTitle className="text-red-400">
          {t('network.unsupportedNetwork', 'Unsupported Network')}
        </AlertTitle>
        <AlertDescription className="text-red-400/80">
          {t('network.switchToSupported', 'Please switch to one of the supported networks:')}
          <div className="flex flex-wrap gap-2 mt-2">
            {availableChains.map((chain) => (
              <Button
                key={chain.id}
                variant="outline"
                size="sm"
                onClick={() => switchToChain(chain.id)}
                disabled={isSwitching}
                className="border-red-400/50 text-red-400 hover:bg-red-400/10"
              >
                {isSwitching && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                {chain.name}
              </Button>
            ))}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (requiredChainId && chainId !== requiredChainId) {
    const targetChain = availableChains.find((c) => c.id === requiredChainId);
    
    return (
      <Alert className="bg-primary/10 border-primary/30">
        <Loader2 className="h-4 w-4 text-primary animate-spin" />
        <AlertTitle className="text-primary">
          {t('network.switching', 'Switching Network')}
        </AlertTitle>
        <AlertDescription className="text-primary/80">
          {t('network.autoSwitching', 'Automatically switching to {{chain}}...', {
            chain: targetChain?.name || 'required network',
          })}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Alert className="bg-primary/10 border-primary/30">
        <CheckCircle className="h-4 w-4 text-primary" />
        <AlertTitle className="text-primary">
          {t('network.connected', 'Connected')}
        </AlertTitle>
        <AlertDescription className="text-primary/80">
          {t('network.currentNetwork', 'Current network: {{network}}', {
            network: currentChainName,
          })}
        </AlertDescription>
      </Alert>
      {children}
    </div>
  );
}

// Hook for network validation
export function useNetworkValidation(requiredChainId?: number) {
  const { chainId, isConnected, isSupportedChain } = useWallet();

  return React.useMemo(() => {
    if (!isConnected) {
      return { isValid: false, error: 'Wallet not connected' };
    }
    if (!isSupportedChain) {
      return { isValid: false, error: 'Unsupported network' };
    }
    if (requiredChainId && chainId !== requiredChainId) {
      return { isValid: false, error: 'Wrong network' };
    }
    return { isValid: true, error: null };
  }, [isConnected, isSupportedChain, chainId, requiredChainId]);
}
