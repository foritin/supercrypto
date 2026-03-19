'use client';

import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  ShieldCheck,
  Ban
} from 'lucide-react';

import { GlowStatusBadge } from '@/components/ui/glow-status-badge';
import type { RedemptionStatus } from '@/types/treasury';

interface RedemptionStatusBadgeProps {
  status: RedemptionStatus;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

/**
 * 赎回状态徽章组件 - 发光效果版
 * 显示赎回请求的状态指示器
 */
export function RedemptionStatusBadge({
  status,
  showLabel = true,
  size = 'md',
  pulse = false,
}: RedemptionStatusBadgeProps) {
  const config: Record<RedemptionStatus, {
    icon: React.ReactNode;
    label: string;
    variant: 'warning' | 'cyan' | 'success' | 'error' | 'default';
    defaultPulse: boolean;
  }> = {
    pending: {
      icon: <Clock className="w-3.5 h-3.5" />,
      label: 'Pending',
      variant: 'warning',
      defaultPulse: false,
    },
    signing: {
      icon: <ShieldCheck className="w-3.5 h-3.5" />,
      label: 'Signing',
      variant: 'cyan',
      defaultPulse: true, // signing 状态默认脉冲
    },
    executed: {
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      label: 'Executed',
      variant: 'success',
      defaultPulse: false,
    },
    rejected: {
      icon: <XCircle className="w-3.5 h-3.5" />,
      label: 'Rejected',
      variant: 'error',
      defaultPulse: false,
    },
    cancelled: {
      icon: <Ban className="w-3.5 h-3.5" />,
      label: 'Cancelled',
      variant: 'default',
      defaultPulse: false,
    },
  };

  const { icon, label, variant, defaultPulse } = config[status] || config.pending;
  const shouldPulse = pulse || defaultPulse;

  return (
    <GlowStatusBadge
      variant={variant}
      size={size}
      icon={icon}
      pulse={shouldPulse}
      glow={shouldPulse} // 脉冲时同时发光
    >
      {showLabel && label}
    </GlowStatusBadge>
  );
}

/**
 * 加载中状态徽章
 */
export function RedemptionLoadingBadge({
  size = 'md',
}: {
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <GlowStatusBadge
      variant="default"
      size={size}
      icon={<Loader2 className="w-3.5 h-3.5 animate-spin" />}
    >
      Loading...
    </GlowStatusBadge>
  );
}
