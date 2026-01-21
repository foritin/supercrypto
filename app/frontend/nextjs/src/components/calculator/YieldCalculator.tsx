'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Trophy, DollarSign, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * ════════════════════════════════════════════════════════════════
 * YIELD CALCULATOR - 收益计算器
 * 用途: 交互式 APY 计算，实时显示预期收益
 * 使用: <YieldCalculator />
 * ════════════════════════════════════════════════════════════════
 */

interface YieldCalculatorProps {
  className?: string;
  style?: React.CSSProperties;
}

export const YieldCalculator: React.FC<YieldCalculatorProps> = ({
  className = '',
  style,
}) => {
  const [principal, setPrincipal] = useState(10000);
  const [apy, setApy] = useState(15);
  const [duration, setDuration] = useState(365);

  // 计算收益
  const calculateYield = useMemo(() => {
    const decimalAPY = apy / 100;
    const dailyRate = decimalAPY / 365;
    const futureValue = principal * Math.pow(1 + dailyRate, duration);
    const profit = futureValue - principal;

    return {
      futureValue,
      profit,
      roi: ((profit / principal) * 100).toFixed(2),
    };
  }, [principal, apy, duration]);

  return (
    <Card
      className={cn(
        'bg-gradient-to-br from-[rgba(26,26,46,0.8)] to-[rgba(38,38,66,0.8)]',
        'backdrop-blur-[20px] border border-[rgba(0,212,170,0.3)]',
        'rounded-2xl shadow-[0_8px_32px_rgba(0,212,170,0.2)]',
        className
      )}
      style={style}
    >
      <CardContent className="p-6">
        {/* 标题区域 */}
        <div className="text-center mb-10 pb-5 border-b border-white/10">
          <div className="inline-flex items-center justify-center w-[60px] h-[60px] rounded-full bg-gradient-to-br from-[#00D4AA] to-[#00A08C] shadow-[0_4px_16px_rgba(0,212,170,0.4)] mb-4">
            <Trophy className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-[#00D4AA] mb-2 text-2xl font-bold">
            Yield Calculator
          </h3>
          <p className="text-white/60 text-sm">
            Calculate your potential earnings with precision
          </p>
        </div>

        {/* Investment Amount */}
        <div className="mb-7">
          <div className="flex items-center mb-3">
            <DollarSign className="w-4 h-4 text-[#FFD700] mr-2" />
            <span className="text-white/90 text-[15px] font-semibold">
              Investment Amount
            </span>
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 text-xl font-semibold">
              $
            </span>
            <Input
              type="number"
              value={principal}
              onChange={(e) => setPrincipal(Number(e.target.value))}
              className={cn(
                'bg-white/[0.08] border border-white/15 text-white',
                'text-xl h-14 rounded-xl font-semibold pl-8',
                'focus-visible:ring-[#00D4AA] focus-visible:border-[#00D4AA]/80'
              )}
              min={0}
              step={100}
            />
          </div>
        </div>

        {/* APY Slider */}
        <div className="mb-7">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <TrendingUp className="w-4 h-4 text-[#FFD700] mr-2" />
              <span className="text-white/90 text-[15px] font-semibold">
                Expected APY
              </span>
            </div>
            <span className="text-[#FFD700] text-xl font-bold bg-[rgba(255,215,0,0.15)] px-4 py-1 rounded-[20px]">
              {apy}%
            </span>
          </div>
          <Slider
            min={1}
            max={50}
            step={1}
            value={[apy]}
            onValueChange={(values) => setApy(values[0])}
            variant="gold"
            className="py-2"
          />
        </div>

        {/* Duration Slider */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <span className="text-white/90 text-[15px] font-semibold">
              Duration (Days)
            </span>
            <span className="text-[#00D4AA] text-xl font-bold bg-[rgba(0,212,170,0.15)] px-4 py-1 rounded-[20px]">
              {duration} days
            </span>
          </div>
          <Slider
            min={30}
            max={365}
            step={1}
            value={[duration]}
            onValueChange={(values) => setDuration(values[0])}
            variant="primary"
            className="py-2"
          />
          {/* Duration marks */}
          <div className="flex justify-between mt-2 px-1">
            {[30, 90, 180, 365].map((mark) => (
              <span key={mark} className="text-white/50 text-xs">
                {mark}
              </span>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="bg-gradient-to-br from-[rgba(0,212,170,0.15)] to-[rgba(0,160,140,0.15)] rounded-2xl p-7 border border-[rgba(0,212,170,0.3)] relative overflow-hidden">
          {/* 背景装饰 */}
          <div className="absolute -top-[50px] -right-[50px] w-[150px] h-[150px] bg-[radial-gradient(circle,rgba(0,212,170,0.2)_0%,transparent_70%)] rounded-full" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="text-center">
              <span className="text-white/70 text-[13px] block mb-2 uppercase tracking-wider">
                Total Value
              </span>
              <div className="text-[32px] font-bold text-[#00D4AA] drop-shadow-[0_2px_8px_rgba(0,212,170,0.3)]">
                ${calculateYield.futureValue.toFixed(2)}
              </div>
            </div>
            <div className="text-center">
              <span className="text-white/70 text-[13px] block mb-2 uppercase tracking-wider">
                Profit
              </span>
              <div className="text-[32px] font-bold text-[#FFD700] drop-shadow-[0_2px_8px_rgba(255,215,0,0.3)]">
                ${calculateYield.profit.toFixed(2)}
              </div>
            </div>
            <div className="col-span-1 sm:col-span-2 text-center pt-5 border-t border-white/10 relative z-10">
              <span className="text-white/70 text-sm">
                Return on Investment (ROI):{' '}
                <span className="text-[#FFD700] text-[22px] font-bold drop-shadow-[0_2px_8px_rgba(255,215,0,0.3)]">
                  {calculateYield.roi}%
                </span>
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
