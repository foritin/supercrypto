'use client'

/**
 * Step1BasicInfo - KYC 向导步骤 1: 基本信息表单
 *
 * 收集用户的基本个人信息：
 * - 姓名 (必填, 2-50 字符)
 * - 出生日期 (必填, 必须年满 18 岁)
 * - 国籍 (必填, 从国家列表选择)
 * - 居住地址 (必填)
 *
 * @validates Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import * as React from 'react'
import { useEffect, useRef, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarIcon, Shield } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN, enUS } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

import {
  step1Schema,
  type Step1FormValues,
  step1DefaultValues,
  KYC_MIN_AGE,
} from '@/lib/validations/kyc-wizard'

// ============ 类型定义 ============

/**
 * Step1BasicInfo 组件属性
 */
export interface Step1BasicInfoProps {
  /** 当前表单数据 */
  data: Pick<Step1FormValues, 'fullName' | 'dateOfBirth' | 'nationality' | 'address'>
  /** 数据变更回调 */
  onChange: (data: Partial<Step1FormValues>) => void
  /** 验证状态变更回调 */
  onValidChange: (isValid: boolean) => void
  /** 自定义类名 */
  className?: string
}

// ============ 国家列表 ============

/**
 * 国家/地区列表
 * 包含常用国家和地区，带国旗 emoji 和区号
 * 中国相关地区统一使用中国国旗 🇨🇳
 */
export const COUNTRY_LIST = [
  { code: 'CN', flag: '🇨🇳', name: '中国', nameEn: 'China', dialCode: '+86' },
  { code: 'HK', flag: '🇨🇳', name: '中国香港', nameEn: 'Hong Kong', dialCode: '+852' },
  { code: 'TW', flag: '🇨🇳', name: '中国台湾', nameEn: 'Taiwan', dialCode: '+886' },
  { code: 'MO', flag: '🇨🇳', name: '中国澳门', nameEn: 'Macau', dialCode: '+853' },
  { code: 'US', flag: '🇺🇸', name: '美国', nameEn: 'United States', dialCode: '+1' },
  { code: 'GB', flag: '🇬🇧', name: '英国', nameEn: 'United Kingdom', dialCode: '+44' },
  { code: 'JP', flag: '🇯🇵', name: '日本', nameEn: 'Japan', dialCode: '+81' },
  { code: 'KR', flag: '🇰🇷', name: '韩国', nameEn: 'South Korea', dialCode: '+82' },
  { code: 'SG', flag: '🇸🇬', name: '新加坡', nameEn: 'Singapore', dialCode: '+65' },
  { code: 'AU', flag: '🇦🇺', name: '澳大利亚', nameEn: 'Australia', dialCode: '+61' },
  { code: 'CA', flag: '🇨🇦', name: '加拿大', nameEn: 'Canada', dialCode: '+1' },
  { code: 'DE', flag: '🇩🇪', name: '德国', nameEn: 'Germany', dialCode: '+49' },
  { code: 'FR', flag: '🇫🇷', name: '法国', nameEn: 'France', dialCode: '+33' },
  { code: 'IT', flag: '🇮🇹', name: '意大利', nameEn: 'Italy', dialCode: '+39' },
  { code: 'ES', flag: '🇪🇸', name: '西班牙', nameEn: 'Spain', dialCode: '+34' },
  { code: 'NL', flag: '🇳🇱', name: '荷兰', nameEn: 'Netherlands', dialCode: '+31' },
  { code: 'CH', flag: '🇨🇭', name: '瑞士', nameEn: 'Switzerland', dialCode: '+41' },
  { code: 'SE', flag: '🇸🇪', name: '瑞典', nameEn: 'Sweden', dialCode: '+46' },
  { code: 'NO', flag: '🇳🇴', name: '挪威', nameEn: 'Norway', dialCode: '+47' },
  { code: 'DK', flag: '🇩🇰', name: '丹麦', nameEn: 'Denmark', dialCode: '+45' },
  { code: 'FI', flag: '🇫🇮', name: '芬兰', nameEn: 'Finland', dialCode: '+358' },
  { code: 'NZ', flag: '🇳🇿', name: '新西兰', nameEn: 'New Zealand', dialCode: '+64' },
  { code: 'MY', flag: '🇲🇾', name: '马来西亚', nameEn: 'Malaysia', dialCode: '+60' },
  { code: 'TH', flag: '🇹🇭', name: '泰国', nameEn: 'Thailand', dialCode: '+66' },
  { code: 'VN', flag: '🇻🇳', name: '越南', nameEn: 'Vietnam', dialCode: '+84' },
  { code: 'PH', flag: '🇵🇭', name: '菲律宾', nameEn: 'Philippines', dialCode: '+63' },
  { code: 'ID', flag: '🇮🇩', name: '印度尼西亚', nameEn: 'Indonesia', dialCode: '+62' },
  { code: 'IN', flag: '🇮🇳', name: '印度', nameEn: 'India', dialCode: '+91' },
  { code: 'AE', flag: '🇦🇪', name: '阿联酋', nameEn: 'United Arab Emirates', dialCode: '+971' },
  { code: 'SA', flag: '🇸🇦', name: '沙特阿拉伯', nameEn: 'Saudi Arabia', dialCode: '+966' },
  { code: 'BR', flag: '🇧🇷', name: '巴西', nameEn: 'Brazil', dialCode: '+55' },
  { code: 'MX', flag: '🇲🇽', name: '墨西哥', nameEn: 'Mexico', dialCode: '+52' },
  { code: 'AR', flag: '🇦🇷', name: '阿根廷', nameEn: 'Argentina', dialCode: '+54' },
  { code: 'RU', flag: '🇷🇺', name: '俄罗斯', nameEn: 'Russia', dialCode: '+7' },
  { code: 'ZA', flag: '🇿🇦', name: '南非', nameEn: 'South Africa', dialCode: '+27' },
  { code: 'OTHER', flag: '🌍', name: '其他', nameEn: 'Other', dialCode: '' },
] as const

