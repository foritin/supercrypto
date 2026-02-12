'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * ════════════════════════════════════════════════════════════════
 * SCROLL REVEAL HOOK - 滚动触发动画
 * 用途: 当元素进入视口时触发动画
 * 使用: const { ref } = useScrollReveal();
 * ════════════════════════════════════════════════════════════════
 */

export function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // 一旦显示就停止观察
          observer.unobserve(element);
        }
      },
      {
        threshold: 0.1, // 元素 10% 可见时触发
        rootMargin: '0px 0px -50px 0px', // 提前触发
      }
    );

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, []);

  return { ref, isVisible };
}

/**
 * Hook for scroll reveal with delay support
 */
export function useScrollRevealDelay(delay: number = 0) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // 延迟显示
          setTimeout(() => {
            setIsVisible(true);
          }, delay);
          observer.unobserve(element);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [delay]);

  return { ref, isVisible };
}
