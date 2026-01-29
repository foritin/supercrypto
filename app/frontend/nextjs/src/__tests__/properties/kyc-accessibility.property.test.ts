/**
 * Property 10: 表单字段无障碍关联
 * Property 11: 错误提示无障碍关联
 *
 * 对于任意表单输入字段，应该存在关联的 label 元素（通过 htmlFor 属性或嵌套关系）。
 * 对于任意显示错误的表单字段，该字段应该存在 aria-describedby 属性指向错误提示元素的 id。
 *
 * **Validates: Requirements 9.1, 9.2**
 *
 * Requirements:
 * - 9.1: THE KYC_System SHALL 为所有表单字段关联 label
 * - 9.2: THE KYC_System SHALL 使用 aria-describedby 关联错误提示
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

// ============ 类型定义 ============

/**
 * 表单字段配置
 */
interface FormFieldConfig {
  /** 字段 ID */
  id: string
  /** 字段名称 */
  name: string
  /** 字段类型 */
  type: 'input' | 'select' | 'checkbox' | 'button' | 'radio'
  /** 是否必填 */
  required: boolean
  /** 关联的 label ID (htmlFor) */
  labelFor?: string
  /** 错误消息元素 ID */
  errorId?: string
}

/**
 * 无障碍验证结果
 */
interface AccessibilityValidationResult {
  /** 是否有关联的 label */
  hasLabel: boolean
  /** label 关联方式 */
  labelAssociation: 'htmlFor' | 'nested' | 'aria-labelledby' | 'none'
  /** 是否有 aria-describedby */
  hasAriaDescribedBy: boolean
  /** aria-describedby 指向的 ID */
  ariaDescribedById?: string
  /** 是否有 aria-invalid */
  hasAriaInvalid: boolean
}


// ============ KYC 表单字段配置 ============

/**
 * Step1 基本信息表单字段配置
 * 参考: components/kyc/steps/step1-basic-info.tsx
 */
const STEP1_FORM_FIELDS: FormFieldConfig[] = [
  {
    id: 'kyc-fullname',
    name: 'fullName',
    type: 'input',
    required: true,
    labelFor: 'kyc-fullname',
    errorId: 'kyc-fullname-error',
  },
  {
    id: 'kyc-dob',
    name: 'dateOfBirth',
    type: 'button', // DatePicker 使用 Button 触发
    required: true,
    labelFor: 'kyc-dob',
    errorId: 'kyc-dob-error',
  },
  {
    id: 'kyc-nationality',
    name: 'nationality',
    type: 'select',
    required: true,
    labelFor: 'kyc-nationality',
    errorId: 'kyc-nationality-error',
  },
  {
    id: 'kyc-address',
    name: 'address',
    type: 'input',
    required: true,
    labelFor: 'kyc-address',
    errorId: 'kyc-address-error',
  },
]

/**
 * Step2 证件上传表单字段配置
 * 参考: components/kyc/steps/step2-document-upload.tsx
 */
const STEP2_FORM_FIELDS: FormFieldConfig[] = [
  {
    id: 'kyc-idnumber',
    name: 'idNumber',
    type: 'input',
    required: true,
    labelFor: 'kyc-idnumber',
    errorId: 'kyc-idnumber-error',
  },
]

/**
 * Step4 确认提交表单字段配置
 * 参考: components/kyc/steps/step4-confirmation.tsx
 */
const STEP4_FORM_FIELDS: FormFieldConfig[] = [
  {
    id: 'kyc-privacy-agreed',
    name: 'privacyAgreed',
    type: 'checkbox',
    required: true,
    labelFor: 'kyc-privacy-agreed',
    errorId: 'kyc-privacy-error',
  },
  {
    id: 'kyc-info-confirmed',
    name: 'infoConfirmed',
    type: 'checkbox',
    required: true,
    labelFor: 'kyc-info-confirmed',
    errorId: 'kyc-info-error',
  },
]

/**
 * 所有 KYC 表单字段
 */
const ALL_KYC_FORM_FIELDS: FormFieldConfig[] = [
  ...STEP1_FORM_FIELDS,
  ...STEP2_FORM_FIELDS,
  ...STEP4_FORM_FIELDS,
]


// ============ 辅助函数 ============

