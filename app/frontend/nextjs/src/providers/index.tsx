"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { Web3Provider } from "./web3-provider";
import { I18nProvider } from "./i18n-provider";
import { AppReadyProvider } from "./app-ready-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <Web3Provider>
        {/* AppReadyProvider 需要在 I18nProvider 内部，以检测 i18n 状态 */}
        <AppReadyProvider>{children}</AppReadyProvider>
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
            // 成功消息样式
            success: {
              style: {
                background: "rgba(0, 212, 170, 0.1)",
                border: "1px solid rgba(0, 212, 170, 0.3)",
                color: "#00D4AA",
              },
            },
            // 错误消息样式
            error: {
              duration: 5000,
              style: {
                background: "rgba(255, 77, 79, 0.1)",
                border: "1px solid rgba(255, 77, 79, 0.3)",
                color: "#FF4D4F",
              },
            },
            // 警告消息样式
            warning: {
              style: {
                background: "rgba(255, 215, 0, 0.1)",
                border: "1px solid rgba(255, 215, 0, 0.3)",
                color: "#FFD700",
              },
            },
            // 信息消息样式
            info: {
              style: {
                background: "rgba(24, 144, 255, 0.1)",
                border: "1px solid rgba(24, 144, 255, 0.3)",
                color: "#1890FF",
              },
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
