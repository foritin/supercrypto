"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";

import { usePlatformInfoStore } from "@/stores/platform-info-store";

interface AppReadyContextType {
  /** 所有 provider 是否准备就绪 */
  isReady: boolean;
  /** i18n 是否初始化完成 */
  isI18nReady: boolean;
  /** 水合是否完成 */
  isHydrated: boolean;
  /** 平台信息是否加载完成 */
  isPlatformInfoReady: boolean;
}

const AppReadyContext = createContext<AppReadyContextType>({
  isReady: false,
  isI18nReady: false,
  isHydrated: false,
  isPlatformInfoReady: false,
});

/**
 * App Ready Provider
 *
 * 统一检测应用是否准备就绪，包括：
 * - React 水合完成
 * - i18n 初始化完成（语言检测完成）
 * - 平台信息加载完成（链配置 + 合约地址）
 *
 * 使用方式：
 * - 在需要等待应用就绪的地方使用 useAppReady() hook
 * - 在 ClientLoading 中使用 isReady 控制全屏 loader
 */
export function AppReadyProvider({ children }: { children: ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isI18nReady, setIsI18nReady] = useState(false);

  const { ready: i18nReady } = useTranslation();

  // 平台信息 store
  const initPlatformInfo = usePlatformInfoStore((s) => s.init);
  const isPlatformInfoLoaded = usePlatformInfoStore((s) => s.isLoaded);
  const platformInfoError = usePlatformInfoStore((s) => s.error);
  const isPlatformInfoLoading = usePlatformInfoStore((s) => s.isLoading);

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

  // 水合完成后立即加载平台信息（失败自动重试，最多 3 次）
  useEffect(() => {
    if (!isHydrated) return;

    let retries = 0;
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000; // 2 秒

    const tryInit = () => {
      initPlatformInfo();
    };

    tryInit();

    // 监听失败后自动重试
    const interval = setInterval(() => {
      const { isLoaded, isLoading, error } = usePlatformInfoStore.getState();
      if (isLoaded || isLoading) {
        clearInterval(interval);
        return;
      }
      if (error && retries < MAX_RETRIES) {
        retries++;
        console.warn(`[AppReady] 平台信息加载失败，第 ${retries} 次重试...`);
        tryInit();
      } else if (retries >= MAX_RETRIES) {
        console.error("[AppReady] 平台信息加载失败，已达最大重试次数");
        clearInterval(interval);
      }
    }, RETRY_DELAY);

    return () => clearInterval(interval);
  }, [isHydrated, initPlatformInfo]);

  // 所有条件都满足时，应用准备就绪
  // 平台信息加载失败时也放行（降级运行），不卡住整个应用
  const isPlatformInfoReady = isPlatformInfoLoaded || (!!platformInfoError && !isPlatformInfoLoading);
  const isReady = isHydrated && isI18nReady && isPlatformInfoReady;

  return (
    <AppReadyContext.Provider
      value={{ isReady, isI18nReady, isHydrated, isPlatformInfoReady }}
    >
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
