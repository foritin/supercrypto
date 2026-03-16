'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History,
  Download,
  Wallet,
  PieChart,
  LayoutGrid,
  Table2,
  ExternalLink,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useState, useCallback, useMemo } from 'react';
import { useAccount } from 'wagmi';

import { RequireWallet } from '@/components/auth';
import { PortfolioChart } from '@/components/portfolio/portfolio-chart';
import { InvestmentCard } from '@/components/portfolio/investment-card';
import { StatCard } from '@/components/portfolio/stat-card';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useSubscriptions,
  useUserStats,
  type PortfolioTransaction,
} from '@/hooks/use-portfolio';
import { cn, truncateAddress } from '@/lib/utils';
import { type SubscriptionResponse } from '@/types/subscription';

type ViewMode = 'cards' | 'table';

// Transaction item component
function TransactionItem({ tx, index }: { tx: PortfolioTransaction; index: number }) {
  const typeColors: Record<string, string> = {
    subscribe: 'text-blue-400',
    redeem: 'text-emerald-400',
    claim: 'text-amber-400',
    stake: 'text-purple-400',
    unstake: 'text-orange-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center justify-between py-4 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] px-4 -mx-4 rounded-lg transition-colors group"
    >
      <div className="flex items-center gap-4">
        <div className={cn('w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center', typeColors[tx.tx_type] || 'text-gray-400')}>
          <TrendingUpIcon className="w-4 h-4" />
        </div>
        <div>
          <div className="text-white font-medium capitalize">{tx.tx_type}</div>
          <div className="text-gray-500 text-xs">{new Date(tx.created_at).toLocaleDateString()}</div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-white font-semibold">${parseFloat(tx.amount).toLocaleString()}</div>
        <span className={cn(
          'text-xs px-2 py-1 rounded-full border',
          tx.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
          tx.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
          'bg-rose-500/10 text-rose-400 border-rose-500/20'
        )}>
          {tx.status}
        </span>
        <a
          href={`https://etherscan.io/tx/${tx.tx_hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-500 hover:text-gray-300 text-xs font-mono transition-colors flex items-center gap-1"
        >
          {truncateAddress(tx.tx_hash)}
          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
      </div>
    </motion.div>
  );
}

function TrendingUpIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

export default function PortfolioPage() {
  const { isConnected } = useAccount();
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionResponse | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const { data: subscriptionsData, isLoading: isLoadingSubscriptions } = useSubscriptions();
  const { data: userStats, isLoading: isLoadingStats } = useUserStats();

  const subscriptions = subscriptionsData?.items ?? [];

  const handleViewDetail = useCallback((sub: SubscriptionResponse) => {
    setSelectedSubscription(sub);
    setDetailModalOpen(true);
  }, []);

  const portfolioTrend = useMemo(() => {
    if (!userStats?.total_invested || userStats.total_invested === 0) return undefined;
    return Number((((userStats.total_value ?? 0) - userStats.total_invested) / userStats.total_invested * 100).toFixed(1));
  }, [userStats]);

  // Table columns
  const subscriptionColumns: ColumnDef<SubscriptionResponse>[] = useMemo(() => [
    {
      accessorKey: 'asset_name',
      header: 'Asset',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-sm">
            {(row.original.asset_symbol ?? row.original.asset_name ?? '??').slice(0, 2)}
          </div>
          <div>
            <div className="text-white font-medium">{row.original.asset_name}</div>
            <div className="text-gray-500 text-xs">{row.original.asset_symbol}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Invested',
      cell: ({ row }) => <span className="text-white font-medium">${row.original.amount.toLocaleString()}</span>,
    },
    {
      accessorKey: 'apy',
      header: 'APY',
      cell: ({ row }) => <span className="text-amber-400 font-medium">{row.original.apy}%</span>,
    },
    {
      accessorKey: 'lock_period',
      header: 'Progress',
      cell: ({ row }) => {
        const period = row.original.lock_period;
        const daysRemaining = row.original.days_remaining;
        const progressPercent = Math.max(0, 100 - (daysRemaining / (period * 30)) * 100);
        const isMatured = row.original.status === 'matured';
        return (
          <div className="w-32">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500">{period}mo</span>
              <span className={isMatured ? 'text-emerald-400' : 'text-white/60'}>
                {daysRemaining > 0 ? `${daysRemaining}d left` : 'Done'}
              </span>
            </div>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div 
                className={cn('h-full rounded-full', isMatured ? 'bg-emerald-400' : 'bg-blue-400')} 
                style={{ width: `${progressPercent}%` }} 
              />
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <span className={cn(
            'text-xs px-2 py-1 rounded-full',
            status === 'active' ? 'bg-blue-500/10 text-blue-400' :
            status === 'matured' ? 'bg-emerald-500/10 text-emerald-400' :
            'bg-gray-500/10 text-gray-400'
          )}>
            {status}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <button
          onClick={() => handleViewDetail(row.original)}
          className="text-gray-500 hover:text-white text-sm transition-colors"
        >
          Details
        </button>
      ),
    },
  ], [handleViewDetail]);

  // Empty state data - no mock data
  const emptyStats = { 
    total_invested: 0, 
    total_value: 0, 
    total_earnings: 0, 
    active_subscriptions: 0 
  };

  // 从认购记录构建交易历史（只显示与认购相关的操作）
  const subscriptionTransactions = useMemo(() => {
    if (!subscriptions.length) return [];
    
    const txs: PortfolioTransaction[] = [];
    
    for (const sub of subscriptions) {
      // 添加认购交易
      if (sub.tx_hash) {
        txs.push({
          id: `subscribe-${sub.id}`,
          created_at: sub.created_at,
          tx_type: 'subscribe',
          amount: sub.amount.toString(),
          status: sub.status === 'active' || sub.status === 'matured' ? 'confirmed' : 'pending',
          tx_hash: sub.tx_hash,
          network: sub.environment,
        });
      }
      
      // 添加赎回交易（如果有）
      if (sub.redeem_tx_hash) {
        txs.push({
          id: `redeem-${sub.id}`,
          created_at: sub.updated_at,
          tx_type: 'redeem',
          amount: sub.total_return.toString(),
          status: 'confirmed',
          tx_hash: sub.redeem_tx_hash,
          network: sub.environment,
        });
      }
    }
    
    // 按时间倒序排列
    return txs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [subscriptions]);

  const renderContent = () => {
    // Show empty state when not connected or when loading
    const stats = isConnected ? (userStats ?? emptyStats) : emptyStats;
    const subs = isConnected ? subscriptions : [];
    // 使用从认购记录构建的交易历史
    const txs = isConnected ? subscriptionTransactions : [];
    const isLoading = isConnected && (isLoadingStats || isLoadingSubscriptions);

    return (
      <>
        {/* Stats Section - Clean horizontal layout like demo */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6"
        >
          <div className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] rounded-2xl border border-white/[0.08] p-6 lg:p-8">
            {isLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 bg-white/5" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
                <StatCard 
                  label="Total Invested" 
                  value={`$${(stats?.total_invested ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  delay={0} 
                />
                <StatCard 
                  label="Current Value" 
                  value={`$${(stats?.total_value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  change={portfolioTrend !== undefined ? `${portfolioTrend}%` : undefined}
                  isPositive={portfolioTrend === undefined || portfolioTrend >= 0}
                  delay={1} 
                />
                <StatCard 
                  label="Total Earnings" 
                  value={`$${(stats?.total_earnings ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  delay={2} 
                />
                <StatCard 
                  label="Active Investments" 
                  value={`${stats?.active_subscriptions ?? 0} assets`}
                  delay={3} 
                />
              </div>
            )}
          </div>
        </motion.section>

        {/* Chart Section */}
        <section className="mb-6">
          <div className="bg-gradient-to-br from-white/[0.04] to-transparent rounded-2xl border border-white/[0.06] p-6">
            <PortfolioChart />
          </div>
        </section>

        {/* My Investments Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <div className="bg-gradient-to-br from-white/[0.04] to-transparent rounded-2xl border border-white/[0.06] p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center">
                  <PieChart className="w-3 h-3 text-gray-400" />
                </div>
                <h2 className="text-lg font-bold text-white">My Investments</h2>
              </div>
              <div className="flex items-center gap-3">
                {!isConnected && (
                  <span className="text-xs text-amber-400/80 px-2 py-1 rounded-full bg-amber-400/10">
                    Demo
                  </span>
                )}
                <div className="flex items-center bg-white/5 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('cards')}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                      viewMode === 'cards' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'
                    )}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    Cards
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                      viewMode === 'table' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'
                    )}
                  >
                    <Table2 className="h-3.5 w-3.5" />
                    Table
                  </button>
                </div>
              </div>
            </div>

            {isLoading ? (
              viewMode === 'cards' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-80 bg-white/5 rounded-xl" />)}
                </div>
              ) : (
                <Skeleton className="h-64 bg-white/5 rounded-xl" />
              )
            ) : subs.length > 0 ? (
              <AnimatePresence mode="wait">
                {viewMode === 'cards' ? (
                  <motion.div
                    key="cards"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                  >
                    {subs.map((sub, index) => (
                      <InvestmentCard 
                        key={sub.id} 
                        name={sub.asset_name}
                        symbol={sub.asset_symbol}
                        status={sub.status}
                        apy={sub.apy}
                        invested={sub.amount}
                        expectedReturn={sub.expected_interest}
                        progress={Math.max(0, 100 - (sub.days_remaining / (sub.lock_period * 30)) * 100)}
                        daysLeft={sub.days_remaining}
                        lockPeriod={sub.lock_period}
                        totalAtMaturity={sub.total_return}
                        onViewDetail={() => handleViewDetail(sub)}
                        index={index}
                      />
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    key="table"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="bg-white/[0.02] rounded-2xl border border-white/[0.06] p-6"
                  >
                    <DataTable columns={subscriptionColumns} data={subs} />
                  </motion.div>
                )}
              </AnimatePresence>
            ) : (
              <EmptyState message="No investments yet" icon={<PieChart className="h-12 w-12 text-white/20" />} />
            )}
          </div>
        </motion.section>

        {/* Recent Transactions */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.4 }}
        >
          <div className="bg-gradient-to-br from-white/[0.04] to-transparent rounded-2xl border border-white/[0.06] p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center">
                  <History className="w-3 h-3 text-gray-400" />
                </div>
                <h2 className="text-lg font-bold text-white">Recent Transactions</h2>
              </div>
              <div className="flex items-center gap-3">
                {!isConnected && (
                  <span className="text-xs text-gray-500 px-2 py-1 rounded-full bg-white/5 flex items-center gap-1">
                    <Info className="h-3 w-3" /> Connect wallet to view
                  </span>
                )}
                <button className="text-gray-400 hover:text-white text-xs flex items-center gap-1.5 transition-colors">
                  <Download className="h-3.5 w-3.5" />
                  Export
                </button>
              </div>
            </div>

            {isConnected && isLoadingSubscriptions ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 bg-white/5 rounded-xl" />)}
              </div>
            ) : txs.length > 0 ? (
              <div className="bg-white/[0.02] rounded-xl border border-white/[0.04] px-4">
                {txs.slice(0, 5).map((tx, index) => (
                  <TransactionItem key={tx.id} tx={tx} index={index} />
                ))}
              </div>
            ) : (
              <EmptyState message="No transactions yet" icon={<History className="h-12 w-12 text-white/20" />} />
            )}
          </div>
        </motion.section>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0b14] pt-24 pb-16 px-4 sm:px-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[150px]" />
        <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[100px]" />
      </div>
      
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6 }}
          className="mb-10"
        >
          <span className="text-blue-400 text-[10px] font-bold tracking-[0.2em] uppercase mb-2 block">Portfolio</span>
          <h1 className="text-4xl font-bold text-white mb-2">Investment Portfolio</h1>
          <p className="text-gray-500 text-sm">Track your RWA investments and monitor performance</p>
        </motion.div>

        {/* Connect Wallet Banner */}
        {!isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 p-5 rounded-xl bg-white/[0.02] border border-white/[0.06]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium">Connect Your Wallet</h3>
                  <p className="text-gray-500 text-sm">View your actual portfolio and manage investments</p>
                </div>
              </div>
              <Button className="bg-blue-500 hover:bg-blue-500/90 text-white">
                Connect Wallet
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Content */}
        {isConnected ? <RequireWallet>{renderContent()}</RequireWallet> : renderContent()}
      </div>

      {/* Detail Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="bg-[#0f1119] border-white/[0.08] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Investment Details</DialogTitle>
          </DialogHeader>
          {selectedSubscription && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold">
                  {(selectedSubscription.asset_symbol ?? selectedSubscription.asset_name ?? '??').slice(0, 2)}
                </div>
                <div>
                  <div className="text-white font-semibold">{selectedSubscription.asset_name}</div>
                  <div className="text-amber-400 text-sm">{selectedSubscription.apy}% APY</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/[0.03] rounded-lg p-3">
                  <div className="text-gray-500 text-xs">Invested</div>
                  <div className="text-white font-semibold">${selectedSubscription.amount.toLocaleString()}</div>
                </div>
                <div className="bg-white/[0.03] rounded-lg p-3">
                  <div className="text-gray-500 text-xs">Expected Return</div>
                  <div className="text-amber-400 font-semibold">+${selectedSubscription.expected_interest.toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDetailModalOpen(false)} className="text-gray-400 hover:text-white">Close</Button>
            {selectedSubscription?.is_matured && selectedSubscription?.status !== 'redeemed' && (
              <Button className="bg-amber-500 text-black hover:bg-amber-500/90">Redeem</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
