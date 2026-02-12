/**
 * Property 2: 步骤导航数据保持一致性
 *
 * 对于任意有效的表单数据和当前步骤，执行以下操作序列后表单数据应该保持不变：
 * 1. 点击"下一步"进入下一步骤
 * 2. 点击"上一步"返回原步骤
 *
 * **Validates: Requirements 2.2, 2.3**
 *
 * Requirements:
 * - 2.2: WHEN 用户点击"下一步"按钮 THEN KYC_Wizard SHALL 验证当前步骤表单并在通过后进入下一步
 * - 2.3: WHEN 用户点击"上一步"按钮 THEN KYC_Wizard SHALL 保留已填写数据并返回上一步
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  type KycWizardFormData,
  type KycIdType,
  kycWizardDefaultValues,
  validateStep1,
  validateStep2,
  validateStep3,
  validateStep4,
} from '@/lib/validations/kyc-wizard'

// ============ 常量 ============

/** 步骤总数 */
const TOTAL_STEPS = 4

/** 最小步骤索引 */
const MIN_STEP = 0

/** 最大步骤索引 */
const MAX_STEP = TOTAL_STEPS - 1

// ============ 类型定义 ============

/**
 * 向导状态 (模拟 KycWizard 组件内部状态)
 */
interface WizardState {
  currentStep: number
  formData: KycWizardFormData
  stepValidation: boolean[]
}

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
 * 创建初始向导状态
 */
function createInitialState(
  formData: KycWizardFormData,
  currentStep: number = 0
): WizardState {
  // 计算各步骤验证状态
  const stepValidation = [
    validateStep1({
      fullName: formData.fullName,
      dateOfBirth: formData.dateOfBirth,
      nationality: formData.nationality,
      address: formData.address,
    }).success,
    validateStep2({
      idType: formData.idType,
      idNumber: formData.idNumber,
      documentExpiry: formData.documentExpiry,
      idFrontUrl: formData.idFrontUrl,
      idBackUrl: formData.idBackUrl,
    }).success,
    validateStep3({
      selfieUrl: formData.selfieUrl,
      livenessVerified: formData.livenessVerified,
    }).success,
    validateStep4({
      privacyAgreed: formData.privacyAgreed,
      infoConfirmed: formData.infoConfirmed,
    }).success,
  ]

  return {
    currentStep: Math.max(MIN_STEP, Math.min(MAX_STEP, currentStep)),
    formData,
    stepValidation,
  }
}

/**
 * 模拟"下一步"操作
 * Requirements 2.2: 验证当前步骤表单并在通过后进入下一步
 *
 * @returns 新状态和是否成功导航
 */
function goToNextStep(state: WizardState): { newState: WizardState; success: boolean } {
  const { currentStep, stepValidation, formData } = state

  // 检查是否已经是最后一步
  if (currentStep >= MAX_STEP) {
    return { newState: state, success: false }
  }

  // 检查当前步骤是否验证通过
  if (!stepValidation[currentStep]) {
    return { newState: state, success: false }
  }

  // 导航到下一步
  return {
    newState: {
      ...state,
      currentStep: currentStep + 1,
      formData: { ...formData }, // 保持数据不变
    },
    success: true,
  }
}

/**
 * 模拟"上一步"操作
 * Requirements 2.3: 保留已填写数据并返回上一步
 *
 * @returns 新状态和是否成功导航
 */
function goToPreviousStep(state: WizardState): { newState: WizardState; success: boolean } {
  const { currentStep, formData } = state

  // 检查是否已经是第一步
  if (currentStep <= MIN_STEP) {
    return { newState: state, success: false }
  }

  // 导航到上一步，保留数据
  return {
    newState: {
      ...state,
      currentStep: currentStep - 1,
      formData: { ...formData }, // 保持数据不变
    },
    success: true,
  }
}

/**
 * 模拟跳转到指定步骤 (仅允许跳转到已完成的步骤)
 */
function goToStep(
  state: WizardState,
  targetStep: number
): { newState: WizardState; success: boolean } {
  const { currentStep, formData } = state

  // 检查目标步骤是否有效
  if (targetStep < MIN_STEP || targetStep >= TOTAL_STEPS) {
    return { newState: state, success: false }
  }

  // 只允许跳转到当前步骤之前的步骤
  if (targetStep >= currentStep) {
    return { newState: state, success: false }
  }

  return {
    newState: {
      ...state,
      currentStep: targetStep,
      formData: { ...formData },
    },
    success: true,
  }
}

