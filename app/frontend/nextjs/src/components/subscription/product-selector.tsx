"use client";

/**
 * Product Selector - Enhanced Edition
 * 活期+定期产品选择器 - 视觉与交互优化
 */

import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Lock,
  Clock,
  TrendingUp,
  Sparkles,
  Shield,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import type { AssetSubscriptionMode } from "@/services/asset";
import type { LockPeriod } from "@/types/subscription";

export type ProductType = "current" | "fixed";

export interface ProductSelectorProps {
  value: ProductType;
  lockPeriod: LockPeriod;
  onChange: (type: ProductType, lockPeriod?: LockPeriod) => void;
  subscriptionMode?: AssetSubscriptionMode;
  apyCurrent: number;
  apy3m: number;
  apy6m: number;
  apy12m: number;
}

interface ProductOption {
  type: ProductType;
  title: string;
  description: string;
  icon: React.ElementType;
  features: string[];
  color: string;
  gradient: string;
}

interface FixedTermOption {
  period: LockPeriod;
  label: string;
  months: number;
  apy: number;
}

const formatPercent = (num: number) => {
  if (!isFinite(num) || isNaN(num)) return "0.00";
  return num.toFixed(2);
};

export function ProductSelector({
  value,
  lockPeriod,
  onChange,
  subscriptionMode = "both",
  apyCurrent,
  apy3m,
  apy6m,
  apy12m,
}: ProductSelectorProps) {
  const { t } = useTranslation();
  const currentEnabled = subscriptionMode !== "fixed";
  const fixedEnabled = subscriptionMode !== "current";

  const products: ProductOption[] = [
    {
      type: "current",
      title: t("subscription.currentProduct"),
      description: t("subscription.currentDescription"),
      icon: Zap,
      features: [
        t("subscription.withdrawAnytime"),
        t("subscription.noLockupPeriod"),
        t("subscription.lowerStableReturns"),
      ],
      color: "#10B981",
      gradient: "from-emerald-500/20 to-emerald-600/5",
    },
    {
      type: "fixed",
      title: t("subscription.fixedProduct"),
      description: t("subscription.fixedDescription"),
      icon: Lock,
      features: [
        t("subscription.higherApyRewards"),
        t("subscription.fixedMonthOptions"),
        t("subscription.earlyWithdrawalFeesApply"),
      ],
      color: "#00D4AA",
      gradient: "from-[#00D4AA]/20 to-[#00B496]/5",
    },
  ];
  
  const fixedTerms: FixedTermOption[] = [
    { period: 3, label: t("subscription.months3"), months: 3, apy: apy3m },
    { period: 6, label: t("subscription.months6"), months: 6, apy: apy6m },
    { period: 12, label: t("subscription.months12"), months: 12, apy: apy12m },
  ];

  const visibleProducts = products.filter((product) => {
    if (product.type === "current") return currentEnabled;
    return fixedEnabled;
  });
  
  return (
    <div className="space-y-3">
      <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
        {t("subscription.productType")}
      </label>
      
      {/* Product Type Cards */}
      <div className={cn("grid gap-3", visibleProducts.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
        {visibleProducts.map((product) => {
          const isSelected = value === product.type;
          const Icon = product.icon;
          
          return (
            <motion.button
              key={product.type}
              onClick={() => onChange(product.type, product.type === "fixed" ? lockPeriod : undefined)}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "relative p-4 rounded-xl text-left transition-all border overflow-hidden",
                isSelected
                  ? "border-[#00D4AA]/50 shadow-lg shadow-[#00D4AA]/10"
                  : "border-white/10 hover:border-white/20"
              )}
            >
              {/* Background gradient */}
              <motion.div
                className={cn(
                  "absolute inset-0 bg-gradient-to-br",
                  isSelected ? product.gradient : "from-white/[0.02] to-transparent"
                )}
                initial={false}
                animate={{ opacity: isSelected ? 1 : 0 }}
                transition={{ duration: 0.3 }}
              />
              
              {/* Selection Indicator */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    layoutId="product-selection-indicator"
                    className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#00D4AA] flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <Check className="w-3 h-3 text-black" strokeWidth={3} />
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Icon with animated background */}
              <motion.div 
                className={cn(
                  "relative w-11 h-11 rounded-xl flex items-center justify-center mb-3 overflow-hidden",
                  isSelected ? "bg-[#00D4AA]/20" : "bg-white/5"
                )}
                whileHover={{ rotate: [0, -5, 5, 0] }}
                transition={{ duration: 0.5 }}
              >
                {isSelected && (
                  <motion.div
                    className="absolute inset-0 bg-[#00D4AA]/10"
                    animate={{ 
                      background: [
                        "radial-gradient(circle at 30% 30%, rgba(0, 212, 170, 0.3) 0%, transparent 70%)",
                        "radial-gradient(circle at 70% 70%, rgba(0, 212, 170, 0.3) 0%, transparent 70%)",
                        "radial-gradient(circle at 30% 30%, rgba(0, 212, 170, 0.3) 0%, transparent 70%)",
                      ]
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                  />
                )}
                <Icon className={cn("w-5 h-5 relative z-10", isSelected ? "text-[#00D4AA]" : "text-white/50")} />
              </motion.div>
              
              {/* Content */}
              <h4 className={cn(
                "font-bold text-sm mb-1 relative z-10",
                isSelected ? "text-white" : "text-white/70"
              )}>
                {product.title}
              </h4>
              <p className="text-[11px] text-white/40 leading-relaxed relative z-10">
                {product.description}
              </p>
              
              {/* APY Badge */}
              <motion.div 
                className={cn(
                  "mt-3 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold relative z-10",
                  isSelected
                    ? "bg-[#00D4AA]/20 text-[#00D4AA] border border-[#00D4AA]/30"
                    : "bg-white/5 text-white/40"
                )}
                whileHover={isSelected ? { scale: 1.05 } : {}}
              >
                <TrendingUp className="w-3 h-3" />
                {t("subscription.upToApy", {
                  value: product.type === "current"
                    ? formatPercent(apyCurrent * 0.6)
                    : formatPercent(Math.max(apy3m, apy6m, apy12m)),
                })}
              </motion.div>
            </motion.button>
          );
        })}
      </div>
      
      {/* Fixed Term Options */}
      <AnimatePresence mode="wait">
        {value === "fixed" && fixedEnabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 overflow-hidden"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-white/40" />
              <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
                {t("subscription.lockPeriod")}
              </label>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {fixedTerms.map((term, idx) => {
                const isSelected = lockPeriod === term.period;
                const isBest = term.period === 12;
                
                return (
                  <motion.button
                    key={term.period}
                    onClick={() => onChange("fixed", term.period)}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={cn(
                      "relative p-3 rounded-xl text-center transition-all border",
                      isSelected
                        ? "bg-gradient-to-b from-[#00D4AA]/15 to-[#00D4AA]/5 border-[#00D4AA]/50 shadow-lg shadow-[#00D4AA]/10"
                        : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/15"
                    )}
                  >
                    {/* Best Badge */}
                    <AnimatePresence>
                      {isBest && !isSelected && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute -top-2 left-1/2 -translate-x-1/2"
                        >
                          <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-[#00D4AA] text-black text-[8px] font-bold rounded-full whitespace-nowrap">
                            <Sparkles className="w-2 h-2" />
                            {t("subscription.best")}
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    {/* Period */}
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Clock className={cn("w-3 h-3", isSelected ? "text-[#00D4AA]" : "text-white/40")} />
                      <span className={cn(
                        "text-sm font-bold",
                        isSelected ? "text-white" : "text-white/70"
                      )}>
                        {term.months}M
                      </span>
                    </div>
                    
                    {/* APY */}
                    <div className={cn(
                      "text-lg font-bold",
                      isSelected ? "text-[#00D4AA]" : "text-white/60"
                    )}>
                      {formatPercent(term.apy)}%
                    </div>
                    <div className="text-[9px] text-white/30 uppercase tracking-wide">APY</div>
                    
                    {/* Selection indicator */}
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          layoutId="term-selection"
                          className="absolute inset-0 rounded-xl border-2 border-[#00D4AA]/30"
                          initial={false}
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </div>
            
            {/* Lock Period Info */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/8 border border-amber-500/20"
            >
              <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-400/80 leading-relaxed">
                {t("subscription.productSelectorLockWarning", { months: lockPeriod })}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Current Product Info */}
      <AnimatePresence mode="wait">
        {value === "current" && currentEnabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <motion.div 
              className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-500/8 border border-emerald-500/20"
            >
              <Zap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] text-emerald-400/90 leading-relaxed">
                  {t("subscription.productSelectorCurrentInfo", {
                    value: formatPercent(apyCurrent * 0.6),
                  })}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Check icon component
function Check({ className, strokeWidth }: { className?: string; strokeWidth?: number }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth || 3} d="M5 13l4 4L19 7" />
    </svg>
  );
}
