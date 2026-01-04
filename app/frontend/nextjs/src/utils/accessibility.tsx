/**
 * ════════════════════════════════════════════════════════════════
 * Accessibility Utilities
 * 无障碍辅助工具组件
 * ════════════════════════════════════════════════════════════════
 */

import { ReactNode } from 'react';

/**
 * VisuallyHidden - 视觉隐藏但屏幕阅读器可访问
 * 用于隐藏装饰性元素或提供额外上下文
 */
export function VisuallyHidden({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: '0',
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        borderWidth: '0',
      }}
    >
      {children}
    </span>
  );
}

/**
 * LiveRegion - 动态内容通知区域
 * 用于向屏幕阅读器通知内容变化
 */
export function LiveRegion({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <div
      id={id}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: '0',
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        borderWidth: '0',
      }}
    >
      {children}
    </div>
  );
}

/**
 * sr-only - Tailwind 风格的屏幕阅读器专用类
 * 仅屏幕阅读器可见，视觉隐藏
 */
export function SrOnly({ children }: { children: ReactNode }) {
  return <VisuallyHidden>{children}</VisuallyHidden>;
}
