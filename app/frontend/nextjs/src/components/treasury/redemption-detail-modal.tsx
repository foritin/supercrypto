'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { 
  ExternalLink, 
  ShieldCheck, 
  XCircle, 
  X,
  User,
  Wallet,
  Clock,
  FileText,
  Copy,
  CheckCircle2
} from 'lucide-react';
import { useState } from 'react';
import { useAccount } from 'wagmi';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { truncateAddress, formatCurrency } from '@/lib/utils';
import type { RedemptionRequest } from '@/types/treasury';

import { MultisigProgress } from './multisig-progress';
import { RedemptionStatusBadge } from './redemption-status-badge';

const TIMELINE_EVENT_LABELS: Record<string, string> = {
  request_created: 'Request Created',
  proposal_created: 'Proposal Created',
  signature_submitted: 'Signature Submitted',
  threshold_reached: 'Threshold Reached',
  executed: 'Executed',
  rejected: 'Rejected',
};

function getTimelineEventTone(eventType: string, status?: string) {
  if (eventType === 'executed' || status === 'executed') {
    return {
      dot: 'bg-emerald-400',
      chip: 'bg-emerald-500/10 text-emerald-400',
      text: 'text-emerald-300',
    };
  }
  if (eventType === 'rejected' || status === 'rejected') {
    return {
      dot: 'bg-rose-400',
      chip: 'bg-rose-500/10 text-rose-400',
      text: 'text-rose-300',
    };
  }
  if (eventType === 'threshold_reached' || eventType === 'signature_submitted' || status === 'signing') {
    return {
      dot: 'bg-amber-400',
      chip: 'bg-amber-500/10 text-amber-400',
      text: 'text-amber-300',
    };
  }
  return {
    dot: 'bg-blue-400',
    chip: 'bg-blue-500/10 text-blue-400',
    text: 'text-blue-300',
  };
}

interface RedemptionDetailModalProps {
  request: RedemptionRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onSign: (request: RedemptionRequest) => void;
  onExecute: (request: RedemptionRequest) => void;
  onReject: (request: RedemptionRequest) => void;
  canSignAction?: boolean;
  canExecuteAction?: boolean;
  canRejectAction?: boolean;
  isSigning?: boolean;
  isExecuting?: boolean;
  isRejecting?: boolean;
}

/**
 * 赎回详情模态框
 * 显示单个赎回请求的完整信息和操作按钮
 */
