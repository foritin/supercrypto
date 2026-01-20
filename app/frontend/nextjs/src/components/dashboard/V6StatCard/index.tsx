'use client';

import React from 'react';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { LucideIcon } from 'lucide-react';

/**
 * ════════════════════════════════════════════════════════════════
 * V6 STAT CARD - 高级统计卡片 (无边条清爽版)
 * 设计: 顶部布局 (图标+标题+趋势)，数字清晰展示
 * ════════════════════════════════════════════════════════════════
 */

interface V6StatCardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'gold' | 'cyan';
  decimals?: number;
  delay?: number;
}

export const V6StatCard: React.FC<V6StatCardProps> = ({
  title,
  value,
  prefix = '',
  suffix = '',
  icon: Icon,
  trend,
  variant = 'gold',
  decimals = 0,
  delay = 0,
}) => {
  const isCyan = variant === 'cyan';
  
  return (
    <motion.div
      className={`v6-stat-card ${isCyan ? 'cyan' : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      {/* 顶部: 图标 + 标题 + 趋势 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* 深色图标容器 */}
          <div className={`v6-stat-icon ${isCyan ? 'cyan' : ''}`}>
            <Icon className="w-4 h-4" />
          </div>
          
          {/* 标题 */}
          <span
            className="text-sm font-medium"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {title}
          </span>
        </div>

        {/* 趋势徽章 */}
        {trend && (
          <div
            className={`premium-badge ${trend.isPositive ? 'premium-badge-success' : 'premium-badge-gold'}`}
          >
            <span>{trend.isPositive ? '↑' : '↓'}</span>
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>

      {/* 数值 - 清晰展示 */}
      <div className={`v6-stat-value ${isCyan ? 'cyan' : ''}`}>
        <CountUp
          end={value}
          prefix={prefix}
          suffix={suffix}
          separator=","
          decimals={decimals}
          duration={2}
          delay={delay + 0.3}
          useEasing={true}
        />
      </div>
    </motion.div>
  );
};

