'use client';

import { motion } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { IconTrendUp, IconArrowDown, IconActivity } from './icons';

interface TerminalStatCardProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  change?: string;
  isPositive?: boolean;
  delay?: number;
  className?: string;
  icon?: React.ElementType;
  sparkline?: number[];
  isLoading?: boolean;
  pulseOnUpdate?: boolean;
}

function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValueRef = useRef(value);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (prevValueRef.current !== value) {
      setIsAnimating(true);
      const startValue = prevValueRef.current;
      const endValue = value;
      const duration = 1500;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease out expo
        const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const current = startValue + (endValue - startValue) * easeProgress;
        
        setDisplayValue(current);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
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
    <span className={cn(
      "tabular-nums tracking-tight",
      isAnimating && "text-[#00f5d4]"
    )}>
      {prefix}{formatted}{suffix}
    </span>
  );
}

function MiniSparkline({ data, isPositive }: { data: number[]; isPositive: boolean }) {
  if (!data || data.length < 2) return null;
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * 60;
    const y = 20 - ((val - min) / range) * 20;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="60" height="24" className="opacity-60">
      <polyline
        points={points}
        fill="none"
        stroke={isPositive ? '#00f5d4' : '#f43f5e'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TerminalStatCard({
  label,
  value,
  prefix = '',
  suffix = '',
  change,
  isPositive = true,
  delay = 0,
  className,
  icon: Icon = IconActivity,
  sparkline,
  isLoading,
  pulseOnUpdate = true,
}: TerminalStatCardProps) {
  const [isPulsing, setIsPulsing] = useState(false);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (pulseOnUpdate && prevValueRef.current !== value) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 1000);
      prevValueRef.current = value;
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [value, pulseOnUpdate]);

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay * 0.1, duration: 0.5 }}
        className={cn(
          'relative p-4 rounded-lg overflow-hidden',
          'bg-[#0d0f14]/80 border border-[#00f5d4]/10',
          className
        )}
      >
        <div className="animate-pulse space-y-3">
          <div className="h-3 w-20 bg-white/5 rounded" />
          <div className="h-8 w-32 bg-white/5 rounded" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        delay: delay * 0.1, 
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1]
      }}
      whileHover={{ 
        y: -2,
        transition: { duration: 0.2 }
      }}
      className={cn(
        'relative p-4 rounded-lg overflow-hidden group cursor-pointer',
        'bg-[#0d0f14]/80 backdrop-blur-md',
        'border border-[#00f5d4]/20',
        'hover:border-[#00f5d4]/40',
        'transition-all duration-300',
        isPulsing && 'border-[#00f5d4]/60 shadow-[0_0_20px_rgba(0,245,212,0.15)]',
        className
      )}
    >
      {/* Animated border glow */}
      <div 
        className={cn(
          'absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300',
          'bg-gradient-to-br from-[#00f5d4]/5 via-transparent to-[#8b5cf6]/5'
        )}
      />

      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-2 h-2 border-l border-t border-[#00f5d4]/40" />
      <div className="absolute top-0 right-0 w-2 h-2 border-r border-t border-[#00f5d4]/40" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-l border-b border-[#00f5d4]/40" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-r border-b border-[#00f5d4]/40" />

      {/* Live indicator */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5">
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            isPositive ? 'bg-emerald-400' : 'bg-rose-400'
          )}
        />
        <span className="text-[9px] uppercase tracking-wider text-white/30 font-mono">LIVE</span>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Label with icon */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-md bg-[#00f5d4]/10 flex items-center justify-center">
            <Icon className="w-3.5 h-3.5 text-[#00f5d4]" />
          </div>
          <span className="text-[10px] uppercase tracking-widest text-white/40 font-mono">
            {label}
          </span>
        </div>

        {/* Value row */}
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl lg:text-3xl font-bold text-white font-mono tracking-tight">
              <AnimatedNumber value={value} prefix={prefix} suffix={suffix} />
            </div>
            
            {change && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: delay * 0.1 + 0.3 }}
                className={cn(
                  'flex items-center gap-1 mt-1 text-xs font-medium',
                  isPositive ? 'text-emerald-400' : 'text-rose-400'
                )}
              >
                {isPositive ? (
                  <IconTrendUp className="w-3 h-3" />
                ) : (
                  <IconArrowDown className="w-3 h-3" />
                )}
                <span>{change}</span>
              </motion.div>
            )}
          </div>

          {/* Sparkline */}
          {sparkline && (
            <div className="hidden sm:block">
              <MiniSparkline data={sparkline} isPositive={isPositive} />
            </div>
          )}
        </div>
      </div>

      {/* Bottom scan line */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00f5d4]/50 to-transparent"
        animate={{
          opacity: isPulsing ? [0.3, 1, 0.3] : 0.2,
        }}
        transition={{ duration: 0.5 }}
      />
    </motion.div>
  );
}

// Compact variant for dense layouts
export function TerminalStatCardCompact({
  label,
  value,
  prefix = '',
  suffix = '',
  change,
  isPositive = true,
  delay = 0,
  className,
  isLoading,
}: Omit<TerminalStatCardProps, 'icon' | 'sparkline'>) {
  if (isLoading) {
    return (
      <div className={cn('p-3 bg-[#0d0f14]/60 border border-white/5 rounded animate-pulse', className)}>
        <div className="h-2 w-16 bg-white/5 rounded mb-2" />
        <div className="h-5 w-24 bg-white/5 rounded" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.05, duration: 0.4 }}
      className={cn(
        'p-3 bg-[#0d0f14]/60 backdrop-blur border border-[#00f5d4]/10 rounded',
        'hover:border-[#00f5d4]/30 transition-colors',
        className
      )}
    >
      <div className="text-[9px] uppercase tracking-wider text-white/30 font-mono mb-1">
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-bold text-white font-mono">
          {prefix}{value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{suffix}
        </span>
        {change && (
          <span className={cn(
            'text-[10px]',
            isPositive ? 'text-emerald-400' : 'text-rose-400'
          )}>
            {isPositive ? '+' : ''}{change}
          </span>
        )}
      </div>
    </motion.div>
  );
}