export type CountryCode = typeof COUNTRY_LIST[number]['code']

/**
 * 根据国家代码获取国家信息
 */
export function getCountryByCode(code: string) {
  return COUNTRY_LIST.find(c => c.code === code)
}

/**
 * 必填字段标记组件
 */
function RequiredMark() {
  return <span className="text-primary ml-1" aria-hidden="true">*</span>
}

/**
 * SecurityBadge - 数据安全说明徽章组件
 * 
 * 在表单顶部显示安全提示，增强用户信任感
 * @validates Requirements 2.1, 2.2, 2.3, 2.4, 2.5
 */
interface SecurityBadgeProps {
  className?: string
}

function SecurityBadge({ className }: SecurityBadgeProps) {
  const { t } = useTranslation()
  return (
    <div className={cn(
      "flex items-center gap-2 p-3 rounded-lg",
      "bg-[#00D4AA]/5 border border-[#00D4AA]/10 mb-6",
      className
    )}>
      <Shield className="w-5 h-5 text-[#00D4AA]" />
      <span className="text-sm text-white/70">
        {t('kyc.securityNote')}
      </span>
    </div>
  )
}

/**
 * 计算日期选择器的默认月份
 * 默认显示 18 年前的月份，方便用户选择
 */
function getDefaultCalendarMonth(): Date {
  const today = new Date()
  return new Date(today.getFullYear() - 25, today.getMonth(), 1)
}

/**
 * 计算最大可选日期 (16 年前的今天)
 */
function getMaxSelectableDate(): Date {
  const today = new Date()
  return new Date(today.getFullYear() - KYC_MIN_AGE, today.getMonth(), today.getDate())
}

/**
 * 计算最小可选日期 (120 年前)
 */
