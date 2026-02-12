'use client'

/**
 * KycWizard - KYC 申请向导容器组件
 *
 * 管理 4 步 KYC 认证流程：
 * - 步骤状态管理
 * - 表单数据管理
 * - 步骤导航 (上一步/下一步)
 * - 取消确认弹窗
 * - 本地存储持久化
 * - API 提交逻辑
 * - 成功/失败处理
 *
 * @validates Requirements 2.1, 2.2, 2.3, 2.4, 6.4, 6.5, 6.6
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import {
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  Check,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

import { KycStepper } from './kyc-stepper'
import { KycWizardContent } from './kyc-wizard-content'
import { Step1BasicInfo } from './steps/step1-basic-info'
import { Step2DocumentUpload } from './steps/step2-document-upload'
import { Step3SelfieVerification } from './steps/step3-selfie-verification'
import { Step4Confirmation } from './steps/step4-confirmation'

import {
  type KycWizardFormData,
  kycWizardDefaultValues,
  validateStep1,
  validateStep2,
  validateStep3,
  validateStep4,
} from '@/lib/validations/kyc-wizard'
import { applyKyc, type KycApplyRequest } from '@/services/kyc'

// ============ 类型定义 ============

/**
 * KycWizard 组件属性
 */
export interface KycWizardProps {
  /** 完成回调 */
  onComplete?: () => void
  /** 取消回调 */
  onCancel?: () => void
  /** 初始步骤 (0-3) */
  initialStep?: number
  /** 自定义类名 */
  className?: string
}

/**
 * 向导状态
 */
interface WizardState {
  /** 当前步骤 (0-3) */
  currentStep: number
  /** 表单数据 */
  formData: KycWizardFormData
  /** 各步骤验证状态 */
  stepValidation: boolean[]
  /** 是否正在提交 */
  isSubmitting: boolean
  /** 提交错误信息 */
  submitError: string | null
}

// ============ 常量 ============

/** 本地存储 Key */
const STORAGE_KEY = 'kyc_wizard_data'

/** 步骤总数 */
const TOTAL_STEPS = 4

// ============ 辅助函数 ============

/**
 * 从本地存储加载表单数据
 */
function loadFromStorage(): Partial<KycWizardFormData> | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // 验证数据结构
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed
      }
    }
  } catch (error) {
    console.warn('Failed to load KYC wizard data from storage:', error)
  }
  return null
}

/**
 * 保存表单数据到本地存储
 */
function saveToStorage(data: KycWizardFormData): void {
  if (typeof window === 'undefined') return

  try {
    // 不保存敏感的确认状态
    const dataToSave = {
      ...data,
      privacyAgreed: false,
      infoConfirmed: false,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave))
  } catch (error) {
    console.warn('Failed to save KYC wizard data to storage:', error)
  }
}

/**
 * 清除本地存储的表单数据
 */
function clearStorage(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.warn('Failed to clear KYC wizard data from storage:', error)
  }
}

/**
 * 将表单数据转换为 API 请求格式 (多证件版本)
 */
function toApiRequest(data: KycWizardFormData): KycApplyRequest {
  return {
    full_name: data.fullName,
    date_of_birth: data.dateOfBirth,
    country_code: data.nationality,
    // 多证件格式：将单证件数据包装成数组
    documents: [
      {
        id_type: data.idType,
        id_number: data.idNumber,
        document_expiry: data.documentExpiry,
        id_front_url: data.idFrontUrl,
        id_back_url: data.idType === 'passport' ? undefined : data.idBackUrl,
      },
    ],
    selfie_url: data.selfieUrl,
  }
}

// ============ 主组件 ============

// ============ 内部组件 ============

/**
 * EstimatedTimeIndicator - 预估完成时间指示器
 *
 * 显示在 KycStepper 上方，告知用户预计完成时间
 *
 * @validates Requirements 1.1, 1.2, 1.3, 1.4
 */
interface EstimatedTimeIndicatorProps {
  className?: string
}

function EstimatedTimeIndicator({ className }: EstimatedTimeIndicatorProps) {
  const { t } = useTranslation()
  return (
    <div className={cn("text-center text-sm text-white/50 mb-4", className)}>
      <Clock className="inline w-4 h-4 mr-1" />
      {t('kyc.estimatedTime')}
    </div>
  )
}

/**
 * AutoSaveIndicator - 自动保存提示组件
 *
 * 显示在页面底部居中，当表单数据保存到本地存储时显示
 *
 * @validates Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */
interface AutoSaveIndicatorProps {
  visible: boolean
  className?: string
}

