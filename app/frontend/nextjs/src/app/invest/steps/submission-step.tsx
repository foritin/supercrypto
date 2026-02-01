'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTransactionContext } from '@/contexts/transaction-context';
import { useTransaction } from '@/hooks/use-transaction';
import { useWallet } from '@/hooks/use-wallet';
import { Loader2, Wallet, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { parseEther } from 'viem';
import { toast } from 'sonner';

export function SubmissionStep() {
  const { t } = useTranslation();
  const { address, chainId } = useWallet();
  const { executeTransaction, isSubmitting } = useTransaction();
  const {
    asset,
    amount,
    selectedGas,
    setTransactionHash,
    setTransactionStatus,
    setError,
    nextStep,
    prevStep,
  } = useTransactionContext();

  const [signState, setSignState] = React.useState<'idle' | 'signing' | 'submitted' | 'error'>('idle');

  React.useEffect(() => {
    // Auto-submit when step is entered
    if (signState === 'idle' && asset && amount) {
      handleSubmit();
    }
  }, [asset, amount]);

  const handleSubmit = async () => {
    if (!asset || !amount || !address || !chainId) {
      setError('Missing required transaction data');
      setSignState('error');
      return;
    }

    try {
      setSignState('signing');
      setTransactionStatus('pending');

      // Build transaction request
      const txRequest = {
        to: asset.tokenAddress,
        value: parseEther(amount),
        // Add custom gas settings if selected
        ...(selectedGas?.gwei && {
          maxFeePerGas: parseEther(selectedGas.gwei) / BigInt(1e9),
        }),
      };

      // Execute transaction
      const hash = await executeTransaction(txRequest, {
        type: 'deposit',
        description: `Invest ${amount} ETH in ${asset.name}`,
        tokenSymbol: asset.symbol,
        tokenAmount: amount,
        onSuccess: (receipt) => {
          setSignState('submitted');
          setTransactionStatus('confirming');
          toast.success(t('invest.transactionSubmitted', 'Transaction submitted successfully'));
        },
        onError: (error) => {
          setSignState('error');
          setTransactionStatus('failed');
          setError(error.message);
        },
      });

      if (hash) {
        setTransactionHash(hash);
        // Monitor transaction status
        setTimeout(() => {
          nextStep();
        }, 2000);
      } else {
        setSignState('error');
        setTransactionStatus('failed');
      }
    } catch (error) {
      setSignState('error');
      setTransactionStatus('failed');
      setError((error as Error).message);
      toast.error((error as Error).message || t('invest.transactionFailed', 'Transaction failed'));
    }
  };

  const renderContent = () => {
    switch (signState) {
      case 'signing':
        return (
          <div className="text-center py-12">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-[#00D4AA]/20" />
              <div className="absolute inset-0 rounded-full border-4 border-[#00D4AA] border-t-transparent animate-spin" />
              <Wallet className="absolute inset-0 m-auto h-10 w-10 text-[#00D4AA]" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {t('invest.signInWallet', 'Sign in Wallet')}
            </h3>
            <p className="text-white/60 max-w-sm mx-auto">
              {t('invest.signPrompt', 'Please confirm the transaction in your wallet to proceed with the investment')}
            </p>
          </div>
        );

      case 'submitted':
        return (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[#00D4AA]/20 flex items-center justify-center">
              <Send className="h-10 w-10 text-[#00D4AA]" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {t('invest.submitted', 'Transaction Submitted')}
            </h3>
            <p className="text-white/60 max-w-sm mx-auto">
              {t('invest.submittedDesc', 'Your transaction has been submitted to the network and is being confirmed')}
            </p>
            <div className="mt-6 flex justify-center">
              <Loader2 className="h-6 w-6 text-[#00D4AA] animate-spin" />
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertCircle className="h-10 w-10 text-red-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {t('invest.error.title', 'Transaction Failed')}
            </h3>
            <p className="text-white/60 max-w-sm mx-auto mb-6">
              {t('invest.error.desc', 'The transaction could not be completed. Please check your wallet and try again.')}
            </p>
            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={prevStep}>
                {t('common.back', 'Back')}
              </Button>
              <Button variant="primary" onClick={handleSubmit}>
                {t('invest.retry', 'Retry')}
              </Button>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-12">
            <Loader2 className="h-10 w-10 text-[#00D4AA] animate-spin mx-auto mb-4" />
            <p className="text-white/60">{t('common.loading', 'Loading...')}</p>
          </div>
        );
    }
  };

  return (
    <Card className="glass border-[#00D4AA]/20">
      {renderContent()}
    </Card>
  );
}
