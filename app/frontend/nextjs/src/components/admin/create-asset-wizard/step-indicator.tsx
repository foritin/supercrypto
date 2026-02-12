/**
 * StepIndicator - 步骤指示器组件
 * 
 * 显示向导的进度状态，包括当前步骤、已完成步骤和待完成步骤
 * 
 * 响应式布局：
 * - 移动端 (< md): 简化水平布局，只显示步骤数字和当前步骤标题
 * - 桌面端 (>= md): 完整水平布局，显示所有步骤标题
 * 
 * @validates Requirements 2.1, 2.2, 2.3, 2.4, 2.5
 * @validates Requirements 9.4 (aria-current="step")
 * @validates Requirements 8.5 (响应式布局)
 */
'use client'

import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StepIndicatorProps, StepConfig } from './types'

/**
 * 获取步骤状态
 */
type StepStatus = 'completed' | 'current' | 'pending'

function getStepStatus(
  stepId: number,
  currentStep: number,
  completedSteps: Set<number>
): StepStatus {
  if (completedSteps.has(stepId)) {
    return 'completed'
  }
  if (stepId === currentStep) {
    return 'current'
  }
  return 'pending'
}

/**
 * 获取连接线状态
 * 连接线在当前步骤之前的都显示为已完成状态
 */
function getConnectorStatus(
  stepId: number,
  completedSteps: Set<number>
): 'completed' | 'pending' {
  // 如果当前步骤已完成，则连接线为已完成状态
  if (completedSteps.has(stepId)) {
    return 'completed'
  }
  return 'pending'
}

/**
 * 单个步骤圆圈组件
 * 响应式：移动端使用较小尺寸 (w-8 h-8)，桌面端使用标准尺寸 (w-10 h-10)
 */
interface StepCircleProps {
  step: StepConfig
  status: StepStatus
  onClick?: () => void
  t: (key: string) => string
}

function StepCircle({ step, status, onClick, t }: StepCircleProps) {
  const isClickable = onClick !== undefined
  const stepTitle = t(step.title)
  const completedLabel = t('admin.assets.wizard.aria.stepCompleted')
  const currentLabel = t('admin.assets.wizard.aria.stepCurrent')
  
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isClickable}
      aria-current={status === 'current' ? 'step' : undefined}
      aria-label={`${stepTitle}${status === 'completed' ? ` ${completedLabel}` : status === 'current' ? ` ${currentLabel}` : ''}`}
      className={cn(
        // 基础样式: 圆形 - 移动端 w-8 h-8, 桌面端 w-10 h-10
        'w-8 h-8 md:w-10 md:h-10 rounded-full',
        'flex items-center justify-center',
        'text-xs md:text-sm font-medium',
        'transition-all duration-300',
        'border-2',
        // 焦点状态
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-dark',
        // 状态样式
        {
          // 已完成: bg-primary border-primary text-primary-foreground
          'bg-primary border-primary text-primary-foreground': status === 'completed',
          // 当前: border-primary text-primary bg-transparent
          'border-primary text-primary bg-transparent': status === 'current',
          // 待完成: border-white/20 text-white/40 bg-transparent
          'border-white/20 text-white/40 bg-transparent': status === 'pending',
        },
        // 可点击状态
        isClickable && status !== 'pending' && 'cursor-pointer hover:scale-105',
        !isClickable && 'cursor-default',
        status === 'pending' && 'cursor-not-allowed'
      )}
    >
      {status === 'completed' ? (
        <Check className="w-4 h-4 md:w-5 md:h-5" aria-hidden="true" />
      ) : (
        <span>{step.id}</span>
      )}
    </button>
  )
}

/**
 * 步骤连接线组件
 * 响应式：移动端使用较短连接线 (w-6)，桌面端使用标准长度 (w-16)
 */
interface StepConnectorProps {
  status: 'completed' | 'pending'
}

function StepConnector({ status }: StepConnectorProps) {
  return (
    <div
      className={cn(
        // 连接线尺寸: 移动端 w-6, 桌面端 w-16
        'w-6 sm:w-10 md:w-16 h-0.5',
        'transition-colors duration-300',
        // 状态样式
        {
          'bg-primary': status === 'completed',
          'bg-white/20': status === 'pending',
        }
      )}
      aria-hidden="true"
    />
  )
}

