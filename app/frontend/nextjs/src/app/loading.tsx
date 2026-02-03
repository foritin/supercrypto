"use client";

import { EnhancedLoading } from "@/components/ui/enhanced-loading";

/**
 * 全局加载页面
 * 在页面切换或初始加载时显示
 * 
 * 可选风格:
 * - "blockchain" - 区块链节点脉冲动画，强调技术感
 * - "asset" - 资产卡片浮现动画，强调RWA资产（默认推荐）
 * - "flow" - 流动数据动画，强调速度和科技感
 * - "minimal" - 简约脉冲动画，最轻量级
 */
export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-transparent">
      <EnhancedLoading 
        variant="asset"  // 推荐: 对于RWA平台使用 "asset" 风格
        showLogo={true}
      />
    </div>
  );
}
