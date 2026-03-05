import React from 'react';

import { cn } from '@/utils/cn';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  blur?: 'sm' | 'md' | 'lg';
  hover?: boolean;
}

// 模糊度映射到 CSS 值
const blurValues = {
  sm: '8px',
  md: '12px',
  lg: '20px'
};

export const GlassCard: React.FC<GlassCardProps> = React.memo(function GlassCard({
  children,
  className,
  glow = false,
  blur = 'md',
  hover = true
}) {
  return (
    <div
      className={cn(
        'relative rounded-xl',
        hover && 'transition-all duration-300',
        className
      )}
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: `blur(${blurValues[blur]})`,
        border: '1px solid var(--glass-border)',
        boxShadow: glow 
          ? 'var(--shadow-glow), var(--shadow-lg)' 
          : 'var(--shadow-lg)',
        borderRadius: 'var(--radius-xl)',
      }}
    >
      {/* 渐变覆盖层 */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          borderRadius: 'var(--radius-xl)',
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, transparent 50%, transparent 100%)',
        }}
      />

      {/* 发光效果（可选） */}
      {glow && (
        <div 
          className="absolute -inset-px opacity-50"
          style={{
            borderRadius: 'var(--radius-xl)',
            background: 'linear-gradient(135deg, rgba(0, 212, 170, 0.2) 0%, rgba(0, 160, 128, 0.15) 50%, rgba(0, 212, 170, 0.1) 100%)',
            filter: 'blur(4px)',
          }}
        />
      )}

      {/* 内容 */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
});
