'use client';

import React, { useState, useCallback, forwardRef } from 'react';

import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * ════════════════════════════════════════════════════════════════
 * RIPPLE BUTTON - Material Design 波纹按钮
 * 用途: 为所有按钮添加点击波纹效果，增强交互反馈
 * 使用: <RippleButton variant="default">Click Me</RippleButton>
 * ════════════════════════════════════════════════════════════════
 */

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export interface RippleButtonProps extends ButtonProps {
  children?: React.ReactNode;
}

export const RippleButton = forwardRef<HTMLButtonElement, RippleButtonProps>(
  ({ children, className, onClick: originalOnClick, ...props }, ref) => {
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

      // 调用原始的 onClick 处理函数
      if (originalOnClick) {
        originalOnClick(e);
      }
    }, [originalOnClick]);

    return (
      <Button
        ref={ref}
        {...props}
        className={cn('ripple-button relative overflow-hidden', className)}
        onClick={addRipple}
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
  }
);

RippleButton.displayName = 'RippleButton';
