'use client';

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * StatsBar 组件 - Hero 区域统计数据栏
 * 
 * 使用磨砂玻璃容器包裹统计数据
 * 配色方案: 古铜金色数值 + 精致玻璃态背景
 * Requirements: 1.2, 1.4
 */

export interface StatItem {
  label: string;
  value: string;
  ref?: React.RefObject<HTMLSpanElement | HTMLDivElement | null>;
}

interface StatsBarProps {
  stats: StatItem[];
  className?: string;
}

export function StatsBar({ stats, className }: StatsBarProps) {
  return (
    <div
      className={cn(
        // 精致玻璃态容器 - 带有渐变背景
        'inline-flex items-center justify-center gap-6 md:gap-10 lg:gap-14',
        'px-6 py-4 md:px-10 md:py-5',
        'bg-gradient-to-r from-[rgba(0,102,255,0.08)] via-[rgba(212,175,55,0.05)] to-[rgba(0,201,167,0.08)]',
        'backdrop-blur-[16px]',
        'border border-white/[0.12] rounded-2xl',
        // 内阴影增加层次感
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-1px_0_rgba(0,0,0,0.1)]',
        // 响应式布局 - Requirements: 1.4
        'flex-col md:flex-row',
        className
      )}
    >
      {stats.map((stat, index) => (
        <React.Fragment key={stat.label}>
          {/* 分隔线 - 带有渐变效果 */}
          {index > 0 && (
            <div className="hidden md:block w-px h-10 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
          )}
          
          {/* 统计项 */}
          <div className="flex items-baseline gap-2 md:gap-3">
            {/* 标签 - 精致的小写字体 */}
            <span className="text-white/50 text-[10px] md:text-xs uppercase tracking-[0.15em] whitespace-nowrap font-medium">
              {stat.label}
            </span>
            
            {/* 数值 - 古铜金色 + Playfair Display + 光晕 */}
            <span
              ref={stat.ref as React.RefObject<HTMLSpanElement>}
              className={cn(
                'font-display text-xl md:text-3xl lg:text-4xl font-semibold',
                'text-[#D4AF37]',  // 古铜金色
                'drop-shadow-[0_0_15px_rgba(212,175,55,0.4)]',  // 金色光晕
                'tracking-tight'
              )}
            >
              {stat.value}
            </span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}
