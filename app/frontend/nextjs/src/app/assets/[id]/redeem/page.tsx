'use client';

import { 
  ArrowLeft, 
  TrendingUp, 
  Clock, 
  CheckCircle2,
  Loader2,
  Receipt,
  ArrowRight,
  Shield,
  Info
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useChainId } from 'wagmi';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { StepIndicator } from '@/components/ui/step-indicator';
import { cn, getExplorerUrl } from '@/lib/utils';


// Mock asset data
const mockAssetData = {
  id: '1',
  name: 'Premium Real Estate Fund I',
  symbol: 'PREFI',
  type: 'Real Estate',
  riskLevel: 'low',
  apy: 12.5,
  totalInvested: 50000,
  currentValue: 56200,
  totalYield: 6200,
  yieldPercentage: 12.4,
  lockPeriod: 12,
  daysRemaining: 0,
  startDate: '2024-01-15',
  endDate: '2025-01-15',
  status: 'matured',
  isMatured: true,
  icon: '🏢',
  image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80',
};

// Risk config - 使用 i18n key
const riskConfig = {
  low: { color: 'bg-green-500/20 text-green-400 border-green-500/30', labelKey: 'redeem.risk.low' },
  medium: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', labelKey: 'redeem.risk.medium' },
  high: { color: 'bg-red-500/20 text-red-400 border-red-500/30', labelKey: 'redeem.risk.high' },
};

// Step definitions - 使用 i18n key，在组件中通过 t() 翻译
const stepKeys = [
  { titleKey: 'redeem.steps.amount', descKey: 'redeem.steps.amountDesc' },
  { titleKey: 'redeem.steps.preview', descKey: 'redeem.steps.previewDesc' },
  { titleKey: 'redeem.steps.confirm', descKey: 'redeem.steps.confirmDesc' },
];

// Fee configuration
const REDEMPTION_FEE_RATE = 0.001; // 0.1%

