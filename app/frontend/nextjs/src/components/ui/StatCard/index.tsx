'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';

interface StatCardProps {
  title: string;
  value: number | string;
  change?: {
    value: number;
    trend: 'up' | 'down' | 'neutral';
  };
  icon?: React.ReactNode;
  format?: 'currency' | 'percentage' | 'number';
  loading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon,
  format = 'number',
  loading = false
}) => {
  const changeColor = change?.trend === 'up'
    ? 'text-emerald-400'
    : change?.trend === 'down'
    ? 'text-red-400'
    : 'text-gray-400';

  const changeBgColor = change?.trend === 'up'
    ? 'bg-emerald-400/10'
    : change?.trend === 'down'
    ? 'bg-red-400/10'
    : 'bg-gray-400/10';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -2 }}
    >
      <GlassCard className="p-6 h-full">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* 标题 */}
            <p className="text-sm text-gray-400 mb-3 font-medium">{title}</p>

            {/* 数值 */}
            <div className="flex items-baseline gap-3 mb-2">
              <h3 className="text-2xl font-bold text-white tabular-nums">
                {loading ? (
                  <div className="h-8 w-32 bg-gray-700 rounded animate-pulse" />
                ) : (
                  <AnimatedNumber
                    value={value}
                    format={format}
                    className="inline-block"
                  />
                )}
              </h3>

              {/* 变化百分比 */}
              {change && !loading && (
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${changeColor} ${changeBgColor}`}>
                  {change.trend === 'up' ? '↑' : change.trend === 'down' ? '↓' : '→'}
                  {Math.abs(change.value)}%
                </span>
              )}
            </div>

            {/* 额外信息 */}
            {change && change.trend !== 'neutral' && (
              <p className="text-xs text-gray-500">
                相比{change.trend === 'up' ? '增长' : '下降'}
              </p>
            )}
          </div>

          {/* 图标 */}
          {icon && (
            <div className="text-gray-400 opacity-50 text-2xl">
              {icon}
            </div>
          )}
        </div>

        {/* 加载动画 */}
        {loading && (
          <div className="absolute inset-0 rounded-xl bg-gray-800/20 animate-pulse" />
        )}
      </GlassCard>
    </motion.div>
  );
};