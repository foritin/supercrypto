'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from '@phosphor-icons/react';

import { cn, truncateAddress } from '@/lib/utils';
import { useRedemptionDetail } from '@/hooks/use-redemptions';
import { formatNumberNoGrouping } from './number-format';

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

const statusColors: Record<string, string> = {
  pending: 'text-amber-300',
  signing: 'text-amber-300',
  executed: 'text-emerald-300',
  rejected: 'text-rose-300',
  recorded: 'text-white/70',
};

const statusBgColors: Record<string, string> = {
  pending: 'bg-amber-500/10',
  signing: 'bg-amber-500/10',
  executed: 'bg-emerald-500/10',
  rejected: 'bg-rose-500/10',
  recorded: 'bg-white/5',
};

function getEventLabel(t: any, eventType: string) {
  const keyMap: Record<string, string> = {
    request_created: 'portfolio.modal.timeline.requestCreated',
    proposal_created: 'portfolio.modal.timeline.proposalCreated',
    signature_submitted: 'portfolio.modal.timeline.signatureSubmitted',
    threshold_reached: 'portfolio.modal.timeline.thresholdReached',
    executed: 'portfolio.modal.timeline.executed',
    rejected: 'portfolio.modal.timeline.rejected',
  };

  const translationKey = keyMap[eventType];
  if (!translationKey) return eventType;
  return t(translationKey, { defaultValue: eventType });
}

