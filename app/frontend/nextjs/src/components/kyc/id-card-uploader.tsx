'use client'

/**
 * IDCardUploader 组件 - 证件上传专用组件
 *
 * 重新设计：
 * - 移除虚线边框与icon的重叠
 * - 使用卡片式设计
 * - 添加完整的i18n支持
 */

import { CreditCard, FileText, Car, Upload, ImageIcon } from 'lucide-react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'

import { FileUpload, type FileUploadError } from '@/components/ui/file-upload'
import { cn } from '@/lib/utils'
import type { KycDocumentType } from '@/services/kyc'

export type IdType = 'passport' | 'id_card' | 'driver_license'
export type IdSide = 'front' | 'back'

export interface IDCardUploaderProps {
  side: IdSide
  idType: IdType
  value?: string
  onUpload?: (url: string) => void
  onRemove?: () => void
  disabled?: boolean
  className?: string
}

interface IdTypeConfig {
  icon: React.ReactNode
}

const ID_TYPE_CONFIG: Record<IdType, IdTypeConfig> = {
  passport: {
    icon: <FileText className="w-5 h-5" />,
  },
  id_card: {
    icon: <CreditCard className="w-5 h-5" />,
  },
  driver_license: {
    icon: <Car className="w-5 h-5" />,
  },
}

function getDocumentType(idType: IdType, side: IdSide): KycDocumentType {
  if (idType === 'passport') return 'passport_front'
  if (idType === 'id_card') return side === 'front' ? 'id_card_front' : 'id_card_back'
  return side === 'front' ? 'drivers_license_front' : 'drivers_license_back'
}

export const IDCardUploader: React.FC<IDCardUploaderProps> = ({
  side,
  idType,
  value,
  onUpload,
  onRemove,
  disabled = false,
  className,
}) => {
  const { t } = useTranslation()
  const hintId = React.useId()
  const labelId = React.useId()

  const idTypeConfig = ID_TYPE_CONFIG[idType]
  const documentType = getDocumentType(idType, side)

  // 获取翻译键
  const getTranslationKey = (key: string) => {
    const typeMap: Record<IdType, string> = {
      passport: 'passport',
      id_card: 'idCard',
      driver_license: 'driverLicense',
    }
    return `kyc.upload.${typeMap[idType]}.${side}.${key}`
  }

  const handleUpload = React.useCallback(
    (_file: File, url: string) => {
      onUpload?.(url)
    },
    [onUpload]
  )

  const handleError = React.useCallback((error: FileUploadError) => {
    console.error('IDCardUploader error:', error)
  }, [])

  return (
    <div className={cn('relative', className)} role="group" aria-labelledby={labelId}>
      {/* 标题区域 */}
      <div id={labelId} className="flex items-center gap-2 mb-3">
        <span className="text-white/60" aria-hidden="true">
          {idTypeConfig.icon}
        </span>
        <span className="text-sm font-medium text-white">
          {t(`kyc.upload.${idType === 'passport' ? 'passport' : idType === 'id_card' ? 'idCard' : 'driverLicense'}.${side}.title`)}
        </span>
      </div>

      {/* 上传区域 - 重新设计 */}
      <div className="relative">
        <FileUpload
          documentType={documentType}
          onUpload={handleUpload}
          onError={handleError}
          disabled={disabled}
          height="180px"
          className="sm:h-[220px]"
          aria-label={t(getTranslationKey('ariaLabel'))}
          {...(onRemove ? { onRemove } : {})}
          {...(value ? { value } : {})}
          placeholder={
            <div className="flex flex-col items-center gap-3 text-muted-foreground px-4" id={hintId}>
              {/* 上传图标 */}
              <div
                className={cn(
                  'w-12 h-12 rounded-xl',
                  'bg-primary/10 border border-primary/20',
                  'flex items-center justify-center'
                )}
                aria-hidden="true"
              >
                {value ? <ImageIcon className="w-6 h-6 text-primary" /> : <Upload className="w-6 h-6 text-primary" />}
              </div>

              {/* 提示文案 */}
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-white/80">
                  {t(getTranslationKey('hint'))}
                </p>
                <p className="text-xs text-white/40">
                  {t('kyc.upload.guide.placeInFrame')}
                </p>
              </div>

              {/* 格式提示 */}
              <p className="text-xs text-white/30">
                {t('kyc.upload.guide.formats')}
              </p>
            </div>
          }
        />
      </div>

      {/* 拍摄提示 */}
      <ul className="mt-3 space-y-1" aria-label={t('kyc.upload.guide.tipsTitle')}>
        <li className="text-xs text-white/50 flex items-center gap-1.5">
          <span className="inline-block w-1 h-1 rounded-full bg-primary flex-shrink-0" aria-hidden="true" />
          {t('kyc.upload.guide.tip1')}
        </li>
        <li className="text-xs text-white/50 flex items-center gap-1.5">
          <span className="inline-block w-1 h-1 rounded-full bg-primary flex-shrink-0" aria-hidden="true" />
          {t('kyc.upload.guide.tip2')}
        </li>
        <li className="text-xs text-white/50 flex items-center gap-1.5">
          <span className="inline-block w-1 h-1 rounded-full bg-primary flex-shrink-0" aria-hidden="true" />
          {t('kyc.upload.guide.tip3')}
        </li>
      </ul>
    </div>
  )
}

IDCardUploader.displayName = 'IDCardUploader'

export default IDCardUploader
