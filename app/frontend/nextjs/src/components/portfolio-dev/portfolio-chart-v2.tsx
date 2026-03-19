'use client';

import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import * as React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';
import { EmptyStateLottie } from './empty-state-lottie';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export type TimeRange = '7d' | '30d' | '90d' | '1y' | 'all';

export interface PortfolioDataPoint {
  date: string;
  timestamp: number;
  totalValue: number;
  invested: number;
  earnings: number;
}

interface PortfolioChartV2Props {
  data?: PortfolioDataPoint[];
  timeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
  className?: string;
}

const timeRanges: { value: TimeRange; label: string }[] = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: '1y', label: '1Y' },
  { value: 'all', label: 'ALL' },
];

function CustomTooltip({ 
  active, 
  payload, 
  label 
}: { 
  active?: boolean; 
  payload?: Array<{ color?: string; name?: string; value?: number }>; 
  label?: string 
}) {
  if (!active || !payload || payload.length === 0) return null;
  
  const totalValue = payload.find(p => p.name === 'totalValue')?.value ?? 0;
  const invested = payload.find(p => p.name === 'invested')?.value ?? 0;
  const earnings = totalValue - invested;
  const returnRate = invested > 0 ? ((earnings / invested) * 100).toFixed(2) : '0.00';
  
  return (
    <div className="bg-[#0a0b0e]/95 border border-[#00f5d4]/20 rounded-xl p-4 shadow-2xl backdrop-blur-md min-w-[180px]">
      <p className="text-gray-500 text-xs mb-3">{label}</p>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-xs">Value</span>
          <span className="text-white font-bold text-sm">${totalValue.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-xs">Invested</span>
          <span className="text-white text-xs">${invested.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-white/10">
          <span className="text-[#00f5d4] text-xs">Return</span>
          <span className="text-[#00f5d4] font-bold text-sm">+{returnRate}%</span>
        </div>
      </div>
    </div>
  );
}

export function PortfolioChartV2({
  data: propData,
  timeRange: propTimeRange,
  onTimeRangeChange,
  className,
}: PortfolioChartV2Props) {
  const [internalTimeRange, setInternalTimeRange] = React.useState<TimeRange>('30d');
  const timeRange = propTimeRange || internalTimeRange;
  const rawData = propData || [];

  const filteredData = React.useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const daysMap: Record<TimeRange, number> = {
      '7d': 7, '30d': 30, '90d': 90, '1y': 365, 'all': Infinity,
    };
    const cutoff = daysMap[timeRange] === Infinity ? 0 : now - daysMap[timeRange] * dayMs;
    return rawData.filter((d) => d.timestamp >= cutoff);
  }, [rawData, timeRange]);

  const handleTimeRangeChange = (range: TimeRange) => {
    if (onTimeRangeChange) onTimeRangeChange(range);
    else setInternalTimeRange(range);
  };

  // 空状态
  if (filteredData.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          'relative bg-white/[0.02] rounded-2xl border border-white/[0.06] p-6 overflow-hidden',
          className
        )}
      >
        {/* Subtle gradient border glow */}
        <div className="absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(0,245,212,0.05) 0%, transparent 50%, rgba(168,85,247,0.05) 100%)',
          }}
        />
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00f5d4]/20 to-[#a855f7]/20 flex items-center justify-center border border-white/10">
              <TrendingUp className="w-5 h-5 text-[#00f5d4]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Portfolio Performance</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-white">$0.00</span>
                <span className="text-xs text-gray-500">No data available</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
            {timeRanges.map((range) => (
              <button
                key={range.value}
                onClick={() => handleTimeRangeChange(range.value)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200',
                  timeRange === range.value
                    ? 'bg-gradient-to-r from-[#00f5d4]/20 to-[#a855f7]/20 text-white border border-[#00f5d4]/30'
                    : 'text-gray-500 hover:text-white'
                )}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {/* Empty State with Animation */}
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <EmptyStateLottie />
          <p className="text-gray-400 text-sm mb-2 mt-4">No portfolio data yet</p>
          <p className="text-gray-600 text-xs mb-6">Start investing to see your performance chart</p>
          <Link href="/assets">
            <Button 
              className="bg-gradient-to-r from-[#00f5d4] to-[#00c4a6] text-black font-medium hover:opacity-90 transition-opacity"
            >
              Explore Assets
            </Button>
          </Link>
        </div>
      </motion.div>
    );
  }

  // 有数据状态
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'bg-white/[0.02] rounded-2xl border border-white/[0.06] p-6',
        className
      )}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00f5d4]/20 to-[#a855f7]/20 flex items-center justify-center border border-white/10">
            <TrendingUp className="w-5 h-5 text-[#00f5d4]" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Portfolio Performance</h3>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
          {timeRanges.map((range) => (
            <button
              key={range.value}
              onClick={() => handleTimeRangeChange(range.value)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200',
                timeRange === range.value
                  ? 'bg-gradient-to-r from-[#00f5d4]/20 to-[#a855f7]/20 text-white border border-[#00f5d4]/30'
                  : 'text-gray-500 hover:text-white'
              )}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTotalV2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00f5d4" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#00f5d4" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#6b7280', fontSize: 10 }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#6b7280', fontSize: 10 }}
              tickFormatter={(value) => `$${value/1000}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="totalValue" 
              name="totalValue"
              stroke="#00f5d4" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorTotalV2)" 
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
