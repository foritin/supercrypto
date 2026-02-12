'use client'
/**
 * Subscription Modal Component
 * 认购弹窗组件
 * 
 * 已迁移至 shadcn/ui + Tailwind CSS
 */
import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAccount } from 'wagmi'
import { DollarSign, Calendar, Percent, TrendingUp, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { notification } from '@/lib/notification'
import {
  subscriptionService,
  TOKEN_TYPE_OPTIONS,
  LOCK_PERIOD_OPTIONS,
} from '@/services/subscription'
import type {
  SubscriptionPreviewResponse,
  TokenType,
  LockPeriod,
} from '@/types/subscription'
import type { AssetDetail } from '@/services/asset'
import { useSubscriptionContract } from '@/hooks'

// ============ Segmented Control Component ============
interface SegmentedOption<T> {
  value: T
  label: React.ReactNode
}

interface SegmentedControlProps<T extends string | number> {
  value: T
  onChange: (value: T) => void
  options: SegmentedOption<T>[]
  className?: string
}

function SegmentedControl<T extends string | number>({
  value,
  onChange,
  options,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div className={cn("flex rounded-lg border border-white/10 bg-[rgba(17,25,22,0.6)] p-1 gap-1", className)}>
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          className={cn(
            "flex-1 px-3 py-2 rounded-md text-sm transition-all duration-200",
            value === opt.value
              ? "bg-primary text-primary-foreground shadow-md"
              : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
          )}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ============ Main Component ============
interface SubscriptionModalProps {
  open: boolean
  asset: AssetDetail | null
  onClose: () => void
  onSuccess: () => void
}

export function SubscriptionModal({ open, asset, onClose, onSuccess }: SubscriptionModalProps) {
  const { t } = useTranslation()
  const { isConnected } = useAccount()
  
  // Contract integration
  const {
    isContractReady,
    usdtAllowance,
    approveUSDT,
    subscribe: contractSubscribe,
    reset: resetContract,
  } = useSubscriptionContract()
  
  // Form values
  const [amount, setAmount] = useState<number>(0)
  const [tokenType, setTokenType] = useState<TokenType>('USDT')
  const [lockPeriod, setLockPeriod] = useState<LockPeriod>(3)
  
  // Preview state
  const [preview, setPreview] = useState<SubscriptionPreviewResponse | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  
  // Transaction state for UI feedback
  const [txState, setTxState] = useState<'idle' | 'signing' | 'pending' | 'confirming' | 'success'>('idle')
  
  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Reset form when modal opens
  useEffect(() => {
    if (open && asset) {
      setAmount(asset.min_subscription)
      setTokenType('USDT')
      setLockPeriod(3)
      setPreview(null)
      setTxState('idle')
    }
  }, [open, asset])
  
  // Reset tx state when modal closes
  useEffect(() => {
    if (!open) {
      setTxState('idle')
    }
  }, [open])
  
  // Fetch preview when form values change
  useEffect(() => {
    if (!asset || !amount || amount < asset.min_subscription) {
      setPreview(null)
      return
    }
    
    const fetchPreview = async () => {
      setPreviewLoading(true)
      try {
        const result = await subscriptionService.previewSubscription({
          asset_id: asset.id,
          amount,
          token_type: tokenType,
          lock_period: lockPeriod,
        })
        setPreview(result)
      } catch {
        setPreview(null)
      } finally {
        setPreviewLoading(false)
      }
    }
    
    const debounce = setTimeout(fetchPreview, 300)
    return () => clearTimeout(debounce)
  }, [asset, amount, tokenType, lockPeriod])
  
  // Check if approval is needed
  const needsApproval = isContractReady && tokenType === 'USDT' && 
    (usdtAllowance ?? 0) < amount

  // Handle amount input change
  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, '')
    const numValue = parseFloat(value) || 0
    setAmount(numValue)
  }, [])

  // Submit subscription with real or simulated transaction flow
  const handleSubmit = async () => {
    if (!asset || !preview) {
      notification.error('Invalid state')
      return
    }

    setIsSubmitting(true)
    
    try {
      let txHash: string
      
      // Use real contract if deployed, otherwise simulate
      if (isContractReady && tokenType === 'USDT') {
        // ========== Real Contract Flow ==========
        
        // Step 1: Approve if needed
        if (needsApproval) {
          setTxState('signing')
          const approved = await approveUSDT(amount)
          if (!approved) throw new Error('Approval failed')
        }
        
        // Step 2: Subscribe
        setTxState('pending')
        const result = await contractSubscribe(amount, lockPeriod)
        if (!result) throw new Error('Transaction failed')
        
        txHash = result
        setTxState('confirming')
        
      } else {
        // ========== Simulated Flow (for USDC or no contract) ==========
        
        // Step 1: Signing (simulated)
        setTxState('signing')
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Step 2: Pending (simulated)
        setTxState('pending')
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Step 3: Confirming (simulated)
        setTxState('confirming')
        
        // Generate mock tx hash
        txHash = `0x${Date.now().toString(16)}${'0'.repeat(48)}`
      }
      
      // Save to backend
      await subscriptionService.createSubscription({
        asset_id: asset.id,
        amount,
        token_type: tokenType,
        lock_period: lockPeriod,
        tx_hash: txHash,
      })
      
      // Step 4: Success
      setTxState('success')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      notification.success(t('subscription.createSuccess'))
      resetContract()
      onSuccess()
      onClose()
    } catch (error) {
      setTxState('idle')
      resetContract()
      notification.error((error as Error).message || t('common.error'))
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Get button text based on transaction state
  const getButtonText = () => {
    switch (txState) {
      case 'signing':
        return t('subscription.signing')
      case 'pending':
        return t('subscription.pending')
      case 'confirming':
        return t('subscription.confirming')
      case 'success':
        return t('subscription.success')
      default:
        return t('subscription.confirm')
    }
  }
  
  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }
  
  // Format number with commas
  const formatNumber = (num: number) => {
    return num.toLocaleString('en-US', { maximumFractionDigits: 2 })
  }
  
  if (!asset) return null
  
  const isButtonDisabled = !preview || !isConnected || amount < asset.min_subscription || txState !== 'idle'
  const isLoading = isSubmitting || txState !== 'idle'
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            {t('subscription.title')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-6">
          {/* Asset Info */}
          <Card className="bg-[rgba(17,25,22,0.6)]">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{asset.name}</span>
                <span className="text-muted-foreground">({asset.symbol})</span>
              </div>
            </CardContent>
          </Card>
          
          {/* Wallet Check */}
          {!isConnected && (
            <Alert variant="warning">
              <AlertDescription>
                {t('subscription.connectWalletFirst')}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Subscription Form */}
          <div className="space-y-5">
            {/* Token Type */}
            <div className="space-y-2">
              <Label>{t('subscription.tokenType')}</Label>
              <SegmentedControl
                value={tokenType}
                onChange={setTokenType}
                options={TOKEN_TYPE_OPTIONS.map(opt => ({
                  value: opt.value,
                  label: (
                    <span className="flex items-center justify-center gap-1.5">
                      <DollarSign className="h-4 w-4" />
                      {opt.label}
                    </span>
                  ),
                }))}
              />
            </div>
            
            {/* Lock Period */}
            <div className="space-y-2">
              <Label>{t('subscription.lockPeriod')}</Label>
              <SegmentedControl
                value={lockPeriod}
                onChange={setLockPeriod}
                options={LOCK_PERIOD_OPTIONS.map(opt => ({
                  value: opt.value,
                  label: (
                    <div className="flex flex-col items-center py-1">
                      <span className="text-sm">{opt.label}</span>
                      <span className="text-xs text-primary">
                        {opt.value === 3 ? asset.apy_3m : opt.value === 6 ? asset.apy_6m : asset.apy_12m}% APY
                      </span>
                    </div>
                  ),
                }))}
              />
            </div>
            
            {/* Amount */}
            <div className="space-y-2">
              <Label>{t('subscription.amount')}</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="text"
                  value={formatNumber(amount)}
                  onChange={handleAmountChange}
                  className="pl-7 h-11 text-base"
                  placeholder="0"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t('subscription.minAmount')}: ${formatNumber(asset.min_subscription)}
              </p>
            </div>
          </div>
          
          {/* Divider */}
          <div className="h-px bg-white/10" />
          
          {/* Preview */}
          <Card className="bg-[rgba(17,25,22,0.6)]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-primary" />
                {t('subscription.preview')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {previewLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : preview ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Percent className="h-4 w-4" />
                      {t('subscription.apy')}
                    </span>
                    <span className="font-semibold text-green-500">{preview.apy}%</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      {t('subscription.expectedInterest')}
                    </span>
                    <span className="font-semibold">${preview.expected_interest.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      {t('subscription.totalReturn')}
                    </span>
                    <span className="font-semibold text-primary text-lg">
                      ${preview.total_return.toFixed(2)}
                    </span>
                  </div>
                  
                  {/* Divider */}
                  <div className="h-px bg-white/10 my-2" />
                  
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {t('subscription.maturityDate')}
                    </span>
                    <span>{formatDate(preview.end_date)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-sm">{t('subscription.rwaTokens')}</span>
                    <span className="text-muted-foreground text-sm">
                      {preview.rwa_token_amount.toFixed(4)} {preview.asset_symbol}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  {t('subscription.enterAmountToPreview')}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={txState !== 'idle'}
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isButtonDisabled}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {getButtonText()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
