'use client'

/**
 * IDCardUploader 组件 - 证件上传专用组件
 *
 * 复用 FileUpload 组件，添加证件边框引导 UI
 * 根据证件类型和证件面显示不同提示
 *
 * Validates: Requirements 4.1, 4.7, 8.1, 8.2, 8.3
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { FileUpload, type FileUploadError } from '@/components/ui/file-upload'
import { CreditCard, FileText, Car } from 'lucide-react'
import type { KycDocumentType } from '@/services/kyc'

/**
 * 证件类型
 */
export type IdType = 'passport' | 'id_card' | 'driver_license'

/**
 * 证件面
 */
export type IdSide = 'front' | 'back'

/**
 * IDCardUploader 组件属性
 */
export interface IDCardUploaderProps {
  /** 证件面 */
  side: IdSide
  /** 证件类型 */
  idType: IdType
  /** 当前文件 URL */
  value?: string
  /** 上传成功回调 */
  onUpload?: (url: string) => void
  /** 删除回调 */
  onRemove?: () => void
  /** 禁用状态 */
  disabled?: boolean
  /** 自定义类名 */
  className?: string
}

/**
 * 证件类型配置
 */
interface IdTypeConfig {
  /** 显示名称 */
  label: string
  /** 图标 */
  icon: React.ReactNode
  /** 正面提示 */
  frontHint: string
  /** 背面提示 */
  backHint: string
  /** 是否需要背面 */
  hasBack: boolean
}

/**
 * 证件类型配置映射
 */
const ID_TYPE_CONFIG: Record<IdType, IdTypeConfig> = {
  passport: {
    label: '护照',
    icon: <FileText className="w-5 h-5" />,
    frontHint: '请上传护照信息页',
    backHint: '请上传护照签名页（如有）',
    hasBack: false, // 护照通常只需要信息页
  },
  id_card: {
    label: '身份证',
    icon: <CreditCard className="w-5 h-5" />,
    frontHint: '请上传身份证人像面',
    backHint: '请上传身份证国徽面',
    hasBack: true,
  },
  driver_license: {
    label: '驾驶证',
    icon: <Car className="w-5 h-5" />,
    frontHint: '请上传驾驶证正面',
    backHint: '请上传驾驶证背面',
    hasBack: true,
  },
}

/**
 * 证件面配置
 */
interface SideConfig {
  /** 显示名称 */
  label: string
  /** 文档类型 (用于上传) */
  documentType: KycDocumentType
}

/**
 * 证件面配置映射
 */
const SIDE_CONFIG: Record<IdSide, SideConfig> = {
  front: {
    label: '正面',
    documentType: 'id_front',
  },
  back: {
    label: '背面',
    documentType: 'id_back',
  },
}

/**
 * IDCardUploader - 证件上传专用组件
 *
 * 支持无障碍访问：
 * - 使用 aria-label 描述上传区域用途
 * - 使用 aria-describedby 关联提示信息
 * - 确保焦点状态可见
 *
 * @example
 * // 身份证正面上传
 * <IDCardUploader
 *   side="front"
 *   idType="id_card"
 *   onUpload={(url) => setIdFrontUrl(url)}
 * />
 *
 * @example
 * // 护照上传
 * <IDCardUploader
 *   side="front"
 *   idType="passport"
 *   value={passportUrl}
 *   onUpload={(url) => setPassportUrl(url)}
 *   onRemove={() => setPassportUrl('')}
 * />
 */
