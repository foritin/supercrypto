/**
 * MediaStep - 媒体上传步骤组件
 * 
 * 向导第三步：上传资产的媒体文件
 * 包含：封面图上传、相册上传（最多10张）
 * 此步骤为可选，用户可以跳过
 * 
 * @validates Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 * @validates Requirements 9.1, 9.2, 9.5 (可访问性)
 */
'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRight, ArrowLeft, Upload, X, AlertCircle, SkipForward, Image as ImageIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { useWizard } from '../WizardContext'
import type { StepComponentProps, UploadFileItem } from '../types'
import { MEDIA_CATEGORIES } from '../types'

// ============ 常量定义 ============

/**
 * 最大文件大小 (5MB)
 */
const MAX_FILE_SIZE = 5 * 1024 * 1024

/**
 * 最大相册图片数量
 */
const MAX_GALLERY_COUNT = 10

// ============ 工具函数 ============

/**
 * 生成唯一 ID
 */
function generateUid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ============ 子组件 ============

/**
 * 拖拽上传区域组件
 * @validates Requirements 9.1, 9.2 (可访问性)
 */
interface DropZoneProps {
  onFilesSelected: (files: File[]) => void
  accept: string
  multiple?: boolean
  disabled?: boolean
  children: React.ReactNode
  className?: string
  'aria-label'?: string
  id?: string
  autoFocus?: boolean
}

function DropZone({
  onFilesSelected,
  accept,
  multiple = false,
  disabled = false,
  children,
  className,
  'aria-label': ariaLabel,
  id,
  autoFocus = false,
}: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Auto focus support for accessibility
  useEffect(() => {
    if (autoFocus && buttonRef.current) {
      const timer = setTimeout(() => {
        buttonRef.current?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [autoFocus])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragOver(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    if (disabled) return

    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    )
    
    if (files.length > 0) {
      onFilesSelected(multiple ? files : [files[0]])
    }
  }, [disabled, multiple, onFilesSelected])

  const handleClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click()
    }
  }, [disabled])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault()
      inputRef.current?.click()
    }
  }, [disabled])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      onFilesSelected(files)
    }
    // Reset input value to allow selecting the same file again
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }, [onFilesSelected])

  return (
    <button
      ref={buttonRef}
      type="button"
      id={id}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        'relative transition-all duration-200 text-left',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        isDragOver && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && 'cursor-pointer',
        className
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
      />
      {children}
    </button>
  )
}

/**
 * 图片预览组件
 */
interface ImagePreviewProps {
  file: UploadFileItem
  onRemove: () => void
  size?: 'sm' | 'md' | 'lg'
}

function ImagePreview({ file, onRemove, size = 'md' }: ImagePreviewProps) {
  const { t } = useTranslation()
  const sizeClasses = {
    sm: 'w-20 h-20',
    md: 'w-[104px] h-[104px]',
    lg: 'w-32 h-32',
  }

  return (
    <div className={cn('relative rounded-lg overflow-hidden group', sizeClasses[size])}>
      <img
        src={file.preview || file.url}
        alt={file.name}
        className="w-full h-full object-cover"
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        className={cn(
          'absolute top-1 right-1 w-6 h-6 rounded-full',
          'bg-black/60 hover:bg-destructive',
          'flex items-center justify-center',
          'opacity-0 group-hover:opacity-100 transition-opacity'
        )}
        aria-label={t('admin.assets.wizard.media.deleteImage', { name: file.name })}
      >
        <X className="w-3 h-3 text-white" />
      </button>
      {file.status === 'error' && (
        <div className="absolute inset-0 bg-destructive/20 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-destructive" />
        </div>
      )}
    </div>
  )
}

/**
 * 上传占位符组件
 */
interface UploadPlaceholderProps {
  label: string
  sublabel?: string
  size?: 'sm' | 'md' | 'lg'
}

function UploadPlaceholder({ label, sublabel, size = 'md' }: UploadPlaceholderProps) {
  const sizeClasses = {
    sm: 'w-20 h-20',
    md: 'w-[104px] h-[104px]',
    lg: 'w-32 h-32',
  }

  return (
    <div
      className={cn(
        sizeClasses[size],
        'border-2 border-dashed border-white/20 rounded-lg',
        'flex flex-col items-center justify-center gap-2',
        'bg-white/[0.02] hover:bg-white/[0.05] hover:border-primary/50',
        'transition-all duration-200'
      )}
    >
      <Upload className="w-5 h-5 text-muted-foreground" />
      <span className="text-xs text-muted-foreground text-center px-2">{label}</span>
      {sublabel && (
        <span className="text-[10px] text-muted-foreground/60">{sublabel}</span>
      )}
    </div>
  )
}

