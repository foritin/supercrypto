'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useChainId } from 'wagmi';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTransactionContext } from '@/contexts/transaction-context';
import { useTransactionReceipt } from '@/hooks/use-transaction';
import { getExplorerUrl } from '@/lib/utils';
import { CheckCircle, ExternalLink, RotateCcw, ArrowRight, FileText } from 'lucide-react';
import Link from 'next/link';
import confetti from 'canvas-confetti';

export function CompletionStep() {
  const { t } = useTranslation();
  const chainId = useChainId();
  const {
    asset, 
    amount, 
    expectedYield, 
    lockEndDate, 
    transactionHash,
    reset,
  } = useTransactionContext();

  // Monitor transaction receipt
  const receipt = useTransactionReceipt(transactionHash || undefined);

  // Trigger confetti on success
  React.useEffect(() => {
    if (receipt.isSuccess) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00D4AA', '#6366F1', '#ffffff'],
      });
    }
  }, [receipt.isSuccess]);

  if (!asset || !amount) {
    return (
      <Card className="p-8 glass border-primary/20 text-center">
        <p className="text-white/60">
          {t('invest.noData', 'No investment data found')}
        </p>
        <Button variant="primary" className="mt-4" onClick={reset}>
          <RotateCcw className="h-4 w-4 mr-2" />
          {t('invest.startNew', 'Start New Investment')}
        </Button>
      </Card>
    );
  }

  const isSuccess = receipt.isSuccess;
  const isPending = receipt.isLoading;
  const isError = receipt.isError;

  return (
    <Card className="glass border-primary/20 overflow-hidden">
      {/* Success Header */}
      <div className="p-8 text-center bg-gradient-to-b from-primary/10 to-transparent">
        <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${
          isSuccess ? 'bg-primary' : isError ? 'bg-red-500' : 'bg-primary/20'
        }`}>
          {isSuccess ? (
            <CheckCircle className="h-10 w-10 text-bg-dark" />
          ) : isError ? (
            <FileText className="h-10 w-10 text-white" />
          ) : (
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          )}
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2">
          {isSuccess 
            ? t('invest.success.title', 'Investment Successful!')
            : isError
              ? t('invest.failed.title', 'Transaction Failed')
              : t('invest.confirming.title', 'Confirming Transaction...')
          }
        </h2>
        
        <p className="text-white/60 max-w-sm mx-auto">
          {isSuccess
            ? t('invest.success.desc', 'Your investment has been confirmed on the blockchain')
            : isError
              ? t('invest.failed.desc', 'The transaction failed to complete')
              : t('invest.confirming.desc', 'Waiting for blockchain confirmation...')
          }
        </p>
      </div>

      {/* Transaction Details */}
      <div className="px-8 pb-8">
        <div className="p-6 rounded-xl bg-white/5 border border-white/10 space-y-4 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-white/60">{t('invest.detail.asset')}</span>
            <span className="font-medium text-white">{asset.name}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-white/60">{t('invest.detail.amountInvested')}</span>
            <span className="font-medium text-white">{amount} ETH</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-white/60">{t('invest.detail.expectedReturn')}</span>
            <span className="font-medium text-primary">+{expectedYield} ETH</span>
          </div>
          
          {lockEndDate && (
            <div className="flex justify-between items-center">
              <span className="text-white/60">{t('invest.detail.unlockDate')}</span>
              <span className="font-medium text-white">
                {lockEndDate.toLocaleDateString()}
              </span>
            </div>
          )}

          {transactionHash && (
            <div className="pt-4 border-t border-white/10">
              <span className="text-white/60 text-sm">{t('invest.detail.txHash')}</span>
              <a
                href={getExplorerUrl(chainId, 'tx', transactionHash) || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 mt-1 text-primary hover:underline"
              >
                <span className="font-mono text-sm">
                  {transactionHash.slice(0, 10)}...{transactionHash.slice(-8)}
                </span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={reset}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {t('invest.investMore', 'Invest More')}
          </Button>
          
          <Link href="/portfolio" className="flex-1">
            <Button variant="primary" className="w-full">
              {t('invest.viewPortfolio', 'View Portfolio')}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
