"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { Web3Provider } from "./web3-provider";
import { I18nProvider } from "./i18n-provider";
import { AppReadyProvider } from "./app-ready-provider";
import { GodModeIndicator } from "@/components/dev/god-mode-indicator";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <Web3Provider>
        {/* AppReadyProvider 需要在 I18nProvider 内部，以检测 i18n 状态 */}
        <AppReadyProvider>{children}</AppReadyProvider>
        {/* GOD_MODE 指示器 - 仅在开发环境且启用时显示 */}
        <GodModeIndicator />
        {/* Sonner Toaster - Web3 主题配置 */}
        <Toaster
          position="top-right"
          offset={80}
          toastOptions={{
            // 基础样式 - 匹配 Web3 深色主题
            style: {
              background: "rgba(17, 25, 22, 0.95)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#ffffff",
              backdropFilter: "blur(12px)",
            },
            // 类型特定样式通过 classNames 处理
            classNames: {
              success: 'bg-[rgba(0,212,170,0.1)] border-[rgba(0,212,170,0.3)] text-[#00D4AA]',
              error: 'bg-[rgba(255,77,79,0.1)] border-[rgba(255,77,79,0.3)] text-[#FF4D4F]',
              warning: 'bg-[rgba(255,215,0,0.1)] border-[rgba(255,215,0,0.3)] text-[#FFD700]',
              info: 'bg-[rgba(24,144,255,0.1)] border-[rgba(24,144,255,0.3)] text-[#1890FF]',
            },
          }}
        />
      </Web3Provider>
    </I18nProvider>
  );
}

export { Web3Provider } from "./web3-provider";
export { I18nProvider, i18n } from "./i18n-provider";
export { AppReadyProvider, useAppReady } from "./app-ready-provider";
