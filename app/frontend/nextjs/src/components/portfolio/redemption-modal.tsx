'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Gift
} from 'lucide-react';
import { useAccount } from 'wagmi';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn, formatCurrency, truncateAddress } from '@/lib/utils';
import type { SubscriptionResponse } from '@/types/subscription';

interface RedemptionModalProps {
  subscription: SubscriptionResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  isSubmitting?: boolean;
}

/**
 * 投资赎回模态框
 * 用户发起赎回请求的确认界面
 */
export function RedemptionModal({
  subscription,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}: RedemptionModalProps) {
  const { address } = useAccount();

  if (!subscription) return null;

  const isMatured = subscription.status === 'matured';
  const daysRemaining = subscription.days_remaining || 0;
  const totalReturn = subscription.total_return || 0;
  const principal = subscription.amount || 0;
  const interest = subscription.expected_interest || 0;
  const apy = subscription.apy || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-[#0f1119] border-white/[0.08] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
            <Gift className="w-5 h-5 text-amber-400" />
            Redeem Investment
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          <motion.div
            key={subscription.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-6 space-y-6"
          >
            {/* Asset Info Card */}
            <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.04]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold">
                  {(subscription.asset_symbol || subscription.asset_name || '??').slice(0, 2)}
                </div>
                <div>
                  <div className="text-white font-medium">{subscription.asset_name}</div>
                  <div className="text-sm text-white/50">{subscription.asset_symbol}</div>
                </div>
              </div>
              
              <Separator className="my-4 bg-white/[0.06]" />
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Invested</span>
                  <span className="text-white">{formatCurrency(principal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Returns ({apy}% APY)</span>
                  <span className="text-emerald-400">+{formatCurrency(interest)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-white/[0.04]">
                  <span className="text-white font-medium">Total Redemption</span>
                  <span className="text-xl font-bold text-amber-400">
                    {formatCurrency(totalReturn)}
                  </span>
                </div>
              </div>
            </div>

            {/* Lock Period Status */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-white/60">
                <Clock className="w-4 h-4" />
                <span>Lock Period Status</span>
              </div>
              <div className={cn(
                "flex items-center gap-2 p-3 rounded-lg",
                isMatured 
                  ? "bg-emerald-500/10 border border-emerald-500/20" 
                  : "bg-amber-500/10 border border-amber-500/20"
              )}>
                {isMatured ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-sm text-emerald-400">
                      Lock period completed - Ready to redeem
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-sm text-amber-400">
                      {daysRemaining} days remaining until maturity
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Recipient */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-white/60">
                <Wallet className="w-4 h-4" />
                <span>Recipient Address</span>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center justify-between">
                  <span className="text-white font-mono text-sm">
                    {truncateAddress(address || '')}
                  </span>
                  <span className="text-xs text-white/40">Current Wallet</span>
                </div>
              </div>
            </div>

            {/* Timeline Preview */}
            <div className="space-y-3">
              <div className="text-xs uppercase tracking-wider text-white/40 font-medium">
                Process Timeline
              </div>
              <div className="relative">
                {/* Timeline Line */}
                <div className="absolute top-2 left-2 right-2 h-0.5 bg-white/10" />
                
                {/* Timeline Steps */}
                <div className="relative flex justify-between">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-[#0f1119]" />
                    <span className="text-xs text-blue-400">Submit</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-white/20 border-2 border-[#0f1119]" />
                    <span className="text-xs text-white/40">Review</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-white/20 border-2 border-[#0f1119]" />
                    <span className="text-xs text-white/40">Sign</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-white/20 border-2 border-[#0f1119]" />
                    <span className="text-xs text-white/40">Complete</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Warning Note */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-400/80 leading-relaxed">
                This redemption requires admin approval and 2-of-3 multisig signatures. 
                You&apos;ll receive an in-app notification when complete. Estimated processing time: 1-24 hours.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 border-white/10 hover:bg-white/5 text-white/70"
              >
                Cancel
              </Button>
              
              <Button
                onClick={onSubmit}
                disabled={!isMatured || isSubmitting}
                className={cn(
                  "flex-1 bg-amber-500 hover:bg-amber-500/90 text-black font-semibold",
                  (!isMatured || isSubmitting) && "opacity-50 cursor-not-allowed"
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Confirm Redemption
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
