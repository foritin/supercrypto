'use client'

/**
 * Step2DocumentUpload - KYC 向导步骤 2: 证件上传
 *
 * 收集用户的证件信息：
 * - 证件类型选择 (护照/身份证/驾驶证)
 * - 证件号码输入
 * - 证件正面上传
 * - 证件背面上传
 *
 * @validates Requirements 4.1, 4.2, 4.3
 */

import * as React from 'react'
import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { CreditCard, FileText, Car } from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { IDCardUploader } from '@/components/kyc/id-card-uploader'

import {
  step2Schema,
  type Step2FormValues,
  step2DefaultValues,
  type KycIdType,
} from '@/lib/validations/kyc-wizard'

// ============ 类型定义 ============

/**
 * Step2DocumentUpload 组件属性
 */
export interface Step2DocumentUploadProps {
  /** 当前表单数据 */
  data: Pick<Step2FormValues, 'idType' | 'idNumber' | 'documentExpiry' | 'idFrontUrl' | 'idBackUrl'>
  /** 数据变更回调 */
  onChange: (data: Partial<Step2FormValues>) => void
  /** 验证状态变更回调 */
  onValidChange: (isValid: boolean) => void
  /** 自定义类名 */
  className?: string
}

// ============ 证件类型配置 ============

/**
 * 证件类型选项配置
 */
interface IdTypeOption {
  /** 证件类型值 */
  value: KycIdType
  /** 翻译 key */
  labelKey: string
  /** 英文翻译 key */
  labelEnKey: string
  /** 图标 */
  icon: React.ReactNode
  /** 描述翻译 key */
  descriptionKey: string
}

/**
 * 证件类型选项列表
 */
const ID_TYPE_OPTIONS: IdTypeOption[] = [
  {
    value: 'passport',
    labelKey: 'kyc.idTypes.passport',
    labelEnKey: 'kyc.idTypes.passportEn',
    icon: <FileText className="w-5 h-5" />,
    descriptionKey: 'kyc.idTypes.passportDescription',
  },
  {
    value: 'id_card',
    labelKey: 'kyc.idTypes.idCard',
    labelEnKey: 'kyc.idTypes.idCardEn',
    icon: <CreditCard className="w-5 h-5" />,
    descriptionKey: 'kyc.idTypes.idCardDescription',
  },
  {
    value: 'driver_license',
    labelKey: 'kyc.idTypes.driverLicense',
    labelEnKey: 'kyc.idTypes.driverLicenseEn',
    icon: <Car className="w-5 h-5" />,
    descriptionKey: 'kyc.idTypes.driverLicenseDescription',
  },
]

/**
 * 必填字段标记组件
 */
function RequiredMark() {
  return <span className="text-primary ml-1" aria-hidden="true">*</span>
}

/**
 * Step2DocumentUpload - KYC 证件上传表单组件
 *
 * @example
 * <Step2DocumentUpload
 *   data={{ idType: 'passport', idNumber: '', idFrontUrl: '', idBackUrl: '' }}
 *   onChange={(data) => console.log('Data changed:', data)}
 *   onValidChange={(isValid) => console.log('Valid:', isValid)}
 * />
 */
