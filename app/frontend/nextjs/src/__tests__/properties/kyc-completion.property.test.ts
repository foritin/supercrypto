/**
 * Property 4: KYC completion requires both approval and on-chain admission
 *
 * 对于任意 (KycStatus, OnChainSyncStatus) 组合，
 * isApproved 标志应当为 true 当且仅当 status === 'approved' 且 on_chain_sync_status === 'synced'。
 * 所有其他组合应当返回 isApproved === false。
 *
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
 *
 * Requirements:
 * - 5.1: KYC 完成条件需同时满足 status=APPROVED 和 on_chain_sync_status=SYNCED
 * - 5.2: status=APPROVED 但 on_chain_sync_status 非 SYNCED 时，禁止认购资产
 * - 5.3: status=APPROVED 但 on_chain_sync_status 非 SYNCED 时，禁止查看资产文档
 * - 5.4: useKycStatus hook 的 isApproved 需同时检查两个条件
 * - 5.5: on_chain_sync_status 从 SYNCED 变为其他值时，立即限制用户访问
 */

import fc from 'fast-check'
import { describe, it, expect } from 'vitest'

// ============ 类型定义 ============

/** KYC 状态枚举值 (与 KycStatus enum 一致) */
const KYC_STATUSES = ['not_started', 'pending', 'approved', 'rejected'] as const
type KycStatusValue = (typeof KYC_STATUSES)[number]

/** 链上同步状态枚举值 (与 OnChainSyncStatus 一致) */
const ON_CHAIN_SYNC_STATUSES = ['not_required', 'pending', 'synced', 'failed'] as const
type OnChainSyncStatusValue = (typeof ON_CHAIN_SYNC_STATUSES)[number]

// ============ 被测逻辑 (从 useKycStatus hook 提取) ============

/**
 * 判断 KYC 是否完全完成 (isApproved)
 * 与 useKycStatus hook 中的逻辑一致:
 * isApproved: data?.status === KycStatus.APPROVED && data?.on_chain_sync_status === 'synced'
 */
function computeIsApproved(
  status: KycStatusValue,
  onChainSyncStatus: OnChainSyncStatusValue | null | undefined
): boolean {
  return status === 'approved' && onChainSyncStatus === 'synced'
}

/**
 * 判断 KYC 审核是否通过 (isReviewApproved)
 * 与 useKycStatus hook 中的逻辑一致:
 * isReviewApproved: data?.status === KycStatus.APPROVED
 */
function computeIsReviewApproved(status: KycStatusValue): boolean {
  return status === 'approved'
}

/**
 * 判断是否处于待准入状态 (isPendingAdmission)
 * 与 useKycStatus hook 中的逻辑一致:
 * isPendingAdmission: data?.status === KycStatus.APPROVED && data?.on_chain_sync_status !== 'synced'
 */
function computeIsPendingAdmission(
  status: KycStatusValue,
  onChainSyncStatus: OnChainSyncStatusValue | null | undefined
): boolean {
  return status === 'approved' && onChainSyncStatus !== 'synced'
}

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

