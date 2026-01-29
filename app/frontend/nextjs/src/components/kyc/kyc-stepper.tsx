'use client'

/**
 * KycStepper 组件 - KYC 步骤进度条
 *
 * 显示 KYC 向导的当前步骤和整体进度
 * 支持已完成/进行中/待完成状态的视觉区分
 *
 * Validates: Requirements 2.1, 2.5
 */

import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { User, FileText, Camera, CheckCircle, Check } from 'lucide-react'

/**
 * 步骤配置接口
 */
export interface StepConfig {
  /** 步骤标题 */
  title: string
  /** 步骤描述 (可选) */
  description?: string
  /** 步骤图标 */
  icon?: React.ReactNode
}

/**
 * KycStepper 组件属性
 */
export interface KycStepperProps {
  /** 当前步骤 (0-3) */
  currentStep: number
  /** 步骤配置 */
  steps?: StepConfig[]
  /** 步骤点击回调 (仅允许点击已完成步骤) */
  onStepClick?: (step: number) => void
  /** 自定义类名 */
  className?: string
}

/**
 * 步骤图标配置
 */
const STEP_ICONS = [
  <User key="user" className="w-5 h-5" />,
  <FileText key="file" className="w-5 h-5" />,
  <Camera key="camera" className="w-5 h-5" />,
  <CheckCircle key="check" className="w-5 h-5" />,
]

/**
 * 步骤状态类型
 */
type StepStatus = 'completed' | 'current' | 'pending'

/**
 * 获取步骤状态
 * Requirements 2.5: 显示当前步骤、已完成步骤和待完成步骤的视觉区分
 */
function getStepStatus(stepIndex: number, currentStep: number): StepStatus {
  if (stepIndex < currentStep) return 'completed'
  if (stepIndex === currentStep) return 'current'
  return 'pending'
}

/**
 * 步骤状态文本
 */
interface StepStatusLabels {
  completed: string
  current: string
  pending: string
  clickToReturn: string
}

/**
 * 单个步骤组件属性
 */
interface StepItemProps {
  step: StepConfig
  index: number
  status: StepStatus
  isLast: boolean
  onClick?: () => void
  isClickable: boolean
  statusLabels: StepStatusLabels
}

