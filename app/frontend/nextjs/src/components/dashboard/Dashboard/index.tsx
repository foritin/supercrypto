'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatCard } from '@/components/ui/StatCard';
import { PortfolioCard } from '@/components/dashboard/PortfolioCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { useDashboardData } from '@/hooks/useDashboardData';
import { PageTransition } from '@/components/layout/PageTransition';

export const Dashboard: React.FC = () => {
  const {
    stats,
    portfolio,
    activities,
    loading,
    error
  } = useDashboardData();

  // 设置页面标题
  useEffect(() => {
    document.title = 'SuperCrypto - 数据仪表盘';
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-400 mb-4">
            加载失败
          </h2>
          <p className="text-gray-400">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-slate-950">
        {/* Header */}
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-900/60 border-b border-white/10">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                SuperCrypto
              </h1>

              <div className="flex items-center gap-4">
                {/* Search Bar */}
                <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-white/10">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="搜索资产或交易..."
                    className="bg-transparent text-sm text-gray-300 placeholder-gray-500 outline-none w-64"
                  />
                </div>

                {/* Wallet Button */}
                <button className="px-4 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 transition-colors">
                  0x1234...5678
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-6 py-8">
          {/* Stats Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
            <StatCard
              title="总资产价值"
              value={stats.totalValue}
              change={stats.totalValueChange}
              format="currency"
              loading={loading}
            />
            <StatCard
              title="今日收益"
              value={stats.todayEarnings}
              change={stats.todayEarningsChange}
              format="currency"
              loading={loading}
            />
            <StatCard
              title="质押奖励"
              value={stats.stakingRewards}
              format="number"
              loading={loading}
            />
            <StatCard
              title="年化收益率"
              value={stats.apy}
              format="percentage"
              loading={loading}
            />
          </motion.div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Portfolio Card - 2 columns */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2"
            >
              <PortfolioCard
                assets={portfolio.assets}
                totalValue={portfolio.totalValue}
                loading={loading}
              />
            </motion.div>

            {/* Quick Actions & Recent Activity - 1 column */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-6"
            >
              <QuickActions
                claimableRewards={stats.claimableRewards}
                reinvestableAssets={portfolio.reinvestableAssets}
                loading={loading}
              />

              <RecentActivity
                activities={activities}
                loading={loading}
              />
            </motion.div>
          </div>
        </main>

        {/* Bottom Navigation - Mobile */}
        <nav className="fixed bottom-0 left-0 right-0 lg:hidden bg-slate-900/60 backdrop-blur-xl border-t border-white/10">
          <div className="grid grid-cols-4 gap-1">
            {[
              { name: '首页', icon: '🏠', active: true },
              { name: '资产', icon: '💎', active: false },
              { name: '质押', icon: '🔒', active: false },
              { name: '组合', icon: '📊', active: false }
            ].map((item) => (
              <button
                key={item.name}
                className={`flex flex-col items-center justify-center py-3 text-xs ${
                  item.active
                    ? 'text-indigo-400'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <span className="text-xl mb-1">{item.icon}</span>
                {item.name}
              </button>
            ))}
          </div>
        </nav>

        {/* Spacer for mobile navigation */}
        <div className="h-16 lg:hidden" />
      </div>
    </PageTransition>
  );
};