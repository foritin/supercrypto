/**
 * Property 4: Step1 表单验证规则正确
 *
 * 对于任意输入值：
 * - 姓名验证：长度 2-50 字符时通过，否则失败
 * - 出生日期验证：年龄 >= 18 岁时通过，否则失败
 * - 地址验证：非空时通过，否则失败
 * - 证件号码验证：非空时通过，否则失败
 *
 * **Validates: Requirements 3.2, 3.3, 3.5**
 *
 * Requirements:
 * - 3.2: WHEN 用户输入姓名 THEN Form_Validator SHALL 验证长度为 2-50 字符
 * - 3.3: WHEN 用户选择出生日期 THEN Form_Validator SHALL 验证年龄大于等于 18 岁
 * - 3.5: WHEN 用户输入居住地址 THEN Form_Validator SHALL 验证非空
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  step1Schema,
  step2Schema,
  calculateAge,
  validateStep1,
  validateStep2,
  KYC_MIN_AGE,
} from '@/lib/validations/kyc-wizard'

// Feature: kyc-page, Property 4: Step1 表单验证规则正确
describe('Property 4: Step1 表单验证规则正确', () => {
  /**
   * 姓名验证属性测试
   * **Validates: Requirements 3.2**
   */
  describe('姓名验证 (fullName)', () => {
    it('property: 长度 2-50 字符的姓名应该验证通过', () => {
      fc.assert(
        fc.property(
          // 生成长度在 2-50 之间的非空字符串
          fc.string({ minLength: 2, maxLength: 50 }),
          (validName) => {
            const result = step1Schema.shape.fullName.safeParse(validName)
            expect(result.success).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('property: 长度小于 2 字符的姓名应该验证失败', () => {
      fc.assert(
        fc.property(
          // 生成长度为 0 或 1 的字符串
          fc.string({ minLength: 0, maxLength: 1 }),
          (shortName) => {
            const result = step1Schema.shape.fullName.safeParse(shortName)
            expect(result.success).toBe(false)
            if (!result.success) {
              expect(result.error.issues[0].message).toContain('2')
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('property: 长度超过 50 字符的姓名应该验证失败', () => {
      fc.assert(
        fc.property(
          // 生成长度超过 50 的字符串
          fc.string({ minLength: 51, maxLength: 100 }),
          (longName) => {
            const result = step1Schema.shape.fullName.safeParse(longName)
            expect(result.success).toBe(false)
            if (!result.success) {
              expect(result.error.issues[0].message).toContain('50')
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('property: 姓名长度边界值测试 (2 和 50)', () => {
      // 测试边界值 2
      const minBoundary = 'AB'
      expect(step1Schema.shape.fullName.safeParse(minBoundary).success).toBe(true)

      // 测试边界值 50
      const maxBoundary = 'A'.repeat(50)
      expect(step1Schema.shape.fullName.safeParse(maxBoundary).success).toBe(true)

      // 测试边界值 1 (应该失败)
      const belowMin = 'A'
      expect(step1Schema.shape.fullName.safeParse(belowMin).success).toBe(false)

      // 测试边界值 51 (应该失败)
      const aboveMax = 'A'.repeat(51)
      expect(step1Schema.shape.fullName.safeParse(aboveMax).success).toBe(false)
    })
  })

  /**
   * 出生日期验证属性测试
   * **Validates: Requirements 3.3**
   */
  describe('出生日期验证 (dateOfBirth)', () => {
    /**
     * 生成有效的出生日期 (年龄 >= KYC_MIN_AGE)
     */
    const validDateOfBirthArb = fc
      .integer({ min: KYC_MIN_AGE, max: 100 })
      .map((age) => {
        const today = new Date()
        const birthYear = today.getFullYear() - age
        // 使用固定的月份和日期确保年龄计算准确
        const birthMonth = String(today.getMonth() + 1).padStart(2, '0')
        const birthDay = String(today.getDate()).padStart(2, '0')
        return `${birthYear}-${birthMonth}-${birthDay}`
      })

    /**
     * 生成无效的出生日期 (年龄 < KYC_MIN_AGE)
     */
    const invalidDateOfBirthArb = fc
      .integer({ min: 0, max: KYC_MIN_AGE - 1 })
      .map((age) => {
        const today = new Date()
        const birthYear = today.getFullYear() - age
        // 使用明天的日期确保年龄计算准确 (还没过生日)
        const birthMonth = String(today.getMonth() + 1).padStart(2, '0')
        const birthDay = String(Math.min(today.getDate() + 1, 28)).padStart(2, '0')
        return `${birthYear}-${birthMonth}-${birthDay}`
      })

    it('property: 年龄 >= KYC_MIN_AGE 的出生日期应该验证通过', () => {
      fc.assert(
        fc.property(validDateOfBirthArb, (validDate) => {
          const result = step1Schema.shape.dateOfBirth.safeParse(validDate)
          expect(result.success).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('property: 年龄 < KYC_MIN_AGE 的出生日期应该验证失败', () => {
      fc.assert(
        fc.property(invalidDateOfBirthArb, (invalidDate) => {
          const result = step1Schema.shape.dateOfBirth.safeParse(invalidDate)
          expect(result.success).toBe(false)
          if (!result.success) {
            expect(result.error.issues[0].message).toContain(String(KYC_MIN_AGE))
          }
        }),
        { numRuns: 100 }
      )
    })

    it('property: calculateAge 函数正确计算年龄', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 120 }),
          (expectedAge) => {
            const today = new Date()
            const birthYear = today.getFullYear() - expectedAge
            const birthMonth = String(today.getMonth() + 1).padStart(2, '0')
            const birthDay = String(today.getDate()).padStart(2, '0')
            const dateOfBirth = `${birthYear}-${birthMonth}-${birthDay}`

            const calculatedAge = calculateAge(dateOfBirth)
            expect(calculatedAge).toBe(expectedAge)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('property: 无效日期格式应该返回 -1', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(''),
            fc.constant('invalid-date'),
            fc.constant('2024-13-01'), // 无效月份
            fc.constant('not-a-date')
          ),
          (invalidDate) => {
            const age = calculateAge(invalidDate)
            expect(age).toBe(-1)
          }
        ),
        { numRuns: 100 }
      )
    })

    it(`property: 年龄边界值测试 (${KYC_MIN_AGE} 岁)`, () => {
      const today = new Date()

      // 刚好达到最低年龄 (今天生日)
      const exactlyMinAge = `${today.getFullYear() - KYC_MIN_AGE}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      expect(step1Schema.shape.dateOfBirth.safeParse(exactlyMinAge).success).toBe(true)

      // 差一天满最低年龄 (明天生日)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const almostMinAge = `${today.getFullYear() - KYC_MIN_AGE}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
      expect(step1Schema.shape.dateOfBirth.safeParse(almostMinAge).success).toBe(false)
    })
  })

  /**
   * 居住地址验证属性测试
   * **Validates: Requirements 3.5**
   */
  describe('居住地址验证 (address)', () => {
    it('property: 非空地址应该验证通过', () => {
      fc.assert(
        fc.property(
          // 生成非空字符串
          fc.string({ minLength: 1, maxLength: 500 }),
          (validAddress) => {
            const result = step1Schema.shape.address.safeParse(validAddress)
            expect(result.success).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('property: 空地址应该验证失败', () => {
      const result = step1Schema.shape.address.safeParse('')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('地址')
      }
    })
  })

  /**
   * 国籍验证属性测试
   * **Validates: Requirements 3.4**
   */
  describe('国籍验证 (nationality)', () => {
    it('property: 非空国籍应该验证通过', () => {
      fc.assert(
        fc.property(
          // 生成非空字符串
          fc.string({ minLength: 1, maxLength: 100 }),
          (validNationality) => {
            const result = step1Schema.shape.nationality.safeParse(validNationality)
            expect(result.success).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('property: 空国籍应该验证失败', () => {
      const result = step1Schema.shape.nationality.safeParse('')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('国籍')
      }
    })
  })

  /**
   * Step1 完整表单验证属性测试
   * **Validates: Requirements 3.2, 3.3, 3.5**
   */
  describe('Step1 完整表单验证', () => {
    /**
     * 生成有效的 Step1 表单数据
     */
    const validStep1DataArb = fc.record({
      fullName: fc.string({ minLength: 2, maxLength: 50 }),
      dateOfBirth: fc.integer({ min: 18, max: 100 }).map((age) => {
        const today = new Date()
        const birthYear = today.getFullYear() - age
        const birthMonth = String(today.getMonth() + 1).padStart(2, '0')
        const birthDay = String(today.getDate()).padStart(2, '0')
        return `${birthYear}-${birthMonth}-${birthDay}`
      }),
      nationality: fc.string({ minLength: 1, maxLength: 100 }),
      address: fc.string({ minLength: 1, maxLength: 500 }),
    })

    it('property: 有效的 Step1 数据应该验证通过', () => {
      fc.assert(
        fc.property(validStep1DataArb, (validData) => {
          const result = validateStep1(validData)
          expect(result.success).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('property: 任意一个字段无效时 Step1 验证应该失败', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // 姓名无效
            fc.record({
              fullName: fc.string({ minLength: 0, maxLength: 1 }),
              dateOfBirth: fc.constant('1990-01-01'),
              nationality: fc.constant('China'),
              address: fc.constant('Beijing'),
            }),
            // 年龄无效
            fc.record({
              fullName: fc.constant('Valid Name'),
              dateOfBirth: fc.constant(
                `${new Date().getFullYear() - 10}-01-01`
              ), // 10 岁
              nationality: fc.constant('China'),
              address: fc.constant('Beijing'),
            }),
            // 地址为空
            fc.record({
              fullName: fc.constant('Valid Name'),
              dateOfBirth: fc.constant('1990-01-01'),
              nationality: fc.constant('China'),
              address: fc.constant(''),
            }),
            // 国籍为空
            fc.record({
              fullName: fc.constant('Valid Name'),
              dateOfBirth: fc.constant('1990-01-01'),
              nationality: fc.constant(''),
              address: fc.constant('Beijing'),
            })
          ),
          (invalidData) => {
            const result = validateStep1(invalidData)
            expect(result.success).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Step2 证件号码验证属性测试
   * **Validates: Requirements 4.3**
   */
  describe('证件号码验证 (idNumber)', () => {
    it('property: 非空证件号码应该验证通过', () => {
      fc.assert(
        fc.property(
          // 生成非空字符串
          fc.string({ minLength: 1, maxLength: 50 }),
          (validIdNumber) => {
            const result = step2Schema.shape.idNumber.safeParse(validIdNumber)
            expect(result.success).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('property: 空证件号码应该验证失败', () => {
      const result = step2Schema.shape.idNumber.safeParse('')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('证件号码')
      }
    })
  })

  /**
   * Step2 完整表单验证属性测试
   * **Validates: Requirements 4.3**
   */
  describe('Step2 完整表单验证', () => {
    /**
     * 生成有效的 Step2 表单数据
     */
    const validStep2DataArb = fc.record({
      idType: fc.constantFrom('passport', 'id_card', 'driver_license'),
      idNumber: fc.stringMatching(/^[A-Za-z0-9]{1,50}$/),
      documentExpiry: fc.constant(
        `${new Date().getFullYear() + 2}-06-15`
      ),
      idFrontUrl: fc.webUrl(),
      idBackUrl: fc.webUrl(),
    })

    it('property: 有效的 Step2 数据应该验证通过', () => {
      fc.assert(
        fc.property(validStep2DataArb, (validData) => {
          const result = validateStep2(validData)
          expect(result.success).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('property: 证件号码为空时 Step2 验证应该失败', () => {
      fc.assert(
        fc.property(
          fc.record({
            idType: fc.constantFrom('passport', 'id_card', 'driver_license'),
            idNumber: fc.constant(''),
            idFrontUrl: fc.webUrl(),
            idBackUrl: fc.webUrl(),
          }),
          (invalidData) => {
            const result = validateStep2(invalidData)
            expect(result.success).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
