'use client';

import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { 
  type Abi, 
  type Address, 
  type Hash,
  type ContractFunctionArgs,
  type ContractFunctionName,
} from 'viem';
import { 
  useReadContract, 
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from 'wagmi';

import { useTransactionStore, type TransactionType } from '@/stores/transaction-store';

// Generic hook for reading contract data
export function useContractRead<
  TAbi extends Abi,
  TFunctionName extends ContractFunctionName<TAbi, 'pure' | 'view'>
>(
  address: Address | undefined,
  abi: TAbi,
  functionName: TFunctionName,
  args?: ContractFunctionArgs<TAbi, 'pure' | 'view', TFunctionName>
) {
  return useReadContract({
    abi,
    functionName,
    query: {
      enabled: !!address,
      staleTime: 10 * 1000, // 10 seconds
    },
    ...(address ? { address } : {}),
    ...(args !== undefined ? { args } : {}),
  } as never);
}

// Generic hook for writing to contracts
export function useContractWrite<
  TAbi extends Abi,
  TFunctionName extends ContractFunctionName<TAbi, 'nonpayable' | 'payable'>
>(
  address: Address | undefined,
  abi: TAbi,
  functionName: TFunctionName,
  options?: {
    type?: TransactionType;
    description?: string;
    onSuccess?: (hash: Hash) => void;
    onError?: (error: Error) => void;
  }
) {
  const { t } = useTranslation();
  const { chainId } = useAccount();
  const { addTransaction, confirmTransaction, failTransaction } = useTransactionStore();
  const [pendingHash, setPendingHash] = useState<Hash | undefined>(undefined);

  const writeContract = useWriteContract({
    mutation: {
      onSuccess: (hash) => {
        setPendingHash(hash);
        
        // Add to transaction store
        if (chainId && address) {
          addTransaction({
            hash,
            type: options?.type || 'contract-interaction',
            from: address,
            to: address,
            chainId,
            description: options?.description || `${functionName}`,
          });
        }

        toast.success(t('transaction.pending'), {
          description: options?.description || `${functionName}`,
        });

        options?.onSuccess?.(hash);
      },
      onError: (error) => {
        toast.error(error.message || t('transaction.error.contract'));
        options?.onError?.(error);
      },
    },
  });

  // Wait for receipt
  const receipt = useWaitForTransactionReceipt({
    hash: pendingHash,
    query: {
      enabled: !!pendingHash,
    },
  });

  // Update store on confirmation
  if (receipt.data && pendingHash) {
    const isSuccess = receipt.data.status === 'success';
    
    if (isSuccess) {
      confirmTransaction(pendingHash, {
        blockNumber: Number(receipt.data.blockNumber),
        blockHash: receipt.data.blockHash,
        gasUsed: receipt.data.gasUsed.toString(),
        effectiveGasPrice: receipt.data.effectiveGasPrice?.toString(),
      });
      toast.success(t('transaction.success'));
    } else {
      failTransaction(pendingHash, t('transaction.failed'));
      toast.error(t('transaction.failed'));
    }
    
    setPendingHash(undefined);
  }

  if (receipt.error && pendingHash) {
    failTransaction(pendingHash, receipt.error.message);
    setPendingHash(undefined);
  }

  const execute = useCallback(
    async (
      callArgs?: ContractFunctionArgs<TAbi, 'nonpayable' | 'payable', TFunctionName>,
      value?: bigint
    ) => {
      if (!address) {
        toast.error(t('transaction.error.noContract'));
        return;
      }

      writeContract.writeContract({
        address,
        abi,
        functionName,
        ...(callArgs !== undefined ? { args: callArgs } : {}),
        ...(value !== undefined ? { value } : {}),
      } as never);
    },
    [address, abi, functionName, writeContract, t]
  );

  return {
    execute,
    hash: writeContract.data,
    pendingHash,
    isPending: writeContract.isPending || receipt.isLoading,
    isSuccess: receipt.isSuccess,
    isError: writeContract.isError || receipt.isError,
    error: writeContract.error || receipt.error,
    receipt: receipt.data,
    reset: () => {
      writeContract.reset();
      setPendingHash(undefined);
    },
  };
}

// Hook for ERC20 token operations
export function useERC20(tokenAddress: Address | undefined) {
  const erc20Abi = [
    {
      name: 'balanceOf',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'account', type: 'address' }],
      outputs: [{ name: '', type: 'uint256' }],
    },
    {
      name: 'allowance',
      type: 'function',
      stateMutability: 'view',
      inputs: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
      ],
      outputs: [{ name: '', type: 'uint256' }],
    },
    {
      name: 'approve',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'spender', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
      outputs: [{ name: '', type: 'bool' }],
    },
    {
      name: 'decimals',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ name: '', type: 'uint8' }],
    },
    {
      name: 'symbol',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ name: '', type: 'string' }],
    },
  ] as const;

  const { address } = useAccount();

  // Read balance
  const balance = useContractRead(
    tokenAddress,
    erc20Abi,
    'balanceOf',
    address ? [address] : undefined
  );

  // Read allowance
  const allowance = (spender: Address | undefined) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useContractRead(
      tokenAddress,
      erc20Abi,
      'allowance',
      address && spender ? [address, spender] : undefined
    );

  // Read decimals
  const decimals = useContractRead(tokenAddress, erc20Abi, 'decimals');

  // Read symbol
  const symbol = useContractRead(tokenAddress, erc20Abi, 'symbol');

  // Approve
  const approve = (_spender: Address, _amount: bigint) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useContractWrite(tokenAddress, erc20Abi, 'approve', {
      type: 'approve',
      description: `Approve token spending`,
    });

  return {
    balance,
    allowance,
    decimals,
    symbol,
    approve,
  };
}

// Hook for batch contract reads
export function useContractReads(
  contracts: Array<{
    address: Address;
    abi: Abi;
    functionName: string;
    args?: unknown[];
  }>
) {
  return useReadContract({
    // @ts-expect-error - wagmi types are complex
    contracts: contracts.map((c) => ({
      ...c,
      query: {
        enabled: !!c.address,
      },
    })),
  });
}
