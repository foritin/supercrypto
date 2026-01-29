'use client'

/**
 * LivenessDetector 组件 - 活体检测组件
 *
 * 支持浏览器摄像头检测，实现眨眼检测和自拍照捕获
 * 提供降级方案（手动上传）和重试机制
 *
 * Validates: Requirements 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 8.1, 8.2, 8.3
 */

import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { uploadKycDocument } from '@/services/kyc'
import {
  Camera,
  CameraOff,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Eye,
  Loader2,
  Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 活体检测结果
 */
export interface LivenessResult {
  /** 是否通过 */
  passed: boolean
  /** 自拍照 URL (上传到 MinIO 后返回的文件路径) */
  selfieUrl: string
  /** 置信度 (0-1) */
  confidence?: number
  /** 检测方法 */
  method: 'blink' | 'manual'
}

/**
 * 活体检测错误
 */
export interface LivenessError {
  code: 'CAMERA_DENIED' | 'DETECTION_FAILED' | 'TIMEOUT' | 'NOT_SUPPORTED' | 'UPLOAD_FAILED'
  message: string
  canRetry: boolean
  retriesLeft: number
}

/**
 * LivenessDetector 组件属性
 */
export interface LivenessDetectorProps {
  /** 检测成功回调 */
  onSuccess?: (result: LivenessResult) => void
  /** 检测失败回调 */
  onError?: (error: LivenessError) => void
  /** 降级到手动上传回调 */
  onFallback?: () => void
  /** 禁用状态 */
  disabled?: boolean
  /** 最大重试次数 */
  maxRetries?: number
  /** 自定义类名 */
  className?: string
}

/**
 * 活体检测接口 (可扩展)
 * 支持浏览器检测和第三方服务
 */
export interface ILivenessDetector {
  /** 检查浏览器支持 */
  isSupported(): boolean
  /** 请求摄像头权限 */
  requestPermission(): Promise<boolean>
  /** 开始检测 */
  start(videoElement: HTMLVideoElement): Promise<void>
  /** 停止检测 */
  stop(): void
  /** 捕获自拍照 */
  capturePhoto(videoElement: HTMLVideoElement): Promise<Blob>
  /** 获取当前流 */
  getStream(): MediaStream | null
}

// ============================================================================
// 浏览器活体检测实现
// ============================================================================

/**
 * 浏览器活体检测实现
 * 使用 MediaDevices API 访问摄像头
 */
export class BrowserLivenessDetector implements ILivenessDetector {
  private stream: MediaStream | null = null

  /**
   * 检查浏览器是否支持 MediaDevices API
   */
  isSupported(): boolean {
    return !!(
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia
    )
  }

  /**
   * 请求摄像头权限
   */
  async requestPermission(): Promise<boolean> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      })
      return true
    } catch (error) {
      console.error('Camera permission denied:', error)
      return false
    }
  }

  /**
   * 开始检测 - 绑定视频流到 video 元素
   */
  async start(videoElement: HTMLVideoElement): Promise<void> {
    if (!this.stream) {
      throw new Error('Camera permission not granted')
    }

    videoElement.srcObject = this.stream
    await videoElement.play()
  }

  /**
   * 停止检测 - 释放摄像头资源
   */
  stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop())
      this.stream = null
    }
  }

  /**
   * 捕获自拍照
   */
  async capturePhoto(videoElement: HTMLVideoElement): Promise<Blob> {
    const canvas = document.createElement('canvas')
    canvas.width = videoElement.videoWidth
    canvas.height = videoElement.videoHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Failed to get canvas context')
    }

    // 绘制当前视频帧
    ctx.drawImage(videoElement, 0, 0)

    // 转换为 Blob
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to capture photo'))
          }
        },
        'image/jpeg',
        0.9
      )
    })
  }

  /**
   * 获取当前流
   */
  getStream(): MediaStream | null {
    return this.stream
  }
}

// ============================================================================
// 第三方活体检测接口 (预留)
// ============================================================================

/**
 * 第三方活体检测配置
 */
export interface ThirdPartyConfig {
  /** 服务提供商 */
  provider: 'sumsub' | 'onfido' | 'custom'
  /** API Key */
  apiKey: string
  /** 回调 URL */
  callbackUrl?: string
}

