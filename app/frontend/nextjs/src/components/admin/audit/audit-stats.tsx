/**
 * AuditStats Component
 * 审计统计卡片组件 - 使用 StatCard 风格
 */
'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { StatCard } from '@/components/dashboard/stat-card';
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock,
  ArrowRightLeft,
} from 'lucide-react';
import type { AuditStats as AuditStatsType, TransactionStats } from '@/types/audit';

interface AuditStatsProps {
  stats?: AuditStatsType | null;
  transactionStats?: TransactionStats | null;
  loading?: boolean;
}

export const AuditStats: React.FC<AuditStatsProps> = ({
  stats,
  transactionStats,
  loading = false,
}) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-xl bg-white/5 animate-pulse"
          />
        ))}
      </div>
    );
  }

  // 计算成功率
  const successRate = stats && stats.total_operations > 0
    ? Math.round((stats.success_count / stats.total_operations) * 100)
    : 0;

  return (
    <div className="mb-6">
      {/* 统计卡片 - 带虚线分割 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
        {/* 总操作数 */}
        <div className="relative">
          <StatCard
            title={t('admin.audit.stats.totalOperations', '总操作数')}
            value={stats?.total_operations || 0}
            icon={Activity}
            variant="gold"
            delay={0}
          />
          {/* 右侧虚线分割 - lg 屏幕显示 */}
          <div className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 h-12 border-r border-dashed border-white/10" />
        </div>

        {/* 成功操作 */}
        <div className="relative">
          <StatCard
            title={t('admin.audit.stats.successCount', '成功操作')}
            value={stats?.success_count || 0}
            suffix={successRate > 0 ? ` ( ${successRate}% )` : ''}
            icon={CheckCircle}
            variant="cyan"
            delay={0.1}
          />
          {/* 右侧虚线分割 - lg 屏幕显示 */}
          <div className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 h-12 border-r border-dashed border-white/10" />
        </div>

        {/* 失败操作 */}
        <div className="relative">
          <StatCard
            title={t('admin.audit.stats.failedCount', '失败操作')}
            value={stats?.failed_count || 0}
            icon={XCircle}
            variant="gold"
            delay={0.2}
          />
          {/* 右侧虚线分割 - lg 屏幕显示 */}
          <div className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 h-12 border-r border-dashed border-white/10" />
        </div>

        {/* 链上交易 */}
        <div className="relative">
          {transactionStats ? (
            <StatCard
              title={t('admin.audit.stats.totalTransactions', '链上交易')}
              value={transactionStats.total_transactions || 0}
              icon={ArrowRightLeft}
              variant="cyan"
              delay={0.3}
            />
          ) : (
            <StatCard
              title={t('admin.audit.stats.pendingCount', '待处理')}
              value={stats?.pending_count || 0}
              icon={Clock}
              variant="cyan"
              delay={0.3}
            />
          )}
        </div>
      </div>
    </div>
  );
};
