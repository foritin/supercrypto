'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { StepIndicator } from '@/components/invest/step-indicator';
import { cn } from '@/lib/utils';
import { 
  ArrowLeft, 
  Wallet, 
  TrendingUp, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  Loader2,
  Coins,
  Receipt,
  ArrowRight,
  Shield,
  Info
} from 'lucide-react';

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

// Risk config
const riskConfig = {
  low: { color: 'bg-green-500/20 text-green-400 border-green-500/30', label: 'Low Risk' },
  medium: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', label: 'Medium Risk' },
  high: { color: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'High Risk' },
};

// Step definitions
const steps = [
  { title: 'Amount', description: 'Enter redeem amount' },
  { title: 'Preview', description: 'Review details' },
  { title: 'Confirm', description: 'Submit transaction' },
];

// Fee configuration
const REDEMPTION_FEE_RATE = 0.001; // 0.1%

export default function RedeemPage() {
  const router = useRouter();
  const params = useParams();
  const [currentStep, setCurrentStep] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [asset] = React.useState(mockAssetData);
  const [redeemAmount, setRedeemAmount] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [txStatus, setTxStatus] = React.useState<'pending' | 'success' | 'failed'> | null>(null);
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
      <div className="min-h-screen bg-[#0A0F0D] pt-24 pb-16 px-4 sm:px-6">
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
      <div className="min-h-screen bg-[#0A0F0D] pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-md mx-auto">
          <Card className="glass border-[#00D4AA]/30 p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-[#00D4AA]/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-[#00D4AA]" />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2">Redemption Successful!</h2>
            <p className="text-white/60 mb-6">
              Your redemption of <span className="text-[#00D4AA] font-semibold">${redeemValue.toLocaleString()}</span> has been processed successfully.
            </p>
            
            <div className="p-4 rounded-lg bg-white/5 mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-white/50">Received</span>
                <span className="text-white font-semibold">${receiveAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-white/50">Transaction Hash</span>
                <a 
                  href={`https://etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#00D4AA] hover:underline text-sm"
                >
                  {txHash.slice(0, 6)}...{txHash.slice(-4)}
                </a>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Status</span>
                <span className="text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Confirmed
                </span>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 border-white/10"
                onClick={() => router.push('/portfolio')}
              >
                View Portfolio
              </Button>
              <Button 
                className="flex-1 bg-[#00D4AA] hover:bg-[#00B896] text-[#0A0F0D]"
                onClick={() => router.push('/assets')}
              >
                Explore Assets
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0F0D] pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <Button
          variant="ghost"
          onClick={handlePrevStep}
          className="mb-6 text-white/60 hover:text-white hover:bg-white/5 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {currentStep === 0 ? 'Back to Asset' : 'Back'}
        </Button>

        {/* Step Indicator */}
        <div className="mb-8">
          <StepIndicator steps={steps} currentStep={currentStep} />
        </div>

        {/* Main Content */}
        <Card className="glass border-[#00D4AA]/20 overflow-hidden">
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
                    {riskInfo.label}
                  </Badge>
                </div>
                <p className="text-white/50 text-sm">{asset.symbol} • Matured</p>
              </div>
              <div className="text-right">
                <p className="text-white/50 text-xs mb-1">Current Value</p>
                <p className="text-xl font-bold text-[#00D4AA]">${asset.currentValue.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Step Content */}
          <div className="p-6">
            {/* Step 1: Enter Amount */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-white/70 text-sm mb-2">Redemption Amount</label>
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
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[#00D4AA] hover:text-[#00B896] hover:bg-[#00D4AA]/10"
                    >
                      MAX
                    </Button>
                  </div>
                  <p className="text-white/40 text-xs mt-2">
                    Available: ${maxRedeemAmount.toLocaleString()}
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
                      <p className="text-blue-400 font-medium text-sm mb-1">Redemption Info</p>
                      <p className="text-blue-400/70 text-xs">
                        This investment has matured. You can redeem your full principal plus accrued yield. 
                        A 0.1% redemption fee applies.
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleNextStep}
                  disabled={!canProceed}
                  className="w-full h-12 bg-[#00D4AA] hover:bg-[#00B896] text-[#0A0F0D] font-semibold disabled:opacity-50"
                >
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Step 2: Preview */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-[#00D4AA]" />
                  Redemption Preview
                </h3>

                {/* Amount Breakdown */}
                <div className="p-4 rounded-lg bg-white/5 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-white/60">Redemption Amount</span>
                    <span className="text-white font-medium">${redeemValue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">Principal Portion</span>
                    <span className="text-white/60">${principalPortion.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">Yield Portion</span>
                    <span className="text-green-400">+${yieldPortion.toLocaleString()}</span>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div className="flex justify-between">
                    <span className="text-white/60">Redemption Fee (0.1%)</span>
                    <span className="text-red-400">-${feeAmount.toFixed(2)}</span>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div className="flex justify-between">
                    <span className="text-white font-medium">You Will Receive</span>
                    <span className="text-[#00D4AA] font-bold text-lg">${receiveAmount.toLocaleString()}</span>
                  </div>
                </div>

                {/* Yield Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-[#00D4AA]/5 border border-[#00D4AA]/10">
                    <div className="flex items-center gap-2 text-[#00D4AA] mb-1">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-sm">Total Yield</span>
                    </div>
                    <p className="text-xl font-bold text-white">${asset.totalYield.toLocaleString()}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5">
                    <div className="flex items-center gap-2 text-white/60 mb-1">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">Lock Period</span>
                    </div>
                    <p className="text-xl font-bold text-white">{asset.lockPeriod} months</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handlePrevStep}
                    className="flex-1 h-12 border-white/10 text-white hover:bg-white/5"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleNextStep}
                    className="flex-1 h-12 bg-[#00D4AA] hover:bg-[#00B896] text-[#0A0F0D] font-semibold"
                  >
                    Confirm Redemption
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
                      <div className="w-16 h-16 rounded-full bg-[#00D4AA]/10 flex items-center justify-center mx-auto mb-4">
                        <Shield className="h-8 w-8 text-[#00D4AA]" />
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">Confirm Transaction</h3>
                      <p className="text-white/60 text-sm">
                        Please review and confirm your redemption transaction
                      </p>
                    </div>

                    <div className="p-4 rounded-lg bg-white/5 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-white/60">Redeem</span>
                        <span className="text-white">${redeemValue.toLocaleString()} {asset.symbol}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Receive</span>
                        <span className="text-[#00D4AA] font-semibold">${receiveAmount.toLocaleString()} USDC</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-white/40">Network Fee</span>
                        <span className="text-white/60">~$2.50</span>
                      </div>
                    </div>

                    <Button
                      onClick={handleSubmit}
                      className="w-full h-12 bg-[#00D4AA] hover:bg-[#00B896] text-[#0A0F0D] font-semibold"
                    >
                      Submit Transaction
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </>
                )}

                {/* Pending State */}
                {isSubmitting && (
                  <div className="text-center py-8">
                    <div className="relative w-20 h-20 mx-auto mb-6">
                      <div className="absolute inset-0 rounded-full border-4 border-[#00D4AA]/20" />
                      <div className="absolute inset-0 rounded-full border-4 border-[#00D4AA] border-t-transparent animate-spin" />
                      <Loader2 className="absolute inset-0 m-auto h-8 w-8 text-[#00D4AA] animate-spin" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Processing Redemption</h3>
                    <p className="text-white/60">
                      Please wait while your transaction is being processed...
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
          Secured by blockchain technology. All transactions are irreversible.
        </p>
      </div>
    </div>
  );
}
