'use client';

import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
import { EmptyState } from '@/components/ui/EmptyState';

interface TVLBreakdown {
  asset_name: string;
  value: number;
  percentage: number;
}

interface InteractiveTVLPieChartProps {
  breakdown: TVLBreakdown[];
  totalTVL: number;
  loading?: boolean;
  onSegmentClick?: (asset: string) => void;
}

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#00d4aa', '#ffc107', '#3b82f6', '#10b981'];

/**
 * 交互式TVL饼图组件
 * 特性：环形图、悬停高亮、自定义Tooltip、图例交互
 */
export const InteractiveTVLPieChart: React.FC<InteractiveTVLPieChartProps> = ({
  breakdown,
  totalTVL,
  loading = false,
  onSegmentClick,
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center">
        <div className="skeleton-loading w-48 h-48 rounded-full" />
      </div>
    );
  }

  if (!breakdown || breakdown.length === 0) {
    return (
      <EmptyState
        message="暂无TVL数据"
        description="当前没有资产锁仓数据可显示"
      />
    );
  }

  const formatCurrency = (value: number) => {
    if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(2)}M`;
    }
    if (value >= 1_000) {
      return `$${(value / 1_000).toFixed(2)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          {/* 渐变定义 */}
          <defs>
            {COLORS.map((color, index) => (
              <linearGradient
                key={index}
                id={`gradient-${index}`}
                x1="0"
                y1="0"
                x2="1"
                y2="1"
              >
                <stop offset="0%" stopColor={color} />
                <stop offset="100%" stopColor={color} stopOpacity={0.6} />
              </linearGradient>
            ))}
          </defs>

          <Pie
            data={breakdown}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={activeIndex !== null ? 85 : 80}
            paddingAngle={2}
            dataKey="value"
            animationBegin={0}
            animationDuration={1000}
            onMouseEnter={(_, index) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
            onClick={(data) => onSegmentClick?.(data.asset_name)}
          >
            {breakdown.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={`url(#gradient-${index % COLORS.length})`}
                stroke="none"
                style={{
                  filter: activeIndex === index 
                    ? 'drop-shadow(0 0 12px rgba(102, 126, 234, 0.8))' 
                    : 'drop-shadow(0 0 6px rgba(102, 126, 234, 0.4))',
                  cursor: 'pointer',
                  transformOrigin: 'center',
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </Pie>

          {/* 自定义Tooltip */}
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-black/90 backdrop-blur-xl border border-white/20 
                               rounded-lg p-3 shadow-lg"
                  >
                    <p className="text-white font-semibold mb-1">
                      {data.asset_name}
                    </p>
                    <p className="text-gray-300 text-sm">
                      {formatCurrency(data.value)}
                    </p>
                    <p className="text-blue-400 text-sm font-medium">
                      {data.percentage.toFixed(1)}%
                    </p>
                  </motion.div>
                );
              }
              return null;
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* 中心统计 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                      text-center pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <div className="text-3xl font-bold text-white">
            {formatCurrency(totalTVL)}
          </div>
          <div className="text-xs text-gray-400 mt-1">Total TVL</div>
        </motion.div>
      </div>

      {/* 图例 */}
      <div className="mt-6 grid grid-cols-2 gap-2">
        {breakdown.map((item, index) => (
          <motion.div
            key={index}
            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer
                       transition-all duration-300
                       ${activeIndex === index 
                         ? 'bg-white/10 shadow-glow-sm' 
                         : 'hover:bg-white/5'
                       }`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1, duration: 0.4 }}
            whileHover={{ scale: 1.02 }}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
            onClick={() => onSegmentClick?.(item.asset_name)}
          >
            <div
              className="w-3 h-3 rounded flex-shrink-0"
              style={{
                background: COLORS[index % COLORS.length],
                boxShadow: activeIndex === index 
                  ? `0 0 10px ${COLORS[index % COLORS.length]}` 
                  : 'none',
              }}
            />
            <span className="flex-1 text-sm text-gray-300 truncate">
              {item.asset_name}
            </span>
            <span className="text-sm font-medium text-white">
              {item.percentage.toFixed(1)}%
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

