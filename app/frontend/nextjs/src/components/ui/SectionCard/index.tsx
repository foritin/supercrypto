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
import { cn } from '@/lib/utils';

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

  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden mb-4',
        'bg-white/[0.02]',
        isError ? 'border border-red-500/20' : 'border border-white/[0.06]',
        className
      )}
    >
      {/* 头部 */}
      <div
        className={cn(
          'px-4 py-3 flex items-center gap-2',
          isError ? 'bg-red-500/5 border-b border-red-500/20' : 'bg-white/[0.03] border-b border-white/[0.06]'
        )}
      >
        <span className={isError ? 'text-red-400' : 'text-[#00D4AA]'}>{icon}</span>
        <span className="text-[13px] font-semibold text-white/90">
          {title}
        </span>
      </div>
      {/* 内容 */}
      <div className="p-4">{children}</div>
    </div>
  );
};

export default SectionCard;
