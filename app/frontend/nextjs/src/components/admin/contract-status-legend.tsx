/**
 * Contract Status Legend Component
 * 合约状态图例组件 (纯 Provider 模式)
 *
 * 显示注册状态的图例说明
 */
'use client';

import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, AlertTriangle, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export function ContractStatusLegend() {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-4 mb-4">
      <span className="text-sm text-muted-foreground">
        {t('admin.contracts.status.legendTitle')}:
      </span>

      {/* 已同步 - success (绿色) */}
      <Badge
        variant="default"
        className={cn(
          'inline-flex items-center gap-1 font-medium',
          'bg-green-500/20 text-green-400 border-green-500/40'
        )}
      >
        <CheckCircle className="h-3 w-3" />
        {t('admin.contracts.status.synced')}
      </Badge>

      {/* 地址不匹配 - warning (黄色) */}
      <Badge
        variant="secondary"
        className={cn(
          'inline-flex items-center gap-1 font-medium',
          'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
        )}
      >
        <AlertCircle className="h-3 w-3" />
        {t('admin.contracts.status.mismatch')}
      </Badge>

      {/* 未注册 - orange (橙色) */}
      <Badge
        variant="outline"
        className={cn(
          'inline-flex items-center gap-1 font-medium',
          'bg-orange-500/20 text-orange-400 border-orange-500/40'
        )}
      >
        <AlertTriangle className="h-3 w-3" />
        {t('admin.contracts.status.notRegistered')}
      </Badge>

      {/* 未部署 - error (红色) */}
      <Badge
        variant="destructive"
        className={cn(
          'inline-flex items-center gap-1 font-medium',
          'bg-red-500/20 text-red-400 border-red-500/40'
        )}
      >
        <XCircle className="h-3 w-3" />
        {t('admin.contracts.status.notDeployed')}
      </Badge>
    </div>
  );
}

export default ContractStatusLegend;
