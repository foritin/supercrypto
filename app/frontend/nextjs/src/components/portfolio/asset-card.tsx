'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Clock, TrendingUp, ArrowUpRight, ChevronRight } from 'lucide-react';

export interface AssetCardProps {
  id: string;
  name: string;
  symbol: string;
  amount: number;
  apy: number;
  lockPeriod: number;
  daysRemaining: number;
  status: 'active' | 'matured' | 'redeemed';
  isMatured: boolean;
  expectedInterest: number;
  totalReturn: number;
  startDate?: string;
  endDate?: string;
  tokenType: string;
  onViewDetail?: (id: string) => void;
  onRedeem?: (id: string) => void;
  className?: string;
}

export function AssetCard({
  id,
  name,
  symbol,
  amount,
  apy,
  lockPeriod,
  daysRemaining,
  status,
  isMatured,
  expectedInterest,
  totalReturn,
  endDate,
  onViewDetail,
  onRedeem,
  className,
}: AssetCardProps) {
  const progressPercent = Math.max(0, 100 - (daysRemaining / (lockPeriod * 30)) * 100);
  
  const statusConfig = {
    active: {
      label: 'Active',
      badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      gradient: 'from-blue-500/10 to-transparent',
    },
    matured: {
      label: 'Matured',
      badgeClass: 'bg-green-500/20 text-green-400 border-green-500/30',
      gradient: 'from-green-500/10 to-transparent',
    },
    redeemed: {
      label: 'Redeemed',
      badgeClass: 'bg-white/10 text-white/50 border-white/20',
      gradient: 'from-white/5 to-transparent',
    },
  };

  const config = statusConfig[status];

  return (
    <Card className={cn(
      'glass border overflow-hidden group transition-all duration-300 hover:border-primary/30',
      className
    )}>
      {/* Status indicator line */}
      <div className={cn(
        'h-1 w-full bg-gradient-to-r',
        status === 'active' && 'from-blue-500 to-blue-500/50',
        status === 'matured' && 'from-primary to-primary/50',
        status === 'redeemed' && 'from-white/30 to-white/10',
      )} />
      
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
              <span className="text-primary font-bold text-sm">{symbol.slice(0, 2)}</span>
            </div>
            <div>
              <h3 className="font-semibold text-white text-lg leading-tight">{name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-white/50 text-sm">{symbol}</span>
                <Badge variant="outline" className={cn('text-xs', config.badgeClass)}>
                  {config.label}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="flex items-center gap-1 text-primary">
              <TrendingUp className="h-4 w-4" />
              <span className="font-bold text-lg">{apy}%</span>
            </div>
            <span className="text-white/40 text-xs">APY</span>
          </div>
        </div>

        {/* Amount and Return */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-3 rounded-lg bg-white/5 border border-white/5">
            <p className="text-white/50 text-xs mb-1">Invested</p>
            <p className="text-white font-semibold text-lg">${amount.toLocaleString()}</p>
          </div>
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-white/50 text-xs mb-1">Expected Return</p>
            <p className="text-primary font-semibold text-lg">+${expectedInterest.toLocaleString()}</p>
          </div>
        </div>

        {/* Lock Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <div className="flex items-center gap-1 text-white/60">
              <Clock className="h-3.5 w-3.5" />
              <span>{lockPeriod} months lock</span>
            </div>
            <span className={cn(
              'font-medium',
              isMatured ? 'text-green-400' : 'text-white/60'
            )}>
              {daysRemaining > 0 
                ? `${daysRemaining} days left` 
                : 'Matured'}
            </span>
          </div>
          <Progress value={progressPercent} className="h-1.5" />
          {endDate && (
            <p className="text-white/30 text-xs mt-1 text-right">Matures: {endDate}</p>
          )}
        </div>

        {/* Total Value */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <div>
            <p className="text-white/50 text-xs mb-0.5">Total Value</p>
            <div className="flex items-baseline gap-1">
              <span className="text-white font-bold text-xl">${totalReturn.toLocaleString()}</span>
              {isMatured && (
                <ArrowUpRight className="h-4 w-4 text-green-400" />
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewDetail?.(id)}
              className="text-white/60 hover:text-primary hover:bg-primary/10"
            >
              Details
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
            {isMatured && status !== 'redeemed' && (
              <Button
                size="sm"
                onClick={() => onRedeem?.(id)}
                className="bg-primary hover:bg-primary-dark text-bg-dark"
              >
                Redeem
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

// Compact version for grid layouts
export function AssetCardCompact({
  name,
  symbol,
  amount,
  apy,
  status,
  onViewDetail,
  className,
}: Omit<AssetCardProps, 'lockPeriod' | 'daysRemaining' | 'isMatured' | 'expectedInterest' | 'totalReturn' | 'id' | 'startDate' | 'endDate' | 'tokenType' | 'onRedeem'> & { onViewDetail?: () => void }) {
  return (
    <Card 
      className={cn(
        'glass border p-4 cursor-pointer transition-all duration-300',
        'hover:border-primary/30 hover:bg-white/5',
        className
      )}
      onClick={onViewDetail}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 shrink-0">
          <span className="text-primary font-bold text-xs">{symbol.slice(0, 2)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-white truncate">{name}</h4>
          <div className="flex items-center gap-2">
            <span className="text-white/40 text-xs">{symbol}</span>
            <Badge variant="outline" className="text-[10px] bg-primary/20 text-primary border-primary/30 px-1.5 py-0">
              {apy}% APY
            </Badge>
          </div>
        </div>
        <div className="text-right">
          <p className="text-white font-medium">${amount.toLocaleString()}</p>
          <p className={cn(
            'text-xs',
            status === 'active' && 'text-blue-400',
            status === 'matured' && 'text-green-400',
            status === 'redeemed' && 'text-white/40',
          )}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </p>
        </div>
      </div>
    </Card>
  );
}
