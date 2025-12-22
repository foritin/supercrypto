import React from 'react';
import { cn } from '@/utils/cn';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  blur?: 'sm' | 'md' | 'lg';
  hover?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  glow = false,
  blur = 'md',
  hover = true
}) => {
  const blurMap = {
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-lg'
  };

  return (
    <div
      className={cn(
        'relative rounded-xl border border-white/10',
        'bg-slate-900/60 shadow-2xl',
        blurMap[blur],
        glow && 'shadow-indigo-500/20',
        hover && 'transition-all duration-300 hover:border-white/20 hover:shadow-xl',
        className
      )}
    >
      {/* 渐变覆盖层 */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />

      {/* 发光效果（可选） */}
      {glow && (
        <div className="absolute -inset-px rounded-xl bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 blur-sm opacity-50" />
      )}

      {/* 内容 */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};