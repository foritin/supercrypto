'use client'

/**
 * ManualSelfieUpload 组件 - 手动自拍照上传组件
 *
 * 当活体检测不可用时的降级方案，允许用户手动上传自拍照
 *
 * Validates: Requirements 5.6, 8.1, 8.2, 8.3
 */

import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { FileUpload, type FileUploadError } from '@/components/ui/file-upload'
import { Camera, AlertTriangle, CheckCircle } from 'lucide-react'

// ============================================================================
// 类型定义
// ============================================================================

/**
 * ManualSelfieUpload 组件属性
 */
export interface ManualSelfieUploadProps {
  /** 上传成功回调 - 返回上传后的文件路径 */
  onUpload?: (file: File, url: string) => void
  /** 上传失败回调 */
  onError?: (error: FileUploadError) => void
  /** 删除回调 */
  onRemove?: () => void
  /** 当前文件 URL (预览) - 受控模式 */
  value?: string
  /** 禁用状态 */
  disabled?: boolean
  /** 自定义类名 */
  className?: string
}

// ============================================================================
// ManualSelfieUpload 组件
// ============================================================================

/**
 * ManualSelfieUpload - 手动自拍照上传组件
 *
 * 当活体检测不可用时显示，复用 FileUpload 组件实现自拍照上传功能。
 * 提供清晰的拍照指引，确保用户上传符合要求的自拍照。
 *
 * @example
 * // 基本用法
 * <ManualSelfieUpload
 *   onUpload={(file, url) => setSelfieUrl(url)}
 *   onError={(error) => toast.error(error.message)}
 * />
 *
 * @example
 * // 受控模式
 * <ManualSelfieUpload
 *   value={selfieUrl}
 *   onUpload={(file, url) => setSelfieUrl(url)}
 *   onRemove={() => setSelfieUrl('')}
 * />
 */
export const ManualSelfieUpload: React.FC<ManualSelfieUploadProps> = ({
  onUpload,
  onError,
  onRemove,
  value,
  disabled = false,
  className,
}) => {
  // i18n
  const { t } = useTranslation()

  // 是否已上传
  const hasUploaded = !!value

  /**
   * 渲染拍照提示
   * Requirements 5.7: 显示拍照提示（光线充足、正面面对镜头、无遮挡）
   * Requirements 8.1: 响应式字体大小
   */
  const renderTips = () => (
    <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-white/60">
      <p className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
        {t('kyc.liveness.tips.lighting')}
      </p>
      <p className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
        {t('kyc.liveness.tips.face')}
      </p>
      <p className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
        {t('kyc.liveness.tips.noObstruction')}
      </p>
    </div>
  )

  /**
   * 自定义占位内容
   * Requirements 8.1: 响应式字体大小
   */
  const renderPlaceholder = () => (
    <div className="flex flex-col items-center gap-2 sm:gap-3 text-muted-foreground">
      {/* 图标 */}
      <div className="p-2.5 sm:p-3 rounded-full bg-white/5">
        <Camera className="h-5 w-5 sm:h-6 sm:w-6" />
      </div>

      {/* 提示文字 */}
      <div className="text-center">
        <p className="text-xs sm:text-sm font-medium">{t('kyc.manualUpload.clickToUpload')}</p>
        <p className="text-[10px] sm:text-xs text-muted-foreground/70 mt-0.5 sm:mt-1">
          {t('kyc.manualUpload.formatHint')}
        </p>
      </div>
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
      {/* 标题区域 - 响应式布局 */}
      <div className="flex flex-col items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        {/* 提示图标 - 响应式尺寸 */}
        <div className={cn(
          "rounded-full bg-yellow-500/10 border border-yellow-500/20",
          // Mobile: 较小图标容器
          "p-3 sm:p-4"
        )}>
          <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500" />
        </div>

        {/* 标题和说明 - 响应式字体大小 */}
        <div className="text-center">
          <h3 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2">
            {t('kyc.manualUpload.title')}
          </h3>
          <p className="text-xs sm:text-sm text-white/60 max-w-sm">
            {t('kyc.manualUpload.description')}
          </p>
        </div>
      </div>

      {/* 拍照提示 */}
      <div className="mb-4 sm:mb-6">{renderTips()}</div>

      {/* 文件上传区域 - 响应式高度 */}
      <FileUpload
        accept="image/jpeg,image/png"
        maxSize={5 * 1024 * 1024}
        capture="user"
        documentType="selfie"
        value={value}
        onUpload={onUpload}
        onError={onError}
        onRemove={onRemove}
        disabled={disabled}
        placeholder={renderPlaceholder()}
        // Mobile: 较小高度，Desktop: 正常高度
        height="160px"
        className="mb-3 sm:mb-4 sm:h-[200px]"
      />

      {/* 上传成功提示 - 响应式字体大小 */}
      {hasUploaded && (
        <div className="flex items-center justify-center gap-2 text-primary mt-3 sm:mt-4">
          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-xs sm:text-sm font-medium">{t('kyc.manualUpload.uploaded')}</span>
        </div>
      )}
    </div>
  )
}

ManualSelfieUpload.displayName = 'ManualSelfieUpload'

export default ManualSelfieUpload
