'use client';

import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  change?: string | undefined;
  isPositive?: boolean;
  className?: string;
  delay?: number;
}

export function StatCard({ 
  label, 
  value, 
  change, 
  isPositive = true, 
  className,
  delay = 0 
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay * 0.1 }}
      className={cn(
        "flex flex-col gap-2 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]",
        "hover:bg-white/[0.04] hover:border-white/[0.08] transition-all duration-300",
        className
      )}
    >
      <span className="text-xs font-medium text-white/50 uppercase tracking-wider">
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl lg:text-3xl font-bold text-white">{value}</span>
        {change && (
          <span className={cn(
            "text-xs font-medium flex items-center gap-0.5",
            isPositive ? "text-emerald-400" : "text-rose-400"
          )}>
            {isPositive ? (
              <ArrowUpRight className="w-3 h-3" />
            ) : (
              <ArrowDownRight className="w-3 h-3" />
            )}
            {change}
          </span>
        )}
      </div>
    </motion.div>
  );
}

// Animated counter version for numeric values
export function AnimatedStatCard({
  label,
  value,
  prefix = '',
  suffix = '',
  change,
  isPositive = true,
  className,
  delay = 0,
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  change?: string;
  isPositive?: boolean;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay * 0.1 }}
      className={cn("flex flex-col gap-2", className)}
    >
      <span className="text-xs font-medium text-white/50 uppercase tracking-wider">
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl lg:text-3xl font-bold text-white">
          {prefix}{value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{suffix}
        </span>
        {change && (
          <span className={cn(
            "text-xs font-medium flex items-center gap-0.5",
            isPositive ? "text-emerald-400" : "text-rose-400"
          )}>
            {isPositive ? (
              <ArrowUpRight className="w-3 h-3" />
            ) : (
              <ArrowDownRight className="w-3 h-3" />
            )}
            {change}
          </span>
        )}
      </div>
    </motion.div>
  );
}
