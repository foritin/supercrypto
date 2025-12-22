"use client";

import type { ReactNode } from "react";
import { Web3Provider } from "./web3-provider";
import { AntdProvider } from "./antd-provider";
import { I18nProvider } from "./i18n-provider";
import { AppReadyProvider } from "./app-ready-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <Web3Provider>
        <AntdProvider>
          {/* AppReadyProvider 需要在 I18nProvider 内部，以检测 i18n 状态 */}
          <AppReadyProvider>{children}</AppReadyProvider>
        </AntdProvider>
      </Web3Provider>
    </I18nProvider>
  );
}

export { Web3Provider } from "./web3-provider";
export { AntdProvider } from "./antd-provider";
export { I18nProvider, i18n } from "./i18n-provider";
export { AppReadyProvider, useAppReady } from "./app-ready-provider";
