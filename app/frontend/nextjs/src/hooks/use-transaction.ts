'use client';

import { useCallback } from 'react';
import { 
  useSendTransaction as useWagmiSendTransaction,
  useWaitForTransactionReceipt,
  useEstimateGas,
  useAccount,
} from 'wagmi';
import { type Address, type Hash, type TransactionRequest } from 'viem';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useTransactionStore, type TransactionType, type Transaction } from '@/stores/transaction-store';

interface SendTransactionOptions {
  type: TransactionType;
  description: string;
  tokenSymbol?: string;
  tokenAmount?: string;
  onSuccess?: (receipt: unknown) => void;
  onError?: (error: Error) => void;
}

export function useTransaction() {
  const { t } = useTranslation();
  const { address, chainId } = useAccount();
  const { 
    addTransaction, 
    confirmTransaction, 
    failTransaction,
    setSubmitting 
  } = useTransactionStore();

  const sendTransaction = useWagmiSendTransaction({
    mutation: {
      onMutate: () => {
        setSubmitting(true);
      },
      onError: (error) => {
        setSubmitting(false);
        toast.error(error.message || t('transaction.error.generic'));
      },
    },
  });

  const executeTransaction = useCallback(async (
    txRequest: TransactionRequest,
    options: SendTransactionOptions
  ): Promise<Hash | undefined> => {
    if (!address || !chainId) {
      toast.error(t('transaction.error.walletNotConnected'));
      return undefined;
    }

    try {
      setSubmitting(true);

      // Send transaction
      const hash = await sendTransaction.sendTransactionAsync?.(txRequest);
      
      if (!hash) {
        throw new Error('Transaction failed to send');
      }

      // Add to store
      addTransaction({
        hash,
        type: options.type,
        from: address,
        to: (txRequest.to as Address) || address,
        value: txRequest.value?.toString(),
        chainId,
        description: options.description,
        tokenSymbol: options.tokenSymbol,
        tokenAmount: options.tokenAmount,
        gasLimit: txRequest.gas?.toString(),
        maxFeePerGas: txRequest.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: txRequest.maxPriorityFeePerGas?.toString(),
      });

      toast.success(t('transaction.pending'), {
        description: options.description,
      });

      return hash;
    } catch (error) {
      const err = error as Error;
      toast.error(err.message || t('transaction.error.generic'));
      options.onError?.(err);
      return undefined;
    } finally {
      setSubmitting(false);
    }
  }, [address, chainId, sendTransaction, addTransaction, setSubmitting, t]);

  return {
    executeTransaction,
    isSubmitting: sendTransaction.isPending,
    isError: sendTransaction.isError,
    error: sendTransaction.error,
    reset: sendTransaction.reset,
  };
}

// Hook to track a specific transaction
export function useTransactionReceipt(hash: Hash | undefined) {
  const { 
    confirmTransaction, 
    failTransaction,
    updateTransaction 
  } = useTransactionStore();
  
  const { t } = useTranslation();

  const receipt = useWaitForTransactionReceipt({
    hash,
    query: {
      enabled: !!hash,
    },
  });

  // Update store when receipt is received
  if (receipt.data && hash) {
    const isSuccess = receipt.data.status === 'success';
    
    if (isSuccess) {
      confirmTransaction(hash, {
        blockNumber: Number(receipt.data.blockNumber),
        blockHash: receipt.data.blockHash,
        gasUsed: receipt.data.gasUsed.toString(),
        effectiveGasPrice: receipt.data.effectiveGasPrice?.toString(),
      });
      toast.success(t('transaction.success'));
    } else {
      failTransaction(hash, t('transaction.failed'));
      toast.error(t('transaction.failed'));
    }
  }

  // Handle error
  if (receipt.error && hash) {
    failTransaction(hash, receipt.error.message);
  }

  return receipt;
}

// Hook to estimate gas with caching
export function useGasEstimate(
  txRequest: Omit<TransactionRequest, 'gas'> & { to: Address }
) {
  const { address } = useAccount();
  const { setGasEstimate, getGasEstimate } = useTransactionStore();

  const cacheKey = `${address}-${txRequest.to}-${txRequest.value || '0'}-${txRequest.data || '0x'}`;
  
  const cached = getGasEstimate(cacheKey);

  const estimate = useEstimateGas({
    ...txRequest,
    query: {
      enabled: !cached && !!address,
    },
  });

  // Cache the result
  if (estimate.data && !cached) {
    setGasEstimate(cacheKey, estimate.data);
  }

  return {
    gasEstimate: cached || estimate.data,
    isLoading: estimate.isLoading,
    isError: estimate.isError,
    error: estimate.error,
  };
}
