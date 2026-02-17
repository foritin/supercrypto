/**
 * BasicInfoStep - 基本信息步骤组件
 * 
 * 向导第一步：填写资产的基本属性信息
 * 包含：资产名称、代币符号、资产类型、位置、描述
 * 
 * @validates Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 * @validates Requirements 9.1, 9.2, 9.3 (可访问性)
 */
'use client'

import { useEffect, useRef, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { ArrowRight, ArrowLeft, Loader2, Zap } from 'lucide-react'

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useConstants, constantsToSelectOptions } from '@/hooks/use-constants'
import { FALLBACK_ASSET_TYPES } from '@/lib/constants'

import { useWizard, useIsFirstStep } from '../wizard-context'
import type { StepComponentProps } from '../types'

// ============ 常量定义 ============

/**
 * 描述字段最大字符数
 */
const DESCRIPTION_MAX_LENGTH = 500

/**
 * God Mode 测试数据 - 仅开发环境使用
 */
const GOD_MODE_DATA = {
  name: 'Vanke City Garden Phase 1',
  symbol: 'VK001',
  asset_type: 'real_estate' as const,
  location: 'Shenzhen, Guangdong',
  description: 'Vanke premium residential complex with 500 units, located in Nanshan District',
}

/**
 * 是否为开发环境
 */
const IS_DEV = process.env.NODE_ENV === 'development'

// ============ 验证 Schema ============

/**
 * 创建基本信息表单验证 Schema
 * 使用函数形式以支持国际化
 * @validates Requirements 3.2, 3.3
 */
export const createBasicInfoSchema = (t: (key: string, params?: Record<string, unknown> | undefined) => string) => z.object({
  name: z
    .string()
    .min(2, t('admin.assets.wizard.validation.nameMin'))
    .max(100, t('admin.assets.wizard.validation.nameMax')),
  symbol: z
    .string()
    .min(2, t('admin.assets.wizard.validation.symbolMin'))
    .max(10, t('admin.assets.wizard.validation.symbolMax'))
    .transform((val) => val.toUpperCase()),
  asset_type: z.enum(['real_estate', 'bond', 'commodity', 'equity', 'other'], {
    message: t('admin.assets.wizard.validation.assetTypeRequired'),
  }),
  location: z.string().optional(),
  description: z
    .string()
    .max(DESCRIPTION_MAX_LENGTH, t('admin.assets.wizard.validation.descriptionMax', { max: DESCRIPTION_MAX_LENGTH }))
    .optional(),
})

export type BasicInfoFormValues = z.infer<ReturnType<typeof createBasicInfoSchema>>

// ============ 组件 ============

/**
 * 必填字段标记组件
 * @validates Requirements 3.4
 */
function RequiredMark() {
  return <span className="text-primary ml-1">*</span>
}

/**
 * BasicInfoStep 组件
 * 
 * 向导第一步，收集资产的基本信息：
 * - 资产名称 (必填, 2-100 字符)
 * - 代币符号 (必填, 2-10 字符, 自动大写)
 * - 资产类型 (必填, 下拉选择)
 * - 位置 (可选)
 * - 描述 (可选, 最多 500 字符, 显示字数统计)
 * 
 * @validates Requirements 9.1, 9.2, 9.5 (可访问性)
 */
