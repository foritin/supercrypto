'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTransactionStore, type Transaction, type TransactionStatus } from '@/stores/transaction-store';
import { 
  ExternalLink, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface TransactionHistoryProps {
  limit?: number;
  showFilters?: boolean;
}

const statusConfig: Record<TransactionStatus, { icon: React.ReactNode; color: string; label: string }> = {
  pending: {
    icon: <Clock className="h-4 w-4" />,
    color: 'text-amber-400',
    label: 'Pending',
  },
  confirming: {
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    color: 'text-blue-400',
    label: 'Confirming',
  },
  success: {
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'text-[#00D4AA]',
    label: 'Success',
  },
  failed: {
    icon: <XCircle className="h-4 w-4" />,
    color: 'text-red-400',
    label: 'Failed',
  },
  cancelled: {
    icon: <XCircle className="h-4 w-4" />,
    color: 'text-white/40',
    label: 'Cancelled',
  },
};

const typeLabels: Record<string, string> = {
  deposit: 'Deposit',
  withdraw: 'Withdraw',
  claim: 'Claim Rewards',
  stake: 'Stake',
  unstake: 'Unstake',
  approve: 'Approve',
  transfer: 'Transfer',
  'contract-interaction': 'Contract Call',
};

function TransactionItem({ tx }: { tx: Transaction }) {
  const { t } = useTranslation();
  const status = statusConfig[tx.status];
  
  return (
    <div className="p-4 rounded-lg bg-white/5 border border-white/10 hover:border-[#00D4AA]/30 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-white">
              {typeLabels[tx.type] || tx.type}
            </span>
            <span className={`flex items-center gap-1 text-xs ${status.color}`}>
              {status.icon}
              {status.label}
            </span>
          </div>
          
          <p className="text-sm text-white/60 truncate mb-2">
            {tx.description}
          </p>
          
          <div className="flex items-center gap-4 text-xs text-white/40">
            <span>{formatDistanceToNow(tx.createdAt, { addSuffix: true })}</span>
            {tx.tokenAmount && (
              <span className="text-[#00D4AA]">
                {tx.tokenAmount} {tx.tokenSymbol}
              </span>
            )}
          </div>
        </div>
        
        <a
          href={`https://etherscan.io/tx/${tx.hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-[#00D4AA] transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

export function TransactionHistory({ limit = 10, showFilters = true }: TransactionHistoryProps) {
  const { t } = useTranslation();
  const { 
    transactions, 
    pendingHashes, 
    getRecentTransactions,
    clearCompleted,
  } = useTransactionStore();
  
  const [filter, setFilter] = React.useState<TransactionStatus | 'all'>('all');
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const allTransactions = React.useMemo(() => {
    return getRecentTransactions(limit);
  }, [getRecentTransactions, limit, transactions]);

  const filteredTransactions = React.useMemo(() => {
    if (filter === 'all') return allTransactions;
    return allTransactions.filter((tx) => tx.status === filter);
  }, [allTransactions, filter]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // In production, this would refetch transaction statuses
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const pendingCount = pendingHashes.length;

  if (allTransactions.length === 0) {
    return (
      <Card className="p-8 glass border-[#00D4AA]/20 text-center">
        <Clock className="h-12 w-12 text-white/20 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">
          {t('history.noTransactions', 'No Transactions Yet')}
        </h3>
        <p className="text-white/60">
          {t('history.startInvesting', 'Start investing to see your transaction history here')}
        </p>
      </Card>
    );
  }

  return (
    <Card className="glass border-[#00D4AA]/20">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white">
              {t('history.title', 'Transaction History')}
            </h3>
            {pendingCount > 0 && (
              <p className="text-sm text-amber-400 mt-1">
                {pendingCount} pending transaction{pendingCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {showFilters && (
              <div className="relative">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as TransactionStatus | 'all')}
                  className="appearance-none bg-white/5 border border-white/10 rounded-lg px-4 py-2 pr-10 text-sm text-white focus:outline-none focus:border-[#00D4AA]/50"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="confirming">Confirming</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
              </div>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-white/60 hover:text-white"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <div className="p-6">
        <div className="space-y-3">
          {filteredTransactions.map((tx) => (
            <TransactionItem key={tx.hash} tx={tx} />
          ))}
        </div>

        {filteredTransactions.length === 0 && filter !== 'all' && (
          <div className="text-center py-8">
            <Filter className="h-8 w-8 text-white/20 mx-auto mb-2" />
            <p className="text-white/40">
              {t('history.noFiltered', 'No transactions with selected filter')}
            </p>
          </div>
        )}

        {/* Clear completed button */}
        {allTransactions.some((tx) => tx.status === 'success' || tx.status === 'failed') && (
          <div className="mt-6 pt-6 border-t border-white/10 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCompleted}
              className="text-white/40 hover:text-white"
            >
              {t('history.clearCompleted', 'Clear Completed Transactions')}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
