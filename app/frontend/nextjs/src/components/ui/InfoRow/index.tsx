/**
 * InfoRow Component
 * 信息行组件 - 用于显示 label: value 格式的信息
 * 
 * 设计规范:
 * - 左侧标签 + 右侧值
 * - 底部分隔线
 * - 支持自定义值颜色
 */
import React from 'react';

export interface InfoRowProps {
  /** 标签文本 */
  label: string;
  /** 值内容 */
  children: React.ReactNode;
  /** 是否显示底部边框 */
  showBorder?: boolean;
  /** 自定义类名 */
  className?: string;
}

export const InfoRow: React.FC<InfoRowProps> = ({
  label,
  children,
  showBorder = true,
  className,
}) => {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: 'var(--spacing-sm) 0',
        borderBottom: showBorder ? '1px solid rgba(255, 255, 255, 0.04)' : 'none',
      }}
    >
      <span
        style={{
          fontSize: 13,
          color: 'var(--text-muted)',
          flexShrink: 0,
          marginRight: 'var(--spacing-lg)',
        }}
      >
        {label}
      </span>
      <div
        style={{
          fontSize: 13,
          color: 'var(--text-primary)',
          textAlign: 'right',
          wordBreak: 'break-all',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default InfoRow;
