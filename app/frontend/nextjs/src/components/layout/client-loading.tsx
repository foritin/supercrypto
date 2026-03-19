"use client";

import { useState, useEffect, type ReactNode } from "react";

import { useAppReady } from "@/providers/app-ready-provider";

interface ClientLoadingProps {
  children: ReactNode;
}

/**
 * 应用就绪检测组件
 *
 * 设计理念（重构版）：
 * - 全屏 loader 等待所有 provider 准备就绪，而不仅仅是水合
 * - 准备就绪包括：React 水合 + i18n 初始化
 * - 有平滑的淡出动画，避免闪烁
 * - 准备就绪后，由各页面的骨架屏接管数据加载状态
 */
export function ClientLoading({ children }: ClientLoadingProps) {
  const { isReady, isHydrated } = useAppReady();
  const [showLoader, setShowLoader] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (isReady) {
      // 准备就绪后，开始淡出动画
      setIsFadingOut(true);
      // 动画完成后移除 loader
      const timer = setTimeout(() => {
        setShowLoader(false);
      }, 400); // 与 CSS 动画时间匹配
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isReady]);

  // 水合完成前，隐藏渲染 children（防止水合不匹配）
  // 水合完成后但 provider 未就绪，显示 loader 和隐藏的 children
  // 完全就绪后，只显示 children

  return (
    <>
      {/* 全屏 Loader */}
      {showLoader && (
        <div className={`fullscreen-loader ${isFadingOut ? "loaded" : ""}`}>
          <div className="loader-content">
            <div className="loader-logo">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
                <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
                <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
                <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
              </svg>
            </div>
            <h1 className="loader-brand">SuperCrypto</h1>
            <div className="loader-spinner">
              <div className="spinner-ring" />
            </div>
          </div>
        </div>
      )}

      {/* Children 内容 */}
      {/* 水合前隐藏，水合后显示（可能在 loader 下方） */}
      <div
        style={{
          visibility: isHydrated ? "visible" : "hidden",
          opacity: isReady ? 1 : 0,
          transition: "opacity 0.3s ease-out",
        }}
      >
        {children}
      </div>
    </>
  );
}