const StepItem: React.FC<StepItemProps> = ({
  step,
  index,
  status,
  isLast,
  onClick,
  isClickable,
  statusLabels,
}) => {
  const handleClick = () => {
    if (isClickable && onClick) {
      onClick()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && isClickable && onClick) {
      e.preventDefault()
      onClick()
    }
  }

  const statusLabel = status === 'completed' ? statusLabels.completed : status === 'current' ? statusLabels.current : statusLabels.pending

  return (
    <div className="flex items-center flex-1 min-w-0">
      {/* 步骤圆圈和内容 */}
      <div
        className={cn(
          'flex flex-col items-center',
          isClickable && 'cursor-pointer group'
        )}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        aria-label={`${step.title} (${statusLabel})`}
        aria-current={status === 'current' ? 'step' : undefined}
      >
        {/* 步骤圆圈 */}
        <div
          className={cn(
            'relative flex items-center justify-center w-12 h-12 rounded-full',
            'transition-all duration-300 ease-out',
            // 已完成状态 - 霓虹绿背景
            status === 'completed' && [
              'bg-[#00D4AA]',
              'shadow-[0_0_20px_rgba(0,212,170,0.4)]',
              isClickable && 'group-hover:shadow-[0_0_30px_rgba(0,212,170,0.6)]',
            ],
            // 进行中状态 - 霓虹绿边框 + 脉冲动画
            status === 'current' && [
              'bg-[#00D4AA]/20',
              'border-2 border-[#00D4AA]',
              'shadow-[0_0_20px_rgba(0,212,170,0.3)]',
              'animate-pulse',
            ],
            // 待完成状态 - 灰色边框
            status === 'pending' && [
              'bg-white/5',
              'border-2 border-white/20',
            ]
          )}
        >
          {/* 图标或完成勾选 */}
          {status === 'completed' ? (
            <Check className="w-6 h-6 text-[#0a0f0d]" aria-hidden="true" />
          ) : (
            <span
              className={cn(
                'transition-colors duration-300',
                status === 'current' && 'text-[#00D4AA]',
                status === 'pending' && 'text-white/40'
              )}
              aria-hidden="true"
            >
              {step.icon || <span className="text-lg font-semibold">{index + 1}</span>}
            </span>
          )}
        </div>

        {/* 步骤标题 */}
        <span
          className={cn(
            'mt-3 text-sm font-medium text-center whitespace-nowrap',
            'transition-colors duration-300',
            status === 'completed' && 'text-[#00D4AA]',
            status === 'current' && 'text-white',
            status === 'pending' && 'text-white/40',
            isClickable && status === 'completed' && 'group-hover:text-[#33FFCC]'
          )}
        >
          {step.title}
        </span>

        {/* 步骤描述 (可选) */}
        {step.description && (
          <span
            className={cn(
              'mt-1 text-xs text-center max-w-[100px]',
              'transition-colors duration-300',
              status === 'completed' && 'text-[#00D4AA]/70',
              status === 'current' && 'text-white/70',
              status === 'pending' && 'text-white/30'
            )}
          >
            {step.description}
          </span>
        )}
      </div>

      {/* 连接线 */}
      {!isLast && (
        <div className="flex-1 mx-4 h-[2px] min-w-[20px]">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500 ease-out',
              // 已完成的连接线 - 霓虹绿渐变
              status === 'completed' && 'bg-gradient-to-r from-[#00D4AA] to-[#00D4AA]',
              // 进行中的连接线 - 渐变到灰色
              status === 'current' && 'bg-gradient-to-r from-[#00D4AA]/50 to-white/10',
              // 待完成的连接线 - 灰色
              status === 'pending' && 'bg-white/10'
            )}
          />
        </div>
      )}
    </div>
  )
}

/**
 * KycStepper - KYC 步骤进度条组件
 *
 * @example
 * // 基本用法
 * <KycStepper currentStep={1} />
 *
 * @example
 * // 带点击回调
 * <KycStepper
 *   currentStep={2}
 *   onStepClick={(step) => console.log('Clicked step:', step)}
 * />
 *
 * @example
 * // 自定义步骤配置
 * <KycStepper
 *   currentStep={0}
 *   steps={[
 *     { title: 'Step 1', icon: <Icon1 /> },
 *     { title: 'Step 2', icon: <Icon2 /> },
 *   ]}
 * />
 */
