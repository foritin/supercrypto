'use client';

import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import React from 'react';

interface EnhancedStatCardProps {
  title: string;
  value: number;
  format: 'currency' | 'number' | 'percentage';
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  loading?: boolean;
  onClick?: () => void;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' }
  },
  hover: {
    y: -4,
    transition: { duration: 0.3 }
  },
};

const colorClasses = {
  blue: {
    bg: 'from-blue-500 to-purple-500',
    shadow: 'shadow-blue-500/25',
    border: 'from-blue-600 to-purple-600',
  },
  green: {
    bg: 'from-green-500 to-emerald-500',
    shadow: 'shadow-green-500/25',
    border: 'from-green-600 to-emerald-600',
  },
  purple: {
    bg: 'from-purple-500 to-pink-500',
    shadow: 'shadow-purple-500/25',
    border: 'from-purple-600 to-pink-600',
  },
  orange: {
    bg: 'from-orange-500 to-amber-500',
    shadow: 'shadow-orange-500/25',
    border: 'from-orange-600 to-amber-600',
  },
  red: {
    bg: 'from-red-500 to-rose-500',
    shadow: 'shadow-red-500/25',
    border: 'from-red-600 to-rose-600',
  },
};

const trendColors = {
  up: 'text-green-400',
  down: 'text-red-400',
  neutral: 'text-gray-400',
};

/**
 * 增强版统计卡片组件
 * 特性：玻璃态背景、发光边框、数字滚动动画、悬停效果
 */
export const EnhancedStatCard: React.FC<EnhancedStatCardProps> = ({
  title,
  value,
  format,
  subtitle,
  icon,
  trend,
  trendValue,
  color = 'blue',
  loading = false,
  onClick,
}) => {
  const formatValue = (val: number) => {
    switch (format) {
      case 'currency':
        return { 
          prefix: '$', 
          decimals: val >= 1000 ? 2 : 0,
          separator: ',',
          duration: 2,
        };
      case 'percentage':
        return { 
          suffix: '%', 
          decimals: 1,
          duration: 1.5,
        };
      case 'number':
        return { 
          separator: ',', 
          decimals: 0,
          duration: 2,
        };
    }
  };

  const colorClass = colorClasses[color];

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/40 backdrop-blur-xl p-6 h-full">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-full bg-white/10" />
            <div className="w-16 h-6 bg-white/10 rounded" />
          </div>
          <div className="space-y-2">
            <div className="w-32 h-10 bg-white/10 rounded" />
            <div className="w-24 h-4 bg-white/10 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="relative group cursor-pointer"
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      onClick={onClick}
    >
      {/* 发光边框 */}
      <div 
        className={`absolute -inset-0.5 bg-gradient-to-r ${colorClass.border} 
                   rounded-xl blur opacity-30 group-hover:opacity-60 
                   transition duration-300`} 
      />
      
      {/* 玻璃态卡片 */}
      <div className="relative bg-black/40 backdrop-blur-xl rounded-xl 
                      border border-white/10 p-6 h-full">
        <div className="flex items-center justify-between mb-4">
          {/* 渐变图标 */}
          {icon && (
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${colorClass.bg} 
                           flex items-center justify-center shadow-lg ${colorClass.shadow}`}>
              {icon}
            </div>
          )}
          
          {/* 趋势指示器 */}
          {trend && trendValue && (
            <div className={`text-sm flex items-center gap-1 font-medium
                            ${trendColors[trend]}`}>
              {trend === 'up' && <span>↑</span>}
              {trend === 'down' && <span>↓</span>}
              {trend === 'neutral' && <span>→</span>}
              {trendValue}
            </div>
          )}
        </div>
        
        {/* 数值 - 带滚动动画 */}
        <div className="mb-2">
          <CountUp
            end={value}
            {...formatValue(value)}
            className="text-4xl font-bold bg-gradient-to-r from-white to-gray-400 
                       bg-clip-text text-transparent"
          />
        </div>
        
        {/* 标签 */}
        <div className="text-sm text-gray-400 font-medium">{title}</div>
        
        {/* 副标题 */}
        {subtitle && (
          <div className="mt-1 text-xs text-gray-500">{subtitle}</div>
        )}
      </div>
    </motion.div>
  );
};

