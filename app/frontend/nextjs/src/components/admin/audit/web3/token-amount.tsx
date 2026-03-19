/**
 * TokenAmount Component
 * Token 金额格式化显示组件
 */
'use client';

import React from 'react';
import { formatUnits } from 'viem';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TokenAmountProps {
  amount: string | bigint;
  decimals?: number;
  symbol?: string;
  showSymbol?: boolean;
  precision?: number;
  showFull?: boolean;
}

export const TokenAmount: React.FC<TokenAmountProps> = ({
  amount,
  decimals = 18,
  symbol = 'ETH',
  showSymbol = true,
  precision = 4,
  showFull = false,
}) => {
  // 格式化金额
  const formatAmount = (): string => {
    try {
      const bigAmount = typeof amount === 'string' ? BigInt(amount) : amount;
      const formatted = formatUnits(bigAmount, decimals);
      const num = parseFloat(formatted);
      
      if (showFull) {
        return formatted;
      }
      
      // 根据数值大小决定显示精度
      if (num === 0) {
        return '0';
      } else if (num < 0.0001) {
        return '< 0.0001';
      } else if (num < 1) {
        return num.toFixed(precision);
      } else if (num < 1000) {
        return num.toFixed(Math.min(precision, 2));
      } else if (num < 1000000) {
        return `${(num / 1000).toFixed(2)}K`;
      } else if (num < 1000000000) {
        return `${(num / 1000000).toFixed(2)}M`;
      } else {
        return `${(num / 1000000000).toFixed(2)}B`;
      }
    } catch {
      return '0';
    }
  };

  const getFullAmount = (): string => {
    try {
      const bigAmount = typeof amount === 'string' ? BigInt(amount) : amount;
      return formatUnits(bigAmount, decimals);
    } catch {
      return '0';
    }
  };

  const displayAmount = formatAmount();
  const fullAmount = getFullAmount();

  const content = (
    <span className="font-mono text-[13px] text-white/85">
      {displayAmount}
      {showSymbol && (
        <span className="ml-1 text-[12px] text-white/55">{symbol}</span>
      )}
    </span>
  );

  if (showFull) {
    return content;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent>
          <p className="font-mono text-xs">
            {fullAmount} {symbol}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