/**
 * 错误提示组件
 */
interface ErrorMessageProps {
  message: string
  onDismiss?: () => void
}

function ErrorMessage({ message, onDismiss }: ErrorMessageProps) {
  return (
    <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
      <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
      <p className="text-xs text-destructive flex-1">{message}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-destructive hover:text-destructive/80"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

// ============ 主组件 ============

/**
 * MediaStep 组件
 * 
 * 向导第三步，上传资产的媒体文件：
 * - 封面图 (可选, 最多 1 张, 最大 5MB)
 * - 相册 (可选, 最多 10 张, 每张最大 5MB)
 * - 支持拖拽上传
 * - 支持跳过此步骤
 * 
 * @validates Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */
export function MediaStep({ onNext, onPrev, onSkip }: StepComponentProps) {
  const { t } = useTranslation()
  const { state, updateFormData, markStepComplete } = useWizard()
  
  // 本地状态
  const [coverFile, setCoverFile] = useState<UploadFileItem[]>(
    state.formData.coverFile || []
  )
  const [galleryFiles, setGalleryFiles] = useState<UploadFileItem[]>(
    state.formData.galleryFiles || []
  )
  const [error, setError] = useState<string | null>(null)

  // 同步状态到 WizardContext
  useEffect(() => {
    updateFormData({ coverFile, galleryFiles })
  }, [coverFile, galleryFiles, updateFormData])

  /**
   * 验证文件
   * @validates Requirements 5.3
   */
  const validateFile = useCallback((file: File): boolean => {
    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      setError(t('admin.assets.wizard.media.onlyImages'))
      return false
    }
    
    // 检查文件大小 (5MB 限制)
    if (file.size > MAX_FILE_SIZE) {
      setError(t('admin.assets.wizard.media.fileTooLarge', { name: file.name, size: formatFileSize(file.size) }))
      return false
    }
    
    return true
  }, [t])

  /**
   * 创建上传文件项
   */
  const createUploadFileItem = useCallback((file: File, prefix: string): UploadFileItem => {
    return {
      uid: generateUid(prefix),
      name: file.name,
      status: 'done',
      originFileObj: file,
      preview: URL.createObjectURL(file),
    }
  }, [])

  /**
   * 处理封面图选择
   * @validates Requirements 5.2, 5.4, 5.5
   */
  const handleCoverSelect = useCallback((files: File[]) => {
    setError(null)
    
    if (files.length === 0) return
    
    const file = files[0]
    if (!validateFile(file)) return
    
    // 清理旧的预览 URL
    if (coverFile[0]?.preview) {
      URL.revokeObjectURL(coverFile[0].preview)
    }
    
    const newFile = createUploadFileItem(file, 'cover')
    setCoverFile([newFile])
  }, [coverFile, validateFile, createUploadFileItem])

  /**
   * 处理相册图片选择
   * @validates Requirements 5.3, 5.4, 5.5
   */
  const handleGallerySelect = useCallback((files: File[]) => {
    setError(null)
    
    const remainingSlots = MAX_GALLERY_COUNT - galleryFiles.length
    if (remainingSlots <= 0) {
      setError(t('admin.assets.wizard.media.galleryFull', { max: MAX_GALLERY_COUNT }))
      return
    }
    
    const filesToAdd = files.slice(0, remainingSlots)
    const validFiles: UploadFileItem[] = []
    
    for (const file of filesToAdd) {
      if (validateFile(file)) {
        validFiles.push(createUploadFileItem(file, 'gallery'))
      }
    }
    
    if (validFiles.length > 0) {
      setGalleryFiles(prev => [...prev, ...validFiles])
    }
    
    if (files.length > remainingSlots) {
      setError(t('admin.assets.wizard.media.partialUpload', { count: remainingSlots, max: MAX_GALLERY_COUNT }))
    }
  }, [galleryFiles.length, validateFile, createUploadFileItem, t])

  /**
   * 移除封面图
   */
  const handleRemoveCover = useCallback(() => {
    if (coverFile[0]?.preview) {
      URL.revokeObjectURL(coverFile[0].preview)
    }
    setCoverFile([])
  }, [coverFile])

  /**
   * 移除相册图片
   */
  const handleRemoveGallery = useCallback((uid: string) => {
    setGalleryFiles(prev => {
      const file = prev.find(f => f.uid === uid)
      if (file?.preview) {
        URL.revokeObjectURL(file.preview)
      }
      return prev.filter(f => f.uid !== uid)
    })
  }, [])

  /**
   * 处理跳过
   * @validates Requirements 5.4, 5.5
   */
  const handleSkip = useCallback(() => {
    markStepComplete(3)
    onSkip?.()
  }, [markStepComplete, onSkip])

  /**
   * 处理下一步
   */
  const handleNext = useCallback(() => {
    updateFormData({ coverFile, galleryFiles })
    markStepComplete(3)
    onNext?.()
  }, [coverFile, galleryFiles, updateFormData, markStepComplete, onNext])

  /**
   * 清除错误
   */
  const handleDismissError = useCallback(() => {
    setError(null)
  }, [])

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6">
      {/* 步骤说明 */}
      <div className="flex items-center gap-2 text-muted-foreground">
        <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
        <span className="text-xs sm:text-sm">{t('admin.assets.wizard.media.title')}</span>
        <span className="px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs bg-blue-500/20 text-blue-400 rounded">
          {t('admin.assets.wizard.media.optional')}
        </span>
      </div>

      {/* 错误提示 */}
      {error && (
        <ErrorMessage message={error} onDismiss={handleDismissError} />
      )}

      {/* 上传区域 - 移动端单列，桌面端双列 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
        {/* 封面图上传 */}
        <div>
          <div className="mb-2 sm:mb-3">
            <label id="cover-upload-label" className="text-xs sm:text-sm font-medium text-white">{t('admin.assets.wizard.media.coverImage')}</label>
            <span className="text-[10px] sm:text-xs text-muted-foreground ml-1.5 sm:ml-2">{t('admin.assets.wizard.media.coverImageHint')}</span>
          </div>
          
          <DropZone
            id="cover-upload"
            onFilesSelected={handleCoverSelect}
            accept={MEDIA_CATEGORIES.cover.accept}
            disabled={coverFile.length >= 1}
            aria-label={t('admin.assets.wizard.media.dragOrClick')}
            autoFocus
          >
            {coverFile.length === 0 ? (
              <UploadPlaceholder 
                label={t('admin.assets.wizard.media.dragOrClick')} 
                sublabel={t('admin.assets.wizard.media.supportedFormats')}
              />
            ) : (
              <ImagePreview
                file={coverFile[0]}
                onRemove={handleRemoveCover}
              />
            )}
          </DropZone>
        </div>

        {/* 相册上传 */}
        <div>
          <div className="mb-2 sm:mb-3">
            <label id="gallery-upload-label" className="text-xs sm:text-sm font-medium text-white">{t('admin.assets.wizard.media.gallery')}</label>
            <span className="text-[10px] sm:text-xs text-muted-foreground ml-1.5 sm:ml-2">
              {t('admin.assets.wizard.media.galleryHint', { current: galleryFiles.length, max: MAX_GALLERY_COUNT })}
            </span>
          </div>
          
          <div className="flex flex-wrap gap-2" role="list" aria-label={t('admin.assets.wizard.media.gallery')}>
            {/* 已上传的图片 */}
            {galleryFiles.map((file) => (
              <div key={file.uid} role="listitem">
                <ImagePreview
                  file={file}
                  onRemove={() => handleRemoveGallery(file.uid)}
                />
              </div>
            ))}
            
            {/* 上传按钮 */}
            {galleryFiles.length < MAX_GALLERY_COUNT && (
              <DropZone
                id="gallery-upload"
                onFilesSelected={handleGallerySelect}
                accept={MEDIA_CATEGORIES.gallery.accept}
                multiple
                aria-label={t('admin.assets.wizard.media.addImages')}
              >
                <UploadPlaceholder 
                  label={t('admin.assets.wizard.media.addImages')} 
                  sublabel={t('admin.assets.wizard.media.remainingSlots', { count: MAX_GALLERY_COUNT - galleryFiles.length })}
                />
              </DropZone>
            )}
          </div>
        </div>
      </div>

      {/* 提示信息 */}
      <div className="flex items-start gap-2 p-2.5 sm:p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400 mt-0.5 shrink-0" />
        <p className="text-[10px] sm:text-xs text-blue-300">
          {t('admin.assets.wizard.media.canAddMoreLater')}
        </p>
      </div>

      {/* 底部按钮 - 移动端优化间距 */}
      <div className="flex justify-between pt-3 sm:pt-4">
        {/* 返回按钮 */}
        <Button
          type="button"
          variant="ghost"
          onClick={onPrev}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('admin.assets.wizard.buttons.back')}
        </Button>

        {/* 右侧按钮组 */}
        <div className="flex gap-3">
          {/* 跳过按钮 */}
          <Button
            type="button"
            variant="outline"
            onClick={handleSkip}
          >
            <SkipForward className="w-4 h-4 mr-2" />
            {t('admin.assets.wizard.buttons.skip')}
          </Button>

          {/* 下一步按钮 */}
          <Button
            type="button"
            onClick={handleNext}
          >
            {t('admin.assets.wizard.buttons.nextPreview')}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default MediaStep
