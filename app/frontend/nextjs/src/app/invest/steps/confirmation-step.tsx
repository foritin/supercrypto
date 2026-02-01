'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTransactionContext } from '@/contexts/transaction-context';
import { useWallet } from '@/hooks/use-wallet';
import { useNativeBalance } from '@/hooks/use-balance';
import { GasSelector } from '@/components/invest/gas-selector';
import { NetworkCheck } from '@/components/invest/network-check';
import { ArrowLeft, ArrowRight, AlertTriangle, Shield, FileText } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { parseEther, type Address } from 'viem';

export function ConfirmationStep() {
  const { t } = useTranslation();
  const { address } = useWallet();
  const { formatted: balance } = useNativeBalance();
  const {
    asset,
    amount,
    expectedYield,
    lockEndDate,
    selectedGas,
    nextStep,
    prevStep,
  } = useTransactionContext();

  const [agreedToTerms, setAgreedToTerms] = React.useState(false);

  if (!asset || !amount) {
    return (
      <Card className="p-8 glass border-[#00D4AA]/20 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
        <p className="text-white/60">
          {t('invest.noData', 'Missing investment data. Please go back and try again.')}
        </p>
        <Button variant="outline" className="mt-4" onClick={prevStep}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.back', 'Back')}
        </Button>
      </Card>
    );
  }

  const amountBigInt = parseEther(amount);
  const totalCost = amountBigInt; // Add gas cost in production

  return (
    <div className="space-y-6">
      <NetworkCheck>
        <Card className="p-6 glass border-[#00D4AA]/20">
          <h3 className="text-lg font-semibold text-white mb-6">
            {t('invest.confirmDetails', 'Confirm Investment Details')}
          </h3>

          <div className="space-y-6">
            {/* Investment Summary */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-white/10">
                <span className="text-white/60">Asset</span>
                <div className="text-right">
                  <p className="font-medium text-white">{asset.name}</p>
                  <p className="text-sm text-white/50">{asset.symbol}</p>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-white/60">Investment Amount</span>
                <span className="font-medium text-white text-lg">{amount} ETH</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-white/60">APY</span>
                <span className="font-medium text-[#00D4AA]">{asset.apy}%</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-white/60">Lock Period</span>
                <span className="font-medium text-white">{asset.lockPeriod} days</span>
              </div>

              {lockEndDate && (
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Unlock Date</span>
                  <span className="font-medium text-white">
                    {lockEndDate.toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              )}

              <div className="h-px bg-white/10" />

              <div className="flex justify-between items-center">
                <span className="text-white/80 font-medium">Expected Return</span>
                <span className="font-bold text-[#00D4AA] text-lg">+{expectedYield} ETH</span>
              </div>
            </div>

            {/* Gas Selector */}
            <GasSelector
              to={asset.tokenAddress}
              value={amountBigInt}
            />

            {/* Risk Warning */}
            <Alert className="bg-amber-500/10 border-amber-500/30">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <AlertDescription className="text-amber-400/80 text-sm">
                {t('invest.riskWarning', 
                  'Investing in RWA involves risks including potential loss of capital. ' +
                  'Your funds will be locked for {{days}} days. Please ensure you understand the risks before proceeding.',
                  { days: asset.lockPeriod }
                )}
              </AlertDescription>
            </Alert>

            {/* Terms Agreement */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="terms"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-white/20 bg-white/5 text-[#00D4AA] focus:ring-[#00D4AA]/50"
              />
              <label htmlFor="terms" className="text-sm text-white/60 cursor-pointer">
                {t('invest.agreeToTerms', 
                  'I have read and agree to the {{terms}} and {{risks}} associated with this investment.',
                  {
                    terms: (
                      <a href="/terms" className="text-[#00D4AA] hover:underline" target="_blank">
                        Terms of Service
                      </a>
                    ),
                    risks: (
                      <a href="/risk-disclosure" className="text-[#00D4AA] hover:underline" target="_blank">
                        Risk Disclosure
                      </a>
                    ),
                  }
                )}
              </label>
            </div>

            {/* Security Note */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-[#00D4AA]/5 border border-[#00D4AA]/20">
              <Shield className="h-4 w-4 text-[#00D4AA]" />
              <span className="text-sm text-[#00D4AA]/80">
                {t('invest.secureTransaction', 'This transaction will be securely signed by your wallet')}
              </span>
            </div>
          </div>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            size="lg"
            onClick={prevStep}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('common.back', 'Back')}
          </Button>

          <Button
            variant="primary"
            size="lg"
            onClick={nextStep}
            disabled={!agreedToTerms}
            className="gap-2"
          >
            {t('invest.confirmAndSign', 'Confirm & Sign')}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </NetworkCheck>
    </div>
  );
}
