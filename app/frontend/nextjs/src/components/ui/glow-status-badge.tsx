'use client';

import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';

const glowStatusBadgeVariants = cva(
  // Base styles
  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-medium text-xs transition-all duration-500',
  {
    variants: {
      variant: {
        // Green - success/synced
        success: [
          'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          'hover:bg-emerald-500/20 hover:border-emerald-500/50',
        ],
        // Blue - info/processing
        info: [
          'bg-blue-500/15 text-blue-400 border-blue-500/30',
          'hover:bg-blue-500/20 hover:border-blue-500/50',
        ],
        // Cyan - active/signing
        cyan: [
          'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
          'hover:bg-cyan-500/20 hover:border-cyan-500/50',
        ],
        // Yellow - warning/mismatch
        warning: [
          'bg-amber-500/15 text-amber-400 border-amber-500/30',
          'hover:bg-amber-500/20 hover:border-amber-500/50',
        ],
        // Orange - not registered
        orange: [
          'bg-orange-500/15 text-orange-400 border-orange-500/30',
          'hover:bg-orange-500/20 hover:border-orange-500/50',
        ],
        // Red - error/not deployed
        error: [
          'bg-rose-500/15 text-rose-400 border-rose-500/30',
          'hover:bg-rose-500/20 hover:border-rose-500/50',
        ],
        // Gray - default/cancelled
        default: [
          'bg-white/5 text-white/50 border-white/10',
          'hover:bg-white/10 hover:border-white/20',
        ],
        // Purple - optional/special
        purple: [
          'bg-purple-500/15 text-purple-400 border-purple-500/30',
          'hover:bg-purple-500/20 hover:border-purple-500/50',
        ],
      },
      size: {
        sm: 'text-[10px] px-1.5 py-0.5 gap-1',
        md: 'text-xs px-2.5 py-1 gap-1.5',
        lg: 'text-sm px-3 py-1.5 gap-2',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

// Glow animation styles
const glowAnimations: Record<string, string> = {
  success: 'shadow-[0_0_10px_rgba(16,185,129,0.4)]',
  info: 'shadow-[0_0_10px_rgba(59,130,246,0.4)]',
  cyan: 'shadow-[0_0_12px_rgba(6,182,212,0.5)]',
  warning: 'shadow-[0_0_10px_rgba(245,158,11,0.4)]',
  orange: 'shadow-[0_0_10px_rgba(249,115,22,0.4)]',
  error: 'shadow-[0_0_10px_rgba(239,68,68,0.4)]',
  default: '',
  purple: 'shadow-[0_0_10px_rgba(168,85,247,0.4)]',
};

export interface GlowStatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof glowStatusBadgeVariants> {
  icon?: React.ReactNode;
  pulse?: boolean;
  glow?: boolean;
}

/**
 * GlowStatusBadge - 发光状态徽章组件
 * 
 * 特性:
 * - 多种颜色变体 (success, info, cyan, warning, orange, error, default, purple)
 * - 脉冲动画效果 (pulse)
 * - 发光效果 (glow)
 * - 悬停增强效果
 * 
 * 使用示例:
 * <GlowStatusBadge variant="success" icon={<CheckIcon />} pulse>
 *   Synced
 * </GlowStatusBadge>
 */
function GlowStatusBadgeComponent({
  className,
  variant,
  size,
  icon,
  pulse = false,
  glow = false,
  children,
  ...props
}: GlowStatusBadgeProps) {
  const variantKey = variant || 'default';
  
  return (
    <span
      className={cn(
        glowStatusBadgeVariants({ variant, size }),
        // Slow pulse animation (4s cycle)
        pulse && 'animate-[pulse_4s_ease-in-out_infinite]',
        // Glow shadow effect
        glow && glowAnimations[variantKey],
        className
      )}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
}

// Export with display name for debugging
export const GlowStatusBadge = React.memo(GlowStatusBadgeComponent);
GlowStatusBadge.displayName = 'GlowStatusBadge';

// Preset configurations for common use cases
export const StatusBadgePresets = {
  // Contract registration statuses
  synced: { variant: 'success' as const, label: 'Synced' },
  mismatch: { variant: 'warning' as const, label: 'Mismatch' },
  notRegistered: { variant: 'orange' as const, label: 'Not Registered' },
  notDeployed: { variant: 'error' as const, label: 'Not Deployed' },
  
  // Redemption statuses
  pending: { variant: 'warning' as const, label: 'Pending' },
  signing: { variant: 'cyan' as const, label: 'Signing', pulse: true },
  executed: { variant: 'success' as const, label: 'Executed' },
  rejected: { variant: 'error' as const, label: 'Rejected' },
  cancelled: { variant: 'default' as const, label: 'Cancelled' },
  
  // Project readiness
  ready: { variant: 'success' as const, label: 'Ready' },
  partiallyReady: { variant: 'warning' as const, label: 'Partially Ready' },
  notReady: { variant: 'error' as const, label: 'Not Ready' },
  
  // Contract types
  registry: { variant: 'purple' as const, label: 'Registry' },
  kyc: { variant: 'info' as const, label: 'KYC' },
  governance: { variant: 'info' as const, label: 'Governance' },
  stablecoin: { variant: 'success' as const, label: 'Stablecoin' },
  token: { variant: 'warning' as const, label: 'Token' },
  defi: { variant: 'orange' as const, label: 'DeFi' },
};

export default GlowStatusBadge;
