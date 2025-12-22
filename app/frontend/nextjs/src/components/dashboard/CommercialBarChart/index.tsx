'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

/**
 * ════════════════════════════════════════════════════════════════
 * COMMERCIAL BAR CHART - 双色柱状图
 * 设计参考: Ulfry Dashboard
 * 特点: 蓝+青双色 + 圆角顶部 + 玻璃态Tooltip
 * ════════════════════════════════════════════════════════════════
 */

interface CommercialBarChartProps {
  title: string;
  subtitle?: string;
  data: Array<{
    name: string;
    value1: number;
    value2: number;
  }>;
  label1: string;
  label2: string;
  color1?: string;
  color2?: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="commercial-tooltip">
        <p className="text-sm font-semibold text-white mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 mb-1">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: entry.color }}
              />
              <span className="text-xs text-gray-300">{entry.name}</span>
            </div>
            <span className="text-sm font-bold text-white">
              ${entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const CommercialBarChart: React.FC<CommercialBarChartProps> = ({
  title,
  subtitle,
  data,
  label1,
  label2,
  color1 = '#4a9ff5', // 蓝色
  color2 = '#00d4aa', // 青色
}) => {
  return (
    <motion.div
      className="commercial-glass-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white">{title}</h3>
          {subtitle && (
            <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>

        {/* 图例 */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ background: color1 }}
            />
            <span className="text-sm text-gray-300">{label1}</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ background: color2 }}
            />
            <span className="text-sm text-gray-300">{label2}</span>
          </div>
        </div>
      </div>

      {/* 图表 */}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          barGap={8}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255, 255, 255, 0.05)"
            vertical={false}
          />
          <XAxis
            dataKey="name"
            stroke="rgba(255, 255, 255, 0.5)"
            tick={{ fill: 'rgba(255, 255, 255, 0.7)', fontSize: 12 }}
            axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
          />
          <YAxis
            stroke="rgba(255, 255, 255, 0.5)"
            tick={{ fill: 'rgba(255, 255, 255, 0.7)', fontSize: 12 }}
            axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
          />
          <Tooltip content={<CustomTooltip />} cursor={false} />

          {/* 柱1 - 蓝色 */}
          <Bar
            dataKey="value1"
            fill={color1}
            radius={[4, 4, 0, 0]}
            animationDuration={800}
            animationBegin={200}
          />

          {/* 柱2 - 青色 */}
          <Bar
            dataKey="value2"
            fill={color2}
            radius={[4, 4, 0, 0]}
            animationDuration={800}
            animationBegin={400}
          />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

