"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";

import { GodModeIndicator } from "@/components/dev/god-mode-indicator";

import { AppReadyProvider } from "./app-ready-provider";
import { I18nProvider } from "./i18n-provider";
import { QueryProvider } from "./query-provider";
import { Web3Provider } from "./web3-provider";


export function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <QueryProvider>
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
                success: 'bg-primary/10 border-primary/30 text-primary',
                error: 'bg-error/10 border-error/30 text-error',
                warning: 'bg-gold/10 border-gold/30 text-gold',
                info: 'bg-info/10 border-info/30 text-info',
              },
            }}
          />
        </Web3Provider>
      </QueryProvider>
    </I18nProvider>
  );
}

export { Web3Provider } from "./web3-provider";
export { I18nProvider, i18n } from "./i18n-provider";
export { AppReadyProvider, useAppReady } from "./app-ready-provider";
export { QueryProvider } from "./query-provider";