export function Step2DocumentUpload({
  data,
  onChange,
  onValidChange,
  className,
}: Step2DocumentUploadProps) {
  const { t } = useTranslation()
  
  // Ref for focus management
  const firstInputRef = useRef<HTMLInputElement>(null)

  // 初始化表单
  const form = useForm<Step2FormValues>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      idType: data.idType || step2DefaultValues.idType,
      idNumber: data.idNumber || step2DefaultValues.idNumber,
      documentExpiry: data.documentExpiry || step2DefaultValues.documentExpiry,
      idFrontUrl: data.idFrontUrl || step2DefaultValues.idFrontUrl,
      idBackUrl: data.idBackUrl || step2DefaultValues.idBackUrl,
    },
    mode: 'onChange', // 实时验证
  })

  const {
    formState: { isValid, errors },
    watch,
    setValue,
  } = form

  // 监听当前选择的证件类型
  const currentIdType = watch('idType')

  // Focus first input when component mounts (accessibility)
  useEffect(() => {
    const timer = setTimeout(() => {
      firstInputRef.current?.focus()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // 当表单数据变化时，同步到父组件
  useEffect(() => {
    const subscription = watch((values) => {
      onChange(values as Partial<Step2FormValues>)
    })
    return () => subscription.unsubscribe()
  }, [watch, onChange])

  // 当验证状态变化时，通知父组件
  useEffect(() => {
    onValidChange(isValid)
  }, [isValid, onValidChange])

  // 处理证件类型选择
  const handleIdTypeChange = (value: KycIdType) => {
    setValue('idType', value, { shouldValidate: true })
    // 切换证件类型时，清空已上传的图片
    setValue('idFrontUrl', '', { shouldValidate: true })
    setValue('idBackUrl', '', { shouldValidate: true })
  }

  // 处理证件正面上传
  const handleFrontUpload = (url: string) => {
    setValue('idFrontUrl', url, { shouldValidate: true })
  }

  // 处理证件背面上传
  const handleBackUpload = (url: string) => {
    setValue('idBackUrl', url, { shouldValidate: true })
  }

  // 处理证件正面删除
  const handleFrontRemove = () => {
    setValue('idFrontUrl', '', { shouldValidate: true })
  }

  // 处理证件背面删除
  const handleBackRemove = () => {
    setValue('idBackUrl', '', { shouldValidate: true })
  }

  return (
    <Form {...form}>
      <form className={cn('space-y-5', className)}>
        {/* 证件类型选择 */}
        <FormField
          control={form.control}
          name="idType"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="flex items-center text-sm text-white/50 font-normal">
                {t('kyc.fields.idType')}
                <RequiredMark />
              </FormLabel>
              <FormControl>
                <div
                  role="radiogroup"
                  aria-label={t('kyc.fields.idType')}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mt-2"
                >
                  {ID_TYPE_OPTIONS.map((option) => {
                    const isSelected = field.value === option.value
                    return (
                      <label
                        key={option.value}
                        className={cn(
                          'relative flex items-center sm:flex-col sm:items-center',
                          'p-3 sm:p-4 rounded-xl cursor-pointer',
                          'border transition-all duration-200',
                          'hover:border-primary/30',
                          'min-h-[56px] sm:min-h-0',
                          isSelected
                            ? 'border-primary/60 bg-primary/5'
                            : 'border-white/[0.06] bg-white/[0.02]'
                        )}
                      >
                        <input
                          type="radio"
                          name="idType"
                          value={option.value}
                          checked={isSelected}
                          onChange={() => handleIdTypeChange(option.value)}
                          className="sr-only"
                          ref={option.value === 'passport' ? firstInputRef : undefined}
                          aria-describedby={`idtype-${option.value}-desc`}
                        />
                        {/* 选中指示器 */}
                        <div
                          className={cn(
                            'relative sm:absolute sm:top-2 sm:right-2',
                            'w-5 h-5 sm:w-4 sm:h-4 rounded-full border-2 transition-all',
                            'mr-3 sm:mr-0 flex-shrink-0',
                            isSelected
                              ? 'border-primary bg-primary'
                              : 'border-white/30 bg-transparent'
                          )}
                        >
                          {isSelected && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-2 h-2 sm:w-1.5 sm:h-1.5 rounded-full bg-bg-dark" />
                            </div>
                          )}
                        </div>
                        {/* 图标 */}
                        <div
                          className={cn(
                            'hidden sm:flex p-3 rounded-lg mb-2 transition-colors',
                            isSelected
                              ? 'bg-primary/20 text-primary'
                              : 'bg-white/5 text-white/60'
                          )}
                        >
                          {option.icon}
                        </div>
                        {/* 标签和描述 */}
                        <div className="flex-1 sm:text-center">
                          <span
                            className={cn(
                              'text-sm font-medium transition-colors block',
                              isSelected ? 'text-white' : 'text-white/80'
                            )}
                          >
                            {t(option.labelKey)}
                          </span>
                          <span
                            id={`idtype-${option.value}-desc`}
                            className="text-xs text-white/40 mt-0.5 block"
                          >
                            {t(option.labelEnKey)}
                          </span>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 证件号码输入 */}
        <FormField
          control={form.control}
          name="idNumber"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel htmlFor="kyc-idnumber" className="flex items-center text-sm text-white/50 font-normal">
                {t('kyc.fields.idNumber')}
                <RequiredMark />
              </FormLabel>
              <FormControl>
                <Input
                  id="kyc-idnumber"
                  placeholder={t('kyc.fields.idNumberPlaceholder')}
                  {...field}
                  aria-describedby={errors.idNumber ? 'kyc-idnumber-error' : undefined}
                  aria-invalid={!!errors.idNumber}
                  autoComplete="off"
                />
              </FormControl>
              <FormMessage id="kyc-idnumber-error" />
            </FormItem>
          )}
        />

        {/* 证件有效期输入 */}
        <FormField
          control={form.control}
          name="documentExpiry"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel htmlFor="kyc-document-expiry" className="flex items-center text-sm text-white/50 font-normal">
                {t('kyc.fields.documentExpiry')}
                <RequiredMark />
              </FormLabel>
              <FormControl>
                <Input
                  id="kyc-document-expiry"
                  type="date"
                  placeholder={t('kyc.fields.documentExpiryPlaceholder')}
                  {...field}
                  aria-describedby={errors.documentExpiry ? 'kyc-document-expiry-error' : undefined}
                  aria-invalid={!!errors.documentExpiry}
                  className="[&::-webkit-calendar-picker-indicator]:invert"
                />
              </FormControl>
              <FormMessage id="kyc-document-expiry-error" />
            </FormItem>
          )}
        />

        {/* 细微分隔线 */}
        <div className="py-2">
          <div className="h-px bg-white/[0.04]" />
        </div>

        {/* 证件照片上传区域 */}
        <div className="space-y-3">
          {/* 上传提示 */}
          <div className="p-3 rounded-lg bg-white/[0.02]">
            <p className="text-xs text-white/40">
              {t('kyc.upload.maxSize')}
            </p>
          </div>

          {/* 证件正面上传 */}
          <FormField
            control={form.control}
            name="idFrontUrl"
            render={() => (
              <FormItem>
                <FormControl>
                  <IDCardUploader
                    side="front"
                    idType={currentIdType}
                    value={watch('idFrontUrl')}
                    onUpload={handleFrontUpload}
                    onRemove={handleFrontRemove}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 证件背面上传 */}
          <FormField
            control={form.control}
            name="idBackUrl"
            render={() => (
              <FormItem>
                <FormControl>
                  <IDCardUploader
                    side="back"
                    idType={currentIdType}
                    value={watch('idBackUrl')}
                    onUpload={handleBackUpload}
                    onRemove={handleBackRemove}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </form>
    </Form>
  )
}

Step2DocumentUpload.displayName = 'Step2DocumentUpload'

export default Step2DocumentUpload