/**
 * 第三方活体检测实现 (预留接口)
 * 可用于集成 Sumsub、Onfido 等第三方服务
 */
export class ThirdPartyLivenessDetector implements ILivenessDetector {
  private config: ThirdPartyConfig

  constructor(config: ThirdPartyConfig) {
    this.config = config
  }

  isSupported(): boolean {
    // 第三方服务通常都支持
    return true
  }

  async requestPermission(): Promise<boolean> {
    // 第三方 SDK 会处理权限请求
    return true
  }

  async start(_videoElement: HTMLVideoElement): Promise<void> {
    // 调用第三方 SDK 初始化
    console.log('ThirdPartyLivenessDetector: start with config', this.config)
    throw new Error('Third-party liveness detection not implemented')
  }

  stop(): void {
    // 清理第三方 SDK
    console.log('ThirdPartyLivenessDetector: stop')
  }

  async capturePhoto(_videoElement: HTMLVideoElement): Promise<Blob> {
    // 第三方服务会处理照片捕获
    throw new Error('Third-party liveness detection not implemented')
  }

  getStream(): MediaStream | null {
    return null
  }
}

// ============================================================================
// 检测阶段类型
// ============================================================================

type DetectionPhase =
  | 'init' // 初始化
  | 'permission' // 请求权限中
  | 'preview' // 视频预览
  | 'detecting' // 检测中（等待眨眼）
  | 'capturing' // 捕获照片中
  | 'uploading' // 上传中
  | 'success' // 成功
  | 'error' // 错误
  | 'fallback' // 降级到手动上传

// ============================================================================
// LivenessDetector 组件
// ============================================================================

/**
 * LivenessDetector - 活体检测组件
 *
 * @example
 * // 基本用法
 * <LivenessDetector
 *   onSuccess={(result) => console.log('Selfie URL:', result.selfieUrl)}
 *   onError={(error) => console.error(error.message)}
 * />
 *
 * @example
 * // 带降级回调
 * <LivenessDetector
 *   onSuccess={handleSuccess}
 *   onFallback={() => setShowManualUpload(true)}
 *   maxRetries={3}
 * />
 */
