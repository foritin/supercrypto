'use client';

import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Users,
  CheckCircle2,
  Wallet,
  History
} from 'lucide-react';
import Link from 'next/link';

import { RequireAuth } from '@/components/auth';
import { SignerStatusList } from '@/components/treasury/signer-status-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useMultisigStatus, useTreasuryStats } from '@/hooks/use-treasury';
import { useCurrentUser } from '@/hooks/use-current-user';
import { truncateAddress, formatCurrency } from '@/lib/utils';

export default function MultisigStatusPage() {
  const { data: multisigStatus, isLoading: isLoadingMultisig } = useMultisigStatus();
  const { data: stats, isLoading: isLoadingStats } = useTreasuryStats();
  const { user } = useCurrentUser();

  const canAccessTreasury = Boolean(
    user?.is_admin || user?.roles?.includes('contract_owner')
  );

  const isLoading = isLoadingMultisig || isLoadingStats;

  return (
    <RequireAuth wallet check={() => canAccessTreasury}>
      <div className="min-h-screen bg-[#0a0b14] pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-4 mb-4">
              <Link href="/admin/assets/treasury">
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="text-white/50 hover:text-white hover:bg-white/5"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <span className="text-amber-400 text-[10px] font-bold tracking-[0.2em] uppercase mb-1 block">
                  Treasury
                </span>
                <h1 className="text-3xl font-bold text-white">Multisig Status</h1>
              </div>
            </div>
            <p className="text-white/50 ml-14">
              View multisig configuration and signer status
            </p>
          </motion.div>

          {/* Content */}
          <div className="space-y-6">
            {/* Contract Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border-white/[0.06] bg-white/[0.02]">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-blue-400" />
                    Contract Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="grid grid-cols-2 gap-4">
                      {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-16 bg-white/5 rounded-lg" />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                        <div className="flex items-center gap-2 text-sm text-white/50 mb-1">
                          <Wallet className="w-4 h-4" />
                          Contract Address
                        </div>
                        <div className="text-white font-mono text-sm">
                          {truncateAddress(multisigStatus?.contractAddress || '')}
                        </div>
                      </div>
                      
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                        <div className="flex items-center gap-2 text-sm text-white/50 mb-1">
                          <Users className="w-4 h-4" />
                          Signers
                        </div>
                        <div className="text-white font-medium">
                          {multisigStatus?.threshold} of {multisigStatus?.signers?.length} required
                        </div>
                      </div>
                      
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                        <div className="flex items-center gap-2 text-sm text-white/50 mb-1">
                          <History className="w-4 h-4" />
                          Total Proposals
                        </div>
                        <div className="text-white font-medium">
                          {multisigStatus?.proposalCount || 0}
                        </div>
                      </div>
                      
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                        <div className="flex items-center gap-2 text-sm text-white/50 mb-1">
                          <CheckCircle2 className="w-4 h-4" />
                          Executed
                        </div>
                        <div className="text-emerald-400 font-medium">
                          {multisigStatus?.executedCount || 0}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Signer Status */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-white/[0.06] bg-white/[0.02]">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-amber-400" />
                    Signers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingMultisig ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-20 bg-white/5 rounded-xl" />
                      ))}
                    </div>
                  ) : multisigStatus?.signers?.length ? (
                    <SignerStatusList
                      signers={multisigStatus.signers}
                      signatures={[]}
                    />
                  ) : (
                    <div className="text-center py-8 text-white/40">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>No signers configured</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Configuration */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-white/[0.06] bg-white/[0.02]">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-white">
                    Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                      <span className="text-white/60">Environment</span>
                      <span className="text-white font-medium capitalize">
                        {multisigStatus?.environment || 'hardhat'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                      <span className="text-white/60">Total Signers</span>
                      <span className="text-white font-medium">
                        {multisigStatus?.signers?.length || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                      <span className="text-white/60">Required Signatures</span>
                      <span className="text-white font-medium">
                        {multisigStatus?.threshold || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-white/60">Current Balance</span>
                      <span className="text-amber-400 font-medium">
                        {formatCurrency(parseFloat(stats?.balance || '0'))}
                      </span>
                    </div>
                  </div>

                  <Link href="/dev-tools">
                    <Button 
                      variant="outline" 
                      className="w-full mt-6 border-white/10 hover:bg-white/5 text-white/70"
                    >
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      Modify Configuration
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
