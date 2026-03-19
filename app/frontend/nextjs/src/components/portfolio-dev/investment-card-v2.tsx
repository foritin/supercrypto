'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';

interface InvestmentCardV2Props {
  asset: {
    id: string;
    name: string;
    symbol: string;
    invested: number;
    expectedReturn: number;
    totalAtMaturity: number;
    progress: number;
    daysLeft: number;
    status: 'active' | 'pending' | 'completed' | 'redeeming';
    apy: number;
  };
  onClick?: () => void;
  delay?: number;
}

const statusConfig = {
  active: { 
    label: 'Active', 
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    glow: '0 0 10px rgba(16,185,129,0.3)'
  },
  pending: { 
    label: 'Pending', 
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    glow: '0 0 10px rgba(245,158,11,0.3)'
  },
  completed: { 
    label: 'Completed', 
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    glow: '0 0 10px rgba(59,130,246,0.3)'
  },
  redeeming: { 
    label: 'Redeeming', 
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    glow: '0 0 10px rgba(168,85,247,0.3)'
  },
};

export function InvestmentCardV2({ asset, onClick, delay = 0 }: InvestmentCardV2Props) {
  const status = statusConfig[asset.status];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay * 0.1, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className={cn(
        'relative group rounded-2xl p-5 cursor-pointer',
        'bg-white/[0.02] backdrop-blur-sm',
        'border border-white/[0.06]',
        'transition-all duration-250',
        'hover:border-[#00f5d4]/30',
        'overflow-hidden'
      )}
    >
      {/* Hover glow effect */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-250 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 0%, rgba(0,245,212,0.08) 0%, transparent 60%)',
          boxShadow: 'inset 0 0 0 1px rgba(0,245,212,0.1), 0 0 25px rgba(0,245,212,0.1)',
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00f5d4]/20 to-[#a855f7]/20 flex items-center justify-center border border-white/10">
              <span className="text-sm font-bold text-white">{asset.symbol.slice(0, 2)}</span>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">{asset.name}</h4>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-500">{asset.symbol}</span>
                <Badge 
                  variant="outline" 
                  className={cn(
                    'text-[10px] px-1.5 py-0 h-4 animate-pulse-glow',
                    status.color
                  )}
                >
                  {status.label}
                </Badge>
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold text-[#00f5d4]">{asset.apy}%</span>
            <p className="text-[10px] text-gray-500">APY</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Invested</p>
            <p className="text-lg font-bold text-white">${asset.invested.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Expected Return</p>
            <p className="text-lg font-bold text-[#fbbf24]">+${asset.expectedReturn}</p>
          </div>
        </div>

        {/* Progress Bar with shimmer */}
        <div className="mb-4">
          <div className="flex justify-between text-[10px] text-gray-500 mb-1.5">
            <span>{asset.daysLeft > 0 ? `${Math.round(asset.progress)}% complete` : 'Completed'}</span>
            <span>{asset.daysLeft} days left</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${asset.progress}%` }}
              transition={{ duration: 1, delay: delay * 0.1 + 0.3, ease: 'easeOut' }}
              className="h-full rounded-full relative overflow-hidden"
              style={{
                background: 'linear-gradient(90deg, #00f5d4 0%, #00c4a6 100%)',
              }}
            >
              {/* Shimmer effect */}
              <div 
                className="absolute inset-0 w-full h-full animate-shimmer"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                }}
              />
            </motion.div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-3 border-t border-white/[0.04]">
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Total at Maturity</p>
            <p className="text-base font-bold text-white">${asset.totalAtMaturity.toLocaleString()}</p>
          </div>
          <div className="flex items-center gap-1 text-[#00f5d4] text-xs group-hover:gap-2 transition-all">
            <span>Details</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
