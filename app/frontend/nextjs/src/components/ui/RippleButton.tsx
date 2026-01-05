'use client';

import React, { useState, useCallback } from 'react';
import { Button } from 'antd';
import type { ButtonProps } from 'antd';

/**
 * ════════════════════════════════════════════════════════════════
 * RIPPLE BUTTON - Material Design 波纹按钮
 * 用途: 为所有按钮添加点击波纹效果，增强交互反馈
 * 使用: <RippleButton type="primary">Click Me</RippleButton>
 * ════════════════════════════════════════════════════════════════
 */

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export const RippleButton: React.FC<ButtonProps> = ({
  children,
  className = '',
  ...props
}) => {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const addRipple = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();

    setRipples((prev) => [...prev, { id, x, y }]);

    // 600ms 后移除波纹
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 600);
  }, []);

  return (
    <Button
      {...props}
      className={`ripple-button ${className}`}
      onClick={addRipple}
      style={{ position: 'relative', overflow: 'hidden', ...props.style }}
    >
      {children}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="ripple-effect"
          style={{
            left: ripple.x,
            top: ripple.y,
          }}
        />
      ))}
    </Button>
  );
};
