'use client'

/**
 * Step4Confirmation - KYC 向导步骤 4: 确认提交
 *
 * 显示用户已填写信息的摘要，并要求用户确认：
 * - 信息摘要展示 (基本信息、证件信息、自拍验证)
 * - 隐私政策同意复选框
 * - 信息真实确认复选框
 * - 提交按钮状态控制 (两个复选框都勾选才启用)
 *
 * @validates Requirements 6.1, 6.2, 6.3
 */

import { zodResolver } from '@hookform/resolvers/zod'
import {
  User,
  FileText,
  Camera,
  CheckCircle,
  Shield,
  AlertCircle,
} from 'lucide-react'
import * as React from 'react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { cn } from '@/lib/utils'
import {
  step4Schema,
  type Step4FormValues,
  step4DefaultValues,
  type KycWizardFormData,
  KYC_ID_TYPE_NAMES,
} from '@/lib/validations/kyc-wizard'

import { COUNTRY_LIST } from './step1-basic-info'

// ============ 类型定义 ============

/**
 * Step4Confirmation 组件属性
 */
export interface Step4ConfirmationProps {
  /** 完整的 KYC 表单数据 */
  data: KycWizardFormData
  /** 数据变更回调 */
  onChange: (data: Partial<Step4FormValues>) => void
  /** 验证状态变更回调 */
  onValidChange: (isValid: boolean) => void
  /** 自定义类名 */
  className?: string
}

// ============ 辅助函数 ============

/**
 * 根据国家代码获取国家名称
 */
function getCountryName(code: string, isZh: boolean = true): string {
  const country = COUNTRY_LIST.find((c) => c.code === code)
  if (!country) return code
  return isZh ? country.name : country.nameEn
}

/**
 * 格式化日期显示
 */
