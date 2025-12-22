'use client';

import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import React from 'react';

interface RefinedStatCardProps {
  title: string;
  value: number;
  format: 'currency' | 'number' | 'percentage';
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  loading?: boolean;
  showProgress?: boolean;
  progress?: number;
}

/**
 * 精简统计卡片 - V3 Refined Edition
 * 设计原则: 克制的高级感，符合平台风格
 */
export const RefinedStatCard: React.FC<RefinedStatCardProps> = ({
  title,
  value,
  format,
  subtitle,
  icon,
  trend,
  trendValue,
  loading = false,
  showProgress = false,
  progress = 0,
}) => {
  const formatValue = (val: number) => {
    switch (format) {
      case 'currency':
        return {
          prefix: '$',
          decimals: val >= 1000 ? 2 : 0,
          separator: ',',
          duration: 1.5,
        };
      case 'percentage':
        return {
          suffix: '%',
          decimals: 1,
          duration: 1.2,
        };
      case 'number':
        return {
          separator: ',',
          decimals: 0,
          duration: 1.5,
        };
    }
  };

  if (loading) {
    return (
      <div className="refined-stat-card h-full">
        <div className="animate-pulse space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-white/5 rounded-xl" />
            <div className="w-16 h-5 bg-white/5 rounded" />
          </div>
          <div className="w-28 h-9 bg-white/5 rounded" />
          <div className="w-20 h-4 bg-white/5 rounded" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="refined-stat-card h-full"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* 头部：图标和趋势 */}
      <div className="flex items-center justify-between mb-4">
        {/* 图标 */}
        {icon && (
          <div className="refined-icon-badge">
            <div className="text-[#00d4aa]">{icon}</div>
          </div>
        )}

        {/* 趋势指示器 */}
        {trend && trendValue && (
          <div className={`refined-trend ${trend}`}>
            {trend === 'up' && (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            )}
            {trend === 'down' && (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
            {trend === 'neutral' && <span>→</span>}
            {trendValue}
          </div>
        )}
      </div>

      {/* 数值 - 渐变文字 */}
      <motion.div
        className="mb-2"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <CountUp
          end={value}
          {...formatValue(value)}
          className="text-4xl font-bold refined-gradient-text refined-number"
        />
      </motion.div>

      {/* 微妙分隔线 */}
      <div className="w-12 h-0.5 bg-gradient-to-r from-[#00d4aa] to-transparent mb-2 rounded-full" />

      {/* 标签 */}
      <div className="text-sm font-medium text-white/70 mb-1">
        {title}
      </div>

      {/* 副标题 */}
      {subtitle && (
        <div className="text-xs text-white/50">
          {subtitle}
        </div>
      )}

      {/* 可选进度条 */}
      {showProgress && (
        <motion.div
          className="mt-4 refined-progress"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <motion.div
            className="refined-progress-fill"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ delay: 0.5, duration: 1, ease: 'easeOut' }}
          />
        </motion.div>
      )}
    </motion.div>
  );
};

