'use client';

import React from 'react';

interface EmptyStateProps {
  message: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  children?: React.ReactNode;
}

/**
 * 空状态组件
 * 显示友好的空数据提示，带浮动粒子动画
 * 支持 action 按钮或 children 自定义操作区
 */
export const EmptyState: React.FC<EmptyStateProps> = React.memo(function EmptyState({
  message,
  description,
  icon,
  action,
  children,
}) {
  return (
    <div
      className="flex flex-col items-center justify-center py-12 animate-fade-in"
    >
      {/* 图标或浮动粒子效果 */}
      <div className="relative mb-6">
        {icon ? (
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/40">
            {icon}
          </div>
        ) : (
          [...Array(3)].map((_, i) => (
            <span
              key={i}
              className="inline-block mx-2 text-4xl animate-bounce"
              style={{ animationDelay: `${i * 200}ms` }}
            >
              ✨
            </span>
          ))
        )}
      </div>

      <h3 className="text-xl font-semibold text-gray-300 mb-2">
        {message}
      </h3>
      
      {description && (
        <p className="text-sm text-gray-500 mb-6 text-center max-w-md">
          {description}
        </p>
      )}

      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 
                     to-blue-600 text-white font-medium
                     hover:shadow-lg hover:shadow-purple-500/50
                     hover:scale-105 active:scale-95
                     transition-all duration-300"
        >
          {action.label}
        </button>
      )}

      {children}
    </div>
  );
});
