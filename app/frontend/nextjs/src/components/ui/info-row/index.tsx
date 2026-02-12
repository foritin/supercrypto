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
import { cn } from '@/utils/cn';

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

export const InfoRow: React.FC<InfoRowProps> = React.memo(function InfoRow({
  label,
  children,
  showBorder = true,
  className,
}) {
  return (
    <div
      className={cn(
        'flex justify-between items-start py-2',
        showBorder && 'border-b border-white/[0.04]',
        className
      )}
    >
      <span className="text-[13px] text-white/50 shrink-0 mr-4">
        {label}
      </span>
      <div className="text-[13px] text-white/90 text-right break-all">
        {children}
      </div>
    </div>
  );
});

export default InfoRow;
