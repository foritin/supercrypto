'use client';

import { motion } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { TrendUp, TrendDown, Wallet } from '@phosphor-icons/react';

interface NetWorthCardProps {
  totalValue: number;
  totalInvested: number;
  change24h?: number;
  isLoading?: boolean;
}

function AnimatedNumber({ value, prefix = '' }: { value: number; prefix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (prevValueRef.current !== value) {
      const startValue = prevValueRef.current;
      const endValue = value;
      const duration = 1500;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const current = startValue + (endValue - startValue) * easeProgress;
        setDisplayValue(current);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          prevValueRef.current = value;
        }
      };

      requestAnimationFrame(animate);
    }
  }, [value]);

  const formatted = displayValue.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <span className="tabular-nums tracking-tight">
      {prefix}{formatted}
    </span>
  );
}

export function NetWorthCard({ 
  totalValue, 
  totalInvested,
  change24h = 0, 
  isLoading 
}: NetWorthCardProps) {
  const earnings = totalValue - totalInvested;
  const earningsPercent = totalInvested > 0 ? (earnings / totalInvested) * 100 : 0;
  const isPositive = earnings >= 0;

  if (isLoading) {
    return (
      <div className="relative p-8 rounded-2xl bg-gradient-to-br from-[#00f5d4]/5 to-[#8b5cf6]/5 border border-[#00f5d4]/20 animate-pulse">
        <div className="space-y-4">
          <div className="h-4 w-24 bg-white/10 rounded mx-auto" />
          <div className="h-12 w-64 bg-white/10 rounded mx-auto" />
          <div className="h-6 w-32 bg-white/10 rounded mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'relative p-8 rounded-2xl overflow-hidden',
        'bg-gradient-to-br from-[#0d0f14] to-[#0a0b0e]',
        'border border-[#00f5d4]/30',
        'shadow-[0_0_40px_rgba(0,245,212,0.1)]'
      )}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#00f5d4]/5 via-transparent to-[#8b5cf6]/5" />
      
      {/* Glow effect */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[200px] opacity-30"
        style={{
          background: 'radial-gradient(ellipse, rgba(0,245,212,0.3) 0%, transparent 70%)',
        }}
      />

      {/* Corner decorations */}
      <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-[#00f5d4]/50" />
      <div className="absolute top-0 right-0 w-6 h-6 border-r-2 border-t-2 border-[#00f5d4]/50" />
      <div className="absolute bottom-0 left-0 w-6 h-6 border-l-2 border-b-2 border-[#00f5d4]/50" />
      <div className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-[#00f5d4]/50" />

      <div className="relative z-10 text-center">
        {/* Label */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-center gap-2 mb-3"
        >
          <Wallet weight="duotone" className="w-5 h-5 text-[#00f5d4]/60" />
          <span className="text-white/50 text-sm uppercase tracking-[0.2em] font-mono">
            Net Worth
          </span>
        </motion.div>

        {/* Main Value */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-5xl md:text-6xl font-bold text-white font-mono mb-4"
        >
          $<AnimatedNumber value={totalValue} />
        </motion.h1>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-center gap-6"
        >
          {/* 24h Change */}
          <div className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium',
            change24h >= 0 
              ? 'bg-emerald-500/20 text-emerald-400' 
              : 'bg-rose-500/20 text-rose-400'
          )}>
            {change24h >= 0 ? (
              <TrendUp weight="bold" className="w-4 h-4" />
            ) : (
              <TrendDown weight="bold" className="w-4 h-4" />
            )}
            <span>{change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%</span>
            <span className="text-white/30 text-xs ml-1">24h</span>
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-white/10" />

          {/* Total Earnings */}
          <div className="flex items-center gap-2">
            <span className="text-white/40 text-sm">Earnings:</span>
            <span className={cn(
              'font-mono font-medium',
              isPositive ? 'text-emerald-400' : 'text-rose-400'
            )}>
              {isPositive ? '+' : ''}${earnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-white/30 text-xs">
              ({isPositive ? '+' : ''}{earningsPercent.toFixed(2)}%)
            </span>
          </div>
        </motion.div>

        {/* Progress bar - invested vs current */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 max-w-md mx-auto"
        >
          <div className="flex justify-between text-xs text-white/40 mb-2 font-mono">
            <span>Invested: ${totalInvested.toLocaleString()}</span>
            <span>Current: ${totalValue.toLocaleString()}</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((totalValue / (totalInvested * 1.5)) * 100, 100)}%` }}
              transition={{ delay: 0.6, duration: 1, ease: 'easeOut' }}
              className={cn(
                'h-full rounded-full',
                isPositive 
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' 
                  : 'bg-gradient-to-r from-rose-500 to-rose-400'
              )}
            />
          </div>
        </motion.div>
      </div>

      {/* Bottom scan line */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00f5d4]/50 to-transparent"
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
    </motion.div>
  );
}
