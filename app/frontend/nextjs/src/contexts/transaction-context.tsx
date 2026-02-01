'use client';

import * as React from 'react';
import { type Address, type Hash } from 'viem';

export interface InvestmentAsset {
  id: string;
  name: string;
  symbol: string;
  tokenAddress: Address;
  decimals: number;
  apy: number;
  minInvestment: string;
  maxInvestment: string;
  lockPeriod: number; // in days
  totalSupply: string;
  availableSupply: string;
}

export interface GasOption {
  label: 'slow' | 'standard' | 'fast';
  estimatedTime: string;
  gwei: string;
  fee: string;
}

export interface TransactionState {
  // Asset info
  asset: InvestmentAsset | null;
  
  // Investment details
  amount: string;
  expectedYield: string;
  lockEndDate: Date | null;
  
  // Gas settings
  selectedGas: GasOption | null;
  customGasPrice: string;
  useCustomGas: boolean;
  
  // Transaction info
  transactionHash: Hash | null;
  transactionStatus: 'idle' | 'pending' | 'confirming' | 'success' | 'failed';
  error: string | null;
  
  // Step management
  currentStep: number;
}

interface TransactionContextType extends TransactionState {
  // Actions
  setAsset: (asset: InvestmentAsset) => void;
  setAmount: (amount: string) => void;
  calculateYield: () => void;
  setGasOption: (option: GasOption) => void;
  setCustomGas: (price: string) => void;
  
  // Step navigation
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  
  // Transaction
  submitTransaction: () => Promise<void>;
  setTransactionHash: (hash: Hash) => void;
  setTransactionStatus: (status: TransactionState['transactionStatus']) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const TransactionContext = React.createContext<TransactionContextType | undefined>(undefined);

const initialState: TransactionState = {
  asset: null,
  amount: '',
  expectedYield: '',
  lockEndDate: null,
  selectedGas: null,
  customGasPrice: '',
  useCustomGas: false,
  transactionHash: null,
  transactionStatus: 'idle',
  error: null,
  currentStep: 0,
};

export function TransactionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<TransactionState>(initialState);

  const setAsset = React.useCallback((asset: InvestmentAsset) => {
    setState((prev) => ({ ...prev, asset }));
  }, []);

  const setAmount = React.useCallback((amount: string) => {
    setState((prev) => ({ ...prev, amount }));
  }, []);

  const calculateYield = React.useCallback(() => {
    if (!state.asset || !state.amount || isNaN(Number(state.amount))) {
      setState((prev) => ({ ...prev, expectedYield: '' }));
      return;
    }

    const amount = Number(state.amount);
    const apy = state.asset.apy;
    const lockPeriod = state.asset.lockPeriod;
    
    // Calculate yield: amount * (apy / 100) * (lockPeriod / 365)
    const yieldValue = amount * (apy / 100) * (lockPeriod / 365);
    
    setState((prev) => ({
      ...prev,
      expectedYield: yieldValue.toFixed(6),
      lockEndDate: new Date(Date.now() + lockPeriod * 24 * 60 * 60 * 1000),
    }));
  }, [state.asset, state.amount]);

  const setGasOption = React.useCallback((option: GasOption) => {
    setState((prev) => ({
      ...prev,
      selectedGas: option,
      useCustomGas: false,
    }));
  }, []);

  const setCustomGas = React.useCallback((price: string) => {
    setState((prev) => ({
      ...prev,
      customGasPrice: price,
      useCustomGas: true,
    }));
  }, []);

  const goToStep = React.useCallback((step: number) => {
    if (step >= 0 && step <= 3) {
      setState((prev) => ({ ...prev, currentStep: step }));
    }
  }, []);

  const nextStep = React.useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, 3),
    }));
  }, []);

  const prevStep = React.useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 0),
    }));
  }, []);

  const submitTransaction = React.useCallback(async () => {
    // This will be implemented with actual contract interaction
    setState((prev) => ({ ...prev, transactionStatus: 'pending' }));
  }, []);

  const setTransactionHash = React.useCallback((hash: Hash) => {
    setState((prev) => ({ ...prev, transactionHash: hash }));
  }, []);

  const setTransactionStatus = React.useCallback((status: TransactionState['transactionStatus']) => {
    setState((prev) => ({ ...prev, transactionStatus: status }));
  }, []);

  const setError = React.useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const reset = React.useCallback(() => {
    setState(initialState);
  }, []);

  // Recalculate yield when amount or asset changes
  React.useEffect(() => {
    calculateYield();
  }, [state.amount, state.asset, calculateYield]);

  const value: TransactionContextType = {
    ...state,
    setAsset,
    setAmount,
    calculateYield,
    setGasOption,
    setCustomGas,
    goToStep,
    nextStep,
    prevStep,
    submitTransaction,
    setTransactionHash,
    setTransactionStatus,
    setError,
    reset,
  };

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactionContext() {
  const context = React.useContext(TransactionContext);
  if (!context) {
    throw new Error('useTransactionContext must be used within TransactionProvider');
  }
  return context;
}
