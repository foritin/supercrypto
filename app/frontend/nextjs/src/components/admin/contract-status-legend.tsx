/**
 * Contract Status Legend Component - Glow Edition
 * 合约状态图例组件 (发光效果版)
 *
 * 显示注册状态的图例说明
 */
'use client';

import { CheckCircle, AlertCircle, AlertTriangle, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { GlowStatusBadge } from '@/components/ui/glow-status-badge';

interface ContractStatusLegendProps {
  hasNotRegistered?: boolean;
}

export function ContractStatusLegend({ hasNotRegistered = false }: ContractStatusLegendProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-4 mb-4 flex-wrap">
      <span className="text-sm text-muted-foreground">
        {t('admin.contracts.status.legendTitle')}:
      </span>

      {/* 已同步 - success (绿色) */}
      <GlowStatusBadge
        variant="success"
        icon={<CheckCircle className="h-3 w-3" />}
        glow
      >
        {t('admin.contracts.status.synced')}
      </GlowStatusBadge>

      {/* 地址不匹配 - warning (黄色) */}
      <GlowStatusBadge
        variant="warning"
        icon={<AlertCircle className="h-3 w-3" />}
      >
        {t('admin.contracts.status.mismatch')}
      </GlowStatusBadge>

      {/* 未注册 - orange (橙色) */}
      <GlowStatusBadge
        variant="orange"
        icon={<AlertTriangle className="h-3 w-3" />}
        pulse={hasNotRegistered}
        glow
      >
        {t('admin.contracts.status.notRegistered')}
      </GlowStatusBadge>

      {/* 未部署 - error (红色) */}
      <GlowStatusBadge
        variant="error"
        icon={<XCircle className="h-3 w-3" />}
      >
        {t('admin.contracts.status.notDeployed')}
      </GlowStatusBadge>
    </div>
  );
}

export default ContractStatusLegend;
