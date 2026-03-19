'use client';

import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Ban,
  ShieldCheck,
  Loader2
} from 'lucide-react';

import { cn } from '@/lib/utils';

export type RedemptionStatus = 'pending' | 'signing' | 'executed' | 'rejected' | 'cancelled';

interface RedemptionStatusBadgeProps {
  status: RedemptionStatus;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

/**
 * 投资组合赎回状态徽章
 * 简洁版状态指示器，用于投资卡片
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
    color: string;
    bgColor: string;
  }> = {
    pending: {
      icon: <Clock className="w-3 h-3" />,
      label: 'Pending',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
    signing: {
      icon: <ShieldCheck className="w-3 h-3" />,
      label: 'Signing',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    executed: {
      icon: <CheckCircle2 className="w-3 h-3" />,
      label: 'Completed',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    rejected: {
      icon: <XCircle className="w-3 h-3" />,
      label: 'Rejected',
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
    },
    cancelled: {
      icon: <Ban className="w-3 h-3" />,
      label: 'Cancelled',
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/10',
    },
  };

  const { icon, label, color, bgColor } = config[status] || config.pending;

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2 py-0.5 gap-1.5',
    lg: 'text-sm px-2.5 py-1 gap-2',
  };

  return (
    <span
      role="status"
      className={cn(
        'inline-flex items-center rounded-full font-medium transition-all',
        color,
        bgColor,
        sizeClasses[size],
        pulse && status === 'signing' && 'animate-pulse'
      )}
    >
      {icon}
      {showLabel && label}
    </span>
  );
}

/**
 * 简洁的赎回中指示器（用于投资卡片角落）
 */
export function RedeemingIndicator() {
  return (
    <div className="flex items-center gap-1.5 text-xs text-amber-400">
      <Loader2 className="w-3 h-3 animate-spin" />
      <span>Redeeming...</span>
    </div>
  );
}
