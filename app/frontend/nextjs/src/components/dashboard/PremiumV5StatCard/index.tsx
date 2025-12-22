'use client';

import React from 'react';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { LucideIcon } from 'lucide-react';

/**
 * ════════════════════════════════════════════════════════════════
 * PREMIUM V5 STAT CARD - 高级统计卡片
 * 特点: 深色玻璃态 + 金色边条 + 精致细节
 * ════════════════════════════════════════════════════════════════
 */

interface PremiumV5StatCardProps {
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

export const PremiumV5StatCard: React.FC<PremiumV5StatCardProps> = ({
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
  const isGold = variant === 'gold';
  
  return (
    <motion.div
      className={`premium-stat-card ${variant}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      {/* 顶部: 图标 + 标题 + 趋势 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* 图标 */}
          <div className={`premium-icon-box ${variant}`}>
            <Icon className="w-5 h-5" />
          </div>
          
          {/* 标题 */}
          <span
            className="text-sm font-medium"
            style={{ color: 'rgba(255, 255, 255, 0.5)' }}
          >
            {title}
          </span>
        </div>

        {/* 趋势 */}
        {trend && (
          <div
            className={`premium-badge ${trend.isPositive ? 'premium-badge-success' : 'premium-badge-gold'}`}
          >
            <span>{trend.isPositive ? '↑' : '↓'}</span>
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>

      {/* 数值 */}
      <div className="pl-[56px]">
        <CountUp
          end={value}
          prefix={prefix}
          suffix={suffix}
          separator=","
          decimals={decimals}
          duration={2}
          delay={delay + 0.3}
          useEasing={true}
          className={`text-3xl font-bold ${isGold ? 'premium-text-gold' : 'premium-text-cyan'}`}
        />
      </div>
    </motion.div>
  );
};

