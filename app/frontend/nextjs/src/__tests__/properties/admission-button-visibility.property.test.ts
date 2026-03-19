/**
 * Property 6: Admission button visibility follows state rules
 *
 * 对于任意 (KycStatus, OnChainSyncStatus) 组合，
 * "准入" 按钮应当可见当且仅当 status === 'approved' 且 on_chain_sync_status !== 'synced'。
 * 所有其他状态组合下按钮应当隐藏。
 *
 * **Validates: Requirements 1.3, 1.4**
 *
 * Requirements:
 * - 1.3: 当 KYC 记录 status=APPROVED 且 on_chain_sync_status=PENDING 时，显示"准入"按钮
 * - 1.4: 当 KYC 记录 status 非 APPROVED 时，隐藏"准入"按钮
 *
 * Feature: kyc-onchain-admission, Property 6: Admission button visibility follows state rules
 */

import fc from 'fast-check'
import { describe, it, expect } from 'vitest'

import { shouldShowAdmissionButton } from '@/components/admin-kyc/admission-button'

// ============ 类型定义 ============

/** KYC 状态枚举值 (与 KycStatus enum 一致) */
const KYC_STATUSES = ['not_started', 'pending', 'approved', 'rejected'] as const

/** 链上同步状态枚举值 (与 OnChainSyncStatus 一致) */
const ON_CHAIN_SYNC_STATUSES = ['not_required', 'pending', 'synced', 'failed'] as const
type OnChainSyncStatusValue = (typeof ON_CHAIN_SYNC_STATUSES)[number]

// ============ 生成器 ============

/** 生成 KYC 状态枚举值 */
const kycStatusArb = fc.constantFrom(...KYC_STATUSES)

/** 生成链上同步状态枚举值 (包含 null/undefined) */
const onChainSyncStatusArb = fc.constantFrom<OnChainSyncStatusValue | null | undefined>(
  ...ON_CHAIN_SYNC_STATUSES,
  null,
  undefined
)

/** 生成所有 (KycStatus, OnChainSyncStatus) 组合 */
const statusCombinationArb = fc.record({
  status: kycStatusArb,
  onChainSyncStatus: onChainSyncStatusArb,
})

// ============ 属性测试 ============

// Feature: kyc-onchain-admission, Property 6: Admission button visibility follows state rules
describe('Property 6: Admission button visibility follows state rules', () => {
  /**
   * **Validates: Requirements 1.3, 1.4**
   *
   * 核心属性: 按钮可见当且仅当 status === 'approved' AND on_chain_sync_status !== 'synced'
   */
  describe('准入按钮可见性双条件验证', () => {
    it('property: 按钮可见当且仅当 status=approved 且 on_chain_sync_status !== synced', () => {
      fc.assert(
        fc.property(statusCombinationArb, ({ status, onChainSyncStatus }) => {
          const result = shouldShowAdmissionButton(status, onChainSyncStatus)
          const expected = status === 'approved' && onChainSyncStatus !== 'synced'
          expect(result).toBe(expected)
        }),
        { numRuns: 200 }
      )
    })

    it('property: status 非 approved 时按钮始终隐藏', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('not_started' as const, 'pending' as const, 'rejected' as const),
          onChainSyncStatusArb,
          (status, onChainSyncStatus) => {
            const result = shouldShowAdmissionButton(status, onChainSyncStatus)
            expect(result).toBe(false)
          }
        ),
        { numRuns: 200 }
      )
    })

    it('property: status=approved 且 on_chain_sync_status=synced 时按钮隐藏 (已准入)', () => {
      const result = shouldShowAdmissionButton('approved', 'synced')
      expect(result).toBe(false)
    })

    it('property: status=approved 且 on_chain_sync_status 非 synced 时按钮可见', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<OnChainSyncStatusValue | null | undefined>(
            'not_required',
            'pending',
            'failed',
            null,
            undefined
          ),
          (onChainSyncStatus) => {
            const result = shouldShowAdmissionButton('approved', onChainSyncStatus)
            expect(result).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Validates: Requirements 1.3, 1.4**
   *
   * 与 isApproved (KYC 完成) 的互斥性:
   * 对于 approved 状态，按钮可见 和 KYC 完成 互斥
   */
  describe('与 KYC 完成状态的互斥性', () => {
    it('property: 对于 approved 状态，按钮可见 和 isApproved 互斥', () => {
      fc.assert(
        fc.property(onChainSyncStatusArb, (onChainSyncStatus) => {
          const buttonVisible = shouldShowAdmissionButton('approved', onChainSyncStatus)
          const isApproved = onChainSyncStatus === 'synced'

          // 两者不能同时为 true
          expect(buttonVisible && isApproved).toBe(false)
          // 对于 approved 状态，两者恰好有一个为 true
          expect(buttonVisible || isApproved).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('property: 从 synced 变为其他状态时，按钮立即变为可见', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<OnChainSyncStatusValue | null | undefined>(
            'not_required',
            'pending',
            'failed',
            null,
            undefined
          ),
          (newSyncStatus) => {
            // 撤销前: synced → 按钮隐藏
            const beforeRevocation = shouldShowAdmissionButton('approved', 'synced')
            expect(beforeRevocation).toBe(false)

            // 撤销后: 非 synced → 按钮可见
            const afterRevocation = shouldShowAdmissionButton('approved', newSyncStatus)
            expect(afterRevocation).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
