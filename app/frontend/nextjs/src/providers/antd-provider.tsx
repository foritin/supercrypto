"use client";

import { ConfigProvider, App, theme } from "antd";
import type { ReactNode } from "react";

// Web3 深色主题配置
export const darkTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    // 主色调 - 霓虹绿
    colorPrimary: "#00D4AA",
    colorSuccess: "#00D4AA",
    colorWarning: "#FFD700",
    colorError: "#FF4D4F",
    colorInfo: "#1677ff",

    // 文字颜色
    colorTextBase: "#E0E0E0",
    colorTextSecondary: "rgba(255, 255, 255, 0.45)",

    // 背景颜色
    colorBgContainer: "rgba(25, 35, 30, 0.8)",
    colorBgElevated: "rgba(30, 42, 36, 0.95)",
    colorBgLayout: "transparent",

    // 边框
    colorBorderSecondary: "rgba(255, 255, 255, 0.1)",
    colorBorder: "rgba(255, 255, 255, 0.15)",

    // 圆角
    borderRadius: 8,
  },
  components: {
    Layout: {
      bodyBg: "transparent",
      headerBg: "transparent",
      footerBg: "transparent",
    },
    Card: {
      headerBg: "rgba(25, 35, 30, 0.9)",
      actionsBg: "rgba(25, 35, 30, 0.8)",
    },
    Table: {
      headerBg: "rgba(25, 35, 30, 0.9)",
      rowHoverBg: "rgba(0, 212, 170, 0.1)",
    },
    Button: {
      primaryShadow: "0 2px 8px rgba(0, 212, 170, 0.3)",
    },
    Menu: {
      darkItemBg: "transparent",
      darkSubMenuItemBg: "transparent",
    },
  },
};

/**
 * AntdProvider - Antd 配置提供者（客户端部分）
 *
 * 包含：
 * - ConfigProvider: 主题配置
 * - App: Antd 应用容器（提供 message, notification 等静态方法）
 *
 * 注意：AntdRegistry 必须在服务器组件中使用（见 layout.tsx）
 */
export function AntdProvider({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider theme={darkTheme}>
      <App>{children}</App>
    </ConfigProvider>
  );
}
