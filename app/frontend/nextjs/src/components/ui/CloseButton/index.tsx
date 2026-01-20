/**
 * CloseButton Component
 * 关闭按钮组件 - 用于 Drawer/Modal 的关闭按钮
 * 
 * 设计规范:
 * - 32x32px 尺寸
 * - 圆角 8px
 * - 半透明背景 + hover 效果
 */
import React from 'react';
import { cn } from '@/utils/cn';

export interface CloseButtonProps {
  /** 点击回调 */
  onClick: () => void;
  /** 按钮尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 自定义类名 */
  className?: string;
  /** 自定义样式 */
  style?: React.CSSProperties;
}

const SIZE_MAP = {
  sm: { dimension: 'w-6 h-6', fontSize: 'text-xs' },
  md: { dimension: 'w-8 h-8', fontSize: 'text-sm' },
  lg: { dimension: 'w-10 h-10', fontSize: 'text-base' },
};

export const CloseButton: React.FC<CloseButtonProps> = React.memo(function CloseButton({
  onClick,
  size = 'md',
  className,
  style,
}) {
  const sizeConfig = SIZE_MAP[size];

  return (
    <button
      onClick={onClick}
      className={cn(
        sizeConfig.dimension,
        sizeConfig.fontSize,
        'border border-white/10 rounded-lg',
        'bg-white/5 text-white/50',
        'cursor-pointer flex items-center justify-center',
        'transition-all duration-150',
        'hover:bg-white/10 hover:border-white/20 hover:text-white/70',
        className
      )}
      style={style}
    >
      ✕
    </button>
  );
});

export default CloseButton;
