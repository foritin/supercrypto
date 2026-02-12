'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  Clock,
  History,
  Download,
  Info,
  Copy,
  Wallet,
  PieChart,
  ArrowUpRight,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAccount } from 'wagmi';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { cn, truncateAddress } from '@/lib/utils';
import { RequireWallet } from '@/components/auth';
import { EmptyState } from '@/components/ui/empty-state';
import { type SubscriptionResponse } from '@/types/subscription';
import {
  useSubscriptions,
  useUserStats,
  useTransactionHistory,
  IS_TRANSACTION_MOCK,
  type PortfolioTransaction,
} from '@/hooks/use-portfolio';

const TRANSACTION_TYPE_NAMES: Record<string, string> = {
  subscribe: 'portfolio.txTypes.subscribe',
  redeem: 'portfolio.txTypes.redeem',
  stake: 'portfolio.txTypes.stake',
  unstake: 'portfolio.txTypes.unstake',
  claim: 'portfolio.txTypes.claim',
};

// Stat Card Component with Glassmorphism
interface StatCardProps {
  title: string;
  value: number;
  precision?: number;
  prefix?: React.ReactNode;
  icon: React.ReactNode;
  trend?: number | undefined;
  color: 'primary' | 'success' | 'warning' | 'info';
}

const colorMap = {
  primary: 'from-primary/20 to-primary/5 border-primary/30',
  success: 'from-green-500/20 to-green-500/5 border-green-500/30',
  warning: 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/30',
  info: 'from-blue-500/20 to-blue-500/5 border-blue-500/30',
};

const iconColorMap = {
  primary: 'text-primary',
  success: 'text-green-400',
  warning: 'text-yellow-400',
  info: 'text-blue-400',
};

function StatCard({ title, value, precision = 2, prefix, icon, trend, color }: StatCardProps) {
  return (
    <Card className={cn(
      'glass border overflow-hidden relative group',
      colorMap[color]
    )}>
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={cn('p-3 rounded-xl bg-white/5', iconColorMap[color])}>
            {icon}
          </div>
          {trend !== undefined && (
            <div className={cn(
              'flex items-center gap-1 text-sm font-medium',
              trend >= 0 ? 'text-green-400' : 'text-red-400'
            )}>
              <ArrowUpRight className={cn('h-4 w-4', trend < 0 && 'rotate-90')} />
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        
        <p className="text-white/60 text-sm mb-1">{title}</p>
        <div className="flex items-baseline gap-1">
          {prefix && <span className={cn('text-lg font-medium', iconColorMap[color])}>{prefix}</span>}
          <span className="text-2xl font-bold text-white">
            {value.toLocaleString(undefined, { 
              minimumFractionDigits: precision, 
              maximumFractionDigits: precision 
            })}
          </span>
        </div>
      </div>
      
      {/* Gradient overlay */}
      <div className={cn(
        'absolute inset-0 bg-gradient-to-br opacity-50 -z-10',
        colorMap[color].split(' ')[0],
        colorMap[color].split(' ')[1]
      )} />
    </Card>
  );
}

// Empty State Component
// Dev mode mock data indicator
function MockDataBanner() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-medium">
      <AlertTriangle className="h-3.5 w-3.5" />
      <span>⚠️ {t('portfolio.mockDataBanner', '开发模式 - 使用模拟数据')}</span>
    </div>
  );
}

