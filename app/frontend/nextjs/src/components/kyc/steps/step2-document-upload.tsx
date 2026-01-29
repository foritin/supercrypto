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
  KYC_ID_TYPE_NAMES,
} from '@/lib/validations/kyc-wizard'

// ============ 类型定义 ============

/**
 * Step2DocumentUpload 组件属性
 */
export interface Step2DocumentUploadProps {
  /** 当前表单数据 */
  data: Pick<Step2FormValues, 'idType' | 'idNumber' | 'idFrontUrl' | 'idBackUrl'>
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
  /** 显示名称 */
  label: string
  /** 英文名称 */
  labelEn: string
  /** 图标 */
  icon: React.ReactNode
  /** 描述 */
  description: string
}

/**
 * 证件类型选项列表
 */
const ID_TYPE_OPTIONS: IdTypeOption[] = [
  {
    value: 'passport',
    label: KYC_ID_TYPE_NAMES.passport,
    labelEn: 'Passport',
    icon: <FileText className="w-5 h-5" />,
    description: '国际通用证件',
  },
  {
    value: 'id_card',
    label: KYC_ID_TYPE_NAMES.id_card,
    labelEn: 'ID Card',
    icon: <CreditCard className="w-5 h-5" />,
    description: '居民身份证',
  },
  {
    value: 'driver_license',
    label: KYC_ID_TYPE_NAMES.driver_license,
    labelEn: 'Driver License',
    icon: <Car className="w-5 h-5" />,
    description: '机动车驾驶证',
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
  // Ref for focus management
  const firstInputRef = useRef<HTMLInputElement>(null)

  // 初始化表单
  const form = useForm<Step2FormValues>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      idType: data.idType || step2DefaultValues.idType,
      idNumber: data.idNumber || step2DefaultValues.idNumber,
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
      {/* Requirements 8.1: 移动端单列布局 */}
      <form className={cn('space-y-5 sm:space-y-6', className)}>
        {/* 证件类型选择 */}
        <FormField
          control={form.control}
          name="idType"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center text-sm sm:text-base text-white/90">
                证件类型
                <RequiredMark />
              </FormLabel>
              <FormControl>
                <div
                  role="radiogroup"
                  aria-label="选择证件类型"
                  // Mobile: 单列布局，Desktop: 三列布局
                  className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mt-2"
                >
                  {ID_TYPE_OPTIONS.map((option) => {
                    const isSelected = field.value === option.value
                    return (
                      <label
                        key={option.value}
                        className={cn(
                          // Requirements 8.3: 触摸目标尺寸优化 - 最小高度 44px
                          'relative flex items-center sm:flex-col sm:items-center',
                          'p-3 sm:p-4 rounded-xl cursor-pointer',
                          'border transition-all duration-200',
                          'hover:border-[#00D4AA]/50',
                          // Mobile: 水平布局，Desktop: 垂直布局
                          'min-h-[56px] sm:min-h-0',
                          isSelected
                            ? 'border-[#00D4AA] bg-[#00D4AA]/10 shadow-[0_0_20px_rgba(0,212,170,0.15)]'
                            : 'border-white/10 bg-[rgba(26,36,30,0.6)]'
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
                        {/* 选中指示器 - Mobile: 左侧，Desktop: 右上角 */}
                        <div
                          className={cn(
                            // Mobile: 左侧位置
                            'relative sm:absolute sm:top-2 sm:right-2',
                            'w-5 h-5 sm:w-4 sm:h-4 rounded-full border-2 transition-all',
                            'mr-3 sm:mr-0 flex-shrink-0',
                            isSelected
                              ? 'border-[#00D4AA] bg-[#00D4AA]'
                              : 'border-white/30 bg-transparent'
                          )}
                        >
                          {isSelected && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-2 h-2 sm:w-1.5 sm:h-1.5 rounded-full bg-[#0a0f0d]" />
                            </div>
                          )}
                        </div>
                        {/* 图标 - Mobile: 隐藏，Desktop: 显示 */}
                        <div
                          className={cn(
                            'hidden sm:flex p-3 rounded-lg mb-2 transition-colors',
                            isSelected
                              ? 'bg-[#00D4AA]/20 text-[#00D4AA]'
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
                            {option.label}
                          </span>
                          {/* 英文名称 */}
                          <span
                            id={`idtype-${option.value}-desc`}
                            className="text-xs text-white/40 mt-0.5 block"
                          >
                            {option.labelEn}
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
            <FormItem>
              <FormLabel htmlFor="kyc-idnumber" className="flex items-center text-sm sm:text-base text-white/90">
                证件号码
                <RequiredMark />
              </FormLabel>
              <FormControl>
                {/* Requirements 8.3: 触摸目标尺寸优化 - 最小高度 44px */}
                <Input
                  id="kyc-idnumber"
                  placeholder="请输入您的证件号码"
                  {...field}
                  aria-describedby={errors.idNumber ? 'kyc-idnumber-error' : undefined}
                  aria-invalid={!!errors.idNumber}
                  autoComplete="off"
                  className="min-h-[44px]"
                />
              </FormControl>
              <FormMessage id="kyc-idnumber-error" />
            </FormItem>
          )}
        />

        {/* 证件照片上传区域 */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center text-sm sm:text-base text-white/90 font-medium">
            证件照片
            <RequiredMark />
          </div>

          {/* 上传提示 */}
          <div className="p-2.5 sm:p-3 rounded-lg bg-[#00D4AA]/5 border border-[#00D4AA]/20">
            <p className="text-xs text-white/60">
              请上传清晰的证件照片，确保所有信息可读。支持 JPG、PNG 格式，单个文件最大 5MB。
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