function AutoSaveIndicator({ visible, className }: AutoSaveIndicatorProps) {
  const { t } = useTranslation()

  if (!visible) return null

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50",
        "px-4 py-2 rounded-full",
        "bg-bg-card border border-white/10",
        "text-sm text-white/60 flex items-center gap-2",
        "animate-fade-in",
        "backdrop-blur-sm",
        className
      )}
    >
      <Check className="w-4 h-4 text-primary" />
      {t('kyc.autoSaved')}
    </div>
  )
}

// ============ 主组件实现 ============

/**
 * KycWizard - KYC 申请向导组件
 *
 * @example
 * <KycWizard
 *   onComplete={() => router.push('/kyc')}
 *   onCancel={() => router.push('/kyc')}
 * />
 */
export function KycWizard({
  onComplete,
  onCancel,
  initialStep = 0,
  className,
}: KycWizardProps) {
  const router = useRouter()
  const { t } = useTranslation()

  // ============ 状态管理 ============

  // 初始化状态
  const [state, setState] = useState<WizardState>(() => {
    // 尝试从本地存储恢复数据
    const storedData = loadFromStorage()
    const mergedData: KycWizardFormData = {
      ...kycWizardDefaultValues,
      ...storedData,
      // 确保确认状态始终为 false
      privacyAgreed: false,
      infoConfirmed: false,
    }

    return {
      currentStep: initialStep,
      formData: mergedData,
      stepValidation: [false, false, false, false],
      isSubmitting: false,
      submitError: null,
    }
  })

  // 取消确认弹窗状态
  const [showCancelDialog, setShowCancelDialog] = useState(false)

  // 提交成功状态
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // 自动保存提示状态
  const [showAutoSaveIndicator, setShowAutoSaveIndicator] = useState(false)

  // ============ 计算属性 ============

  const { currentStep, formData, stepValidation, isSubmitting, submitError } = state

  // 当前步骤是否有效
  const isCurrentStepValid = stepValidation[currentStep]

  // 是否为第一步
  const isFirstStep = currentStep === 0

  // 是否为最后一步
  const isLastStep = currentStep === TOTAL_STEPS - 1

  // 是否可以进入下一步
  const canGoNext = isCurrentStepValid && !isLastStep

  // 是否可以提交
  const canSubmit = isLastStep && isCurrentStepValid && !isSubmitting

  // ============ 回调函数 ============

  /**
   * 更新表单数据
   */
  const updateFormData = useCallback((data: Partial<KycWizardFormData>) => {
    setState((prev) => {
      const newFormData = { ...prev.formData, ...data }
      // 保存到本地存储
      saveToStorage(newFormData)
      return {
        ...prev,
        formData: newFormData,
      }
    })
    // 显示自动保存提示
    setShowAutoSaveIndicator(true)
    // 3 秒后自动隐藏
    setTimeout(() => {
      setShowAutoSaveIndicator(false)
    }, 3000)
  }, [])

  /**
   * 更新步骤验证状态
   */
  const updateStepValidation = useCallback((step: number, isValid: boolean) => {
    setState((prev) => {
      const newValidation = [...prev.stepValidation]
      newValidation[step] = isValid
      return {
        ...prev,
        stepValidation: newValidation,
      }
    })
  }, [])

  /**
   * 进入下一步
   * Requirements 2.2: 用户可以点击"下一步"进入下一个步骤
   */
  const goToNextStep = useCallback(() => {
    if (!canGoNext) return

    setState((prev) => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, TOTAL_STEPS - 1),
      submitError: null,
    }))
  }, [canGoNext])

  /**
   * 返回上一步
   * Requirements 2.3: 用户可以点击"上一步"返回上一个步骤
   */
  const goToPreviousStep = useCallback(() => {
    if (isFirstStep) return

    setState((prev) => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 0),
      submitError: null,
    }))
  }, [isFirstStep])

  /**
   * 跳转到指定步骤 (仅允许跳转到已完成的步骤)
   */
  const goToStep = useCallback((step: number) => {
    if (step < 0 || step >= TOTAL_STEPS) return
    // 只允许跳转到当前步骤之前的步骤
    if (step >= currentStep) return

    setState((prev) => ({
      ...prev,
      currentStep: step,
      submitError: null,
    }))
  }, [currentStep])

  /**
   * 处理取消
   * Requirements 2.4: 用户在任意步骤点击"取消"，弹窗确认后退出向导
   */
  const handleCancel = useCallback(() => {
    setShowCancelDialog(true)
  }, [])

  /**
   * 确认取消
   */
  const confirmCancel = useCallback(() => {
    setShowCancelDialog(false)
    // 清除本地存储
    clearStorage()
    // 调用取消回调
    onCancel?.()
  }, [onCancel])

  /**
   * 取消取消 (继续填写)
   */
  const dismissCancel = useCallback(() => {
    setShowCancelDialog(false)
  }, [])

  /**
   * 提交 KYC 申请
   * Requirements 6.4: 用户点击"提交"后，系统调用 KYC 提交 API
   */
  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return

    setState((prev) => ({
      ...prev,
      isSubmitting: true,
      submitError: null,
    }))

    try {
      // 转换数据格式并调用 API
      const request = toApiRequest(formData)
      await applyKyc(request)

      // Requirements 6.5: 提交成功后显示成功提示并跳转到 KYC 状态页
      setSubmitSuccess(true)
      // 清除本地存储
      clearStorage()

      // 延迟跳转，让用户看到成功提示
      setTimeout(() => {
        onComplete?.()
        router.push('/kyc')
      }, 2000)
    } catch (error) {
      // Requirements 6.6: 提交失败后显示错误信息并允许重试
      console.error('KYC submission failed:', error)
      const errorMessage =
        error instanceof Error
          ? error.message
          : '提交失败，请稍后重试'

      setState((prev) => ({
        ...prev,
        isSubmitting: false,
        submitError: errorMessage,
      }))
    }
  }, [canSubmit, formData, onComplete, router])

  // ============ Step 3 特殊处理 ============

  /**
   * Step 3 完成回调
   */
  const handleStep3Complete = useCallback(
    (data: { selfieUrl: string }) => {
      updateFormData({
        selfieUrl: data.selfieUrl,
        livenessVerified: true,
      })
      // 自动验证 Step 3
      const result = validateStep3({
        selfieUrl: data.selfieUrl,
        livenessVerified: true,
      })
      updateStepValidation(2, result.success)
    },
    [updateFormData, updateStepValidation]
  )

  /**
   * Step 3 返回上一步
   */
  const handleStep3Back = useCallback(() => {
    goToPreviousStep()
  }, [goToPreviousStep])

  // ============ 副作用 ============

  // 初始化时验证已有数据
  useEffect(() => {
    // 验证 Step 1
    const step1Result = validateStep1({
      fullName: formData.fullName,
      dateOfBirth: formData.dateOfBirth,
      nationality: formData.nationality,
      address: formData.address,
    })
    updateStepValidation(0, step1Result.success)

    // 验证 Step 2
    const step2Result = validateStep2({
      idType: formData.idType,
      idNumber: formData.idNumber,
      idFrontUrl: formData.idFrontUrl,
      idBackUrl: formData.idBackUrl,
    })
    updateStepValidation(1, step2Result.success)

    // 验证 Step 3
    const step3Result = validateStep3({
      selfieUrl: formData.selfieUrl,
      livenessVerified: formData.livenessVerified,
    })
    updateStepValidation(2, step3Result.success)

    // 验证 Step 4
    const step4Result = validateStep4({
      privacyAgreed: formData.privacyAgreed,
      infoConfirmed: formData.infoConfirmed,
    })
    updateStepValidation(3, step4Result.success)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ============ 渲染步骤内容 ============

  const stepContent = useMemo(() => {
    switch (currentStep) {
      case 0:
        return (
          <Step1BasicInfo
            data={{
              fullName: formData.fullName,
              dateOfBirth: formData.dateOfBirth,
              nationality: formData.nationality,
              address: formData.address,
            }}
            onChange={updateFormData}
            onValidChange={(isValid) => updateStepValidation(0, isValid)}
          />
        )

      case 1:
        return (
          <Step2DocumentUpload
            data={{
              idType: formData.idType,
              idNumber: formData.idNumber,
              documentExpiry: formData.documentExpiry,
              idFrontUrl: formData.idFrontUrl,
              idBackUrl: formData.idBackUrl,
            }}
            onChange={updateFormData}
            onValidChange={(isValid) => updateStepValidation(1, isValid)}
          />
        )

      case 2:
        return (
          <Step3SelfieVerification
            onComplete={handleStep3Complete}
            onBack={handleStep3Back}
            initialData={{ selfieUrl: formData.selfieUrl }}
            disabled={isSubmitting}
          />
        )

      case 3:
        return (
          <Step4Confirmation
            data={formData}
            onChange={updateFormData}
            onValidChange={(isValid) => updateStepValidation(3, isValid)}
          />
        )

      default:
        return null
    }
  }, [
    currentStep,
    formData,
    updateFormData,
    updateStepValidation,
    handleStep3Complete,
    handleStep3Back,
    isSubmitting,
  ])

  // ============ 渲染 ============

  // 提交成功状态
  if (submitSuccess) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center',
          // Mobile: 较小内边距
          'py-12 px-4',
          // Desktop: 正常内边距
          'sm:py-16 sm:px-6',
          'bg-[rgba(17,25,22,0.8)] backdrop-blur-[12px]',
          'rounded-xl sm:rounded-2xl border border-white/[0.08]',
          className
        )}
      >
        <div className="p-3 sm:p-4 rounded-full bg-primary/20 mb-4 sm:mb-6">
          <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-primary" />
        </div>
        <h2 className="text-xl sm:text-2xl font-semibold text-white mb-2">{t('kyc.submitSuccess.title')}</h2>
        <p className="text-sm sm:text-base text-white/60 text-center max-w-sm px-4">
          {t('kyc.submitSuccess.description')}
          <br />
          {t('kyc.submitSuccess.redirecting')}
        </p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col',
        'bg-[rgba(17,25,22,0.8)] backdrop-blur-[12px]',
        // Mobile: 较小圆角，Desktop: 正常圆角
        'rounded-xl sm:rounded-2xl',
        'border border-white/[0.08]',
        'overflow-hidden',
        className
      )}
    >
      {/* 步骤进度条 - 响应式内边距 */}
      <div className="p-4 sm:p-6 border-b border-white/[0.08]">
        {/* 预估完成时间指示器 */}
        <EstimatedTimeIndicator />
        <KycStepper
          currentStep={currentStep}
          onStepClick={goToStep}
        />
      </div>

      {/* 步骤内容 - 响应式内边距 */}
      <div className="flex-1 p-5 sm:p-8">
        {/* 提交错误提示 - 使用 role="alert" 确保屏幕阅读器播报 */}
        {submitError && (
          <div
            className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2 sm:gap-3"
            role="alert"
            aria-live="assertive"
          >
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-destructive">{t('kyc.submitError.title')}</p>
              <p className="text-xs sm:text-sm text-destructive/80 mt-1">{submitError}</p>
            </div>
          </div>
        )}

        {/* 步骤内容 - 带切换动画 */}
        <KycWizardContent
          currentStep={currentStep}
          className="min-h-[300px] sm:min-h-[400px]"
        >
          {stepContent}
        </KycWizardContent>
      </div>

      {/* 导航按钮 - Step 3 有自己的导航，不显示公共导航 */}
      {currentStep !== 2 && (
        <div
          className={cn(
            'flex items-center justify-between',
            'p-5 sm:p-8 pt-4 sm:pt-6',
            'border-t border-white/[0.04]'
          )}
          role="navigation"
          aria-label={t('kyc.navigation.ariaLabel')}
        >
          {/* 左侧：上一步按钮（如果不是第一步）或空白 */}
          <div className="flex-1">
            {!isFirstStep && (
              <Button
                variant="ghost"
                onClick={goToPreviousStep}
                disabled={isSubmitting}
                className="gap-2 text-white/40 hover:text-white/70 hover:bg-white/5 px-2 -ml-2"
                aria-label={t('kyc.navigation.previousAriaLabel')}
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                <span className="text-sm">{t('kyc.navigation.back', 'Back')}</span>
              </Button>
            )}
          </div>

          {/* 右侧：继续/提交按钮 */}
          <div>
            {isLastStep ? (
              /* 提交按钮 */
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={cn(
                  'gap-2 min-w-[140px] h-10 px-6',
                  'bg-primary hover:bg-primary/90 text-bg-dark font-medium',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
                aria-label={isSubmitting ? t('kyc.navigation.submittingAriaLabel') : t('kyc.navigation.submitAriaLabel')}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>{t('kyc.confirmation.submitting', 'Submitting...')}</span>
                  </>
                ) : (
                  <>
                    <span>{t('kyc.confirmation.submit', 'Submit')}</span>
                    <CheckCircle className="w-4 h-4" aria-hidden="true" />
                  </>
                )}
              </Button>
            ) : (
              /* 继续按钮 */
              <Button
                onClick={goToNextStep}
                disabled={!canGoNext}
                className={cn(
                  'gap-2 min-w-[140px] h-10 px-6',
                  'bg-primary hover:bg-primary/90 text-bg-dark font-medium',
                  'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30'
                )}
                aria-label={t('kyc.navigation.continueAriaLabel', 'Continue to next step')}
              >
                <span>{t('kyc.navigation.continue', 'Continue')}</span>
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 取消确认弹窗 */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('kyc.cancelDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('kyc.cancelDialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={dismissCancel}>
              {t('kyc.cancelDialog.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('kyc.cancelDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 自动保存提示 */}
      <AutoSaveIndicator visible={showAutoSaveIndicator} />
    </div>
  )
}

KycWizard.displayName = 'KycWizard'

export default KycWizard
