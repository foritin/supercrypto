'use client';

import { motion } from 'framer-motion';
import { Shield, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { cn, truncateAddress } from '@/lib/utils';
import type { Signer } from '@/types/treasury';

interface SignerStatusCardProps {
  signer: Signer;
  hasSigned?: boolean;
  isCurrentUser?: boolean;
  signatureTime?: string;
  index: number;
}

/**
 * 签名者状态卡片
 * 显示单个签名者的详细状态
 */
export function SignerStatusCard({
  signer,
  hasSigned = false,
  isCurrentUser = false,
  signatureTime,
  index,
}: SignerStatusCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
    >
      <Card className={cn(
        "overflow-hidden transition-all duration-300",
        hasSigned 
          ? "border-emerald-500/20 bg-emerald-500/[0.02]"
          : isCurrentUser
            ? "border-blue-500/20 bg-blue-500/[0.02]"
            : "border-white/[0.06] bg-white/[0.02]"
      )}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            {/* Left: Avatar & Info */}
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                hasSigned
                  ? "bg-emerald-500/10 text-emerald-400"
                  : isCurrentUser
                    ? "bg-blue-500/10 text-blue-400"
                    : "bg-white/5 text-white/40"
              )}>
                <Shield className="w-5 h-5" />
              </div>

              {/* Info */}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">
                    {signer.name || `Signer ${index + 1}`}
                  </span>
                  {isCurrentUser && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium">
                      YOU
                    </span>
                  )}
                </div>
                <div className="text-sm text-white/50 font-mono">
                  {truncateAddress(signer.address)}
                </div>
              </div>
            </div>

            {/* Right: Status */}
            <div className="flex flex-col items-end gap-1">
              {hasSigned ? (
                <>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Signed</span>
                  </div>
                  {signatureTime && (
                    <span className="text-xs text-white/40">
                      {new Date(signatureTime).toLocaleTimeString()}
                    </span>
                  )}
                </>
              ) : isCurrentUser ? (
                <div className="flex items-center gap-1.5 text-blue-400">
                  <Clock className="w-4 h-4 animate-pulse" />
                  <span className="text-sm font-medium">Action Required</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-white/30">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Pending</span>
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar for Current User */}
          {isCurrentUser && !hasSigned && (
            <div className="mt-3">
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-blue-400 rounded-full"
                  animate={{ 
                    width: ['0%', '100%', '0%'],
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                />
              </div>
              <p className="text-xs text-blue-400/70 mt-1.5">
                Waiting for your signature
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface SignerStatusListProps {
  signers: Signer[];
  signatures: { signerAddress: string; signedAt: string }[];
  currentUserAddress?: string;
}

/**
 * 签名者状态列表
 */
export function SignerStatusList({
  signers,
  signatures,
  currentUserAddress,
}: SignerStatusListProps) {
  return (
    <div className="grid gap-3">
      {signers.map((signer, index) => {
        const signature = signatures.find(
          sig => sig.signerAddress.toLowerCase() === signer.address.toLowerCase()
        );
        const isCurrentUser = currentUserAddress 
          ? signer.address.toLowerCase() === currentUserAddress.toLowerCase()
          : false;

        return (
          <SignerStatusCard
            key={signer.address}
            signer={signer}
            hasSigned={!!signature}
            isCurrentUser={isCurrentUser}
            {...(signature?.signedAt ? { signatureTime: signature.signedAt } : {})}
            index={index}
          />
        );
      })}
    </div>
  );
}
