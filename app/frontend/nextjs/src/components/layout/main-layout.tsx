"use client";

import { Layout } from "antd";
import { Suspense } from "react";
import { Header } from "./header";
import { Footer } from "./footer";
import { ContentWrapper } from "./content-wrapper";
import { PageSkeleton } from "./page-skeleton";
import { Web3Background } from "./web3-background";
import { TriggeredLightFlow } from "./TriggeredLightFlow";
import type { ReactNode } from "react";

const { Content } = Layout;

/**
 * MainLayout - 渐进式渲染布局
 *
 * 设计理念：
 * - Header 和 Footer 立即渲染（不需要等待任何数据）
 * - Content 区域通过 Suspense 边界包裹，配合页面的 loading.tsx 显示骨架屏
 * - Web3Background 在 Layout 层渲染一次，切换页面不重新初始化
 * - TriggeredLightFlow 仅在页面初次加载时短暂显示，避免误导用户
 * - 这样用户能更快看到页面框架，减少感知等待时间
 */
export function MainLayout({ children }: { children: ReactNode }) {
  return (
    <Layout style={{ minHeight: "100vh" }}>
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
      {/* padding-top 需要为固定定位的 Header 留出空间 */}
      <Content style={{ padding: "24px", paddingTop: "calc(var(--header-height) + 24px)" }}>
        <Suspense fallback={<PageSkeleton variant="list" />}>
          <ContentWrapper>{children}</ContentWrapper>
        </Suspense>
      </Content>

      {/* Footer 立即渲染 */}
      <Footer />
    </Layout>
  );
}
