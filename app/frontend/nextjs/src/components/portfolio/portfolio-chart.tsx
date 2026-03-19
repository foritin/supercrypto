'use client';

import { motion } from 'framer-motion';
import { TrendingUp, DollarSign, PieChart, ArrowUpRight } from 'lucide-react';
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

export type TimeRange = '7d' | '30d' | '90d' | '1y' | 'all';

export interface PortfolioDataPoint {
  date: string;
  timestamp: number;
  totalValue: number;
  invested: number;
  earnings: number;
}

interface PortfolioChartProps {
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

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ color?: string; name?: string; value?: number }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  
  const totalValue = payload.find(p => p.name === 'totalValue')?.value ?? 0;
  const invested = payload.find(p => p.name === 'invested')?.value ?? 0;
  const earnings = totalValue - invested;
  const returnRate = invested > 0 ? ((earnings / invested) * 100).toFixed(2) : '0.00';
  
  return (
    <div className="bg-[#15171a] border border-white/10 rounded-xl p-4 shadow-2xl backdrop-blur-md min-w-[180px]">
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
          <span className="text-emerald-400 text-xs">Return</span>
          <span className="text-emerald-400 font-bold text-sm">+{returnRate}%</span>
        </div>
      </div>
    </div>
  );
}

export function PortfolioChart({
  data: propData,
  timeRange: propTimeRange,
  onTimeRangeChange,
  className,
}: PortfolioChartProps) {
  const [internalTimeRange, setInternalTimeRange] = React.useState<TimeRange>('30d');
  const timeRange = propTimeRange || internalTimeRange;
  // 不使用模拟数据，没有真实数据时显示空状态
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

  const stats = React.useMemo(() => {
    if (filteredData.length === 0) return null;
    const first = filteredData[0];
    const last = filteredData[filteredData.length - 1];
    if (!first || !last) return null;
    const periodReturn = last.totalValue - first.totalValue;
    const periodReturnPercent = ((periodReturn / first.totalValue) * 100);
    const totalEarnings = last.totalValue - last.invested;
    const totalReturnPercent = ((totalEarnings / last.invested) * 100);
    return { 
      periodReturn, 
      periodReturnPercent, 
      currentValue: last.totalValue, 
      totalEarnings, 
      totalReturnPercent, 
      invested: last.invested 
    };
  }, [filteredData]);

  const handleTimeRangeChange = (range: TimeRange) => {
    if (onTimeRangeChange) onTimeRangeChange(range);
    else setInternalTimeRange(range);
  };

  // 空状态：没有数据时显示
  if (filteredData.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className={cn(
          'bg-white/[0.02] rounded-2xl border border-white/[0.06] p-6',
          className
        )}
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-400" />
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
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                  timeRange === range.value
                    ? 'bg-white/10 text-white'
                    : 'text-gray-500 hover:text-white'
                )}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {/* Empty State */}
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <TrendingUp className="w-8 h-8 text-gray-600" />
          </div>
          <p className="text-gray-400 text-sm mb-2">No portfolio data yet</p>
          <p className="text-gray-600 text-xs">Start investing to see your performance chart</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className={cn(
        'bg-white/[0.02] rounded-2xl border border-white/[0.06] p-6',
        className
      )}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Portfolio Performance</h3>
            {stats && (
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-white">${stats.currentValue.toLocaleString()}</span>
                <span className="text-xs text-emerald-400">+{stats.totalReturnPercent.toFixed(2)}%</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
          {timeRanges.map((range) => (
            <button
              key={range.value}
              onClick={() => handleTimeRangeChange(range.value)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                timeRange === range.value 
                  ? 'bg-white/10 text-white' 
                  : 'text-gray-500 hover:text-white'
              )}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Current</p>
              <p className="text-sm font-bold text-white">${stats.currentValue.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <PieChart className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Invested</p>
              <p className="text-sm font-bold text-white">${stats.invested.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Earnings</p>
              <p className="text-sm font-bold text-emerald-400">+${stats.totalEarnings.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Change</p>
              <p className={cn(
                "text-sm font-bold flex items-center gap-0.5",
                stats.periodReturn >= 0 ? "text-emerald-400" : "text-rose-400"
              )}>
                {stats.periodReturn >= 0 ? '+' : ''}{stats.periodReturnPercent.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
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
              dataKey="invested" 
              name="invested"
              stroke="#8b5cf6" 
              strokeWidth={2}
              strokeDasharray="4 4"
              fillOpacity={1} 
              fill="url(#colorInvested)" 
            />
            <Area 
              type="monotone" 
              dataKey="totalValue" 
              name="totalValue"
              stroke="#3b82f6" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorTotal)" 
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-white/[0.04]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Total Value</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-500" />
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Invested</span>
        </div>
      </div>
    </motion.div>
  );
}
