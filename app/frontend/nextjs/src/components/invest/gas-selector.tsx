'use client';

import { Zap, Clock, Gauge } from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { formatGwei } from 'viem';

import { useTransactionContext, type GasOption } from '@/contexts/transaction-context';
import { useGasEstimate } from '@/hooks/use-transaction';

interface GasSelectorProps {
  to: `0x${string}`;
  value: bigint;
  data?: `0x${string}`;
}

const GAS_PRESETS = {
  slow: {
    multiplier: 0.8,
    estimatedTime: '~5 min',
  },
  standard: {
    multiplier: 1.0,
    estimatedTime: '~2 min',
  },
  fast: {
    multiplier: 1.3,
    estimatedTime: '~30 sec',
  },
};

export function GasSelector({ to, value, data }: GasSelectorProps) {
  const { t } = useTranslation();
  const { selectedGas, setGasOption } = useTransactionContext();
  
  // Get base gas estimate
  const { gasEstimate, isLoading } = useGasEstimate({
    to,
    value,
    data,
  });

  // Calculate gas options based on estimate
  const gasOptions: GasOption[] = React.useMemo(() => {
    if (!gasEstimate) return [];

    const baseGasPrice = gasEstimate;
    
    return [
      {
        label: 'slow',
        estimatedTime: GAS_PRESETS.slow.estimatedTime,
        gwei: formatGwei(baseGasPrice * BigInt(Math.floor(GAS_PRESETS.slow.multiplier * 100)) / BigInt(100)),
        fee: '0.001', // Simplified calculation
      },
      {
        label: 'standard',
        estimatedTime: GAS_PRESETS.standard.estimatedTime,
        gwei: formatGwei(baseGasPrice),
        fee: '0.002',
      },
      {
        label: 'fast',
        estimatedTime: GAS_PRESETS.fast.estimatedTime,
        gwei: formatGwei(baseGasPrice * BigInt(Math.floor(GAS_PRESETS.fast.multiplier * 100)) / BigInt(100)),
        fee: '0.003',
      },
    ];
  }, [gasEstimate]);

  // Auto-select standard if nothing selected
  React.useEffect(() => {
    if (gasOptions.length > 0 && !selectedGas) {
      const standardOption = gasOptions[1] ?? gasOptions[0];
      if (standardOption) {
        setGasOption(standardOption);
      }
    }
  }, [gasOptions, selectedGas, setGasOption]);

  if (isLoading) {
    return (
      <div className="p-4 rounded-xl bg-white/5 border border-white/10 animate-pulse">
        <div className="h-20 bg-white/10 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-white/60 mb-2">
        <Gauge className="h-4 w-4" />
        <span>{t('gas.selectSpeed', 'Select Transaction Speed')}</span>
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        {gasOptions.map((option) => (
          <button
            key={option.label}
            onClick={() => setGasOption(option)}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              selectedGas?.label === option.label
                ? 'border-primary bg-primary/10'
                : 'border-white/10 hover:border-white/30 bg-white/5'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {option.label === 'slow' && <Clock className="h-4 w-4 text-white/60" />}
              {option.label === 'standard' && <Gauge className="h-4 w-4 text-primary" />}
              {option.label === 'fast' && <Zap className="h-4 w-4 text-yellow-400" />}
              <span className={`font-medium capitalize ${
                selectedGas?.label === option.label ? 'text-primary' : 'text-white'
              }`}>
                {option.label}
              </span>
            </div>
            <div className="text-lg font-bold text-white mb-1">
              {Number(option.gwei).toFixed(2)} Gwei
            </div>
            <div className="text-xs text-white/50">
              {option.estimatedTime}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
