'use client';

import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

/**
 * ════════════════════════════════════════════════════════════════
 * Loading Components - 统一加载组件
 *
 * 提供多种加载状态展示方式
 * - Loading: 旋转图标 + 可选文本
 * - Skeleton: 骨架屏占位符
 * ════════════════════════════════════════════════════════════════
 */

interface LoadingProps {
  size?: 'small' | 'default' | 'large';
  variant?: 'gold' | 'cyan' | 'default';
  text?: string;
  fullscreen?: boolean;
  className?: string;
}

const sizeMap = {
  small: 24,
  default: 40,
  large: 56,
};

const variantStyles: Record<string, string> = {
  gold: 'text-[#c9a962]',
  cyan: 'text-[#00d4aa]',
  default: 'text-white',
};

/**
 * Loading - 旋转加载指示器
 *
 * @example
 * <Loading variant="cyan" text="加载中..." />
 * <Loading fullscreen size="large" variant="gold" />
 */
export function Loading({
  size = 'default',
  variant = 'cyan',
  text,
  fullscreen = false,
  className,
}: LoadingProps) {
  const pixelSize = sizeMap[size];

  const content = (
    <motion.div
      className={cn(
        'flex flex-col items-center justify-center gap-4',
        fullscreen && 'fixed inset-0 z-50 bg-[#0a0f0d]',
        className
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
      >
        <Loader2
          width={pixelSize}
          height={pixelSize}
          className={cn(variantStyles[variant])}
        />
      </motion.div>

      {text && (
        <motion.p
          className={cn('text-sm', variantStyles[variant])}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {text}
        </motion.p>
      )}
    </motion.div>
  );

  return content;
}

interface SkeletonProps {
  className?: string;
  variant?: 'gold' | 'cyan' | 'default';
  width?: string | number;
  height?: string | number;
}

/**
 * Skeleton - 骨架屏占位符
 * 用于内容加载时的占位显示，提供更好的感知性能
 *
 * @example
 * <Skeleton className="h-32 w-full" variant="gold" />
 * <Skeleton width={200} height={40} />
 */
export function Skeleton({
  className,
  variant = 'default',
  width,
  height,
}: SkeletonProps) {
  const variantStyles = {
    gold: 'bg-gradient-to-r from-amber-500/20 via-yellow-400/30 to-amber-500/20',
    cyan: 'bg-gradient-to-r from-teal-500/20 via-cyan-400/30 to-teal-500/20',
    default: 'bg-gradient-to-r from-white/5 via-white/10 to-white/5',
  };

  return (
    <motion.div
      className={cn(
        'rounded-lg',
        variantStyles[variant],
        className
      )}
      style={{ width, height }}
      animate={{
        backgroundPosition: ['200% 0', '-200% 0'],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'linear',
      }}
      style={{
        backgroundSize: '200% 100%',
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      } as any}
      role="status"
      aria-label="加载中"
    >
      <span className="sr-only">Loading...</span>
    </motion.div>
  );
}

/**
 * DashboardSkeleton - 仪表板骨架屏
 * 预配置的仪表板加载状态
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* 统计卡片骨架 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className="premium-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Skeleton variant="gold" className="w-10 h-10" />
              <Skeleton className="flex-1 h-4" />
            </div>
            <Skeleton className="h-8 w-3/4" variant="cyan" />
          </motion.div>
        ))}
      </div>

      {/* 图表骨架 */}
      <motion.div
        className="premium-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Skeleton className="h-12 w-48 mb-4" />
        <Skeleton className="h-64 w-full" variant="gold" />
      </motion.div>

      {/* 列表骨架 */}
      <motion.div
        className="premium-card space-y-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="w-10 h-10" variant="cyan" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
