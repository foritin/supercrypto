import React from "react";

import { cn } from "@/lib/utils";

/**
 * PageBadge - 静态页面顶部徽章组件
 *
 * 用于 Security、FAQ、Partners、Terms、Privacy 等静态页面的标题区域，
 * 展示 icon + 文本 的主题色徽章。
 */

interface PageBadgeProps {
  /** 徽章图标 (Lucide React 图标元素) */
  icon: React.ReactNode;
  /** 徽章文本 */
  text: string;
  /** 额外的 className */
  className?: string;
}

export function PageBadge({ icon, text, className }: PageBadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-full",
        "bg-primary/10 border border-primary/20",
        className
      )}
    >
      <span className="[&>svg]:w-4 [&>svg]:h-4 text-primary">{icon}</span>
      <span className="text-sm text-primary font-medium">{text}</span>
    </div>
  );
}