export function InvestmentDetailModal({
  isOpen,
  onClose,
  investment,
  redemptionId
}: InvestmentDetailModalProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('zh') ? 'zh-CN' : 'en-US';
  const { data: redemptionDetail } = useRedemptionDetail(redemptionId || '');

  const timeline = useMemo(() => {
    if (!redemptionDetail?.events?.length) return [];
    return redemptionDetail.events.map((event) => ({
      id: event.id,
      title: getEventLabel(t, event.eventType),
      description: event.message || t('portfolio.modal.timeline.eventRecorded', { defaultValue: 'Event recorded' }),
      date: new Date(event.createdAt).toLocaleString(locale),
      status: event.status || 'recorded',
      txHash: event.txHash,
    }));
  }, [redemptionDetail, t, locale]);

  if (!investment) return null;

  const profit = investment.currentValue - investment.invested;
  const profitPercent = investment.invested > 0 ? (profit / investment.invested) * 100 : 0;

  const statusDisplay = (() => {
    switch (investment.status) {
      case 'active':
        return {
          label: t('portfolio.status.active', { defaultValue: 'Active' }),
          color: 'text-emerald-400',
        };
      case 'matured':
        return {
          label: t('portfolio.status.matured', { defaultValue: 'Matured' }),
          color: 'text-blue-400',
        };
      case 'pending':
        return {
          label: t('portfolio.status.pending', { defaultValue: 'Pending' }),
          color: 'text-amber-400',
        };
      case 'completed':
        return {
          label: t('portfolio.status.redeemed', { defaultValue: 'Completed' }),
          color: 'text-gray-300',
        };
      case 'redeeming':
        return {
          label: t('portfolio.status.redeeming', { defaultValue: 'Redeeming' }),
          color: 'text-purple-400',
        };
      default:
        return { label: investment.status, color: 'text-white' };
    }
  })();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl px-4 sm:px-0 z-50"
          >
            <div className="bg-[#0d0f14] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
                <h2 className="text-lg font-semibold font-body text-white">
                  {t('portfolio.investmentDetails', { defaultValue: 'Investment Details' })}
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/[0.05] text-white/40 hover:text-white transition-colors"
                >
                  <X weight="bold" className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold shrink-0',
                    'bg-gradient-to-br from-[#00f5d4]/20 to-[#8b5cf6]/20',
                    'border border-[#00f5d4]/30 text-white'
                  )}>
                    {investment.symbol.slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-white font-semibold font-body truncate">{investment.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn('text-sm font-mono tabular-nums', statusDisplay.color)}>
                        {investment.apy}% APY
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="text-white/50 text-xs mb-1 font-body">
                      {t('portfolio.card.invested', { defaultValue: 'Invested' })}
                    </div>
                    <div className="text-white font-mono tabular-nums text-lg">
                      ${formatNumberNoGrouping(investment.invested)}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="text-white/50 text-xs mb-1 font-body">
                      {t('portfolio.card.expectedReturn', { defaultValue: 'Expected Return' })}
                    </div>
                    <div className="text-amber-400 font-mono tabular-nums text-lg">
                      +${formatNumberNoGrouping(investment.expectedReturn)}
                    </div>
                    <div className="text-white/40 text-xs mt-1 font-body">
                      {t('portfolio.modal.profit', {
                        percent: profitPercent.toFixed(2),
                        defaultValue: `+${profitPercent.toFixed(2)}% profit`,
                      })}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white/50 text-xs uppercase tracking-wider font-body">
                      {t('portfolio.modal.status', { defaultValue: 'Status' })}
                    </span>
                    <span className={cn('text-sm font-medium font-body', statusDisplay.color)}>
                      {statusDisplay.label}
                    </span>
                  </div>

                  {investment.progress !== undefined && (
                    <div>
                      <div className="flex justify-between text-xs text-white/50 mb-2">
                        <span className="font-body">
                          {t('portfolio.modal.progressComplete', {
                            percent: Math.round(investment.progress),
                            defaultValue: `${Math.round(investment.progress)}% complete`,
                          })}
                        </span>
                        <span className="font-body">
                          {investment.daysLeft !== undefined
                            ? t('portfolio.card.daysLeft', {
                                days: investment.daysLeft,
                                defaultValue: `${investment.daysLeft} days left`,
                              })
                            : '--'}
                        </span>
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
                    <p className="text-sm text-white/60 mt-3 font-body">
                      {t('portfolio.modal.maturedReady', {
                        defaultValue: 'Matured and ready. Redemption can be requested.',
                      })}
                    </p>
                  )}

                  {investment.status === 'redeeming' && (
                    <p className="text-sm text-white/60 mt-3 font-body">
                      {t('portfolio.modal.redeemingInProgress', {
                        defaultValue: 'Redemption in progress. Check timeline below.',
                      })}
                    </p>
                  )}
                </div>

                {timeline.length > 0 && (
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <h4 className="text-white/50 text-xs uppercase tracking-wider mb-4 font-body">
                      {t('portfolio.modal.redemptionTimeline', { defaultValue: 'Redemption Timeline' })}
                    </h4>
                    <div className="space-y-4">
                      {timeline.map((event, index) => (
                        <div key={event.id} className="relative pl-6">
                          {index < timeline.length - 1 && (
                            <div className="absolute left-[7px] top-4 bottom-[-16px] w-px bg-white/10" />
                          )}
                          <div
                            className={cn(
                              'absolute left-0 top-1.5 w-3 h-3 rounded-full border-2',
                              event.status === 'executed'
                                ? 'bg-emerald-400 border-emerald-400'
                                : event.status === 'rejected'
                                  ? 'bg-rose-400 border-rose-400'
                                  : 'bg-amber-400 border-amber-400'
                            )}
                          />

                          <div className="min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="text-white text-sm font-medium font-body">{event.title}</p>
                                <p className="text-white/45 text-xs mt-0.5 font-body">{event.description}</p>
                              </div>
                              <span className={cn(
                                'text-xs px-2 py-1 rounded-full min-w-[88px] text-center font-body',
                                statusBgColors[event.status] || statusBgColors.recorded,
                                statusColors[event.status] || statusColors.recorded
                              )}>
                                {t(`portfolio.modal.timelineStatus.${event.status}`, { defaultValue: event.status })}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-3 mt-1.5">
                              <span className="text-white/35 text-xs font-mono">{event.date}</span>
                              {event.txHash && (
                                <a
                                  href={`https://etherscan.io/tx/${event.txHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-[#00f5d4] hover:underline font-mono tabular-nums"
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

                {investment.status === 'active' && timeline.length === 0 && (
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <h4 className="text-white/50 text-xs uppercase tracking-wider mb-2 font-body">
                      {t('portfolio.modal.redemptionTimeline', { defaultValue: 'Redemption Timeline' })}
                    </h4>
                    <p className="text-sm text-white/55 font-body">
                      {t('portfolio.modal.noTimelineYet', {
                        defaultValue: 'Not matured yet. Redemption can be requested after maturity.',
                      })}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 p-5 border-t border-white/[0.06]">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-white/65 hover:text-white hover:bg-white/[0.05] transition-colors text-sm font-body"
                >
                  {t('portfolio.closeButton', { defaultValue: 'Close' })}
                </button>
                {investment.status === 'matured' && (
                  <button className="px-4 py-2 rounded-lg bg-[#00f5d4] text-black font-medium hover:bg-[#00f5d4]/90 transition-colors text-sm font-body">
                    {t('portfolio.redeemNow', { defaultValue: 'Redeem Now' })}
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
