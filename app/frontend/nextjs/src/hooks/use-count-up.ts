'use client';

import { useEffect, useState, useRef } from 'react';

/**
 * ════════════════════════════════════════════════════════════════
 * COUNT UP ANIMATION HOOK - 数字滚动动画
 * 用途: Stats Cards 数字从 0 滚动到目标值
 * 使用: const { count, ref } = useCountUp(2500000, { suffix: '+', duration: 2000 });
 * ════════════════════════════════════════════════════════════════
 */

interface UseCountUpOptions {
  /** 动画持续时间（毫秒），默认 2000 */
  duration?: number;
  /** 前缀（如 '$'） */
  prefix?: string;
  /** 后缀（如 '+'） */
  suffix?: string;
  /** 小数位数，默认 0 */
  decimals?: number;
  /** 是否使用缓动函数，默认 true */
  easing?: boolean;
  /** 触发阈值（0-1），默认 0.5 */
  threshold?: number;
}

export const useCountUp = (
  target: number,
  options: UseCountUpOptions = {}
) => {
  const {
    duration = 2000,
    prefix = '',
    suffix = '',
    decimals = 0,
    easing = true,
    threshold = 0.5,
  } = options;

  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [displayValue, setDisplayValue] = useState('0');
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  // 缓动函数 - easeOutExpo
  const easeOutExpo = (t: number): number => {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  };

  // 格式化数字（添加千分位）
  const formatNumber = (num: number): string => {
    const fixed = num.toFixed(decimals);
    const parts = fixed.split('.');
    const integerPart = parts[0] ?? '0';
    parts[0] = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  useEffect(() => {
    if (hasAnimated.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting && entry.intersectionRatio >= threshold && !hasAnimated.current) {
          setIsVisible(true);
          hasAnimated.current = true;
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  useEffect(() => {
    if (!isVisible || hasAnimated.current) return;

    let startTime: number | null = null;
    let animationFrameId: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // 应用缓动函数
      const easedProgress = easing ? easeOutExpo(progress) : progress;
      const currentCount = easedProgress * target;

      setCount(currentCount);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isVisible, target, duration, easing]);

  // 更新显示值
  useEffect(() => {
    setDisplayValue(`${prefix}${formatNumber(count)}${suffix}`);
  }, [count, prefix, suffix, decimals]);

  return { count: displayValue, ref };
};

/**
 * Hook for percentage-based count up animation
 * 百分比滚动动画
 */
export const usePercentCountUp = (
  target: number,
  options: Omit<UseCountUpOptions, 'suffix'> = {}
) => {
  const result = useCountUp(target, {
    ...options,
    suffix: '%',
    decimals: options.decimals ?? 1,
  });
  return result;
};
