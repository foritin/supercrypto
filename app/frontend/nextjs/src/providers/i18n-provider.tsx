"use client";

import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { type ReactNode } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";

// 支持的语言列表
export const SUPPORTED_LANGUAGES = ["en-US", "zh-CN"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// 语言显示名称
export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  "en-US": "English",
  "zh-CN": "中文",
};

// 导入翻译文件
import enAdmin from "@/locales/en-US/admin";
import enAssets from "@/locales/en-US/assets";
import enCommon from "@/locales/en-US/common";
import enDev from "@/locales/en-US/dev";
import enHome from "@/locales/en-US/home";
import enKyc from "@/locales/en-US/kyc";
import enLayout from "@/locales/en-US/layout";
import enPortfolio from "@/locales/en-US/portfolio";
import enSubscription from "@/locales/en-US/subscription";
import enWallet from "@/locales/en-US/wallet";
import zhAdmin from "@/locales/zh-CN/admin";
import zhAssets from "@/locales/zh-CN/assets";
import zhCommon from "@/locales/zh-CN/common";
import zhDev from "@/locales/zh-CN/dev";
import zhHome from "@/locales/zh-CN/home";
import zhKyc from "@/locales/zh-CN/kyc";
import zhLayout from "@/locales/zh-CN/layout";
import zhPortfolio from "@/locales/zh-CN/portfolio";
import zhSubscription from "@/locales/zh-CN/subscription";
import zhWallet from "@/locales/zh-CN/wallet";

// 合并翻译
const resources = {
  "en-US": {
    translation: {
      ...enCommon,
      ...enHome,
      ...enAssets,
      ...enAdmin,
      ...enDev,
      ...enWallet,
      ...enKyc,
      ...enLayout,
      ...enPortfolio,
      ...enSubscription,
    },
  },
  "zh-CN": {
    translation: {
      ...zhCommon,
      ...zhHome,
      ...zhAssets,
      ...zhAdmin,
      ...zhDev,
      ...zhWallet,
      ...zhKyc,
      ...zhLayout,
      ...zhPortfolio,
      ...zhSubscription,
    },
  },
};

// 初始化 i18n
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en-US",
    supportedLngs: ["en-US", "zh-CN", "en", "zh"],
    // 语言别名映射
    load: "currentOnly",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      // 将 zh 映射到 zh-CN，en 映射到 en-US
      convertDetectedLanguage: (lng: string) => {
        if (lng === "zh" || lng.startsWith("zh-")) return "zh-CN";
        if (lng === "en" || lng.startsWith("en-")) return "en-US";
        return lng;
      },
    },
    react: {
      useSuspense: false, // 禁用 Suspense 以避免 SSR 问题
    },
  });

export function I18nProvider({ children }: { children: ReactNode }) {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

export { i18n };
