"use client";

import { useEffect } from "react";
import { useTranslation } from "react-i18next";

/**
 * 同步 i18n 当前语言到 <html lang> 属性
 * 由于 Root Layout 是 Server Component，无法直接使用 i18n hooks，
 * 因此通过此客户端组件在挂载后动态更新 lang 属性。
 */
export function HtmlLangSync() {
  const { i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return null;
}
