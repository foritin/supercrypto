'use client';

/**
 * GOD_MODE 指示器组件
 * 
 * 在页面右下角显示 "🔓 GOD MODE" 徽章
 * 点击可展开显示绕过的权限列表
 * 
 * Requirements: 14.3, 14.6
 */

import { useState } from 'react';

import { useGodMode } from '@/hooks/use-god-mode';

export function GodModeIndicator() {
  const { enabled, bypassedPermissions } = useGodMode();
  const [isExpanded, setIsExpanded] = useState(false);

  // 未启用时不渲染
  if (!enabled) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      {/* 主徽章 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 77, 79, 0.9) 0%, rgba(255, 120, 50, 0.9) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 4px 20px rgba(255, 77, 79, 0.4)',
          color: '#ffffff',
        }}
        aria-label="GOD MODE 状态指示器"
        aria-expanded={isExpanded}
      >
        <span>🔓</span>
        <span>GOD MODE</span>
        <span className="text-xs opacity-80">{isExpanded ? '▼' : '▲'}</span>
      </button>

      {/* 展开的权限列表 */}
      {isExpanded && (
        <div
          className="absolute bottom-full right-0 mb-2 p-3 rounded-lg text-sm min-w-[200px]"
          style={{
            background: 'rgba(17, 25, 22, 0.95)',
            border: '1px solid rgba(255, 77, 79, 0.3)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
          }}
        >
          <div className="text-white/60 text-xs mb-2 uppercase tracking-wider">
            绕过的权限检查
          </div>
          <ul className="space-y-1">
            {bypassedPermissions.map((permission) => (
              <li
                key={permission}
                className="flex items-center gap-2 text-white/90"
              >
                <span className="text-primary">✓</span>
                <span className="capitalize">{permission}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 pt-2 border-t border-white/10 text-white/40 text-xs">
            ⚠️ 仅限开发环境
          </div>
        </div>
      )}
    </div>
  );
}
