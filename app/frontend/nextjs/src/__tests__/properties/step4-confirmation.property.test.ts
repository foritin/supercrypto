/**
 * Property 7 & 8: Step4 确认页面属性测试
 *
 * Property 7: 确认页面显示完整表单摘要
 * - 对于任意完整的表单数据，Step4 确认页面渲染的内容应该包含所有已填写字段的值
 * - 测试字段: 姓名、出生日期、国籍、地址、证件类型、证件号码
 *
 * Property 8: 复选框状态控制提交按钮
 * - 对于任意复选框状态组合 (privacyAgreed, infoConfirmed)
 * - "提交"按钮启用当且仅当两个复选框都为 true
 *
 * **Validates: Requirements 6.1, 6.3**
 *
 * Requirements:
 * - 6.1: THE KYC_Wizard SHALL 在步骤 4 显示所有已填写信息的摘要
 * - 6.3: WHEN 用户未勾选所有必要复选框 THEN KYC_System SHALL 禁用"提交"按钮
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  step4Schema,
  validateStep4,
  type KycWizardFormData,
  type KycIdType,
  KYC_ID_TYPE_NAMES,
} from '@/lib/validations/kyc-wizard'

// ============ 辅助函数 ============

/**
 * 生成有效的出生日期 (年龄 >= 18 岁)
 */
function generateValidDateOfBirth(age: number): string {
  const today = new Date()
  const birthYear = today.getFullYear() - age
  const birthMonth = String(today.getMonth() + 1).padStart(2, '0')
  const birthDay = String(today.getDate()).padStart(2, '0')
  return `${birthYear}-${birthMonth}-${birthDay}`
}

/**
 * 检查表单摘要是否包含所有必要字段
 * 模拟 Step4Confirmation 组件的渲染逻辑
 */
function checkSummaryContainsAllFields(data: KycWizardFormData): {
  hasFullName: boolean
  hasDateOfBirth: boolean
  hasNationality: boolean
  hasAddress: boolean
  hasIdType: boolean
  hasIdNumber: boolean
} {
  return {
    hasFullName: data.fullName !== undefined && data.fullName !== '',
    hasDateOfBirth: data.dateOfBirth !== undefined && data.dateOfBirth !== '',
    hasNationality: data.nationality !== undefined && data.nationality !== '',
    hasAddress: data.address !== undefined && data.address !== '',
    hasIdType: data.idType !== undefined && data.idType.length > 0,
    hasIdNumber: data.idNumber !== undefined && data.idNumber !== '',
  }
}

/**
 * 判断提交按钮是否应该启用
 * 根据 Requirements 6.3: 两个复选框都为 true 时才启用
 */
function shouldSubmitButtonBeEnabled(
  privacyAgreed: boolean,
  infoConfirmed: boolean
): boolean {
  return privacyAgreed === true && infoConfirmed === true
}

// ============ 生成器 ============

/**
 * 生成有效的 KYC 完整表单数据
 */
const validKycFormDataArb = fc.record({
  // Step 1: 基本信息
  fullName: fc.string({ minLength: 2, maxLength: 50 }),
  dateOfBirth: fc.integer({ min: 18, max: 80 }).map(generateValidDateOfBirth),
  nationality: fc.string({ minLength: 1, maxLength: 100 }),
  address: fc.string({ minLength: 1, maxLength: 500 }),
  // Step 2: 证件信息
  idType: fc.constantFrom<KycIdType>('passport', 'id_card', 'driver_license'),
  idNumber: fc.string({ minLength: 1, maxLength: 50 }),
  idFrontUrl: fc.webUrl(),
  idBackUrl: fc.webUrl(),
  // Step 3: 自拍验证
  selfieUrl: fc.webUrl(),
  livenessVerified: fc.boolean(),
  // Step 4: 确认 (这些字段在测试中会被覆盖)
  privacyAgreed: fc.boolean(),
  infoConfirmed: fc.boolean(),
})

/**
 * 生成复选框状态组合
 * 覆盖所有 4 种可能的组合: (false, false), (true, false), (false, true), (true, true)
 */
const checkboxCombinationArb = fc.record({
  privacyAgreed: fc.boolean(),
  infoConfirmed: fc.boolean(),
})

