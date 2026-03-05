"use client";

/**
 * Product Selector
 * 活期+定期产品选择器
 * 
 * 支持:
 * - Current (活期): 灵活存取
 * - Fixed (定期): 3/6/12 月锁定期
 */

import { motion } from "framer-motion";
import {
  Zap,
  Lock,
  Clock,
  TrendingUp,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { LockPeriod } from "@/types/subscription";

export type ProductType = "current" | "fixed";

export interface ProductSelectorProps {
  value: ProductType;
  lockPeriod: LockPeriod;
  onChange: (type: ProductType, lockPeriod?: LockPeriod) => void;
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
}

interface FixedTermOption {
  period: LockPeriod;
  label: string;
  months: number;
  apy: number;
}

export function ProductSelector({
  value,
  lockPeriod,
  onChange,
  apyCurrent,
  apy3m,
  apy6m,
  apy12m,
}: ProductSelectorProps) {
  const products: ProductOption[] = [
    {
      type: "current",
      title: "Current",
      description: "Flexible access to your funds",
      icon: Zap,
      features: [
        "Withdraw anytime",
        "No lock-up period",
        "Lower but stable returns",
      ],
    },
    {
      type: "fixed",
      title: "Fixed Term",
      description: "Higher returns with lock-up",
      icon: Lock,
      features: [
        "Higher APY rewards",
        "3/6/12 month options",
        "Early withdrawal fees apply",
      ],
    },
  ];
  
  const fixedTerms: FixedTermOption[] = [
    { period: 3, label: "3 Months", months: 3, apy: apy3m },
    { period: 6, label: "6 Months", months: 6, apy: apy6m },
    { period: 12, label: "12 Months", months: 12, apy: apy12m },
  ];
  
  return (
    <div className="space-y-3">
      <label className="text-[10px] font-medium text-white/40 uppercase tracking-wider">
        Product Type
      </label>
      
      {/* Product Type Cards */}
      <div className="grid grid-cols-2 gap-3">
        {products.map((product) => {
          const isSelected = value === product.type;
          const Icon = product.icon;
          
          return (
            <motion.button
              key={product.type}
              onClick={() => onChange(product.type, product.type === "fixed" ? lockPeriod : undefined)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "relative p-4 rounded-xl text-left transition-all border",
                isSelected
                  ? "bg-[#00D4AA]/10 border-[#00D4AA]/50 shadow-lg shadow-[#00D4AA]/10"
                  : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06]"
              )}
            >
              {/* Selection Indicator */}
              {isSelected && (
                <motion.div
                  layoutId="product-selection"
                  className="absolute top-3 right-3 w-4 h-4 rounded-full bg-[#00D4AA] flex items-center justify-center"
                >
                  <svg className="w-2.5 h-2.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
              )}
              
              {/* Icon */}
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center mb-3",
                isSelected ? "bg-[#00D4AA]/20" : "bg-white/5"
              )}>
                <Icon className={cn("w-5 h-5", isSelected ? "text-[#00D4AA]" : "text-white/50")} />
              </div>
              
              {/* Content */}
              <h4 className={cn(
                "font-semibold text-sm mb-1",
                isSelected ? "text-white" : "text-white/70"
              )}>
                {product.title}
              </h4>
              <p className="text-[10px] text-white/40 leading-relaxed">
                {product.description}
              </p>
              
              {/* APY Badge */}
              <div className={cn(
                "mt-3 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium",
                isSelected
                  ? "bg-[#00D4AA]/20 text-[#00D4AA]"
                  : "bg-white/5 text-white/40"
              )}>
                <TrendingUp className="w-3 h-3" />
                Up to {product.type === "current" ? apyCurrent : Math.max(apy3m, apy6m, apy12m)}% APY
              </div>
            </motion.button>
          );
        })}
      </div>
      
      {/* Fixed Term Options */}
      {value === "fixed" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-2"
        >
          <label className="text-[10px] font-medium text-white/40 uppercase tracking-wider">
            Lock Period
          </label>
          
          <div className="grid grid-cols-3 gap-2">
            {fixedTerms.map((term) => {
              const isSelected = lockPeriod === term.period;
              
              return (
                <motion.button
                  key={term.period}
                  onClick={() => onChange("fixed", term.period)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "relative p-3 rounded-xl text-center transition-all border",
                    isSelected
                      ? "bg-[#00D4AA]/10 border-[#00D4AA]/50"
                      : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06]"
                  )}
                >
                  {/* Period */}
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Clock className={cn("w-3 h-3", isSelected ? "text-[#00D4AA]" : "text-white/40")} />
                    <span className={cn(
                      "text-sm font-semibold",
                      isSelected ? "text-white" : "text-white/70"
                    )}>
                      {term.months}M
                    </span>
                  </div>
                  
                  {/* APY */}
                  <div className={cn(
                    "text-lg font-bold",
                    isSelected ? "text-[#00D4AA]" : "text-white/50"
                  )}>
                    {term.apy}%
                  </div>
                  <div className="text-[9px] text-white/30 uppercase tracking-wide">APY</div>
                  
                  {/* Recommended Badge */}
                  {term.period === 12 && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-[#00D4AA] text-black text-[8px] font-bold rounded-full">
                        <Sparkles className="w-2 h-2" />
                        BEST
                      </span>
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
          
          {/* Lock Period Info */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-white/[0.02] border border-white/5">
            <Lock className="w-4 h-4 text-white/30 shrink-0 mt-0.5" />
            <p className="text-[10px] text-white/40 leading-relaxed">
              Funds will be locked for {lockPeriod} months. Early redemption may incur a 
              <span className="text-amber-400/80"> 2% penalty fee</span>.
            </p>
          </div>
        </motion.div>
      )}
      
      {/* Current Product Info */}
      {value === "current" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="flex items-start gap-2 p-3 rounded-lg bg-white/[0.02] border border-white/5"
        >
          <Zap className="w-4 h-4 text-[#00D4AA] shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] text-white/60 leading-relaxed">
              Withdraw your funds at any time with no penalties. 
              Current APY: <span className="text-[#00D4AA] font-medium">{apyCurrent}%</span>
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
