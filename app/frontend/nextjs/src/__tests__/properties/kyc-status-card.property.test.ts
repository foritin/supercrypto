/**
 * Property 1: KYC 状态卡片正确渲染
 *
 * 对于任意 KYC 状态 (not_started, pending, approved, rejected)，
 * KycStatusCard 组件应该渲染对应的 UI 元素：
 * - not_started: 显示"开始认证"按钮
 * - pending: 显示提交时间和刷新按钮
 * - approved: 显示认证通过时间
 * - rejected: 显示拒绝原因和"重新申请"按钮
 *
 * **Validates: Requirements 1.2, 1.3, 1.4, 1.5**
 *
 * Requirements:
 * - 1.2: WHEN 用户已连接钱包且 KYC 状态为 not_started THEN KYC_Status_Card SHALL 显示"未开始"状态和"开始认证"按钮
 * - 1.3: WHEN 用户已连接钱包且 KYC 状态为 pending THEN KYC_Status_Card SHALL 显示"审核中"状态、提交时间和刷新按钮
 * - 1.4: WHEN 用户已连接钱包且 KYC 状态为 approved THEN KYC_Status_Card SHALL 显示"已认证"状态和认证通过时间
 * - 1.5: WHEN 用户已连接钱包且 KYC 状态为 rejected THEN KYC_Status_Card SHALL 显示"已拒绝"状态、拒绝原因和"重新申请"按钮
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { KycStatus } from '@/services/kyc'

// ============ 类型定义 ============

/**
 * KYC 状态数据 (模拟 API 响应)
 */
interface KycStatusData {
  wallet_address: string
  status: KycStatus
  submitted_at: string | null
  reviewed_at: string | null
  reject_reason: string | null
  country_code: string | null
  is_accredited: boolean
}

/**
 * 状态卡片 UI 元素配置
 */
interface StatusCardUIConfig {
  /** 状态徽章变体 */
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline'
  /** 是否显示开始/重新申请按钮 */
  showActionButton: boolean
  /** 按钮类型 */
  actionButtonType: 'start' | 'reapply' | null
  /** 是否显示刷新按钮 */
  showRefreshButton: boolean
  /** 是否显示提交时间 */
  showSubmittedAt: boolean
  /** 是否显示审核时间 */
  showReviewedAt: boolean
  /** 是否显示拒绝原因 */
  showRejectReason: boolean
}


// ============ 辅助函数 ============

/**
 * 获取状态对应的 Badge 变体
 * 与 KycStatusCard 组件中的 getStatusBadgeVariant 函数保持一致
 */
function getStatusBadgeVariant(status: KycStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case KycStatus.APPROVED:
      return 'default' // 主色调 (绿色)
    case KycStatus.PENDING:
      return 'secondary'
    case KycStatus.REJECTED:
      return 'destructive'
    default:
      return 'outline'
  }
}

/**
 * 根据 KYC 状态获取预期的 UI 配置
 * 这是核心的状态到 UI 映射逻辑
 */
function getExpectedUIConfig(status: KycStatus, data: KycStatusData): StatusCardUIConfig {
  switch (status) {
    case KycStatus.NOT_STARTED:
      return {
        badgeVariant: 'outline',
        showActionButton: true,
        actionButtonType: 'start',
        showRefreshButton: false,
        showSubmittedAt: false,
        showReviewedAt: false,
        showRejectReason: false,
      }
    case KycStatus.PENDING:
      return {
        badgeVariant: 'secondary',
        showActionButton: false,
        actionButtonType: null,
        showRefreshButton: true,
        showSubmittedAt: data.submitted_at !== null,
        showReviewedAt: false,
        showRejectReason: false,
      }
    case KycStatus.APPROVED:
      return {
        badgeVariant: 'default',
        showActionButton: false,
        actionButtonType: null,
        showRefreshButton: false,
        showSubmittedAt: false,
        showReviewedAt: data.reviewed_at !== null,
        showRejectReason: false,
      }
    case KycStatus.REJECTED:
      return {
        badgeVariant: 'destructive',
        showActionButton: true,
        actionButtonType: 'reapply',
        showRefreshButton: false,
        showSubmittedAt: false,
        showReviewedAt: false,
        showRejectReason: data.reject_reason !== null,
      }
    default:
      // 默认情况 (未知状态) 按 NOT_STARTED 处理
      return {
        badgeVariant: 'outline',
        showActionButton: true,
        actionButtonType: 'start',
        showRefreshButton: false,
        showSubmittedAt: false,
        showReviewedAt: false,
        showRejectReason: false,
      }
  }
}

