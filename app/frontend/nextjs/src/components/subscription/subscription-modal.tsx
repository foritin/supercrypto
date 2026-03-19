"use client";

/**
 * Subscription Modal - Enhanced Edition
 * 认购弹窗组件 - 视觉与交互全面优化
 * 
 * 功能特性:
 * - 多步骤认购流程（配置 → 确认 → 处理 → 成功）
 * - 活期/定期产品选择
 * - 实时收益预览
 * - T+1 起息规则提示
 * - 交易状态追踪
 * - 错误状态处理
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
  RefreshCw,
  ArrowRight,
  ExternalLink,
  Copy,
  CheckCircle2,
  Zap,
  ChevronRight,
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAccount, useSwitchChain } from "wagmi";

import { AssetLogoFrame } from "@/components/asset/asset-logo-frame";
import { UsdtIcon, UsdcIcon } from "@/components/icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, getExplorerUrl } from "@/lib/utils";
import type { AssetDetail } from "@/services/asset";
import { usePlatformInfoStore } from "@/stores/platform-info-store";
import type { TokenType, LockPeriod } from "@/types/subscription";

import { ErrorStatePanel } from "./error-states";
import { ProductSelector, type ProductType } from "./product-selector";
import {
  useSubscriptionOrchestrator,
} from "./subscription-orchestrator";
import { TransactionStatusPanel } from "./transaction-tracker";

// ===== Utility Functions =====

const formatNumber = (num: number, decimals = 2) => {
  if (!isFinite(num) || isNaN(num)) return "0.00";
  return num.toLocaleString("en-US", { 
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals 
  });
};

const formatPercent = (num: number) => {
  if (!isFinite(num) || isNaN(num)) return "0.00";
  return num.toFixed(2);
};

// Network icons and colors
const NETWORK_CONFIG: Record<number, { name: string; icon: string; color: string; bgColor: string }> = {
  1: { name: "Ethereum", icon: "⟠", color: "#627EEA", bgColor: "rgba(98, 126, 234, 0.15)" },
  137: { name: "Polygon", icon: "⬡", color: "#8247E5", bgColor: "rgba(130, 71, 229, 0.15)" },
  42161: { name: "Arbitrum", icon: "🔷", color: "#28A0F0", bgColor: "rgba(40, 160, 240, 0.15)" },
  10: { name: "Optimism", icon: "🔴", color: "#FF0420", bgColor: "rgba(255, 4, 32, 0.15)" },
  56: { name: "BSC", icon: "🟡", color: "#F3BA2F", bgColor: "rgba(243, 186, 47, 0.15)" },
  8453: { name: "Base", icon: "🔵", color: "#0052FF", bgColor: "rgba(0, 82, 255, 0.15)" },
};

const getNetworkConfig = (chainId?: number) => {
  if (!chainId) return { name: "Unknown", icon: "⛓", color: "#888", bgColor: "rgba(136, 136, 136, 0.15)" };
  return NETWORK_CONFIG[chainId] || { name: `Chain ${chainId}`, icon: "⛓", color: "#888", bgColor: "rgba(136, 136, 136, 0.15)" };
};

// Token Icons
const TokenIcon = ({ type, className }: { type: TokenType; className?: string }) => {
  const Icon = type === "USDT" ? UsdtIcon : UsdcIcon;
  return <Icon size={28} className={className || ""} />;
};

// Animated Counter Component
const AnimatedNumber = ({ value, prefix = "", suffix = "", decimals = 2, className = "" }: { 
  value: number; 
  prefix?: string; 
  suffix?: string;
  decimals?: number;
  className?: string;
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValue = useRef(0);

  useEffect(() => {
    const startValue = previousValue.current;
    const endValue = value;
    const duration = 800;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out-cubic)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * easeOut;
      
      setDisplayValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        previousValue.current = endValue;
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return (
    <span className={className}>
      {prefix}{formatNumber(displayValue, decimals)}{suffix}
    </span>
  );
};

// Enhanced Step Indicator Component
const StepIndicator = ({ currentStep }: { currentStep: number }) => {
  const { t } = useTranslation();
  const steps = [
    { id: 0, label: t("subscription.stepConfigure") },
    { id: 1, label: t("subscription.stepReview") },
    { id: 2, label: t("subscription.stepConfirm") },
  ];

  return (
    <div className="flex items-center justify-center gap-1 mb-8">
      {steps.map((step, idx) => {
        const isCompleted = step.id < currentStep;
        const isCurrent = step.id === currentStep;
        const isPending = step.id > currentStep;

        return (
          <div key={step.id} className="flex items-center">
            <div className="relative flex flex-col items-center">
              {/* Step Circle */}
              <motion.div
                className={cn(
                  "relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500",
                  isCompleted && "bg-[#00D4AA]",
                  isCurrent && "bg-[#00D4AA]/20 border-2 border-[#00D4AA]",
                  isPending && "bg-white/5 border border-white/10"
                )}
                animate={isCurrent ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5 text-black" strokeWidth={3} />
                ) : isCurrent ? (
                  <>
                    <span className="text-[#00D4AA] font-bold text-sm">{step.id + 1}</span>
                    {/* Pulse rings for current step */}
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-[#00D4AA]"
                      animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  </>
                ) : (
                  <span className="text-white/30 font-medium text-sm">{step.id + 1}</span>
                )}
              </motion.div>

              {/* Label */}
              <span className={cn(
                "mt-2 text-[10px] font-medium uppercase tracking-wider transition-colors duration-300",
                isCompleted && "text-[#00D4AA]",
                isCurrent && "text-white",
                isPending && "text-white/30"
              )}>
                {step.label}
              </span>
            </div>

            {/* Connector Line */}
            {idx < steps.length - 1 && (
              <div className="relative w-16 h-[2px] mx-2 overflow-hidden">
                {/* Background line */}
                <div className="absolute inset-0 bg-white/10" />
                {/* Active progress line */}
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#00D4AA] to-[#00D4AA]/50"
                  initial={{ width: "0%" }}
                  animate={{ width: isCompleted ? "100%" : "0%" }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
                {/* Flowing animation for current transition */}
                {isCurrent && (
                  <motion.div
                    className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Confetti Component for Success
const SuccessConfetti = () => {
  const particles = useMemo(() => {
    return [...Array(24)].map((_, i) => ({
      id: i,
      angle: (i / 24) * 360,
      distance: 60 + Math.random() * 40,
      size: 4 + Math.random() * 4,
      delay: Math.random() * 0.2,
      color: ["#00D4AA", "#00B496", "#00F5D4", "#7FFFD4"][Math.floor(Math.random() * 4)],
    }));
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute left-1/2 top-1/2 rounded-full"
          style={{
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
          }}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
          animate={{
            x: Math.cos((particle.angle * Math.PI) / 180) * particle.distance,
            y: Math.sin((particle.angle * Math.PI) / 180) * particle.distance,
            scale: [0, 1.5, 0],
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: 1,
            delay: particle.delay,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
};

// Shimmer Button Component
const ShimmerButton = ({ 
  children, 
  onClick, 
  disabled, 
  className,
  variant = "primary"
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  disabled?: boolean;
  className?: string;
  variant?: "primary" | "secondary" | "outline";
}) => {
  const baseStyles = "relative overflow-hidden h-11 px-6 rounded-xl font-semibold transition-all duration-300";
  const variantStyles = {
    primary: cn(
      "bg-gradient-to-r from-[#00D4AA] to-[#00B496] text-black",
      !disabled && "hover:shadow-lg hover:shadow-[#00D4AA]/25 hover:scale-[1.02]"
    ),
    secondary: "bg-white/10 text-white hover:bg-white/15",
    outline: "bg-transparent border border-white/20 text-white/70 hover:bg-white/5",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(baseStyles, variantStyles[variant], disabled && "opacity-50 cursor-not-allowed", className)}
    >
      {/* Shimmer effect */}
      {!disabled && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12"
          initial={{ x: "-100%" }}
          whileHover={{ x: "100%" }}
          transition={{ duration: 0.6 }}
        />
      )}
      <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
    </button>
  );
};

// Animated Background Grid
const AnimatedGrid = () => {
  return (
    <div className="absolute inset-0 overflow-hidden opacity-[0.04]">
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 212, 170, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 212, 170, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
        animate={{
          backgroundPosition: ["0px 0px", "40px 40px"],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </div>
  );
};



export interface SubscriptionModalProps {
  open: boolean;
  asset: AssetDetail | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function SubscriptionModal({ open, asset, onClose, onSuccess }: SubscriptionModalProps) {
  const { t } = useTranslation();
  const { chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  
  const orchestrator = useSubscriptionOrchestrator();
  const {
    txState,
    preview,
    context,
    reset,
    refreshPreview,
    estimateNetworkFee,
    initSubscription,
    retry,
  } = orchestrator;
  
  const [uiStep, setUiStep] = useState(0);
  const [amount, setAmount] = useState<string>("");
  const [tokenType, setTokenType] = useState<TokenType>("USDT");
  const [productType, setProductType] = useState<ProductType>("current");
  const [lockPeriod, setLockPeriod] = useState<LockPeriod>(0);
  const [sliderValue, setSliderValue] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const platformChainId = usePlatformInfoStore((s) => s.chainInfo?.chain_id);

  const assetSubscriptionMode = asset?.subscription_mode || "both";
  const supportsCurrent = assetSubscriptionMode !== "fixed";
  const supportsFixed = assetSubscriptionMode !== "current";

  const assetMaxAmount = useMemo(
    () => (asset ? asset.remaining_amount || asset.total_supply : 0),
    [asset]
  );

  const selectedTokenBalance = useMemo(() => {
    const raw = tokenType === "USDT" ? orchestrator.usdtBalance : orchestrator.usdcBalance;
    return parseFloat(raw) || 0;
  }, [tokenType, orchestrator.usdtBalance, orchestrator.usdcBalance]);

  const selectedTokenLoading = tokenType === "USDT" ? orchestrator.usdtLoading : orchestrator.usdcLoading;

  const effectiveMaxAmount = useMemo(
    () => Math.max(0, Math.min(assetMaxAmount, selectedTokenBalance)),
    [assetMaxAmount, selectedTokenBalance]
  );

  const resolvedChainId = useMemo(
    () => asset?.chain_id ?? platformChainId,
    [asset?.chain_id, platformChainId]
  );

  const networkConfig = useMemo(() => getNetworkConfig(resolvedChainId), [resolvedChainId]);
  const networkName = useMemo(
    () => {
      if (!resolvedChainId) return t("subscription.networkUnknown");
      return networkConfig.name.startsWith("Chain ")
        ? t("subscription.chainWithId", { id: resolvedChainId })
        : networkConfig.name;
    },
    [resolvedChainId, networkConfig.name, t]
  );
  const isNetworkMatched = useMemo(
    () => Boolean(resolvedChainId && chainId && resolvedChainId === chainId),
    [resolvedChainId, chainId]
  );
  const networkStatus = useMemo(() => {
    if (!resolvedChainId) {
      return { label: t("subscription.networkUnknown"), color: "#888888" };
    }
    if (isNetworkMatched) {
      return { label: t("subscription.networkConnected"), color: "#00D4AA" };
    }
    return { label: t("subscription.networkWrong"), color: "#F97316" };
  }, [resolvedChainId, isNetworkMatched, t]);
  
  useEffect(() => {
    if (open && asset) {
      const timer = setTimeout(() => {
        setUiStep(0);
        setAmount(asset.min_subscription.toString());
        setTokenType("USDT");
        const initialProduct: ProductType = assetSubscriptionMode === "fixed" ? "fixed" : "current";
        const initialLockPeriod: LockPeriod = initialProduct === "current" ? 0 : 3;
        setProductType(initialProduct);
        setLockPeriod(initialLockPeriod);
        setSliderValue(0);
        reset();
        refreshPreview(asset.min_subscription, "USDT", initialLockPeriod);
      }, 0);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [open, asset, assetSubscriptionMode, reset, refreshPreview]);
  
  useEffect(() => {
    if (!asset || uiStep !== 0) return;
    
    const numAmount = parseFloat(amount) || 0;
    const debounce = setTimeout(() => {
      refreshPreview(numAmount, tokenType, lockPeriod);
    }, 300);
    
    return () => clearTimeout(debounce);
  }, [amount, tokenType, lockPeriod, asset, uiStep, refreshPreview]);
  
  useEffect(() => {
    if (txState === "completed") {
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 3000);
    }
  }, [txState, onSuccess, onClose]);
  
  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, "");
    const numValue = parseFloat(value) || 0;
    setAmount(value);

    const percentage = effectiveMaxAmount > 0
      ? Math.min((numValue / effectiveMaxAmount) * 100, 100)
      : 0;
    setSliderValue(percentage);
  }, [effectiveMaxAmount]);
  
  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setSliderValue(value);

    const newAmount = Math.floor((value / 100) * effectiveMaxAmount * 100) / 100;
    setAmount(newAmount.toString());
  }, [effectiveMaxAmount]);
  
  const handleQuickAmount = useCallback((percentage: number) => {
    const newAmount = Math.floor(effectiveMaxAmount * percentage * 100) / 100;
    setAmount(newAmount.toString());
    setSliderValue(percentage * 100);
  }, [effectiveMaxAmount]);
  
  const handleProductChange = useCallback((type: ProductType, period?: LockPeriod) => {
    if (type === "current") {
      if (!supportsCurrent) return;
      setProductType("current");
      setLockPeriod(0);
      return;
    }

    if (!supportsFixed) return;
    setProductType(type);
    if (type === "fixed") {
      setLockPeriod(period ?? (lockPeriod === 0 ? 3 : lockPeriod));
    }
  }, [lockPeriod, supportsCurrent, supportsFixed]);
  
  const handleContinue = useCallback(async () => {
    if (uiStep === 0) {
      const numAmount = parseFloat(amount) || 0;
      if (asset && !preview && numAmount > 0) {
        void refreshPreview(numAmount, tokenType, lockPeriod);
      }
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
  }, [uiStep, preview, asset, amount, tokenType, lockPeriod, refreshPreview, initSubscription]);
  
  const handleRetry = useCallback(async () => {
    if (asset) {
      await retry();
    }
  }, [retry, asset]);
  
  const handleSwitchNetwork = useCallback(() => {
    if (resolvedChainId) {
      switchChain?.({ chainId: resolvedChainId });
    }
  }, [resolvedChainId, switchChain]);
  
  const copyTxHash = useCallback(() => {
    if (context.txHash) {
      navigator.clipboard.writeText(context.txHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [context.txHash]);

  const isValidAmount = useMemo(() => {
    if (!asset || !amount) return false;
    const num = parseFloat(amount);
    return num >= asset.min_subscription && num <= effectiveMaxAmount;
  }, [amount, asset, effectiveMaxAmount]);

  const amountError = useMemo(() => {
    if (!amount || !asset) return null;
    const num = parseFloat(amount);
    if (num > 0 && num < asset.min_subscription) {
      return t("subscription.minimumAmountIs", { amount: formatNumber(asset.min_subscription) });
    }
    if (num > effectiveMaxAmount) {
      return t("subscription.insufficientBalanceMax", { amount: formatNumber(effectiveMaxAmount) });
    }
    return null;
  }, [amount, asset, effectiveMaxAmount, t]);

  useEffect(() => {
    if (!asset || uiStep !== 0) return;

    const currentAmount = parseFloat(amount) || 0;
    const clampedAmount = Math.min(currentAmount, effectiveMaxAmount);
    const percentage = effectiveMaxAmount > 0
      ? Math.min((clampedAmount / effectiveMaxAmount) * 100, 100)
      : 0;

    if (clampedAmount !== currentAmount) {
      setAmount(clampedAmount.toString());
    }
    setSliderValue(percentage);
  }, [tokenType, effectiveMaxAmount, asset, uiStep]);

  useEffect(() => {
    if (uiStep !== 1 || !asset) return;
    const numeric = parseFloat(amount) || 0;
    if (numeric <= 0) return;

    const timer = window.setTimeout(() => {
      void estimateNetworkFee(numeric, tokenType, lockPeriod);
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [uiStep, asset, amount, tokenType, lockPeriod, estimateNetworkFee]);
  
  if (!asset) return null;
  
  const currentApy = lockPeriod === 0 ? asset.apy_3m * 0.6 : lockPeriod === 3 ? asset.apy_3m : lockPeriod === 6 ? asset.apy_6m : asset.apy_12m;
  const numericAmount = parseFloat(amount) || 0;
  const fixedTotalReturnFallback =
    numericAmount + numericAmount * (currentApy / 100) * (lockPeriod / 12);
  const reviewTotalReturn =
    productType === "fixed"
      ? (orchestrator.preview?.total_return ?? fixedTotalReturnFallback)
      : null;

  // Page transition variants
  const pageVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0,
      scale: 0.98,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 50 : -50,
      opacity: 0,
      scale: 0.98,
    }),
  };
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className="sm:max-w-[540px] p-0 gap-0 overflow-hidden border-0 bg-transparent"
        style={{ boxShadow: "none" }}
      >
        {/* Main Container with Glowing Border */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(180deg, #0B1426 0%, #071018 100%)",
            border: "1px solid rgba(0, 212, 170, 0.2)",
            boxShadow: "0 0 60px rgba(0, 212, 170, 0.1), 0 25px 50px -12px rgba(0, 0, 0, 0.5)"
          }}
        >
          {/* Animated Background Grid */}
          <AnimatedGrid />
          
          {/* Top Glow Line */}
          <div className="absolute top-0 left-0 right-0 h-[2px]">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00D4AA] to-transparent"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
          </div>
          
          {/* Corner Accents */}
          <div className="absolute top-0 left-0 w-20 h-20 opacity-40">
            <div className="absolute top-4 left-4 w-6 h-[2px] bg-gradient-to-r from-[#00D4AA] to-transparent" />
            <div className="absolute top-4 left-4 w-[2px] h-6 bg-gradient-to-b from-[#00D4AA] to-transparent" />
          </div>
          <div className="absolute top-0 right-0 w-20 h-20 opacity-40">
            <div className="absolute top-4 right-4 w-6 h-[2px] bg-gradient-to-l from-[#00D4AA] to-transparent" />
            <div className="absolute top-4 right-4 w-[2px] h-6 bg-gradient-to-b from-[#00D4AA] to-transparent" />
          </div>
          
          {/* Content */}
          <div className="relative">
            
            {/* Header */}
            <div className="px-6 pt-8 pb-2">
              <StepIndicator currentStep={uiStep} />
              
              <DialogTitle className="text-center">
                <motion.span 
                  key={`title-${uiStep}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-2xl font-bold text-white tracking-tight block"
                >
                  {uiStep === 0 && t("subscription.configureInvestmentTitle")}
                  {uiStep === 1 && t("subscription.reviewInvestmentTitle")}
                  {uiStep === 2 && orchestrator.txState === "completed" && t("subscription.investmentSuccessfulTitle")}
                  {uiStep === 2 && orchestrator.txState === "failed" && t("subscription.transactionFailedTitle")}
                  {uiStep === 2 && !["completed", "failed"].includes(orchestrator.txState) && t("subscription.processingTransactionTitle")}
                </motion.span>
              </DialogTitle>
              <DialogDescription asChild>
                <motion.p
                  key={`desc-${uiStep}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-center text-sm text-white/50 mt-2"
                >
                  {uiStep === 0 && t("subscription.configureInvestmentDesc")}
                  {uiStep === 1 && t("subscription.reviewInvestmentDesc")}
                  {uiStep === 2 && orchestrator.txState === "completed" && t("subscription.investmentSuccessOnchainDesc")}
                  {uiStep === 2 && orchestrator.txState === "failed" && orchestrator.failureReason}
                  {uiStep === 2 && !["completed", "failed"].includes(orchestrator.txState) && t("subscription.processingTransactionDesc")}
                </motion.p>
              </DialogDescription>
            </div>
            
            {/* Divider with Gradient */}
            <div className="mx-6 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent my-5" />
            
            {/* Main Content Area */}
            <div className="px-6 pb-6 min-h-[440px]">
              <AnimatePresence mode="wait" custom={uiStep}>
                
                {/* Step 0: Configure */}
                {uiStep === 0 && (
                  <motion.div
                    key="configure"
                    custom={1}
                    variants={pageVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-5"
                  >
                    {/* Asset Card */}
                    <div className="relative rounded-xl overflow-hidden p-4 group"
                      style={{
                        background: "linear-gradient(135deg, rgba(0, 212, 170, 0.12) 0%, rgba(0, 180, 150, 0.05) 100%)",
                        border: "1px solid rgba(0, 212, 170, 0.25)",
                      }}
                    >
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                        initial={{ x: "-100%" }}
                        whileHover={{ x: "100%" }}
                        transition={{ duration: 0.6 }}
                      />
                      <div className="relative flex items-center gap-3">
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
                              className="w-4 h-4 flex items-center justify-center text-[10px] rounded"
                              style={{ backgroundColor: networkConfig.bgColor, color: networkConfig.color }}
                            >
                              {networkConfig.icon}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] uppercase">
                              {asset.asset_type}
                            </span>
                          </div>
                        </div>
                        <div className={cn(
                          "px-3 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-wide shrink-0 border",
                          asset.risk_level === "low" && "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
                          asset.risk_level === "medium" && "bg-amber-500/10 text-amber-400 border-amber-500/30",
                          asset.risk_level === "high" && "bg-red-500/10 text-red-400 border-red-500/30",
                        )}>
                          {(asset.risk_level || "MEDIUM").toUpperCase()} {t("subscription.riskSuffix")}
                        </div>
                      </div>
                    </div>
                    
                    {/* Product Type Selector */}
                    <ProductSelector
                      value={productType}
                      lockPeriod={lockPeriod}
                      onChange={handleProductChange}
                      subscriptionMode={assetSubscriptionMode}
                      apyCurrent={asset.apy_3m}
                      apy3m={asset.apy_3m}
                      apy6m={asset.apy_6m}
                      apy12m={asset.apy_12m}
                    />
                    
                    {/* Payment Token */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
                        {t("subscription.tokenType")}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {(["USDT", "USDC"] as TokenType[]).map((type) => {
                          const isSelected = tokenType === type;
                          const balance = formatNumber(parseFloat(
                            type === "USDT" ? orchestrator.usdtBalance : orchestrator.usdcBalance
                          ) || 0);
                          const loading = type === "USDT" ? orchestrator.usdtLoading : orchestrator.usdcLoading;
                          return (
                            <motion.button
                              key={type}
                              onClick={() => setTokenType(type)}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className={cn(
                                "flex items-center gap-2.5 p-3 rounded-xl transition-all border",
                                isSelected
                                  ? "bg-[#00D4AA]/10 border-[#00D4AA]/60 shadow-lg shadow-[#00D4AA]/10"
                                  : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20"
                              )}
                            >
                              <TokenIcon type={type} className="w-7 h-7" />
                              <div className="flex-1 text-left">
                                <div className={cn("text-sm font-semibold", isSelected ? "text-white" : "text-white/70")}>
                                  {type}
                                </div>
                                <div className="text-[10px] text-white/40">
                                  {t("subscription.balance")}: {loading ? "..." : `$${balance}`}
                                </div>
                              </div>
                              {isSelected && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="w-5 h-5 rounded-full bg-[#00D4AA] flex items-center justify-center"
                                >
                                  <Check className="w-3 h-3 text-black" strokeWidth={3} />
                                </motion.div>
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* Amount Input */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
                          {t("subscription.investmentAmount")}
                        </label>
                        <span className="text-[10px] text-white/40">
                          {t("subscription.minAmount")}: <span className="text-white/60">${formatNumber(asset.min_subscription)}</span>
                          <span className="mx-2 text-white/20">|</span>
                          {t("subscription.max")}: {selectedTokenLoading ? "..." : <span className="text-[#00D4AA]">${formatNumber(effectiveMaxAmount)}</span>}
                        </span>
                      </div>
                      
                      <motion.div 
                        className={cn(
                          "relative rounded-xl overflow-hidden p-4 transition-all duration-300",
                          isInputFocused && "ring-2 ring-[#00D4AA]/50"
                        )}
                        style={{
                          background: "linear-gradient(180deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%)",
                          border: amountError 
                            ? "1px solid rgba(239, 68, 68, 0.5)" 
                            : isInputFocused 
                              ? "1px solid rgba(0, 212, 170, 0.5)"
                              : "1px solid rgba(255, 255, 255, 0.12)",
                          boxShadow: isInputFocused 
                            ? "0 0 20px rgba(0, 212, 170, 0.15), inset 0 1px 0 rgba(255,255,255,0.1)"
                            : "inset 0 1px 0 rgba(255,255,255,0.1)"
                        }}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-white/40 text-2xl font-light">$</span>
                          <input
                            type="text"
                            value={amount}
                            onChange={handleAmountChange}
                            onFocus={() => setIsInputFocused(true)}
                            onBlur={() => setIsInputFocused(false)}
                            className="flex-1 bg-transparent text-2xl font-bold text-white placeholder:text-white/20 focus:outline-none"
                            placeholder={t("subscription.amountPlaceholder")}
                          />
                          <span className="text-sm text-white/40 font-medium px-2 py-1 rounded-lg bg-white/5">
                            {tokenType}
                          </span>
                        </div>
                        
                        {/* Enhanced Slider */}
                        <div className="relative h-2 rounded-full bg-white/10">
                          <div
                            className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-[#00D4AA] to-[#00B496]"
                            style={{ width: `${sliderValue}%` }}
                          />
                          {/* Slider glow */}
                          <div
                            className="absolute top-0 h-full rounded-full bg-white/30 blur-sm"
                            style={{ width: `${sliderValue}%` }}
                          />
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={sliderValue}
                            onChange={handleSliderChange}
                            className="absolute inset-x-0 top-1/2 -translate-y-1/2 w-full h-8 opacity-0 cursor-pointer touch-none z-20"
                          />
                          <div
                            className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white shadow-lg border-2 border-[#00D4AA] pointer-events-none z-10"
                            style={{
                              left: `calc(${sliderValue}% - 10px)`,
                              boxShadow: "0 0 20px rgba(0, 212, 170, 0.5)",
                            }}
                          />
                        </div>
                      </motion.div>

                      {/* Amount Error */}
                      <AnimatePresence>
                        {amountError && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex items-center gap-1.5 text-red-400 text-xs"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {amountError}
                          </motion.div>
                        )}
                      </AnimatePresence>
                      
                      {/* Quick Amount Buttons */}
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: "25%", value: 0.25 },
                          { label: "50%", value: 0.5 },
                          { label: "75%", value: 0.75 },
                          { label: t("subscription.max"), value: 1 },
                        ].map((btn) => {
                          const isActive = Math.abs(sliderValue - btn.value * 100) < 2;
                          const hoverAmount = Math.floor(effectiveMaxAmount * btn.value * 100) / 100;
                          return (
                            <motion.button
                              key={btn.label}
                              onClick={() => handleQuickAmount(btn.value)}
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                              title={`$${formatNumber(hoverAmount)}`}
                              className={cn(
                                "py-2.5 text-xs font-semibold rounded-lg transition-all border",
                                isActive
                                  ? "bg-[#00D4AA]/20 text-[#00D4AA] border-[#00D4AA]/60 shadow-lg shadow-[#00D4AA]/10"
                                  : "bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white/70"
                              )}
                            >
                              {btn.label}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* Expected Returns Preview */}
                    <AnimatePresence>
                      {orchestrator.preview && parseFloat(amount) > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 15, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.98 }}
                          className="relative rounded-xl overflow-hidden p-4"
                          style={{
                            background: "linear-gradient(135deg, rgba(0, 212, 170, 0.15) 0%, rgba(0, 180, 150, 0.05) 100%)",
                            border: "1px solid rgba(0, 212, 170, 0.25)",
                            boxShadow: "0 0 30px rgba(0, 212, 170, 0.1)"
                          }}
                        >
                          {orchestrator.isPreviewLoading && (
                            <div className="absolute inset-0 bg-[#0B1426]/90 backdrop-blur-sm flex items-center justify-center z-10">
                              <Loader2 className="w-6 h-6 text-[#00D4AA] animate-spin" />
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <motion.div
                                animate={{ rotate: [0, 10, -10, 0] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              >
                                <Sparkles className="w-4 h-4 text-[#00D4AA]" />
                              </motion.div>
                              <span className="text-sm font-semibold text-white">{t("subscription.expectedReturns")}</span>
                            </div>
                            <span className="text-xs text-white/40 px-2 py-1 rounded-full bg-white/5">
                              {productType === "current"
                                ? t("subscription.currentFlexible")
                                : t("subscription.monthLock", { months: lockPeriod })}
                            </span>
                          </div>
                          
                          <div className="text-center mb-4">
                            <div className="text-4xl font-bold text-[#00D4AA] tracking-tight">
                              ${formatNumber(orchestrator.preview.total_return)}
                            </div>
                            <div className="text-xs text-white/40 mt-1">
                              {t("subscription.totalReturnAtMaturityDate", {
                                date: new Date(orchestrator.preview.end_date).toLocaleDateString("en-US", {
                                  month: "short", day: "numeric", year: "numeric"
                                }),
                              })}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[#00D4AA]/20">
                            {[
                              { label: t("subscription.principal"), value: `$${formatNumber(orchestrator.preview.amount)}`, icon: Wallet },
                              { label: t("subscription.interest"), value: `+$${formatNumber(orchestrator.preview.expected_interest)}`, icon: TrendingUp, highlight: true },
                              { label: t("subscription.rwaTokens"), value: orchestrator.preview.rwa_token_amount.toFixed(2), icon: Building2 },
                            ].map((item) => (
                              <div key={item.label} className="text-center">
                                <div className="flex items-center justify-center gap-1.5 mb-1">
                                  <item.icon className={cn("w-3.5 h-3.5", item.highlight ? "text-[#00D4AA]" : "text-white/40")} />
                                  <span className="text-[10px] text-white/50 uppercase tracking-wide">{item.label}</span>
                                </div>
                                <div className={cn("text-sm font-bold", item.highlight ? "text-[#00D4AA]" : "text-white/80")}>
                                  {item.value}
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
                
                {/* Step 1: Review */}
                {uiStep === 1 && (
                  <motion.div
                    key="review"
                    custom={1}
                    variants={pageVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-4"
                  >
                    {/* Summary Card with Visual Hierarchy */}
                    <div className="rounded-xl p-5 bg-white/[0.03] border border-white/10">
                      <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-[#00D4AA]" />
                        {t("subscription.investmentSummary")}
                      </h3>
                      
                      <div className="space-y-1">
                        {[
                          { 
                            label: t("subscription.assetLabel"), 
                            value: asset.name, 
                            icon: Building2,
                            subValue: asset.symbol,
                            network: networkConfig
                          },
                          { 
                            label: t("subscription.investmentAmount"), 
                            value: `$${formatNumber(parseFloat(amount))}`, 
                            subValue: tokenType,
                            icon: Wallet, 
                            highlight: true,
                            large: true
                          },
                          { 
                            label: t("subscription.productType"), 
                            value: productType === "current"
                              ? t("subscription.currentProduct")
                              : t("subscription.fixedMonthsShort", { months: lockPeriod }), 
                            subValue: productType === "current"
                              ? t("subscription.flexibleWithdrawal")
                              : t("subscription.lockedUntilMaturity"),
                            icon: Clock 
                          },
                          { 
                            label: t("subscription.annualYield"), 
                            value: `${formatPercent(currentApy)}%`, 
                            subValue: t("subscription.apy"),
                            icon: TrendingUp, 
                            highlight: true 
                          },
                        ].map((item, idx) => (
                          <motion.div 
                            key={item.label} 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.08 }}
                            className={cn(
                              "flex justify-between items-center py-3 border-b border-white/5 last:border-0",
                              item.large && "py-4"
                            )}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center",
                                item.highlight ? "bg-[#00D4AA]/10" : "bg-white/5"
                              )}>
                                <item.icon className={cn("w-4 h-4", item.highlight ? "text-[#00D4AA]" : "text-white/40")} />
                              </div>
                              <div>
                                <span className="text-[11px] text-white/40 uppercase tracking-wide block">{item.label}</span>
                                {'network' in item && item.network && (
                                  <span className="text-[10px] text-white/30 flex items-center gap-1 mt-0.5">
                                    <span style={{ color: item.network.color }}>{item.network.icon}</span>
                                    {networkName}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={cn(
                                "font-bold block",
                                item.large ? "text-xl" : "text-base",
                                item.highlight ? "text-[#00D4AA]" : "text-white"
                              )}>
                                {item.value}
                              </span>
                              {item.subValue && !('network' in item) && (
                                <span className="text-[10px] text-white/40">{item.subValue}</span>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                      
                      {/* Total Return - Highlighted */}
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="mt-4 pt-4 border-t-2 border-[#00D4AA]/30"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-[#00D4AA]" />
                            <span className="text-sm font-medium text-white/70">{t("subscription.totalReturnLabel")}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-3xl font-bold text-[#00D4AA]">
                              {reviewTotalReturn !== null ? `$${formatNumber(reviewTotalReturn)}` : "--"}
                            </span>
                            {reviewTotalReturn !== null && (
                              <div className="text-[10px] text-white/40">
                                {t("subscription.principalPlusInterest")}
                              </div>
                            )}
                            {reviewTotalReturn === null && productType === "current" && (
                              <div className="text-[10px] text-white/40">
                                {t("subscription.currentModeTotalReturnHint")}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    </div>
                    
                    {/* Fixed-mode lock warning */}
                    {productType === "fixed" && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="relative overflow-hidden rounded-xl p-4 border-l-4 bg-amber-500/8 border-amber-500/50"
                      >
                        <motion.div
                          className="absolute inset-0 opacity-30 bg-amber-500/10"
                          animate={{
                            background: [
                              "radial-gradient(circle at 0% 50%, rgba(245, 158, 11, 0.2) 0%, transparent 50%)",
                              "radial-gradient(circle at 100% 50%, rgba(245, 158, 11, 0.2) 0%, transparent 50%)",
                              "radial-gradient(circle at 0% 50%, rgba(245, 158, 11, 0.2) 0%, transparent 50%)",
                            ],
                          }}
                          transition={{ duration: 5, repeat: Infinity }}
                        />

                        <div className="relative flex items-start gap-3">
                          <motion.div
                            animate={{ rotate: [0, 5, -5, 0] }}
                            transition={{ duration: 4, repeat: Infinity }}
                          >
                            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
                          </motion.div>
                          <div>
                            <p className="text-sm font-semibold mb-1 text-amber-400">
                              {t("subscription.fundsWillBeLocked")}
                            </p>
                            <p className="text-xs text-white/60 leading-relaxed">
                              {t("subscription.fixedLockWarning", {
                                date: orchestrator.preview
                                  ? new Date(orchestrator.preview.end_date).toLocaleDateString("en-US", {
                                    month: "long", day: "numeric", year: "numeric"
                                  })
                                  : t("subscription.maturityDateLabel"),
                              })}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                    
                    {/* Network Info with Icon */}
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5"
                    >
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                        style={{ backgroundColor: networkConfig.bgColor }}
                      >
                        {networkConfig.icon}
                      </div>
                      <div className="flex-1">
                        <span className="text-[10px] text-white/40 uppercase tracking-wide block">{t("subscription.network")}</span>
                        <span className="text-xs text-white font-medium">{networkName}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span
                            className={cn(
                              "absolute inline-flex h-full w-full rounded-full opacity-75",
                              isNetworkMatched && "animate-ping"
                            )}
                            style={{ backgroundColor: networkStatus.color }}
                          />
                          <span className="relative inline-flex rounded-full h-2 w-2"
                            style={{ backgroundColor: networkStatus.color }}
                          />
                        </span>
                        <span className="text-[10px]" style={{ color: networkStatus.color }}>
                          {networkStatus.label}
                        </span>
                      </div>
                    </motion.div>

                    {/* Estimated Network Fee */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.65 }}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5"
                    >
                      <div>
                        <span className="text-[10px] text-white/40 uppercase tracking-wide block">
                          {t("subscription.estimatedNetworkFee")}
                        </span>
                        <span className="text-xs text-white/70">
                          {orchestrator.estimatedFeeIncludesApproval
                            ? t("subscription.estimatedNetworkFeeIncludesApproval")
                            : t("subscription.estimatedNetworkFeeSubscribeOnly")}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-white">
                          {orchestrator.isEstimatingNetworkFee
                            ? t("subscription.loading")
                            : orchestrator.estimatedNetworkFeeEth
                              ? `${parseFloat(orchestrator.estimatedNetworkFeeEth).toFixed(6)} ETH`
                              : "--"}
                        </span>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
                
                {/* Step 2: Processing/Result */}
                {uiStep === 2 && (
                  <motion.div
                    key="processing"
                    custom={1}
                    variants={pageVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="flex flex-col items-center justify-center py-4"
                  >
                    {/* Transaction Tracker for active states */}
                    {!["completed", "failed"].includes(orchestrator.txState) && (
                      <TransactionStatusPanel
                        state={orchestrator.txState}
                        progress={orchestrator.progress}
                        context={orchestrator.context}
                        chainId={resolvedChainId ?? chainId ?? 1}
                      />
                    )}
                    
                    {/* Success State */}
                    {orchestrator.txState === "completed" && (
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-center relative"
                      >
                        {/* Confetti Effect */}
                        <SuccessConfetti />
                        
                        <div className="relative w-28 h-28 mx-auto mb-6">
                          {/* Outer rings */}
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 15 }}
                            className="absolute inset-0 rounded-full bg-[#00D4AA]/10"
                          />
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                            className="absolute inset-2 rounded-full bg-[#00D4AA]/20"
                          />
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                            className="absolute inset-4 rounded-full bg-[#00D4AA]/30"
                          />
                          {/* Center check */}
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.3 }}
                            className="absolute inset-6 rounded-full bg-gradient-to-br from-[#00D4AA] to-[#00B496] flex items-center justify-center shadow-lg shadow-[#00D4AA]/30"
                          >
                            <Check className="w-10 h-10 text-black" strokeWidth={3} />
                          </motion.div>
                          
                          {/* Orbiting particles */}
                          {[0, 1, 2, 3].map((i) => (
                            <motion.div
                              key={i}
                              className="absolute w-2 h-2 rounded-full bg-[#00D4AA]"
                              animate={{
                                rotate: 360,
                              }}
                              transition={{
                                duration: 3 + i * 0.5,
                                repeat: Infinity,
                                ease: "linear",
                              }}
                              style={{
                                top: "50%",
                                left: "50%",
                                marginLeft: -4,
                                marginTop: -4,
                                transformOrigin: `${60 + i * 8}px center`,
                              }}
                            />
                          ))}
                        </div>
                        
                        <motion.h3 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 }}
                          className="text-2xl font-bold text-white mb-2"
                        >
                          {t("subscription.successTitle")} 🎉
                        </motion.h3>
                        <motion.p 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.5 }}
                          className="text-sm text-white/50 mb-6"
                        >
                          {t("subscription.successDescription")}
                        </motion.p>
                        
                        {/* Investment Summary */}
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.6 }}
                          className="w-full rounded-xl p-5 bg-white/[0.03] border border-white/10 mb-5"
                        >
                          <div className="text-center mb-4">
                            <span className="text-xs text-white/40 uppercase tracking-wide">{t("subscription.totalReturnLabel")}</span>
                            <div className="text-4xl font-bold text-[#00D4AA] mt-1">
                              <AnimatedNumber 
                                value={orchestrator.preview?.total_return || 0} 
                                prefix="$"
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10">
                            <div className="text-center">
                              <span className="text-[10px] text-white/40 uppercase block">{t("subscription.principal")}</span>
                              <span className="text-sm font-semibold text-white">
                                ${formatNumber(parseFloat(amount))}
                              </span>
                            </div>
                            <div className="text-center">
                              <span className="text-[10px] text-white/40 uppercase block">{t("subscription.interest")}</span>
                              <span className="text-sm font-semibold text-[#00D4AA]">
                                +${formatNumber(orchestrator.preview?.expected_interest || 0)}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                        
                        {/* Transaction Details */}
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.7 }}
                          className="w-full rounded-xl p-4 bg-black/20 border border-white/5"
                        >
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-xs text-white/40">{t("subscription.transactionHash")}</span>
                            <button
                              onClick={copyTxHash}
                              className="flex items-center gap-1 text-xs text-[#00D4AA] hover:text-[#00D4AA]/80 transition-colors"
                            >
                              {copied ? (
                                <><CheckCircle2 className="w-3 h-3" /> {t("subscription.copied")}</>
                              ) : (
                                <><Copy className="w-3 h-3" /> {t("subscription.copy")}</>
                              )}
                            </button>
                          </div>
                          <a
                            href={getExplorerUrl(resolvedChainId ?? chainId ?? 1, "tx", orchestrator.context.txHash || "") ?? undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 text-xs font-mono text-white/60 hover:text-white transition-colors p-2 rounded-lg bg-white/5 hover:bg-white/10"
                          >
                            {orchestrator.context.txHash?.slice(0, 16)}...{orchestrator.context.txHash?.slice(-8)}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </motion.div>
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
            <div className="px-6 py-5 border-t border-white/10"
              style={{ background: "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.3) 100%)" }}
            >
              {uiStep === 2 ? (
                // Processing/Result Footer
                <div className="flex justify-center">
                  {orchestrator.txState === "completed" ? (
                    <div className="flex gap-3 w-full">
                      <ShimmerButton
                        variant="outline"
                        onClick={onClose}
                        className="flex-1"
                      >
                        {t("subscription.close")}
                      </ShimmerButton>
                      <ShimmerButton
                        onClick={() => {
                          onClose();
                          // Navigate to portfolio
                          window.location.href = "/portfolio";
                        }}
                        className="flex-1"
                      >
                        {t("subscription.viewPortfolio")}
                        <ChevronRight className="w-4 h-4" />
                      </ShimmerButton>
                    </div>
                  ) : orchestrator.txState === "failed" ? (
                    <div className="flex gap-3 w-full">
                      <ShimmerButton
                        variant="outline"
                        onClick={onClose}
                        className="flex-1"
                      >
                        {t("subscription.cancel")}
                      </ShimmerButton>
                      {orchestrator.context.retryCount < orchestrator.maxRetries && (
                        <ShimmerButton
                          onClick={handleRetry}
                          className="flex-1"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          {t("subscription.retry")}
                        </ShimmerButton>
                      )}
                    </div>
                  ) : (
                    <ShimmerButton
                      variant="outline"
                      onClick={onClose}
                    >
                      {t("subscription.close")}
                    </ShimmerButton>
                  )}
                </div>
              ) : (
                // Normal Footer
                <div className="flex items-center gap-3">
                  <ShimmerButton
                    variant="outline"
                    onClick={uiStep > 0 ? () => setUiStep(uiStep - 1) : onClose}
                    className="px-5"
                  >
                    {uiStep > 0 ? (
                      <><ArrowRight className="w-4 h-4 mr-2 rotate-180" /> {t("subscription.back")}</>
                    ) : (
                      t("subscription.cancel")
                    )}
                  </ShimmerButton>
                  
                  <ShimmerButton
                    onClick={handleContinue}
                    disabled={!isValidAmount || orchestrator.isPreviewLoading}
                    className="flex-1"
                  >
                    {orchestrator.isPreviewLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> {t("subscription.loading")}</>
                    ) : uiStep === 0 ? (
                      <>
                        {t("subscription.reviewInvestmentButton")} <ChevronRight className="w-4 h-4 ml-1" />
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" /> {t("subscription.confirm")}
                      </>
                    )}
                  </ShimmerButton>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
