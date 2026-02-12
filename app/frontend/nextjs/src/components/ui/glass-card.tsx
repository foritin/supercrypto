import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * GlassCard 组件 - 统一的磨砂玻璃卡片
 *
 * 设计规范:
 * - 基础样式: 圆角 20px, 半透明背景, backdrop-filter blur
 * - 渐变描边: 通过伪元素实现光照效果
 * - Hover 效果: 边框高亮 + 阴影增强
 *
 * Validates: Requirements 7.1, 7.2
 */
const glassCardVariants = cva(
  // 基础样式
  [
    'relative rounded-[20px] overflow-hidden',
    'transition-all duration-300',
    // 渐变描边 (通过伪元素实现)
    'before:absolute before:inset-0 before:rounded-[20px] before:p-[1px]',
    'before:bg-gradient-to-br before:from-white/20 before:via-white/5 before:to-transparent',
    'before:-z-10',
    // 兜底方案: 不支持 backdrop-filter 时使用纯色背景
    'supports-[backdrop-filter]:backdrop-blur-[12px]',
  ],
  {
    variants: {
      /**
       * 变体类型
       * - default: 标准磨砂玻璃卡片 (Requirements 7.1)
       * - elevated: 提升的卡片，更强的模糊和阴影
       * - stats: 统计数据栏样式，更轻量的背景
       */
      variant: {
        default: [
          'bg-[rgba(20,20,20,0.6)]',
          'backdrop-blur-[12px]',
          'shadow-[0_4px_30px_rgba(0,0,0,0.1)]',
          'border border-white/[0.08]',
        ],
        elevated: [
          'bg-[rgba(26,36,30,0.7)]',
          'backdrop-blur-[16px]',
          'shadow-[0_8px_40px_rgba(0,0,0,0.2)]',
          'border border-white/[0.08]',
        ],
        stats: [
          'bg-[rgba(255,255,255,0.05)]',
          'backdrop-blur-[10px]',
          'border border-white/10',
        ],
      },
      /**
       * Hover 效果 (Requirements 7.2)
       * - true: 启用边框高亮和阴影增强
       * - false: 禁用 hover 效果
       */
      hover: {
        true: [
          'hover:border-primary/30',
          'hover:shadow-[0_0_40px_rgba(0,212,170,0.12)]',
          'hover:before:from-[rgba(0,212,170,0.3)] hover:before:via-white/10',
        ],
        false: [],
      },
    },
    defaultVariants: {
      variant: 'default',
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
  /** 子元素 */
  children?: React.ReactNode;
}

/**
 * GlassCard - 磨砂玻璃卡片组件
 *
 * @example
 * // 默认样式
 * <GlassCard>内容</GlassCard>
 *
 * @example
 * // 统计数据栏样式
 * <GlassCard variant="stats">统计数据</GlassCard>
 *
 * @example
 * // 带光晕效果
 * <GlassCard glow glowColor="rgba(0, 212, 170, 0.3)">内容</GlassCard>
 *
 * @example
 * // 禁用 hover 效果
 * <GlassCard hover={false}>静态卡片</GlassCard>
 */
const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  (
    {
      className,
      variant,
      hover,
      glow = false,
      glowColor = 'rgba(0, 212, 170, 0.3)',
      children,
      style,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(glassCardVariants({ variant, hover, className }))}
        style={style}
        {...props}
      >
        {/* 背景光晕效果 (可选) */}
        {glow && (
          <div
            className="absolute -inset-4 -z-20 rounded-[24px] opacity-50 blur-[40px] pointer-events-none"
            style={{ backgroundColor: glowColor }}
            aria-hidden="true"
          />
        )}

        {/* 内容区域 */}
        <div className="relative z-10">{children}</div>
      </div>
    );
  }
);

GlassCard.displayName = 'GlassCard';

export { GlassCard, glassCardVariants };
