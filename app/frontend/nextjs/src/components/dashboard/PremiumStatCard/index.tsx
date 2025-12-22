'use client';

import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import React from 'react';

interface PremiumStatCardProps {
  title: string;
  value: number;
  format: 'currency' | 'number' | 'percentage';
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'pink';
  loading?: boolean;
  progress?: number; // 0-100
}

const colorGradients = {
  blue: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  green: 'linear-gradient(135deg, #00ff88 0%, #00d4aa 100%)',
  purple: 'linear-gradient(135deg, #a855f7 0%, #f093fb 100%)',
  orange: 'linear-gradient(135deg, #ff6b6b 0%, #ffd700 100%)',
  pink: 'linear-gradient(135deg, #ff0080 0%, #f093fb 100%)',
};

const trendColors = {
  up: 'text-[#00ff88]',
  down: 'text-[#ff0080]',
  neutral: 'text-gray-400',
};

const trendShadows = {
  up: '0 0 20px rgba(0, 255, 136, 0.6)',
  down: '0 0 20px rgba(255, 0, 128, 0.6)',
  neutral: '0 0 10px rgba(156, 163, 175, 0.3)',
};

/**
 * 高级统计卡片 - Premium Edition
 * 特性：三层发光、流动边框、金属扫光、粒子效果
 */
export const PremiumStatCard: React.FC<PremiumStatCardProps> = ({
  title,
  value,
  format,
  subtitle,
  icon,
  trend,
  trendValue,
  color = 'blue',
  loading = false,
  progress = 85,
}) => {
  const formatValue = (val: number) => {
    switch (format) {
      case 'currency':
        return {
          prefix: '$',
          decimals: val >= 1000 ? 2 : 0,
          separator: ',',
          duration: 2.5,
        };
      case 'percentage':
        return {
          suffix: '%',
          decimals: 1,
          duration: 2,
        };
      case 'number':
        return {
          separator: ',',
          decimals: 0,
          duration: 2,
        };
    }
  };

  if (loading) {
    return (
      <div className="relative rounded-2xl overflow-hidden h-full">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/0 animate-pulse" />
        <div className="relative p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-14 h-14 rounded-full bg-white/10 animate-pulse" />
            <div className="w-20 h-6 bg-white/10 rounded animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="w-32 h-10 bg-white/10 rounded animate-pulse" />
            <div className="w-24 h-4 bg-white/10 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="relative group h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ 
        y: -8,
        scale: 1.02,
      }}
      transition={{ 
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1]
      }}
    >
      {/* Layer 1: 外发光（模糊光晕） */}
      <div
        className="absolute -inset-1 rounded-2xl blur-xl opacity-40 group-hover:opacity-80 transition-opacity duration-400"
        style={{
          background: colorGradients[color],
        }}
      />

      {/* Layer 2: 流动边框 */}
      <div className="absolute -inset-0.5 rounded-2xl overflow-hidden">
        <div
          className="absolute inset-0 animate-[border-flow_4s_linear_infinite]"
          style={{
            background: `linear-gradient(45deg, ${colorGradients[color]}, ${colorGradients[color]})`,
            backgroundSize: '300% 300%',
          }}
        />
        <div className="absolute inset-0.5 rounded-2xl bg-[#12121a]" />
      </div>

      {/* 主卡片 */}
      <div className="relative rounded-2xl overflow-hidden backdrop-blur-xl bg-gradient-to-br from-white/8 to-white/3 border border-white/10 p-6 h-full">
        {/* Layer 3: 内高光 */}
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent rounded-t-2xl pointer-events-none" />

        {/* 金属扫光效果 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg] animate-[shine-scan_3s_ease-in-out_infinite]" />
        </div>

        {/* 粒子效果 */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full animate-[particle-float_3s_ease-in-out_infinite]"
              style={{
                left: `${20 + i * 15}%`,
                top: `${30 + i * 10}%`,
                background: `radial-gradient(circle, ${color === 'blue' ? '#00d4ff' : '#f093fb'}, transparent)`,
                boxShadow: `0 0 10px ${color === 'blue' ? 'rgba(0,212,255,0.8)' : 'rgba(240,147,251,0.8)'}`,
                animationDelay: `${i * 0.5}s`,
              }}
            />
          ))}
        </div>

        {/* 内容 */}
        <div className="relative z-10">
          {/* 图标和趋势 */}
          <div className="flex items-center justify-between mb-6">
            {/* 渐变图标 */}
            {icon && (
              <motion.div
                className="w-14 h-14 rounded-full flex items-center justify-center relative overflow-hidden"
                style={{
                  background: colorGradients[color],
                  boxShadow: `0 0 30px ${color === 'blue' ? 'rgba(102,126,234,0.6)' : 'rgba(240,147,251,0.6)'}`,
                }}
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent" />
                <div className="relative z-10">{icon}</div>
              </motion.div>
            )}

            {/* 趋势指示器 */}
            {trend && trendValue && (
              <motion.div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-xl
                           ${trendColors[trend]} font-bold text-sm`}
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  boxShadow: trendShadows[trend],
                  border: `1px solid ${trend === 'up' ? 'rgba(0,255,136,0.3)' : 'rgba(255,0,128,0.3)'}`,
                }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
              >
                {trend === 'up' && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                {trend === 'down' && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                {trendValue}
              </motion.div>
            )}
          </div>

          {/* 数值 - 渐变霓虹文字 */}
          <motion.div
            className="mb-3"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <CountUp
              end={value}
              {...formatValue(value)}
              className="text-5xl font-black tracking-tight"
              style={{
                background: colorGradients[color],
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: `drop-shadow(0 0 20px ${color === 'blue' ? 'rgba(102,126,234,0.8)' : 'rgba(240,147,251,0.8)'})`,
              }}
            />
          </motion.div>

          {/* 标签 */}
          <div className="text-sm font-semibold text-gray-300 mb-1 tracking-wide uppercase">
            {title}
          </div>

          {/* 副标题 */}
          {subtitle && (
            <div className="text-xs text-gray-500 font-medium">
              {subtitle}
            </div>
          )}

          {/* 微型进度条 */}
          {progress !== undefined && (
            <motion.div
              className="mt-4 h-1.5 bg-black/30 rounded-full overflow-hidden"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              <motion.div
                className="h-full rounded-full relative overflow-hidden"
                style={{
                  background: colorGradients[color],
                  boxShadow: `0 0 15px ${color === 'blue' ? 'rgba(102,126,234,0.8)' : 'rgba(240,147,251,0.8)'}`,
                }}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ delay: 0.8, duration: 1, ease: 'easeOut' }}
              >
                {/* 流光效果 */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[progress-shine_2s_ease-in-out_infinite]" />
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

