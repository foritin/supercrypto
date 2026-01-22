/**
 * FinancialStep - 财务设置步骤组件
 * 
 * 向导第二步：设置资产的财务参数
 * 包含：总供应量、最小认购额、当前价格、3M/6M/12M APY
 * 
 * @validates Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 * @validates Requirements 9.1, 9.2, 9.3, 9.5 (可访问性)
 */
'use client'

import { useEffect, useRef, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { ArrowRight, ArrowLeft, HelpCircle, Zap } from 'lucide-react'

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

import { useWizard, useIsFirstStep } from '../WizardContext'
import type { StepComponentProps } from '../types'

// ============ 常量定义 ============

/**
 * APY 字段配置 - 使用 i18n 键
 */
const APY_FIELDS = [
  { 
    name: 'apy_3m' as const, 
    label: '3M APY', 
    tooltipKey: 'admin.assets.wizard.financial.apyTooltip3m'
  },
  { 
    name: 'apy_6m' as const, 
    label: '6M APY', 
    tooltipKey: 'admin.assets.wizard.financial.apyTooltip6m'
  },
  { 
    name: 'apy_12m' as const, 
    label: '12M APY', 
    tooltipKey: 'admin.assets.wizard.financial.apyTooltip12m'
  },
] as const

/**
 * God Mode 财务测试数据 - 仅开发环境使用
 */
const GOD_MODE_FINANCIAL_DATA = {
  total_supply: 10000000,
  min_subscription: 500,
  current_price: 1.00,
  apy_3m: 6,
  apy_6m: 8,
  apy_12m: 10,
}

/**
 * 是否为开发环境
 */
const IS_DEV = process.env.NODE_ENV === 'development'

// ============ 验证 Schema ============

/**
 * 创建财务设置表单验证 Schema
 * 使用函数形式以支持国际化
 * @validates Requirements 4.2, 4.3, 4.6
 */
export const createFinancialSchema = (t: (key: string) => string) => z.object({
  total_supply: z
    .number()
    .positive(t('admin.assets.wizard.validation.totalSupplyPositive')),
  min_subscription: z
    .number()
    .positive(t('admin.assets.wizard.validation.minSubscriptionPositive')),
  current_price: z
    .number()
    .positive(t('admin.assets.wizard.validation.pricePositive')),
  apy_3m: z
    .number()
    .min(0, t('admin.assets.wizard.validation.apyNonNegative'))
    .max(100, t('admin.assets.wizard.validation.apyMax')),
  apy_6m: z
    .number()
    .min(0, t('admin.assets.wizard.validation.apyNonNegative'))
    .max(100, t('admin.assets.wizard.validation.apyMax')),
  apy_12m: z
    .number()
    .min(0, t('admin.assets.wizard.validation.apyNonNegative'))
    .max(100, t('admin.assets.wizard.validation.apyMax')),
}).refine(data => data.min_subscription <= data.total_supply, {
  message: t('admin.assets.wizard.validation.minSubscriptionExceedsSupply'),
  path: ['min_subscription'],
})

export type FinancialFormValues = z.infer<ReturnType<typeof createFinancialSchema>>

// ============ 组件 ============

/**
 * 必填字段标记组件
 * @validates Requirements 4.5
 */
function RequiredMark() {
  return <span className="text-primary ml-1">*</span>
}

/**
 * 带前缀的数字输入框组件
 * @validates Requirements 4.4, 9.1 (可访问性)
 */
interface PrefixInputProps {
  id: string
  prefix: string
  value: number | undefined
  onChange: (value: number | undefined) => void
  placeholder?: string
  step?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
  inputRef?: React.RefObject<HTMLInputElement | null>
}

function PrefixInput({ 
  id,
  prefix, 
  value, 
  onChange, 
  placeholder,
  step = '1',
  'aria-describedby': ariaDescribedby,
  'aria-invalid': ariaInvalid,
  inputRef,
}: PrefixInputProps) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true">
        {prefix}
      </span>
      <Input
        id={id}
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="number"
        className="pl-7"
        placeholder={placeholder}
        step={step}
        value={value ?? ''}
        onChange={(e) => {
          const val = e.target.value
          onChange(val === '' ? undefined : parseFloat(val))
        }}
        aria-describedby={ariaDescribedby}
        aria-invalid={ariaInvalid}
      />
    </div>
  )
}