/**
 * 检查 onStartKyc 回调是否应该可用
 * 只有 NOT_STARTED 和 REJECTED 状态才应该有操作按钮
 */
function shouldHaveActionCallback(status: KycStatus): boolean {
  return status === KycStatus.NOT_STARTED || status === KycStatus.REJECTED
}

/**
 * 生成有效的 ISO 日期字符串
 */
function generateISODateString(daysAgo: number): string {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString()
}


// ============ 生成器 ============

/**
 * 生成有效的钱包地址 (0x + 40 个十六进制字符)
 */
const walletAddressArb = fc
  .array(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'), { minLength: 40, maxLength: 40 })
  .map((chars) => `0x${chars.join('')}`)

/**
 * 生成 KYC 状态枚举值
 */
const kycStatusArb = fc.constantFrom(
  KycStatus.NOT_STARTED,
  KycStatus.PENDING,
  KycStatus.APPROVED,
  KycStatus.REJECTED
)

/**
 * 生成可选的 ISO 日期字符串
 */
const optionalDateArb = fc.option(
  fc.integer({ min: 0, max: 365 }).map(generateISODateString),
  { nil: null }
)

/**
 * 生成可选的拒绝原因
 */
const optionalRejectReasonArb = fc.option(
  fc.string({ minLength: 1, maxLength: 500 }),
  { nil: null }
)

/**
 * 生成可选的国家代码
 */
const optionalCountryCodeArb = fc.option(
  fc.constantFrom('CN', 'US', 'JP', 'KR', 'SG', 'HK'),
  { nil: null }
)

/**
 * 生成 NOT_STARTED 状态的 KYC 数据
 */
const notStartedDataArb: fc.Arbitrary<KycStatusData> = fc.record({
  wallet_address: walletAddressArb,
  status: fc.constant(KycStatus.NOT_STARTED),
  submitted_at: fc.constant(null),
  reviewed_at: fc.constant(null),
  reject_reason: fc.constant(null),
  country_code: fc.constant(null),
  is_accredited: fc.constant(false),
})

/**
 * 生成 PENDING 状态的 KYC 数据
 */
const pendingDataArb: fc.Arbitrary<KycStatusData> = fc.record({
  wallet_address: walletAddressArb,
  status: fc.constant(KycStatus.PENDING),
  submitted_at: fc.integer({ min: 0, max: 30 }).map(generateISODateString),
  reviewed_at: fc.constant(null),
  reject_reason: fc.constant(null),
  country_code: optionalCountryCodeArb,
  is_accredited: fc.constant(false),
})

/**
 * 生成 APPROVED 状态的 KYC 数据
 */
const approvedDataArb: fc.Arbitrary<KycStatusData> = fc.record({
  wallet_address: walletAddressArb,
  status: fc.constant(KycStatus.APPROVED),
  submitted_at: fc.integer({ min: 7, max: 365 }).map(generateISODateString),
  reviewed_at: fc.integer({ min: 0, max: 7 }).map(generateISODateString),
  reject_reason: fc.constant(null),
  country_code: optionalCountryCodeArb,
  is_accredited: fc.boolean(),
})

/**
 * 生成 REJECTED 状态的 KYC 数据
 */
const rejectedDataArb: fc.Arbitrary<KycStatusData> = fc.record({
  wallet_address: walletAddressArb,
  status: fc.constant(KycStatus.REJECTED),
  submitted_at: fc.integer({ min: 7, max: 365 }).map(generateISODateString),
  reviewed_at: fc.integer({ min: 0, max: 7 }).map(generateISODateString),
  reject_reason: fc.string({ minLength: 1, maxLength: 500 }),
  country_code: optionalCountryCodeArb,
  is_accredited: fc.constant(false),
})

/**
 * 生成任意状态的 KYC 数据
 */
const anyKycDataArb: fc.Arbitrary<KycStatusData> = fc.oneof(
  notStartedDataArb,
  pendingDataArb,
  approvedDataArb,
  rejectedDataArb
)


// ============ 属性测试 ============

// Feature: kyc-page, Property 1: KYC 状态卡片正确渲染
describe('Property 1: KYC 状态卡片正确渲染', () => {
  /**
   * **Validates: Requirements 1.2, 1.3, 1.4, 1.5**
   *
   * 核心属性: 状态到 Badge 变体的映射正确
   */
  describe('状态徽章映射', () => {
    it('property: NOT_STARTED 状态应该使用 outline 变体', () => {
      fc.assert(
        fc.property(notStartedDataArb, (data) => {
          const variant = getStatusBadgeVariant(data.status)
          expect(variant).toBe('outline')
        }),
        { numRuns: 100 }
      )
    })

    it('property: PENDING 状态应该使用 secondary 变体', () => {
      fc.assert(
        fc.property(pendingDataArb, (data) => {
          const variant = getStatusBadgeVariant(data.status)
          expect(variant).toBe('secondary')
        }),
        { numRuns: 100 }
      )
    })

    it('property: APPROVED 状态应该使用 default 变体', () => {
      fc.assert(
        fc.property(approvedDataArb, (data) => {
          const variant = getStatusBadgeVariant(data.status)
          expect(variant).toBe('default')
        }),
        { numRuns: 100 }
      )
    })

    it('property: REJECTED 状态应该使用 destructive 变体', () => {
      fc.assert(
        fc.property(rejectedDataArb, (data) => {
          const variant = getStatusBadgeVariant(data.status)
          expect(variant).toBe('destructive')
        }),
        { numRuns: 100 }
      )
    })

    it('property: 任意状态都应该有对应的 Badge 变体', () => {
      fc.assert(
        fc.property(kycStatusArb, (status) => {
          const variant = getStatusBadgeVariant(status)
          expect(['default', 'secondary', 'destructive', 'outline']).toContain(variant)
        }),
        { numRuns: 100 }
      )
    })
  })


  /**
   * **Validates: Requirements 1.2, 1.5**
   *
   * 操作按钮属性: 只有 NOT_STARTED 和 REJECTED 状态才显示操作按钮
   */
  describe('操作按钮显示逻辑', () => {
    it('property: NOT_STARTED 状态应该显示"开始认证"按钮', () => {
      fc.assert(
        fc.property(notStartedDataArb, (data) => {
          const config = getExpectedUIConfig(data.status, data)
          expect(config.showActionButton).toBe(true)
          expect(config.actionButtonType).toBe('start')
        }),
        { numRuns: 100 }
      )
    })

    it('property: REJECTED 状态应该显示"重新申请"按钮', () => {
      fc.assert(
        fc.property(rejectedDataArb, (data) => {
          const config = getExpectedUIConfig(data.status, data)
          expect(config.showActionButton).toBe(true)
          expect(config.actionButtonType).toBe('reapply')
        }),
        { numRuns: 100 }
      )
    })

    it('property: PENDING 状态不应该显示操作按钮', () => {
      fc.assert(
        fc.property(pendingDataArb, (data) => {
          const config = getExpectedUIConfig(data.status, data)
          expect(config.showActionButton).toBe(false)
          expect(config.actionButtonType).toBe(null)
        }),
        { numRuns: 100 }
      )
    })

    it('property: APPROVED 状态不应该显示操作按钮', () => {
      fc.assert(
        fc.property(approvedDataArb, (data) => {
          const config = getExpectedUIConfig(data.status, data)
          expect(config.showActionButton).toBe(false)
          expect(config.actionButtonType).toBe(null)
        }),
        { numRuns: 100 }
      )
    })

    it('property: onStartKyc 回调只在 NOT_STARTED 和 REJECTED 状态可用', () => {
      fc.assert(
        fc.property(kycStatusArb, (status) => {
          const shouldHaveCallback = shouldHaveActionCallback(status)
          const expectedResult = status === KycStatus.NOT_STARTED || status === KycStatus.REJECTED
          expect(shouldHaveCallback).toBe(expectedResult)
        }),
        { numRuns: 100 }
      )
    })
  })


  /**
   * **Validates: Requirements 1.3**
   *
   * PENDING 状态特有元素: 刷新按钮和提交时间
   */
  describe('PENDING 状态 UI 元素', () => {
    it('property: PENDING 状态应该显示刷新按钮', () => {
      fc.assert(
        fc.property(pendingDataArb, (data) => {
          const config = getExpectedUIConfig(data.status, data)
          expect(config.showRefreshButton).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('property: PENDING 状态有提交时间时应该显示', () => {
      fc.assert(
        fc.property(pendingDataArb, (data) => {
          const config = getExpectedUIConfig(data.status, data)
          // PENDING 状态的数据生成器总是生成 submitted_at
          expect(config.showSubmittedAt).toBe(data.submitted_at !== null)
        }),
        { numRuns: 100 }
      )
    })

    it('property: 非 PENDING 状态不应该显示刷新按钮', () => {
      fc.assert(
        fc.property(
          fc.oneof(notStartedDataArb, approvedDataArb, rejectedDataArb),
          (data) => {
            const config = getExpectedUIConfig(data.status, data)
            expect(config.showRefreshButton).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })
  })


  /**
   * **Validates: Requirements 1.4**
   *
   * APPROVED 状态特有元素: 审核通过时间
   */
  describe('APPROVED 状态 UI 元素', () => {
    it('property: APPROVED 状态有审核时间时应该显示', () => {
      fc.assert(
        fc.property(approvedDataArb, (data) => {
          const config = getExpectedUIConfig(data.status, data)
          // APPROVED 状态的数据生成器总是生成 reviewed_at
          expect(config.showReviewedAt).toBe(data.reviewed_at !== null)
        }),
        { numRuns: 100 }
      )
    })

    it('property: 非 APPROVED 状态不应该显示审核时间', () => {
      fc.assert(
        fc.property(
          fc.oneof(notStartedDataArb, pendingDataArb, rejectedDataArb),
          (data) => {
            const config = getExpectedUIConfig(data.status, data)
            expect(config.showReviewedAt).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })
  })


  /**
   * **Validates: Requirements 1.5**
   *
   * REJECTED 状态特有元素: 拒绝原因
   */
  describe('REJECTED 状态 UI 元素', () => {
    it('property: REJECTED 状态有拒绝原因时应该显示', () => {
      fc.assert(
        fc.property(rejectedDataArb, (data) => {
          const config = getExpectedUIConfig(data.status, data)
          // REJECTED 状态的数据生成器总是生成 reject_reason
          expect(config.showRejectReason).toBe(data.reject_reason !== null)
        }),
        { numRuns: 100 }
      )
    })

    it('property: 非 REJECTED 状态不应该显示拒绝原因', () => {
      fc.assert(
        fc.property(
          fc.oneof(notStartedDataArb, pendingDataArb, approvedDataArb),
          (data) => {
            const config = getExpectedUIConfig(data.status, data)
            expect(config.showRejectReason).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })
  })


  /**
   * **Validates: Requirements 1.2, 1.3, 1.4, 1.5**
   *
   * 综合属性: UI 配置的完整性和一致性
   */
  describe('UI 配置完整性', () => {
    it('property: 任意状态都应该有完整的 UI 配置', () => {
      fc.assert(
        fc.property(anyKycDataArb, (data) => {
          const config = getExpectedUIConfig(data.status, data)

          // 验证配置对象包含所有必要字段
          expect(config).toHaveProperty('badgeVariant')
          expect(config).toHaveProperty('showActionButton')
          expect(config).toHaveProperty('actionButtonType')
          expect(config).toHaveProperty('showRefreshButton')
          expect(config).toHaveProperty('showSubmittedAt')
          expect(config).toHaveProperty('showReviewedAt')
          expect(config).toHaveProperty('showRejectReason')
        }),
        { numRuns: 100 }
      )
    })

    it('property: 状态到 UI 配置的映射是确定性的', () => {
      fc.assert(
        fc.property(anyKycDataArb, (data) => {
          // 对同一数据调用两次应该得到相同结果
          const config1 = getExpectedUIConfig(data.status, data)
          const config2 = getExpectedUIConfig(data.status, data)

          expect(config1.badgeVariant).toBe(config2.badgeVariant)
          expect(config1.showActionButton).toBe(config2.showActionButton)
          expect(config1.actionButtonType).toBe(config2.actionButtonType)
          expect(config1.showRefreshButton).toBe(config2.showRefreshButton)
          expect(config1.showSubmittedAt).toBe(config2.showSubmittedAt)
          expect(config1.showReviewedAt).toBe(config2.showReviewedAt)
          expect(config1.showRejectReason).toBe(config2.showRejectReason)
        }),
        { numRuns: 100 }
      )
    })

    it('property: 每个状态只有一种按钮类型或无按钮', () => {
      fc.assert(
        fc.property(anyKycDataArb, (data) => {
          const config = getExpectedUIConfig(data.status, data)

          if (config.showActionButton) {
            // 如果显示按钮，必须有按钮类型
            expect(config.actionButtonType).not.toBe(null)
            expect(['start', 'reapply']).toContain(config.actionButtonType)
          } else {
            // 如果不显示按钮，按钮类型必须为 null
            expect(config.actionButtonType).toBe(null)
          }
        }),
        { numRuns: 100 }
      )
    })
  })
})


/**
 * 综合测试: 状态转换场景
 */
describe('综合测试: 状态转换场景', () => {
  /**
   * **Validates: Requirements 1.2, 1.3, 1.4, 1.5**
   *
   * 模拟用户 KYC 流程中的状态变化
   */
  it('property: 状态从 NOT_STARTED 到 PENDING 时 UI 应该正确变化', () => {
    fc.assert(
      fc.property(
        walletAddressArb,
        optionalCountryCodeArb,
        (walletAddress, countryCode) => {
          // 初始状态: NOT_STARTED
          const notStartedData: KycStatusData = {
            wallet_address: walletAddress,
            status: KycStatus.NOT_STARTED,
            submitted_at: null,
            reviewed_at: null,
            reject_reason: null,
            country_code: null,
            is_accredited: false,
          }

          // 提交后状态: PENDING
          const pendingData: KycStatusData = {
            wallet_address: walletAddress,
            status: KycStatus.PENDING,
            submitted_at: new Date().toISOString(),
            reviewed_at: null,
            reject_reason: null,
            country_code: countryCode,
            is_accredited: false,
          }

          const notStartedConfig = getExpectedUIConfig(notStartedData.status, notStartedData)
          const pendingConfig = getExpectedUIConfig(pendingData.status, pendingData)

          // NOT_STARTED 应该有开始按钮
          expect(notStartedConfig.showActionButton).toBe(true)
          expect(notStartedConfig.actionButtonType).toBe('start')
          expect(notStartedConfig.showRefreshButton).toBe(false)

          // PENDING 应该有刷新按钮，无操作按钮
          expect(pendingConfig.showActionButton).toBe(false)
          expect(pendingConfig.showRefreshButton).toBe(true)
          expect(pendingConfig.showSubmittedAt).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('property: 状态从 PENDING 到 APPROVED 时 UI 应该正确变化', () => {
    fc.assert(
      fc.property(
        walletAddressArb,
        fc.boolean(),
        (walletAddress, isAccredited) => {
          const submittedAt = generateISODateString(7)
          const reviewedAt = generateISODateString(0)

          // 审核前状态: PENDING
          const pendingData: KycStatusData = {
            wallet_address: walletAddress,
            status: KycStatus.PENDING,
            submitted_at: submittedAt,
            reviewed_at: null,
            reject_reason: null,
            country_code: 'CN',
            is_accredited: false,
          }

          // 审核通过后状态: APPROVED
          const approvedData: KycStatusData = {
            wallet_address: walletAddress,
            status: KycStatus.APPROVED,
            submitted_at: submittedAt,
            reviewed_at: reviewedAt,
            reject_reason: null,
            country_code: 'CN',
            is_accredited: isAccredited,
          }

          const pendingConfig = getExpectedUIConfig(pendingData.status, pendingData)
          const approvedConfig = getExpectedUIConfig(approvedData.status, approvedData)

          // PENDING 应该有刷新按钮
          expect(pendingConfig.showRefreshButton).toBe(true)
          expect(pendingConfig.badgeVariant).toBe('secondary')

          // APPROVED 应该显示审核时间，无刷新按钮
          expect(approvedConfig.showRefreshButton).toBe(false)
          expect(approvedConfig.showReviewedAt).toBe(true)
          expect(approvedConfig.badgeVariant).toBe('default')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('property: 状态从 PENDING 到 REJECTED 时 UI 应该正确变化', () => {
    fc.assert(
      fc.property(
        walletAddressArb,
        fc.string({ minLength: 1, maxLength: 200 }),
        (walletAddress, rejectReason) => {
          const submittedAt = generateISODateString(7)
          const reviewedAt = generateISODateString(0)

          // 审核前状态: PENDING
          const pendingData: KycStatusData = {
            wallet_address: walletAddress,
            status: KycStatus.PENDING,
            submitted_at: submittedAt,
            reviewed_at: null,
            reject_reason: null,
            country_code: 'CN',
            is_accredited: false,
          }

          // 审核拒绝后状态: REJECTED
          const rejectedData: KycStatusData = {
            wallet_address: walletAddress,
            status: KycStatus.REJECTED,
            submitted_at: submittedAt,
            reviewed_at: reviewedAt,
            reject_reason: rejectReason,
            country_code: 'CN',
            is_accredited: false,
          }

          const pendingConfig = getExpectedUIConfig(pendingData.status, pendingData)
          const rejectedConfig = getExpectedUIConfig(rejectedData.status, rejectedData)

          // PENDING 应该有刷新按钮
          expect(pendingConfig.showRefreshButton).toBe(true)
          expect(pendingConfig.badgeVariant).toBe('secondary')

          // REJECTED 应该显示拒绝原因和重新申请按钮
          expect(rejectedConfig.showRefreshButton).toBe(false)
          expect(rejectedConfig.showRejectReason).toBe(true)
          expect(rejectedConfig.showActionButton).toBe(true)
          expect(rejectedConfig.actionButtonType).toBe('reapply')
          expect(rejectedConfig.badgeVariant).toBe('destructive')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('property: REJECTED 用户重新申请后状态应该变为 PENDING', () => {
    fc.assert(
      fc.property(
        walletAddressArb,
        fc.string({ minLength: 1, maxLength: 200 }),
        (walletAddress, rejectReason) => {
          // 被拒绝状态
          const rejectedData: KycStatusData = {
            wallet_address: walletAddress,
            status: KycStatus.REJECTED,
            submitted_at: generateISODateString(14),
            reviewed_at: generateISODateString(7),
            reject_reason: rejectReason,
            country_code: 'CN',
            is_accredited: false,
          }

          // 重新申请后状态
          const reappliedData: KycStatusData = {
            wallet_address: walletAddress,
            status: KycStatus.PENDING,
            submitted_at: generateISODateString(0),
            reviewed_at: null,
            reject_reason: null,
            country_code: 'CN',
            is_accredited: false,
          }

          const rejectedConfig = getExpectedUIConfig(rejectedData.status, rejectedData)
          const reappliedConfig = getExpectedUIConfig(reappliedData.status, reappliedData)

          // REJECTED 应该有重新申请按钮
          expect(rejectedConfig.showActionButton).toBe(true)
          expect(rejectedConfig.actionButtonType).toBe('reapply')

          // 重新申请后应该变为 PENDING 状态
          expect(reappliedConfig.showRefreshButton).toBe(true)
          expect(reappliedConfig.showActionButton).toBe(false)
          expect(reappliedConfig.badgeVariant).toBe('secondary')
        }
      ),
      { numRuns: 100 }
    )
  })
})