export const KycStepper: React.FC<KycStepperProps> = ({
  currentStep,
  steps: customSteps,
  onStepClick,
  className,
}) => {
  const { t } = useTranslation()

  // 使用 i18n 的默认步骤配置
  const defaultSteps: StepConfig[] = React.useMemo(() => [
    { title: t('kyc.steps.step1'), icon: STEP_ICONS[0] },
    { title: t('kyc.steps.step2'), icon: STEP_ICONS[1] },
    { title: t('kyc.steps.step3'), icon: STEP_ICONS[2] },
    { title: t('kyc.steps.step4'), icon: STEP_ICONS[3] },
  ], [t])

  // 状态标签
  const statusLabels: StepStatusLabels = React.useMemo(() => ({
    completed: t('kyc.stepper.statusCompleted'),
    current: t('kyc.stepper.statusCurrent'),
    pending: t('kyc.stepper.statusPending'),
    clickToReturn: t('kyc.stepper.clickToReturn'),
  }), [t])

  const steps = customSteps || defaultSteps

  // 确保 currentStep 在有效范围内
  const validCurrentStep = Math.max(0, Math.min(currentStep, steps.length - 1))

  return (
    <nav
      className={cn(
        'w-full',
        // 玻璃态背景
        'bg-[rgba(20,20,20,0.4)] backdrop-blur-[12px]',
        // Mobile: 较小圆角和内边距
        'rounded-xl p-4',
        // Desktop: 正常圆角和内边距
        'sm:rounded-2xl sm:p-6',
        'border border-white/[0.08]',
        className
      )}
      aria-label={t('kyc.stepper.ariaLabel')}
    >
      {/* Desktop: 水平步骤显示 */}
      <div className="hidden sm:flex items-start justify-between">
        {steps.map((step, index) => {
          const status = getStepStatus(index, validCurrentStep)
          // 仅允许点击已完成步骤
          const isClickable = status === 'completed' && !!onStepClick

          return (
            <StepItem
              key={index}
              step={step}
              index={index}
              status={status}
              isLast={index === steps.length - 1}
              onClick={isClickable ? () => onStepClick(index) : undefined}
              isClickable={isClickable}
              statusLabels={statusLabels}
            />
          )
        })}
      </div>

      {/* Mobile: 简化的步骤显示 - 只显示当前步骤信息 */}
      <div className="sm:hidden">
        {/* 当前步骤信息 */}
        <div className="flex items-center gap-3 mb-4">
          {/* 当前步骤图标 */}
          <div
            className={cn(
              'flex items-center justify-center',
              // Requirements 8.3: 触摸目标尺寸优化 - 最小 44x44px
              'w-11 h-11 rounded-full',
              'bg-[#00D4AA]/20 border-2 border-[#00D4AA]',
              'shadow-[0_0_20px_rgba(0,212,170,0.3)]'
            )}
          >
            <span className="text-[#00D4AA]" aria-hidden="true">
              {steps[validCurrentStep]?.icon || <span className="text-lg font-semibold">{validCurrentStep + 1}</span>}
            </span>
          </div>
          {/* 当前步骤标题 */}
          <div className="flex-1">
            <p className="text-sm font-medium text-white">
              {steps[validCurrentStep]?.title}
            </p>
            <p className="text-xs text-white/50">
              {t('kyc.stepper.stepProgress', { current: validCurrentStep + 1, total: steps.length })}
            </p>
          </div>
        </div>

        {/* 进度条 */}
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#00D4AA] to-[#33FFCC] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((validCurrentStep + 1) / steps.length) * 100}%` }}
            role="progressbar"
            aria-valuenow={validCurrentStep + 1}
            aria-valuemin={1}
            aria-valuemax={steps.length}
            aria-label={t('kyc.stepper.progressAriaLabel', { current: validCurrentStep + 1, total: steps.length })}
          />
        </div>

        {/* 步骤点指示器 */}
        <div className="flex justify-between mt-3">
          {steps.map((step, index) => {
            const status = getStepStatus(index, validCurrentStep)
            const isClickable = status === 'completed' && !!onStepClick
            const statusLabel = status === 'completed' 
              ? (isClickable ? `${statusLabels.completed}, ${statusLabels.clickToReturn}` : statusLabels.completed)
              : status === 'current' 
                ? statusLabels.current 
                : statusLabels.pending

            return (
              <button
                key={index}
                type="button"
                onClick={isClickable ? () => onStepClick(index) : undefined}
                disabled={!isClickable}
                className={cn(
                  // Requirements 8.3: 触摸目标尺寸优化 - 最小 44x44px
                  'flex items-center justify-center w-11 h-11 -m-2',
                  'transition-all duration-300',
                  isClickable && 'cursor-pointer'
                )}
                aria-label={`${step.title} (${statusLabel})`}
                aria-current={status === 'current' ? 'step' : undefined}
              >
                <div
                  className={cn(
                    'w-2.5 h-2.5 rounded-full transition-all duration-300',
                    status === 'completed' && 'bg-[#00D4AA] shadow-[0_0_8px_rgba(0,212,170,0.5)]',
                    status === 'current' && 'bg-[#00D4AA] w-3 h-3 shadow-[0_0_12px_rgba(0,212,170,0.6)]',
                    status === 'pending' && 'bg-white/20'
                  )}
                />
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

KycStepper.displayName = 'KycStepper'

export default KycStepper
