/**
 * CreateAssetModal - Premium 风格的创建资产弹窗
 * 
 * 功能:
 * - 分组布局 (基本信息 / APY 设置 / 媒体上传 / 项目绑定)
 * - 支持媒体文件上传 (封面图、相册、估值报告、法律文件等)
 * - 实时预览将要绑定的合约
 * - 符合 Premium UI 设计风格
 * 
 * 迁移说明:
 * - 从 Ant Design Modal 迁移到 shadcn/ui Dialog
 * - 从 Ant Design Form 迁移到 react-hook-form + zod
 * - 替换所有 Ant Design 组件为 shadcn/ui 等效组件
 * 
 * @validates Requirements 8.3, 8.4
 */
'use client'

import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Plus, DollarSign, Building2, Info, Loader2 } from 'lucide-react'

import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
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
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import { notification } from '@/lib/notification'
import {
  createAssetModalSchema,
  createAssetModalDefaultValues,
  ASSET_TYPE_NAMES,
  type CreateAssetModalFormValues,
} from '@/lib/validations/asset'
import {
  assetService,
  type AssetCreateRequest,
  type AssetType,
} from '@/services/asset'

import { FormSection } from './FormSection'
import { MediaUploadSection } from './MediaUploadSection'
import { ProjectBindingSection } from './ProjectBindingSection'
import type { CreateAssetModalProps, UploadFileItem } from './types'

// 资产类型选项
const ASSET_TYPE_OPTIONS: { value: AssetType; label: string }[] = [
  { value: 'real_estate', label: ASSET_TYPE_NAMES.real_estate },
  { value: 'bond', label: ASSET_TYPE_NAMES.bond },
  { value: 'commodity', label: ASSET_TYPE_NAMES.commodity },
  { value: 'equity', label: ASSET_TYPE_NAMES.equity },
  { value: 'other', label: ASSET_TYPE_NAMES.other },
]

