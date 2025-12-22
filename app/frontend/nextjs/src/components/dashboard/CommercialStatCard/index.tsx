'use client';

import React from 'react';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { LucideIcon } from 'lucide-react';

/**
 * ════════════════════════════════════════════════════════════════
 * COMMERCIAL STAT CARD - 商业化渐变统计卡片
 * 设计参考: Ulfry Dashboard
 * 特点: 渐变背景 + 大圆角 + 底部进度条 + 3D悬停
 * ════════════════════════════════════════════════════════════════
 */

interface CommercialStatCardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  progress?: number; // 0-100
  variant?: 'purple' | 'cyan'; // 渐变色系
  decimals?: number;
}

export const CommercialStatCard: React.FC<CommercialStatCardProps> = ({
  title,
  value,
  prefix = '',
  suffix = '',
  icon: Icon,
  trend,
  progress,
  variant = 'purple',
  decimals = 2,
}) => {
  return (
    <motion.div
      className={`commercial-gradient-card ${variant === 'cyan' ? 'cyan' : ''}`}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1],
      }}
      whileHover={{
        y: -8,
      }}
    >
      {/* 顶部: 图标 + 趋势 */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        {/* 图标 - 半透明白色圆形 */}
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
          }}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>

        {/* 趋势箭头 */}
        {trend && (
          <div
            className="flex items-center gap-1 text-sm font-medium"
            style={{
              color: trend.isPositive ? '#00d4aa' : '#ff4757',
            }}
          >
            <span>{trend.isPositive ? '↑' : '↓'}</span>
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>

      {/* 中部: 数值 */}
      <div className="relative z-10">
        <CountUp
          end={value}
          prefix={prefix}
          suffix={suffix}
          separator=","
          decimals={decimals}
          duration={2}
          useEasing={true}
          className="text-4xl font-bold text-white"
        />
      </div>

      {/* 小分隔线 */}
      <div className="commercial-divider" />

      {/* 标签 */}
      <div
        className="text-sm font-medium relative z-10"
        style={{ color: 'rgba(255, 255, 255, 0.7)' }}
      >
        {title}
      </div>

      {/* 底部进度条 */}
      {progress !== undefined && (
        <div className="commercial-progress">
          <motion.div
            className="commercial-progress-fill"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
          />
        </div>
      )}
    </motion.div>
  );
};

