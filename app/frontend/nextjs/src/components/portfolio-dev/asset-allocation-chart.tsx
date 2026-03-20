'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';
import { Wallet, TrendingUp } from 'lucide-react';

export interface AssetAllocation {
  name: string;
  symbol: string;
  value: number;
  color?: string;
  apy: number;
}

interface AssetAllocationChartProps {
  data?: AssetAllocation[];
  isLoading?: boolean;
  className?: string;
}

const COLORS = [
  '#00f5d4', // Cyan
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#f43f5e', // Rose
  '#84cc16', // Lime
];

function renderActiveShape(props: any) {
  const {
    cx, cy, innerRadius, outerRadius, startAngle, endAngle,
    fill, payload, percent, value
  } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{
          filter: `drop-shadow(0 0 10px ${fill}40)`,
        }}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 14}
        fill={fill}
      />
      <text x={cx} y={cy - 10} textAnchor="middle" fill="#fff" className="text-sm font-bold">
        {payload.symbol}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="#fff" className="text-lg font-bold font-mono">
        ${value.toLocaleString()}
      </text>
      <text x={cx} y={cy + 28} textAnchor="middle" fill="#00f5d4" className="text-xs">
        {(percent * 100).toFixed(1)}%
      </text>
    </g>
  );
}

export function AssetAllocationChart({
  data = [],
  isLoading,
  className,
}: AssetAllocationChartProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const chartData = useMemo(() => {
    return data.map((item, index) => ({
      ...item,
      color: COLORS[index % COLORS.length],
    }));
  }, [data]);

  const total = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.value, 0);
  }, [chartData]);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  if (isLoading) {
    return (
      <div className={cn(
        'relative p-6 rounded-xl overflow-hidden',
        'bg-[#0d0f14]/80 border border-[#00f5d4]/20',
        className
      )}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-40 bg-white/5 rounded" />
          <div className="h-64 w-full bg-white/5 rounded-full" />
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'relative p-6 rounded-xl overflow-hidden',
          'bg-[#0d0f14]/80 border border-[#00f5d4]/20',
          className
        )}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#00f5d4]/10 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-[#00f5d4]" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Asset Allocation</h3>
            <p className="text-xs text-white/40">Portfolio distribution by value</p>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-32 h-32 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center mb-4">
            <TrendingUp className="w-10 h-10 text-white/20" />
          </div>
          <p className="text-gray-400 text-sm">No allocation data</p>
          <p className="text-gray-600 text-xs mt-1">Start investing to see your allocation</p>
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
        'relative p-6 rounded-xl overflow-hidden',
        'bg-[#0d0f14]/80 backdrop-blur-md',
        'border border-[#00f5d4]/20',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00f5d4]/10 flex items-center justify-center border border-[#00f5d4]/20">
            <Wallet className="w-5 h-5 text-[#00f5d4]" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Asset Allocation</h3>
            <p className="text-xs text-white/40">Portfolio distribution by value</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/40 uppercase tracking-wider">Total</p>
          <p className="text-lg font-bold text-white font-mono">
            ${total.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="relative h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                {...{
                  activeIndex,
                  activeShape: renderActiveShape,
                }}
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                dataKey="value"
                onMouseEnter={onPieEnter}
                animationBegin={0}
                animationDuration={1000}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color || '#00f5d4'}
                    stroke="transparent"
                    style={{
                      filter: index === activeIndex ? `drop-shadow(0 0 8px ${entry.color || '#00f5d4'}60)` : 'none',
                    }}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          
          {/* Center decoration */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-20 h-20 rounded-full border border-[#00f5d4]/10" />
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-2 overflow-y-auto max-h-64 pr-2 custom-scrollbar">
          <AnimatePresence>
            {chartData.map((item, index) => (
              <motion.div
                key={item.symbol}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                onMouseEnter={() => setActiveIndex(index)}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg cursor-pointer',
                  'bg-white/[0.02] border border-transparent',
                  'hover:bg-white/[0.04] hover:border-[#00f5d4]/20',
                  'transition-all duration-200',
                  activeIndex === index && 'bg-[#00f5d4]/5 border-[#00f5d4]/30'
                )}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ 
                      backgroundColor: item.color,
                      boxShadow: `0 0 10px ${item.color}50`,
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium text-white">{item.symbol}</p>
                    <p className="text-xs text-white/40">{item.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-white font-mono">
                    ${item.value.toLocaleString()}
                  </p>
                  <p className="text-xs text-emerald-400">
                    {((item.value / total) * 100).toFixed(1)}%
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Corner decorations */}
      <div className="absolute top-0 left-0 w-3 h-3 border-l border-t border-[#00f5d4]/30" />
      <div className="absolute top-0 right-0 w-3 h-3 border-r border-t border-[#00f5d4]/30" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-l border-b border-[#00f5d4]/30" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-r border-b border-[#00f5d4]/30" />
    </motion.div>
  );
}
