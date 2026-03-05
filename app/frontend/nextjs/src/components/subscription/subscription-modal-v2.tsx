"use client";

/**
 * Subscription Modal V2
 * 升级后的认购弹窗组件
 * 
 * 流程: 参数确认 → 链上签名 → 交易结果与后续动作
 * 特点:
 * - 实时交易状态可视化
 * - 网络/权限/超时等错误状态面板
 * - 活期+定期双模式支持
 * - USDT/USDC 正式支持
 */

import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Check,
  TrendingUp,
  Wallet,
  Building2,
  Sparkles,
  AlertTriangle,
  Shield,
  Clock,
  Globe,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useAccount, useSwitchChain } from "wagmi";

import { AssetLogoFrame } from "@/components/asset/asset-logo-frame";
import { UsdtIcon, UsdcIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn , getExplorerUrl } from "@/lib/utils";
import type { AssetDetail } from "@/services/asset";
import type { TokenType, LockPeriod } from "@/types/subscription";

import { ErrorStatePanel } from "./error-states";
import { ProductSelector, type ProductType } from "./product-selector";
import {
  useSubscriptionOrchestrator,
} from "./subscription-orchestrator";
import { TransactionStatusPanel } from "./transaction-tracker";

// Token Icons
const TokenIcon = ({ type, className }: { type: TokenType; className?: string }) => {
  const Icon = type === "USDT" ? UsdtIcon : UsdcIcon;
  return <Icon size={28} className={className || ""} />;
};

// Mini Chart Component
// Step indicator component
const StepIndicator = ({ currentStep }: { currentStep: number }) => {
  const steps = [
    { id: 0, label: "Configure" },
    { id: 1, label: "Review" },
    { id: 2, label: "Confirm" },
  ];

  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((step, idx) => (
        <div key={step.id} className="flex items-center">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-500",
            step.id <= currentStep
              ? "bg-[#00D4AA]/10 border border-[#00D4AA]/40"
              : "bg-white/5 border border-white/10"
          )}>
            <div className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium transition-all",
              step.id < currentStep
                ? "bg-[#00D4AA] text-black"
                : step.id === currentStep
                ? "bg-[#00D4AA]/30 text-[#00D4AA]"
                : "bg-white/10 text-white/40"
            )}>
              {step.id < currentStep ? (
                <Check className="w-3 h-3" />
              ) : (
                step.id + 1
              )}
            </div>
            <span className={cn(
              "text-xs font-medium transition-all",
              step.id <= currentStep ? "text-[#00D4AA]" : "text-white/40"
            )}>
              {step.label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div className={cn(
              "w-6 h-px mx-1 transition-all duration-500",
              step.id < currentStep ? "bg-[#00D4AA]/50" : "bg-white/10"
            )} />
          )}
        </div>
      ))}
    </div>
  );
};

