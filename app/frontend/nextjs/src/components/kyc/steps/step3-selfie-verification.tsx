'use client'

/**
 * Step3SelfieVerification - KYC 向导步骤 3: 自拍验证与活体检测
 *
 * 实现自拍验证功能：
 * - 集成 LivenessDetector 组件进行活体检测
 * - 实现摄像头权限请求流程
 * - 实现活体检测 UI (视频预览、眨眼提示)
 * - 实现检测成功后自动捕获自拍照
 * - 实现降级方案 (手动上传) - 使用 ManualSelfieUpload 组件
 * - 显示拍照提示文案
 *
 * @validates Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9
 */

import {
  Camera,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  Trash2,
  Eye,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  LivenessDetector,
  type LivenessResult,
  type LivenessError,
} from '@/components/kyc/liveness-detector'
import { ManualSelfieUpload } from '@/components/kyc/manual-selfie-upload'
import { Button } from '@/components/ui/button'
import type { FileUploadError } from '@/components/ui/file-upload'
import { cn } from '@/lib/utils'

// ============ 类型定义 ============

/**
 * Step3SelfieVerification 组件属性
 */
export interface Step3SelfieVerificationProps {
  /** 完成回调 - 返回自拍照 URL */
  onComplete: (data: { selfieUrl: string }) => void
  /** 返回上一步回调 */
  onBack: () => void
  /** 初始数据 */
  initialData?: { selfieUrl?: string }
  /** 禁用状态 */
  disabled?: boolean
  /** 自定义类名 */
  className?: string
}

/**
 * 组件内部状态阶段
 */
type VerificationPhase =
  | 'init'      // 初始状态 - 显示开始检测按钮
  | 'detecting' // 检测中 - 显示 LivenessDetector
  | 'fallback'  // 降级模式 - 显示 ManualSelfieUpload
  | 'success'   // 成功 - 显示预览和操作按钮

// ============ 常量 ============

/** 最大重试次数 */
const MAX_RETRIES = 3

// ============ 辅助组件 ============

/**
 * 拍照提示组件
 * Requirements 5.7: 显示拍照提示（光线充足、正面面对镜头、无遮挡）
 * Requirements 9.1: 无障碍支持 - 使用语义化列表
 */
function PhotoTips({ className }: { className?: string }) {
  const { t } = useTranslation()
  return (
    <ul className={cn('space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-white/60', className)} aria-label={t('kyc.liveness.tips.title')}>
      <li className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" aria-hidden="true" />
        {t('kyc.liveness.tips.lighting')}
      </li>
      <li className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" aria-hidden="true" />
        {t('kyc.liveness.tips.face')}
      </li>
      <li className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" aria-hidden="true" />
        {t('kyc.liveness.tips.noObstruction')}
      </li>
    </ul>
  )
}

/**
 * 成功预览组件
 * Requirements 5.9: 用户可以预览已拍摄的自拍照
 * Requirements 9.1, 9.2: 无障碍支持
 */
interface SuccessPreviewProps {
  selfieUrl: string
  livenessVerified: boolean
  onRetake: () => void
  onRemove: () => void
  disabled?: boolean
}

