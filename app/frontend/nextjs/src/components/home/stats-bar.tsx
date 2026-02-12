'use client';

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * StatsBar 组件 - Hero 区域统计数据栏
 * 
 * 使用磨砂玻璃容器包裹统计数据
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
        // 磨砂玻璃容器样式 - Requirements: 1.2
        'inline-flex items-center justify-center gap-6 md:gap-10 lg:gap-14',
        'px-6 py-4 md:px-10 md:py-5',
        'bg-[rgba(255,255,255,0.05)] backdrop-blur-[10px]',
        'border border-white/10 rounded-2xl',
        // 响应式布局 - Requirements: 1.4
        'flex-col md:flex-row',
        className
      )}
    >
      {stats.map((stat, index) => (
        <React.Fragment key={stat.label}>
          {/* 分隔线 - 仅在非首项且桌面端显示 */}
          {index > 0 && (
            <div className="hidden md:block w-px h-10 bg-white/10" />
          )}
          
          {/* 统计项 */}
          <div className="flex items-baseline gap-2 md:gap-3">
            <span className="text-white/70 text-xs md:text-sm uppercase tracking-[1px] whitespace-nowrap">
              {stat.label}
            </span>
            <span
              ref={stat.ref as React.RefObject<HTMLSpanElement>}
              className="text-primary text-xl md:text-3xl font-bold font-numeric"
            >
              {stat.value}
            </span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}
