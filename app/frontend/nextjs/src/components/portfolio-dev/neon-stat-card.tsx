'use client';

import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NeonStatCardProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  change?: string;
  isPositive?: boolean;
  delay?: number;
  className?: string;
}

export function NeonStatCard({
  label,
  value,
  prefix = '',
  suffix = '',
  change,
  isPositive = true,
  delay = 0,
  className,
}: NeonStatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.5, 
        delay: delay * 0.1,
        ease: [0.16, 1, 0.3, 1]
      }}
      whileHover={{ 
        y: -2,
        transition: { duration: 0.2, ease: 'easeOut' }
      }}
      className={cn(
        'relative group p-4 rounded-xl',
        'bg-white/[0.02] backdrop-blur-sm',
        'border border-white/[0.04]',
        'hover:border-[#00f5d4]/30',
        'transition-all duration-200',
        className
      )}
      style={{
        boxShadow: '0 0 0 rgba(0,245,212,0)',
      }}
    >
      {/* Glow effect on hover */}
      <div 
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
        style={{
          boxShadow: '0 0 30px rgba(0,245,212,0.15), inset 0 0 0 1px rgba(0,245,212,0.2)',
        }}
      />
      
      <div className="relative z-10">
        <span className="text-xs font-medium text-white/50 uppercase tracking-wider">
          {label}
        </span>
        
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl lg:text-3xl font-bold text-white">
            <CountUp
              start={0}
              end={value}
              duration={1.5}
              decimals={2}
              prefix={prefix}
              suffix={suffix}
              separator=','
              useEasing={true}
              easingFn={(t, b, c, d) => {
                // easeOutExpo
                return t === d ? b + c : c * (-Math.pow(2, -10 * t / d) + 1) + b;
              }}
            />
          </span>
          
          {change && (
            <motion.span 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: delay * 0.1 + 0.3 }}
              className={cn(
                'text-xs font-medium flex items-center gap-0.5',
                isPositive ? 'text-emerald-400' : 'text-rose-400'
              )}
            >
              {isPositive ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              {change}
            </motion.span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
