/**
 * UTC 时间处理工具函数
 * 全系统统一使用 UTC 时间，避免时区歧义
 */

import { format, addHours } from "date-fns";

// UTC 时间格式模板
const UTC_FORMATS: Record<string, string> = {
  zh: "yyyy-MM-dd HH:mm",
  en: "MMM dd, yyyy HH:mm",
};

/**
 * 格式化为 UTC 时间字符串
 * @param date - Date 对象或 ISO 字符串
 * @param locale - 语言: 'zh' | 'en'
 * @returns 格式化的 UTC 时间字符串，如 "2026-03-17 02:00 UTC"
 */
export function formatUTCTime(
  date: Date | string,
  locale: "zh" | "en" = "zh"
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const formatStr = UTC_FORMATS[locale];
  return `${format(d, formatStr)} UTC`;
}

/**
 * 计算收益开始时间 (T+1, 24小时后)
 * @param subscribeTime - 认购时间
 * @returns UTC 收益开始时间
 */
export function calculateYieldStartTime(
  subscribeTime: Date | string
): Date {
  const start =
    typeof subscribeTime === "string"
      ? new Date(subscribeTime)
      : subscribeTime;
  return addHours(start, 24);
}

/**
 * 格式化收益开始时间提示
 * @param subscribeTime - 认购时间
 * @param locale - 语言
 * @returns 本地化提示字符串
 */
export function formatYieldStartTime(
  subscribeTime: Date | string,
  locale: "zh" | "en" = "zh"
): string {
  const yieldStart = calculateYieldStartTime(subscribeTime);
  const utcTimeStr = formatUTCTime(yieldStart, locale);

  if (locale === "zh") {
    return `将于 ${utcTimeStr} 开始计息`;
  }
  return `Yield begins at ${utcTimeStr}`;
}

/**
 * 检查是否已开始计息
 * @param subscribeTime - 认购时间
 * @param serverTime - 服务器当前时间（可选，用于同步）
 * @returns boolean
 */
export function isYieldStarted(
  subscribeTime: Date | string,
  serverTime?: Date
): boolean {
  const yieldStart = calculateYieldStartTime(subscribeTime);
  const now = serverTime || new Date();
  return now >= yieldStart;
}

/**
 * 计算持有时间（小时）
 * @param subscribeTime - 认购时间
 * @param serverTime - 服务器当前时间（可选）
 * @returns 持有小时数
 */
export function calculateHoldingHours(
  subscribeTime: Date | string,
  serverTime?: Date
): number {
  const start =
    typeof subscribeTime === "string"
      ? new Date(subscribeTime)
      : subscribeTime;
  const now = serverTime || new Date();
  return Math.floor(
    (now.getTime() - start.getTime()) / (1000 * 60 * 60)
  );
}

/**
 * 格式化持有时间
 * @param hours - 持有小时数
 * @param locale - 语言
 * @returns 格式化的持有时间字符串
 */
export function formatHoldingDuration(
  hours: number,
  locale: "zh" | "en" = "zh"
): string {
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (locale === "zh") {
    if (days > 0) {
      return `已持有 ${days} 天 ${remainingHours} 小时 (UTC)`;
    }
    return `已持有 ${hours} 小时 (UTC)`;
  }

  // English
  if (days > 0) {
    return `Held for ${days}d ${remainingHours}h (UTC)`;
  }
  return `Held for ${hours} hours (UTC)`;
}

/**
 * 获取距离开始计息的剩余时间
 * @param subscribeTime - 认购时间
 * @param serverTime - 服务器当前时间（可选）
 * @returns 剩余小时数（如果已开始计息则返回0）
 */
export function getHoursUntilYieldStart(
  subscribeTime: Date | string,
  serverTime?: Date
): number {
  const yieldStart = calculateYieldStartTime(subscribeTime);
  const now = serverTime || new Date();
  const diff = yieldStart.getTime() - now.getTime();
  return diff > 0 ? Math.ceil(diff / (1000 * 60 * 60)) : 0;
}

/**
 * 计算收益金额（模拟合约计算）
 * @param principal - 本金
 * @param apy - 年化收益率 (%)
 * @param holdingHours - 持有小时数
 * @returns 收益金额
 */
export function calculateYield(
  principal: number,
  apy: number,
  holdingHours: number
): number {
  // 未满24小时无收益
  if (holdingHours < 24) {
    return 0;
  }
  // 收益 = 本金 * APY * 持有天数 / 365
  const holdingDays = holdingHours / 24;
  return (principal * (apy / 100) * holdingDays) / 365;
}
