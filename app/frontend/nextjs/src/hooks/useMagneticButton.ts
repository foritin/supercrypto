'use client';

import { useEffect, useRef } from 'react';

/**
 * ════════════════════════════════════════════════════════════════
 * MAGNETIC BUTTON HOOK - 磁性按钮效果
 * 用途: 按钮在鼠标接近时轻微"吸附"，增强交互实体感
 * 使用: const buttonRef = useMagneticButton({ threshold: 100, strength: 0.3 });
 * ════════════════════════════════════════════════════════════════
 */

interface UseMagneticButtonOptions {
  /** 吸附范围（像素），默认 100 */
  threshold?: number;
  /** 磁力强度（0-1），默认 0.3 */
  strength?: number;
  /** 是否启用（移动端可禁用），默认 true */
  enabled?: boolean;
}

export const useMagneticButton = (options: UseMagneticButtonOptions = {}) => {
  const { threshold = 100, strength = 0.3, enabled = true } = options;
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const button = buttonRef.current;
    if (!button || !enabled) return;

    // 检测是否为移动设备
    const isMobile = window.innerWidth < 768;
    if (isMobile) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = button.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distanceX = e.clientX - centerX;
      const distanceY = e.clientY - centerY;
      const distance = Math.sqrt(distanceX ** 2 + distanceY ** 2);

      if (distance < threshold) {
        // 磁力强度随距离衰减
        const magnetStrength = ((threshold - distance) / threshold) * strength;
        const moveX = distanceX * magnetStrength;
        const moveY = distanceY * magnetStrength;

        button.style.transform = `translate(${moveX}px, ${moveY}px)`;
      }
    };

    const handleMouseLeave = () => {
      button.style.transform = 'translate(0, 0)';
    };

    // 使用文档级别监听，提前捕捉鼠标移动
    document.addEventListener('mousemove', handleMouseMove);
    button.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      button.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [threshold, strength, enabled]);

  return buttonRef;
};
