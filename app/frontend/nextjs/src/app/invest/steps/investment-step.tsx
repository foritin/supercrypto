'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTransactionContext, type InvestmentAsset } from '@/contexts/transaction-context';
import { useWallet } from '@/hooks/use-wallet';
import { useNativeBalance } from '@/hooks/use-balance';
import { AlertCircle, TrendingUp, Clock, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatUnits } from 'viem';

// Mock asset data - in production this comes from API
const mockAssets: InvestmentAsset[] = [
  {
    id: 'real-estate-1',
    name: 'Premium Real Estate Fund I',
    symbol: 'PREFI',
    tokenAddress: '0x1234567890123456789012345678901234567890',
    decimals: 18,
    apy: 12.5,
    minInvestment: '0.1',
    maxInvestment: '100',
    lockPeriod: 90,
    totalSupply: '1000000',
    availableSupply: '500000',
  },
  {
    id: 'commodities-1',
    name: 'Gold Reserve Token',
    symbol: 'GRT',
    tokenAddress: '0x0987654321098765432109876543210987654321',
    decimals: 18,
    apy: 8.2,
    minInvestment: '0.05',
    maxInvestment: '50',
    lockPeriod: 30,
    totalSupply: '500000',
    availableSupply: '200000',
  },
];

export function InvestmentStep() {
  const { t } = useTranslation();
  const { isConnected } = useWallet();
  const { formatted: balance, isLoading: balanceLoading } = useNativeBalance();
  const {
    asset,
    amount,
    expectedYield,
    lockEndDate,
    setAsset,
    setAmount,
    nextStep,
    error,
    setError,
  } = useTransactionContext();

  const [validationError, setValidationError] = React.useState<string | null>(null);

  // Validate amount
  const validateAmount = React.useCallback((value: string) => {
    if (!asset) {
      setValidationError(t('invest.error.selectAsset'));
      return false;
    }

    if (!value || value === '') {
      setValidationError(null);
      return false;
    }

    const numValue = Number(value);
    if (isNaN(numValue) || numValue <= 0) {
      setValidationError(t('invest.error.invalidAmount'));
      return false;
    }

    const minAmount = Number(asset.minInvestment);
    const maxAmount = Number(asset.maxInvestment);
    const userBalance = Number(balance || '0');

    if (numValue < minAmount) {
      setValidationError(t('invest.error.minAmount', { min: minAmount }));
      return false;
    }

    if (numValue > maxAmount) {
      setValidationError(t('invest.error.maxAmount', { max: maxAmount }));
      return false;
    }

    if (numValue > userBalance) {
      setValidationError(t('invest.error.insufficientBalance'));
      return false;
    }

    setValidationError(null);
    return true;
  }, [asset, balance, t]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers and decimals
    if (value && !/^\d*\.?\d*$/.test(value)) return;
    
    setAmount(value);
    validateAmount(value);
  };

  const handleContinue = () => {
    if (!asset) {
      setError(t('invest.error.selectAsset'));
      return;
    }
    if (!amount || !validateAmount(amount)) {
      setError(t('invest.error.invalidAmount'));
      return;
    }
    setError(null);
    nextStep();
  };

  if (!isConnected) {
    return (
      <Card className="p-8 glass border-[#00D4AA]/20 text-center">
        <AlertCircle className="h-12 w-12 text-[#00D4AA] mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">
          {t('invest.connectWallet', 'Connect Your Wallet')}
        </h3>
        <p className="text-white/60 mb-4">
          {t('invest.connectWalletDesc', 'Please connect your wallet to start investing')}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Asset Selection */}
      <Card className="p-6 glass border-[#00D4AA]/20">
        <h3 className="text-lg font-semibold text-white mb-4">
          {t('invest.selectAsset', 'Select Asset')}
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          {mockAssets.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                setAsset(a);
                setError(null);
              }}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                asset?.id === a.id
                  ? 'border-[#00D4AA] bg-[#00D4AA]/10'
                  : 'border-white/10 hover:border-[#00D4AA]/50'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-white">{a.name}</h4>
                <span className="text-[#00D4AA] font-bold">{a.apy}% APY</span>
              </div>
              <p className="text-white/60 text-sm mb-3">{a.symbol}</p>
              <div className="flex items-center gap-4 text-xs text-white/50">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {a.lockPeriod} days lock
                </span>
                <span>Min: {a.minInvestment} ETH</span>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Amount Input */}
      {asset && (
        <Card className="p-6 glass border-[#00D4AA]/20">
          <h3 className="text-lg font-semibold text-white mb-4">
            {t('invest.enterAmount', 'Enter Investment Amount')}
          </h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm text-white/60 mb-2">
                <span>{t('invest.amount', 'Amount')}</span>
                <span>
                  {t('invest.balance', 'Balance')}: {balanceLoading ? '...' : `${balance} ETH`}
                </span>
              </div>
              <div className="relative">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={handleAmountChange}
                  className="h-14 text-2xl font-mono bg-white/5 border-white/10 text-white pr-20"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 font-medium">
                  ETH
                </span>
              </div>
              
              {/* Quick amount buttons */}
              <div className="flex gap-2 mt-3">
                {['25%', '50%', '75%', 'MAX'].map((percent) => (
                  <button
                    key={percent}
                    onClick={() => {
                      const balanceNum = Number(balance || '0');
                      let multiplier = 1;
                      if (percent !== 'MAX') {
                        multiplier = Number(percent.replace('%', '')) / 100;
                      }
                      const value = (balanceNum * multiplier).toFixed(6);
                      setAmount(value);
                      validateAmount(value);
                    }}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    {percent}
                  </button>
                ))}
              </div>
            </div>

            {/* Validation Error */}
            {(validationError || error) && (
              <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-400">
                  {validationError || error}
                </AlertDescription>
              </Alert>
            )}

            {/* Yield Preview */}
            {amount && !validationError && expectedYield && (
              <div className="p-4 rounded-xl bg-[#00D4AA]/10 border border-[#00D4AA]/30">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-5 w-5 text-[#00D4AA]" />
                  <span className="font-medium text-[#00D4AA]">
                    {t('invest.expectedYield', 'Expected Yield')}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Investment Amount</span>
                    <span className="text-white font-medium">{amount} ETH</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">APY</span>
                    <span className="text-[#00D4AA] font-medium">{asset.apy}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Lock Period</span>
                    <span className="text-white font-medium">{asset.lockPeriod} days</span>
                  </div>
                  <div className="h-px bg-white/10 my-2" />
                  <div className="flex justify-between">
                    <span className="text-white/80">Expected Return</span>
                    <span className="text-[#00D4AA] font-bold text-lg">
                      +{expectedYield} ETH
                    </span>
                  </div>
                  {lockEndDate && (
                    <div className="flex justify-between text-xs text-white/50">
                      <span>Unlock Date</span>
                      <span>{lockEndDate.toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Asset Info */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-start gap-2 text-sm text-white/60">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p>Minimum investment: {asset.minInvestment} ETH</p>
                  <p>Maximum investment: {asset.maxInvestment} ETH</p>
                  <p>Your investment will be locked for {asset.lockPeriod} days</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Continue Button */}
      <div className="flex justify-end">
        <Button
          variant="primary"
          size="lg"
          onClick={handleContinue}
          disabled={!asset || !amount || !!validationError}
          className="min-w-[200px]"
        >
          {t('common.continue', 'Continue')}
        </Button>
      </div>
    </div>
  );
}
