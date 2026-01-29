'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Upload, X, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react'
import { uploadKycDocument, type KycDocumentType } from '@/services/kyc'

/**
 * 文件上传错误类型
 */
export interface FileUploadError {
  code: 'FILE_TOO_LARGE' | 'INVALID_TYPE' | 'UPLOAD_FAILED'
  message: string
}

/**
 * FileUpload 组件属性
 *
 * Validates: Requirements 4.4, 4.5, 4.6, 4.7, 4.8, 5.2, 9.1, 9.2
 */
export interface FileUploadProps {
  /** 接受的文件类型 (MIME types) */
  accept?: string
  /** 最大文件大小 (字节) */
  maxSize?: number
  /** 是否支持多文件 */
  multiple?: boolean
  /** 是否启用相机捕获 (移动端) */
  capture?: 'user' | 'environment'
  /** 上传成功回调 - 返回文件和上传后的 URL */
  onUpload?: (file: File, url: string) => void
  /** 上传失败回调 */
  onError?: (error: FileUploadError) => void
  /** 删除回调 */
  onRemove?: () => void
  /** 当前文件 URL (预览) - 受控模式 */
  value?: string
  /** 禁用状态 */
  disabled?: boolean
  /** 自定义占位内容 */
  placeholder?: React.ReactNode
  /** KYC 文档类型 - 如果提供，将使用 KYC 上传服务 */
  documentType?: KycDocumentType
  /** 自定义类名 */
  className?: string
  /** 上传区域高度 */
  height?: string | number
  /** 无障碍标签 - 用于描述上传区域的用途 */
  'aria-label'?: string
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG = {
  accept: 'image/jpeg,image/png',
  maxSize: 5 * 1024 * 1024, // 5MB
  multiple: false,
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * 验证文件类型
 */
export function validateFileType(file: File, accept: string): boolean {
  if (!accept) return true

  const acceptedTypes = accept.split(',').map((type) => type.trim().toLowerCase())

  // 检查 MIME 类型
  const fileMimeType = file.type.toLowerCase()
  if (acceptedTypes.includes(fileMimeType)) return true

  // 检查扩展名 (如 .jpg, .png)
  const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`
  if (acceptedTypes.includes(fileExtension)) return true

  // 检查通配符 (如 image/*)
  const mimeCategory = fileMimeType.split('/')[0]
  if (acceptedTypes.includes(`${mimeCategory}/*`)) return true

  return false
}

/**
 * 验证文件大小
 */
export function validateFileSize(file: File, maxSize: number): boolean {
  return file.size <= maxSize
}

/**
 * FileUpload 组件
 *
 * 通用文件上传组件，支持拖拽和点击上传，集成 KYC 文件上传服务。
 * 支持无障碍访问：aria-label, aria-describedby, aria-invalid 等属性。
 *
 * @example
 * // 基础用法
 * <FileUpload onUpload={(file, url) => console.log(url)} />
 *
 * @example
 * // KYC 证件上传
 * <FileUpload
 *   documentType="id_front"
 *   onUpload={(file, url) => setIdFrontUrl(url)}
 *   onError={(error) => toast.error(error.message)}
 * />
 *
 * @example
 * // 移动端相机拍照
 * <FileUpload
 *   capture="environment"
 *   documentType="selfie"
 *   onUpload={(file, url) => setSelfieUrl(url)}
 * />
 */
const FileUpload = React.forwardRef<HTMLDivElement, FileUploadProps>(
  (
    {
      accept = DEFAULT_CONFIG.accept,
      maxSize = DEFAULT_CONFIG.maxSize,
      multiple = DEFAULT_CONFIG.multiple,
      capture,
      onUpload,
      onError,
      onRemove,
      value,
      disabled = false,
      placeholder,
      documentType,
      className,
      height = 160,
      'aria-label': ariaLabel,
    },
    ref
  ) => {
    // 生成唯一 ID 用于无障碍关联
    const errorId = React.useId()

    // 内部状态
    const [isDragging, setIsDragging] = React.useState(false)
    const [isUploading, setIsUploading] = React.useState(false)
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
    const [error, setError] = React.useState<FileUploadError | null>(null)

    // 文件输入引用
    const inputRef = React.useRef<HTMLInputElement>(null)

    // 使用受控值或内部预览
    const displayUrl = value || previewUrl

    /**
     * 计算动态 aria-label
     */
    const computedAriaLabel = React.useMemo(() => {
      if (ariaLabel) return ariaLabel
      if (displayUrl) return '已上传文件，点击更换或按 Delete 删除'
      if (isUploading) return '正在上传文件'
      return '点击或拖拽上传文件'
    }, [ariaLabel, displayUrl, isUploading])

    /**
     * 处理文件验证
     */
    const validateFile = React.useCallback(
      (file: File): FileUploadError | null => {
        // 验证文件类型
        if (!validateFileType(file, accept)) {
          return {
            code: 'INVALID_TYPE',
            message: `仅支持 ${accept.replace(/image\//g, '').toUpperCase()} 格式`,
          }
        }

        // 验证文件大小
        if (!validateFileSize(file, maxSize)) {
          return {
            code: 'FILE_TOO_LARGE',
            message: `文件大小不能超过 ${formatFileSize(maxSize)}`,
          }
        }

        return null
      },
      [accept, maxSize]
    )

    /**
     * 处理文件上传
     */
    const handleFileUpload = React.useCallback(
      async (file: File) => {
        // 清除之前的错误
        setError(null)

        // 验证文件
        const validationError = validateFile(file)
        if (validationError) {
          setError(validationError)
          onError?.(validationError)
          return
        }

        // 创建本地预览 URL
        const localPreviewUrl = URL.createObjectURL(file)
        setPreviewUrl(localPreviewUrl)

        // 如果提供了 documentType，使用 KYC 上传服务
        if (documentType) {
          setIsUploading(true)
          try {
            const response = await uploadKycDocument(documentType, file)
            // 上传成功，使用返回的文件路径
            // 注意：后端返回的是 file_path，前端可以用本地预览 URL 显示
            onUpload?.(file, response.file_path)
          } catch (err) {
            // 上传失败
            const uploadError: FileUploadError = {
              code: 'UPLOAD_FAILED',
              message: err instanceof Error ? err.message : '文件上传失败，请重试',
            }
            setError(uploadError)
            onError?.(uploadError)
            // 清除预览
            setPreviewUrl(null)
            URL.revokeObjectURL(localPreviewUrl)
          } finally {
            setIsUploading(false)
          }
        } else {
          // 没有 documentType，直接返回本地预览 URL
          onUpload?.(file, localPreviewUrl)
        }
      },
      [documentType, validateFile, onUpload, onError]
    )

    /**
     * 处理文件选择
     */
    const handleFileChange = React.useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files
        if (files && files.length > 0) {
          handleFileUpload(files[0])
        }
        // 重置 input 以允许重复选择同一文件
        event.target.value = ''
      },
      [handleFileUpload]
    )

    /**
     * 处理拖拽进入
     */
    const handleDragEnter = React.useCallback(
      (event: React.DragEvent) => {
        event.preventDefault()
        event.stopPropagation()
        if (!disabled && !isUploading) {
          setIsDragging(true)
        }
      },
      [disabled, isUploading]
    )

    /**
     * 处理拖拽离开
     */
    const handleDragLeave = React.useCallback((event: React.DragEvent) => {
      event.preventDefault()
      event.stopPropagation()
      setIsDragging(false)
    }, [])

    /**
     * 处理拖拽悬停
     */
    const handleDragOver = React.useCallback((event: React.DragEvent) => {
      event.preventDefault()
      event.stopPropagation()
    }, [])

    /**
     * 处理文件放置
     */
    const handleDrop = React.useCallback(
      (event: React.DragEvent) => {
        event.preventDefault()
        event.stopPropagation()
        setIsDragging(false)

        if (disabled || isUploading) return

        const files = event.dataTransfer.files
        if (files && files.length > 0) {
          handleFileUpload(files[0])
        }
      },
      [disabled, isUploading, handleFileUpload]
    )

    /**
     * 处理点击上传区域
     */
    const handleClick = React.useCallback(() => {
      if (!disabled && !isUploading && inputRef.current) {
        inputRef.current.click()
      }
    }, [disabled, isUploading])

    /**
     * 处理删除文件
     */
    const handleRemove = React.useCallback(
      (event: React.MouseEvent) => {
        event.stopPropagation()

        // 清除预览
        if (previewUrl && !value) {
          URL.revokeObjectURL(previewUrl)
        }
        setPreviewUrl(null)
        setError(null)

        onRemove?.()
      },
      [previewUrl, value, onRemove]
    )

    /**
     * 处理键盘事件 (无障碍)
     */
    const handleKeyDown = React.useCallback(
      (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          handleClick()
        }
      },
      [handleClick]
    )

    // 清理预览 URL
    React.useEffect(() => {
      return () => {
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl)
        }
      }
    }, [previewUrl])

    return (
      <div
        ref={ref}
        className={cn(
          // 基础样式
          'relative rounded-xl border-2 border-dashed transition-all duration-300',
          // 背景
          'bg-[rgba(26,36,30,0.6)]',
          // 默认边框
          'border-white/20',
          // 拖拽状态
          isDragging && 'border-primary bg-primary/10',
          // 错误状态
          error && 'border-destructive/50 bg-destructive/5',
          // 禁用状态
          disabled && 'opacity-50 cursor-not-allowed',
          // 可点击状态
          !disabled && !isUploading && 'cursor-pointer hover:border-primary/50 hover:bg-white/5',
          // 有预览时的样式
          displayUrl && 'border-solid border-white/10',
          // 焦点状态 - 确保焦点可见 (Requirements 9.3)
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          className
        )}
        style={{ height: typeof height === 'number' ? `${height}px` : height }}
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={computedAriaLabel}
        aria-disabled={disabled}
        aria-describedby={error ? `file-upload-error-${errorId}` : undefined}
        aria-invalid={!!error}
        aria-busy={isUploading}
      >
        {/* 隐藏的文件输入 */}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          capture={capture}
          onChange={handleFileChange}
          disabled={disabled || isUploading}
          className="hidden"
          aria-hidden="true"
        />

        {/* 内容区域 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
          {/* 上传中状态 */}
          {isUploading && (
            <div className="flex flex-col items-center gap-2 text-muted-foreground" role="status" aria-live="polite">
              <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
              <span className="text-sm">上传中...</span>
            </div>
          )}

          {/* 预览状态 */}
          {!isUploading && displayUrl && (
            <div className="relative w-full h-full">
              {/* 图片预览 */}
              <img
                src={displayUrl}
                alt="已上传文件预览"
                className="w-full h-full object-contain rounded-lg"
              />

              {/* 删除按钮 */}
              {!disabled && (
                <button
                  type="button"
                  onClick={handleRemove}
                  className={cn(
                    'absolute top-2 right-2 p-1.5 rounded-full',
                    'bg-black/60 hover:bg-black/80',
                    'text-white transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
                  )}
                  aria-label="删除已上传的文件"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          )}

          {/* 默认占位状态 */}
          {!isUploading && !displayUrl && (
            <>
              {placeholder || (
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  {/* 图标 */}
                  <div
                    className={cn(
                      'p-3 rounded-full',
                      'bg-white/5',
                      isDragging && 'bg-primary/20'
                    )}
                    aria-hidden="true"
                  >
                    {isDragging ? (
                      <ImageIcon className="h-6 w-6 text-primary" />
                    ) : (
                      <Upload className="h-6 w-6" />
                    )}
                  </div>

                  {/* 提示文字 */}
                  <div className="text-center">
                    <p className="text-sm font-medium">
                      {isDragging ? '释放以上传文件' : '拖拽文件到此处或点击上传'}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      支持 JPG、PNG 格式，最大 {formatFileSize(maxSize)}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* 错误提示 - 使用 aria-describedby 关联 (Requirements 9.2) */}
          {error && !isUploading && (
            <div className="absolute bottom-2 left-2 right-2">
              <div
                id={`file-upload-error-${errorId}`}
                role="alert"
                aria-live="polite"
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-sm"
              >
                <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span>{error.message}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }
)

FileUpload.displayName = 'FileUpload'

export { FileUpload }
