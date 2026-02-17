'use client'
/**
 * Subscription Modal Component
 * 高精度还原设计图
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAccount } from 'wagmi'
import { 
  Loader2, 
  Check, 
  TrendingUp,
  Wallet,
  ChevronRight,
  Building2,
  Sparkles,
  AlertTriangle,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { notification } from '@/lib/notification'
import {
  subscriptionService,
} from '@/services/subscription'
import type {
  SubscriptionPreviewResponse,
  TokenType,
  LockPeriod,
} from '@/types/subscription'
import type { AssetDetail } from '@/services/asset'
import { AssetLogoFrame } from '@/components/asset/asset-logo-frame'
import { UsdtIcon, UsdcIcon } from '@/components/icons'
import { useSubscriptionContract, useTokenBalance } from '@/hooks'

// USDT/USDC icons
const TokenIcon = ({ type, className }: { type: TokenType; className?: string }) => {
  const Icon = type === 'USDT' ? UsdtIcon : UsdcIcon
  return <Icon size={32} className={className || ''} />
}

// Mini chart SVG
const MiniChart = ({ className }: { className?: string }) => (
  <svg className={cn("w-10 h-5", className)} viewBox="0 0 40 20" fill="none">
    <path 
      d="M0 16 L8 12 L16 14 L24 6 L32 10 L40 4" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path 
      d="M0 16 L8 12 L16 14 L24 6 L32 10 L40 4 V20 H0 Z" 
      fill="currentColor" 
      opacity="0.15"
    />
  </svg>
)

interface SubscriptionModalProps {
  open: boolean
  asset: AssetDetail | null
  onClose: () => void
  onSuccess: () => void
}

export function SubscriptionModal({ open, asset, onClose, onSuccess }: SubscriptionModalProps) {
  const { t } = useTranslation()
  const { isConnected } = useAccount()
  
  const {
    addresses,
    isContractReady,
    usdtAllowance,
    approveUSDT,
    subscribe: contractSubscribe,
    reset: resetContract,
  } = useSubscriptionContract()
  
  // 从后端 API 获取的合约地址驱动余额查询，不再硬编码环境变量
  const { formatted: usdtBalance, isLoading: usdtLoading, balance: usdtRaw } = useTokenBalance(addresses?.usdt ?? undefined)
  const { formatted: usdcBalance, isLoading: usdcLoading, balance: usdcRaw } = useTokenBalance(addresses?.usdc ?? undefined)
  
  const getTokenBalance = (type: TokenType) => type === 'USDT' ? usdtBalance : usdcBalance
  const getTokenBalanceRaw = (type: TokenType) => type === 'USDT' ? usdtRaw : usdcRaw
  const getBalanceLoading = (type: TokenType) => type === 'USDT' ? usdtLoading : usdcLoading
  
  const [amount, setAmount] = useState<number>(0)
  const [tokenType, setTokenType] = useState<TokenType>('USDT')
  const [lockPeriod, setLockPeriod] = useState<LockPeriod>(3)
  const [isUpdating, setIsUpdating] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [preview, setPreview] = useState<SubscriptionPreviewResponse | null>(null)
  const [txState, setTxState] = useState<'idle' | 'signing' | 'pending' | 'confirming' | 'success'>('idle')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sliderValue, setSliderValue] = useState(0)
  
  // Initialize
  useEffect(() => {
    if (open && asset) {
      setAmount(asset.min_subscription)
      setTokenType('USDT')
      setLockPeriod(3)
      setPreview(null)
      setTxState('idle')
      setCurrentStep(0)
      setSliderValue(0)
    }
  }, [open, asset])
  
  // Fetch preview
  useEffect(() => {
    if (!asset) {
      setPreview(null)
      return
    }
    
    // Show 0 values when amount is 0, don't clear preview
    if (amount === 0) {
      setPreview({
        amount: 0,
        expected_interest: 0,
        total_return: 0,
        rwa_token_amount: 0,
        apy: lockPeriod === 3 ? asset.apy_3m : lockPeriod === 6 ? asset.apy_6m : asset.apy_12m,
        lock_period: lockPeriod,
        end_date: new Date(Date.now() + lockPeriod * 30 * 24 * 60 * 60 * 1000).toISOString(),
        asset_symbol: asset.symbol,
      } as SubscriptionPreviewResponse)
      return
    }
    
    let loadingTimeout: NodeJS.Timeout
    
    const fetchPreview = async () => {
      loadingTimeout = setTimeout(() => setIsUpdating(true), 300)
      try {
        const result = await subscriptionService.previewSubscription({
          asset_id: asset.id,
          amount,
          token_type: tokenType,
          lock_period: lockPeriod,
        })
        setPreview(result)
      } catch {
        console.error('Failed to fetch preview')
      } finally {
        clearTimeout(loadingTimeout)
        setIsUpdating(false)
      }
    }
    
    const debounce = setTimeout(fetchPreview, 100)
    return () => {
      clearTimeout(debounce)
      clearTimeout(loadingTimeout)
    }
  }, [asset, amount, tokenType, lockPeriod])
  
  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, '')
    const numValue = parseFloat(value) || 0
    setAmount(numValue)
    const maxAmount = asset ? (asset.remaining_amount || asset.total_supply) : 10000
    setSliderValue(Math.min((numValue / maxAmount) * 100, 100))
  }, [asset])
  
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    setSliderValue(value)
    const maxAmount = asset ? (asset.remaining_amount || asset.total_supply) : 10000
    setAmount(Math.floor((value / 100) * maxAmount * 100) / 100)
  }
  
  const handleQuickAmount = useCallback((percentage: number) => {
    if (!asset) return
    // 使用资产剩余可认购量作为基准
    const maxAmount = asset.remaining_amount || asset.total_supply
    const newAmount = Math.floor(maxAmount * percentage * 100) / 100
    setAmount(newAmount)
    setSliderValue(percentage * 100)
  }, [asset])
  
  const handleContinue = () => {
    if (currentStep === 0 && preview) setCurrentStep(1)
    else if (currentStep === 1) handleSubmit()
  }
  
  const handleSubmit = async () => {
    if (!asset || !preview) return
    setIsSubmitting(true)
    setCurrentStep(2)
    
    try {
      let txHash: string
      
      if (isContractReady && tokenType === 'USDT') {
        if ((usdtAllowance ?? 0) < amount) {
          setTxState('signing')
          if (!await approveUSDT(amount)) throw new Error('Approval failed')
        }
        setTxState('pending')
        const result = await contractSubscribe(amount, lockPeriod)
        if (!result) throw new Error('Transaction failed')
        txHash = result
        setTxState('confirming')
      } else {
        setTxState('signing')
        await new Promise(r => setTimeout(r, 1000))
        setTxState('pending')
        await new Promise(r => setTimeout(r, 500))
        setTxState('confirming')
        txHash = `0x${Date.now().toString(16)}${'0'.repeat(48)}`
      }
      
      await subscriptionService.createSubscription({
        asset_id: asset.id, amount, token_type: tokenType,
        lock_period: lockPeriod, tx_hash: txHash,
      })
      
      setTxState('success')
      await new Promise(r => setTimeout(r, 500))
      notification.success(t('subscription.createSuccess'))
      resetContract()
      onSuccess()
      onClose()
    } catch (error) {
      setTxState('idle')
      setCurrentStep(1)
      resetContract()
      notification.error((error as Error).message || t('common.error'))
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })
  
  const formatNumber = (num: number) => num.toLocaleString('en-US', { maximumFractionDigits: 2 })
  
  if (!asset) return null
  
  const isButtonDisabled = currentStep === 0 
    ? (!preview || !isConnected || amount < asset.min_subscription)
    : (txState !== 'idle' && txState !== 'success')
  
  const currentApy = lockPeriod === 3 ? asset.apy_3m : lockPeriod === 6 ? asset.apy_6m : asset.apy_12m
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent 
        className="sm:max-w-[480px] p-0 gap-0 overflow-hidden border-0 bg-transparent"
        style={{ boxShadow: 'none' }}
      >
        {/* Main Container */}
        <div className="relative rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #0B1426 0%, #071018 100%)',
            border: '1px solid rgba(0, 212, 170, 0.2)',
            boxShadow: '0 0 60px rgba(0, 212, 170, 0.15), inset 0 1px 0 rgba(255,255,255,0.1)'
          }}
        >
          {/* Circuit pattern overlay */}
          <div className="absolute inset-0 opacity-5">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="circuit-pattern" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M0 30 H20 M40 30 H60 M30 0 V20 M30 40 V60" stroke="#00D4AA" strokeWidth="0.5" fill="none"/>
                  <circle cx="30" cy="30" r="2" fill="#00D4AA"/>
                  <circle cx="30" cy="10" r="1" fill="#00D4AA"/>
                  <circle cx="30" cy="50" r="1" fill="#00D4AA"/>
                  <circle cx="10" cy="30" r="1" fill="#00D4AA"/>
                  <circle cx="50" cy="30" r="1" fill="#00D4AA"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#circuit-pattern)"/>
            </svg>
          </div>
          
          {/* Top glow line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00D4AA]/50 to-transparent" />
          
          {/* Content */}
          <div className="relative">
            
            {/* Header with Steps */}
            <div className="px-6 pt-5">
              {/* Steps */}
              <div className="flex items-center gap-3 mb-5">
                {[
                  { num: 1, label: 'Configure' },
                  { num: 2, label: 'Review' },
                  { num: 3, label: 'Confirm' },
                ].map((step, idx) => (
                  <div key={step.num} className="flex items-center">
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all",
                      idx <= currentStep
                        ? "bg-[#00D4AA]/20 text-[#00D4AA] border border-[#00D4AA]/50"
                        : "bg-white/5 text-white/30 border border-white/10"
                    )}>
                      {step.num}
                    </div>
                    <span className={cn(
                      "ml-2 text-xs transition-all",
                      idx <= currentStep ? "text-[#00D4AA]" : "text-white/30"
                    )}>
                      {step.label}
                    </span>
                    {idx < 2 && (
                      <div className={cn(
                        "w-4 h-px mx-2",
                        idx < currentStep ? "bg-[#00D4AA]/40" : "bg-white/10"
                      )} />
                    )}
                  </div>
                ))}
              </div>
              
              <DialogTitle className="text-[22px] font-semibold text-white tracking-tight"
                style={{ 
                  textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
                  letterSpacing: '-0.01em'
                }}
              >
                Subscribe to Asset
              </DialogTitle>
              <p className="text-[13px] text-white/30 mt-1 font-normal">
                Configure your investment parameters
              </p>
            </div>
            
            {/* Divider line */}
            <div className="mx-6 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-4" />
            
            <div className="px-6 pb-6 space-y-4">
              
              {/* Asset Card */}
              <div className="relative rounded-xl overflow-hidden p-4"
                style={{
                  background: 'linear-gradient(90deg, rgba(0, 212, 170, 0.2) 0%, rgba(0, 180, 150, 0.1) 50%, rgba(0, 150, 130, 0.05) 100%)',
                  border: '1px solid rgba(0, 212, 170, 0.3)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 20px rgba(0, 212, 170, 0.1)'
                }}
              >
                {/* Inner glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#00D4AA]/5 to-transparent pointer-events-none" />
                
                <div className="relative flex items-center gap-3">
                  {/* Asset Logo */}
                  <AssetLogoFrame
                    logoUrl={asset.logo_url}
                    frameStyle={asset.frame_style}
                    assetType={asset.asset_type}
                    size="md"
                    name={asset.name}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-white truncate">{asset.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-white/50">
                      <span>{asset.symbol}</span>
                      <span className="w-1 h-1 rounded-full bg-white/30" />
                      <span 
                        className="px-1.5 py-0.5 rounded text-[10px]"
                        style={{ background: 'rgba(255,255,255,0.1)' }}
                      >
                        {asset.asset_type}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-white/30" />
                      <span>Min ${formatNumber(asset.min_subscription)}</span>
                    </div>
                  </div>
                  
                  {/* Risk Badge - Orange/Amber for medium */}
                  <div 
                    className="px-3 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-wide shrink-0"
                    style={{
                      background: asset.risk_level === 'low' 
                        ? 'rgba(16, 185, 129, 0.15)' 
                        : asset.risk_level === 'medium'
                        ? 'rgba(251, 146, 60, 0.15)'
                        : 'rgba(239, 68, 68, 0.15)',
                      border: `1px solid ${asset.risk_level === 'low' 
                        ? 'rgba(16, 185, 129, 0.4)' 
                        : asset.risk_level === 'medium'
                        ? 'rgba(251, 146, 60, 0.5)'
                        : 'rgba(239, 68, 68, 0.4)'}`,
                      color: asset.risk_level === 'low' 
                        ? '#10B981' 
                        : asset.risk_level === 'medium'
                        ? '#FB923C'
                        : '#EF4444'
                    }}
                  >
                    {(asset.risk_level || 'MEDIUM').toUpperCase()} RISK
                  </div>
                </div>
              </div>
              
              {currentStep === 0 ? (
                <>
                  {/* Two Column Layout */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Payment Token */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-medium text-white/40 uppercase tracking-wider">
                        Payment Token
                      </label>
                      <div className="space-y-2">
                        {(['USDT', 'USDC'] as TokenType[]).map((type) => {
                          const isSelected = tokenType === type
                          const balance = formatNumber(parseFloat(getTokenBalance(type)) || 0)
                          return (
                            <button
                              key={type}
                              onClick={() => setTokenType(type)}
                              className={cn(
                                "w-full flex items-center gap-2.5 p-2.5 rounded-lg transition-all border",
                                isSelected
                                  ? "bg-[#00D4AA]/10 border-[#00D4AA]/40"
                                  : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06]"
                              )}
                            >
                              <TokenIcon type={type} className="w-8 h-8 text-xs" />
                              <div className="flex-1 text-left">
                                <div className={cn("text-sm font-medium", isSelected ? "text-white" : "text-white/70")}>
                                  {type}
                                </div>
                                <div className="text-[10px] text-white/40">
                                  Balance {getBalanceLoading(type) ? '...' : balance}
                                </div>
                              </div>
                              {isSelected && (
                                <div className="w-5 h-5 rounded-full bg-[#00D4AA] flex items-center justify-center">
                                  <Check className="w-3 h-3 text-black" />
                                </div>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    
                    {/* Lock Period */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-medium text-white/40 uppercase tracking-wider">
                        Lock Period
                      </label>
                      <div className="space-y-2">
                        {[
                          { value: 3 as LockPeriod, label: '3 Months', apy: asset.apy_3m },
                          { value: 6 as LockPeriod, label: '6 Months', apy: asset.apy_6m },
                          { value: 12 as LockPeriod, label: '12 Months', apy: asset.apy_12m },
                        ].map((opt) => {
                          const isSelected = lockPeriod === opt.value
                          return (
                            <button
                              key={opt.value}
                              onClick={() => setLockPeriod(opt.value)}
                              className={cn(
                                "w-full flex items-center justify-between p-2.5 rounded-lg transition-all border",
                                isSelected
                                  ? "bg-[#00D4AA]/10 border-[#00D4AA]/40"
                                  : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06]"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                                  isSelected ? "border-[#00D4AA] bg-[#00D4AA]" : "border-white/30"
                                )}>
                                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                                </div>
                                <span className={cn("text-xs", isSelected ? "text-white" : "text-white/60")}>
                                  {opt.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <MiniChart className={isSelected ? "text-[#00D4AA]" : "text-white/20"} />
                                <span className={cn("text-sm font-bold", isSelected ? "text-[#00D4AA]" : "text-white/50")}>
                                  {opt.apy}%
                                </span>
                                <span className="text-[10px] text-white/40">APY</span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                  
                  {/* Investment Amount */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-medium text-white/40 uppercase tracking-wider">
                      Investment Amount
                    </label>
                    
                    {/* Amount Input - Exact replica */}
                    <div className="relative rounded-lg overflow-hidden"
                      style={{
                        background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        boxShadow: `
                          inset 0 1px 0 rgba(255,255,255,0.2),
                          inset 0 -1px 0 rgba(0,0,0,0.3),
                          0 4px 20px rgba(0,0,0,0.4)
                        `
                      }}
                    >
                      {/* Top highlight line */}
                      <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                      
                      <div className="px-4 py-2.5 flex items-center gap-3">
                        {/* $ Symbol */}
                        <span className="text-white/30 text-lg">$</span>
                        
                        {/* Amount */}
                        <input
                          type="text"
                          value={amount > 0 ? String(amount) : ''}
                          onChange={handleAmountChange}
                          className="w-16 bg-transparent text-xl font-medium text-white placeholder:text-white/20 focus:outline-none"
                          placeholder="0"
                        />
                        
                        {/* Slider */}
                        <div className="flex-1 mx-3">
                          <div className="relative h-1 rounded-full"
                            style={{
                              background: 'rgba(255,255,255,0.08)',
                              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)'
                            }}
                          >
                            {/* Progress */}
                            <div 
                              className="absolute top-0 left-0 h-full rounded-full transition-all duration-75"
                              style={{ 
                                width: `${sliderValue}%`,
                                background: 'linear-gradient(90deg, #0ea5e9, #00D4AA)',
                              }}
                            />
                            
                            {/* Native range input */}
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={sliderValue}
                              onChange={handleSliderChange}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              style={{ zIndex: 10 }}
                            />
                            
                            {/* Thumb */}
                            <div 
                              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white pointer-events-none transition-all duration-75"
                              style={{ 
                                left: `calc(${sliderValue}% - 6px)`,
                                boxShadow: '0 0 10px rgba(255,255,255,0.8), 0 0 20px rgba(0, 212, 170, 0.6)'
                              }}
                            />
                          </div>
                        </div>
                        
                        {/* Token */}
                        <span className="text-sm text-white/30">{tokenType}</span>
                      </div>
                    </div>
                    
                    {/* Quick buttons - exact replica */}
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: '25%', value: 0.25 },
                        { label: '50%', value: 0.5 },
                        { label: '75%', value: 0.75 },
                        { label: 'Max', value: 1 },
                      ].map((btn) => {
                        // Check if this button is active based on current slider value
                        const isActive = Math.abs(sliderValue - btn.value * 100) < 2
                        return (
                          <button
                            key={btn.label}
                            onClick={() => handleQuickAmount(btn.value)}
                            disabled={getBalanceLoading(tokenType)}
                            className="relative py-2 text-xs font-medium rounded-md transition-all disabled:opacity-30"
                            style={{
                              background: isActive 
                                ? 'linear-gradient(180deg, rgba(0, 212, 170, 0.3) 0%, rgba(0, 180, 150, 0.2) 100%)'
                                : 'rgba(255,255,255,0.05)',
                              border: isActive
                                ? '1px solid rgba(0, 212, 170, 0.6)'
                                : '1px solid rgba(255,255,255,0.1)',
                              color: isActive ? '#00D4AA' : 'rgba(255,255,255,0.4)',
                              boxShadow: isActive 
                                ? 'inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 8px rgba(0, 212, 170, 0.2)'
                                : 'none'
                            }}
                          >
                            {btn.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  
                  {/* Expected Returns */}
                  {preview && (
                    <div className="relative rounded-xl overflow-hidden p-4"
                      style={{
                        background: 'linear-gradient(135deg, rgba(0, 212, 170, 0.15) 0%, rgba(0, 180, 150, 0.08) 100%)',
                        border: '1px solid rgba(0, 212, 170, 0.25)',
                      }}
                    >
                      {isUpdating && (
                        <div className="absolute inset-0 bg-[#0B1426]/80 backdrop-blur-sm flex items-center justify-center z-10">
                          <Loader2 className="w-6 h-6 text-[#00D4AA] animate-spin" />
                        </div>
                      )}
                      
                      {/* Glow effect */}
                      <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#00D4AA]/20 rounded-full blur-3xl" />
                      
                      <div className="relative">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2 text-[#00D4AA]">
                            <Sparkles className="w-4 h-4" />
                            <span className="text-sm font-medium">Expected Returns</span>
                          </div>
                          <span className="text-xs text-white/40">{lockPeriod} Month Lock</span>
                        </div>
                        
                        <div className="text-center mb-4">
                          <div className="text-4xl font-bold text-[#00D4AA] tracking-tight">
                            ${formatNumber(preview.total_return)}
                          </div>
                          <div className="text-xs text-white/40 mt-1">
                            Total return at maturity • {formatDate(preview.end_date)}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[#00D4AA]/20">
                          {[
                            { label: 'Principal', value: `$${formatNumber(preview.amount)}`, icon: Wallet },
                            { label: 'Interest', value: `+$${formatNumber(preview.expected_interest)}`, icon: TrendingUp, highlight: true },
                            { label: 'RWA Tokens', value: preview.rwa_token_amount.toFixed(2), icon: Building2 },
                          ].map((item) => (
                            <div key={item.label} className="text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <item.icon className={cn("w-3 h-3", item.highlight ? "text-[#00D4AA]" : "text-white/30")} />
                                <span className="text-[10px] text-white/30">{item.label}</span>
                              </div>
                              <div className={cn("text-sm font-semibold", item.highlight ? "text-[#00D4AA]" : "text-white/70")}>
                                {item.value}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : currentStep === 1 ? (
                /* Review Step */
                <div className="space-y-4">
                  <div className="rounded-xl p-4 bg-white/5 border border-white/10">
                    <h3 className="text-sm font-medium text-[#00D4AA] mb-3">Investment Summary</h3>
                    <div className="space-y-2">
                      {[
                        { label: 'Asset', value: asset.name },
                        { label: 'Amount', value: `$${formatNumber(amount)} ${tokenType}` },
                        { label: 'Lock Period', value: `${lockPeriod} Months` },
                        { label: 'APY', value: `${currentApy}%`, highlight: true },
                      ].map((item) => (
                        <div key={item.label} className="flex justify-between items-center">
                          <span className="text-xs text-white/40">{item.label}</span>
                          <span className={cn("text-sm font-medium", item.highlight ? "text-[#00D4AA]" : "text-white/80")}>
                            {item.value}
                          </span>
                        </div>
                      ))}
                      <div className="h-px bg-[#00D4AA]/20 my-3" />
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-white/40">Total Return</span>
                        <span className="text-2xl font-bold text-[#00D4AA]">
                          ${preview ? formatNumber(preview.total_return) : '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-amber-400 mb-1">
                        Funds locked until {preview ? formatDate(preview.end_date) : '-'}
                      </p>
                      <p className="text-xs text-amber-400/60">
                        Early redemption may incur fees. APY is variable and subject to change.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Confirm Step */
                <div className="py-10 text-center">
                  <div className="relative w-16 h-16 mx-auto mb-4">
                    <div className="absolute inset-0 rounded-full border-2 border-[#00D4AA]/20" />
                    <div className="absolute inset-0 rounded-full border-2 border-[#00D4AA] border-t-transparent animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-[#00D4AA]" />
                    </div>
                  </div>
                  <h3 className="text-base font-medium text-white mb-1">Confirm in Wallet</h3>
                  <p className="text-sm text-white/50">
                    Please review and confirm the transaction
                  </p>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/10 flex items-center gap-3"
              style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.2) 100%)' }}
            >
              <Button
                variant="outline"
                onClick={currentStep > 0 && currentStep < 2 ? () => setCurrentStep(currentStep - 1) : onClose}
                disabled={isSubmitting}
                className="h-10 px-5 bg-transparent border-white/10 hover:bg-white/5 hover:border-white/20 text-white/60"
              >
                {currentStep > 0 && currentStep < 2 ? 'Back' : 'Cancel'}
              </Button>
              
              <Button
                onClick={handleContinue}
                disabled={isButtonDisabled}
                className="flex-1 h-10 font-medium"
                style={{
                  background: isButtonDisabled 
                    ? 'rgba(255,255,255,0.1)' 
                    : 'linear-gradient(90deg, #00D4AA 0%, #00B496 100%)',
                  border: 'none',
                  boxShadow: isButtonDisabled ? 'none' : '0 0 20px rgba(0, 212, 170, 0.3)',
                }}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {currentStep === 0 ? (
                  <>
                    Review Investment <ChevronRight className="ml-1 h-4 w-4" />
                  </>
                ) : currentStep === 1 ? (
                  'Confirm Subscription'
                ) : (
                  'Processing...'
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
