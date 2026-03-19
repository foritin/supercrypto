'use client';

import { motion } from 'framer-motion';
import { 
  Wallet, 
  Clock, 
  CheckCircle2, 
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  Users
} from 'lucide-react';
import Link from 'next/link';

import { RequireAuth } from '@/components/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTreasuryStats, useMultisigStatus } from '@/hooks/use-treasury';
import { useRedemptionQueue } from '@/hooks/use-treasury';
import { useCurrentUser } from '@/hooks/use-current-user';
import { RedemptionStatusBadge } from '@/components/treasury/redemption-status-badge';
import { cn, formatCurrency, truncateAddress } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════
// Stats Card Component
// ═══════════════════════════════════════════════════════════

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  delay?: number;
}

function StatCard({ title, value, subtitle, icon, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <Card className="border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1] transition-colors">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-white/50 mb-1">{title}</p>
              <h3 className="text-2xl font-bold text-white">{value}</h3>
              {subtitle && (
                <p className="text-xs text-white/40 mt-1">{subtitle}</p>
              )}
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// Recent Activity Item
// ═══════════════════════════════════════════════════════════

function RecentActivityItem({ 
  request, 
  index 
}: { 
  request: { 
    id: string;
    requestId: number;
    userAddress: string;
    totalAmount: string;
    status: import('@/types/treasury').RedemptionStatus;
    createdAt: string;
  };
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center justify-between py-4 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] px-4 -mx-4 rounded-lg transition-colors"
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center",
          request.status === 'executed' ? 'bg-emerald-500/10 text-emerald-400' :
          request.status === 'signing' ? 'bg-blue-500/10 text-blue-400' :
          request.status === 'rejected' ? 'bg-rose-500/10 text-rose-400' :
          'bg-amber-500/10 text-amber-400'
        )}>
          {request.status === 'executed' ? <CheckCircle2 className="w-4 h-4" /> :
           request.status === 'signing' ? <ShieldCheck className="w-4 h-4" /> :
           request.status === 'rejected' ? <TrendingUp className="w-4 h-4" /> :
           <Clock className="w-4 h-4" />}
        </div>
        <div>
          <div className="text-white font-medium">Request #{request.requestId}</div>
          <div className="text-xs text-white/50 font-mono">{truncateAddress(request.userAddress)}</div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-white font-semibold">{formatCurrency(parseFloat(request.totalAmount))}</div>
          <div className="text-xs text-white/50">
            {new Date(request.createdAt).toLocaleDateString()}
          </div>
        </div>
        <RedemptionStatusBadge status={request.status} size="sm" />
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Page Component
// ═══════════════════════════════════════════════════════════

export default function TreasuryPage() {
  const { data: stats, isLoading: isLoadingStats } = useTreasuryStats();
  const { data: multisigStatus, isLoading: isLoadingMultisig } = useMultisigStatus();
  const { data: queueData, isLoading: isLoadingQueue } = useRedemptionQueue({ pageSize: 5 });
  const { user } = useCurrentUser();

  const canAccessTreasury = Boolean(
    user?.is_admin || user?.roles?.includes('contract_owner')
  );

  return (
    <RequireAuth wallet check={() => canAccessTreasury}>
      <div className="min-h-screen bg-[#0a0b14] pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
            <span className="text-amber-400 text-[10px] font-bold tracking-[0.2em] uppercase mb-2 block">
              Treasury
            </span>
            <h1 className="text-4xl font-bold text-white mb-2">Treasury Management</h1>
            <p className="text-white/50">Monitor and manage multisig treasury operations</p>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {isLoadingStats ? (
              [...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-28 bg-white/5 rounded-xl" />
              ))
            ) : (
              <>
                <StatCard
                  title="Treasury Balance"
                  value={formatCurrency(parseFloat(stats?.balance || '0'))}
                  subtitle="Available for redemptions"
                  icon={<Wallet className="w-5 h-5" />}
                  delay={0}
                />
                <StatCard
                  title="Pending Redemptions"
                  value={stats?.pendingCount?.toString() || '0'}
                  subtitle={formatCurrency(parseFloat(stats?.pendingTotal || '0'))}
                  icon={<Clock className="w-5 h-5" />}
                  delay={0.1}
                />
                <StatCard
                  title="Total Executed"
                  value={stats?.executedCount?.toString() || '0'}
                  subtitle={formatCurrency(parseFloat(stats?.executedTotal || '0'))}
                  icon={<CheckCircle2 className="w-5 h-5" />}
                  delay={0.2}
                />
                <StatCard
                  title="Signers"
                  value={`${stats?.threshold || 0}/${stats?.signerCount || 0}`}
                  subtitle="Required signatures"
                  icon={<Users className="w-5 h-5" />}
                  delay={0.3}
                />
              </>
            )}
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Multisig Status & Quick Actions */}
            <div className="space-y-6">
              {/* Multisig Status Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="border-white/[0.06] bg-white/[0.02]">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-blue-400" />
                      Multisig Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isLoadingMultisig ? (
                      <div className="space-y-3">
                        <Skeleton className="h-4 w-full bg-white/5" />
                        <Skeleton className="h-4 w-3/4 bg-white/5" />
                      </div>
                    ) : (
                      <>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-white/50">Contract</span>
                            <span className="text-white font-mono">
                              {truncateAddress(multisigStatus?.contractAddress || '')}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-white/50">Threshold</span>
                            <span className="text-white">
                              {multisigStatus?.threshold} of {multisigStatus?.signers?.length} signers
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-white/50">Total Proposals</span>
                            <span className="text-white">{multisigStatus?.proposalCount}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-white/50">Executed</span>
                            <span className="text-emerald-400">{multisigStatus?.executedCount}</span>
                          </div>
                        </div>
                        
                        <Link href="/admin/assets/treasury/multisig">
                          <Button 
                            variant="outline" 
                            className="w-full mt-4 border-white/10 hover:bg-white/5 text-white/70"
                          >
                            View Details
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </Link>
                      </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="border-white/[0.06] bg-white/[0.02]">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-white">
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Link href="/admin/assets/treasury/queue">
                      <Button className="w-full bg-blue-500 hover:bg-blue-500/90 text-white">
                        <Clock className="w-4 h-4 mr-2" />
                        View Queue
                      </Button>
                    </Link>
                    <Link href="/dev-tools">
                      <Button 
                        variant="outline" 
                        className="w-full border-white/10 hover:bg-white/5 text-white/70"
                      >
                        <ShieldCheck className="w-4 h-4 mr-2" />
                        Configure Multisig
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Right Column - Recent Activity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="lg:col-span-2"
            >
              <Card className="border-white/[0.06] bg-white/[0.02] h-full">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-white">
                    Recent Redemptions
                  </CardTitle>
                  <Link href="/admin/assets/treasury/queue">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-white/50 hover:text-white"
                    >
                      View All
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  {isLoadingQueue ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-16 bg-white/5 rounded-lg" />
                      ))}
                    </div>
                  ) : queueData?.items?.length ? (
                    <div className="space-y-1">
                      {queueData.items.slice(0, 5).map((request, index) => (
                        <RecentActivityItem 
                          key={request.id} 
                          request={request} 
                          index={index}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-white/40">
                      <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>No recent redemptions</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