function SuccessPreview({
  selfieUrl,
  livenessVerified,
  onRetake,
  onRemove,
  disabled,
}: SuccessPreviewProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center gap-4 sm:gap-6 py-3 sm:py-4" role="region" aria-label={t('kyc.liveness.selfieUploaded')}>
      {/* 自拍照预览 - 响应式尺寸 */}
      <div className="relative">
        {/* 预览图片 - Mobile: 较小尺寸 */}
        <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-4 border-primary shadow-[0_0_30px_rgba(0,212,170,0.3)]">
          { }
          <img
            src={selfieUrl}
            alt={t('kyc.liveness.selfieUploaded')}
            className="w-full h-full object-cover"
          />
        </div>

        {/* 成功徽章 */}
        <div className="absolute -bottom-2 -right-2 p-1.5 sm:p-2 rounded-full bg-primary shadow-lg" aria-hidden="true">
          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-bg-dark" />
        </div>
      </div>

      {/* 状态信息 */}
      <div className="text-center" role="status" aria-live="polite">
        <div className="flex items-center justify-center gap-2 text-primary mb-1 sm:mb-2">
          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
          <span className="text-base sm:text-lg font-semibold">{t('kyc.liveness.selfieUploaded')}</span>
        </div>
        <p className="text-xs sm:text-sm text-white/60">
          {livenessVerified ? t('kyc.liveness.success') : t('kyc.confirmation.manualUpload')}
        </p>
      </div>

      {/* 操作按钮 - Requirements 8.3: 触摸目标尺寸优化 */}
      <div className="flex gap-2 sm:gap-3" role="group" aria-label={t('kyc.upload.selfie')}>
        {/* 重新拍摄按钮 - Requirements 5.5: 用户可以重新拍摄自拍照（最多3次） */}
        <Button
          variant="outline"
          size="sm"
          onClick={onRetake}
          disabled={disabled}
          className="gap-2 min-h-[44px] px-4"
          aria-label={t('kyc.upload.retake')}
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          {t('kyc.upload.retake')}
        </Button>

        {/* 删除按钮 */}
        <Button
          variant="outline"
          size="sm"
          onClick={onRemove}
          disabled={disabled}
          className="gap-2 text-destructive hover:text-destructive min-h-[44px] px-4"
          aria-label={t('kyc.upload.remove')}
        >
          <Trash2 className="w-4 h-4" aria-hidden="true" />
          {t('kyc.upload.remove')}
        </Button>
      </div>
    </div>
  )
}

/**
 * 初始状态组件
 * Requirements 9.1, 9.2: 无障碍支持
 */
interface InitStateProps {
  onStartDetection: () => void
  onManualUpload: () => void
  disabled?: boolean
}

function InitState({ onStartDetection, onManualUpload, disabled }: InitStateProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center gap-4 sm:gap-6 py-4 sm:py-6" role="region" aria-label={t('kyc.liveness.title')}>
      {/* 图标 - 响应式尺寸 */}
      <div className="p-4 sm:p-6 rounded-full bg-primary/10 border border-primary/20" aria-hidden="true">
        <Camera className="w-10 h-10 sm:w-12 sm:h-12 text-primary" />
      </div>

      {/* 标题和说明 */}
      <div className="text-center px-2">
        <h3 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2">{t('kyc.liveness.title')}</h3>
        <p className="text-xs sm:text-sm text-white/60 max-w-sm">
          {t('kyc.liveness.description')}
        </p>
      </div>

      {/* 拍照提示 */}
      <PhotoTips />

      {/* 开始检测按钮 - Requirements 8.3: 触摸目标尺寸优化 */}
      <Button
        onClick={onStartDetection}
        disabled={disabled}
        size="lg"
        className="mt-1 sm:mt-2 gap-2 w-full sm:w-auto min-h-[48px]"
        aria-label={t('kyc.liveness.startDetection')}
      >
        <Eye className="w-5 h-5" aria-hidden="true" />
        {t('kyc.liveness.startDetection')}
      </Button>

      {/* 手动上传链接 - Requirements 8.3: 触摸目标尺寸优化 */}
      <button
        type="button"
        onClick={onManualUpload}
        disabled={disabled}
        className="text-xs sm:text-sm text-white/40 hover:text-white/60 underline disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded min-h-[44px] px-4 flex items-center"
        aria-label={t('kyc.liveness.manualUploadLink')}
      >
        {t('kyc.liveness.manualUploadLink')}
      </button>
    </div>
  )
}

// ============ 主组件 ============

/**
 * Step3SelfieVerification - KYC 自拍验证组件
 *
 * @example
 * <Step3SelfieVerification
 *   onComplete={(data) => console.log('Selfie URL:', data.selfieUrl)}
 *   onBack={() => goToPreviousStep()}
 *   initialData={{ selfieUrl: '' }}
 * />
 */
