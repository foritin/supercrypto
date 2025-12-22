'use client';

import React, { useEffect, useState } from 'react';

interface AnimatedNumberProps {
  value: number | string;
  format?: 'currency' | 'percentage' | 'number';
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  format = 'number',
  duration = 1000,
  className = '',
  prefix = '',
  suffix = ''
}) => {
  const [displayValue, setDisplayValue] = useState(
    typeof value === 'number' ? 0 : value
  );
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (typeof value === 'string') {
      setDisplayValue(value);
      return;
    }

    setIsAnimating(true);
    const startTime = Date.now();
    const startValue = displayValue as number;
    const changeValue = value - startValue;

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // 使用 easeOutCubic 缓动函数
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      const currentValue = startValue + (changeValue * easedProgress);

      if (progress < 1) {
        setDisplayValue(currentValue);
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
        setIsAnimating(false);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  const formatValue = (val: number | string) => {
    if (typeof val === 'string') return val;

    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('zh-CN', {
          style: 'currency',
          currency: 'CNY',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(val);
      case 'percentage':
        return `${val.toFixed(1)}%`;
      case 'number':
        return val.toLocaleString('zh-CN', {
          minimumFractionDigits: 0,
          maximumFractionDigits: val < 1 ? 4 : 2
        });
      default:
        return val.toString();
    }
  };

  return (
    <span
      className={`inline-block ${isAnimating ? 'transition-none' : ''} ${className}`}
      style={{
        fontVariantNumeric: 'tabular-nums'
      }}
    >
      {prefix}
      {formatValue(displayValue)}
      {suffix}
    </span>
  );
};