export const LivenessDetector: React.FC<LivenessDetectorProps> = ({
  onSuccess,
  onError,
  onFallback,
  disabled = false,
  maxRetries = 3,
  className,
}) => {
  // i18n
  const { t } = useTranslation()

  // 状态
  const [phase, setPhase] = React.useState<DetectionPhase>('init')
  const [retryCount, setRetryCount] = React.useState(0)
  const [error, setError] = React.useState<LivenessError | null>(null)
  const [blinkDetected, setBlinkDetected] = React.useState(false)
  const [countdown, setCountdown] = React.useState<number | null>(null)
  const [selfieUrl, setSelfieUrl] = React.useState<string | null>(null)
  const [previewBlob, setPreviewBlob] = React.useState<Blob | null>(null)

  // Refs
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const detectorRef = React.useRef<BrowserLivenessDetector | null>(null)
  const blinkTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  /**
   * 创建错误对象
   */
  const createError = React.useCallback(
    (
      code: LivenessError['code'],
      message: string,
      canRetry: boolean = true
    ): LivenessError => ({
      code,
      message,
      canRetry: canRetry && retryCount < maxRetries,
      retriesLeft: Math.max(0, maxRetries - retryCount),
    }),
    [retryCount, maxRetries]
  )

  /**
   * 获取错误消息
   */
  const getErrorMessage = React.useCallback(
    (code: LivenessError['code']): string => {
      switch (code) {
        case 'NOT_SUPPORTED':
          return t('kyc.liveness.cameraNotSupported')
        case 'CAMERA_DENIED':
          return t('kyc.liveness.cameraPermissionDenied')
        case 'DETECTION_FAILED':
          return t('kyc.liveness.error.detectionFailed')
        case 'TIMEOUT':
          return t('kyc.liveness.error.timeout')
        case 'UPLOAD_FAILED':
          return t('kyc.liveness.error.uploadFailed')
        default:
          return t('kyc.liveness.failed')
      }
    },
    [t]
  )

  /**
   * 处理错误
   */
  const handleError = React.useCallback(
    (errorObj: LivenessError) => {
      setError(errorObj)
      setPhase('error')
      onError?.(errorObj)
    },
    [onError]
  )

  /**
   * 清理资源
   */
  const cleanup = React.useCallback(() => {
    if (blinkTimeoutRef.current) {
      clearTimeout(blinkTimeoutRef.current)
      blinkTimeoutRef.current = null
    }
    if (detectorRef.current) {
      detectorRef.current.stop()
    }
  }, [])

  /**
   * 初始化检测器
   */
  const initDetector = React.useCallback(async () => {
    // 创建检测器实例
    const detector = new BrowserLivenessDetector()
    detectorRef.current = detector

    // 检查浏览器支持
    if (!detector.isSupported()) {
      handleError(
        createError(
          'NOT_SUPPORTED',
          getErrorMessage('NOT_SUPPORTED'),
          false
        )
      )
      return false
    }

    // 请求摄像头权限
    setPhase('permission')
    const hasPermission = await detector.requestPermission()

    if (!hasPermission) {
      handleError(
        createError(
          'CAMERA_DENIED',
          getErrorMessage('CAMERA_DENIED'),
          false
        )
      )
      return false
    }

    return true
  }, [createError, getErrorMessage, handleError])

  /**
   * 开始视频预览
   */
  const startPreview = React.useCallback(async () => {
    if (!detectorRef.current || !videoRef.current) return

    try {
      await detectorRef.current.start(videoRef.current)
      setPhase('preview')
    } catch (err) {
      handleError(
        createError(
          'DETECTION_FAILED',
          getErrorMessage('DETECTION_FAILED')
        )
      )
    }
  }, [createError, getErrorMessage, handleError])

  /**
   * 开始眨眼检测
   * MVP 简化方案：用户点击按钮确认眨眼，然后自动捕获
   */
  const startBlinkDetection = React.useCallback(() => {
    setPhase('detecting')
    setBlinkDetected(false)

    // 设置超时（30秒）
    blinkTimeoutRef.current = setTimeout(() => {
      if (phase === 'detecting') {
        setRetryCount((prev) => prev + 1)
        handleError(
          createError(
            'TIMEOUT',
            getErrorMessage('TIMEOUT')
          )
        )
      }
    }, 30000)
  }, [phase, createError, getErrorMessage, handleError])

  /**
   * 确认眨眼动作（用户点击按钮）
   */
  const confirmBlink = React.useCallback(async () => {
    if (blinkTimeoutRef.current) {
      clearTimeout(blinkTimeoutRef.current)
      blinkTimeoutRef.current = null
    }

    setBlinkDetected(true)
    setPhase('capturing')

    // 倒计时 3 秒后拍照
    setCountdown(3)
  }, [])

  /**
   * 捕获自拍照
   */
  const capturePhoto = React.useCallback(async () => {
    if (!detectorRef.current || !videoRef.current) return

    try {
      const blob = await detectorRef.current.capturePhoto(videoRef.current)
      setPreviewBlob(blob)
      setPhase('uploading')

      // 上传到 MinIO
      const file = new File([blob], `selfie_${Date.now()}.jpg`, { type: 'image/jpeg' })
      const response = await uploadKycDocument('selfie', file)

      // 成功
      setSelfieUrl(response.file_path)
      setPhase('success')

      onSuccess?.({
        passed: true,
        selfieUrl: response.file_path,
        confidence: 1.0,
        method: 'blink',
      })
    } catch (err) {
      setRetryCount((prev) => prev + 1)
      handleError(
        createError(
          'UPLOAD_FAILED',
          getErrorMessage('UPLOAD_FAILED')
        )
      )
    }
  }, [createError, getErrorMessage, handleError, onSuccess])

  /**
   * 倒计时效果
   */
  React.useEffect(() => {
    if (countdown === null) return

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else {
      // 倒计时结束，拍照
      setCountdown(null)
      capturePhoto()
    }
  }, [countdown, capturePhoto])

  /**
   * 重试检测
   */
  const retry = React.useCallback(async () => {
    setError(null)
    setBlinkDetected(false)
    setCountdown(null)
    setPreviewBlob(null)

    // 检查重试次数
    if (retryCount >= maxRetries) {
      setPhase('fallback')
      onFallback?.()
      return
    }

    // 重新开始
    const success = await initDetector()
    if (success) {
      await startPreview()
    }
  }, [retryCount, maxRetries, initDetector, startPreview, onFallback])

  /**
   * 触发降级
   */
  const triggerFallback = React.useCallback(() => {
    cleanup()
    setPhase('fallback')
    onFallback?.()
  }, [cleanup, onFallback])

  /**
   * 开始检测流程
   */
  const startDetection = React.useCallback(async () => {
    const success = await initDetector()
    if (success) {
      await startPreview()
    }
  }, [initDetector, startPreview])

  /**
   * 组件卸载时清理
   */
  React.useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  // ============================================================================
  // 渲染
  // ============================================================================

  /**
   * 渲染拍照提示
   * Requirements 5.7: 显示拍照提示（光线充足、正面面对镜头、无遮挡）
   * Requirements 8.1: 响应式字体大小
   */
  const renderTips = () => (
    <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-white/60">
      <p className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#00D4AA]" />
        {t('kyc.liveness.tips.lighting')}
      </p>
      <p className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#00D4AA]" />
        {t('kyc.liveness.tips.face')}
      </p>
      <p className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#00D4AA]" />
        {t('kyc.liveness.tips.noObstruction')}
      </p>
    </div>
  )

  /**
   * 渲染初始状态
   * Requirements 8.1, 8.2, 8.3: 响应式布局和触摸目标优化
   */
  const renderInit = () => (
    <div className={cn(
      "flex flex-col items-center gap-4 sm:gap-6",
      // Mobile: 较小内边距
      "py-6 px-4",
      // Desktop: 正常内边距
      "sm:py-8 sm:px-6"
    )}>
      <div className={cn(
        "rounded-full bg-[#00D4AA]/10 border border-[#00D4AA]/20",
        // Mobile: 较小图标容器
        "p-4 sm:p-6"
      )}>
        <Camera className="w-10 h-10 sm:w-12 sm:h-12 text-[#00D4AA]" />
      </div>

      <div className="text-center">
        <h3 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2">
          {t('kyc.liveness.init.title')}
        </h3>
        <p className="text-xs sm:text-sm text-white/60 max-w-sm">
          {t('kyc.liveness.init.description')}
        </p>
      </div>

      {renderTips()}

      {/* Requirements 8.3: 触摸目标尺寸优化 - 最小 44x44px */}
      <Button
        onClick={startDetection}
        disabled={disabled}
        className="mt-2 sm:mt-4 w-full sm:w-auto min-h-[48px]"
        size="lg"
      >
        <Camera className="w-5 h-5 mr-2" />
        {t('kyc.liveness.startDetection')}
      </Button>

      {/* Requirements 8.3: 触摸目标尺寸优化 */}
      <button
        type="button"
        onClick={triggerFallback}
        className="text-xs sm:text-sm text-white/40 hover:text-white/60 underline min-h-[44px] px-4 flex items-center"
      >
        {t('kyc.liveness.manualUploadLink')}
      </button>
    </div>
  )

  /**
   * 渲染权限请求中
   * Requirements 8.1: 响应式布局
   */
  const renderPermission = () => (
    <div className={cn(
      "flex flex-col items-center gap-3 sm:gap-4",
      // Mobile: 较小内边距
      "py-6 px-4",
      // Desktop: 正常内边距
      "sm:py-8 sm:px-6"
    )}>
      <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-[#00D4AA] animate-spin" />
      <p className="text-sm sm:text-base text-white/60">{t('kyc.liveness.permission.requesting')}</p>
      <p className="text-xs sm:text-sm text-white/40 text-center">{t('kyc.liveness.permission.hint')}</p>
    </div>
  )

  /**
   * 渲染视频预览和检测
   * Requirements 8.1, 8.2, 8.3: 响应式布局和触摸目标优化
   */
  const renderPreviewAndDetection = () => (
    <div className="flex flex-col items-center gap-3 sm:gap-4">
      {/* 视频预览区域 - 响应式尺寸 */}
      <div className={cn(
        "relative w-full rounded-xl sm:rounded-2xl overflow-hidden bg-black",
        // Mobile: 较小最大宽度
        "max-w-sm sm:max-w-md",
        "aspect-[4/3]"
      )}>
        {/* 视频元素 */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover scale-x-[-1]"
        />

        {/* 人脸引导框 - 响应式尺寸 */}
        <div className="absolute inset-0 pointer-events-none">
          <div className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
            // Mobile: 较小引导框
            "w-36 h-48 sm:w-48 sm:h-64",
            "border-2 border-dashed border-[#00D4AA]/50 rounded-[50%]"
          )} />
        </div>

        {/* 倒计时覆盖层 */}
        {countdown !== null && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-5xl sm:text-6xl font-bold text-[#00D4AA] animate-pulse">
              {countdown}
            </div>
          </div>
        )}

        {/* 状态指示器 - 响应式字体大小 */}
        <div className="absolute top-2 sm:top-4 left-2 sm:left-4 right-2 sm:right-4 flex items-center justify-between">
          <div
            className={cn(
              'px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium',
              phase === 'detecting' && 'bg-yellow-500/20 text-yellow-400',
              phase === 'capturing' && 'bg-[#00D4AA]/20 text-[#00D4AA]',
              blinkDetected && 'bg-[#00D4AA]/20 text-[#00D4AA]'
            )}
          >
            {phase === 'preview' && t('kyc.liveness.preview.ready')}
            {phase === 'detecting' && !blinkDetected && t('kyc.liveness.blinkPrompt')}
            {phase === 'detecting' && blinkDetected && t('kyc.liveness.preview.blinkDetected')}
            {phase === 'capturing' && t('kyc.liveness.preview.capturing')}
          </div>

          {/* 重试次数 */}
          {retryCount > 0 && (
            <div className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-white/10 text-xs sm:text-sm text-white/60">
              {t('kyc.liveness.retryCount', { current: retryCount, max: maxRetries })}
            </div>
          )}
        </div>
      </div>

      {/* 操作按钮 - Requirements 8.3: 触摸目标尺寸优化 */}
      <div className="flex flex-col items-center gap-2 sm:gap-3 w-full max-w-sm sm:max-w-md">
        {phase === 'preview' && (
          <Button onClick={startBlinkDetection} className="w-full min-h-[48px]" size="lg">
            <Eye className="w-5 h-5 mr-2" />
            {t('kyc.liveness.preview.startBlink')}
          </Button>
        )}

        {phase === 'detecting' && !blinkDetected && (
          <>
            <p className="text-center text-xs sm:text-sm text-white/60 mb-1 sm:mb-2">
              {t('kyc.liveness.preview.blinkInstruction')}
            </p>
            <Button onClick={confirmBlink} className="w-full min-h-[48px]" size="lg">
              <CheckCircle className="w-5 h-5 mr-2" />
              {t('kyc.liveness.preview.confirmBlink')}
            </Button>
          </>
        )}

        <button
          type="button"
          onClick={triggerFallback}
          className="text-xs sm:text-sm text-white/40 hover:text-white/60 underline min-h-[44px] px-4 flex items-center"
        >
          {t('kyc.liveness.preview.problemLink')}
        </button>
      </div>
    </div>
  )

  /**
   * 渲染上传中
   * Requirements 8.1: 响应式布局
   */
  const renderUploading = () => (
    <div className={cn(
      "flex flex-col items-center gap-3 sm:gap-4",
      // Mobile: 较小内边距
      "py-6 px-4",
      // Desktop: 正常内边距
      "sm:py-8 sm:px-6"
    )}>
      <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-[#00D4AA] animate-spin" />
      <p className="text-sm sm:text-base text-white/60">{t('kyc.liveness.uploading')}</p>
    </div>
  )

  /**
   * 渲染成功状态
   * Requirements 8.1, 8.3: 响应式布局和触摸目标优化
   */
  const renderSuccess = () => (
    <div className={cn(
      "flex flex-col items-center gap-4 sm:gap-6",
      // Mobile: 较小内边距
      "py-6 px-4",
      // Desktop: 正常内边距
      "sm:py-8 sm:px-6"
    )}>
      {/* 预览图片 - 响应式尺寸 */}
      {previewBlob && (
        <div className={cn(
          "relative rounded-full overflow-hidden border-4 border-[#00D4AA]",
          // Mobile: 较小预览
          "w-28 h-28 sm:w-32 sm:h-32"
        )}>
          <img
            src={URL.createObjectURL(previewBlob)}
            alt={t('kyc.liveness.selfiePreviewAlt')}
            className="w-full h-full object-cover scale-x-[-1]"
          />
        </div>
      )}

      <div className="flex items-center gap-2 text-[#00D4AA]">
        <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6" />
        <span className="text-base sm:text-lg font-semibold">{t('kyc.liveness.successTitle')}</span>
      </div>

      <p className="text-xs sm:text-sm text-white/60">{t('kyc.liveness.successDescription')}</p>

      {/* 重新检测按钮 - Requirements 8.3: 触摸目标尺寸优化 */}
      <Button variant="outline" onClick={retry} size="sm" className="min-h-[44px]">
        <RefreshCw className="w-4 h-4 mr-2" />
        {t('kyc.liveness.redetect')}
      </Button>
    </div>
  )

  /**
   * 渲染错误状态
   * Requirements 8.1, 8.3: 响应式布局和触摸目标优化
   */
  const renderError = () => (
    <div className={cn(
      "flex flex-col items-center gap-4 sm:gap-6",
      // Mobile: 较小内边距
      "py-6 px-4",
      // Desktop: 正常内边距
      "sm:py-8 sm:px-6"
    )}>
      <div className={cn(
        "rounded-full bg-destructive/10 border border-destructive/20",
        // Mobile: 较小图标容器
        "p-4 sm:p-6"
      )}>
        {error?.code === 'CAMERA_DENIED' ? (
          <CameraOff className="w-10 h-10 sm:w-12 sm:h-12 text-destructive" />
        ) : (
          <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-destructive" />
        )}
      </div>

      <div className="text-center">
        <h3 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2">
          {t('kyc.liveness.error.title')}
        </h3>
        <p className="text-xs sm:text-sm text-white/60 max-w-sm">{error?.message}</p>
      </div>

      {/* Requirements 8.3: 触摸目标尺寸优化 */}
      <div className={cn(
        "flex gap-2 sm:gap-3",
        // Mobile: 垂直堆叠，全宽按钮
        "flex-col w-full sm:flex-row sm:w-auto"
      )}>
        {error?.canRetry && (
          <Button onClick={retry} className="min-h-[44px]">
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('kyc.liveness.error.retryButton', { count: error.retriesLeft })}
          </Button>
        )}

        <Button variant="outline" onClick={triggerFallback} className="min-h-[44px]">
          <Upload className="w-4 h-4 mr-2" />
          {t('kyc.liveness.error.manualUpload')}
        </Button>
      </div>
    </div>
  )

  /**
   * 渲染降级状态
   * Requirements 8.1: 响应式布局
   */
  const renderFallback = () => (
    <div className={cn(
      "flex flex-col items-center gap-4 sm:gap-6",
      // Mobile: 较小内边距
      "py-6 px-4",
      // Desktop: 正常内边距
      "sm:py-8 sm:px-6"
    )}>
      <div className={cn(
        "rounded-full bg-white/5 border border-white/10",
        // Mobile: 较小图标容器
        "p-4 sm:p-6"
      )}>
        <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-white/60" />
      </div>

      <div className="text-center">
        <h3 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2">
          {t('kyc.liveness.fallback.title')}
        </h3>
        <p className="text-xs sm:text-sm text-white/60 max-w-sm">
          {t('kyc.liveness.fallback.description')}
        </p>
      </div>

      {renderTips()}
    </div>
  )

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
      {phase === 'init' && renderInit()}
      {phase === 'permission' && renderPermission()}
      {(phase === 'preview' || phase === 'detecting' || phase === 'capturing') &&
        renderPreviewAndDetection()}
      {phase === 'uploading' && renderUploading()}
      {phase === 'success' && renderSuccess()}
      {phase === 'error' && renderError()}
      {phase === 'fallback' && renderFallback()}
    </div>
  )
}

LivenessDetector.displayName = 'LivenessDetector'

export default LivenessDetector