function formatDate(dateStr: string, isZh: boolean = true): string {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString(isZh ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

/**
 * 脱敏证件号码 (只显示前后各 2 位)
 */
function maskIdNumber(idNumber: string): string {
  if (!idNumber || idNumber.length <= 4) return idNumber
  const start = idNumber.slice(0, 2)
  const end = idNumber.slice(-2)
  const masked = '*'.repeat(Math.min(idNumber.length - 4, 6))
  return `${start}${masked}${end}`
}

// ============ 子组件 ============

/**
 * 信息摘要区块组件
 */
interface SummarySectionProps {
  /** 区块标题 */
  title: string
  /** 区块图标 */
  icon: React.ReactNode
  /** 子元素 */
  children: React.ReactNode
  /** 自定义类名 */
  className?: string
}

function SummarySection({ title, icon, children, className }: SummarySectionProps) {
  return (
    <div
      className={cn(
        // Mobile: 较小圆角，Desktop: 正常圆角
        'rounded-lg sm:rounded-xl border border-white/10 bg-[rgba(26,36,30,0.6)] overflow-hidden',
        className
      )}
    >
      {/* 区块标题 */}
      <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-white/10 bg-[rgba(26,36,30,0.8)]">
        <span className="text-primary">{icon}</span>
        <h3 className="text-xs sm:text-sm font-medium text-white/90">{title}</h3>
      </div>
      {/* 区块内容 */}
      <div className="p-3 sm:p-4">{children}</div>
    </div>
  )
}

/**
 * 信息项组件
 */
interface SummaryItemProps {
  /** 标签 */
  label: string
  /** 值 */
  value: string | React.ReactNode
  /** 是否为图片 */
  isImage?: boolean
}

function SummaryItem({ label, value, isImage }: SummaryItemProps) {
  return (
    <div className={cn('flex', isImage ? 'flex-col gap-1.5 sm:gap-2' : 'justify-between items-center')}>
      <span className="text-xs sm:text-sm text-white/60">{label}</span>
      {isImage ? (
        <div className="relative w-full h-20 sm:h-24 rounded-lg overflow-hidden bg-[rgba(26,36,30,0.8)] border border-white/10">
          {typeof value === 'string' && value ? (
             
            <img
              src={value}
              alt={label}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-white/40 text-xs">
              未上传
            </div>
          )}
        </div>
      ) : (
        <span className="text-xs sm:text-sm text-white font-medium text-right max-w-[60%] break-words">{value || '-'}</span>
      )}
    </div>
  )
}

/**
 * 图片预览网格组件
 */
interface ImageGridProps {
  /** 图片列表 */
  images: Array<{ label: string; url: string }>
}

function ImageGrid({ images }: ImageGridProps) {
  return (
    // Mobile: 2 列布局，Desktop: 3 列布局
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
      {images.map((img, index) => (
        <div key={index} className="space-y-1">
          <span className="text-[10px] sm:text-xs text-white/60">{img.label}</span>
          <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-[rgba(26,36,30,0.8)] border border-white/10">
            {img.url ? (
               
              <img
                src={img.url}
                alt={img.label}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-white/40 text-[10px] sm:text-xs">
                未上传
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Step4Confirmation - KYC 确认提交组件
 *
 * @example
 * <Step4Confirmation
 *   data={fullFormData}
 *   onChange={(data) => console.log('Data changed:', data)}
 *   onValidChange={(isValid) => console.log('Valid:', isValid)}
 * />
 */
export function Step4Confirmation({
  data,
  onChange,
  onValidChange,
  className,
}: Step4ConfirmationProps) {
  const { t, i18n } = useTranslation()
  const isZh = i18n.language.startsWith('zh')

  // 初始化表单 (只管理 Step4 的字段)
  const form = useForm<Step4FormValues>({
    resolver: zodResolver(step4Schema),
    defaultValues: {
      privacyAgreed: data.privacyAgreed ?? step4DefaultValues.privacyAgreed,
      infoConfirmed: data.infoConfirmed ?? step4DefaultValues.infoConfirmed,
    },
    mode: 'onChange', // 实时验证
  })

  const {
    formState: { isValid, errors },
    watch,
  } = form

  // 当表单数据变化时，同步到父组件
  useEffect(() => {
    const subscription = watch((values) => {
      onChange(values as Partial<Step4FormValues>)
    })
    return () => subscription.unsubscribe()
  }, [watch, onChange])

  // 当验证状态变化时，通知父组件
  useEffect(() => {
    onValidChange(isValid)
  }, [isValid, onValidChange])

  // 准备图片预览数据
  const documentImages = [
    { label: t('kyc.fields.idFront'), url: data.idFrontUrl },
    { label: t('kyc.fields.idBack'), url: data.idBackUrl },
    { label: t('kyc.fields.selfie'), url: data.selfieUrl },
  ]

  return (
    <div className={cn('space-y-4 sm:space-y-6', className)}>
      {/* 信息摘要标题 */}
      <div className="flex items-center gap-2 text-white/90">
        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
        <h2 className="text-base sm:text-lg font-medium">{t('kyc.confirmation.title')}</h2>
      </div>

      {/* 提示信息 */}
      <div className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg bg-primary/5 border border-primary/20">
        <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0 mt-0.5" />
        <p className="text-xs sm:text-sm text-white/70">
          {t('kyc.confirmation.hint')}
        </p>
      </div>

      {/* 基本信息摘要 */}
      <SummarySection
        title={t('kyc.confirmation.basicInfo')}
        icon={<User className="w-4 h-4" />}
        data-testid="summary-basic-info"
      >
        <div className="space-y-2 sm:space-y-3">
          <SummaryItem label={t('kyc.fields.fullName')} value={data.fullName} />
          <SummaryItem label={t('kyc.fields.dateOfBirth')} value={formatDate(data.dateOfBirth, isZh)} />
          <SummaryItem label={t('kyc.fields.nationality')} value={getCountryName(data.nationality, isZh)} />
          <SummaryItem label={t('kyc.fields.address')} value={data.address} />
        </div>
      </SummarySection>

      {/* 证件信息摘要 */}
      <SummarySection
        title={t('kyc.confirmation.documentInfo')}
        icon={<FileText className="w-4 h-4" />}
        data-testid="summary-document-info"
      >
        <div className="space-y-2 sm:space-y-3">
          <SummaryItem
            label={t('kyc.fields.idType')}
            value={KYC_ID_TYPE_NAMES[data.idType] || data.idType}
          />
          <SummaryItem label={t('kyc.fields.idNumber')} value={maskIdNumber(data.idNumber)} />
        </div>
      </SummarySection>

      {/* 照片预览摘要 */}
      <SummarySection
        title={t('kyc.confirmation.photoPreview')}
        icon={<Camera className="w-4 h-4" />}
        data-testid="summary-photos"
      >
        <ImageGrid images={documentImages} />
        {/* 活体检测状态 */}
        {data.livenessVerified !== undefined && (
          <div className="mt-2 sm:mt-3 flex items-center gap-2">
            <span className="text-xs sm:text-sm text-white/60">{t('kyc.confirmation.livenessStatus')}:</span>
            {data.livenessVerified ? (
              <span className="flex items-center gap-1 text-xs sm:text-sm text-[#52C41A]">
                <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {t('kyc.confirmation.livenessVerified')}
              </span>
            ) : (
              <span className="text-xs sm:text-sm text-white/60">{t('kyc.confirmation.manualUpload')}</span>
            )}
          </div>
        )}
      </SummarySection>

      {/* 确认复选框 */}
      <Form {...form}>
        <form className="space-y-3 sm:space-y-4">
          {/* 隐私政策复选框 - Requirements 8.3: 触摸目标尺寸优化 */}
          <FormField
            control={form.control}
            name="privacyAgreed"
            render={({ field }) => (
              <FormItem
                className={cn(
                  'flex flex-row items-start space-x-3 space-y-0 rounded-lg',
                  // Mobile: 较小内边距，Desktop: 正常内边距
                  'p-3 sm:p-4',
                  'border transition-colors',
                  field.value
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-white/10 bg-[rgba(26,36,30,0.6)]',
                  errors.privacyAgreed && 'border-destructive/50'
                )}
              >
                <FormControl>
                  {/* Requirements 8.3: 触摸目标尺寸优化 - 较大复选框 */}
                  <Checkbox
                    id="kyc-privacy-agreed"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-describedby={
                      errors.privacyAgreed ? 'kyc-privacy-error' : 'kyc-privacy-desc'
                    }
                    aria-invalid={!!errors.privacyAgreed}
                    className="w-5 h-5 sm:w-4 sm:h-4 mt-0.5"
                  />
                </FormControl>
                <div className="space-y-1 leading-none flex-1">
                  <FormLabel
                    htmlFor="kyc-privacy-agreed"
                    className="text-xs sm:text-sm font-medium text-white/90 cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline-block mr-1 sm:mr-1.5 text-primary" />
                    {t('kyc.confirmation.privacyPolicy')}
                    <a
                      href="/privacy-policy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline ml-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {t('kyc.confirmation.privacyPolicyLink')}
                    </a>
                  </FormLabel>
                  <p id="kyc-privacy-desc" className="text-[10px] sm:text-xs text-white/50">
                    {t('kyc.confirmation.privacyPolicyHint')}
                  </p>
                  <FormMessage id="kyc-privacy-error" />
                </div>
              </FormItem>
            )}
          />

          {/* 信息真实确认复选框 - Requirements 8.3: 触摸目标尺寸优化 */}
          <FormField
            control={form.control}
            name="infoConfirmed"
            render={({ field }) => (
              <FormItem
                className={cn(
                  'flex flex-row items-start space-x-3 space-y-0 rounded-lg',
                  // Mobile: 较小内边距，Desktop: 正常内边距
                  'p-3 sm:p-4',
                  'border transition-colors',
                  field.value
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-white/10 bg-[rgba(26,36,30,0.6)]',
                  errors.infoConfirmed && 'border-destructive/50'
                )}
              >
                <FormControl>
                  {/* Requirements 8.3: 触摸目标尺寸优化 - 较大复选框 */}
                  <Checkbox
                    id="kyc-info-confirmed"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-describedby={
                      errors.infoConfirmed ? 'kyc-info-error' : 'kyc-info-desc'
                    }
                    aria-invalid={!!errors.infoConfirmed}
                    className="w-5 h-5 sm:w-4 sm:h-4 mt-0.5"
                  />
                </FormControl>
                <div className="space-y-1 leading-none flex-1">
                  <FormLabel
                    htmlFor="kyc-info-confirmed"
                    className="text-xs sm:text-sm font-medium text-white/90 cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline-block mr-1 sm:mr-1.5 text-primary" />
                    {t('kyc.confirmation.infoConfirm')}
                  </FormLabel>
                  <p id="kyc-info-desc" className="text-[10px] sm:text-xs text-white/50">
                    {t('kyc.confirmation.infoConfirmHint')}
                  </p>
                  <FormMessage id="kyc-info-error" />
                </div>
              </FormItem>
            )}
          />
        </form>
      </Form>

      {/* 提交状态提示 */}
      {!isValid && (
        <div className="flex items-center gap-2 text-xs sm:text-sm text-white/50">
          <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>{t('kyc.confirmation.checkboxHint')}</span>
        </div>
      )}
    </div>
  )
}

Step4Confirmation.displayName = 'Step4Confirmation'

export default Step4Confirmation
