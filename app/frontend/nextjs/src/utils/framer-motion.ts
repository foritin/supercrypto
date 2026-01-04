/**
 * ════════════════════════════════════════════════════════════════
 * Framer Motion Accessibility Config
 *
 * 全局配置 Framer Motion 以支持 prefers-reduced-motion
 * - 检测系统动画偏好设置
 * - 为所有 motion 组件提供统一的默认值
 * - 保持无障碍合规性
 * ════════════════════════════════════════════════════════════════
 */

import { MotionConfig } from 'framer-motion';

/**
 * 检测用户是否偏好减少动画
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * 获取安全的动画默认值
 * 根据用户偏好返回适当的过渡配置
 */
export function getSafeTransition() {
  const reduced = prefersReducedMotion();

  return {
    type: 'tween' as const,
    ease: 'easeInOut' as const,
    duration: reduced ? 0 : 0.3,
  };
}

/**
 * Framer Motion 全局配置组件
 * 包装整个应用以启用无障碍动画
 *
 * @example
 * <MotionAccessibilityConfig>
 *   <App />
 * </MotionAccessibilityConfig>
 */
export function MotionAccessibilityConfig({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MotionConfig
      transition={{
        type: 'tween',
        ease: 'easeInOut',
        duration: prefersReducedMotion() ? 0 : 0.3,
      }}
    >
      {children}
    </MotionConfig>
  );
}

/**
 * 动画预设 - 常用动画的安全变体
 */
export const safeAnimations = {
  /**
   * 淡入动画
   */
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: getSafeTransition(),
  },

  /**
   * 滑入动画
   */
  slideIn: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: getSafeTransition(),
  },

  /**
   * 缩放动画
   */
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    transition: getSafeTransition(),
  },

  /**
   * 悬停效果（仅在非 reduced motion 时）
   */
  hover: {
    whileHover: prefersReducedMotion()
      ? undefined
      : { scale: 1.05, transition: { duration: 0.2 } },
    whileTap: prefersReducedMotion()
      ? undefined
      : { scale: 0.95, transition: { duration: 0.1 } },
  },

  /**
   * 交错动画（用于列表）
   */
  staggerContainer: {
    animate: {
      transition: {
        staggerChildren: prefersReducedMotion() ? 0 : 0.1,
      },
    },
  },

  staggerItem: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: getSafeTransition(),
  },
};

/**
 * 监听 prefers-reduced-motion 变化
 *
 * @example
 * useEffect(() => {
 *   const cleanup = listenToReducedMotionChange((prefersReduced) => {
 *     console.log('Motion preference changed:', prefersReduced);
 *   });
 *   return cleanup;
 * }, []);
 */
export function listenToReducedMotionChange(
  callback: (prefersReduced: boolean) => void
): () => void {
  if (typeof window === 'undefined') {
    // 返回空清理函数
    return () => {};
  }

  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  // 现代浏览器使用 addEventListener
  const handleChange = (event: MediaQueryListEvent) => {
    callback(event.matches);
  };

  // 检查是否支持 addEventListener（现代浏览器）
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }

  // 旧浏览器回退（已弃用但仍然工作）
  mediaQuery.addListener(handleChange);
  return () => mediaQuery.removeListener(handleChange);
}