export function RedemptionDetailModal({
  request,
  isOpen,
  onClose,
  onSign,
  onExecute,
  onReject,
  canSignAction = true,
  canExecuteAction = true,
  canRejectAction = true,
  isSigning = false,
  isExecuting = false,
  isRejecting = false,
}: RedemptionDetailModalProps) {
  const { address: currentUserAddress } = useAccount();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!request) return null;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Check if current user can sign
  const canSign = canSignAction && request.status === 'signing' && 
    request.proposalId !== undefined &&
    !request.signatures.some(
      sig => sig.signerAddress.toLowerCase() === currentUserAddress?.toLowerCase()
    );

  // Check if current user has signed
  const hasSigned = request.signatures.some(
    sig => sig.signerAddress.toLowerCase() === currentUserAddress?.toLowerCase()
  );

  const canExecute = canExecuteAction && request.status === 'signing' &&
    request.proposalId !== undefined &&
    request.signatures.length >= request.threshold;

  const timelineEvents = request.events && request.events.length > 0
    ? request.events
    : [
        {
          id: `fallback-request-${request.id}`,
          eventType: 'request_created' as const,
          status: 'pending' as const,
          message: 'Redemption request created',
          createdAt: request.createdAt,
        },
        ...(request.proposalTxHash ? [{
          id: `fallback-proposal-${request.id}`,
          eventType: 'proposal_created' as const,
          status: request.status === 'pending' ? 'pending' as const : 'signing' as const,
          message: 'On-chain redemption proposal created',
          createdAt: request.createdAt,
          txHash: request.proposalTxHash,
        }] : []),
        ...(request.status === 'executed' ? [{
          id: `fallback-executed-${request.id}`,
          eventType: 'executed' as const,
          status: 'executed' as const,
          message: 'Redemption executed',
          createdAt: request.executedAt || request.createdAt,
          ...(request.executeTxHash ? { txHash: request.executeTxHash } : {}),
        }] : []),
      ];

  const CopyButton = ({ text, field }: { text: string; field: string }) => (
    <button
      onClick={() => handleCopy(text, field)}
      className="ml-2 text-white/30 hover:text-white/60 transition-colors"
    >
      {copiedField === field ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        hideCloseButton
        className="max-w-lg bg-[linear-gradient(180deg,rgba(17,24,39,0.96)_0%,rgba(12,18,33,0.96)_100%)] border-cyan-300/20 p-0 overflow-hidden shadow-[0_24px_72px_rgba(2,8,24,0.78),0_0_0_1px_rgba(103,232,249,0.18),inset_0_1px_0_rgba(255,255,255,0.08)]"
      >
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
                Redemption Request
                <span className="text-white/40">#{request.requestId}</span>
              </DialogTitle>
              <p className="text-sm text-white/50 mt-1">
                Submitted {new Date(request.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <RedemptionStatusBadge status={request.status} size="lg" pulse={request.status === 'signing'} />
              <DialogClose className="rounded-md border border-white/20 bg-black/35 p-1.5 text-white/70 transition-colors hover:bg-white/15 hover:text-white">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </DialogClose>
            </div>
          </div>
        </DialogHeader>

        <AnimatePresence mode="wait">
          <motion.div
            key={request.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-6 space-y-6"
          >
            {/* User Info */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase tracking-wider text-white/40 font-medium flex items-center gap-2">
                <User className="w-3.5 h-3.5" />
                User
              </h4>
              <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.04]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-white font-medium flex items-center">
                      {truncateAddress(request.userAddress)}
                      <CopyButton text={request.userAddress} field="userAddress" />
                    </div>
                    {request.userName && (
                      <div className="text-sm text-white/50">{request.userName}</div>
                    )}
                    <div className="flex items-center gap-1.5 mt-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span className="text-xs text-emerald-400">KYC Verified</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Investment Details */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase tracking-wider text-white/40 font-medium flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" />
                Investment Details
              </h4>
              <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.04] space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-white/50">Asset</span>
                  <div className="text-right">
                    <div className="text-white font-medium">{request.assetName}</div>
                    <div className="text-sm text-white/50">{request.assetSymbol}</div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/50">Principal</span>
                  <span className="text-white">{formatCurrency(parseFloat(request.principal))}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/50">Returns</span>
                  <span className="text-emerald-400">+{formatCurrency(parseFloat(request.interest))}</span>
                </div>
                <Separator className="bg-white/[0.06]" />
                <div className="flex justify-between items-center">
                  <span className="text-white font-medium">Total Redemption</span>
                  <span className="text-xl font-bold text-white">{formatCurrency(parseFloat(request.totalAmount))}</span>
                </div>
              </div>
            </div>

            {/* Multisig Progress */}
            {request.status !== 'cancelled' && (
              <div className="space-y-3">
                <h4 className="text-xs uppercase tracking-wider text-white/40 font-medium flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Multisig Progress
                </h4>
                <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.04]">
                  <MultisigProgress
                    signatures={request.signatures}
                    threshold={request.threshold}
                    signers={request.signers}
                    {...(currentUserAddress ? { currentUserAddress } : {})}
                    showDetails={true}
                  />
                </div>
              </div>
            )}

            {/* Process Timeline */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase tracking-wider text-white/40 font-medium flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                Process Timeline
              </h4>
              <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.04] space-y-2">
                {timelineEvents.length > 0 ? (
                  timelineEvents.map((event, index) => {
                    const tone = getTimelineEventTone(event.eventType, event.status);
                    return (
                      <div key={event.id} className="relative pl-5">
                        {index < timelineEvents.length - 1 && (
                          <div className="absolute left-[7px] top-4 bottom-[-10px] w-px bg-white/10" />
                        )}
                        <span className={`absolute left-0 top-1.5 h-3 w-3 rounded-full ${tone.dot}`} />
                        <div className="rounded-lg border border-white/[0.06] bg-black/20 px-2.5 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs font-medium text-white">
                              {TIMELINE_EVENT_LABELS[event.eventType] || event.eventType}
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tone.chip}`}>
                              {(event.status || 'recorded').replace('_', ' ')}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-400 mt-1">
                            {event.message || 'Event recorded'}
                          </div>
                          <div className="text-[10px] text-gray-500 mt-1.5 flex items-center justify-between gap-2">
                            <span>{new Date(event.createdAt).toLocaleString()}</span>
                            {event.txHash && /^0x[a-fA-F0-9]{64}$/.test(event.txHash) && (
                              <a
                                href={`https://etherscan.io/tx/${event.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`${tone.text} font-mono hover:text-white transition-colors`}
                              >
                                {truncateAddress(event.txHash)}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-xs text-gray-500">No timeline events yet.</div>
                )}
              </div>
            </div>

            {/* Transaction Info */}
            {request.proposalTxHash && (
              <div className="space-y-3">
                <h4 className="text-xs uppercase tracking-wider text-white/40 font-medium flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  Transaction
                </h4>
                <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.04] space-y-2">
                  {request.proposalTxHash && (
                    <div className="flex justify-between items-center">
                      <span className="text-white/50 text-sm">Proposal TX</span>
                      <a 
                        href={`https://etherscan.io/tx/${request.proposalTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      >
                        {truncateAddress(request.proposalTxHash)}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                  {request.executeTxHash && (
                    <div className="flex justify-between items-center">
                      <span className="text-white/50 text-sm">Execution TX</span>
                      <a 
                        href={`https://etherscan.io/tx/${request.executeTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                      >
                        {truncateAddress(request.executeTxHash)}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                  {request.executedAt && (
                    <div className="flex justify-between items-center">
                      <span className="text-white/50 text-sm">Executed At</span>
                      <span className="text-white text-sm">
                        {new Date(request.executedAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.06]">
              {request.status === 'signing' && (
                <>
                  {canRejectAction && (
                    <Button
                      variant="outline"
                      onClick={() => onReject(request)}
                      disabled={isSigning || isRejecting || isExecuting}
                      className="border-rose-500/20 text-rose-400 hover:bg-rose-500/10 hover:text-rose-400"
                    >
                      {isRejecting ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-4 h-4 border-2 border-rose-400 border-t-transparent rounded-full mr-2"
                        />
                      ) : (
                        <XCircle className="w-4 h-4 mr-2" />
                      )}
                      Reject
                    </Button>
                  )}

                  {canExecute && (
                    <Button
                      onClick={() => onExecute(request)}
                      disabled={isExecuting}
                      className="bg-emerald-500 hover:bg-emerald-500/90 text-white"
                    >
                      {isExecuting ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                        />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                      )}
                      Execute
                    </Button>
                  )}
                  
                  {canSign ? (
                    <Button
                      onClick={() => onSign(request)}
                      disabled={isSigning || isExecuting}
                      className="bg-blue-500 hover:bg-blue-500/90 text-white"
                    >
                      {isSigning ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                        />
                      ) : (
                        <ShieldCheck className="w-4 h-4 mr-2" />
                      )}
                      Sign & Approve
                    </Button>
                  ) : hasSigned ? (
                    <Button disabled className="bg-emerald-500/20 text-emerald-400">
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      You Signed
                    </Button>
                  ) : null}
                </>
              )}
              
              {canRejectAction && request.status === 'pending' && (
                <Button
                  variant="outline"
                  onClick={() => onReject(request)}
                  disabled={isRejecting}
                  className="border-rose-500/20 text-rose-400 hover:bg-rose-500/10 hover:text-rose-400"
                >
                  {isRejecting ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-rose-400 border-t-transparent rounded-full mr-2"
                    />
                  ) : (
                    <XCircle className="w-4 h-4 mr-2" />
                  )}
                  Reject Request
                </Button>
              )}
              
              {request.status === 'executed' && (
                <Button disabled className="bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Executed
                </Button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