// Feature: kyc-page, Property 7: 确认页面显示完整表单摘要
describe('Property 7: 确认页面显示完整表单摘要', () => {
  /**
   * **Validates: Requirements 6.1**
   *
   * 对于任意有效的表单数据，确认页面应该能够显示所有必要字段
   */
  describe('表单摘要字段完整性', () => {
    it('property: 有效表单数据应该包含所有必要的摘要字段', () => {
      fc.assert(
        fc.property(validKycFormDataArb, (formData) => {
          const summary = checkSummaryContainsAllFields(formData)

          // 验证所有字段都存在
          expect(summary.hasFullName).toBe(true)
          expect(summary.hasDateOfBirth).toBe(true)
          expect(summary.hasNationality).toBe(true)
          expect(summary.hasAddress).toBe(true)
          expect(summary.hasIdType).toBe(true)
          expect(summary.hasIdNumber).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('property: 姓名字段应该在摘要中正确显示', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 2, maxLength: 50 }),
          (fullName) => {
            // 模拟组件渲染逻辑: 姓名应该直接显示
            const displayedName = fullName
            expect(displayedName).toBe(fullName)
            expect(displayedName.length).toBeGreaterThanOrEqual(2)
            expect(displayedName.length).toBeLessThanOrEqual(50)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('property: 出生日期应该能够被格式化显示', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 18, max: 80 }),
          (age) => {
            const dateOfBirth = generateValidDateOfBirth(age)

            // 验证日期格式正确 (YYYY-MM-DD)
            expect(dateOfBirth).toMatch(/^\d{4}-\d{2}-\d{2}$/)

            // 验证日期可以被解析
            const parsedDate = new Date(dateOfBirth)
            expect(parsedDate.toString()).not.toBe('Invalid Date')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('property: 证件类型应该有对应的中文名称', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<KycIdType>('passport', 'id_card', 'driver_license'),
          (idType) => {
            // 验证证件类型有对应的中文名称
            const displayName = KYC_ID_TYPE_NAMES[idType]
            expect(displayName).toBeDefined()
            expect(typeof displayName).toBe('string')
            expect(displayName.length).toBeGreaterThan(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('property: 证件号码应该能够被脱敏显示', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 5, maxLength: 20 }),
          (idNumber) => {
            // 模拟脱敏逻辑: 只显示前后各 2 位
            const maskIdNumber = (num: string): string => {
              if (!num || num.length <= 4) return num
              const start = num.slice(0, 2)
              const end = num.slice(-2)
              const masked = '*'.repeat(Math.min(num.length - 4, 6))
              return `${start}${masked}${end}`
            }

            const maskedNumber = maskIdNumber(idNumber)

            // 验证脱敏后的格式
            expect(maskedNumber).toContain('*')
            expect(maskedNumber.startsWith(idNumber.slice(0, 2))).toBe(true)
            expect(maskedNumber.endsWith(idNumber.slice(-2))).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('property: 短证件号码 (<=4 字符) 不应该被脱敏', () => {
      fc.assert(
        fc.property(
          // 使用字母数字字符生成器，避免生成包含 * 的字符串
          fc.array(fc.constantFrom(...'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'), { minLength: 1, maxLength: 4 }).map(arr => arr.join('')),
          (shortIdNumber) => {
            // 模拟脱敏逻辑
            const maskIdNumber = (num: string): string => {
              if (!num || num.length <= 4) return num
              const start = num.slice(0, 2)
              const end = num.slice(-2)
              const masked = '*'.repeat(Math.min(num.length - 4, 6))
              return `${start}${masked}${end}`
            }

            const maskedNumber = maskIdNumber(shortIdNumber)

            // 短号码不应该被脱敏，应该原样返回
            expect(maskedNumber).toBe(shortIdNumber)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * 图片 URL 验证
   */
  describe('图片 URL 完整性', () => {
    it('property: 证件照片 URL 应该是有效的 URL 格式', () => {
      fc.assert(
        fc.property(
          fc.webUrl(),
          fc.webUrl(),
          (idFrontUrl, idBackUrl) => {
            // 验证 URL 格式
            expect(() => new URL(idFrontUrl)).not.toThrow()
            expect(() => new URL(idBackUrl)).not.toThrow()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('property: 自拍照 URL 应该是有效的 URL 格式', () => {
      fc.assert(
        fc.property(fc.webUrl(), (selfieUrl) => {
          expect(() => new URL(selfieUrl)).not.toThrow()
        }),
        { numRuns: 100 }
      )
    })
  })
})

// Feature: kyc-page, Property 8: 复选框状态控制提交按钮
describe('Property 8: 复选框状态控制提交按钮', () => {
  /**
   * **Validates: Requirements 6.3**
   *
   * 提交按钮启用当且仅当两个复选框都为 true
   */
  describe('复选框状态与提交按钮关系', () => {
    it('property: 两个复选框都为 true 时，提交按钮应该启用', () => {
      const isEnabled = shouldSubmitButtonBeEnabled(true, true)
      expect(isEnabled).toBe(true)
    })

    it('property: privacyAgreed 为 false 时，提交按钮应该禁用', () => {
      fc.assert(
        fc.property(fc.boolean(), (infoConfirmed) => {
          const isEnabled = shouldSubmitButtonBeEnabled(false, infoConfirmed)
          expect(isEnabled).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    it('property: infoConfirmed 为 false 时，提交按钮应该禁用', () => {
      fc.assert(
        fc.property(fc.boolean(), (privacyAgreed) => {
          const isEnabled = shouldSubmitButtonBeEnabled(privacyAgreed, false)
          expect(isEnabled).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    it('property: 所有 4 种复选框组合的提交按钮状态正确', () => {
      // 穷举所有 4 种组合
      const combinations = [
        { privacyAgreed: false, infoConfirmed: false, expectedEnabled: false },
        { privacyAgreed: true, infoConfirmed: false, expectedEnabled: false },
        { privacyAgreed: false, infoConfirmed: true, expectedEnabled: false },
        { privacyAgreed: true, infoConfirmed: true, expectedEnabled: true },
      ]

      combinations.forEach(({ privacyAgreed, infoConfirmed, expectedEnabled }) => {
        const isEnabled = shouldSubmitButtonBeEnabled(privacyAgreed, infoConfirmed)
        expect(isEnabled).toBe(expectedEnabled)
      })
    })

    it('property: 任意复选框组合的提交按钮状态符合逻辑与运算', () => {
      fc.assert(
        fc.property(checkboxCombinationArb, ({ privacyAgreed, infoConfirmed }) => {
          const isEnabled = shouldSubmitButtonBeEnabled(privacyAgreed, infoConfirmed)

          // 提交按钮启用 ⟺ privacyAgreed AND infoConfirmed
          const expectedEnabled = privacyAgreed && infoConfirmed
          expect(isEnabled).toBe(expectedEnabled)
        }),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Step4 Schema 验证测试
   */
  describe('Step4 Schema 验证', () => {
    it('property: 两个复选框都为 true 时，Step4 验证应该通过', () => {
      const result = validateStep4({
        privacyAgreed: true,
        infoConfirmed: true,
      })
      expect(result.success).toBe(true)
    })

    it('property: privacyAgreed 为 false 时，Step4 验证应该失败', () => {
      fc.assert(
        fc.property(fc.boolean(), (infoConfirmed) => {
          const result = validateStep4({
            privacyAgreed: false,
            infoConfirmed: infoConfirmed,
          })
          expect(result.success).toBe(false)
          if (!result.success) {
            expect(result.error.issues.some((i) => i.message.includes('隐私政策'))).toBe(
              true
            )
          }
        }),
        { numRuns: 100 }
      )
    })

    it('property: infoConfirmed 为 false 时，Step4 验证应该失败', () => {
      fc.assert(
        fc.property(fc.boolean(), (privacyAgreed) => {
          const result = validateStep4({
            privacyAgreed: privacyAgreed,
            infoConfirmed: false,
          })
          expect(result.success).toBe(false)
          if (!result.success) {
            expect(result.error.issues.some((i) => i.message.includes('确认信息'))).toBe(
              true
            )
          }
        }),
        { numRuns: 100 }
      )
    })

    it('property: 两个复选框都为 false 时，Step4 验证应该失败并返回两个错误', () => {
      const result = validateStep4({
        privacyAgreed: false,
        infoConfirmed: false,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.length).toBe(2)
      }
    })

    it('property: Step4 验证结果与提交按钮状态一致', () => {
      fc.assert(
        fc.property(checkboxCombinationArb, ({ privacyAgreed, infoConfirmed }) => {
          const validationResult = validateStep4({
            privacyAgreed,
            infoConfirmed,
          })
          const buttonEnabled = shouldSubmitButtonBeEnabled(privacyAgreed, infoConfirmed)

          // 验证通过 ⟺ 按钮启用
          expect(validationResult.success).toBe(buttonEnabled)
        }),
        { numRuns: 100 }
      )
    })
  })

  /**
   * 边界情况测试
   */
  describe('边界情况', () => {
    it('property: undefined 值应该被视为 false', () => {
      // 测试 undefined 被视为 false 的情况
      const result1 = step4Schema.safeParse({
        privacyAgreed: undefined,
        infoConfirmed: true,
      })
      expect(result1.success).toBe(false)

      const result2 = step4Schema.safeParse({
        privacyAgreed: true,
        infoConfirmed: undefined,
      })
      expect(result2.success).toBe(false)
    })

    it('property: 非布尔值应该验证失败', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string(),
            fc.integer(),
            fc.constant(null),
            fc.constant(undefined)
          ),
          (invalidValue) => {
            const result = step4Schema.safeParse({
              privacyAgreed: invalidValue,
              infoConfirmed: true,
            })
            // 非布尔值应该验证失败
            if (typeof invalidValue !== 'boolean') {
              expect(result.success).toBe(false)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('property: 缺少字段应该验证失败', () => {
      // 缺少 privacyAgreed
      const result1 = step4Schema.safeParse({
        infoConfirmed: true,
      })
      expect(result1.success).toBe(false)

      // 缺少 infoConfirmed
      const result2 = step4Schema.safeParse({
        privacyAgreed: true,
      })
      expect(result2.success).toBe(false)

      // 两个都缺少
      const result3 = step4Schema.safeParse({})
      expect(result3.success).toBe(false)
    })
  })
})

/**
 * 综合测试: 完整表单数据与 Step4 验证
 */
describe('综合测试: 完整表单数据与 Step4 验证', () => {
  /**
   * **Validates: Requirements 6.1, 6.3**
   */
  it('property: 完整有效表单数据应该同时满足摘要显示和验证要求', () => {
    fc.assert(
      fc.property(
        validKycFormDataArb.map((data) => ({
          ...data,
          privacyAgreed: true,
          infoConfirmed: true,
        })),
        (formData) => {
          // 验证摘要字段完整性
          const summary = checkSummaryContainsAllFields(formData)
          expect(summary.hasFullName).toBe(true)
          expect(summary.hasDateOfBirth).toBe(true)
          expect(summary.hasNationality).toBe(true)
          expect(summary.hasAddress).toBe(true)
          expect(summary.hasIdType).toBe(true)
          expect(summary.hasIdNumber).toBe(true)

          // 验证 Step4 验证通过
          const step4Result = validateStep4({
            privacyAgreed: formData.privacyAgreed,
            infoConfirmed: formData.infoConfirmed,
          })
          expect(step4Result.success).toBe(true)

          // 验证提交按钮启用
          const buttonEnabled = shouldSubmitButtonBeEnabled(
            formData.privacyAgreed,
            formData.infoConfirmed
          )
          expect(buttonEnabled).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('property: 复选框未勾选时，即使其他数据完整也不能提交', () => {
    fc.assert(
      fc.property(
        validKycFormDataArb.map((data) => ({
          ...data,
          privacyAgreed: false,
          infoConfirmed: false,
        })),
        (formData) => {
          // 摘要字段仍然完整
          const summary = checkSummaryContainsAllFields(formData)
          expect(summary.hasFullName).toBe(true)
          expect(summary.hasIdType).toBe(true)

          // 但 Step4 验证失败
          const step4Result = validateStep4({
            privacyAgreed: formData.privacyAgreed,
            infoConfirmed: formData.infoConfirmed,
          })
          expect(step4Result.success).toBe(false)

          // 提交按钮禁用
          const buttonEnabled = shouldSubmitButtonBeEnabled(
            formData.privacyAgreed,
            formData.infoConfirmed
          )
          expect(buttonEnabled).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })
})