/**
 * 步骤标签组件
 * 响应式：移动端隐藏非当前步骤标签，桌面端显示所有标签
 */
interface StepLabelProps {
  step: StepConfig
  status: StepStatus
  isCurrent: boolean
  t: (key: string) => string
}

function StepLabel({ step, status, isCurrent, t }: StepLabelProps) {
  return (
    <div className={cn(
      'mt-2 text-center',
      // 移动端：只显示当前步骤标签，其他隐藏
      // 桌面端：显示所有标签
      !isCurrent && 'hidden md:block'
    )}>
      <span
        className={cn(
          'text-xs font-medium transition-colors duration-300',
          // 移动端当前步骤使用稍大字体
          isCurrent && 'text-[11px] sm:text-xs',
          {
            'text-primary': status === 'completed' || status === 'current',
            'text-white/40': status === 'pending',
          }
        )}
      >
        {t(step.title)}
      </span>
    </div>
  )
}

/**
 * 移动端当前步骤信息组件
 * 在移动端显示当前步骤的详细信息
 */
interface MobileStepInfoProps {
  currentStep: number
  totalSteps: number
  currentStepTitle: string
  t: (key: string, params?: Record<string, unknown>) => string
}

function MobileStepInfo({ currentStep, totalSteps, currentStepTitle, t }: MobileStepInfoProps) {
  return (
    <div className="md:hidden text-center mt-3">
      <p className="text-xs text-muted-foreground">
        {t('admin.assets.wizard.mobileStep', { current: currentStep, total: totalSteps })}
      </p>
      <p className="text-sm font-medium text-primary mt-0.5">
        {currentStepTitle}
      </p>
    </div>
  )
}

/**
 * StepIndicator 主组件
 * 
 * 显示向导步骤进度，支持以下功能：
 * - 圆形数字标识每个步骤 (w-10 h-10 rounded-full)
 * - 已完成步骤显示绿色勾选图标
 * - 当前步骤高亮显示
 * - 步骤之间显示连接线
 * - 支持点击已完成步骤跳转 (可选)
 * - 支持键盘导航 (Tab)
 * - 支持 aria-current="step" 标识当前步骤
 * - 响应式布局：移动端简化显示，桌面端完整显示
 * 
 * @example
 * ```tsx
 * <StepIndicator
 *   steps={WIZARD_STEPS}
 *   currentStep={2}
 *   completedSteps={new Set([1])}
 *   onStepClick={(step) => goToStep(step)}
 * />
 * ```
 */
export function StepIndicator({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
}: StepIndicatorProps) {
  const { t } = useTranslation()
  
  // 获取当前步骤信息
  const currentStepConfig = steps.find(s => s.id === currentStep)
  const currentStepTitle = currentStepConfig ? t(currentStepConfig.title) : ''

  return (
    <nav
      aria-label={t('admin.assets.wizard.aria.progress')}
      className="flex flex-col items-center justify-center"
    >
      <ol className="flex items-center" role="list">
        {steps.map((step, index) => {
          const status = getStepStatus(step.id, currentStep, completedSteps)
          const isLastStep = index === steps.length - 1
          const connectorStatus = getConnectorStatus(step.id, completedSteps)
          const isCurrent = step.id === currentStep
          
          // 只允许点击已完成的步骤
          const canClick = onStepClick && completedSteps.has(step.id)
          
          return (
            <li
              key={step.id}
              className="flex items-center"
            >
              {/* 步骤圆圈和标签 */}
              <div className="flex flex-col items-center">
                <StepCircle
                  step={step}
                  status={status}
                  onClick={canClick ? () => onStepClick(step.id) : undefined}
                  t={t}
                />
                {/* 桌面端显示所有标签，移动端只显示当前步骤标签 */}
                <StepLabel step={step} status={status} isCurrent={isCurrent} t={t} />
              </div>
              
              {/* 连接线 (最后一个步骤不显示) */}
              {!isLastStep && (
                <div className="mx-1 sm:mx-1.5 md:mx-2 mb-0 md:mb-6">
                  <StepConnector status={connectorStatus} />
                </div>
              )}
            </li>
          )
        })}
      </ol>
      
      {/* 移动端显示当前步骤详细信息 */}
      <MobileStepInfo 
        currentStep={currentStep}
        totalSteps={steps.length}
        currentStepTitle={currentStepTitle}
        t={t}
      />
    </nav>
  )
}

export default StepIndicator
