'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * ════════════════════════════════════════════════════════════════
 * TYPEWRITER HOOK - 打字机文字效果
 * 用途: Hero 标题动态逐字显示，创造视觉焦点
 * 使用: const { text, isComplete } = useTypewriter(['DeFi', 'Yield', 'Staking']);
 * ════════════════════════════════════════════════════════════════
 */

interface UseTypewriterOptions {
  /** 打字速度（毫秒/字符），默认 100 */
  typeSpeed?: number;
  /** 删除速度（毫秒/字符），默认 50 */
  deleteSpeed?: number;
  /** 停顿时间（毫秒），默认 2000 */
  pauseDuration?: number;
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
    typeSpeed = 100,
    deleteSpeed = 50,
    pauseDuration = 2000,
    loop = true,
    enabled = true,
  } = options;

  const [displayText, setDisplayText] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const currentWord = words[wordIndex] || '';

  useEffect(() => {
    if (!enabled || words.length === 0) return;

    // 移动端禁用复杂动画
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      setDisplayText(currentWord);
      setIsComplete(true);
      return;
    }

    const timeout = setTimeout(() => {
      if (isPaused) {
        setIsPaused(false);
        setIsDeleting(true);
        return;
      }

      if (isDeleting) {
        // 删除字符
        if (displayText.length > 0) {
          setDisplayText(currentWord.slice(0, displayText.length - 1));
        } else {
          // 删除完成，切换到下一个词
          setIsDeleting(false);
          if (loop) {
            setWordIndex((prev) => (prev + 1) % words.length);
            setIsPaused(true);
          } else {
            if (wordIndex >= words.length - 1) {
              setIsComplete(true);
            } else {
              setWordIndex((prev) => prev + 1);
              setIsPaused(true);
            }
          }
        }
      } else {
        // 打字
        if (displayText.length < currentWord.length) {
          setDisplayText(currentWord.slice(0, displayText.length + 1));
        } else {
          // 打字完成，暂停
          if (loop || wordIndex < words.length - 1) {
            setIsPaused(true);
          } else {
            setIsComplete(true);
          }
        }
      }
    }, isDeleting ? deleteSpeed : typeSpeed);

    // 如果暂停，设置额外的延迟
    if (isPaused) {
      const pauseTimeout = setTimeout(() => {
        setIsPaused(false);
      }, pauseDuration);
      return () => clearTimeout(pauseTimeout);
    }

    return () => clearTimeout(timeout);
  }, [
    displayText,
    currentWord,
    wordIndex,
    isDeleting,
    isPaused,
    words,
    typeSpeed,
    deleteSpeed,
    pauseDuration,
    loop,
    enabled,
  ]);

  return {
    text: displayText,
    isComplete,
    currentWord,
    wordIndex,
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
