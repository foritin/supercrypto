'use client'

/**
 * KycStepper 组件 - KYC 步骤进度条（极简版）
 *
 * 显示 KYC 向导的当前步骤和整体进度
 * 支持已完成/进行中/待完成状态的视觉区分
 *
 * Validates: Requirements 2.1, 2.5
 */

import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

/**
 * KycStepper 组件属性
 */
export interface KycStepperProps {
  /** 当前步骤 (0-3) */
  currentStep: number
  /** 步骤点击回调 (仅允许点击已完成步骤) */
  onStepClick?: (step: number) => void
  /** 自定义类名 */
  className?: string
}

/**
 * 步骤配置
 */
const STEPS = [
  { title: 'Personal', titleZh: '个人信息' },
  { title: 'Document', titleZh: '证件' },
  { title: 'Selfie', titleZh: '自拍' },
  { title: 'Review', titleZh: '确认' },
]

/**
 * 获取步骤状态
 */
function getStepStatus(stepIndex: number, currentStep: number): 'completed' | 'current' | 'pending' {
  if (stepIndex < currentStep) return 'completed'
  if (stepIndex === currentStep) return 'current'
  return 'pending'
}

/**
 * KycStepper - KYC 步骤进度条组件（极简版）
 */
export const KycStepper: React.FC<KycStepperProps> = ({
  currentStep,
  onStepClick,
  className,
}) => {
  const { t, i18n } = useTranslation()
  const isZh = i18n.language.startsWith('zh')

  // 确保 currentStep 在有效范围内
  const validCurrentStep = Math.max(0, Math.min(currentStep, STEPS.length - 1))

  return (
    <nav
      className={cn('w-full', className)}
      aria-label={t('kyc.stepper.ariaLabel', 'Verification progress')}
    >
      {/* 桌面端：水平步骤条 */}
      <div className="hidden sm:flex items-center justify-center gap-2">
        {STEPS.map((step, index) => {
          const status = getStepStatus(index, validCurrentStep)
          const isClickable = status === 'completed' && !!onStepClick
          const isLast = index === STEPS.length - 1

          return (
            <React.Fragment key={index}>
              {/* 步骤圆圈 */}
              <button
                type="button"
                onClick={isClickable ? () => onStepClick(index) : undefined}
                disabled={!isClickable}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300',
                  status === 'completed' && 'text-primary',
                  status === 'current' && 'text-white',
                  status === 'pending' && 'text-white/30',
                  isClickable && 'cursor-pointer hover:text-primary-light'
                )}
                aria-current={status === 'current' ? 'step' : undefined}
                aria-label={`${isZh ? step.titleZh : step.title} (${
                  status === 'completed' ? t('kyc.stepper.completed') : 
                  status === 'current' ? t('kyc.stepper.current') : 
                  t('kyc.stepper.pending')
                })`}
              >
                {/* 圆圈指示器 */}
                <span
                  className={cn(
                    'flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-medium',
                    'transition-all duration-300',
                    status === 'completed' && 'bg-primary text-bg-dark',
                    status === 'current' && 'bg-white text-bg-dark',
                    status === 'pending' && 'bg-white/10 text-white/50'
                  )}
                >
                  {status === 'completed' ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    index + 1
                  )}
                </span>
                
                {/* 步骤标题 */}
                <span className="text-sm font-medium">
                  {isZh ? step.titleZh : step.title}
                </span>
              </button>

              {/* 连接线 */}
              {!isLast && (
                <div className="w-8 h-px bg-white/10">
                  <div
                    className={cn(
                      'h-full transition-all duration-500',
                      status === 'completed' ? 'bg-primary' : 'bg-transparent'
                    )}
                  />
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* 移动端：简化步骤指示 - 显示当前步骤名称 + 进度点 */}
      <div className="sm:hidden">
        {/* 当前步骤信息 */}
        <div className="text-center mb-3">
          <span className="text-sm font-medium text-white">
            {t('kyc.stepper.stepOf', { current: validCurrentStep + 1, total: STEPS.length })}
          </span>
          <span className="mx-2 text-white/30">·</span>
          <span className="text-sm text-white/70">
            {isZh ? STEPS[validCurrentStep].titleZh : STEPS[validCurrentStep].title}
          </span>
        </div>
        
        {/* 进度点指示器 */}
        <div className="flex items-center justify-center gap-2">
          {STEPS.map((step, index) => {
            const status = getStepStatus(index, validCurrentStep)
            const isClickable = status === 'completed' && !!onStepClick

            return (
              <button
                key={index}
                type="button"
                onClick={isClickable ? () => onStepClick(index) : undefined}
                disabled={!isClickable}
                className={cn(
                  'transition-all duration-300',
                  isClickable && 'cursor-pointer'
                )}
                aria-current={status === 'current' ? 'step' : undefined}
                aria-label={`${isZh ? step.titleZh : step.title} (${
                  status === 'completed' ? t('kyc.stepper.completed') : 
                  status === 'current' ? t('kyc.stepper.current') : 
                  t('kyc.stepper.pending')
                })`}
              >
                {/* 进度点 */}
                <span
                  className={cn(
                    'block rounded-full transition-all duration-300',
                    status === 'completed' && 'w-2.5 h-2.5 bg-primary',
                    status === 'current' && 'w-3 h-3 bg-white ring-2 ring-white/20',
                    status === 'pending' && 'w-2 h-2 bg-white/20'
                  )}
                />
              </button>
            )
          })}
        </div>
        
        {/* 进度条 */}
        <div className="mt-3 h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary-light transition-all duration-500 ease-out"
            style={{ width: `${((validCurrentStep + 1) / STEPS.length) * 100}%` }}
            role="progressbar"
            aria-valuenow={validCurrentStep + 1}
            aria-valuemin={1}
            aria-valuemax={STEPS.length}
          />
        </div>
      </div>
    </nav>
  )
}

KycStepper.displayName = 'KycStepper'

export default KycStepper