export const IDCardUploader: React.FC<IDCardUploaderProps> = ({
  side,
  idType,
  value,
  onUpload,
  onRemove,
  disabled = false,
  className,
}) => {
  // 生成唯一 ID 用于无障碍关联
  const hintId = React.useId()
  const labelId = React.useId()

  const idTypeConfig = ID_TYPE_CONFIG[idType]
  const sideConfig = SIDE_CONFIG[side]

  // 获取当前证件面的提示文案
  const hint = side === 'front' ? idTypeConfig.frontHint : idTypeConfig.backHint

  // 计算无障碍标签
  const ariaLabel = `上传${idTypeConfig.label}${sideConfig.label}照片`

  // 处理上传成功
  const handleUpload = React.useCallback(
    (_file: File, url: string) => {
      onUpload?.(url)
    },
    [onUpload]
  )

  // 处理上传错误
  const handleError = React.useCallback((error: FileUploadError) => {
    console.error('IDCardUploader error:', error)
  }, [])

  return (
    <div className={cn('relative', className)} role="group" aria-labelledby={labelId}>
      {/* 标题区域 - 作为 label - 响应式字体大小 */}
      <div id={labelId} className="flex items-center gap-2 mb-2 sm:mb-3">
        <span className="text-white/60" aria-hidden="true">
          {idTypeConfig.icon}
        </span>
        <span className="text-xs sm:text-sm font-medium text-white">
          {idTypeConfig.label} - {sideConfig.label}
        </span>
      </div>

      {/* 上传区域容器 - 带证件边框引导 */}
      <div className="relative">
        {/* 证件边框引导 - 仅在无预览时显示 */}
        {!value && (
          <div
            className={cn(
              // Mobile: 较小内边距
              'absolute inset-3 sm:inset-4 pointer-events-none z-10',
              'border-2 border-dashed border-[#00D4AA]/30 rounded-lg',
              'transition-opacity duration-300'
            )}
            aria-hidden="true"
          >
            {/* 四角标记 */}
            <div className="absolute -top-1 -left-1 w-3 h-3 sm:w-4 sm:h-4 border-t-2 border-l-2 border-[#00D4AA] rounded-tl" />
            <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 border-t-2 border-r-2 border-[#00D4AA] rounded-tr" />
            <div className="absolute -bottom-1 -left-1 w-3 h-3 sm:w-4 sm:h-4 border-b-2 border-l-2 border-[#00D4AA] rounded-bl" />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 border-b-2 border-r-2 border-[#00D4AA] rounded-br" />
          </div>
        )}

        {/* FileUpload 组件 - 添加无障碍属性和响应式高度 */}
        <FileUpload
          documentType={sideConfig.documentType}
          value={value}
          onUpload={handleUpload}
          onError={handleError}
          onRemove={onRemove}
          disabled={disabled}
          // Mobile: 较小高度，Desktop: 正常高度
          height="160px"
          className="sm:h-[200px]"
          aria-label={ariaLabel}
          placeholder={
            <div className="flex flex-col items-center gap-2 sm:gap-3 text-muted-foreground px-3 sm:px-4">
              {/* 证件图标 - 响应式尺寸 */}
              <div
                className={cn(
                  // Mobile: 较小内边距
                  'p-3 sm:p-4 rounded-xl',
                  'bg-[#00D4AA]/10',
                  'border border-[#00D4AA]/20'
                )}
                aria-hidden="true"
              >
                {idTypeConfig.icon}
              </div>

              {/* 提示文案 - 响应式字体大小 */}
              <div className="text-center" id={hintId}>
                <p className="text-xs sm:text-sm font-medium text-white/80">{hint}</p>
                <p className="text-[10px] sm:text-xs text-white/40 mt-0.5 sm:mt-1">
                  将证件放置在边框内，确保信息清晰可见
                </p>
              </div>

              {/* 格式提示 - 响应式字体大小 */}
              <p className="text-[10px] sm:text-xs text-white/30">
                支持 JPG、PNG 格式，最大 5MB
              </p>
            </div>
          }
        />
      </div>

      {/* 拍摄提示 - 作为辅助说明 - 响应式字体大小 */}
      <ul className="mt-2 sm:mt-3 space-y-0.5 sm:space-y-1" aria-label="上传提示">
        <li className="text-[10px] sm:text-xs text-white/50 flex items-center gap-1">
          <span className="inline-block w-1 h-1 rounded-full bg-[#00D4AA]" aria-hidden="true" />
          确保证件在有效期内
        </li>
        <li className="text-[10px] sm:text-xs text-white/50 flex items-center gap-1">
          <span className="inline-block w-1 h-1 rounded-full bg-[#00D4AA]" aria-hidden="true" />
          避免反光、模糊或遮挡
        </li>
        <li className="text-[10px] sm:text-xs text-white/50 flex items-center gap-1">
          <span className="inline-block w-1 h-1 rounded-full bg-[#00D4AA]" aria-hidden="true" />
          所有信息需清晰可读
        </li>
      </ul>
    </div>
  )
}

IDCardUploader.displayName = 'IDCardUploader'

export default IDCardUploader