export default function PortfolioPage() {
  const { t } = useTranslation();
  const { isConnected } = useAccount();

  // Data from React Query hooks
  const {
    data: subscriptionsData,
    isLoading: isLoadingSubscriptions,
  } = useSubscriptions();
  const {
    data: userStats,
    isLoading: isLoadingStats,
  } = useUserStats();
  const {
    data: transactions,
    isLoading: isLoadingTransactions,
  } = useTransactionHistory();

  const subscriptions = subscriptionsData?.items ?? [];
  
  // Modal states
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionResponse | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const handleViewDetail = useCallback((subscription: SubscriptionResponse) => {
    setSelectedSubscription(subscription);
    setDetailModalOpen(true);
  }, []);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  // Subscription table columns
  const subscriptionColumns: ColumnDef<SubscriptionResponse>[] = useMemo(
    () => [
      {
        accessorKey: 'asset_name',
        header: t('portfolio.table.asset'),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <span className="text-primary font-bold text-sm">
                {(row.original.asset_symbol ?? row.original.asset_name ?? '??').slice(0, 2)}
              </span>
            </div>
            <div>
              <span className="font-semibold text-white block">{row.original.asset_name}</span>
              <span className="text-xs text-white/50">{row.original.asset_symbol}</span>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'amount',
        header: t('portfolio.table.amount'),
        cell: ({ row }) => (
          <span className="font-semibold text-primary">
            ${row.original.amount.toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: 'apy',
        header: t('portfolio.table.apy'),
        cell: ({ row }) => (
          <Badge className="bg-primary/20 text-primary border-primary/30">
            {row.original.apy}% APY
          </Badge>
        ),
      },
      {
        accessorKey: 'lock_period',
        header: t('portfolio.table.period'),
        cell: ({ row }) => {
          const period = row.original.lock_period;
          const daysRemaining = row.original.days_remaining;
          const progressPercent = Math.max(0, 100 - (daysRemaining / (period * 30)) * 100);
          return (
            <div className="flex flex-col gap-1 min-w-[120px]">
              <span className="text-white/70">{t('portfolio.monthsLabel', { months: period })}</span>
              <Progress value={progressPercent} className="h-1" />
              <span className="text-xs text-white/50">
                {daysRemaining > 0 ? t('portfolio.daysLeftLabel', { days: daysRemaining }) : t('portfolio.matured')}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        header: t('portfolio.table.status'),
        cell: ({ row }) => {
          const status = row.original.status;
          const variants: Record<string, string> = {
            active: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            matured: 'bg-green-500/20 text-green-400 border-green-500/30',
            redeemed: 'bg-white/10 text-white/50 border-white/20',
          };
          return (
            <Badge variant="outline" className={variants[status] || variants.redeemed}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          );
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewDetail(row.original)}
            className="text-white/60 hover:text-primary hover:bg-primary/10"
          >
            {t('portfolio.detailsButton')}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ),
      },
    ],
    [t, handleViewDetail]
  );

  // Transaction table columns
  const transactionColumns: ColumnDef<PortfolioTransaction>[] = useMemo(
    () => [
      {
        accessorKey: 'created_at',
        header: t('portfolio.txTable.time'),
        cell: ({ row }) => (
          <span className="text-white/70">
            {new Date(row.original.created_at).toLocaleDateString()}
          </span>
        ),
      },
      {
        accessorKey: 'tx_type',
        header: t('portfolio.txTable.type'),
        cell: ({ row }) => {
          const type = row.original.tx_type;
          const txColorMap: Record<string, string> = {
            subscribe: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            redeem: 'bg-green-500/20 text-green-400 border-green-500/30',
            stake: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
            unstake: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
            claim: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
          };
          return (
            <Badge variant="outline" className={txColorMap[type] || txColorMap.subscribe}>
              {t(TRANSACTION_TYPE_NAMES[type] || type)}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'amount',
        header: t('portfolio.txTable.amount'),
        cell: ({ row }) => (
          <span className="text-white font-medium">
            ${parseFloat(row.original.amount).toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: t('portfolio.txTable.status'),
        cell: ({ row }) => {
          const status = row.original.status;
          const statusColorMap: Record<string, string> = {
            pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
            confirmed: 'bg-primary/20 text-primary border-primary/30',
            failed: 'bg-red-500/20 text-red-400 border-red-500/30',
          };
          return (
            <Badge variant="outline" className={statusColorMap[status] || statusColorMap.pending}>
              {status}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'tx_hash',
        header: t('portfolio.txTable.txHash'),
        cell: ({ row }) => {
          const hash = row.original.tx_hash;
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-white/50">
                      {truncateAddress(hash)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-white/40 hover:text-primary"
                      onClick={() => copyToClipboard(hash)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="glass border-white/10">
                  <p className="font-mono text-xs">{hash}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        },
      },
    ],
    [t, copyToClipboard]
  );

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-bg-dark pt-24 px-6">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <RequireWallet>
      <div className="min-h-screen bg-bg-dark pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/30">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <span className="text-primary text-sm font-semibold uppercase tracking-wider">
                {t('portfolio.myPortfolio')}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
              {t('portfolio.title', 'Investment Portfolio')}
            </h1>
            <p className="text-white/60 max-w-xl">
              {t('portfolio.subtitle', 'Track your RWA investments, monitor yields, and manage your assets')}
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
            {isLoadingStats ? (
              [...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))
            ) : (
              <>
                <StatCard
                  title={t('portfolio.totalInvestedLabel')}
                  value={userStats?.total_invested ?? 0}
                  prefix="$"
                  icon={<DollarSign className="h-5 w-5" />}
                  color="primary"
                />
                <StatCard
                  title={t('portfolio.currentValueLabel')}
                  value={userStats?.total_value ?? 0}
                  prefix="$"
                  icon={<TrendingUp className="h-5 w-5" />}
                  trend={userStats?.total_invested ? Number(((((userStats.total_value ?? 0) - userStats.total_invested) / userStats.total_invested) * 100).toFixed(1)) : undefined}
                  color="success"
                />
                <StatCard
                  title={t('portfolio.totalEarningsLabel')}
                  value={userStats?.total_earnings ?? 0}
                  prefix="$"
                  icon={<TrendingUp className="h-5 w-5" />}
                  color="info"
                />
                <StatCard
                  title={t('portfolio.activeInvestmentsLabel')}
                  value={userStats?.active_subscriptions ?? 0}
                  precision={0}
                  icon={<Clock className="h-5 w-5" />}
                  color="warning"
                />
              </>
            )}
          </div>

          {/* Main Content Tabs */}
          <Card className="glass border-primary/10">
            <Tabs defaultValue="investments" className="p-6">
              <TabsList className="mb-6 bg-white/5 border border-white/10 p-1">
                <TabsTrigger 
                  value="investments" 
                  className="flex items-center gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
                >
                  <PieChart className="h-4 w-4" />
                  {t('portfolio.myInvestments')}
                </TabsTrigger>
                <TabsTrigger 
                  value="history"
                  className="flex items-center gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
                >
                  <History className="h-4 w-4" />
                  {t('portfolio.transactionHistory')}
                  {IS_TRANSACTION_MOCK && (
                    <span className="ml-1 text-yellow-400 text-[10px]">⚠️</span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="investments">
                {isLoadingSubscriptions ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : subscriptions.length > 0 ? (
                  <DataTable
                    columns={subscriptionColumns}
                    data={subscriptions}
                  />
                ) : (
                  <EmptyState 
                    message={t('portfolio.noInvestmentsYet')} 
                    icon={<PieChart className="h-8 w-8" />}
                  />
                )}
              </TabsContent>

              <TabsContent value="history">
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                      <Select defaultValue="all">
                        <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white">
                          <SelectValue placeholder={t('portfolio.filterByTypeLabel')} />
                        </SelectTrigger>
                        <SelectContent className="glass border-white/10">
                          <SelectItem value="all">{t('portfolio.allTypes')}</SelectItem>
                          <SelectItem value="subscribe">{t('portfolio.subscribe')}</SelectItem>
                          <SelectItem value="redeem">{t('portfolio.redeemType')}</SelectItem>
                          <SelectItem value="claim">{t('portfolio.claimRewards')}</SelectItem>
                        </SelectContent>
                      </Select>
                      {IS_TRANSACTION_MOCK && <MockDataBanner />}
                    </div>
                    <Button 
                      variant="outline" 
                      className="border-white/10 text-white/70 hover:text-white hover:bg-white/5"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {t('portfolio.exportLabel')}
                    </Button>
                  </div>

                  {isLoadingTransactions ? (
                    <div className="space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : (transactions ?? []).length > 0 ? (
                    <DataTable
                      columns={transactionColumns}
                      data={transactions ?? []}
                    />
                  ) : (
                    <EmptyState 
                      message={t('portfolio.noTransactionsYet')} 
                      icon={<History className="h-8 w-8" />}
                    />
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        {/* Subscription Detail Modal */}
        <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
          <DialogContent className="glass border-primary/20 max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <Info className="h-5 w-5 text-primary" />
                {t('portfolio.investmentDetails')}
              </DialogTitle>
            </DialogHeader>

            {selectedSubscription && (
              <div className="space-y-4">
                {/* Asset Info */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <span className="text-primary font-bold">
                        {(selectedSubscription.asset_symbol ?? selectedSubscription.asset_name ?? '??').slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{selectedSubscription.asset_name}</h3>
                      <Badge className="bg-primary/20 text-primary border-primary/30">
                        {selectedSubscription.apy}% APY
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-white/50 mb-1">{t('portfolio.investedAmount')}</p>
                      <p className="text-primary font-semibold text-lg">
                        ${selectedSubscription.amount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/50 mb-1">{t('portfolio.expectedReturnLabel')}</p>
                      <p className="text-green-400 font-semibold text-lg">
                        +${selectedSubscription.expected_interest.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lock Progress */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-white/50">{t('portfolio.lockProgress')}</span>
                    <span className="text-white">
                      {selectedSubscription.days_remaining > 0 
                        ? t('portfolio.daysRemaining', { days: selectedSubscription.days_remaining })
                        : t('portfolio.matured')}
                    </span>
                  </div>
                  <Progress 
                    value={Math.max(0, 100 - (selectedSubscription.days_remaining / (selectedSubscription.lock_period * 30)) * 100)} 
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-white/40 mt-2">
                    <span>{selectedSubscription.start_date}</span>
                    <span>{selectedSubscription.end_date}</span>
                  </div>
                </div>

                {/* Status */}
                <div className="flex justify-center">
                  <Badge
                    className={cn(
                      'text-sm px-4 py-1',
                      selectedSubscription.status === 'active'
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        : selectedSubscription.status === 'matured'
                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                        : 'bg-white/10 text-white/50 border-white/20'
                    )}
                  >
                    {selectedSubscription.status.charAt(0).toUpperCase() + selectedSubscription.status.slice(1)}
                  </Badge>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => setDetailModalOpen(false)}
                className="border-white/10 text-white/70 hover:text-white hover:bg-white/5"
              >
                {t('common.close')}
              </Button>
              {selectedSubscription?.is_matured && selectedSubscription?.status !== 'redeemed' && (
                <Button className="bg-primary hover:bg-primary-dark text-bg-dark">
                  {t('portfolio.redeemNow')}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RequireWallet>
  );
}
