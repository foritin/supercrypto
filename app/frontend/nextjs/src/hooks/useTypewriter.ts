'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * ════════════════════════════════════════════════════════════════
 * TYPEWRITER HOOK - 纯 CSS 动画打字机效果
 * 用途: Hero 标题动态逐字显示，创造视觉焦点
 * 设计: 预渲染所有词，用 CSS class 控制显示，避免重绘回流
 * 使用: const { text, currentIndex, animationKey } = useTypewriter(['DeFi Yield', 'Staking Rewards', 'Smart Investing']);
 * ════════════════════════════════════════════════════════════════
 */

interface UseTypewriterOptions {
  /** 每个词的显示时间（毫秒），默认 3000 */
  wordDuration?: number;
  /** 是否循环，默认 true */
  loop?: boolean;
  /** 是否启用，默认 true */
  enabled?: boolean;
}

export const useTypewriter = (
  words: string[],
  options: UseTypewriterOptions = {}
) => {
  const {
    wordDuration = 3000,
    loop = true,
    enabled = true,
  } = options;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [animationKey, setAnimationKey] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || words.length === 0) return;

    // 移动端直接显示第一个词，不动画
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      setCurrentIndex(0);
      return;
    }

    // 纯定时器切换，不触发重绘
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % words.length;
        // 更新动画 key，触发 CSS 重新播放
        setAnimationKey((k) => k + 1);
        return next;
      });
    }, wordDuration);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [words, wordDuration, enabled, loop]);

  return {
    text: words[currentIndex] || '',
    currentIndex,
    animationKey,
    words,
  };
};

/**
 * 单次打字机效果（不循环）
 * 适用于一次性显示的文本
 */
export const useTypewriterOnce = (
  text: string,
  options: Omit<UseTypewriterOptions, 'loop'> = {}
) => {
  const { typeSpeed = 50, enabled = true } = options;
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!enabled || !text) {
      setDisplayText(text);
      setIsComplete(true);
      return;
    }

    let index = 0;
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
        setIsComplete(true);
      }
    }, typeSpeed);

    return () => clearInterval(interval);
  }, [text, typeSpeed, enabled]);

  return { text: displayText, isComplete };
};
