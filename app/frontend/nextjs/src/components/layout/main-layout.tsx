"use client";

import { usePathname } from "next/navigation";
import { Suspense } from "react";
import type { ReactNode } from "react";

import { ContentWrapper } from "./content-wrapper";
import { Footer } from "./footer";
import { Header } from "./header";
import { PageSkeleton } from "./page-skeleton";
import { TriggeredLightFlow } from "./triggered-light-flow";
import { Web3Background } from "./web3-background";


/**
 * MainLayout - 渐进式渲染布局（使用 Tailwind CSS）
 *
 * 迁移说明：
 * - 替换 Ant Design Layout 为 Tailwind flex 布局
 * - 替换 Ant Design Content 为原生 main 元素
 * - 保留 Web3Background 和 TriggeredLightFlow 效果
 * - 保留 Suspense 边界和骨架屏
 *
 * 设计理念：
 * - Header 和 Footer 立即渲染（不需要等待任何数据）
 * - Content 区域通过 Suspense 边界包裹，配合页面的 loading.tsx 显示骨架屏
 * - Web3Background 在 Layout 层渲染一次，切换页面不重新初始化
 * - TriggeredLightFlow 仅在页面初次加载时短暂显示，避免误导用户
 * - 这样用户能更快看到页面框架，减少感知等待时间
 * - 首页特殊处理：hero section 需要从页面顶部开始，让视频背景延伸到透明 header 下面
 */
export function MainLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  return (
    <div className="flex flex-col min-h-screen">
      {/* Web3 粒子网络背景 - 只渲染一次，切换页面不重新初始化 */}
      <Web3Background
        excludePaths={["/"]}
        particleCount={60}
        linkDistance={150}
        mouseRadius={180}
      />

      {/* Header 立即渲染 */}
      <Header />

      {/* 触发式光流 - 仅在页面加载时显示一次 */}
      <TriggeredLightFlow trigger="page-load" duration={2500} />

      {/* Content 区域：使用 Suspense 边界，显示骨架屏 */}
      {/* 首页不需要 padding-top，让 hero section 从顶部开始，视频背景延伸到透明 header 下面 */}
      {/* 其他页面需要 padding-top 为固定定位的 Header 留出空间 */}
      <main
        className="flex-1 w-full"
        style={{
          paddingTop: isHomePage ? 0 : "calc(var(--header-height) + 24px)",
          paddingLeft: isHomePage ? 0 : 24,
          paddingRight: isHomePage ? 0 : 24,
          paddingBottom: isHomePage ? 0 : 24,
        }}
      >
        <Suspense fallback={<PageSkeleton variant="list" />}>
          <ContentWrapper>{children}</ContentWrapper>
        </Suspense>
      </main>

      {/* Footer 立即渲染 */}
      <Footer />
    </div>
  );
}
