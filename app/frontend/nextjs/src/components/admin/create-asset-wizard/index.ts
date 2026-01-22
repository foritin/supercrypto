/**
 * Create Asset Wizard 导出入口
 * 
 * 统一导出向导组件及相关类型
 */

// 主组件
export { CreateAssetWizard } from './CreateAssetWizard'

// 步骤指示器组件
export { StepIndicator } from './StepIndicator'

// 步骤组件
export { BasicInfoStep, createBasicInfoSchema, type BasicInfoFormValues } from './steps/BasicInfoStep'
export { FinancialStep, createFinancialSchema, type FinancialFormValues } from './steps/FinancialStep'
export { MediaStep } from './steps/MediaStep'
export { PreviewStep } from './steps/PreviewStep'

// 预览组件
export { AssetCardPreview } from './AssetCardPreview'

// Context 和 Hooks
export { 
  WizardProvider, 
  useWizard,
  useCurrentStep,
  useIsStepComplete,
  useCanProceed,
  useIsFirstStep,
  useIsLastStep,
} from './WizardContext'

// 类型导出
export type {
  // 步骤配置
  StepConfig,
  
  // 文件上传
  UploadFileItem,
  
  // 表单数据
  CreateAssetFormData,
  
  // 向导状态
  WizardState,
  WizardAction,
  WizardActionType,
  WizardContextValue,
  
  // 组件 Props
  CreateAssetWizardProps,
  StepIndicatorProps,
  AssetCardPreviewProps,
  StepComponentProps,
  
  // 媒体类型
  MediaCategory,
} from './types'

// 常量导出
export {
  WIZARD_STEPS,
  DEFAULT_FORM_DATA,
  INITIAL_WIZARD_STATE,
  MEDIA_CATEGORIES,
} from './types'
