/**
 * WizardContext - 向导状态管理上下文
 * 
 * 使用 useReducer 管理向导状态，提供状态和操作方法给子组件
 * @validates Requirements 7.1, 7.2, 7.3
 */
'use client'

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'

import {
  type WizardState,
  type WizardAction,
  type WizardContextValue,
  type CreateAssetFormData,
  INITIAL_WIZARD_STATE,
  DEFAULT_FORM_DATA,
  WIZARD_STEPS,
} from './types'

// ============ Reducer ============

/**
 * 向导状态 Reducer
 */
function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_STEP': {
      const step = Math.max(1, Math.min(action.payload, WIZARD_STEPS.length))
      return {
        ...state,
        currentStep: step,
      }
    }

    case 'NEXT_STEP': {
      const nextStep = Math.min(state.currentStep + 1, WIZARD_STEPS.length)
      return {
        ...state,
        currentStep: nextStep,
      }
    }

    case 'PREV_STEP': {
      const prevStep = Math.max(state.currentStep - 1, 1)
      return {
        ...state,
        currentStep: prevStep,
      }
    }

    case 'UPDATE_FORM_DATA': {
      return {
        ...state,
        formData: {
          ...state.formData,
          ...action.payload,
        },
      }
    }

    case 'MARK_STEP_COMPLETE': {
      const newCompletedSteps = new Set(state.completedSteps)
      newCompletedSteps.add(action.payload)
      return {
        ...state,
        completedSteps: newCompletedSteps,
      }
    }

    case 'SET_SUBMITTING': {
      return {
        ...state,
        isSubmitting: action.payload,
      }
    }

    case 'RESET': {
      return {
        ...INITIAL_WIZARD_STATE,
        formData: { ...DEFAULT_FORM_DATA },
        completedSteps: new Set<number>(),
      }
    }

    default:
      return state
  }
}

// ============ Context ============

/**
 * 向导 Context
 */
const WizardContext = createContext<WizardContextValue | null>(null)

// ============ Provider ============

interface WizardProviderProps {
  children: ReactNode
}

/**
 * 向导 Provider 组件
 * 
 * 包装子组件，提供向导状态和操作方法
 */
export function WizardProvider({ children }: WizardProviderProps) {
  const [state, dispatch] = useReducer(wizardReducer, {
    ...INITIAL_WIZARD_STATE,
    formData: { ...DEFAULT_FORM_DATA },
    completedSteps: new Set<number>(),
  })

  // 跳转到指定步骤
  const goToStep = useCallback((step: number) => {
    dispatch({ type: 'SET_STEP', payload: step })
  }, [])

  // 进入下一步
  const nextStep = useCallback(() => {
    dispatch({ type: 'NEXT_STEP' })
  }, [])

  // 返回上一步
  const prevStep = useCallback(() => {
    dispatch({ type: 'PREV_STEP' })
  }, [])

  // 更新表单数据
  const updateFormData = useCallback((data: Partial<CreateAssetFormData>) => {
    dispatch({ type: 'UPDATE_FORM_DATA', payload: data })
  }, [])

  // 标记步骤为已完成
  const markStepComplete = useCallback((step: number) => {
    dispatch({ type: 'MARK_STEP_COMPLETE', payload: step })
  }, [])

  // 设置提交状态
  const setSubmitting = useCallback((isSubmitting: boolean) => {
    dispatch({ type: 'SET_SUBMITTING', payload: isSubmitting })
  }, [])

  // 重置向导
  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<WizardContextValue>(
    () => ({
      state,
      goToStep,
      nextStep,
      prevStep,
      updateFormData,
      markStepComplete,
      setSubmitting,
      reset,
    }),
    [state, goToStep, nextStep, prevStep, updateFormData, markStepComplete, setSubmitting, reset]
  )

  return (
    <WizardContext.Provider value={contextValue}>
      {children}
    </WizardContext.Provider>
  )
}

// ============ Hook ============

/**
 * 使用向导 Context 的 Hook
 * 
 * @throws 如果在 WizardProvider 外部使用会抛出错误
 * @returns WizardContextValue
 * 
 * @example
 * ```tsx
 * function MyStepComponent() {
 *   const { state, nextStep, updateFormData } = useWizard()
 *   
 *   const handleNext = () => {
 *     updateFormData({ name: 'New Asset' })
 *     nextStep()
 *   }
 *   
 *   return <button onClick={handleNext}>Next</button>
 * }
 * ```
 */
export function useWizard(): WizardContextValue {
  const context = useContext(WizardContext)
  
  if (!context) {
    throw new Error('useWizard must be used within a WizardProvider')
  }
  
  return context
}

// ============ Utility Hooks ============

/**
 * 获取当前步骤配置的 Hook
 */
export function useCurrentStep() {
  const { state } = useWizard()
  return WIZARD_STEPS.find(step => step.id === state.currentStep) ?? WIZARD_STEPS[0]
}

/**
 * 检查步骤是否已完成的 Hook
 */
export function useIsStepComplete(stepId: number): boolean {
  const { state } = useWizard()
  return state.completedSteps.has(stepId)
}

/**
 * 检查是否可以进入下一步的 Hook
 * 
 * @param currentStepValid - 当前步骤的表单是否有效
 */
export function useCanProceed(currentStepValid: boolean): boolean {
  const { state } = useWizard()
  
  // 如果当前步骤是最后一步，不能继续
  if (state.currentStep >= WIZARD_STEPS.length) {
    return false
  }
  
  return currentStepValid
}

/**
 * 检查是否是第一步
 */
export function useIsFirstStep(): boolean {
  const { state } = useWizard()
  return state.currentStep === 1
}

/**
 * 检查是否是最后一步
 */
export function useIsLastStep(): boolean {
  const { state } = useWizard()
  return state.currentStep === WIZARD_STEPS.length
}

export { WizardContext }