/**
 * 带后缀的数字输入框组件
 * @validates Requirements 4.4, 9.1 (可访问性)
 */
interface SuffixInputProps {
  id: string
  suffix: string
  value: number | undefined
  onChange: (value: number | undefined) => void
  placeholder?: string
  min?: number
  max?: number
  step?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
}

function SuffixInput({ 
  id,
  suffix, 
  value, 
  onChange, 
  placeholder,
  min,
  max,
  step = '0.1',
  'aria-describedby': ariaDescribedby,
  'aria-invalid': ariaInvalid,
}: SuffixInputProps) {
  return (
    <div className="relative">
      <Input
        id={id}
        type="number"
        className="pr-8"
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        value={value ?? ''}
        onChange={(e) => {
          const val = e.target.value
          onChange(val === '' ? undefined : parseFloat(val))
        }}
        aria-describedby={ariaDescribedby}
        aria-invalid={ariaInvalid}
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true">
        {suffix}
      </span>
    </div>
  )
}

/**
 * APY 字段标签组件 (带 Tooltip)
 * @validates Requirements 4.6
 */
interface ApyLabelProps {
  label: string
  tooltipKey: string
  t: (key: string) => string
}

function ApyLabel({ label, tooltipKey, t }: ApyLabelProps) {
  return (
    <div className="flex items-center gap-1">
      <span>{label}</span>
      <RequiredMark />
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <p>{t(tooltipKey)}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

/**
 * FinancialStep 组件
 * 
 * 向导第二步，收集资产的财务信息：
 * - 总供应量 (必填, $ 前缀, > 0)
 * - 最小认购额 (必填, $ 前缀, > 0, <= 总供应量)
 * - 当前价格 (必填, $ 前缀, > 0, step=0.01)
 * - 3M/6M/12M APY (必填, % 后缀, 0-100 范围)
 * 
 * @validates Requirements 9.5 (焦点管理)
 */
export function FinancialStep({ onNext, onPrev }: StepComponentProps) {
  const { t } = useTranslation()
  const { state, updateFormData, markStepComplete } = useWizard()
  const isFirstStep = useIsFirstStep()
  
  // Ref for focus management - focus first input when step mounts
  const firstInputRef = useRef<HTMLInputElement>(null)
  
  // 创建带国际化的验证 schema
  const financialSchema = useMemo(() => createFinancialSchema(t), [t])

  // 初始化表单
  const form = useForm<FinancialFormValues>({
    resolver: zodResolver(financialSchema),
    defaultValues: {
      total_supply: state.formData.total_supply || undefined,
      min_subscription: state.formData.min_subscription || undefined,
      current_price: state.formData.current_price || undefined,
      apy_3m: state.formData.apy_3m ?? undefined,
      apy_6m: state.formData.apy_6m ?? undefined,
      apy_12m: state.formData.apy_12m ?? undefined,
    },
    mode: 'onChange', // 实时验证
  })

  const { formState: { isValid, errors } } = form

  // Focus first input when step mounts (accessibility requirement 9.5)
  useEffect(() => {
    const timer = setTimeout(() => {
      firstInputRef.current?.focus()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // 当表单数据变化时，同步到 WizardContext
  useEffect(() => {
    const subscription = form.watch((values) => {
      updateFormData(values as Partial<FinancialFormValues>)
    })
    return () => subscription.unsubscribe()
  }, [form, updateFormData])

  /**
   * 处理下一步
   */
  const handleNext = (values: FinancialFormValues) => {
    updateFormData(values)
    markStepComplete(2)
    onNext?.()
  }

  /**
   * God Mode: 自动填充财务测试数据
   */
  const handleGodMode = () => {
    form.reset(GOD_MODE_FINANCIAL_DATA)
    updateFormData(GOD_MODE_FINANCIAL_DATA)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleNext)} className="space-y-4 sm:space-y-5 md:space-y-6">
        {/* 第一行: 总供应量 + 最小认购额 - 移动端单列，桌面端双列 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {/* 总供应量 */}
          <FormField
            control={form.control}
            name="total_supply"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="total-supply" className="flex items-center">
                  {t('admin.assets.form.totalSupply')}
                  <RequiredMark />
                </FormLabel>
                <FormControl>
                  <PrefixInput
                    id="total-supply"
                    prefix="$"
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="1,000,000"
                    inputRef={firstInputRef}
                    aria-describedby={errors.total_supply ? 'total-supply-error' : undefined}
                    aria-invalid={!!errors.total_supply}
                  />
                </FormControl>
                <FormMessage id="total-supply-error" className="text-destructive" />
              </FormItem>
            )}
          />

          {/* 最小认购额 */}
          <FormField
            control={form.control}
            name="min_subscription"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="min-subscription" className="flex items-center">
                  {t('admin.assets.form.minSubscription')}
                  <RequiredMark />
                </FormLabel>
                <FormControl>
                  <PrefixInput
                    id="min-subscription"
                    prefix="$"
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="100"
                    aria-describedby={errors.min_subscription ? 'min-subscription-error' : undefined}
                    aria-invalid={!!errors.min_subscription}
                  />
                </FormControl>
                <FormMessage id="min-subscription-error" className="text-destructive" />
              </FormItem>
            )}
          />
        </div>

        {/* 第二行: 当前价格 - 移动端单列，桌面端双列 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {/* 当前价格 */}
          <FormField
            control={form.control}
            name="current_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="current-price" className="flex items-center">
                  {t('admin.assets.form.currentPrice')}
                  <RequiredMark />
                </FormLabel>
                <FormControl>
                  <PrefixInput
                    id="current-price"
                    prefix="$"
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="1.00"
                    step="0.01"
                    aria-describedby={errors.current_price ? 'current-price-error' : undefined}
                    aria-invalid={!!errors.current_price}
                  />
                </FormControl>
                <FormMessage id="current-price-error" className="text-destructive" />
              </FormItem>
            )}
          />
        </div>

        {/* 第三行: APY 字段 - 移动端单列，桌面端三列 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {APY_FIELDS.map((apyField) => (
            <FormField
              key={apyField.name}
              control={form.control}
              name={apyField.name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor={`apy-${apyField.name}`}>
                    <ApyLabel label={apyField.label} tooltipKey={apyField.tooltipKey} t={t} />
                  </FormLabel>
                  <FormControl>
                    <SuffixInput
                      id={`apy-${apyField.name}`}
                      suffix="%"
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="10"
                      min={0}
                      max={100}
                      step="0.1"
                      aria-describedby={errors[apyField.name] ? `apy-${apyField.name}-error` : undefined}
                      aria-invalid={!!errors[apyField.name]}
                    />
                  </FormControl>
                  <FormMessage id={`apy-${apyField.name}-error`} className="text-destructive" />
                </FormItem>
              )}
            />
          ))}
        </div>

        {/* 底部按钮 - 移动端优化间距 */}
        <div className="flex justify-between pt-3 sm:pt-4">
          {/* 返回按钮 */}
          <div>
            {!isFirstStep && (
              <Button
                type="button"
                variant="ghost"
                onClick={onPrev}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('admin.assets.wizard.buttons.back')}
              </Button>
            )}
          </div>

          {/* 右侧按钮组 */}
          <div className="flex gap-2">
            {/* God Mode 自动填充按钮 - 仅开发环境 */}
            {IS_DEV && (
              <Button
                type="button"
                variant="outline"
                onClick={handleGodMode}
                className="border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10 hover:text-yellow-400"
              >
                <Zap className="w-4 h-4 mr-2" />
                God Mode
              </Button>
            )}

            {/* 下一步按钮 */}
            <Button
              type="submit"
              disabled={!isValid}
              className={cn(
                !isValid && 'opacity-50 cursor-not-allowed'
              )}
            >
              {t('admin.assets.wizard.buttons.nextMedia')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}

export default FinancialStep
