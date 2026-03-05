import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * GlassCard 组件 - 精致的磨砂玻璃卡片
 *
 * 设计规范 V2:
 * - 多层背景创造深度感
 * - 精致边框带顶部高光
 * - 动态光晕效果
 * - 增强的悬浮交互
 *
 * Validates: Requirements 7.1, 7.2, REQ-5, REQ-6
 */

// 动态光晕动画样式
const glowPulseAnimation = `
  @keyframes glow-pulse {
    0%, 100% {
      opacity: 0.4;
      transform: scale(1);
    }
    50% {
      opacity: 0.6;
      transform: scale(1.05);
    }
  }
`;

const glassCardVariants = cva(
  // 基础样式
  [
    'relative rounded-[20px] overflow-hidden',
    'transition-all duration-400',
    // 禁用默认的 before 伪元素，改用更精细的实现
  ],
  {
    variants: {
      /**
       * 变体类型
       * - default: 标准磨砂玻璃卡片
       * - elevated: 提升的卡片，更强的模糊和阴影
       * - stats: 统计数据栏样式
       */
      variant: {
        default: [
          'bg-[rgba(17,24,39,0.7)]',
          'backdrop-blur-[16px]',
          'border border-white/[0.08]',
        ],
        elevated: [
          'bg-[rgba(31,41,55,0.8)]',
          'backdrop-blur-[20px]',
          'border border-white/[0.1]',
          'shadow-[0_8px_40px_rgba(0,0,0,0.3)]',
        ],
        stats: [
          'bg-[rgba(255,255,255,0.05)]',
          'backdrop-blur-[12px]',
          'border border-white/[0.08]',
        ],
      },
      /**
       * 增强效果 - V2 新增
       * 启用更精致的玻璃态效果
       */
      enhanced: {
        true: [
          // 多层背景
          'bg-[linear-gradient(135deg,rgba(255,255,255,0.1)_0%,transparent_50%,rgba(255,255,255,0.05)_100%)]',
          'bg-[linear-gradient(180deg,rgba(17,24,39,0.9)_0%,rgba(17,24,39,0.7)_100%)]',
          // 增强模糊
          'backdrop-blur-[20px]',
          'saturate-[180%]',
          // 精致边框 - 顶部高光
          'border-t-white/[0.15]',
          'border-b-black/10',
          // 多层阴影
          'shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.1)]',
        ],
        false: [],
      },
      /**
       * Hover 效果 - 更新为新配色
       */
      hover: {
        true: [
          'hover:border-[var(--color-brand-primary)]/30',
          'hover:shadow-[0_20px_40px_rgba(0,102,255,0.15),0_0_0_1px_rgba(255,255,255,0.1)]',
          'hover:-translate-y-2',
          'hover:scale-[1.02]',
          // 平滑缓动
          'ease-[cubic-bezier(0.34,1.56,0.64,1)]',
        ],
        false: [],
      },
    },
    defaultVariants: {
      variant: 'default',
      enhanced: false,
      hover: true,
    },
  }
);

export interface GlassCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassCardVariants> {
  /** 是否显示背景光晕 */
  glow?: boolean;
  /** 光晕颜色 (CSS 颜色值) */
  glowColor?: string;
  /** 是否启用动态光晕动画 */
  animateGlow?: boolean;
  /** 子元素 */
  children?: React.ReactNode;
}

/**
 * GlassCard - 精致的磨砂玻璃卡片组件 V2
 *
 * @example
 * // 增强玻璃态效果
 * <GlassCard enhanced>内容</GlassCard>
 *
 * @example
 * // 带动态光晕
 * <GlassCard glow glowColor="rgba(0, 102, 255, 0.3)" animateGlow>内容</GlassCard>
 */
const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  (
    {
      className,
      variant,
      enhanced,
      hover,
      glow = false,
      glowColor = 'rgba(0, 102, 255, 0.3)',
      animateGlow = false,
      children,
      style,
      ...props
    },
    ref
  ) => {
    return (
      <>
        {/* 注入动画样式 */}
        <style>{glowPulseAnimation}</style>
        
        <div
          ref={ref}
          className={cn(glassCardVariants({ variant, enhanced, hover, className }))}
          style={style}
          {...props}
        >
          {/* 精致边框效果 - 伪元素实现 */}
          <div 
            className="absolute inset-0 rounded-[20px] pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(255,255,255,0.05) 100%)',
              mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              maskComposite: 'xor',
              WebkitMaskComposite: 'xor',
              padding: '1px',
            }}
          />

          {/* 背景光晕效果 (可选) */}
          {glow && (
            <div
              className={cn(
                "absolute -inset-4 -z-20 rounded-[24px] blur-[40px] pointer-events-none",
                animateGlow && "animate-[glow-pulse_4s_ease-in-out_infinite]"
              )}
              style={{ 
                backgroundColor: glowColor,
                opacity: animateGlow ? undefined : 0.5 
              }}
              aria-hidden="true"
            />
          )}

          {/* 内部高光 - 增强版 */}
          {enhanced && (
            <div 
              className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
            />
          )}

          {/* 内容区域 */}
          <div className="relative z-10 h-full">{children}</div>
        </div>
      </>
    );
  }
);

GlassCard.displayName = 'GlassCard';

export { GlassCard, glassCardVariants };