export default function RedeemPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const chainId = useChainId();
  const [currentStep, setCurrentStep] = React.useState(0);

  // 动态生成翻译后的步骤
  const steps = stepKeys.map((s, index) => ({
    id: String(index + 1),
    title: t(s.titleKey),
    description: t(s.descKey),
  }));
  const [isLoading, setIsLoading] = React.useState(true);
  const [asset] = React.useState(mockAssetData);
  const [redeemAmount, setRedeemAmount] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [txStatus, setTxStatus] = React.useState<'pending' | 'success' | 'failed' | null>(null);
  const [txHash, setTxHash] = React.useState('');

  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const maxRedeemAmount = asset.currentValue;
  const redeemValue = parseFloat(redeemAmount) || 0;
  const feeAmount = redeemValue * REDEMPTION_FEE_RATE;
  const receiveAmount = redeemValue - feeAmount;
  const principalPortion = (redeemValue / asset.currentValue) * asset.totalInvested;
  const yieldPortion = redeemValue - principalPortion;

  const riskInfo = riskConfig[asset.riskLevel as keyof typeof riskConfig];

  const handleMaxClick = () => {
    setRedeemAmount(maxRedeemAmount.toString());
  };

  const handleNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else {
      router.back();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setTxStatus('pending');
    
    // Simulate transaction
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    setTxHash('0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''));
    setTxStatus('success');
    setIsSubmitting(false);
  };

  const canProceed = redeemValue > 0 && redeemValue <= maxRedeemAmount;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-dark pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <Skeleton className="h-8 w-32 mb-8" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // Success State
  if (txStatus === 'success') {
    return (
      <div className="min-h-screen bg-bg-dark pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-md mx-auto">
          <Card className="glass border-primary/30 p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2">{t('redeem.redemptionSuccessful')}</h2>
            <p className="text-white/60 mb-6">
              {t('redeem.redemptionSuccessDesc', { amount: redeemValue.toLocaleString() })}
            </p>
            
            <div className="p-4 rounded-lg bg-white/5 mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-white/50">{t('redeem.received')}</span>
                <span className="text-white font-semibold">${receiveAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-white/50">{t('redeem.txHash')}</span>
                <a 
                  href={getExplorerUrl(chainId, 'tx', txHash) || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm"
                >
                  {txHash.slice(0, 6)}...{txHash.slice(-4)}
                </a>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">{t('redeem.status')}</span>
                <span className="text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {t('redeem.confirmed')}
                </span>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 border-white/10"
                onClick={() => router.push('/portfolio')}
              >
                {t('redeem.viewPortfolio')}
              </Button>
              <Button 
                className="flex-1 bg-primary hover:bg-primary-dark text-bg-dark"
                onClick={() => router.push('/assets')}
              >
                {t('redeem.exploreAssets')}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-dark pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <Button
          variant="ghost"
          onClick={handlePrevStep}
          className="mb-6 text-white/60 hover:text-white hover:bg-white/5 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {currentStep === 0 ? t('redeem.backToAsset') : t('common.back')}
        </Button>

        {/* Step Indicator */}
        <div className="mb-8">
          <StepIndicator steps={steps} currentStep={currentStep} />
        </div>

        {/* Main Content */}
        <Card className="glass border-primary/20 overflow-hidden">
          {/* Asset Header */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-4">
              <img 
                src={asset.image} 
                alt={asset.name}
                className="w-16 h-16 rounded-xl object-cover"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold text-white">{asset.name}</h2>
                  <Badge variant="outline" className={cn(riskInfo.color, 'text-xs')}>
                    {t(riskInfo.labelKey)}
                  </Badge>
                </div>
                <p className="text-white/50 text-sm">{asset.symbol} • {t('redeem.matured')}</p>
              </div>
              <div className="text-right">
                <p className="text-white/50 text-xs mb-1">{t('redeem.currentValue')}</p>
                <p className="text-xl font-bold text-primary">${asset.currentValue.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Step Content */}
          <div className="p-6">
            {/* Step 1: Enter Amount */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-white/70 text-sm mb-2">{t('redeem.redemptionAmount')}</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50">$</span>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={redeemAmount}
                      onChange={(e) => setRedeemAmount(e.target.value)}
                      className="pl-8 pr-24 h-14 text-lg bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleMaxClick}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-primary-dark hover:bg-primary/10"
                    >
                      MAX
                    </Button>
                  </div>
                  <p className="text-white/40 text-xs mt-2">
                    {t('redeem.available', { amount: maxRedeemAmount.toLocaleString() })}
                  </p>
                </div>

                {/* Quick Amount Buttons */}
                <div className="flex gap-2">
                  {[25, 50, 75, 100].map((percent) => (
                    <Button
                      key={percent}
                      variant="outline"
                      size="sm"
                      onClick={() => setRedeemAmount((maxRedeemAmount * percent / 100).toFixed(2))}
                      className="flex-1 border-white/10 text-white/70 hover:text-white hover:bg-white/5"
                    >
                      {percent}%
                    </Button>
                  ))}
                </div>

                {/* Info Card */}
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-400 mt-0.5" />
                    <div>
                      <p className="text-blue-400 font-medium text-sm mb-1">{t('redeem.redemptionInfo')}</p>
                      <p className="text-blue-400/70 text-xs">
                        {t('redeem.redemptionInfoDesc')}
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleNextStep}
                  disabled={!canProceed}
                  className="w-full h-12 bg-primary hover:bg-primary-dark text-bg-dark font-semibold disabled:opacity-50"
                >
                  {t('common.continue')}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Step 2: Preview */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" />
                  {t('redeem.redemptionPreview')}
                </h3>

                {/* Amount Breakdown */}
                <div className="p-4 rounded-lg bg-white/5 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-white/60">{t('redeem.redemptionAmount')}</span>
                    <span className="text-white font-medium">${redeemValue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">{t('redeem.principalPortion')}</span>
                    <span className="text-white/60">${principalPortion.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">{t('redeem.yieldPortion')}</span>
                    <span className="text-green-400">+${yieldPortion.toLocaleString()}</span>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div className="flex justify-between">
                    <span className="text-white/60">{t('redeem.redemptionFee')}</span>
                    <span className="text-red-400">-${feeAmount.toFixed(2)}</span>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div className="flex justify-between">
                    <span className="text-white font-medium">{t('redeem.youWillReceive')}</span>
                    <span className="text-primary font-bold text-lg">${receiveAmount.toLocaleString()}</span>
                  </div>
                </div>

                {/* Yield Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                    <div className="flex items-center gap-2 text-primary mb-1">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-sm">{t('redeem.totalYield')}</span>
                    </div>
                    <p className="text-xl font-bold text-white">${asset.totalYield.toLocaleString()}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5">
                    <div className="flex items-center gap-2 text-white/60 mb-1">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">{t('redeem.lockPeriodLabel')}</span>
                    </div>
                    <p className="text-xl font-bold text-white">{t('redeem.monthsUnit', { months: asset.lockPeriod })}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handlePrevStep}
                    className="flex-1 h-12 border-white/10 text-white hover:bg-white/5"
                  >
                    {t('common.back')}
                  </Button>
                  <Button
                    onClick={handleNextStep}
                    className="flex-1 h-12 bg-primary hover:bg-primary-dark text-bg-dark font-semibold"
                  >
                    {t('redeem.confirmRedemption')}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Submit Transaction */}
            {currentStep === 2 && (
              <div className="space-y-6">
                {!isSubmitting && txStatus !== 'pending' && (
                  <>
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <Shield className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">{t('redeem.confirmTransaction')}</h3>
                      <p className="text-white/60 text-sm">
                        {t('redeem.confirmTransactionDesc')}
                      </p>
                    </div>

                    <div className="p-4 rounded-lg bg-white/5 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-white/60">{t('redeem.redeemLabel')}</span>
                        <span className="text-white">${redeemValue.toLocaleString()} {asset.symbol}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">{t('redeem.receiveLabel')}</span>
                        <span className="text-primary font-semibold">${receiveAmount.toLocaleString()} {t('redeem.receiveToken', 'USDC')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-white/40">{t('redeem.networkFee')}</span>
                        <span className="text-white/60">{t('redeem.estimatedNetworkFee', '~$2.50')}</span>
                      </div>
                    </div>

                    <Button
                      onClick={handleSubmit}
                      className="w-full h-12 bg-primary hover:bg-primary-dark text-bg-dark font-semibold"
                    >
                      {t('redeem.submitTransaction')}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </>
                )}

                {/* Pending State */}
                {isSubmitting && (
                  <div className="text-center py-8">
                    <div className="relative w-20 h-20 mx-auto mb-6">
                      <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                      <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                      <Loader2 className="absolute inset-0 m-auto h-8 w-8 text-primary animate-spin" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{t('redeem.processingRedemption')}</h3>
                    <p className="text-white/60">
                      {t('redeem.processingDesc')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Security Note */}
        <p className="text-center text-white/40 text-xs mt-6 flex items-center justify-center gap-1">
          <Shield className="h-3 w-3" />
          {t('redeem.securityNote')}
        </p>
      </div>
    </div>
  );
}
