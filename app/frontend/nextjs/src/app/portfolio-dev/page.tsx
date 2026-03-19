'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { NeonBackground, NeonStatCard, PortfolioChartV2, InvestmentCardV2, TransactionItemV2 } from '@/components/portfolio-dev';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, LayoutGrid, Table as TableIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock data for preview
const mockStats = {
  totalInvested: 1000.00,
  currentValue: 1000.00,
  totalEarnings: 0.00,
  activeInvestments: 1,
};

const mockInvestments = [
  {
    id: '1',
    name: 'Vanke City Garden Phase 1',
    symbol: 'VK001',
    invested: 1000,
    expectedReturn: 15,
    totalAtMaturity: 1015,
    progress: 35,
    daysLeft: 88,
    status: 'active' as const,
    apy: 6,
  },
  {
    id: '2',
    name: 'Vanke City Garden Phase 1',
    symbol: 'VK001',
    invested: 600,
    expectedReturn: 0.068,
    totalAtMaturity: 600.068,
    progress: 0,
    daysLeft: 0,
    status: 'completed' as const,
    apy: 3.6,
  },
];

const mockTransactions = [
  {
    id: '1',
    type: 'redeem' as const,
    amount: 600,
    status: 'confirmed' as const,
    date: '2026/3/18',
    hash: '0x86...7e2c',
  },
  {
    id: '2',
    type: 'subscribe' as const,
    amount: 1000,
    status: 'confirmed' as const,
    date: '2026/3/18',
    hash: '0xc585...7e2c',
  },
  {
    id: '3',
    type: 'subscribe' as const,
    amount: 600,
    status: 'pending' as const,
    date: '2026/3/18',
    hash: '0xad9b...6a12',
  },
];

export default function PortfolioDevPage() {
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#0a0b0e] relative">
      {/* Neon Background */}
      <NeonBackground />

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8"
        >
          <p className="text-[#00f5d4] text-xs font-medium uppercase tracking-widest mb-2">Portfolio</p>
          <h1 className="text-3xl font-bold text-white mb-2">Investment Portfolio</h1>
          <p className="text-gray-500">Track your RWA investments and monitor performance</p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <NeonStatCard
            label="Total Invested"
            value={mockStats.totalInvested}
            prefix="$"
            delay={0}
          />
          <NeonStatCard
            label="Current Value"
            value={mockStats.currentValue}
            prefix="$"
            change="0%"
            isPositive={true}
            delay={1}
          />
          <NeonStatCard
            label="Total Earnings"
            value={mockStats.totalEarnings}
            prefix="$"
            delay={2}
          />
          <NeonStatCard
            label="Active Investments"
            value={mockStats.activeInvestments}
            suffix=" assets"
            delay={3}
          />
        </div>

        {/* Portfolio Chart */}
        <div className="mb-8">
          <PortfolioChartV2 />
        </div>

        {/* My Investments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card className="bg-white/[0.02] border-white/[0.06] backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-lg bg-gradient-to-br from-[#00f5d4]/20 to-[#a855f7]/20 flex items-center justify-center">
                  <LayoutGrid className="w-3 h-3 text-[#00f5d4]" />
                </span>
                My Investments
              </CardTitle>
              <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('cards')}
                  className={cn(
                    'h-7 px-2 text-xs',
                    viewMode === 'cards' 
                      ? 'bg-white/10 text-white' 
                      : 'text-gray-500 hover:text-white'
                  )}
                >
                  <LayoutGrid className="w-3.5 h-3.5 mr-1" />
                  Cards
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className={cn(
                    'h-7 px-2 text-xs',
                    viewMode === 'table' 
                      ? 'bg-white/10 text-white' 
                      : 'text-gray-500 hover:text-white'
                  )}
                >
                  <TableIcon className="w-3.5 h-3.5 mr-1" />
                  Table
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {viewMode === 'cards' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {mockInvestments.map((investment, index) => (
                    <InvestmentCardV2
                      key={investment.id}
                      asset={investment}
                      delay={index}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Table view placeholder
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8"
        >
          <Card className="bg-white/[0.02] border-white/[0.06] backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-lg bg-gradient-to-br from-[#00f5d4]/20 to-[#a855f7]/20 flex items-center justify-center">
                  <Download className="w-3 h-3 text-[#00f5d4]" />
                </span>
                Recent Transactions
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-gray-500 hover:text-white">
                <Download className="w-3.5 h-3.5 mr-1" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-white/[0.04]">
                {mockTransactions.map((transaction, index) => (
                  <TransactionItemV2
                    key={transaction.id}
                    transaction={transaction}
                    delay={index}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
