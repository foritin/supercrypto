'use client';

import { motion } from 'framer-motion';
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { formatNumberNoGrouping } from './number-format';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendUp, Calendar, Target } from '@phosphor-icons/react';

export type TimeRange = '7d' | '30d' | '90d' | '1y' | 'all';

export interface PerformanceDataPoint {
  date: string;
  timestamp: number;
  portfolio: number;
  invested: number;
  benchmark?: number;
}

interface PerformanceChartProps {
  data?: PerformanceDataPoint[];
  timeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
  isLoading?: boolean;
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
  const { t } = useTranslation();
  if (!active || !payload || payload.length === 0) return null;

  const portfolio = payload.find(p => p.name === 'portfolio')?.value ?? 0;
  const invested = payload.find(p => p.name === 'invested')?.value ?? 0;
  const benchmark = payload.find(p => p.name === 'benchmark')?.value;
  const earnings = portfolio - invested;
  const returnRate = invested > 0 ? ((earnings / invested) * 100).toFixed(2) : '0.00';

  return (
    <div className="bg-[#0d0f14]/95 border border-[#00f5d4]/30 rounded-xl p-4 shadow-2xl backdrop-blur-md min-w-[220px]">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-3 h-3 text-[#00f5d4]" />
        <span className="text-white/60 text-xs font-mono">{label}</span>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-white/40 text-xs font-body">
            {t('portfolio.chart.portfolioValue', { defaultValue: 'Portfolio Value' })}
          </span>
          <span className="text-white font-bold text-sm font-mono">
            ${formatNumberNoGrouping(portfolio)}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-white/40 text-xs font-body">
            {t('portfolio.chart.totalInvested', { defaultValue: 'Total Invested' })}
          </span>
          <span className="text-white/60 text-xs font-mono">
            ${formatNumberNoGrouping(invested)}
          </span>
        </div>

        {benchmark !== undefined && (
          <div className="flex justify-between items-center">
            <span className="text-white/40 text-xs font-body">
              {t('portfolio.chart.benchmark', { defaultValue: 'Benchmark' })}
            </span>
            <span className="text-amber-400 text-xs font-mono">
              ${formatNumberNoGrouping(benchmark)}
            </span>
          </div>
        )}
        
        <div className="pt-2 mt-2 border-t border-white/10 flex justify-between items-center">
          <span className="text-emerald-400 text-xs flex items-center gap-1 font-body">
            <TrendUp weight="bold" className="w-3 h-3" />
            {t('portfolio.chart.return', { defaultValue: 'Return' })}
          </span>
          <span className={cn(
            'font-bold text-sm font-mono',
            earnings >= 0 ? 'text-emerald-400' : 'text-rose-400'
          )}>
            {earnings >= 0 ? '+' : ''}{returnRate}%
          </span>
        </div>
      </div>
    </div>
  );
}

export function PerformanceChart({
  data: propData,
  timeRange: propTimeRange,
  onTimeRangeChange,
  isLoading,
  className,
}: PerformanceChartProps) {
  const { t } = useTranslation();
  const [internalTimeRange, setInternalTimeRange] = useState<TimeRange>('30d');
  const timeRange = propTimeRange || internalTimeRange;
  const rawData = propData || [];

  const filteredData = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const daysMap: Record<TimeRange, number> = {
      '7d': 7, '30d': 30, '90d': 90, '1y': 365, 'all': Infinity,
    };
    const cutoff = daysMap[timeRange] === Infinity ? 0 : now - daysMap[timeRange] * dayMs;
    return rawData.filter((d) => d.timestamp >= cutoff);
  }, [rawData, timeRange]);

  const stats = useMemo(() => {
    if (filteredData.length === 0) return null;
    const first = filteredData[0];
    const last = filteredData[filteredData.length - 1];
    if (!first || !last) return null;
    const portfolioChange = last.portfolio - first.portfolio;
    const portfolioChangePercent = first.portfolio > 0 ? (portfolioChange / first.portfolio) * 100 : 0;
    
    return {
      currentValue: last.portfolio,
      change: portfolioChange,
      changePercent: portfolioChangePercent,
      high: Math.max(...filteredData.map(d => d.portfolio)),
      low: Math.min(...filteredData.map(d => d.portfolio)),
    };
  }, [filteredData]);

  const handleTimeRangeChange = (range: TimeRange) => {
    if (onTimeRangeChange) onTimeRangeChange(range);
    else setInternalTimeRange(range);
  };

  if (isLoading) {
    return (
      <div className={cn(
        'relative p-6 rounded-2xl overflow-hidden',
        'bg-[#0d0f14]/80 border border-[#00f5d4]/20',
        className
      )}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 bg-white/5 rounded" />
          <div className="h-[300px] w-full bg-white/5 rounded" />
        </div>
      </div>
    );
  }

  if (filteredData.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'relative p-6 rounded-2xl overflow-hidden',
          'bg-[#0d0f14]/80 border border-[#00f5d4]/20',
          className
        )}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#00f5d4]/10 flex items-center justify-center border border-[#00f5d4]/20">
            <TrendUp weight="duotone" className="w-5 h-5 text-[#00f5d4]" />
          </div>
          <div>
            <h3 className="text-base font-semibold font-body text-white">
              {t('portfolio.chart.performance', { defaultValue: 'Performance' })}
            </h3>
            <p className="text-xs text-white/40 font-body">
              {t('portfolio.chart.portfolioValueOverTime', { defaultValue: 'Portfolio value over time' })}
            </p>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-[#00f5d4]/20 flex items-center justify-center mb-4">
            <Target weight="duotone" className="w-8 h-8 text-[#00f5d4]/30" />
          </div>
          <p className="text-gray-400 text-sm font-body">
            {t('portfolio.empty.noPerformanceData', { defaultValue: 'No performance data' })}
          </p>
          <p className="text-gray-600 text-xs mt-1 font-body">
            {t('portfolio.empty.performanceDataWillAppear', { defaultValue: 'Data will appear as your portfolio grows' })}
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'relative p-6 rounded-2xl overflow-hidden',
        'bg-[#0d0f14]/80 backdrop-blur-md',
        'border border-[#00f5d4]/20',
        className
      )}
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00f5d4]/10 flex items-center justify-center border border-[#00f5d4]/20">
            <TrendUp weight="duotone" className="w-5 h-5 text-[#00f5d4]" />
          </div>
          <div>
            <h3 className="text-base font-semibold font-body text-white">
              {t('portfolio.chart.performance', { defaultValue: 'Performance' })}
            </h3>
            <p className="text-xs text-white/40 font-body">
              {t('portfolio.chart.portfolioValueOverTime', { defaultValue: 'Portfolio value over time' })}
            </p>
          </div>
        </div>

        {/* Stats summary */}
        {stats && (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-white/40 uppercase tracking-wider font-body">
                {t('portfolio.chart.current', { defaultValue: 'Current' })}
              </p>
              <p className="text-lg font-bold text-white font-mono">
                ${formatNumberNoGrouping(stats.currentValue)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/40 uppercase tracking-wider font-body">
                {t('portfolio.chart.change', { defaultValue: 'Change' })}
              </p>
              <p className={cn(
                'text-sm font-bold font-mono',
                stats.change >= 0 ? 'text-emerald-400' : 'text-rose-400'
              )}>
                {stats.change >= 0 ? '+' : ''}{stats.changePercent.toFixed(2)}%
              </p>
            </div>
          </div>
        )}

        {/* Time range selector */}
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
          {timeRanges.map((range) => (
            <button
              key={range.value}
              onClick={() => handleTimeRangeChange(range.value)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 font-mono',
                timeRange === range.value
                  ? 'bg-gradient-to-r from-[#00f5d4]/20 to-[#8b5cf6]/20 text-white border border-[#00f5d4]/30'
                  : 'text-white/40 hover:text-white'
              )}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPortfolio" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00f5d4" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#00f5d4" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              vertical={false} 
              stroke="rgba(255,255,255,0.03)" 
            />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'monospace' }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'monospace' }}
              tickFormatter={(value) => `$${value/1000}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Invested baseline */}
            <Area
              type="monotone"
              dataKey="invested"
              name="invested"
              stroke="#8b5cf6"
              strokeWidth={1}
              strokeDasharray="5 5"
              fillOpacity={1}
              fill="url(#colorInvested)"
            />
            
            {/* Portfolio value */}
            <Area
              type="monotone"
              dataKey="portfolio"
              name="portfolio"
              stroke="#00f5d4"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorPortfolio)"
              animationDuration={1500}
            />

            {/* Benchmark line if available */}
            {filteredData.some(d => d.benchmark !== undefined) && (
              <Area
                type="monotone"
                dataKey="benchmark"
                name="benchmark"
                stroke="#f59e0b"
                strokeWidth={1}
                fill="none"
                strokeDasharray="3 3"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#00f5d4]" />
          <span className="text-xs text-white/60 font-body">
            {t('portfolio.chart.portfolioValue', { defaultValue: 'Portfolio Value' })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#8b5cf6] opacity-60" />
          <span className="text-xs text-white/60 font-body">
            {t('portfolio.chart.totalInvested', { defaultValue: 'Total Invested' })}
          </span>
        </div>
        {filteredData.some(d => d.benchmark !== undefined) && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <span className="text-xs text-white/60 font-body">
              {t('portfolio.chart.benchmark', { defaultValue: 'Benchmark' })}
            </span>
          </div>
        )}
      </div>

      {/* Corner decorations */}
      <div className="absolute top-0 left-0 w-3 h-3 border-l border-t border-[#00f5d4]/30" />
      <div className="absolute top-0 right-0 w-3 h-3 border-r border-t border-[#00f5d4]/30" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-l border-b border-[#00f5d4]/30" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-r border-b border-[#00f5d4]/30" />
    </motion.div>
  );
}