function getMinSelectableDate(): Date {
  const today = new Date()
  return new Date(today.getFullYear() - 120, 0, 1)
}

/**
 * Step1BasicInfo - KYC 基本信息表单组件
 *
 * @example
 * <Step1BasicInfo
 *   data={{ fullName: '', dateOfBirth: '', nationality: '', address: '' }}
 *   onChange={(data) => console.log('Data changed:', data)}
 *   onValidChange={(isValid) => console.log('Valid:', isValid)}
 * />
 */
export function Step1BasicInfo({
  data,
  onChange,
  onValidChange,
  className,
}: Step1BasicInfoProps) {
  // i18n
  const { t, i18n } = useTranslation()
  const isZh = i18n.language.startsWith('zh')
  const dateLocale = isZh ? zhCN : enUS

  // Ref for focus management - focus first input when step mounts
  const firstInputRef = useRef<HTMLInputElement>(null)

  // 日期选择器状态
  const [calendarOpen, setCalendarOpen] = React.useState(false)

  // 初始化表单
  const form = useForm<Step1FormValues>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      fullName: data.fullName || step1DefaultValues.fullName,
      dateOfBirth: data.dateOfBirth || step1DefaultValues.dateOfBirth,
      nationality: data.nationality || step1DefaultValues.nationality,
      address: data.address || step1DefaultValues.address,
    },
    mode: 'onChange', // 实时验证
  })

  const {
    formState: { isValid, errors },
    watch,
    setValue,
  } = form

  // 计算日期选择器的限制
  const maxDate = useMemo(() => getMaxSelectableDate(), [])
  const minDate = useMemo(() => getMinSelectableDate(), [])
  const defaultMonth = useMemo(() => getDefaultCalendarMonth(), [])

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
      onChange(values as Partial<Step1FormValues>)
    })
    return () => subscription.unsubscribe()
  }, [watch, onChange])

  // 当验证状态变化时，通知父组件
  useEffect(() => {
    onValidChange(isValid)
  }, [isValid, onValidChange])

  // 处理日期选择
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      // 格式化为 YYYY-MM-DD
      const formattedDate = format(date, 'yyyy-MM-dd')
      setValue('dateOfBirth', formattedDate, { shouldValidate: true })
      setCalendarOpen(false)
    }
  }

  // 解析当前日期值
  const currentDateValue = watch('dateOfBirth')
  const selectedDate = currentDateValue ? new Date(currentDateValue) : undefined

  return (
    <Form {...form}>
      <form className={cn('space-y-5', className)}>
        {/* 数据安全说明徽章 */}
        <SecurityBadge />

        {/* 姓名字段 */}
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel htmlFor="kyc-fullname" className="flex items-center text-sm text-white/50 font-normal">
                {t('kyc.fields.fullName')}
                <RequiredMark />
              </FormLabel>
              <FormControl>
                <Input
                  id="kyc-fullname"
                  placeholder={t('kyc.fields.fullNamePlaceholder')}
                  {...field}
                  ref={firstInputRef}
                  aria-describedby={errors.fullName ? 'kyc-fullname-error' : undefined}
                  aria-invalid={!!errors.fullName}
                  autoComplete="name"
                />
              </FormControl>
              <FormDescription className="text-xs text-white/40">
                {t('kyc.fields.fullNameHint')}
              </FormDescription>
              <FormMessage id="kyc-fullname-error" className="text-xs" />
            </FormItem>
          )}
        />

        {/* 出生日期字段 */}
        <FormField
          control={form.control}
          name="dateOfBirth"
          render={({ field }) => (
            <FormItem className="flex flex-col space-y-2">
              <FormLabel htmlFor="kyc-dob" className="flex items-center text-sm text-white/50 font-normal">
                {t('kyc.fields.dateOfBirth')}
                <RequiredMark />
              </FormLabel>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      id="kyc-dob"
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        'rounded-lg border bg-transparent',
                        'hover:border-white/20',
                        'focus-visible:ring-0 focus-visible:border-[#00D4AA]/50',
                        !field.value && 'text-white/40',
                        errors.dateOfBirth 
                          ? 'border-destructive hover:border-destructive' 
                          : 'border-white/[0.08]'
                      )}
                      aria-describedby={errors.dateOfBirth ? 'kyc-dob-error' : undefined}
                      aria-invalid={!!errors.dateOfBirth}
                      aria-haspopup="dialog"
                      aria-expanded={calendarOpen}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                      {field.value ? (
                        format(new Date(field.value), isZh ? 'yyyy年MM月dd日' : 'MMM dd, yyyy', { locale: dateLocale })
                      ) : (
                        <span>{t('kyc.fields.dateOfBirthPlaceholder')}</span>
                      )}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 bg-[rgba(26,36,30,0.95)] border-white/10"
                  align="start"
                >
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    defaultMonth={selectedDate || defaultMonth}
                    disabled={(date) => date > maxDate || date < minDate}
                    captionLayout="dropdown"
                    fromYear={minDate.getFullYear()}
                    toYear={maxDate.getFullYear()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormDescription className="text-xs text-white/40">
                {t('kyc.fields.dateOfBirthHint')}
              </FormDescription>
              <FormMessage id="kyc-dob-error" />
            </FormItem>
          )}
        />

        {/* 细微分隔线 */}
        <div className="py-2">
          <div className="h-px bg-white/[0.04]" />
        </div>

        {/* 国籍字段 */}
        <FormField
          control={form.control}
          name="nationality"
          render={({ field }) => {
            // 获取当前选中的国家信息用于显示
            const selectedCountry = getCountryByCode(field.value)
            
            return (
              <FormItem className="space-y-2">
                <FormLabel htmlFor="kyc-nationality" className="flex items-center text-sm text-white/50 font-normal">
                  {t('kyc.fields.nationality')}
                  <RequiredMark />
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger
                      id="kyc-nationality"
                      aria-describedby={errors.nationality ? 'kyc-nationality-error' : undefined}
                      aria-invalid={!!errors.nationality}
                    >
                      <SelectValue placeholder={t('kyc.fields.nationalityPlaceholder')}>
                        {selectedCountry && (
                          <span className="flex items-center gap-2">
                            <span className="text-base">{selectedCountry.flag}</span>
                            <span>{isZh ? selectedCountry.name : selectedCountry.nameEn}</span>
                          </span>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {COUNTRY_LIST.map((country) => (
                      <SelectItem 
                        key={country.code} 
                        value={country.code}
                        className="py-2.5"
                      >
                        <span className="flex items-center gap-3">
                          <span className="text-base flex-shrink-0">{country.flag}</span>
                          <span className="flex-1">{isZh ? country.name : country.nameEn}</span>
                          {country.dialCode && (
                            <span className="text-muted-foreground text-sm flex-shrink-0">({country.dialCode})</span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage id="kyc-nationality-error" />
              </FormItem>
            )
          }}
        />

        {/* 居住地址字段 */}
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel htmlFor="kyc-address" className="flex items-center text-sm text-white/50 font-normal">
                {t('kyc.fields.address')}
                <RequiredMark />
              </FormLabel>
              <FormControl>
                <Input
                  id="kyc-address"
                  placeholder={t('kyc.fields.addressPlaceholder')}
                  {...field}
                  aria-describedby={errors.address ? 'kyc-address-error' : undefined}
                  aria-invalid={!!errors.address}
                  autoComplete="street-address"
                />
              </FormControl>
              <FormDescription className="text-xs text-white/40">
                {t('kyc.fields.addressHint')}
              </FormDescription>
              <FormMessage id="kyc-address-error" className="text-xs" />
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
}

Step1BasicInfo.displayName = 'Step1BasicInfo'

export default Step1BasicInfo
