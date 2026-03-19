'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Clock, User } from 'lucide-react';

import { cn, truncateAddress } from '@/lib/utils';
import type { Signature, Signer } from '@/types/treasury';

interface MultisigProgressProps {
  signatures: Signature[];
  threshold: number;
  signers: Signer[];
  currentUserAddress?: string;
  showDetails?: boolean;
}

/**
 * 多签进度组件
 * 显示签名进度条和签名者状态
 */
export function MultisigProgress({
  signatures,
  threshold,
  signers,
  currentUserAddress,
  showDetails = true,
}: MultisigProgressProps) {
  const progress = Math.min((signatures.length / threshold) * 100, 100);
  const isComplete = signatures.length >= threshold;

  // Check if current user has signed
  const hasCurrentUserSigned = currentUserAddress 
    ? signatures.some(sig => 
        sig.signerAddress.toLowerCase() === currentUserAddress.toLowerCase()
      )
    : false;

  // Get signer status
  const getSignerStatus = (signerAddress: string) => {
    const signature = signatures.find(sig => 
      sig.signerAddress.toLowerCase() === signerAddress.toLowerCase()
    );
    
    if (signature) {
      return {
        status: 'signed' as const,
        signedAt: signature.signedAt,
      };
    }
    
    const isCurrentUser = currentUserAddress 
      ? signerAddress.toLowerCase() === currentUserAddress.toLowerCase()
      : false;
      
    return {
      status: isCurrentUser ? 'pending-you' as const : 'pending' as const,
    };
  };

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/60">Signature Progress</span>
          <span className={cn(
            "font-medium",
            isComplete ? "text-emerald-400" : "text-amber-400"
          )}>
            {signatures.length} of {threshold} signatures
          </span>
        </div>
        
        <div 
          className="h-2 bg-white/10 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={signatures.length}
          aria-valuemax={threshold}
          aria-label={`Signature progress: ${signatures.length} of ${threshold}`}
        >
          <motion.div
            className={cn(
              "h-full rounded-full",
              isComplete 
                ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                : "bg-gradient-to-r from-amber-500 to-amber-400"
            )}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-sm text-emerald-400"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Threshold met - Ready for execution</span>
          </motion.div>
        )}
        
        {hasCurrentUserSigned && !isComplete && (
          <div className="flex items-center gap-2 text-sm text-blue-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>You have signed this request</span>
          </div>
        )}
      </div>

      {/* Signer Details */}
      {showDetails && (
        <div className="space-y-2 pt-2">
          <div className="text-xs text-white/40 uppercase tracking-wider">Signers</div>
          <div className="space-y-1.5">
            {signers.map((signer, index) => {
              const signerStatus = getSignerStatus(signer.address);
              const isYou = currentUserAddress 
                ? signer.address.toLowerCase() === currentUserAddress.toLowerCase()
                : false;

              return (
                <motion.div
                  key={signer.address}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02]"
                >
                  <div className="flex items-center gap-3">
                    {/* Status Icon */}
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center",
                      signerStatus.status === 'signed' 
                        ? "bg-emerald-500/10 text-emerald-400"
                        : signerStatus.status === 'pending-you'
                          ? "bg-blue-500/10 text-blue-400"
                          : "bg-white/5 text-white/30"
                    )}>
                      {signerStatus.status === 'signed' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : signerStatus.status === 'pending-you' ? (
                        <Clock className="w-3.5 h-3.5" />
                      ) : (
                        <User className="w-3 h-3" />
                      )}
                    </div>
                    
                    {/* Address */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white/80 font-mono">
                        {truncateAddress(signer.address)}
                      </span>
                      {signer.name && (
                        <span className="text-xs text-white/40">({signer.name})</span>
                      )}
                      {isYou && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                          You
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status Text */}
                  <span className={cn(
                    "text-xs",
                    signerStatus.status === 'signed' 
                      ? "text-emerald-400"
                      : signerStatus.status === 'pending-you'
                        ? "text-blue-400"
                        : "text-white/30"
                  )}>
                    {signerStatus.status === 'signed' 
                      ? 'Signed'
                      : signerStatus.status === 'pending-you'
                        ? 'Awaiting you'
                        : 'Pending'
                    }
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
