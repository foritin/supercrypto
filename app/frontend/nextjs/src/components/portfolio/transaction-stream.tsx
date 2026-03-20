'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  CheckCircle, 
  Clock, 
  XCircle,
  ArrowSquareOut,
  Terminal,
  Pulse
} from '@phosphor-icons/react';
import { useState } from 'react';

export interface Transaction {
  id: string;
  type: 'subscribe' | 'redeem' | 'claim' | 'distribute';
  amount: number;
  status: 'confirmed' | 'pending' | 'failed';
  date: string;
  hash?: string | undefined;
  assetName?: string | undefined;
  network?: string | undefined;
}

interface TransactionStreamProps {
  transactions?: Transaction[];
  isLoading?: boolean;
  maxItems?: number;
  className?: string;
}

const typeConfig = {
  subscribe: { 
    label: 'SUBSCRIBE',
    shortLabel: 'SUB',
    icon: ArrowDownLeft,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    prefix: '+',
  },
  redeem: { 
    label: 'REDEEM',
    shortLabel: 'RDM',
    icon: ArrowUpRight,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    prefix: '-',
  },
  claim: { 
    label: 'CLAIM',
    shortLabel: 'CLM',
    icon: CheckCircle,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    prefix: '+',
  },
  distribute: { 
    label: 'DISTRIBUTE',
    shortLabel: 'DST',
    icon: Pulse,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
    prefix: '+',
  },
};

const statusConfig = {
  confirmed: { 
    label: 'CONFIRMED',
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    icon: CheckCircle,
  },
  pending: { 
    label: 'PENDING',
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    icon: Clock,
  },
  failed: { 
    label: 'FAILED',
    color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    icon: XCircle,
  },
};

function TransactionItem({ 
  transaction, 
  index,
  isLatest 
}: { 
  transaction: Transaction; 
  index: number;
  isLatest?: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const type = typeConfig[transaction.type];
  const status = statusConfig[transaction.status];
  const TypeIcon = type.icon;
  const StatusIcon = status.icon;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const dateInfo = formatDate(transaction.date);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'group relative flex items-center gap-3 p-3 -mx-3',
        'border-l-2 border-transparent',
        'hover:bg-white/[0.02] hover:border-l-[#00f5d4]/50',
        'transition-all duration-200',
        isLatest && 'bg-[#00f5d4]/5'
      )}
    >
      {/* Type indicator */}
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center border',
        type.bgColor,
        type.borderColor
      )}>
        <TypeIcon weight="bold" className={cn('w-4 h-4', type.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-white/60">{type.shortLabel}</span>
          {transaction.assetName && (
            <>
              <span className="text-white/20">|</span>
              <span className="text-xs text-white/40 truncate max-w-[100px]">
                {transaction.assetName}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-white/30 font-mono">
          <span>{dateInfo.date}</span>
          <span>{dateInfo.time}</span>
          {transaction.network && (
            <>
              <span>•</span>
              <span className="uppercase">{transaction.network}</span>
            </>
          )}
        </div>
      </div>

      {/* Amount */}
      <div className="text-right">
        <div className={cn(
          'text-sm font-bold font-mono',
          transaction.type === 'redeem' ? 'text-amber-400' : 'text-emerald-400'
        )}>
          {type.prefix}${transaction.amount.toLocaleString()}
        </div>
        <div className={cn(
          'flex items-center gap-1 text-[9px] uppercase font-mono',
          status.color.split(' ')[0]
        )}>
          <StatusIcon weight="fill" className="w-2.5 h-2.5" />
          {status.label}
        </div>
      </div>

      {/* Hash / Link */}
      {transaction.hash && (
        <motion.a
          href={`https://etherscan.io/tx/${transaction.hash}`}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          className="p-1.5 rounded-md bg-white/5 text-white/40 hover:text-[#00f5d4] hover:bg-[#00f5d4]/10 transition-colors"
        >
          <ArrowSquareOut weight="bold" className="w-3.5 h-3.5" />
        </motion.a>
      )}

      {/* Latest indicator */}
      {isLatest && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#00f5d4] shadow-[0_0_10px_rgba(0,245,212,0.5)]"
        />
      )}
    </motion.div>
  );
}

export function TransactionStream({
  transactions = [],
  isLoading,
  maxItems = 10,
  className,
}: TransactionStreamProps) {
  const displayTransactions = transactions.slice(0, maxItems);

  if (isLoading) {
    return (
      <div className={cn(
        'relative p-5 rounded-xl overflow-hidden',
        'bg-[#0d0f14]/80 border border-[#00f5d4]/20',
        className
      )}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-[#00f5d4]/10 flex items-center justify-center">
            <Terminal weight="duotone" className="w-5 h-5 text-[#00f5d4]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Transaction Stream</h3>
            <p className="text-xs text-white/40">Recent activity log</p>
          </div>
        </div>
        
        <div className="space-y-2 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-white/5 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'relative p-5 rounded-xl overflow-hidden',
          'bg-[#0d0f14]/80 border border-[#00f5d4]/20',
          className
        )}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-[#00f5d4]/10 flex items-center justify-center border border-[#00f5d4]/20">
            <Terminal weight="duotone" className="w-5 h-5 text-[#00f5d4]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Transaction Stream</h3>
            <p className="text-xs text-white/40">Recent activity log</p>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-16 h-16 rounded-xl border border-dashed border-white/10 flex items-center justify-center mb-3">
            <Pulse weight="duotone" className="w-6 h-6 text-white/20" />
          </div>
          <p className="text-gray-400 text-sm">No transactions</p>
          <p className="text-gray-600 text-xs mt-1">Pulse will appear here</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'relative p-5 rounded-xl overflow-hidden',
        'bg-[#0d0f14]/80 backdrop-blur-md',
        'border border-[#00f5d4]/20',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#00f5d4]/10 flex items-center justify-center border border-[#00f5d4]/20">
            <Terminal weight="duotone" className="w-5 h-5 text-[#00f5d4]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Transaction Stream</h3>
            <p className="text-xs text-white/40">Recent activity log</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-white/40 font-mono uppercase">Live</span>
          </div>
          <span className="text-[10px] text-white/30 font-mono">
            {transactions.length} items
          </span>
        </div>
      </div>

      {/* Transaction list */}
      <div className="space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
        <AnimatePresence mode="popLayout">
          {displayTransactions.map((tx, index) => (
            <TransactionItem
              key={tx.id}
              transaction={tx}
              index={index}
              isLatest={index === 0}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Footer */}
      {transactions.length > maxItems && (
        <div className="mt-3 pt-3 border-t border-white/[0.06] text-center">
          <button className="text-xs text-[#00f5d4]/60 hover:text-[#00f5d4] transition-colors font-mono">
            View all {transactions.length} transactions →
          </button>
        </div>
      )}

      {/* Corner decorations */}
      <div className="absolute top-0 left-0 w-3 h-3 border-l border-t border-[#00f5d4]/30" />
      <div className="absolute top-0 right-0 w-3 h-3 border-r border-t border-[#00f5d4]/30" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-l border-b border-[#00f5d4]/30" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-r border-b border-[#00f5d4]/30" />
    </motion.div>
  );
}
