'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

export interface InvestmentCardProps {
  name: string | null;
  symbol: string | null;
  status: 'active' | 'matured' | string;
  redemptionStatus?: 'pending' | 'signing' | 'executed' | 'rejected' | 'cancelled' | null;
  apy: number;
  invested: number;
  expectedReturn: number;
  progress: number;
  daysLeft?: number;
  lockPeriod?: number;
  totalAtMaturity: number;
  onViewDetail?: () => void;
  index?: number;
}

export function InvestmentCard({
  name,
  symbol,
  status,
  redemptionStatus,
  apy,
  invested,
  expectedReturn,
  progress,
  daysLeft,
  lockPeriod,
  totalAtMaturity,
  onViewDetail,
  index = 0
}: InvestmentCardProps) {
  const { t } = useTranslation();
  const isActive = status === 'active';
  const isMatured = status === 'matured';
  const hasOpenRedemption = redemptionStatus === 'pending' || redemptionStatus === 'signing';
  const showCompletedBadge = redemptionStatus === 'executed';

  const redemptionLabel =
    redemptionStatus === 'pending'
      ? 'Reviewing'
      : redemptionStatus === 'signing'
        ? 'Multisig Signing'
        : redemptionStatus === 'executed'
          ? 'Redeemed'
          : redemptionStatus === 'rejected'
            ? 'Rejected'
            : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group"
    >
      <div className={cn(
        "bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.06] rounded-2xl p-6 flex flex-col gap-5",
        "hover:border-white/[0.15] hover:from-white/[0.06] transition-all duration-300",
        hasOpenRedemption && "border-amber-500/30 from-amber-500/[0.08] to-white/[0.01]"
      )}>
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-sm shrink-0">
              {(symbol ?? '??').slice(0, 2)}
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">{name ?? 'Unknown'}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-[10px] text-gray-500 font-mono">{symbol ?? 'N/A'}</span>
                {!showCompletedBadge && (
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-medium",
                    isActive ? "bg-blue-500/20 text-blue-400" : 
                    isMatured ? "bg-amber-500/20 text-amber-400" :
                    "bg-gray-500/20 text-gray-400"
                  )}>
                    {status}
                  </span>
                )}
                {redemptionLabel && !showCompletedBadge && (
                  <span
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-medium",
                      redemptionStatus === 'pending' && "bg-blue-500/20 text-blue-400",
                      redemptionStatus === 'signing' && "bg-amber-500/20 text-amber-400",
                      redemptionStatus === 'executed' && "bg-emerald-500/20 text-emerald-400",
                      redemptionStatus === 'rejected' && "bg-rose-500/20 text-rose-400"
                    )}
                  >
                    {redemptionLabel}
                  </span>
                )}
                {showCompletedBadge && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/35 bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.18)]">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>{t('portfolio.card.redeemCompleted')}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xl font-bold text-amber-400">{apy}%</div>
            <div className="text-[10px] text-gray-500 uppercase">APY</div>
          </div>
        </div>

        {/* Amounts Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{t('portfolio.card.invested')}</p>
            <p className="text-lg font-bold text-white">${invested.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{t('portfolio.card.expectedReturn')}</p>
            <p className="text-lg font-bold text-amber-400">+${expectedReturn.toLocaleString()}</p>
          </div>
        </div>

        {(isMatured || hasOpenRedemption || redemptionStatus === 'rejected') && (
          <div className={cn(
            "rounded-xl border px-3 py-2 text-xs",
            hasOpenRedemption && "border-amber-500/20 bg-amber-500/10 text-amber-300",
            redemptionStatus === 'executed' && "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
            redemptionStatus === 'rejected' && "border-rose-500/20 bg-rose-500/10 text-rose-300",
            redemptionStatus === 'cancelled' && "border-gray-500/20 bg-gray-500/10 text-gray-300",
            !redemptionStatus && isMatured && "border-blue-500/20 bg-blue-500/10 text-blue-300"
          )}>
            {hasOpenRedemption && 'Redemption in progress. Funds will be released after multisig execution.'}
            {redemptionStatus === 'executed' && 'Redemption executed successfully.'}
            {redemptionStatus === 'rejected' && 'Last redemption was rejected. You can review details and retry.'}
            {redemptionStatus === 'cancelled' && 'Redemption request cancelled.'}
            {!redemptionStatus && isMatured && 'Asset matured. You can request redemption now.'}
          </div>
        )}

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] text-gray-500">
            <span>{lockPeriod ? `${lockPeriod} ${t('common.months')}` : (isActive ? t('portfolio.card.inProgress') : isMatured ? t('portfolio.card.completed') : t('portfolio.card.pending'))}</span>
            <span className={isMatured ? "text-emerald-400" : "text-white/60"}>
              {isActive && daysLeft !== undefined ? t('portfolio.card.daysLeft', { days: daysLeft }) : 
               isMatured ? t('portfolio.card.matured') : 
               `${Math.round(progress)}%`}
            </span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
              className={cn(
                "h-full rounded-full",
                isActive ? "bg-blue-500" : 
                isMatured ? "bg-emerald-400" : 
                "bg-gray-400"
              )}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t border-white/[0.06]">
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{t('portfolio.card.totalAtMaturity')}</p>
            <p className="text-lg font-bold text-white">${totalAtMaturity.toLocaleString()}</p>
          </div>
          <button 
            onClick={onViewDetail}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
          >
            {t('portfolio.card.details')} <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
