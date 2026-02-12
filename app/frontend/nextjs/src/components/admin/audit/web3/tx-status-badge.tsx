/**
 * TxStatusBadge Component
 * 交易状态徽章组件
 */
'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  Clock,
  Loader2,
  Ban,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TransactionAuditStatus } from '@/types/audit';
import { cn } from '@/lib/utils';

interface TxStatusBadgeProps {
  status: TransactionAuditStatus;
}

// 状态配置
const STATUS_CONFIG: Record<TransactionAuditStatus, {
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
  labelKey: string;
}> = {
  pending: {
    variant: 'secondary',
    className: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
    icon: Loader2,
    iconClassName: 'animate-spin',
    labelKey: 'admin.audit.txStatus.pending',
  },
  confirmed: {
    variant: 'secondary',
    className: 'bg-green-500/20 text-green-400 border-green-500/40',
    icon: CheckCircle,
    labelKey: 'admin.audit.txStatus.confirmed',
  },
  failed: {
    variant: 'destructive',
    className: 'bg-red-500/20 text-red-400 border-red-500/40',
    icon: XCircle,
    labelKey: 'admin.audit.txStatus.failed',
  },
  reverted: {
    variant: 'secondary',
    className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
    icon: XCircle,
    labelKey: 'admin.audit.txStatus.reverted',
  },
  dropped: {
    variant: 'outline',
    className: 'bg-gray-500/20 text-gray-400 border-gray-500/40',
    icon: Ban,
    labelKey: 'admin.audit.txStatus.dropped',
  },
};

export const TxStatusBadge: React.FC<TxStatusBadgeProps> = ({ status }) => {
  const { t } = useTranslation();
  
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={cn('inline-flex items-center gap-1', config.className)}
    >
      <Icon className={cn('h-3 w-3', config.iconClassName)} />
      {t(config.labelKey, status)}
    </Badge>
  );
};
