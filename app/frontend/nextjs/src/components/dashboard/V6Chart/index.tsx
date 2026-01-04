'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

/**
 * ════════════════════════════════════════════════════════════════
 * V6 CHART - 高级面积图
 * 特点: 金色渐变 + 玻璃态提示框 + 精致网格
 * ════════════════════════════════════════════════════════════════
 */

interface V6ChartProps {
  title: string;
  subtitle?: string;
  data: Array<{
    name: string;
    value1: number;
    value2?: number;
  }>;
  label1: string;
  label2?: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="premium-chart-tooltip">
        <p className="text-sm font-semibold text-white mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-6 mb-1">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: entry.color }}
              />
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {entry.name}
              </span>
            </div>
            <span className="text-sm font-semibold text-white">
              ${entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const V6Chart: React.FC<V6ChartProps> = ({
  title,
  subtitle,
  data,
  label1,
  label2,
}) => {
  return (
    <motion.div
      className="premium-chart-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      {/* 标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {subtitle && (
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {subtitle}
            </p>
          )}
        </div>

        {/* 图例 */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ background: 'linear-gradient(135deg, #c9a962 0%, #e8d5a3 100%)' }}
            />
            <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {label1}
            </span>
          </div>
          {label2 && (
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ background: 'linear-gradient(135deg, #00a080 0%, #00d4aa 100%)' }}
              />
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {label2}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 图表 */}
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            {/* 金色渐变 */}
            <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c9a962" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#c9a962" stopOpacity={0} />
            </linearGradient>
            {/* 青色渐变 */}
            <linearGradient id="cyanGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00d4aa" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#00d4aa" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255, 255, 255, 0.04)"
            vertical={false}
          />

          <XAxis
            dataKey="name"
            stroke="rgba(255, 255, 255, 0.3)"
            tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 12 }}
            axisLine={{ stroke: 'rgba(255, 255, 255, 0.06)' }}
            tickLine={false}
          />

          <YAxis
            stroke="rgba(255, 255, 255, 0.3)"
            tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 12 }}
            axisLine={{ stroke: 'rgba(255, 255, 255, 0.06)' }}
            tickLine={false}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
          />

          <Tooltip content={<CustomTooltip />} cursor={false} />

          {/* 金色面积 */}
          <Area
            type="monotone"
            dataKey="value1"
            name={label1}
            stroke="#c9a962"
            strokeWidth={2}
            fill="url(#goldGradient)"
            animationDuration={1000}
          />

          {/* 青色面积 */}
          {label2 && (
            <Area
              type="monotone"
              dataKey="value2"
              name={label2}
              stroke="#00d4aa"
              strokeWidth={2}
              fill="url(#cyanGradient)"
              animationDuration={1000}
              animationBegin={300}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

