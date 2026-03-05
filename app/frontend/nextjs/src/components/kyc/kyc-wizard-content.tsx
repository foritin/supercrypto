'use client'

/**
 * KycWizardContent - KYC 向导内容切换动画组件
 *
 * 提供步骤内容切换的平滑动画效果
 * 支持前进和后退的不同动画方向
 */

import { useRef, useEffect, useState } from 'react'

import { cn } from '@/lib/utils'

// ============ 类型定义 ============

export interface KycWizardContentProps {
  /** 当前步骤 */
  currentStep: number
  /** 步骤内容 */
  children: React.ReactNode
  /** 自定义类名 */
  className?: string
  /** 动画方向 */
  direction?: 'forward' | 'backward'
}

// ============ 组件实现 ============

export function KycWizardContent({
  currentStep,
  children,
  className,
  direction: _direction = 'forward',
}: KycWizardContentProps) {
  const [displayChildren, setDisplayChildren] = useState(children)
  const [isAnimating, setIsAnimating] = useState(false)
  const [animationClass, setAnimationClass] = useState('')
  const prevStepRef = useRef(currentStep)

  useEffect(() => {
    // 步骤没有变化，不执行动画
    if (prevStepRef.current === currentStep) {
      setDisplayChildren(children)
      return
    }

    // 确定动画方向
    const isForward = currentStep > prevStepRef.current
    const exitClass = isForward
      ? 'animate-out slide-out-to-left-8 fade-out duration-200'
      : 'animate-out slide-out-to-right-8 fade-out duration-200'
    const enterClass = isForward
      ? 'animate-in slide-in-from-right-8 fade-in duration-300'
      : 'animate-in slide-in-from-left-8 fade-in duration-300'

    // 开始退出动画
    setIsAnimating(true)
    setAnimationClass(exitClass)

    // 退出动画完成后，切换内容并开始进入动画
    const timer = setTimeout(() => {
      setDisplayChildren(children)
      setAnimationClass(enterClass)
      prevStepRef.current = currentStep

      // 进入动画完成后，清除动画状态
      setTimeout(() => {
        setIsAnimating(false)
        setAnimationClass('')
      }, 300)
    }, 200)

    return () => clearTimeout(timer)
  }, [currentStep, children])

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        className
      )}
    >
      <div
        className={cn(
          'transition-all',
          animationClass,
          isAnimating && 'pointer-events-none'
        )}
      >
        {displayChildren}
      </div>
    </div>
  )
}

export default KycWizardContent