export function Step3SelfieVerification({
  onComplete,
  onBack,
  initialData,
  disabled = false,
  className,
}: Step3SelfieVerificationProps) {
  const { t } = useTranslation()

  // ============ 状态管理 ============

  /** 当前阶段 */
  const [phase, setPhase] = useState<VerificationPhase>(() => {
    // 如果有初始数据，直接显示成功状态
    return initialData?.selfieUrl ? 'success' : 'init'
  })

  /** 自拍照 URL */
  const [selfieUrl, setSelfieUrl] = useState<string>(initialData?.selfieUrl || '')

  /** 是否通过活体检测 */
  const [livenessVerified, setLivenessVerified] = useState<boolean>(false)

  /** 重试次数 */
  const [retryCount, setRetryCount] = useState<number>(0)

  /** 错误信息 */
  const [error, setError] = useState<string | null>(null)

  // ============ 回调函数 ============

  /**
   * 处理活体检测成功
   * Requirements 5.4: 活体检测通过后自动捕获自拍照
   * Requirements 5.8: 自拍照上传到 MinIO 存储
   */
  const handleLivenessSuccess = useCallback((result: LivenessResult) => {
    setSelfieUrl(result.selfieUrl)
    setLivenessVerified(result.passed)
    setPhase('success')
    setError(null)

    // 通知父组件
    onComplete({ selfieUrl: result.selfieUrl })
  }, [onComplete])

  /**
   * 处理活体检测错误
   */
  const handleLivenessError = useCallback((err: LivenessError) => {
    console.error('Liveness detection error:', err)
    setError(err.message)

    // 如果不能重试，切换到降级模式
    if (!err.canRetry) {
      setPhase('fallback')
    }
  }, [])

  /**
   * 处理降级到手动上传
   * Requirements 5.6: 活体检测不可用时显示手动上传选项
   */
  const handleFallback = useCallback(() => {
    setPhase('fallback')
    setError(null)
  }, [])

  /**
   * 处理手动上传成功
   */
  const handleManualUpload = useCallback((_file: File, url: string) => {
    setSelfieUrl(url)
    setLivenessVerified(false) // 手动上传不算活体检测通过
    setPhase('success')
    setError(null)

    // 通知父组件
    onComplete({ selfieUrl: url })
  }, [onComplete])

  /**
   * 处理手动上传错误
   */
  const handleManualUploadError = useCallback((err: FileUploadError) => {
    setError(err.message)
  }, [])

  /**
   * 开始活体检测
   * Requirements 5.1: 用户可以使用设备摄像头进行自拍验证
   */
  const handleStartDetection = useCallback(() => {
    setPhase('detecting')
    setError(null)
  }, [])

  /**
   * 重新拍摄
   * Requirements 5.5: 用户可以重新拍摄自拍照（最多3次）
   */
  const handleRetake = useCallback(() => {
    const newRetryCount = retryCount + 1

    if (newRetryCount >= MAX_RETRIES) {
      // 达到最大重试次数，切换到降级模式
      setPhase('fallback')
      setError('已达到最大重试次数，请手动上传自拍照')
    } else {
      setRetryCount(newRetryCount)
      setSelfieUrl('')
      setLivenessVerified(false)
      setPhase('detecting')
      setError(null)
    }
  }, [retryCount])

  /**
   * 删除自拍照
   */
  const handleRemove = useCallback(() => {
    setSelfieUrl('')
    setLivenessVerified(false)
    setPhase('init')
    setError(null)
  }, [])

  /**
   * 切换到手动上传模式
   */
  const handleSwitchToManual = useCallback(() => {
    setPhase('fallback')
    setError(null)
  }, [])

  /**
   * 手动上传后删除
   */
  const handleManualRemove = useCallback(() => {
    setSelfieUrl('')
    setLivenessVerified(false)
    // 保持在 fallback 模式，让用户重新上传
  }, [])

  // ============ 副作用 ============

  // 当 selfieUrl 变化时，同步到父组件
  useEffect(() => {
    if (selfieUrl && phase === 'success') {
      onComplete({ selfieUrl })
    }
  }, [selfieUrl, phase, onComplete])

  // ============ 渲染 ============

  return (
    <div
      className={cn(
        'relative',
        // Mobile: 较小圆角和内边距
        'rounded-xl p-4',
        // Desktop: 正常圆角和内边距
        'sm:rounded-2xl sm:p-6',
        'bg-[rgba(17,25,22,0.8)] backdrop-blur-[12px]',
        'border border-white/[0.08]',
        className
      )}
    >
      {/* 步骤标题 */}
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10">
          <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-white">{t('kyc.liveness.title')}</h2>
          <p className="text-xs sm:text-sm text-white/60">{t('kyc.liveness.description')}</p>
        </div>
      </div>

      {/* 错误提示 - 使用 role="alert" 确保屏幕阅读器播报 */}
      {error && (
        <div
          className="mb-3 sm:mb-4 p-2.5 sm:p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2"
          role="alert"
          aria-live="assertive"
        >
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-destructive flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs sm:text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* 重试次数提示 - 使用 role="status" 通知用户 */}
      {retryCount > 0 && retryCount < MAX_RETRIES && phase !== 'success' && (
        <div
          className="mb-3 sm:mb-4 p-2.5 sm:p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-2"
          role="status"
          aria-live="polite"
        >
          <RefreshCw className="w-4 h-4 text-yellow-500" aria-hidden="true" />
          <p className="text-xs sm:text-sm text-yellow-500">
            {t('kyc.liveness.retryCount', { current: retryCount, max: MAX_RETRIES })}
          </p>
        </div>
      )}

      {/* 初始状态 */}
      {phase === 'init' && (
        <InitState
          onStartDetection={handleStartDetection}
          onManualUpload={handleSwitchToManual}
          disabled={disabled}
        />
      )}

      {/* 活体检测中 */}
      {phase === 'detecting' && (
        <LivenessDetector
          onSuccess={handleLivenessSuccess}
          onError={handleLivenessError}
          onFallback={handleFallback}
          disabled={disabled}
          maxRetries={MAX_RETRIES - retryCount}
        />
      )}

      {/* 降级模式 - 手动上传 */}
      {phase === 'fallback' && (
        <ManualSelfieUpload
          value={selfieUrl}
          onUpload={handleManualUpload}
          onError={handleManualUploadError}
          onRemove={handleManualRemove}
          disabled={disabled}
        />
      )}

      {/* 成功状态 - 显示预览 */}
      {phase === 'success' && selfieUrl && (
        <SuccessPreview
          selfieUrl={selfieUrl}
          livenessVerified={livenessVerified}
          onRetake={handleRetake}
          onRemove={handleRemove}
          disabled={disabled}
        />
      )}

      {/* 导航按钮 - 响应式布局 */}
      <div className={cn(
        'flex mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-white/10',
        // Mobile: 垂直堆叠，全宽按钮
        'flex-col-reverse gap-3',
        // Desktop: 水平布局
        'sm:flex-row sm:justify-between'
      )}>
        {/* Requirements 8.3: 触摸目标尺寸优化 - 最小高度 44px */}
        <Button
          variant="outline"
          onClick={onBack}
          disabled={disabled}
          className="w-full sm:w-auto min-h-[44px]"
        >
          {t('kyc.navigation.previous')}
        </Button>

        {/* 只有在成功状态且有 selfieUrl 时才显示下一步按钮 */}
        {phase === 'success' && selfieUrl && (
          <div className="flex items-center justify-center sm:justify-end gap-2 text-primary">
            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs sm:text-sm font-medium">{t('kyc.navigation.complete')}</span>
          </div>
        )}
      </div>
    </div>
  )
}

Step3SelfieVerification.displayName = 'Step3SelfieVerification'

export default Step3SelfieVerification