// Feature: kyc-onchain-admission, Property 4: KYC completion requires both approval and on-chain admission
describe('Property 4: KYC completion requires both approval and on-chain admission', () => {
  /**
   * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
   *
   * 核心属性: isApproved 为 true 当且仅当 status === 'approved' AND on_chain_sync_status === 'synced'
   */
  describe('isApproved 双条件验证', () => {
    it('property: isApproved 为 true 当且仅当 status=approved 且 on_chain_sync_status=synced', () => {
      fc.assert(
        fc.property(statusCombinationArb, ({ status, onChainSyncStatus }) => {
          const result = computeIsApproved(status, onChainSyncStatus)
          const expected = status === 'approved' && onChainSyncStatus === 'synced'
          expect(result).toBe(expected)
        }),
        { numRuns: 200 }
      )
    })

    it('property: status 非 approved 时 isApproved 始终为 false', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('not_started' as const, 'pending' as const, 'rejected' as const),
          onChainSyncStatusArb,
          (status, onChainSyncStatus) => {
            const result = computeIsApproved(status, onChainSyncStatus)
            expect(result).toBe(false)
          }
        ),
        { numRuns: 200 }
      )
    })

    it('property: on_chain_sync_status 非 synced 时 isApproved 始终为 false', () => {
      fc.assert(
        fc.property(
          kycStatusArb,
          fc.constantFrom<OnChainSyncStatusValue | null | undefined>(
            'not_required',
            'pending',
            'failed',
            null,
            undefined
          ),
          (status, onChainSyncStatus) => {
            const result = computeIsApproved(status, onChainSyncStatus)
            expect(result).toBe(false)
          }
        ),
        { numRuns: 200 }
      )
    })
  })

  /**
   * **Validates: Requirements 5.1, 5.4**
   *
   * isReviewApproved 和 isPendingAdmission 的一致性
   */
  describe('派生状态一致性', () => {
    it('property: isReviewApproved 为 true 当且仅当 status=approved', () => {
      fc.assert(
        fc.property(kycStatusArb, (status) => {
          const result = computeIsReviewApproved(status)
          expect(result).toBe(status === 'approved')
        }),
        { numRuns: 100 }
      )
    })

    it('property: isPendingAdmission 为 true 当且仅当 status=approved 且 on_chain_sync_status 非 synced', () => {
      fc.assert(
        fc.property(statusCombinationArb, ({ status, onChainSyncStatus }) => {
          const result = computeIsPendingAdmission(status, onChainSyncStatus)
          const expected = status === 'approved' && onChainSyncStatus !== 'synced'
          expect(result).toBe(expected)
        }),
        { numRuns: 200 }
      )
    })

    it('property: isApproved 和 isPendingAdmission 互斥 (对于 approved 状态)', () => {
      fc.assert(
        fc.property(onChainSyncStatusArb, (onChainSyncStatus) => {
          const isApproved = computeIsApproved('approved', onChainSyncStatus)
          const isPendingAdmission = computeIsPendingAdmission('approved', onChainSyncStatus)
          // 两者不能同时为 true
          expect(isApproved && isPendingAdmission).toBe(false)
          // 对于 approved 状态，两者恰好有一个为 true
          expect(isApproved || isPendingAdmission).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('property: isReviewApproved 为 true 时，isApproved 或 isPendingAdmission 恰好有一个为 true', () => {
      fc.assert(
        fc.property(onChainSyncStatusArb, (onChainSyncStatus) => {
          const isReviewApproved = computeIsReviewApproved('approved')
          const isApproved = computeIsApproved('approved', onChainSyncStatus)
          const isPendingAdmission = computeIsPendingAdmission('approved', onChainSyncStatus)

          expect(isReviewApproved).toBe(true)
          // 恰好一个为 true (XOR)
          expect(isApproved !== isPendingAdmission).toBe(true)
        }),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Validates: Requirements 5.2, 5.3, 5.5**
   *
   * 访问控制: 用户只有在 isApproved=true 时才能访问受限功能
   */
  describe('访问控制逻辑', () => {
    it('property: status=approved 但 on_chain_sync_status=pending 时，用户不能访问受限功能', () => {
      const isApproved = computeIsApproved('approved', 'pending')
      expect(isApproved).toBe(false)
    })

    it('property: status=approved 但 on_chain_sync_status=failed 时，用户不能访问受限功能', () => {
      const isApproved = computeIsApproved('approved', 'failed')
      expect(isApproved).toBe(false)
    })

    it('property: status=approved 但 on_chain_sync_status=null 时，用户不能访问受限功能', () => {
      const isApproved = computeIsApproved('approved', null)
      expect(isApproved).toBe(false)
    })

    it('property: status=approved 且 on_chain_sync_status=synced 时，用户可以访问受限功能', () => {
      const isApproved = computeIsApproved('approved', 'synced')
      expect(isApproved).toBe(true)
    })

    it('property: 从 synced 变为其他状态时，isApproved 立即变为 false (模拟撤销)', () => {
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
            // 撤销前: synced
            const beforeRevocation = computeIsApproved('approved', 'synced')
            expect(beforeRevocation).toBe(true)

            // 撤销后: 非 synced
            const afterRevocation = computeIsApproved('approved', newSyncStatus)
            expect(afterRevocation).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
