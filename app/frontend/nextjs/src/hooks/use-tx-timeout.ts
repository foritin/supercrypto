/**
 * useTransactionTimeout — 链上交易超时感知 hook
 *
 * 当交易停留在 confirming 状态超过阈值时，弹出 warning 通知
 * 提醒用户交易可能需要更多时间，避免重复提交。
 *
 * @example
 * ```tsx
 * const { startTimeout, clearTimeout: clearTxTimeout } = useTransactionTimeout({
 *   warningMs: 30_000,
 *   onWarning: () => notification.warning(t('admin.kyc.admission.txTimeout')),
 * })
 *
 * // 在 confirming 阶段调用
 * startTimeout()
 * const receipt = await publicClient.waitForTransactionReceipt({ hash })
 * clearTxTimeout()
 * ```
 */

import { useRef, useCallback, useEffect } from 'react'

interface UseTransactionTimeoutOptions {
  /** 超时毫秒数 — 超过后触发 onWarning (默认 30s) */
  warningMs?: number
  /** 超时后回调 */
  onWarning: () => void
}

export function useTransactionTimeout({
  warningMs = 30_000,
  onWarning,
}: UseTransactionTimeoutOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const startTimeout = useCallback(() => {
    // 清理已有的 timer
    if (timerRef.current) {
      globalThis.clearTimeout(timerRef.current)
    }
    timerRef.current = setTimeout(() => {
      onWarning()
      timerRef.current = null
    }, warningMs)
  }, [warningMs, onWarning])

  const clearTxTimeout = useCallback(() => {
    if (timerRef.current) {
      globalThis.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // 组件卸载时自动清理
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        globalThis.clearTimeout(timerRef.current)
      }
    }
  }, [])

  return { startTimeout, clearTimeout: clearTxTimeout }
}