export function BasicInfoStep({ onNext, onPrev }: StepComponentProps) {
  const { t } = useTranslation()
  const { state, updateFormData, markStepComplete } = useWizard()
  const isFirstStep = useIsFirstStep()
  
  // 从后端 API 获取资产类型常量，使用 fallback 作为备选
  const { data: assetTypes, isLoading: isLoadingAssetTypes } = useConstants('asset_type')
  
  // 将常量转换为 Select options，优先使用 API 数据，否则使用 fallback
  const assetTypeOptions = useMemo(() => {
    const items = assetTypes && assetTypes.length > 0 ? assetTypes : FALLBACK_ASSET_TYPES
    return constantsToSelectOptions(items, 'en')
  }, [assetTypes])
  
  // Ref for focus management - focus first input when step mounts
  const firstInputRef = useRef<HTMLInputElement>(null)
  
  // 创建带国际化的验证 schema
  const basicInfoSchema = useMemo(() => createBasicInfoSchema(t as unknown as (key: string, params?: Record<string, unknown> | undefined) => string), [t])

  // 初始化表单
  const form = useForm<BasicInfoFormValues>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      name: state.formData.name || '',
      symbol: state.formData.symbol || '',
      asset_type: state.formData.asset_type || 'real_estate',
      location: state.formData.location || '',
      description: state.formData.description || '',
    },
    mode: 'onChange', // 实时验证
  })

  const { watch, formState: { isValid, errors } } = form
  const descriptionValue = watch('description') || ''

  // Focus first input when step mounts (accessibility requirement 9.5)
  useEffect(() => {
    // Small delay to ensure DOM is ready after step transition
    const timer = setTimeout(() => {
      firstInputRef.current?.focus()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // 当表单数据变化时，同步到 WizardContext
  useEffect(() => {
    const subscription = form.watch((values) => {
      updateFormData(values as Partial<BasicInfoFormValues>)
    })
    return () => subscription.unsubscribe()
  }, [form, updateFormData])

  /**
   * 处理下一步
   */
  const handleNext = (values: BasicInfoFormValues) => {
    updateFormData(values)
    markStepComplete(1)
    onNext?.()
  }

  /**
   * God Mode: 自动填充测试数据
   */
  const handleGodMode = () => {
    form.reset(GOD_MODE_DATA)
    updateFormData(GOD_MODE_DATA)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleNext)} className="space-y-4 sm:space-y-5 md:space-y-6">
        {/* 第一行: 资产名称 + 代币符号 - 移动端单列，桌面端双列 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {/* 资产名称 */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="asset-name" className="flex items-center">
                  {t('admin.assets.form.name')}
                  <RequiredMark />
                </FormLabel>
                <FormControl>
                  <Input
                    id="asset-name"
                    placeholder={t('admin.assets.form.namePlaceholder')}
                    {...field}
                    ref={firstInputRef}
                    aria-describedby={errors.name ? 'asset-name-error' : undefined}
                    aria-invalid={!!errors.name}
                  />
                </FormControl>
                <FormMessage id="asset-name-error" className="text-destructive" />
              </FormItem>
            )}
          />

          {/* 代币符号 */}
          <FormField
            control={form.control}
            name="symbol"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="token-symbol" className="flex items-center">
                  {t('admin.assets.form.symbol')}
                  <RequiredMark />
                </FormLabel>
                <FormControl>
                  <Input
                    id="token-symbol"
                    placeholder="RWA001"
                    className="uppercase"
                    maxLength={10}
                    {...field}
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    aria-describedby={errors.symbol ? 'token-symbol-error' : undefined}
                    aria-invalid={!!errors.symbol}
                  />
                </FormControl>
                <FormMessage id="token-symbol-error" className="text-destructive" />
              </FormItem>
            )}
          />
        </div>

        {/* 第二行: 资产类型 + 位置 - 移动端单列，桌面端双列 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {/* 资产类型 */}
          <FormField
            control={form.control}
            name="asset_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="asset-type" className="flex items-center">
                  {t('admin.assets.form.type')}
                  <RequiredMark />
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={isLoadingAssetTypes}
                >
                  <FormControl>
                    <SelectTrigger
                      id="asset-type"
                      aria-describedby={errors.asset_type ? 'asset-type-error' : undefined}
                      aria-invalid={!!errors.asset_type}
                    >
                      {isLoadingAssetTypes ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{t('common.loading')}</span>
                        </div>
                      ) : (
                        <SelectValue placeholder={t('admin.assets.form.type')} />
                      )}
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {assetTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage id="asset-type-error" className="text-destructive" />
              </FormItem>
            )}
          />

          {/* 位置 (可选) */}
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="asset-location">{t('admin.assets.form.location')}</FormLabel>
                <FormControl>
                  <Input
                    id="asset-location"
                    placeholder={t('admin.assets.form.locationPlaceholder')}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 第三行: 描述 */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="asset-description">{t('admin.assets.form.description')}</FormLabel>
              <FormControl>
                <Textarea
                  id="asset-description"
                  placeholder={t('admin.assets.wizard.descriptionPlaceholder')}
                  className="min-h-[100px] resize-none"
                  maxLength={DESCRIPTION_MAX_LENGTH}
                  {...field}
                  aria-describedby={errors.description ? 'asset-description-error' : 'asset-description-hint'}
                  aria-invalid={!!errors.description}
                />
              </FormControl>
              <div className="flex justify-between items-center">
                <FormMessage id="asset-description-error" className="text-destructive" />
                <span
                  id="asset-description-hint"
                  className={cn(
                    'text-xs',
                    descriptionValue.length > DESCRIPTION_MAX_LENGTH * 0.9
                      ? 'text-warning'
                      : 'text-muted-foreground'
                  )}
                >
                  {descriptionValue.length}/{DESCRIPTION_MAX_LENGTH}
                </span>
              </div>
            </FormItem>
          )}
        />

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
              {t('admin.assets.wizard.buttons.nextFinancial')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}

export default BasicInfoStep
