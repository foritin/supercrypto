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
  sm: 24,
  md: 32,
  lg: 40,
};

export const CloseButton: React.FC<CloseButtonProps> = ({
  onClick,
  size = 'md',
  className,
  style,
}) => {
  const dimension = SIZE_MAP[size];

  return (
    <button
      onClick={onClick}
      className={className}
      style={{
        width: dimension,
        height: dimension,
        border: '1px solid var(--border-color-light)',
        borderRadius: 'var(--radius-md)',
        background: 'rgba(255, 255, 255, 0.05)',
        color: 'var(--text-tertiary)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'var(--transition-fast)',
        fontSize: size === 'sm' ? 12 : size === 'lg' ? 16 : 14,
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        e.currentTarget.style.color = 'var(--text-secondary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
        e.currentTarget.style.borderColor = 'var(--border-color-light)';
        e.currentTarget.style.color = 'var(--text-tertiary)';
      }}
    >
      ✕
    </button>
  );
};

export default CloseButton;
