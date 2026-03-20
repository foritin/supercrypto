'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { X } from '@phosphor-icons/react';
import { useRedemptionDetail } from '@/hooks/use-redemptions';
import { useMemo } from 'react';
import { truncateAddress } from '@/lib/utils';

interface InvestmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  investment: {
    id: string;
    name: string;
    symbol: string;
    invested: number;
    currentValue: number;
    expectedReturn: number;
    apy: number;
    status: 'active' | 'matured' | 'pending' | 'completed' | 'redeeming';
    daysLeft?: number | undefined;
    progress?: number | undefined;
    lockPeriod?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
  } | null | undefined;
  redemptionId?: string | null | undefined;
}

const TIMELINE_EVENT_LABELS: Record<string, string> = {
  request_created: 'Request Created',
  proposal_created: 'Proposal Created',
  signature_submitted: 'Signature Submitted',
  threshold_reached: 'Threshold Reached',
  executed: 'Executed',
  rejected: 'Rejected',
};

const statusColors: Record<string, string> = {
  pending: 'text-amber-400',
  signing: 'text-amber-400',
  executed: 'text-emerald-400',
  rejected: 'text-rose-400',
};

const statusBgColors: Record<string, string> = {
  pending: 'bg-amber-500/10',
  signing: 'bg-amber-500/10',
  executed: 'bg-emerald-500/10',
  rejected: 'bg-rose-500/10',
};

export function InvestmentDetailModal({ 
  isOpen, 
  onClose, 
  investment,
  redemptionId 
}: InvestmentDetailModalProps) {
  const { data: redemptionDetail } = useRedemptionDetail(redemptionId || '');

  const timeline = useMemo(() => {
    if (redemptionDetail?.events?.length) {
      return redemptionDetail.events.map(event => ({
        id: event.id,
        title: TIMELINE_EVENT_LABELS[event.eventType] || event.eventType,
        description: event.message || 'Event recorded',
        date: new Date(event.createdAt).toLocaleString(),
        status: event.status || 'recorded',
        txHash: event.txHash,
      }));
    }
    return [];
  }, [redemptionDetail]);

  if (!investment) return null;

  const profit = investment.currentValue - investment.invested;
  const profitPercent = investment.invested > 0 ? (profit / investment.invested) * 100 : 0;

  const getStatusDisplay = () => {
    switch (investment.status) {
      case 'active': return { label: 'Active', color: 'text-emerald-400' };
      case 'matured': return { label: 'Matured', color: 'text-blue-400' };
      case 'pending': return { label: 'Pending', color: 'text-amber-400' };
      case 'completed': return { label: 'Completed', color: 'text-gray-400' };
      case 'redeeming': return { label: 'Redeeming', color: 'text-purple-400' };
      default: return { label: investment.status, color: 'text-white' };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50"
          >
            <div className="bg-[#0d0f14] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
                <h2 className="text-lg font-semibold text-white">Investment Details</h2>
                <button 
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/[0.05] text-white/40 hover:text-white transition-colors"
                >
                  <X weight="bold" className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {/* Asset Header */}
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold shrink-0',
                    'bg-gradient-to-br from-[#00f5d4]/20 to-[#8b5cf6]/20',
                    'border border-[#00f5d4]/30 text-white'
                  )}>
                    {investment.symbol.slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{investment.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn('text-sm', statusDisplay.color)}>
                        {investment.apy}% APY
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="text-white/40 text-xs mb-1">Invested</div>
                    <div className="text-white font-mono text-lg">
                      ${investment.invested.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="text-white/40 text-xs mb-1">Expected Return</div>
                    <div className="text-amber-400 font-mono text-lg">
                      +${investment.expectedReturn.toLocaleString()}
                    </div>
                    <div className="text-white/30 text-xs mt-1">
                      +{profitPercent.toFixed(2)}% profit
                    </div>
                  </div>
                </div>

                {/* Status & Progress */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white/40 text-xs uppercase tracking-wider">Status</span>
                    <span className={cn('text-sm font-medium', statusDisplay.color)}>
                      {statusDisplay.label}
                    </span>
                  </div>
                  
                  {investment.progress !== undefined && (
                    <div>
                      <div className="flex justify-between text-xs text-white/40 mb-2">
                        <span>{Math.round(investment.progress)}% complete</span>
                        <span>{investment.daysLeft} days left</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${investment.progress}%` }}
                          transition={{ duration: 0.5 }}
                          className="h-full rounded-full bg-gradient-to-r from-[#00f5d4] to-[#00c4b4]"
                        />
                      </div>
                    </div>
                  )}

                  {investment.status === 'matured' && (
                    <p className="text-sm text-white/60 mt-3">
                      Matured and ready. Redemption can be requested.
                    </p>
                  )}
                  
                  {investment.status === 'redeeming' && (
                    <p className="text-sm text-white/60 mt-3">
                      Redemption in progress. Check timeline below.
                    </p>
                  )}
                </div>

                {/* Redemption Timeline */}
                {timeline.length > 0 && (
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <h4 className="text-white/40 text-xs uppercase tracking-wider mb-4">
                      Redemption Timeline
                    </h4>
                    <div className="space-y-4">
                      {timeline.map((event, index) => (
                        <div key={event.id} className="relative pl-5">
                          {/* Timeline line */}
                          {index < timeline.length - 1 && (
                            <div className="absolute left-[5px] top-4 bottom-[-16px] w-px bg-white/10" />
                          )}
                          {/* Dot */}
                          <div 
                            className={cn(
                              'absolute left-0 top-1 w-2.5 h-2.5 rounded-full border-2',
                              event.status === 'executed' 
                                ? 'bg-emerald-400 border-emerald-400' 
                                : event.status === 'rejected'
                                  ? 'bg-rose-400 border-rose-400'
                                  : 'bg-amber-400 border-amber-400'
                            )}
                          />
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-white text-sm font-medium">{event.title}</span>
                              <span className={cn(
                                'text-[10px] px-2 py-0.5 rounded-full',
                                statusBgColors[event.status],
                                statusColors[event.status]
                              )}>
                                {event.status}
                              </span>
                            </div>
                            <p className="text-white/40 text-xs mt-0.5">{event.description}</p>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-white/30 text-[10px]">{event.date}</span>
                              {event.txHash && (
                                <a
                                  href={`https://etherscan.io/tx/${event.txHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-[#00f5d4] hover:underline font-mono"
                                >
                                  {truncateAddress(event.txHash)}
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No timeline message */}
                {investment.status === 'active' && timeline.length === 0 && (
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <h4 className="text-white/40 text-xs uppercase tracking-wider mb-2">
                      Redemption Timeline
                    </h4>
                    <p className="text-sm text-white/50">
                      Not matured yet. Redemption can be requested after maturity.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-5 border-t border-white/[0.06]">
                <button 
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.05] transition-colors text-sm"
                >
                  Close
                </button>
                {investment.status === 'matured' && (
                  <button className="px-4 py-2 rounded-lg bg-[#00f5d4] text-black font-medium hover:bg-[#00f5d4]/90 transition-colors text-sm">
                    Redeem
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
