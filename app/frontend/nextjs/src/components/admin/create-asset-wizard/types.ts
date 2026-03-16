/**
 * Create Asset Wizard 类型定义
 * 
 * 定义向导组件所需的所有类型接口
 * @validates Requirements 1, 7
 */

import type { AssetSubscriptionMode, AssetType, FrameStyle, ProjectContractInfo } from '@/services/asset'

// ============ 步骤配置 ============

/**
 * 向导步骤配置
 */
export interface StepConfig {
  id: number
  title: string
  description?: string
}

/**
 * 预定义的向导步骤
 * 注意：title 和 description 使用 i18n 键，在组件中通过 t() 函数翻译
 */
export const WIZARD_STEPS: StepConfig[] = [
  { id: 1, title: 'admin.assets.wizard.steps.basicInfo', description: 'admin.assets.wizard.steps.basicInfoDesc' },
  { id: 2, title: 'admin.assets.wizard.steps.financial', description: 'admin.assets.wizard.steps.financialDesc' },
  { id: 3, title: 'admin.assets.wizard.steps.media', description: 'admin.assets.wizard.steps.mediaDesc' },
  { id: 4, title: 'admin.assets.wizard.steps.preview', description: 'admin.assets.wizard.steps.previewDesc' },
]

// ============ 文件上传类型 ============

/**
 * 上传文件项 (替代 Ant Design UploadFile)
 */
export interface UploadFileItem {
  uid: string
  name: string
  status?: 'uploading' | 'done' | 'error' | 'removed'
  url?: string
  originFileObj?: File
  preview?: string
}

// ============ 表单数据类型 ============

/**
 * 创建资产表单数据
 */
export interface CreateAssetFormData {
  // Step 1: 基本信息
  name: string
  symbol: string
  asset_type: AssetType
  frame_style?: FrameStyle | undefined
  location?: string | undefined
  description?: string | undefined
  
  // Step 2: 财务设置
  total_supply: number
  min_subscription: number
  current_price: number
  subscription_mode: AssetSubscriptionMode
  apy_3m: number
  apy_6m: number
  apy_12m: number
  subscription_start_at?: string | undefined
  subscription_end_at?: string | undefined
  
  // Step 3: 媒体上传
  coverFile?: UploadFileItem[]
  galleryFiles?: UploadFileItem[]
  
  // Step 4: 合约绑定
  bind_projects?: string[]
}

/**
 * 表单数据默认值
 */
export const DEFAULT_FORM_DATA: CreateAssetFormData = {
  // 基本信息
  name: '',
  symbol: '',
  asset_type: 'real_estate',
  location: '',
  description: '',
  
  // 财务设置
  total_supply: 0,
  min_subscription: 100,
  current_price: 1,
  subscription_mode: 'both',
  apy_3m: 10,
  apy_6m: 12,
  apy_12m: 15,
  
  // 媒体上传
  coverFile: [],
  galleryFiles: [],
  
  // 合约绑定
  bind_projects: [],
}

// ============ 向导状态类型 ============

/**
 * 向导状态
 */
export interface WizardState {
  /** 当前步骤 (1-4) */
  currentStep: number
  /** 表单数据 */
  formData: CreateAssetFormData
  /** 已完成的步骤集合 */
  completedSteps: Set<number>
  /** 是否正在提交 */
  isSubmitting: boolean
}

/**
 * 向导状态初始值
 */
export const INITIAL_WIZARD_STATE: WizardState = {
  currentStep: 1,
  formData: DEFAULT_FORM_DATA,
  completedSteps: new Set<number>(),
  isSubmitting: false,
}

// ============ 向导 Action 类型 ============

/**
 * 向导 Action 类型枚举
 */
export type WizardActionType =
  | 'SET_STEP'
  | 'NEXT_STEP'
  | 'PREV_STEP'
  | 'UPDATE_FORM_DATA'
  | 'MARK_STEP_COMPLETE'
  | 'SET_SUBMITTING'
  | 'RESET'

/**
 * 向导 Action 定义
 */
export type WizardAction =
  | { type: 'SET_STEP'; payload: number }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'UPDATE_FORM_DATA'; payload: Partial<CreateAssetFormData> }
  | { type: 'MARK_STEP_COMPLETE'; payload: number }
  | { type: 'SET_SUBMITTING'; payload: boolean }
  | { type: 'RESET' }

// ============ Context 类型 ============

/**
 * 向导 Context 值类型
 */
export interface WizardContextValue {
  /** 当前状态 */
  state: WizardState
  /** 跳转到指定步骤 */
  goToStep: (step: number) => void
  /** 进入下一步 */
  nextStep: () => void
  /** 返回上一步 */
  prevStep: () => void
  /** 更新表单数据 */
  updateFormData: (data: Partial<CreateAssetFormData>) => void
  /** 标记步骤为已完成 */
  markStepComplete: (step: number) => void
  /** 设置提交状态 */
  setSubmitting: (isSubmitting: boolean) => void
  /** 重置向导 */
  reset: () => void
}

// ============ 组件 Props 类型 ============

/**
 * CreateAssetWizard 主组件 Props
 */
export interface CreateAssetWizardProps {
  /** 是否打开 */
  open: boolean
  /** 关闭回调 */
  onClose: () => void
  /** 创建成功回调 */
  onSuccess: () => void
  /** 可用的项目列表 */
  availableProjects: ProjectContractInfo[]
  /** 是否正在加载项目 */
  isLoadingProjects: boolean
}

/**
 * StepIndicator 组件 Props
 */
export interface StepIndicatorProps {
  /** 步骤配置列表 */
  steps: StepConfig[]
  /** 当前步骤 */
  currentStep: number
  /** 已完成的步骤集合 */
  completedSteps: Set<number>
  /** 点击步骤回调 (可选，用于允许点击跳转) */
  onStepClick?: (step: number) => void
}

/**
 * AssetCardPreview 组件 Props
 */
export interface AssetCardPreviewProps {
  data: {
    name: string
    symbol: string
    asset_type: AssetType
    location?: string | undefined
    current_price: number
    apy_3m: number
    apy_6m: number
    apy_12m: number
    coverImage?: string | undefined
  }
}

/**
 * 步骤组件通用 Props
 */
export interface StepComponentProps {
  /** 进入下一步回调 */
  onNext?: () => void
  /** 返回上一步回调 */
  onPrev?: () => void
  /** 跳过当前步骤回调 (仅用于可选步骤) */
  onSkip?: () => void
}

// ============ 媒体上传相关类型 ============

/**
 * 媒体类型配置
 * 注意：label 字段不再使用，组件中使用 i18n 键获取翻译
 */
export const MEDIA_CATEGORIES = {
  cover: { 
    accept: 'image/*', 
    maxCount: 1, 
    maxSize: 5 * 1024 * 1024, // 5MB
    required: false 
  },
  gallery: { 
    accept: 'image/*', 
    maxCount: 10, 
    maxSize: 5 * 1024 * 1024, // 5MB per file
    required: false 
  },
} as const

export type MediaCategory = keyof typeof MEDIA_CATEGORIES
