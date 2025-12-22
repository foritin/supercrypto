"use client";

import { type ReactNode } from "react";

interface ContentWrapperProps {
  children: ReactNode;
}

/**
 * ContentWrapper - 内容区域包装器
 *
 * 设计理念（简化版）：
 * - 直接渲染 children，不做任何阻塞
 * - 骨架屏由 Next.js 的 loading.tsx 约定处理（Suspense fallback）
 * - i18n 有 fallback 机制，即使未完全加载也会显示默认语言
 * - 保持最小高度，避免 Footer 跳动
 *
 * 加载流程：
 * 1. SSR 返回 → Header/Footer 立即可见
 * 2. 水合开始 → Suspense 显示 loading.tsx 骨架屏
 * 3. 数据加载完成 → 显示真实内容
 */
export function ContentWrapper({ children }: ContentWrapperProps) {
  return (
    <div
      className="content-wrapper"
      style={{
        // 保持最小高度，避免 Footer 跳动
        minHeight: "calc(100vh - 64px - 100px)",
      }}
    >
      {children}
    </div>
  );
}





