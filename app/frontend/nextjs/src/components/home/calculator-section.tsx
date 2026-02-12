'use client';

import React from 'react';
import { Check, Sparkles, Shield, Clock } from 'lucide-react';
import { YieldCalculator } from '@/components/calculator/yield-calculator';
import { cn } from '@/lib/utils';

/**
 * CalculatorSection 组件 - 左右分栏的计算器区域
 * 
 * 布局: 左侧文案区 + 右侧计算器
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

interface Checkpoint {
  icon: React.ReactNode;
  text: string;
}

const CHECKPOINTS: Checkpoint[] = [
  { icon: <Shield className="w-4 h-4" />, text: 'No hidden fees' },
  { icon: <Clock className="w-4 h-4" />, text: 'Instant withdrawal' },
  { icon: <Sparkles className="w-4 h-4" />, text: 'Daily compounding' },
  { icon: <Check className="w-4 h-4" />, text: 'Fully transparent' },
];

interface CalculatorSectionProps {
  title?: string;
  subtitle?: string;
  className?: string;
}

export function CalculatorSection({
  title = 'Calculate Your Future Wealth',
  subtitle = 'See how compound interest grows your stablecoin portfolio over time.',
  className,
}: CalculatorSectionProps) {
  return (
    <div
      className={cn(
        // Split Layout - Requirements: 4.1
        'grid gap-12',
        // 桌面端: 左右分栏
        'lg:grid-cols-2 lg:gap-16',
        // 移动端: 垂直堆叠 - Requirements: 4.4
        'grid-cols-1',
        'items-center',
        className
      )}
    >
      {/* 左侧文案区 - Requirements: 4.2 */}
      <div className="text-left lg:pr-8">
        {/* 标签 */}
        <span className="inline-flex items-center gap-2 text-gold text-sm font-semibold tracking-[2px] uppercase mb-6">
          <Sparkles className="w-4 h-4" />
          Calculate Your Earnings
        </span>

        {/* 大标题 */}
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
          {title}
        </h2>

        {/* 副标题 */}
        <p className="text-lg text-white/65 mb-10 leading-relaxed max-w-[500px]">
          {subtitle}
        </p>

        {/* Checkpoints */}
        <div className="grid grid-cols-2 gap-4">
          {CHECKPOINTS.map((checkpoint, index) => (
            <div
              key={index}
              className="flex items-center gap-3 text-white/80"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
                {checkpoint.icon}
              </div>
              <span className="text-sm font-medium">{checkpoint.text}</span>
            </div>
          ))}
        </div>

        {/* 额外信息 */}
        <div className="mt-10 pt-8 border-t border-white/10">
          <p className="text-white/50 text-sm">
            * APY rates are variable and subject to market conditions. Past performance does not guarantee future results.
          </p>
        </div>
      </div>

      {/* 右侧计算器 - Requirements: 4.3 */}
      <div className="relative">
        {/* 背景光晕 - Requirements: 4.7 */}
        <div className="glow-orb absolute -top-20 -right-20 w-[400px] h-[400px] bg-primary/15" />
        <div className="glow-orb absolute -bottom-10 -left-10 w-[300px] h-[300px] bg-gold/10" />
        
        {/* 计算器组件 */}
        <div className="relative z-10">
          <YieldCalculator />
        </div>
      </div>
    </div>
  );
}