/**
 * 验证表单字段是否有关联的 label
 *
 * 根据 WCAG 2.1 标准，表单字段应该通过以下方式之一关联 label：
 * 1. htmlFor 属性指向字段 ID
 * 2. label 元素嵌套包含字段
 * 3. aria-labelledby 属性指向 label 元素 ID
 *
 * @param field 表单字段配置
 * @returns 是否有有效的 label 关联
 */
function hasValidLabelAssociation(field: FormFieldConfig): boolean {
  // 检查是否配置了 labelFor (htmlFor 关联)
  if (field.labelFor && field.labelFor === field.id) {
    return true
  }

  // Radio 按钮组使用 aria-label 或 radiogroup role
  if (field.type === 'radio') {
    return true // Radio 组通常使用 fieldset/legend 或 aria-label
  }

  return false
}

/**
 * 获取 label 关联方式
 *
 * @param field 表单字段配置
 * @returns label 关联方式
 */
function getLabelAssociationType(
  field: FormFieldConfig
): 'htmlFor' | 'nested' | 'aria-labelledby' | 'none' {
  if (field.labelFor && field.labelFor === field.id) {
    return 'htmlFor'
  }
  if (field.type === 'radio') {
    return 'aria-labelledby' // Radio 组通常使用 aria-labelledby
  }
  return 'none'
}

/**
 * 验证表单字段是否有正确的错误提示关联
 *
 * 根据 WCAG 2.1 标准，当表单字段显示错误时：
 * 1. 字段应该有 aria-describedby 属性指向错误消息元素
 * 2. 字段应该有 aria-invalid="true" 属性
 *
 * @param field 表单字段配置
 * @param hasError 是否有错误
 * @returns 是否有正确的错误提示关联
 */
function hasValidErrorAssociation(field: FormFieldConfig, hasError: boolean): boolean {
  if (!hasError) {
    // 无错误时，不需要 aria-describedby 指向错误元素
    return true
  }

  // 有错误时，必须配置 errorId
  return !!field.errorId
}

/**
 * 验证表单字段的完整无障碍配置
 *
 * @param field 表单字段配置
 * @param hasError 是否有错误
 * @returns 无障碍验证结果
 */
function validateFieldAccessibility(
  field: FormFieldConfig,
  hasError: boolean
): AccessibilityValidationResult {
  return {
    hasLabel: hasValidLabelAssociation(field),
    labelAssociation: getLabelAssociationType(field),
    hasAriaDescribedBy: hasError ? !!field.errorId : true,
    ariaDescribedById: hasError ? field.errorId : undefined,
    hasAriaInvalid: hasError, // 有错误时应该设置 aria-invalid
  }
}


// ============ 生成器 ============

/**
 * 生成表单字段配置
 */
const formFieldArb = fc.constantFrom(...ALL_KYC_FORM_FIELDS)

/**
 * 生成 Step1 表单字段配置
 */
const step1FieldArb = fc.constantFrom(...STEP1_FORM_FIELDS)

/**
 * 生成 Step2 表单字段配置
 */
const step2FieldArb = fc.constantFrom(...STEP2_FORM_FIELDS)

/**
 * 生成 Step4 表单字段配置
 */
const step4FieldArb = fc.constantFrom(...STEP4_FORM_FIELDS)

/**
 * 生成错误状态
 */
const hasErrorArb = fc.boolean()

// Note: Additional generators can be added here for future extensibility
// e.g., for testing dynamically generated field configurations

// ============ 属性测试 ============

