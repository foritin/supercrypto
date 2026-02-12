'use client';

import { useEffect, useState } from 'react';

/**
 * ════════════════════════════════════════════════════════════════
 * MOUSE PARALLAX HOOK - 鼠标视差效果
 * 用途: Hero 区域光球跟随鼠标移动，创造 3D 深度感
 * 使用: const { offset } = useMouseParallax(0.03);
 * ════════════════════════════════════════════════════════════════
 */

interface UseMouseParallaxOptions {
  /** 视差强度，默认 0.03 */
  intensity?: number;
  /** 是否启用（移动端可禁用），默认 true */
  enabled?: boolean;
}

export const useMouseParallax = (options: UseMouseParallaxOptions = {}) => {
  const { intensity = 0.03, enabled = true } = options;
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!enabled) return;

    // 检测是否为移动设备
    const isMobile = window.innerWidth < 768;
    if (isMobile) return;

    const handleMouseMove = (e: MouseEvent) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const moveX = (e.clientX - centerX) * intensity;
      const moveY = (e.clientY - centerY) * intensity;

      // 使用 requestAnimationFrame 优化性能
      requestAnimationFrame(() => {
        setOffset({ x: moveX, y: moveY });
      });
    };

    // 节流处理，避免频繁计算
    let ticking = false;
    const throttledHandle = (e: MouseEvent) => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleMouseMove(e);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('mousemove', throttledHandle);

    return () => {
      window.removeEventListener('mousemove', throttledHandle);
    };
  }, [intensity, enabled]);

  return { offset };
};

/**
 * Hook for card 3D tilt effect on mouse move
 * 卡片 3D 倾斜效果 - 鼠标悬停时卡片跟随倾斜
 */
export const useCardTilt = () => {
  const [transform, setTransform] = useState('');
  const [glowPosition, setGlowPosition] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // 计算旋转角度（最大 ±5deg）
    const rotateX = ((y - centerY) / centerY) * -5;
    const rotateY = ((x - centerX) / centerX) * 5;

    // 计算光晕位置
    const glowX = (x / rect.width) * 100;
    const glowY = (y / rect.height) * 100;

    setTransform(
      `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`
    );
    setGlowPosition({ x: glowX, y: glowY });
  };

  const handleMouseLeave = () => {
    setTransform('perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)');
    setGlowPosition({ x: 50, y: 50 });
  };

  return { transform, glowPosition, handleMouseMove, handleMouseLeave };
};