/**
 * 更新表单数据
 */
function updateFormData(
  state: WizardState,
  data: Partial<KycWizardFormData>
): WizardState {
  const newFormData = { ...state.formData, ...data }

  // 重新计算验证状态
  const stepValidation = [
    validateStep1({
      fullName: newFormData.fullName,
      dateOfBirth: newFormData.dateOfBirth,
      nationality: newFormData.nationality,
      address: newFormData.address,
    }).success,
    validateStep2({
      idType: newFormData.idType,
      idNumber: newFormData.idNumber,
      documentExpiry: newFormData.documentExpiry,
      idFrontUrl: newFormData.idFrontUrl,
      idBackUrl: newFormData.idBackUrl,
    }).success,
    validateStep3({
      selfieUrl: newFormData.selfieUrl,
      livenessVerified: newFormData.livenessVerified,
    }).success,
    validateStep4({
      privacyAgreed: newFormData.privacyAgreed,
      infoConfirmed: newFormData.infoConfirmed,
    }).success,
  ]

  return {
    ...state,
    formData: newFormData,
    stepValidation,
  }
}

/**
 * 比较两个表单数据是否相等
 */
function isFormDataEqual(a: KycWizardFormData, b: KycWizardFormData): boolean {
  return (
    a.fullName === b.fullName &&
    a.dateOfBirth === b.dateOfBirth &&
    a.nationality === b.nationality &&
    a.address === b.address &&
    a.idType === b.idType &&
    a.idNumber === b.idNumber &&
    a.idFrontUrl === b.idFrontUrl &&
    a.idBackUrl === b.idBackUrl &&
    a.selfieUrl === b.selfieUrl &&
    a.livenessVerified === b.livenessVerified &&
    a.privacyAgreed === b.privacyAgreed &&
    a.infoConfirmed === b.infoConfirmed
  )
}

// ============ 生成器 ============

/**
 * 生成有效的 Step1 数据
 */
const validStep1DataArb = fc.record({
  fullName: fc.string({ minLength: 2, maxLength: 50 }),
  dateOfBirth: fc.integer({ min: 18, max: 80 }).map(generateValidDateOfBirth),
  nationality: fc.string({ minLength: 1, maxLength: 100 }),
  address: fc.string({ minLength: 1, maxLength: 500 }),
})

/**
 * 生成有效的 Step2 数据
 */
const validStep2DataArb = fc.record({
  idType: fc.constantFrom<KycIdType>('passport', 'id_card', 'driver_license'),
  idNumber: fc.stringMatching(/^[A-Za-z0-9]{1,50}$/),
  documentExpiry: fc.constant(
    `${new Date().getFullYear() + 2}-06-15`
  ),
  idFrontUrl: fc.webUrl(),
  idBackUrl: fc.webUrl(),
})

/**
 * 生成有效的 Step3 数据
 */
const validStep3DataArb = fc.record({
  selfieUrl: fc.webUrl(),
  livenessVerified: fc.boolean(),
})

/**
 * 生成有效的 Step4 数据
 */
const validStep4DataArb = fc.record({
  privacyAgreed: fc.boolean(),
  infoConfirmed: fc.boolean(),
})

/**
 * 生成完整的有效表单数据
 */
const validKycFormDataArb: fc.Arbitrary<KycWizardFormData> = fc
  .tuple(validStep1DataArb, validStep2DataArb, validStep3DataArb, validStep4DataArb)
  .map(([step1, step2, step3, step4]) => ({
    ...step1,
    ...step2,
    ...step3,
    ...step4,
  }))

/**
 * 生成有效的步骤索引 (0-3)
 */
const validStepArb = fc.integer({ min: MIN_STEP, max: MAX_STEP })

/**
 * 生成可以进行"下一步"操作的步骤索引 (0-2)
 */
const canGoNextStepArb = fc.integer({ min: MIN_STEP, max: MAX_STEP - 1 })

/**
 * 生成可以进行"上一步"操作的步骤索引 (1-3)
 */
const canGoPrevStepArb = fc.integer({ min: MIN_STEP + 1, max: MAX_STEP })

// ============ 属性测试 ============