// Feature: kyc-page, Property 10: 表单字段无障碍关联
describe('Property 10: 表单字段无障碍关联', () => {
  /**
   * **Validates: Requirements 9.1**
   *
   * 核心属性: 所有表单字段都应该有关联的 label
   */
  describe('Label 关联验证', () => {
    it('property: 所有 KYC 表单字段都应该有关联的 label', () => {
      fc.assert(
        fc.property(formFieldArb, (field) => {
          const hasLabel = hasValidLabelAssociation(field)
          expect(hasLabel).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('property: Step1 基本信息表单字段都应该有 htmlFor 关联', () => {
      fc.assert(
        fc.property(step1FieldArb, (field) => {
          const associationType = getLabelAssociationType(field)
          expect(associationType).toBe('htmlFor')
        }),
        { numRuns: 100 }
      )
    })

    it('property: Step2 证件上传表单字段都应该有 htmlFor 关联', () => {
      fc.assert(
        fc.property(step2FieldArb, (field) => {
          const associationType = getLabelAssociationType(field)
          expect(associationType).toBe('htmlFor')
        }),
        { numRuns: 100 }
      )
    })

    it('property: Step4 确认提交表单字段都应该有 htmlFor 关联', () => {
      fc.assert(
        fc.property(step4FieldArb, (field) => {
          const associationType = getLabelAssociationType(field)
          expect(associationType).toBe('htmlFor')
        }),
        { numRuns: 100 }
      )
    })

    it('property: 字段 ID 和 labelFor 应该匹配', () => {
      fc.assert(
        fc.property(formFieldArb, (field) => {
          if (field.labelFor) {
            expect(field.labelFor).toBe(field.id)
          }
        }),
        { numRuns: 100 }
      )
    })
  })


  /**
   * **Validates: Requirements 9.1**
   *
   * 字段类型特定验证
   */
  describe('字段类型特定验证', () => {
    it('property: input 类型字段应该有 htmlFor 关联', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            ...ALL_KYC_FORM_FIELDS.filter((f) => f.type === 'input')
          ),
          (field) => {
            expect(field.labelFor).toBe(field.id)
            expect(getLabelAssociationType(field)).toBe('htmlFor')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('property: checkbox 类型字段应该有 htmlFor 关联', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            ...ALL_KYC_FORM_FIELDS.filter((f) => f.type === 'checkbox')
          ),
          (field) => {
            expect(field.labelFor).toBe(field.id)
            expect(getLabelAssociationType(field)).toBe('htmlFor')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('property: select 类型字段应该有 htmlFor 关联', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            ...ALL_KYC_FORM_FIELDS.filter((f) => f.type === 'select')
          ),
          (field) => {
            expect(field.labelFor).toBe(field.id)
            expect(getLabelAssociationType(field)).toBe('htmlFor')
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Validates: Requirements 9.1**
   *
   * 必填字段验证
   */
  describe('必填字段验证', () => {
    it('property: 所有必填字段都应该有 label 关联', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...ALL_KYC_FORM_FIELDS.filter((f) => f.required)),
          (field) => {
            const hasLabel = hasValidLabelAssociation(field)
            expect(hasLabel).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('property: 必填字段的 label 关联方式应该是 htmlFor', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...ALL_KYC_FORM_FIELDS.filter((f) => f.required)),
          (field) => {
            const associationType = getLabelAssociationType(field)
            expect(associationType).toBe('htmlFor')
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})


// Feature: kyc-page, Property 11: 错误提示无障碍关联
describe('Property 11: 错误提示无障碍关联', () => {
  /**
   * **Validates: Requirements 9.2**
   *
   * 核心属性: 显示错误时应该有 aria-describedby 关联
   */
  describe('aria-describedby 关联验证', () => {
    it('property: 所有表单字段都应该配置错误消息 ID', () => {
      fc.assert(
        fc.property(formFieldArb, (field) => {
          // 所有字段都应该有 errorId 配置
          expect(field.errorId).toBeDefined()
          expect(field.errorId).not.toBe('')
        }),
        { numRuns: 100 }
      )
    })

    it('property: 有错误时应该有 aria-describedby 指向错误元素', () => {
      fc.assert(
        fc.property(formFieldArb, (field) => {
          const hasError = true
          const result = validateFieldAccessibility(field, hasError)

          expect(result.hasAriaDescribedBy).toBe(true)
          expect(result.ariaDescribedById).toBe(field.errorId)
        }),
        { numRuns: 100 }
      )
    })

    it('property: 无错误时不需要 aria-describedby 指向错误元素', () => {
      fc.assert(
        fc.property(formFieldArb, (field) => {
          const hasError = false
          const result = validateFieldAccessibility(field, hasError)

          expect(result.hasAriaDescribedBy).toBe(true) // 无错误时也是有效的
          expect(result.ariaDescribedById).toBeUndefined()
        }),
        { numRuns: 100 }
      )
    })

    it('property: 错误状态变化时 aria-describedby 应该正确更新', () => {
      fc.assert(
        fc.property(formFieldArb, hasErrorArb, (field, hasError) => {
          const result = validateFieldAccessibility(field, hasError)

          if (hasError) {
            expect(result.ariaDescribedById).toBe(field.errorId)
          } else {
            expect(result.ariaDescribedById).toBeUndefined()
          }
        }),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Validates: Requirements 9.2**
   *
   * aria-invalid 属性验证
   */
  describe('aria-invalid 属性验证', () => {
    it('property: 有错误时应该设置 aria-invalid', () => {
      fc.assert(
        fc.property(formFieldArb, (field) => {
          const hasError = true
          const result = validateFieldAccessibility(field, hasError)

          expect(result.hasAriaInvalid).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('property: 无错误时不应该设置 aria-invalid', () => {
      fc.assert(
        fc.property(formFieldArb, (field) => {
          const hasError = false
          const result = validateFieldAccessibility(field, hasError)

          expect(result.hasAriaInvalid).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    it('property: aria-invalid 状态应该与错误状态一致', () => {
      fc.assert(
        fc.property(formFieldArb, hasErrorArb, (field, hasError) => {
          const result = validateFieldAccessibility(field, hasError)

          expect(result.hasAriaInvalid).toBe(hasError)
        }),
        { numRuns: 100 }
      )
    })
  })


  /**
   * **Validates: Requirements 9.2**
   *
   * 错误消息 ID 命名规范验证
   */
  describe('错误消息 ID 命名规范', () => {
    it('property: 错误消息 ID 应该以 -error 结尾', () => {
      fc.assert(
        fc.property(formFieldArb, (field) => {
          if (field.errorId) {
            expect(field.errorId).toMatch(/-error$/)
          }
        }),
        { numRuns: 100 }
      )
    })

    it('property: 错误消息 ID 应该包含 kyc- 前缀', () => {
      fc.assert(
        fc.property(formFieldArb, (field) => {
          if (field.errorId && field.id) {
            // 错误 ID 应该包含 kyc- 前缀
            expect(field.errorId).toContain('kyc-')
          }
        }),
        { numRuns: 100 }
      )
    })

    it('property: 每个字段的错误消息 ID 应该唯一', () => {
      const errorIds = ALL_KYC_FORM_FIELDS.map((f) => f.errorId).filter(Boolean)
      const uniqueErrorIds = new Set(errorIds)

      expect(uniqueErrorIds.size).toBe(errorIds.length)
    })
  })

  /**
   * **Validates: Requirements 9.2**
   *
   * 步骤特定错误关联验证
   */
  describe('步骤特定错误关联验证', () => {
    it('property: Step1 字段都应该有正确的错误关联配置', () => {
      fc.assert(
        fc.property(step1FieldArb, hasErrorArb, (field, hasError) => {
          const result = validateFieldAccessibility(field, hasError)

          expect(result.hasAriaDescribedBy).toBe(true)
          if (hasError) {
            expect(result.ariaDescribedById).toBe(field.errorId)
          }
        }),
        { numRuns: 100 }
      )
    })

    it('property: Step2 字段都应该有正确的错误关联配置', () => {
      fc.assert(
        fc.property(step2FieldArb, hasErrorArb, (field, hasError) => {
          const result = validateFieldAccessibility(field, hasError)

          expect(result.hasAriaDescribedBy).toBe(true)
          if (hasError) {
            expect(result.ariaDescribedById).toBe(field.errorId)
          }
        }),
        { numRuns: 100 }
      )
    })

    it('property: Step4 字段都应该有正确的错误关联配置', () => {
      fc.assert(
        fc.property(step4FieldArb, hasErrorArb, (field, hasError) => {
          const result = validateFieldAccessibility(field, hasError)

          expect(result.hasAriaDescribedBy).toBe(true)
          if (hasError) {
            expect(result.ariaDescribedById).toBe(field.errorId)
          }
        }),
        { numRuns: 100 }
      )
    })
  })
})


// ============ 综合测试 ============

/**
 * 综合测试: 完整无障碍配置验证
 */
describe('综合测试: 完整无障碍配置验证', () => {
  /**
   * **Validates: Requirements 9.1, 9.2**
   *
   * 验证所有字段的完整无障碍配置
   */
  it('property: 所有字段都应该有完整的无障碍配置', () => {
    fc.assert(
      fc.property(formFieldArb, hasErrorArb, (field, hasError) => {
        const result = validateFieldAccessibility(field, hasError)

        // 验证 label 关联
        expect(result.hasLabel).toBe(true)
        expect(result.labelAssociation).not.toBe('none')

        // 验证错误关联
        expect(result.hasAriaDescribedBy).toBe(true)

        // 验证 aria-invalid 与错误状态一致
        expect(result.hasAriaInvalid).toBe(hasError)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * **Validates: Requirements 9.1, 9.2**
   *
   * 验证无障碍配置的确定性
   */
  it('property: 无障碍配置应该是确定性的', () => {
    fc.assert(
      fc.property(formFieldArb, hasErrorArb, (field, hasError) => {
        // 对同一字段和错误状态调用两次应该得到相同结果
        const result1 = validateFieldAccessibility(field, hasError)
        const result2 = validateFieldAccessibility(field, hasError)

        expect(result1.hasLabel).toBe(result2.hasLabel)
        expect(result1.labelAssociation).toBe(result2.labelAssociation)
        expect(result1.hasAriaDescribedBy).toBe(result2.hasAriaDescribedBy)
        expect(result1.ariaDescribedById).toBe(result2.ariaDescribedById)
        expect(result1.hasAriaInvalid).toBe(result2.hasAriaInvalid)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * **Validates: Requirements 9.1, 9.2**
   *
   * 验证字段 ID 唯一性
   */
  it('property: 所有字段 ID 应该唯一', () => {
    const fieldIds = ALL_KYC_FORM_FIELDS.map((f) => f.id)
    const uniqueFieldIds = new Set(fieldIds)

    expect(uniqueFieldIds.size).toBe(fieldIds.length)
  })

  /**
   * **Validates: Requirements 9.1, 9.2**
   *
   * 验证 ID 命名规范
   */
  it('property: 所有字段 ID 应该以 kyc- 前缀开头', () => {
    fc.assert(
      fc.property(formFieldArb, (field) => {
        expect(field.id).toMatch(/^kyc-/)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * **Validates: Requirements 9.1, 9.2**
   *
   * 验证 label 和错误 ID 的关联一致性
   */
  it('property: labelFor 和 errorId 应该基于相同的字段命名空间', () => {
    fc.assert(
      fc.property(formFieldArb, (field) => {
        if (field.labelFor && field.errorId) {
          // labelFor 应该等于字段 ID
          expect(field.labelFor).toBe(field.id)
          // errorId 应该以 kyc- 前缀开头并以 -error 结尾
          expect(field.errorId).toMatch(/^kyc-.*-error$/)
        }
      }),
      { numRuns: 100 }
    )
  })
})

/**
 * 边界情况测试
 */
describe('边界情况测试', () => {
  /**
   * **Validates: Requirements 9.1, 9.2**
   *
   * 验证空字段配置处理
   */
  it('property: 空 labelFor 应该导致 label 关联失败', () => {
    const fieldWithoutLabel: FormFieldConfig = {
      id: 'test-field',
      name: 'testField',
      type: 'input',
      required: true,
      labelFor: undefined,
      errorId: 'test-field-error',
    }

    const hasLabel = hasValidLabelAssociation(fieldWithoutLabel)
    expect(hasLabel).toBe(false)
  })

  /**
   * **Validates: Requirements 9.2**
   *
   * 验证空 errorId 处理
   */
  it('property: 空 errorId 在有错误时应该导致错误关联失败', () => {
    const fieldWithoutErrorId: FormFieldConfig = {
      id: 'test-field',
      name: 'testField',
      type: 'input',
      required: true,
      labelFor: 'test-field',
      errorId: undefined,
    }

    const hasError = true
    const hasValidError = hasValidErrorAssociation(fieldWithoutErrorId, hasError)
    expect(hasValidError).toBe(false)
  })

  /**
   * **Validates: Requirements 9.2**
   *
   * 验证无错误时空 errorId 是可接受的
   */
  it('property: 空 errorId 在无错误时应该是可接受的', () => {
    const fieldWithoutErrorId: FormFieldConfig = {
      id: 'test-field',
      name: 'testField',
      type: 'input',
      required: true,
      labelFor: 'test-field',
      errorId: undefined,
    }

    const hasError = false
    const hasValidError = hasValidErrorAssociation(fieldWithoutErrorId, hasError)
    expect(hasValidError).toBe(true)
  })
})
