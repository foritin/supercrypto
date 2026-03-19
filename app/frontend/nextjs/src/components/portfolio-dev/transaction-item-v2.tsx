'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, Loader2 } from 'lucide-react';

interface TransactionItemV2Props {
  transaction: {
    id: string;
    type: 'subscribe' | 'redeem' | 'claim';
    amount: number;
    status: 'confirmed' | 'pending' | 'failed';
    date: string;
    hash?: string;
    assetName?: string;
  };
  delay?: number;
}

const typeConfig = {
  subscribe: { 
    label: 'Subscribe', 
    icon: ArrowDownRight,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
  redeem: { 
    label: 'Redeem', 
    icon: ArrowUpRight,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
  },
  claim: { 
    label: 'Claim', 
    icon: CheckCircle2,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
  },
};

const statusConfig = {
  confirmed: { 
    label: 'Confirmed', 
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    icon: CheckCircle2,
  },
  pending: { 
    label: 'Pending', 
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    icon: Loader2,
  },
  failed: { 
    label: 'Failed', 
    color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    icon: Clock,
  },
};

export function TransactionItemV2({ transaction, delay = 0 }: TransactionItemV2Props) {
  const type = typeConfig[transaction.type];
  const status = statusConfig[transaction.status];
  const TypeIcon = type.icon;
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: delay * 0.05 }}
      className={cn(
        'group flex items-center justify-between py-3 px-4 -mx-4',
        'border-b border-white/[0.04] last:border-0',
        'relative overflow-hidden',
        'transition-all duration-150',
        'hover:bg-white/[0.03]'
      )}
    >
      {/* Left neon border on hover */}
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#00f5d4] opacity-0 group-hover:opacity-100 transition-opacity duration-150" />

      {/* Left: Icon + Info */}
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-9 h-9 rounded-xl flex items-center justify-center',
          type.bgColor
        )}>
          <TypeIcon className={cn('w-4 h-4', type.color)} />
        </div>
        <div>
          <p className="text-sm font-medium text-white">{type.label}</p>
          <p className="text-xs text-gray-500">{transaction.date}</p>
        </div>
      </div>

      {/* Right: Amount + Status */}
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className={cn(
            'text-sm font-semibold',
            transaction.type === 'subscribe' ? 'text-white' : 'text-amber-400'
          )}>
            {transaction.type === 'subscribe' ? '+' : '-'}${transaction.amount.toLocaleString()}
          </p>
          {transaction.hash && (
            <p className="text-[10px] text-gray-600 font-mono">
              {transaction.hash.slice(0, 6)}...{transaction.hash.slice(-4)}
            </p>
          )}
        </div>
        
        <div className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border',
          status.color
        )}>
          <StatusIcon className={cn(
            'w-3 h-3',
            transaction.status === 'pending' && 'animate-spin'
          )} />
          {status.label}
        </div>
      </div>
    </motion.div>
  );
}
