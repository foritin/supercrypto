'use client'

/**
 * KycProgressRestore - KYC 进度恢复提示组件
 *
 * 检测 localStorage 中是否有保存的 KYC 进度
 * 如果有，显示提示让用户选择恢复或重新开始
 */

import { RotateCcw, RefreshCw, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ============ 类型定义 ============

export interface KycProgressRestoreProps {
  /** 恢复进度回调，传入恢复的步骤索引 */  onRestore: (stepIndex: number) => void
  /** 清除进度回调 */
  onClear: () => void
  /** 关闭回调 */
  onDismiss: () => void
  /** 自定义类名 */
  className?: string
}

interface SavedProgress {
  currentStep: number
  timestamp: number
}

// ============ 常量 ============

const STORAGE_KEY = 'kyc_wizard_data'
const PROGRESS_MAX_AGE = 7 * 24 * 60 * 60 * 1000 // 7 天

// ============ 辅助函数 ============

/**
 * 从 localStorage 加载保存的进度
 */
function loadSavedProgress(): SavedProgress | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null

    const data = JSON.parse(stored)
    
    // 检查是否有保存的步骤信息
    if (typeof data.currentStep === 'number') {
      return {
        currentStep: data.currentStep,
        timestamp: Date.now(), // 使用当前时间，因为旧数据可能没有保存时间
      }
    }

    // 如果只有表单数据，尝试推断步骤
    let inferredStep = 0
    if (data.selfieUrl) inferredStep = 3
    else if (data.idFrontUrl && data.idBackUrl) inferredStep = 2
    else if (data.fullName && data.dateOfBirth) inferredStep = 1

    return {
      currentStep: inferredStep,
      timestamp: Date.now(),
    }
  } catch {
    return null
  }
}

/**
 * 格式化时间差
 */
function formatTimeAgo(timestamp: number, t: (key: string, options?: Record<string, unknown>) => string): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / (60 * 1000))
  const hours = Math.floor(diff / (60 * 60 * 1000))
  const days = Math.floor(diff / (24 * 60 * 60 * 1000))

  if (days > 0) {
    return t('kyc.restore.timeAgo.days', { count: days })
  } else if (hours > 0) {
    return t('kyc.restore.timeAgo.hours', { count: hours })
  } else if (minutes > 0) {
    return t('kyc.restore.timeAgo.minutes', { count: minutes })
  } else {
    return t('kyc.restore.timeAgo.justNow')
  }
}

// ============ 组件实现 ============

export function KycProgressRestore({
  onRestore,
  onClear,
  onDismiss,
  className,
}: KycProgressRestoreProps) {
  const { t } = useTranslation()
  const [savedProgress, setSavedProgress] = useState<SavedProgress | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  // 检查是否有保存的进度
  useEffect(() => {
    const progress = loadSavedProgress()
    if (progress) {
      // 检查进度是否过期
      const isExpired = Date.now() - progress.timestamp > PROGRESS_MAX_AGE
      if (!isExpired) {
        setSavedProgress(progress)
        setIsVisible(true)
      }
    }
  }, [])

  // 处理恢复
  const handleRestore = () => {
    if (savedProgress) {
      onRestore(savedProgress.currentStep)
      setIsVisible(false)
    }
  }

  // 处理清除
  const handleClear = () => {
    onClear()
    setIsVisible(false)
  }

  // 处理关闭
  const handleDismiss = () => {
    onDismiss()
    setIsVisible(false)
  }

  if (!isVisible || !savedProgress) return null

  const timeAgo = formatTimeAgo(savedProgress.timestamp, (key, options) =>
    String(t(key, options as Record<string, unknown>))
  )
  const stepNames = [
    t('kyc.steps.personal.title'),
    t('kyc.steps.document.title'),
    t('kyc.steps.selfie.title'),
    t('kyc.steps.confirm.title'),
  ]

  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        'bg-primary/5 border-primary/20',
        'animate-in fade-in slide-in-from-top-2 duration-300',
        className
      )}
    >
      <div className="flex items-start gap-3">
        {/* 图标 */}
        <div className="flex-shrink-0 p-2 rounded-lg bg-primary/10">
          <RotateCcw className="w-5 h-5 text-primary" />
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-medium text-white text-sm">
                {t('kyc.restore.title')}
              </h3>
              <p className="text-xs text-white/60 mt-1">
                {t('kyc.restore.description', {
                  step: stepNames[savedProgress.currentStep],
                  time: timeAgo,
                })}
              </p>
            </div>

            {/* 关闭按钮 */}
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 rounded-lg text-white/40 hover:text-white/60 hover:bg-white/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              onClick={handleRestore}
              className="h-8 px-3 bg-primary hover:bg-primary/90 text-bg-dark text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              {t('kyc.restore.resume')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClear}
              className="h-8 px-3 text-white/60 hover:text-white hover:bg-white/5 text-xs"
            >
              {t('kyc.restore.restart')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default KycProgressRestore
