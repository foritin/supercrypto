'use client';

import { TrendingUp, DollarSign } from 'lucide-react';
import * as React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
} from 'recharts';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type ChartType = 'area' | 'line' | 'bar';
export type TimeRange = '7d' | '30d' | '90d' | '1y' | 'all';

export interface YieldDataPoint {
  date: string;
  timestamp: number;
  value: number;
  yield: number;
  invested: number;
}

interface YieldChartProps {
  data?: YieldDataPoint[];
  type?: ChartType;
  timeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
  showInvested?: boolean;
  showYield?: boolean;
  className?: string;
  height?: number;
  title?: string;
}

interface TooltipPayloadEntry {
  color?: string;
  name?: string;
  value?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

// Mock data
const mockData: YieldDataPoint[] = [
  { date: 'Jan 1', timestamp: 1704067200000, value: 50000, yield: 0, invested: 50000 },
  { date: 'Jan 5', timestamp: 1704412800000, value: 50150, yield: 150, invested: 50000 },
  { date: 'Jan 10', timestamp: 1704844800000, value: 50320, yield: 320, invested: 50000 },
  { date: 'Jan 15', timestamp: 1705276800000, value: 50280, yield: 280, invested: 50000 },
  { date: 'Jan 20', timestamp: 1705708800000, value: 50500, yield: 500, invested: 50000 },
  { date: 'Jan 25', timestamp: 1706140800000, value: 50750, yield: 750, invested: 50000 },
  { date: 'Jan 30', timestamp: 1706572800000, value: 51000, yield: 1000, invested: 50000 },
  { date: 'Feb 5', timestamp: 1707091200000, value: 51200, yield: 1200, invested: 50000 },
  { date: 'Feb 10', timestamp: 1707523200000, value: 51500, yield: 1500, invested: 50000 },
  { date: 'Feb 15', timestamp: 1707955200000, value: 51800, yield: 1800, invested: 50000 },
  { date: 'Feb 20', timestamp: 1708387200000, value: 52200, yield: 2200, invested: 50000 },
  { date: 'Feb 25', timestamp: 1708819200000, value: 52500, yield: 2500, invested: 50000 },
  { date: 'Mar 1', timestamp: 1709251200000, value: 52800, yield: 2800, invested: 50000 },
  { date: 'Mar 5', timestamp: 1709596800000, value: 53200, yield: 3200, invested: 50000 },
  { date: 'Mar 10', timestamp: 1710028800000, value: 53600, yield: 3600, invested: 50000 },
  { date: 'Mar 15', timestamp: 1710460800000, value: 54000, yield: 4000, invested: 50000 },
  { date: 'Mar 20', timestamp: 1710892800000, value: 54500, yield: 4500, invested: 50000 },
  { date: 'Mar 25', timestamp: 1711324800000, value: 55000, yield: 5000, invested: 50000 },
  { date: 'Mar 30', timestamp: 1711756800000, value: 55600, yield: 5600, invested: 50000 },
  { date: 'Apr 1', timestamp: 1711929600000, value: 56200, yield: 6200, invested: 50000 },
];

const timeRanges: { value: TimeRange; label: string }[] = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: '1y', label: '1Y' },
  { value: 'all', label: 'ALL' },
];

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="glass border border-primary/30 rounded-xl p-4 shadow-xl">
      <p className="text-white/60 text-sm mb-2">{label}</p>
      <div className="space-y-2">
        {payload.map((entry, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-white/70 text-sm">{entry.name}:</span>
            <span className="text-white font-semibold">${(entry.value ?? 0).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function YieldChart({
  data = mockData,
  type = 'area',
  timeRange: propTimeRange,
  onTimeRangeChange,
  showInvested = true,
  showYield = true,
  className,
  height = 350,
  title = 'Yield Performance',
}: YieldChartProps) {
  const [internalTimeRange, setInternalTimeRange] = React.useState<TimeRange>('30d');
  const timeRange = propTimeRange || internalTimeRange;

  const filteredData = React.useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const daysMap: Record<TimeRange, number> = {
      '7d': 7, '30d': 30, '90d': 90, '1y': 365, 'all': Infinity,
    };
    const cutoff = daysMap[timeRange] === Infinity ? 0 : now - daysMap[timeRange] * dayMs;
    return data.filter((d) => d.timestamp >= cutoff);
  }, [data, timeRange]);

  const stats = React.useMemo(() => {
    if (filteredData.length === 0) return null;
    const first = filteredData[0];
    const last = filteredData[filteredData.length - 1];
    if (!first || !last) return null;
    const totalYield = last.value - first.invested;
    const yieldPercentage = ((totalYield / first.invested) * 100);
    return { totalYield, yieldPercentage, currentValue: last.value };
  }, [filteredData]);

  const handleTimeRangeChange = (range: TimeRange) => {
    if (onTimeRangeChange) onTimeRangeChange(range);
    else setInternalTimeRange(range);
  };

  return (
    <Card className={cn('glass border-primary/10 p-6', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {title}
          </h3>
          {stats && (
            <div className="flex items-center gap-4 mt-1">
              <span className="text-white/60 text-sm">
                Current: <span className="text-primary font-semibold">${stats.currentValue.toLocaleString()}</span>
              </span>
              <span className="text-white/60 text-sm">
                Yield: <span className="text-green-400 font-semibold">+{stats.yieldPercentage.toFixed(2)}%</span>
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
          {timeRanges.map((range) => (
            <Button
              key={range.value}
              variant="ghost"
              size="sm"
              onClick={() => handleTimeRangeChange(range.value)}
              className={cn(
                'text-xs px-3 py-1 h-7',
                timeRange === range.value
                  ? 'bg-primary/20 text-primary'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              )}
            >
              {range.label}
            </Button>
          ))}
        </div>
      </div>

      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {type === 'area' ? (
            <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="yieldGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00D4AA" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00D4AA" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} minTickGap={30} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              {showInvested && <Area type="monotone" dataKey="invested" name="Invested" stroke="#6366F1" strokeWidth={2} fill="transparent" />}
              {showYield && <Area type="monotone" dataKey="value" name="Total Value" stroke="#00D4AA" strokeWidth={2} fill="url(#yieldGradient)" />}
            </AreaChart>
          ) : type === 'line' ? (
            <LineChart data={filteredData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} minTickGap={30} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              {showInvested && <Line type="monotone" dataKey="invested" name="Invested" stroke="#6366F1" strokeWidth={2} dot={false} />}
              {showYield && <Line type="monotone" dataKey="value" name="Total Value" stroke="#00D4AA" strokeWidth={2} dot={{ fill: '#00D4AA', strokeWidth: 0, r: 3 }} activeDot={{ r: 5, fill: '#00D4AA', stroke: '#fff', strokeWidth: 2 }} />}
            </LineChart>
          ) : (
            <BarChart data={filteredData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} minTickGap={30} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              {showYield && <Bar dataKey="yield" name="Daily Yield" fill="#00D4AA" radius={[4, 4, 0, 0]} />}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="text-center">
            <p className="text-white/50 text-xs mb-1">Total Invested</p>
            <p className="text-white font-semibold flex items-center justify-center gap-1">
              <DollarSign className="h-3.5 w-3.5 text-primary" />
              50,000
            </p>
          </div>
          <div className="text-center">
            <p className="text-white/50 text-xs mb-1">Total Yield</p>
            <p className="text-green-400 font-semibold flex items-center justify-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              +{stats.totalYield.toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-white/50 text-xs mb-1">APY</p>
            <p className="text-primary font-semibold">~12.5%</p>
          </div>
        </div>
      )}
    </Card>
  );
}