export interface SubscriptionModalV2Props {
  open: boolean;
  asset: AssetDetail | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function SubscriptionModalV2({ open, asset, onClose, onSuccess }: SubscriptionModalV2Props) {
  const { chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  
  // Orchestrator
  const orchestrator = useSubscriptionOrchestrator();
  const {
    txState,
    preview,
    context,
    reset,
    refreshPreview,
    initSubscription,
    retry,
  } = orchestrator;
  
  // UI State
  const [uiStep, setUiStep] = useState(0); // 0: Configure, 1: Review, 2: Processing
  const [amount, setAmount] = useState<string>("");
  const [tokenType, setTokenType] = useState<TokenType>("USDT");
  const [productType, setProductType] = useState<ProductType>("current");
  const [lockPeriod, setLockPeriod] = useState<LockPeriod>(3);
  const [sliderValue, setSliderValue] = useState(0);
  const [copied, setCopied] = useState(false);
  
  // Reset state when modal opens
  useEffect(() => {
    if (open && asset) {
      const timer = setTimeout(() => {
        setUiStep(0);
        setAmount(asset.min_subscription.toString());
        setTokenType("USDT");
        setProductType("current");
        setLockPeriod(3);
        setSliderValue(0);
        reset();

        // Fetch initial preview
        refreshPreview(asset.min_subscription, "USDT", 3);
      }, 0);

      return () => clearTimeout(timer);
    }

    return undefined;
  }, [open, asset, reset, refreshPreview]);
  
  // Sync preview with inputs
  useEffect(() => {
    if (!asset || uiStep !== 0) return;
    
    const numAmount = parseFloat(amount) || 0;
    const debounce = setTimeout(() => {
      refreshPreview(numAmount, tokenType, lockPeriod);
    }, 300);
    
    return () => clearTimeout(debounce);
  }, [amount, tokenType, lockPeriod, asset, uiStep, refreshPreview]);
  
  // Watch for completion
  useEffect(() => {
    if (txState === "completed") {
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    }
  }, [txState, onSuccess, onClose]);
  
  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, "");
    const numValue = parseFloat(value) || 0;
    setAmount(value);
    
    if (asset) {
      const maxAmount = asset.remaining_amount || asset.total_supply;
      const percentage = Math.min((numValue / maxAmount) * 100, 100);
      setSliderValue(percentage);
    }
  }, [asset]);
  
  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setSliderValue(value);
    
    if (asset) {
      const maxAmount = asset.remaining_amount || asset.total_supply;
      const newAmount = Math.floor((value / 100) * maxAmount * 100) / 100;
      setAmount(newAmount.toString());
    }
  }, [asset]);
  
  const handleQuickAmount = useCallback((percentage: number) => {
    if (!asset) return;
    const maxAmount = asset.remaining_amount || asset.total_supply;
    const newAmount = Math.floor(maxAmount * percentage * 100) / 100;
    setAmount(newAmount.toString());
    setSliderValue(percentage * 100);
  }, [asset]);
  
  const handleProductChange = useCallback((type: ProductType, period?: LockPeriod) => {
    setProductType(type);
    if (type === "fixed" && period) {
      setLockPeriod(period);
    }
  }, []);
  
  const handleContinue = useCallback(async () => {
    if (uiStep === 0 && preview) {
      setUiStep(1);
    } else if (uiStep === 1) {
      setUiStep(2);
      if (asset) {
        await initSubscription({
          asset,
          amount: parseFloat(amount) || 0,
          tokenType,
          lockPeriod,
        });
      }
    }
  }, [uiStep, preview, asset, amount, tokenType, lockPeriod, initSubscription]);
  
  const handleRetry = useCallback(async () => {
    if (asset) {
      await retry();
    }
  }, [retry, asset]);
  
  const handleSwitchNetwork = useCallback(() => {
    if (asset?.chain_id) {
      switchChain?.({ chainId: asset.chain_id });
    }
  }, [asset, switchChain]);
  
  const copyTxHash = useCallback(() => {
    if (context.txHash) {
      navigator.clipboard.writeText(context.txHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [context.txHash]);
  
  const formatNumber = (num: number) => num.toLocaleString("en-US", { maximumFractionDigits: 2 });
  
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric"
  });
  
  const isValidAmount = useMemo(() => {
    if (!asset || !amount) return false;
    const num = parseFloat(amount);
    return num >= asset.min_subscription && num <= (asset.remaining_amount || asset.total_supply);
  }, [amount, asset]);
  
  if (!asset) return null;
  
  const currentApy = lockPeriod === 3 ? asset.apy_3m : lockPeriod === 6 ? asset.apy_6m : asset.apy_12m;
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className="sm:max-w-[520px] p-0 gap-0 overflow-hidden border-0 bg-transparent"
        style={{ boxShadow: "none" }}
      >
        {/* Main Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(180deg, #0B1426 0%, #071018 100%)",
            border: "1px solid rgba(0, 212, 170, 0.25)",
            boxShadow: "0 0 80px rgba(0, 212, 170, 0.15), inset 0 1px 0 rgba(255,255,255,0.1)"
          }}
        >
          {/* Animated Background Grid */}
          <div className="absolute inset-0 opacity-[0.03]">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#00D4AA" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid-pattern)"/>
            </svg>
          </div>
          
          {/* Top Glow */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00D4AA]/60 to-transparent" />
          
          {/* Corner Accents */}
          <div className="absolute top-0 left-0 w-16 h-16 opacity-30">
            <div className="absolute top-3 left-3 w-4 h-px bg-[#00D4AA]" />
            <div className="absolute top-3 left-3 w-px h-4 bg-[#00D4AA]" />
          </div>
          <div className="absolute top-0 right-0 w-16 h-16 opacity-30">
            <div className="absolute top-3 right-3 w-4 h-px bg-[#00D4AA]" />
            <div className="absolute top-3 right-3 w-px h-4 bg-[#00D4AA]" />
          </div>
          
          {/* Content */}
          <div className="relative">
            
            {/* Header */}
            <div className="px-6 pt-6">
              <StepIndicator currentStep={uiStep} />
              
              <DialogTitle className="text-center">
                <span className="text-2xl font-bold text-white tracking-tight">
                  {uiStep === 0 && "Configure Investment"}
                  {uiStep === 1 && "Review Investment"}
                  {uiStep === 2 && orchestrator.txState === "completed" && "Success!"}
                  {uiStep === 2 && orchestrator.txState === "failed" && "Transaction Failed"}
                  {uiStep === 2 && !["completed", "failed"].includes(orchestrator.txState) && "Processing Transaction"}
                </span>
              </DialogTitle>
              <p className="text-center text-sm text-white/40 mt-1">
                {uiStep === 0 && "Set your investment parameters"}
                {uiStep === 1 && "Verify all details before confirming"}
                {uiStep === 2 && orchestrator.txState === "completed" && "Your investment has been confirmed"}
                {uiStep === 2 && orchestrator.txState === "failed" && orchestrator.failureReason}
                {uiStep === 2 && !["completed", "failed"].includes(orchestrator.txState) && "Please wait while we process your transaction"}
              </p>
            </div>
            
            {/* Divider */}
            <div className="mx-6 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-5" />
            
            {/* Main Content Area */}
            <div className="px-6 pb-6 min-h-[420px]">
              <AnimatePresence mode="wait">
                
                {/* Step 0: Configure */}
                {uiStep === 0 && (
                  <motion.div
                    key="configure"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-5"
                  >
                    {/* Asset Card */}
                    <div className="relative rounded-xl overflow-hidden p-4"
                      style={{
                        background: "linear-gradient(90deg, rgba(0, 212, 170, 0.15) 0%, rgba(0, 180, 150, 0.08) 50%, rgba(0, 150, 130, 0.04) 100%)",
                        border: "1px solid rgba(0, 212, 170, 0.25)",
                      }}
                    >
                      <div className="flex items-center gap-3">
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
                            <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] uppercase">
                              {asset.asset_type}
                            </span>
                          </div>
                        </div>
                        <div className={cn(
                          "px-3 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-wide shrink-0",
                          asset.risk_level === "low" && "bg-emerald-500/15 text-emerald-400 border border-emerald-500/40",
                          asset.risk_level === "medium" && "bg-amber-500/15 text-amber-400 border border-amber-500/40",
                          asset.risk_level === "high" && "bg-red-500/15 text-red-400 border border-red-500/40",
                        )}>
                          {(asset.risk_level || "MEDIUM").toUpperCase()} RISK
                        </div>
                      </div>
                    </div>
                    
                    {/* Product Type Selector */}
                    <ProductSelector
                      value={productType}
                      lockPeriod={lockPeriod}
                      onChange={handleProductChange}
                      apyCurrent={asset.apy_3m}
                      apy3m={asset.apy_3m}
                      apy6m={asset.apy_6m}
                      apy12m={asset.apy_12m}
                    />
                    
                    {/* Payment Token */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-medium text-white/40 uppercase tracking-wider">
                        Payment Token
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {(["USDT", "USDC"] as TokenType[]).map((type) => {
                          const isSelected = tokenType === type;
                          const balance = formatNumber(parseFloat(
                            type === "USDT" ? orchestrator.tokenBalance : "0"
                          ) || 0);
                          return (
                            <button
                              key={type}
                              onClick={() => setTokenType(type)}
                              className={cn(
                                "flex items-center gap-2.5 p-3 rounded-xl transition-all border",
                                isSelected
                                  ? "bg-[#00D4AA]/10 border-[#00D4AA]/50"
                                  : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06]"
                              )}
                            >
                              <TokenIcon type={type} className="w-7 h-7" />
                              <div className="flex-1 text-left">
                                <div className={cn("text-sm font-medium", isSelected ? "text-white" : "text-white/70")}>
                                  {type}
                                </div>
                                <div className="text-[10px] text-white/40">
                                  Bal: {orchestrator.isBalanceLoading ? "..." : balance}
                                </div>
                              </div>
                              {isSelected && (
                                <div className="w-4 h-4 rounded-full bg-[#00D4AA] flex items-center justify-center">
                                  <Check className="w-2.5 h-2.5 text-black" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* Amount Input */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-medium text-white/40 uppercase tracking-wider">
                          Investment Amount
                        </label>
                        <span className="text-[10px] text-white/40">
                          Min: ${formatNumber(asset.min_subscription)}
                        </span>
                      </div>
                      
                      <div className="relative rounded-xl overflow-hidden p-4"
                        style={{
                          background: "linear-gradient(180deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%)",
                          border: "1px solid rgba(255, 255, 255, 0.12)",
                          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)"
                        }}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-white/30 text-xl font-medium">$</span>
                          <input
                            type="text"
                            value={amount}
                            onChange={handleAmountChange}
                            className="flex-1 bg-transparent text-2xl font-semibold text-white placeholder:text-white/20 focus:outline-none"
                            placeholder="0.00"
                          />
                          <span className="text-sm text-white/30 font-medium">{tokenType}</span>
                        </div>
                        
                        {/* Slider */}
                        <div className="relative h-1.5 rounded-full bg-white/10">
                          <motion.div
                            className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-[#00D4AA] to-[#00B496]"
                            initial={false}
                            animate={{ width: `${sliderValue}%` }}
                            transition={{ duration: 0.1 }}
                          />
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={sliderValue}
                            onChange={handleSliderChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <motion.div
                            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg"
                            initial={false}
                            animate={{ left: `calc(${sliderValue}% - 8px)` }}
                            style={{ boxShadow: "0 0 15px rgba(0, 212, 170, 0.5)" }}
                          />
                        </div>
                      </div>
                      
                      {/* Quick Amount Buttons */}
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: "25%", value: 0.25 },
                          { label: "50%", value: 0.5 },
                          { label: "75%", value: 0.75 },
                          { label: "Max", value: 1 },
                        ].map((btn) => {
                          const isActive = Math.abs(sliderValue - btn.value * 100) < 2;
                          return (
                            <button
                              key={btn.label}
                              onClick={() => handleQuickAmount(btn.value)}
                              className={cn(
                                "py-2 text-xs font-medium rounded-lg transition-all",
                                isActive
                                  ? "bg-[#00D4AA]/20 text-[#00D4AA] border border-[#00D4AA]/50"
                                  : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                              )}
                            >
                              {btn.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* Expected Returns Preview */}
                    {orchestrator.preview && parseFloat(amount) > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative rounded-xl overflow-hidden p-4"
                        style={{
                          background: "linear-gradient(135deg, rgba(0, 212, 170, 0.12) 0%, rgba(0, 180, 150, 0.06) 100%)",
                          border: "1px solid rgba(0, 212, 170, 0.2)",
                        }}
                      >
                        {orchestrator.isPreviewLoading && (
                          <div className="absolute inset-0 bg-[#0B1426]/80 backdrop-blur-sm flex items-center justify-center z-10">
                            <Loader2 className="w-5 h-5 text-[#00D4AA] animate-spin" />
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2 text-[#00D4AA]">
                            <Sparkles className="w-4 h-4" />
                            <span className="text-sm font-medium">Expected Returns</span>
                          </div>
                          <span className="text-xs text-white/40">
                            {productType === "current" ? "Current" : `${lockPeriod}M Lock`}
                          </span>
                        </div>
                        
                        <div className="text-center mb-3">
                          <div className="text-3xl font-bold text-[#00D4AA] tracking-tight">
                            ${formatNumber(orchestrator.preview.total_return)}
                          </div>
                          <div className="text-xs text-white/40 mt-0.5">
                            Total return at maturity • {formatDate(orchestrator.preview.end_date)}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#00D4AA]/20">
                          {[
                            { label: "Principal", value: `$${formatNumber(orchestrator.preview.amount)}`, icon: Wallet },
                            { label: "Interest", value: `+$${formatNumber(orchestrator.preview.expected_interest)}`, icon: TrendingUp, highlight: true },
                            { label: "RWA Tokens", value: orchestrator.preview.rwa_token_amount.toFixed(2), icon: Building2 },
                          ].map((item) => (
                            <div key={item.label} className="text-center">
                              <div className="flex items-center justify-center gap-1 mb-0.5">
                                <item.icon className={cn("w-3 h-3", item.highlight ? "text-[#00D4AA]" : "text-white/30")} />
                                <span className="text-[10px] text-white/40">{item.label}</span>
                              </div>
                              <div className={cn("text-sm font-semibold", item.highlight ? "text-[#00D4AA]" : "text-white/70")}>
                                {item.value}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}
                
                {/* Step 1: Review */}
                {uiStep === 1 && (
                  <motion.div
                    key="review"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    {/* Summary Card */}
                    <div className="rounded-xl p-5 bg-white/[0.03] border border-white/10">
                      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-[#00D4AA]" />
                        Investment Summary
                      </h3>
                      
                      <div className="space-y-3">
                        {[
                          { label: "Asset", value: asset.name, icon: Building2 },
                          { label: "Amount", value: `$${formatNumber(parseFloat(amount))} ${tokenType}`, icon: Wallet, highlight: true },
                          { label: "Product Type", value: productType === "current" ? "Current (Flexible)" : `Fixed (${lockPeriod} Months)`, icon: Clock },
                          { label: "APY", value: `${currentApy}%`, icon: TrendingUp, highlight: true },
                        ].map((item) => (
                          <div key={item.label} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                            <div className="flex items-center gap-2 text-white/40">
                              <item.icon className="w-3.5 h-3.5" />
                              <span className="text-xs">{item.label}</span>
                            </div>
                            <span className={cn("text-sm font-medium", item.highlight ? "text-[#00D4AA]" : "text-white/80")}>
                              {item.value}
                            </span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-[#00D4AA]/20">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-white/40">Total Return</span>
                          <span className="text-2xl font-bold text-[#00D4AA]">
                            ${orchestrator.preview ? formatNumber(orchestrator.preview.total_return) : "-"}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Risk Warning */}
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/8 border border-amber-500/25">
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-amber-400/90 font-medium mb-1">
                          Funds will be locked
                        </p>
                        <p className="text-xs text-amber-400/60 leading-relaxed">
                          {productType === "current" 
                            ? "Current products allow withdrawal at any time with no penalty. " 
                            : `Funds will be locked until ${orchestrator.preview ? formatDate(orchestrator.preview.end_date) : "maturity date"}. Early redemption may incur fees. `}
                          APY is variable and subject to change based on market conditions.
                        </p>
                      </div>
                    </div>
                    
                    {/* Network Info */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                      <Globe className="w-4 h-4 text-white/40" />
                      <span className="text-xs text-white/40">Network</span>
                      <span className="text-xs text-white/70 ml-auto">
                        {asset.chain_id === 1 ? "Ethereum Mainnet" : 
                         asset.chain_id === 137 ? "Polygon" : 
                         asset.chain_id === 42161 ? "Arbitrum" : `Chain ${asset.chain_id}`}
                      </span>
                    </div>
                  </motion.div>
                )}
                
                {/* Step 2: Processing/Result */}
                {uiStep === 2 && (
                  <motion.div
                    key="processing"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col items-center justify-center py-4"
                  >
                    {/* Transaction Tracker for active states */}
                    {!["completed", "failed"].includes(orchestrator.txState) && (
                      <TransactionStatusPanel
                        state={orchestrator.txState}
                        progress={orchestrator.progress}
                        context={orchestrator.context}
                      />
                    )}
                    
                    {/* Success State */}
                    {orchestrator.txState === "completed" && (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-center"
                      >
                        <div className="relative w-24 h-24 mx-auto mb-6">
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 15 }}
                            className="absolute inset-0 rounded-full bg-[#00D4AA]/20"
                          />
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                            className="absolute inset-2 rounded-full bg-[#00D4AA]/30"
                          />
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                            className="absolute inset-4 rounded-full bg-[#00D4AA] flex items-center justify-center"
                          >
                            <Check className="w-10 h-10 text-black" strokeWidth={3} />
                          </motion.div>
                          
                          {/* Confetti particles */}
                          {[...Array(8)].map((_, i) => (
                            <motion.div
                              key={i}
                              className="absolute w-2 h-2 rounded-full bg-[#00D4AA]"
                              initial={{ 
                                x: 48, 
                                y: 48, 
                                scale: 0,
                                opacity: 1 
                              }}
                              animate={{ 
                                x: 48 + Math.cos(i * Math.PI / 4) * 60,
                                y: 48 + Math.sin(i * Math.PI / 4) * 60,
                                scale: [0, 1, 0],
                                opacity: [1, 1, 0]
                              }}
                              transition={{ 
                                duration: 0.8,
                                delay: 0.3,
                                ease: "easeOut"
                              }}
                            />
                          ))}
                        </div>
                        
                        <h3 className="text-xl font-bold text-white mb-2">
                          Subscription Confirmed!
                        </h3>
                        <p className="text-sm text-white/50 mb-6">
                          Your investment has been successfully processed
                        </p>
                        
                        {/* Transaction Details */}
                        <div className="w-full rounded-xl p-4 bg-white/[0.03] border border-white/10 mb-6">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-white/40">Transaction Hash</span>
                            <button
                              onClick={copyTxHash}
                              className="flex items-center gap-1 text-xs text-[#00D4AA] hover:underline"
                            >
                              {copied ? (
                                <><CheckCircle2 className="w-3 h-3" /> Copied</>
                              ) : (
                                <><Copy className="w-3 h-3" /> Copy</>
                              )}
                            </button>
                          </div>
                          <a
                            href={getExplorerUrl(chainId ?? 1, "tx", orchestrator.context.txHash || "") ?? undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs font-mono text-white/70 hover:text-white transition-colors"
                          >
                            {orchestrator.context.txHash?.slice(0, 20)}...{orchestrator.context.txHash?.slice(-8)}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </motion.div>
                    )}
                    
                    {/* Error State */}
                    {orchestrator.txState === "failed" && (
                      <ErrorStatePanel
                        reason={orchestrator.failureReason}
                        context={orchestrator.context}
                        onRetry={handleRetry}
                        onSwitchNetwork={handleSwitchNetwork}
                        {...(asset.chain_id !== undefined
                          ? { requiredChainId: asset.chain_id }
                          : {})}
                        {...(chainId !== undefined
                          ? { currentChainId: chainId }
                          : {})}
                        maxRetries={orchestrator.maxRetries}
                        currentRetry={orchestrator.context.retryCount}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/10"
              style={{ background: "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.2) 100%)" }}
            >
              {uiStep === 2 ? (
                // Processing/Result Footer
                <div className="flex justify-center">
                  {orchestrator.txState === "completed" ? (
                    <Button
                      onClick={onClose}
                      className="h-11 px-8 bg-[#00D4AA] hover:bg-[#00D4AA]/90 text-black font-semibold"
                    >
                      Done
                    </Button>
                  ) : orchestrator.txState === "failed" ? (
                    <div className="flex gap-3 w-full">
                      <Button
                        variant="outline"
                        onClick={onClose}
                        className="flex-1 h-11 bg-transparent border-white/10 hover:bg-white/5 text-white/60"
                      >
                        Cancel
                      </Button>
                      {orchestrator.context.retryCount < orchestrator.maxRetries && (
                        <Button
                          onClick={handleRetry}
                          className="flex-1 h-11 bg-[#00D4AA] hover:bg-[#00D4AA]/90 text-black font-semibold"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Retry
                        </Button>
                      )}
                    </div>
                  ) : (
                    // Cancel button during processing
                    <Button
                      variant="outline"
                      onClick={onClose}
                      className="h-11 px-6 bg-transparent border-white/10 hover:bg-white/5 text-white/60"
                    >
                      Close
                    </Button>
                  )}
                </div>
              ) : (
                // Normal Footer
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={uiStep > 0 ? () => setUiStep(uiStep - 1) : onClose}
                    className="h-11 px-5 bg-transparent border-white/10 hover:bg-white/5 hover:border-white/20 text-white/60"
                  >
                    {uiStep > 0 ? "Back" : "Cancel"}
                  </Button>
                  
                  <Button
                    onClick={handleContinue}
                    disabled={!isValidAmount || orchestrator.isPreviewLoading}
                    className="flex-1 h-11 font-semibold"
                    style={{
                      background: !isValidAmount || orchestrator.isPreviewLoading
                        ? "rgba(255,255,255,0.1)"
                        : "linear-gradient(90deg, #00D4AA 0%, #00B496 100%)",
                      boxShadow: !isValidAmount || orchestrator.isPreviewLoading
                        ? "none"
                        : "0 0 25px rgba(0, 212, 170, 0.3)",
                    }}
                  >
                    {orchestrator.isPreviewLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : uiStep === 0 ? (
                      <>
                        Review Investment <ArrowRight className="ml-2 w-4 h-4" />
                      </>
                    ) : (
                      "Confirm Subscription"
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
