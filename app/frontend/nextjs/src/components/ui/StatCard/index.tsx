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

// 趋势颜色映射 - 使用 CSS 变量
const TREND_STYLES = {
  up: {
    color: 'var(--color-success)',
    bg: 'rgba(82, 196, 26, 0.1)',
  },
  down: {
    color: 'var(--color-error)',
    bg: 'rgba(255, 77, 79, 0.1)',
  },
  neutral: {
    color: 'var(--text-muted)',
    bg: 'rgba(255, 255, 255, 0.05)',
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon,
  format = 'number',
  loading = false
}) => {
  const trendStyle = change ? TREND_STYLES[change.trend] : TREND_STYLES.neutral;

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
            <p 
              className="text-sm mb-3 font-medium"
              style={{ color: 'var(--text-muted)' }}
            >
              {title}
            </p>

            {/* 数值 */}
            <div className="flex items-baseline gap-3 mb-2">
              <h3 
                className="text-2xl font-bold tabular-nums"
                style={{ color: 'var(--text-primary)' }}
              >
                {loading ? (
                  <div 
                    className="h-8 w-32 rounded animate-pulse"
                    style={{ background: 'var(--bg-elevated)' }}
                  />
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
                <span 
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                  style={{ 
                    color: trendStyle.color,
                    background: trendStyle.bg,
                  }}
                >
                  {change.trend === 'up' ? '↑' : change.trend === 'down' ? '↓' : '→'}
                  {Math.abs(change.value)}%
                </span>
              )}
            </div>

            {/* 额外信息 */}
            {change && change.trend !== 'neutral' && (
              <p 
                className="text-xs"
                style={{ color: 'var(--text-muted)' }}
              >
                相比{change.trend === 'up' ? '增长' : '下降'}
              </p>
            )}
          </div>

          {/* 图标 */}
          {icon && (
            <div 
              className="text-2xl opacity-50"
              style={{ color: 'var(--text-muted)' }}
            >
              {icon}
            </div>
          )}
        </div>

        {/* 加载动画 */}
        {loading && (
          <div 
            className="absolute inset-0 rounded-xl animate-pulse"
            style={{ background: 'rgba(255, 255, 255, 0.02)' }}
          />
        )}
      </GlassCard>
    </motion.div>
  );
};
