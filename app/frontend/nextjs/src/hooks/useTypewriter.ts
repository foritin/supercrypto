'use client';

import { useState, useEffect, useRef } from 'react';

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
  const [isComplete, setIsComplete] = useState(false);

  // 使用 useRef 管理所有不会触发重渲染的状态
  const stateRef = useRef({
    wordIndex: 0,
    isDeleting: false,
    isPaused: false,
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wordsRef = useRef(words);
  const optionsRef = useRef({ typeSpeed, deleteSpeed, pauseDuration, loop });
  const displayTextRef = useRef(''); // 持久化当前显示的文本

  // 更新 refs
  useEffect(() => {
    wordsRef.current = words;
  }, [words]);

  useEffect(() => {
    optionsRef.current = { typeSpeed, deleteSpeed, pauseDuration, loop };
  }, [typeSpeed, deleteSpeed, pauseDuration, loop]);

  useEffect(() => {
    if (!enabled || words.length === 0) return;

    // 移动端禁用复杂动画
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      const text = words[0] || '';
      displayTextRef.current = text;
      setDisplayText(text);
      setIsComplete(true);
      return;
    }

    const step = () => {
      const state = stateRef.current;
      const currentWords = wordsRef.current;
      const currentWord = currentWords[state.wordIndex] || '';
      const opts = optionsRef.current;

      if (state.isPaused) {
        timeoutRef.current = setTimeout(() => {
          stateRef.current.isPaused = false;
          step();
        }, opts.pauseDuration);
        return;
      }

      if (state.isDeleting) {
        if (displayTextRef.current.length > 0) {
          // 删除最后一个字符
          displayTextRef.current = displayTextRef.current.slice(0, -1);
          setDisplayText(displayTextRef.current);
          timeoutRef.current = setTimeout(step, opts.deleteSpeed);
        } else {
          // 删除完成，切换到下一个词
          stateRef.current.isDeleting = false;
          stateRef.current.wordIndex = (state.wordIndex + 1) % currentWords.length;
          stateRef.current.isPaused = true;
          timeoutRef.current = setTimeout(step, 10);
        }
      } else {
        // 打字
        if (displayTextRef.current.length < currentWord.length) {
          // 添加下一个字符
          displayTextRef.current = currentWord.slice(0, displayTextRef.current.length + 1);
          setDisplayText(displayTextRef.current);
          timeoutRef.current = setTimeout(step, opts.typeSpeed);
        } else {
          // 打字完成，暂停
          if (opts.loop || state.wordIndex < currentWords.length - 1) {
            stateRef.current.isPaused = true;
            timeoutRef.current = setTimeout(() => {
              stateRef.current.isPaused = false;
              stateRef.current.isDeleting = true;
              step();
            }, opts.pauseDuration);
          } else {
            setIsComplete(true);
          }
        }
      }
    };

    step();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [words, enabled, loop]); // 只在 words 改变时重启

  return {
    text: displayText,
    isComplete,
    currentWord: words[stateRef.current.wordIndex] || '',
    wordIndex: stateRef.current.wordIndex,
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