export function CreateAssetModal({
  open,
  onClose,
  onSuccess,
  availableProjects,
  isLoadingProjects,
}: CreateAssetModalProps) {
  const { t } = useTranslation()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // 媒体文件状态
  const [coverFile, setCoverFile] = useState<UploadFileItem[]>([])
  const [galleryFiles, setGalleryFiles] = useState<UploadFileItem[]>([])

  // Initialize react-hook-form with zod validation
  const form = useForm<CreateAssetModalFormValues>({
    resolver: zodResolver(createAssetModalSchema),
    defaultValues: createAssetModalDefaultValues,
  })

  // Watch selected projects for contract preview
  const selectedProjects = form.watch('bind_projects') || []

  // 获取选中项目的合约列表
  const selectedContracts = useMemo(() => {
    return availableProjects
      .filter((p) => selectedProjects.includes(p.project))
      .flatMap((p) => p.contracts.filter((c) => c.is_available))
  }, [availableProjects, selectedProjects])

  // 重置表单
  const handleClose = () => {
    form.reset(createAssetModalDefaultValues)
    setCoverFile([])
    setGalleryFiles([])
    onClose()
  }

  // 提交表单
  const handleSubmit = async (values: CreateAssetModalFormValues) => {
    setIsSubmitting(true)
    try {
      // 提取 bind_projects，不包含在 createData 中
      const { bind_projects, ...formValues } = values
      
      // 创建资产
      const createData: AssetCreateRequest = {
        name: formValues.name,
        symbol: formValues.symbol.toUpperCase(),
        asset_type: formValues.asset_type,
        description: formValues.description,
        location: formValues.location,
        total_supply: formValues.total_supply,
        min_subscription: formValues.min_subscription || 100,
        current_price: formValues.current_price || 1,
        apy_3m: formValues.apy_3m,
        apy_6m: formValues.apy_6m,
        apy_12m: formValues.apy_12m,
      }

      const newAsset = await assetService.createAsset(createData)
      
      // 绑定选中的项目合约
      if (bind_projects && bind_projects.length > 0) {
        for (const project of bind_projects) {
          try {
            await assetService.bindProjectContracts(
              newAsset.id, 
              project, 
              undefined, 
              project !== 'common'
            )
          } catch (bindErr) {
            console.error('Failed to bind project ' + project + ':', bindErr)
          }
        }
      }
      
      // 如果有封面图，上传
      if (coverFile.length > 0 && coverFile[0].originFileObj) {
        try {
          await assetService.uploadMedia(
            newAsset.id,
            coverFile[0].originFileObj,
            'cover',
            'Cover Image'
          )
        } catch (e) {
          console.error('Cover upload failed:', e)
        }
      }

      // 上传相册图片
      for (const file of galleryFiles) {
        if (file.originFileObj) {
          try {
            await assetService.uploadMedia(
              newAsset.id,
              file.originFileObj,
              'gallery',
              file.name
            )
          } catch (e) {
            console.error('Gallery upload failed:', e)
          }
        }
      }

      notification.success(t('admin.assets.createSuccess', '资产创建成功'))
      handleClose()
      onSuccess()
    } catch (error: unknown) {
      const errMsg = error instanceof Error 
        ? error.message 
        : t('admin.assets.createFailed', '创建失败')
      notification.error(errMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 上传前验证
  const beforeUpload = (file: File, maxSize: number = 5 * 1024 * 1024) => {
    const isValidSize = file.size <= maxSize
    if (!isValidSize) {
      notification.error(
        t('admin.assets.form.fileSizeError', { size: maxSize / 1024 / 1024 })
      )
    }
    return !isValidSize // Return true to prevent upload if invalid
  }

  // Handle projects change
  const handleProjectsChange = (projects: string[]) => {
    form.setValue('bind_projects', projects)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent 
        className="max-w-[800px] p-0 gap-0 max-h-[calc(100vh-100px)] flex flex-col"
      >
        {/* 头部 - 固定 */}
        <div 
          className="shrink-0 px-7 pt-6 pb-5 border-b border-white/[0.06] rounded-t-xl"
          style={{
            background: 
              'linear-gradient(180deg, rgba(0, 212, 170, 0.08) 0%, transparent 100%)',
          }}
        >
          <div className="flex items-center gap-3.5">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center border border-web3-success/30"
              style={{
                background: 
                  'linear-gradient(135deg, rgba(0, 212, 170, 0.2) 0%, rgba(0, 212, 170, 0.05) 100%)',
              }}
            >
              <Plus className="w-[22px] h-[22px] text-web3-success" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white m-0">
                {t('admin.assets.createTitle', 'Create New Asset')}
              </h4>
              <p className="text-[13px] text-muted-foreground m-0">
                {t('admin.assets.createSubtitle', '填写资产信息，媒体文件可在创建后管理')}
              </p>
            </div>
          </div>
        </div>

        {/* 表单内容 - 可滚动区域 */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-7 py-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-0">
              {/* 基本信息 */}
              <FormSection
                icon={<Building2 className="w-5 h-5" />}
                title={t('admin.assets.section.basicInfo', '基本信息')}
                description={t('admin.assets.section.basicInfoDesc', '资产的基本属性信息')}
              >
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t('admin.assets.form.name', 'Asset Name')}
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder={t(
                              'admin.assets.form.namePlaceholder', 
                              'e.g., Manhattan Luxury Apartment'
                            )} 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="symbol"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t('admin.assets.form.symbol', 'Token Symbol')}
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="RWA001" 
                            className="uppercase"
                            maxLength={10}
                            {...field}
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <FormField
                    control={form.control}
                    name="asset_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t('admin.assets.form.type', 'Asset Type')}
                        </FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select asset type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ASSET_TYPE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t('admin.assets.form.location', 'Location')}
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder={t(
                              'admin.assets.form.locationPlaceholder', 
                              'e.g., New York, NY'
                            )} 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>
                        {t('admin.assets.form.description', 'Description')}
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t(
                            'admin.assets.form.descriptionPlaceholder', 
                            '资产描述信息...'
                          )}
                          className="min-h-[80px] resize-none"
                          maxLength={500}
                          {...field}
                        />
                      </FormControl>
                      <div className="flex justify-end">
                        <span className="text-xs text-muted-foreground">
                          {(field.value || '').length}/500
                        </span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormSection>

              {/* 财务信息 */}
              <FormSection
                icon={<DollarSign className="w-5 h-5" />}
                title={t('admin.assets.section.financial', '财务信息')}
                description={t('admin.assets.section.financialDesc', '定价与供应量设置')}
              >
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="total_supply"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t('admin.assets.form.totalSupply', 'Total Supply')}
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              $
                            </span>
                            <Input
                              type="number"
                              className="pl-7"
                              min={0}
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="min_subscription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t('admin.assets.form.minSubscription', 'Min. Subscription')}
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              $
                            </span>
                            <Input
                              type="number"
                              className="pl-7"
                              min={0}
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="current_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t('admin.assets.form.currentPrice', 'Current Price')}
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              $
                            </span>
                            <Input
                              type="number"
                              className="pl-7"
                              min={0}
                              step={0.01}
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </FormSection>

              {/* APY 设置 */}
              <FormSection
                icon={<DollarSign className="w-5 h-5" />}
                title={t('admin.assets.section.apy', 'APY Settings')}
                description={t('admin.assets.section.apyDesc', '不同锁定期的年化收益率')}
                extra={
                  <Badge 
                    variant="default" 
                    className="bg-green-500/20 text-green-400 border-green-500/30"
                  >
                    {t('admin.assets.required', '必填')}
                  </Badge>
                }
              >
                <div className="grid grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="apy_3m"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <span>3M APY</span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {t(
                                    'admin.assets.form.apy3mTooltip', 
                                    '3个月锁定期年化收益率'
                                  )}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="number"
                              className="pr-7"
                              min={0}
                              max={100}
                              step={0.01}
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              %
                            </span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="apy_6m"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <span>6M APY</span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {t(
                                    'admin.assets.form.apy6mTooltip', 
                                    '6个月锁定期年化收益率'
                                  )}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="number"
                              className="pr-7"
                              min={0}
                              max={100}
                              step={0.01}
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              %
                            </span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="apy_12m"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <span>12M APY</span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {t(
                                    'admin.assets.form.apy12mTooltip', 
                                    '12个月锁定期年化收益率'
                                  )}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="number"
                              className="pr-7"
                              min={0}
                              max={100}
                              step={0.01}
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              %
                            </span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </FormSection>

              {/* 媒体上传 */}
              <MediaUploadSection
                coverFile={coverFile}
                galleryFiles={galleryFiles}
                onCoverChange={setCoverFile}
                onGalleryChange={setGalleryFiles}
                beforeUpload={beforeUpload}
              />

              {/* 项目绑定 */}
              <ProjectBindingSection
                availableProjects={availableProjects}
                isLoadingProjects={isLoadingProjects}
                selectedProjects={selectedProjects}
                selectedContracts={selectedContracts}
                onProjectsChange={handleProjectsChange}
              />
            </form>
          </Form>
        </div>

        {/* 底部按钮 - 固定 */}
        <div className="shrink-0 px-7 py-4 border-t border-white/[0.06] flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose} type="button">
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button 
            onClick={form.handleSubmit(handleSubmit)} 
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t('admin.assets.createButton', 'Create Asset')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
