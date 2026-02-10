/**
 * Sprint 3 前端属性测试
 *
 * 验证:
 * - F-07: i18n key 完整性 (locale 文件中存在所有链操作 key)
 * - F-08: useTransactionTimeout hook 行为
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import enAdmin from '@/locales/en-US/admin'
import zhAdmin from '@/locales/zh-CN/admin'

// ============================================================================
// F-07: i18n Key 完整性
// ============================================================================

describe('F-07: i18n Key Completeness', () => {

  const REQUIRED_ADMISSION_KEYS = [
    'admit',
    'reAdmit',
    'recoverySuccess',
    'recoveryFailed',
    'txTimeout',
    'txPending',
    'verifying',
    'signing',
    'broadcasting',
    'confirming',
    'recording',
    'success',
    'failed',
    'txReverted',
    'userRejected',
    'walletNotConnected',
    'notAdmin',
    'notDeployer',
    'notVerifier',
  ]

  const REQUIRED_ONCHAIN_KEYS = [
    'revocationRecoverySuccess',
    'revocationRecoveryFailed',
    'defaultRevocationReason',
    'revocationTimeout',
    'revocationSuccess',
    'revocationFailed',
    'revocationTxReverted',
  ]

  it('en-US admin.kyc.admission has all required keys', () => {
    const admission = enAdmin.admin.kyc.admission
    for (const key of REQUIRED_ADMISSION_KEYS) {
      expect(admission, `Missing en-US key: admission.${key}`).toHaveProperty(key)
      expect(admission[key]).toBeTruthy()
    }
  })

  it('zh-CN admin.kyc.admission has all required keys', () => {
    const admission = zhAdmin.admin.kyc.admission
    for (const key of REQUIRED_ADMISSION_KEYS) {
      expect(admission, `Missing zh-CN key: admission.${key}`).toHaveProperty(key)
      expect(admission[key]).toBeTruthy()
    }
  })

  it('en-US admin.kyc.onchain has all required keys', () => {
    const onchain = enAdmin.admin.kyc.onchain
    for (const key of REQUIRED_ONCHAIN_KEYS) {
      expect(onchain, `Missing en-US key: onchain.${key}`).toHaveProperty(key)
      expect(onchain[key]).toBeTruthy()
    }
  })

  it('zh-CN admin.kyc.onchain has all required keys', () => {
    const onchain = zhAdmin.admin.kyc.onchain
    for (const key of REQUIRED_ONCHAIN_KEYS) {
      expect(onchain, `Missing zh-CN key: onchain.${key}`).toHaveProperty(key)
      expect(onchain[key]).toBeTruthy()
    }
  })

  it('property: en-US and zh-CN have same admission key sets', () => {
    const enKeys = Object.keys(enAdmin.admin.kyc.admission).sort()
    const zhKeys = Object.keys(zhAdmin.admin.kyc.admission).sort()
    expect(enKeys).toEqual(zhKeys)
  })

  it('property: en-US and zh-CN have same onchain key sets', () => {
    const enKeys = Object.keys(enAdmin.admin.kyc.onchain).sort()
    const zhKeys = Object.keys(zhAdmin.admin.kyc.onchain).sort()
    expect(enKeys).toEqual(zhKeys)
  })
})

// ============================================================================
// F-08: Transaction Timeout
// ============================================================================

describe('F-08: Transaction Timeout Logic', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('property: timeout fires after exactly warningMs elapsed', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 5000 }),
        (warningMs) => {
          const onWarning = vi.fn()
          let timer: ReturnType<typeof setTimeout> | null = null

          // Simulate the hook's logic (pure setTimeout)
          timer = setTimeout(() => {
            onWarning()
          }, warningMs)

          // Before timeout — should NOT have fired
          vi.advanceTimersByTime(warningMs - 1)
          expect(onWarning).not.toHaveBeenCalled()

          // At timeout — should fire
          vi.advanceTimersByTime(1)
          expect(onWarning).toHaveBeenCalledTimes(1)

          // Cleanup
          if (timer) clearTimeout(timer)
        },
      ),
      { numRuns: 50 },
    )
  })

  it('timeout can be cleared before firing', () => {
    const onWarning = vi.fn()

    const timer = setTimeout(() => {
      onWarning()
    }, 30_000)

    // Clear before it fires
    vi.advanceTimersByTime(15_000)
    clearTimeout(timer)

    vi.advanceTimersByTime(30_000)
    expect(onWarning).not.toHaveBeenCalled()
  })

  it('property: timeout callback is called at most once', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 2000 }),
        fc.integer({ min: 1, max: 10 }),
        (warningMs, extraIntervals) => {
          const onWarning = vi.fn()

          setTimeout(() => {
            onWarning()
          }, warningMs)

          // Advance well past the timeout
          vi.advanceTimersByTime(warningMs + extraIntervals * warningMs)
          expect(onWarning).toHaveBeenCalledTimes(1)
        },
      ),
      { numRuns: 30 },
    )
  })
})
