'use client';

import { motion } from 'framer-motion';
import { ExternalLink, Info, Download, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn, truncateAddress } from '@/lib/utils';

export interface Transaction {
  id: string;
  type: 'subscribe' | 'redeem' | 'claim' | string;
  date: string;
  amount: string;
  status: 'confirmed' | 'pending' | 'failed' | string;
  txHash: string;
}

interface TransactionsTableProps {
  transactions: Transaction[];
  isMock?: boolean;
  onExport?: () => void;
}

const statusColors: Record<string, string> = {
  confirmed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  failed: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

export function TransactionsTable({ 
  transactions, 
  isMock = false,
  onExport 
}: TransactionsTableProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center">
            <Info className="w-3 h-3 text-gray-400" />
          </div>
          <h2 className="text-lg font-bold text-white">{t('portfolio.table.recentTransactions')}</h2>
        </div>
        <div className="flex gap-2">
          {isMock && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-medium border border-amber-500/20">
              <Info className="w-3.5 h-3.5" /> {t('portfolio.dev.mockData')}
            </span>
          )}
          <button 
            onClick={onExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 text-xs font-medium border border-white/10 hover:bg-white/10 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> {t('common.export')}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
              <th className="px-6 py-4 text-[10px] font-medium text-gray-500 uppercase tracking-wider">{t('portfolio.table.assetType')}</th>
              <th className="px-6 py-4 text-[10px] font-medium text-gray-500 uppercase tracking-wider">{t('common.date')}</th>
              <th className="px-6 py-4 text-[10px] font-medium text-gray-500 uppercase tracking-wider">{t('common.amount')}</th>
              <th className="px-6 py-4 text-[10px] font-medium text-gray-500 uppercase tracking-wider">{t('common.status')}</th>
              <th className="px-6 py-4 text-[10px] font-medium text-gray-500 uppercase tracking-wider">{t('portfolio.table.txId')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {transactions.map((tx, idx) => (
              <motion.tr 
                key={tx.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="hover:bg-white/[0.02] transition-colors group"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white capitalize">{tx.type}</p>
                      <p className="text-[10px] text-gray-500">{tx.date}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-400">{tx.date}</td>
                <td className="px-6 py-4 text-sm font-bold text-white">{tx.amount}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2 py-1 rounded-full text-[10px] font-medium border",
                    statusColors[tx.status] || statusColors.confirmed
                  )}>
                    {tx.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <a 
                    href={`https://etherscan.io/tx/${tx.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs font-mono text-gray-500 group-hover:text-gray-300 transition-colors"
                  >
                    {truncateAddress(tx.txHash)}
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