// Feature: kyc-page, Property 2: 步骤导航数据保持一致性
describe('Property 2: 步骤导航数据保持一致性', () => {
  /**
   * **Validates: Requirements 2.2, 2.3**
   *
   * 核心属性: 导航操作不应该改变表单数据
   */
  describe('导航操作数据保持', () => {
    it('property: 下一步操作不应该改变表单数据', () => {
      fc.assert(
        fc.property(
          validKycFormDataArb,
          canGoNextStepArb,
          (formData, currentStep) => {
            // 创建初始状态
            const initialState = createInitialState(formData, currentStep)
            const originalData = { ...initialState.formData }

            // 执行下一步操作
            const { newState } = goToNextStep(initialState)

            // 验证数据保持不变
            expect(isFormDataEqual(newState.formData, originalData)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('property: 上一步操作不应该改变表单数据', () => {
      fc.assert(
        fc.property(
          validKycFormDataArb,
          canGoPrevStepArb,
          (formData, currentStep) => {
            // 创建初始状态
            const initialState = createInitialState(formData, currentStep)
            const originalData = { ...initialState.formData }

            // 执行上一步操作
            const { newState } = goToPreviousStep(initialState)

            // 验证数据保持不变
            expect(isFormDataEqual(newState.formData, originalData)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('property: 下一步后上一步应该返回原始数据', () => {
      fc.assert(
        fc.property(
          validKycFormDataArb,
          canGoNextStepArb,
          (formData, currentStep) => {
            // 创建初始状态 (确保当前步骤验证通过)
            let state = createInitialState(formData, currentStep)

            // 如果当前步骤验证不通过，跳过测试
            if (!state.stepValidation[currentStep]) {
              return true
            }

            const originalData = { ...state.formData }
            const originalStep = state.currentStep

            // 执行下一步
            const nextResult = goToNextStep(state)
            if (!nextResult.success) {
              return true // 无法前进，跳过
            }
            state = nextResult.newState

            // 执行上一步
            const prevResult = goToPreviousStep(state)
            state = prevResult.newState

            // 验证数据保持不变
            expect(isFormDataEqual(state.formData, originalData)).toBe(true)
            // 验证步骤回到原位
            expect(state.currentStep).toBe(originalStep)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('property: 多次导航后数据应该保持一致', () => {
      fc.assert(
        fc.property(
          validKycFormDataArb,
          fc.array(fc.boolean(), { minLength: 1, maxLength: 10 }),
          (formData, navigationSequence) => {
            // 创建初始状态，从步骤 1 开始 (可以前进也可以后退)
            let state = createInitialState(formData, 1)
            const originalData = { ...state.formData }

            // 执行一系列导航操作
            for (const goNext of navigationSequence) {
              if (goNext) {
                const result = goToNextStep(state)
                state = result.newState
              } else {
                const result = goToPreviousStep(state)
                state = result.newState
              }
            }

            // 验证数据始终保持不变
            expect(isFormDataEqual(state.formData, originalData)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Validates: Requirements 2.2**
   *
   * 步骤验证逻辑: 只有当前步骤验证通过才能进入下一步
   */
  describe('步骤验证逻辑', () => {
    it('property: 当前步骤验证通过时才能进入下一步', () => {
      fc.assert(
        fc.property(
          validKycFormDataArb,
          canGoNextStepArb,
          (formData, currentStep) => {
            const state = createInitialState(formData, currentStep)
            const { success } = goToNextStep(state)

            // 如果当前步骤验证通过，应该能够前进
            // 如果当前步骤验证失败，应该无法前进
            expect(success).toBe(state.stepValidation[currentStep])
          }
        ),
        { numRuns: 100 }
      )
    })

    it('property: 当前步骤验证失败时无法进入下一步', () => {
      // 创建一个无效的 Step1 数据 (姓名太短)
      const invalidFormData: KycWizardFormData = {
        ...kycWizardDefaultValues,
        fullName: 'A', // 太短，验证失败
        dateOfBirth: generateValidDateOfBirth(25),
        nationality: 'CN',
        address: 'Test Address',
      }

      const state = createInitialState(invalidFormData, 0)

      // Step1 验证应该失败
      expect(state.stepValidation[0]).toBe(false)

      // 尝试进入下一步应该失败
      const { success, newState } = goToNextStep(state)
      expect(success).toBe(false)
      expect(newState.currentStep).toBe(0)
    })

    it('property: 有效数据的 Step1 验证应该通过', () => {
      fc.assert(
        fc.property(validStep1DataArb, (step1Data) => {
          const result = validateStep1(step1Data)
          expect(result.success).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('property: 有效数据的 Step2 验证应该通过', () => {
      fc.assert(
        fc.property(validStep2DataArb, (step2Data) => {
          const result = validateStep2(step2Data)
          expect(result.success).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('property: 有效数据的 Step3 验证应该通过', () => {
      fc.assert(
        fc.property(validStep3DataArb, (step3Data) => {
          const result = validateStep3(step3Data)
          expect(result.success).toBe(true)
        }),
        { numRuns: 100 }
      )
    })
  })

  /**
   * 步骤边界测试
   */
  describe('步骤边界', () => {
    it('property: 步骤索引始终在有效范围内 (0-3)', () => {
      fc.assert(
        fc.property(
          validKycFormDataArb,
          fc.array(fc.boolean(), { minLength: 0, maxLength: 20 }),
          (formData, navigationSequence) => {
            let state = createInitialState(formData, 0)

            // 执行一系列导航操作
            for (const goNext of navigationSequence) {
              if (goNext) {
                const result = goToNextStep(state)
                state = result.newState
              } else {
                const result = goToPreviousStep(state)
                state = result.newState
              }

              // 验证步骤始终在有效范围内
              expect(state.currentStep).toBeGreaterThanOrEqual(MIN_STEP)
              expect(state.currentStep).toBeLessThanOrEqual(MAX_STEP)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('property: 在第一步时无法后退', () => {
      fc.assert(
        fc.property(validKycFormDataArb, (formData) => {
          const state = createInitialState(formData, MIN_STEP)
          const { success, newState } = goToPreviousStep(state)

          expect(success).toBe(false)
          expect(newState.currentStep).toBe(MIN_STEP)
        }),
        { numRuns: 100 }
      )
    })

    it('property: 在最后一步时无法前进', () => {
      fc.assert(
        fc.property(validKycFormDataArb, (formData) => {
          const state = createInitialState(formData, MAX_STEP)
          const { success, newState } = goToNextStep(state)

          expect(success).toBe(false)
          expect(newState.currentStep).toBe(MAX_STEP)
        }),
        { numRuns: 100 }
      )
    })

    it('property: 下一步操作最多增加步骤索引 1', () => {
      fc.assert(
        fc.property(
          validKycFormDataArb,
          validStepArb,
          (formData, currentStep) => {
            const state = createInitialState(formData, currentStep)
            const { newState } = goToNextStep(state)

            // 步骤最多增加 1
            expect(newState.currentStep - state.currentStep).toBeLessThanOrEqual(1)
            expect(newState.currentStep - state.currentStep).toBeGreaterThanOrEqual(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('property: 上一步操作最多减少步骤索引 1', () => {
      fc.assert(
        fc.property(
          validKycFormDataArb,
          validStepArb,
          (formData, currentStep) => {
            const state = createInitialState(formData, currentStep)
            const { newState } = goToPreviousStep(state)

            // 步骤最多减少 1
            expect(state.currentStep - newState.currentStep).toBeLessThanOrEqual(1)
            expect(state.currentStep - newState.currentStep).toBeGreaterThanOrEqual(0)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * 跳转到指定步骤测试
   */
  describe('跳转到指定步骤', () => {
    it('property: 只能跳转到当前步骤之前的步骤', () => {
      fc.assert(
        fc.property(
          validKycFormDataArb,
          fc.integer({ min: 1, max: MAX_STEP }),
          fc.integer({ min: MIN_STEP, max: MAX_STEP }),
          (formData, currentStep, targetStep) => {
            const state = createInitialState(formData, currentStep)
            const { success } = goToStep(state, targetStep)

            if (targetStep < currentStep) {
              // 可以跳转到之前的步骤
              expect(success).toBe(true)
            } else {
              // 不能跳转到当前或之后的步骤
              expect(success).toBe(false)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('property: 跳转到指定步骤不应该改变表单数据', () => {
      fc.assert(
        fc.property(
          validKycFormDataArb,
          fc.integer({ min: 2, max: MAX_STEP }),
          (formData, currentStep) => {
            const state = createInitialState(formData, currentStep)
            const originalData = { ...state.formData }

            // 跳转到步骤 0
            const { newState } = goToStep(state, 0)

            // 验证数据保持不变
            expect(isFormDataEqual(newState.formData, originalData)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('property: 无效的目标步骤应该被拒绝', () => {
      fc.assert(
        fc.property(
          validKycFormDataArb,
          validStepArb,
          fc.oneof(
            fc.integer({ min: -100, max: -1 }),
            fc.integer({ min: TOTAL_STEPS, max: 100 })
          ),
          (formData, currentStep, invalidTargetStep) => {
            const state = createInitialState(formData, currentStep)
            const { success, newState } = goToStep(state, invalidTargetStep)

            expect(success).toBe(false)
            expect(newState.currentStep).toBe(currentStep)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * 表单数据更新测试
   */
  describe('表单数据更新', () => {
    it('property: 更新表单数据应该触发验证状态重新计算', () => {
      fc.assert(
        fc.property(
          validKycFormDataArb,
          validStepArb,
          (formData, currentStep) => {
            let state = createInitialState(formData, currentStep)

            // 更新为无效数据
            state = updateFormData(state, { fullName: 'A' }) // 太短

            // Step1 验证应该失败
            expect(state.stepValidation[0]).toBe(false)

            // 更新为有效数据
            state = updateFormData(state, { fullName: 'Valid Name' })

            // Step1 验证应该通过 (如果其他字段也有效)
            const step1Valid = validateStep1({
              fullName: state.formData.fullName,
              dateOfBirth: state.formData.dateOfBirth,
              nationality: state.formData.nationality,
              address: state.formData.address,
            }).success
            expect(state.stepValidation[0]).toBe(step1Valid)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('property: 部分更新应该保留其他字段', () => {
      fc.assert(
        fc.property(
          validKycFormDataArb,
          fc.string({ minLength: 2, maxLength: 50 }),
          (formData, newFullName) => {
            const state = createInitialState(formData, 0)
            const originalAddress = state.formData.address

            // 只更新姓名
            const newState = updateFormData(state, { fullName: newFullName })

            // 姓名应该更新
            expect(newState.formData.fullName).toBe(newFullName)
            // 其他字段应该保持不变
            expect(newState.formData.address).toBe(originalAddress)
            expect(newState.formData.dateOfBirth).toBe(formData.dateOfBirth)
            expect(newState.formData.nationality).toBe(formData.nationality)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})

/**
 * 综合测试: 完整导航流程
 */
describe('综合测试: 完整导航流程', () => {
  /**
   * **Validates: Requirements 2.2, 2.3**
   */
  it('property: 完整的前进后退流程应该保持数据一致', () => {
    fc.assert(
      fc.property(
        // 生成所有步骤都验证通过的表单数据
        validKycFormDataArb.map((data) => ({
          ...data,
          privacyAgreed: true,
          infoConfirmed: true,
        })),
        (formData) => {
          let state = createInitialState(formData, 0)
          const originalData = { ...state.formData }

          // 前进到最后一步
          for (let i = 0; i < MAX_STEP; i++) {
            if (state.stepValidation[state.currentStep]) {
              const result = goToNextStep(state)
              if (result.success) {
                state = result.newState
              }
            }
          }

          // 后退到第一步
          while (state.currentStep > MIN_STEP) {
            const result = goToPreviousStep(state)
            state = result.newState
          }

          // 验证数据保持不变
          expect(isFormDataEqual(state.formData, originalData)).toBe(true)
          // 验证回到第一步
          expect(state.currentStep).toBe(MIN_STEP)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('property: 随机导航序列后数据应该保持一致', () => {
    fc.assert(
      fc.property(
        validKycFormDataArb,
        fc.array(
          fc.oneof(
            fc.constant('next'),
            fc.constant('prev'),
            fc.integer({ min: MIN_STEP, max: MAX_STEP }).map((step) => ({ goTo: step }))
          ),
          { minLength: 1, maxLength: 20 }
        ),
        (formData, actions) => {
          let state = createInitialState(formData, 1) // 从中间步骤开始
          const originalData = { ...state.formData }

          // 执行随机导航序列
          for (const action of actions) {
            if (action === 'next') {
              const result = goToNextStep(state)
              state = result.newState
            } else if (action === 'prev') {
              const result = goToPreviousStep(state)
              state = result.newState
            } else if (typeof action === 'object' && 'goTo' in action) {
              const result = goToStep(state, action.goTo)
              state = result.newState
            }
          }

          // 验证数据始终保持不变
          expect(isFormDataEqual(state.formData, originalData)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})
