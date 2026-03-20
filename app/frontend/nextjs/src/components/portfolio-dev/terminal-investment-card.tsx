'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRight, 
  Clock, 
  Percent, 
  Wallet, 
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Timer
} from 'lucide-react';
import { useState } from 'react';

interface TerminalInvestmentCardProps {
  asset: {
    id: string;
    name: string;
    symbol: string;
    invested: number;
    expectedReturn: number;
    totalAtMaturity: number;
    progress: number;
    daysLeft: number;
    status: 'active' | 'pending' | 'completed' | 'redeeming' | 'matured';
    apy: number;
    lockPeriod?: number;
    maturityDate?: string;
  };
  onClick?: () => void;
  delay?: number;
  className?: string;
}

const statusConfig = {
  active: { 
    label: 'ACTIVE', 
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    glow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]',
    icon: TrendingUp,
  },
  matured: { 
    label: 'MATURED', 
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    glow: 'shadow-[0_0_15px_rgba(59,130,246,0.3)]',
    icon: CheckCircle2,
  },
  pending: { 
    label: 'PENDING', 
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    glow: 'shadow-[0_0_15px_rgba(245,158,11,0.3)]',
    icon: Clock,
  },
  completed: { 
    label: 'COMPLETED', 
    color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    glow: '',
    icon: CheckCircle2,
  },
  redeeming: { 
    label: 'REDEEMING', 
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    glow: 'shadow-[0_0_15px_rgba(168,85,247,0.3)]',
    icon: Timer,
  },
};

export function TerminalInvestmentCard({ 
  asset, 
  onClick, 
  delay = 0,
  className 
}: TerminalInvestmentCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const status = statusConfig[asset.status];
  const StatusIcon = status.icon;
  const isMatured = asset.status === 'matured';

  // Calculate profit
  const profit = asset.expectedReturn;
  const profitPercent = asset.invested > 0 ? (profit / asset.invested) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay * 0.1, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      className={cn(
        'relative group cursor-pointer overflow-hidden rounded-xl',
        'bg-[#0d0f14]/80 backdrop-blur-md',
        'border border-[#00f5d4]/20',
        'hover:border-[#00f5d4]/50',
        'transition-all duration-300',
        isHovered && 'shadow-[0_0_30px_rgba(0,245,212,0.1)]',
        className
      )}
    >
      {/* Animated border gradient */}
      <motion.div
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: 'linear-gradient(135deg, rgba(0,245,212,0.1) 0%, transparent 50%, rgba(139,92,246,0.1) 100%)',
        }}
      />

      {/* Scan line effect */}
      <motion.div
        className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00f5d4]/40 to-transparent"
        animate={{
          top: isHovered ? ['0%', '100%'] : '0%',
        }}
        transition={{
          duration: 1.5,
          ease: 'linear',
          repeat: isHovered ? Infinity : 0,
        }}
      />

      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-[#00f5d4]/30" />
      <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-[#00f5d4]/30" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-[#00f5d4]/30" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-[#00f5d4]/30" />

      {/* Content */}
      <div className="relative z-10 p-5">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            {/* Avatar with glow */}
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center border',
              'bg-gradient-to-br from-[#00f5d4]/20 to-[#8b5cf6]/20',
              'border-[#00f5d4]/30',
              status.glow
            )}>
              <span className="text-base font-bold text-white">{asset.symbol.slice(0, 2)}</span>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-white tracking-tight">{asset.name}</h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-white/40 font-mono">{asset.symbol}</span>
                <Badge 
                  variant="outline" 
                  className={cn(
                    'text-[9px] px-1.5 py-0 h-4 border font-mono',
                    status.color
                  )}
                >
                  <StatusIcon className="w-2.5 h-2.5 mr-1" />
                  {status.label}
                </Badge>
              </div>
            </div>
          </div>

          {/* APY Badge */}
          <div className="text-right">
            <div className="flex items-center gap-1 text-emerald-400">
              <Percent className="w-3 h-3" />
              <span className="text-lg font-bold font-mono">{asset.apy}</span>
            </div>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">APY</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center gap-1.5 mb-1">
              <Wallet className="w-3 h-3 text-white/30" />
              <span className="text-[10px] uppercase tracking-wider text-white/40">Invested</span>
            </div>
            <p className="text-lg font-bold text-white font-mono">
              ${asset.invested.toLocaleString()}
            </p>
          </div>
          
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3 h-3 text-emerald-400/70" />
              <span className="text-[10px] uppercase tracking-wider text-white/40">Profit</span>
            </div>
            <p className="text-lg font-bold text-emerald-400 font-mono">
              +${profit.toLocaleString()}
            </p>
            <p className="text-[10px] text-emerald-400/70">
              +{profitPercent.toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-[10px] text-white/40 mb-2 font-mono">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {asset.daysLeft > 0 ? `${Math.round(asset.progress)}% COMPLETE` : 'COMPLETED'}
            </span>
            <span>{asset.daysLeft > 0 ? `${asset.daysLeft} DAYS LEFT` : 'MATURED'}</span>
          </div>
          
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${asset.progress}%` }}
              transition={{ duration: 1, delay: delay * 0.1 + 0.3, ease: 'easeOut' }}
              className={cn(
                'h-full rounded-full relative overflow-hidden',
                isMatured ? 'bg-blue-400' : 'bg-gradient-to-r from-[#00f5d4] to-[#00c4b4]'
              )}
            >
              {/* Animated shimmer */}
              <motion.div
                className="absolute inset-0 w-full h-full"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                }}
                animate={{
                  x: ['-100%', '100%'],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
            </motion.div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">
              Total at Maturity
            </p>
            <p className="text-base font-bold text-white font-mono">
              ${asset.totalAtMaturity.toLocaleString()}
            </p>
          </div>
          
          <motion.div 
            className="flex items-center gap-1 text-[#00f5d4] text-xs font-medium"
            animate={{ x: isHovered ? 4 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <span>Details</span>
            <ArrowRight className="w-4 h-4" />
          </motion.div>
        </div>

        {/* Maturity alert for matured assets */}
        {isMatured && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-blue-300">Ready to redeem</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
