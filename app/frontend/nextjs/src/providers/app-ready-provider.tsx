"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";

interface AppReadyContextType {
  /** 所有 provider 是否准备就绪 */
  isReady: boolean;
  /** i18n 是否初始化完成 */
  isI18nReady: boolean;
  /** 水合是否完成 */
  isHydrated: boolean;
}

const AppReadyContext = createContext<AppReadyContextType>({
  isReady: false,
  isI18nReady: false,
  isHydrated: false,
});

/**
 * App Ready Provider
 *
 * 统一检测应用是否准备就绪，包括：
 * - React 水合完成
 * - i18n 初始化完成（语言检测完成）
 *
 * 使用方式：
 * - 在需要等待应用就绪的地方使用 useAppReady() hook
 * - 在 ClientLoading 中使用 isReady 控制全屏 loader
 */
export function AppReadyProvider({ children }: { children: ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isI18nReady, setIsI18nReady] = useState(false);

  const { ready: i18nReady } = useTranslation();

  // 检测水合完成
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // 检测 i18n 准备就绪
  useEffect(() => {
    if (i18nReady) {
      setIsI18nReady(true);
    }
  }, [i18nReady]);

  // 所有条件都满足时，应用准备就绪
  const isReady = isHydrated && isI18nReady;

  return (
    <AppReadyContext.Provider value={{ isReady, isI18nReady, isHydrated }}>
      {children}
    </AppReadyContext.Provider>
  );
}

/**
 * 获取应用就绪状态
 */
export function useAppReady() {
  return useContext(AppReadyContext);
}
