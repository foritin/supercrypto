/**
 * SectionCard Component
 * 区块卡片组件 - 用于 Drawer 详情面板中的信息分组
 * 
 * 设计规范:
 * - 玻璃态背景 + 微妙边框
 * - 带图标的标题区域
 * - 支持 default/error 两种变体
 */
import React from 'react';

export interface SectionCardProps {
  /** 卡片标题 */
  title: string;
  /** 标题图标 */
  icon: React.ReactNode;
  /** 卡片内容 */
  children: React.ReactNode;
  /** 样式变体 */
  variant?: 'default' | 'error';
  /** 自定义类名 */
  className?: string;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  icon,
  children,
  variant = 'default',
  className,
}) => {
  const isError = variant === 'error';
  const borderColor = isError ? 'rgba(255, 77, 79, 0.2)' : 'var(--border-color)';
  const headerBg = isError ? 'rgba(255, 77, 79, 0.05)' : 'rgba(255, 255, 255, 0.02)';
  const iconColor = isError ? 'var(--color-error)' : 'var(--color-primary)';
  const titleColor = isError ? 'var(--color-error)' : 'var(--text-primary)';

  return (
    <div
      className={className}
      style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: `1px solid ${borderColor}`,
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        marginBottom: 'var(--spacing-lg)',
      }}
    >
      {/* 头部 */}
      <div
        style={{
          padding: 'var(--spacing-md) var(--spacing-lg)',
          background: headerBg,
          borderBottom: `1px solid ${borderColor}`,
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)',
        }}
      >
        <span style={{ color: iconColor }}>{icon}</span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: titleColor,
          }}
        >
          {title}
        </span>
      </div>
      {/* 内容 */}
      <div style={{ padding: 'var(--spacing-lg)' }}>{children}</div>
    </div>
  );
};

export default SectionCard;
