'use client';

import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import { 
  TerminalBackground,
  CyberHeader,
  NetWorthCard,
  AssetCategoryTabs,
  type AssetCategory,
  CollapsibleAssetList,
  PerformanceChart,
  TransactionStream,
  CyberEmptyState,
  type Transaction,
  type AssetGroup,
} from '@/components/portfolio';

import { useSubscriptions, useUserStats } from '@/hooks/use-portfolio';
import { useUserRedemptions } from '@/hooks/use-redemptions';
import { Button } from '@/components/ui/button';
import { 
  Lightning,
  TrendUp,
  Clock,
  ChartPieSlice,
  Wallet
} from '@phosphor-icons/react';

// Types
interface InvestmentAsset {
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
  maturityDate?: string | undefined;
  redemptionId?: string | undefined;
  type: 'investment';
}

export default function PortfolioPage() {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<AssetCategory>('all');
  
  // Real data hooks
  const { 
    data: subscriptionsData, 
    isLoading: isLoadingSubscriptions 
  } = useSubscriptions();
  
  const { 
    data: userStats, 
    isLoading: isLoadingStats 
  } = useUserStats();
  
  const { 
    data: redemptions = [],
    isLoading: isLoadingRedemptions 
  } = useUserRedemptions();

  // Transform subscriptions to investment assets
  const investmentAssets: InvestmentAsset[] = useMemo(() => {
    if (!subscriptionsData?.items) return [];
    
    return subscriptionsData.items.map(sub => {
      const period = sub.lock_period || 1;
      const daysRemaining = sub.days_remaining || 0;
      const progress = Math.max(0, 100 - (daysRemaining / (period * 30)) * 100);
      
      // Check if there's an active redemption
      const redemption = redemptions.find(r => r.subscriptionId === sub.id);
      let status: InvestmentAsset['status'] = sub.status === 'active' ? 'active' : 
                                        sub.status === 'matured' ? 'matured' : 
                                        sub.status === 'redeemed' ? 'completed' : 'pending';
      
      // 只有 active/matured 状态的订阅才可能处于赎回中
      if ((status === 'active' || status === 'matured') && redemption && !sub.redeem_tx_hash) {
        status = 'redeeming';
      }
      
      return {
        id: sub.id.toString(),
        name: sub.asset_name || t('portfolio.unknownAsset', { defaultValue: 'Unknown Asset' }),
        symbol: sub.asset_symbol || 'N/A',
        invested: sub.amount,
        currentValue: sub.total_return,
        expectedReturn: sub.expected_interest,
        apy: sub.apy,
        status,
        daysLeft: daysRemaining,
        progress,
        lockPeriod: period,
        redemptionId: redemption?.id,
        type: 'investment',
      };
    });
  }, [subscriptionsData, redemptions, t]);

  // Calculate category counts
  const categoryCounts = useMemo(() => {
    const counts = { all: 0, active: 0, matured: 0, pending: 0, completed: 0 };
    investmentAssets.forEach(asset => {
      counts.all++;
      if (asset.status === 'active') counts.active++;
      else if (asset.status === 'matured') counts.matured++;
      else if (asset.status === 'pending') counts.pending++;
      else if (asset.status === 'completed' || asset.status === 'redeeming') counts.completed++;
    });
    return counts;
  }, [investmentAssets]);

  // Filter assets by category
  const filteredAssets = useMemo(() => {
    if (activeCategory === 'all') return investmentAssets;
    if (activeCategory === 'completed') {
      return investmentAssets.filter(a => a.status === 'completed' || a.status === 'redeeming');
    }
    return investmentAssets.filter(a => a.status === activeCategory);
  }, [investmentAssets, activeCategory]);

  // Build asset groups for collapsible list
  const assetGroups: AssetGroup[] = useMemo(() => {
    const activeInvestments = filteredAssets.filter(a => a.status === 'active');
    const maturedInvestments = filteredAssets.filter(a => a.status === 'matured');
    const otherInvestments = filteredAssets.filter(a => 
      a.status !== 'active' && a.status !== 'matured'
    );

    const groups: AssetGroup[] = [];

    if (activeInvestments.length > 0) {
      groups.push({
        title: t('portfolio.groups.activeInvestments', { defaultValue: 'Active Investments' }),
        type: 'investment',
        totalValue: activeInvestments.reduce((sum, a) => sum + a.currentValue, 0),
        assets: activeInvestments,
        icon: TrendUp,
        color: '#10b981',
      });
    }

    if (maturedInvestments.length > 0) {
      groups.push({
        title: t('portfolio.groups.maturedPositions', { defaultValue: 'Matured Positions' }),
        type: 'investment',
        totalValue: maturedInvestments.reduce((sum, a) => sum + a.currentValue, 0),
        assets: maturedInvestments,
        icon: Clock,
        color: '#3b82f6',
      });
    }

    if (otherInvestments.length > 0) {
      groups.push({
        title: t('portfolio.groups.otherPositions', { defaultValue: 'Other Positions' }),
        type: 'investment',
        totalValue: otherInvestments.reduce((sum, a) => sum + a.currentValue, 0),
        assets: otherInvestments,
        icon: ChartPieSlice,
        color: '#6b7280',
      });
    }

    return groups;
  }, [filteredAssets, t]);

  // Transform to transactions
  const transactions: Transaction[] = useMemo(() => {
    const txs: Transaction[] = [];
    
    // From subscriptions
    subscriptionsData?.items?.forEach(sub => {
      if (sub.tx_hash) {
        txs.push({
          id: `sub-${sub.id}`,
          type: 'subscribe',
          amount: sub.amount,
          status: 'confirmed',
          date: sub.created_at,
          hash: sub.tx_hash,
          assetName: sub.asset_name || undefined,
          network: sub.environment,
        });
      }
      
      if (sub.redeem_tx_hash) {
        txs.push({
          id: `redeem-${sub.id}`,
          type: 'redeem',
          amount: sub.total_return,
          status: 'confirmed',
          date: sub.updated_at,
          hash: sub.redeem_tx_hash,
          assetName: sub.asset_name || undefined,
          network: sub.environment,
        });
      }
    });
    
    // From redemptions (pending ones)
    redemptions.forEach(r => {
      if (!subscriptionsData?.items?.find(s => s.id === r.subscriptionId)?.redeem_tx_hash) {
        txs.push({
          id: `red-req-${r.id}`,
          type: 'redeem',
          amount: parseFloat(r.amount),
          status: r.status === 'executed' ? 'confirmed' : 'pending',
          date: r.createdAt,
          hash: r.proposalTxHash || r.txHash,
          assetName: t('portfolio.subscriptionWithId', {
            id: r.subscriptionId,
            defaultValue: `Subscription #${r.subscriptionId}`,
          }),
        });
      }
    });
    
    return txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [subscriptionsData, redemptions, t]);

  // Stats
  const stats = useMemo(() => {
    const totalInvested = userStats?.total_invested || 0;
    const totalValue = userStats?.total_value || 0;

    return { totalValue, totalInvested };
  }, [userStats]);

  // Use only backend-provided performance series. If API doesn't provide one, show empty state.
  const performanceData = useMemo(() => {
    type BackendPoint = {
      date: string;
      timestamp: number;
      portfolio: number;
      invested: number;
      benchmark?: number;
    };
    const backendSeries = (userStats as { performance_data?: BackendPoint[] } | undefined)?.performance_data;
    return Array.isArray(backendSeries) ? backendSeries : [];
  }, [userStats]);

  const isLoading = isLoadingSubscriptions || isLoadingStats || isLoadingRedemptions;
  const isEmpty = !isLoading && investmentAssets.length === 0;

  if (isEmpty) {
    return (
      <div className="min-h-screen bg-[#050508]">
        <TerminalBackground />
        <CyberHeader />
        <main className="relative z-10 max-w-[1400px] mx-auto px-6">
          <CyberEmptyState />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050508]">
      <TerminalBackground />
      
      {/* Header */}
      <CyberHeader />

      {/* Main Content */}
      <main className="relative z-10 max-w-[1400px] mx-auto px-6 pb-12">
        {/* Net Worth Card */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6"
        >
          <NetWorthCard 
            totalValue={stats.totalValue}
            totalInvested={stats.totalInvested}
            isLoading={isLoadingStats}
          />
        </motion.section>

        {/* Category Tabs */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-6"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <AssetCategoryTabs
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
              counts={categoryCounts}
            />
            
            <Link href="/assets">
              <Button 
                className="bg-[#00f5d4] text-black hover:bg-[#00f5d4]/90 font-medium"
              >
                <Lightning weight="fill" className="w-4 h-4 mr-2" />
                {t('portfolio.cta.newInvestment', { defaultValue: 'New Investment' })}
              </Button>
            </Link>
          </div>
        </motion.section>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Assets & Performance */}
          <div className="lg:col-span-2 space-y-6">
            {/* Performance Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <PerformanceChart 
                data={performanceData}
                isLoading={isLoadingStats}
              />
            </motion.div>

            {/* Asset List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              {isLoadingSubscriptions ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : filteredAssets.length > 0 ? (
                <CollapsibleAssetList groups={assetGroups} />
              ) : (
                <div className="text-center py-12 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                  <Wallet weight="duotone" className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/40">
                    {t('portfolio.empty.noAssetsInCategory', { defaultValue: 'No assets in this category' })}
                  </p>
                </div>
              )}
            </motion.div>
          </div>

          {/* Right Column - Transaction Stream */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <TransactionStream 
              transactions={transactions}
              isLoading={isLoadingSubscriptions || isLoadingRedemptions}
              maxItems={8}
            />
          </motion.div>
        </div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 pt-6 border-t border-white/[0.06] flex items-center justify-between text-xs text-white/30 font-mono"
        >
          <div className="flex items-center gap-4">
            <span>{t('portfolio.footer.terminal', { defaultValue: 'PORTFOLIO_TERMINAL' })}</span>
            <span>|</span>
            <span>{t('portfolio.footer.secureConnection', { defaultValue: 'SECURE_CONNECTION' })}</span>
          </div>
          <div className="flex items-center gap-4">
            <span>{t('portfolio.footer.copyright', { year: 2026, defaultValue: '© {{year}} SUPERCRYPTO' })}</span>
          </div>
        </motion.footer>
      </main>

      {/* Global styles for custom scrollbar */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 245, 212, 0.2);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 245, 212, 0.4);
        }
      `}</style>
    </div>
  );
}
