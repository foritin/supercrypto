/**
 * CreateAssetWizard - 创建资产向导主组件
 * 
 * 多步骤向导组件，将创建资产流程拆分为 4 个步骤：
 * 1. 基本信息 - 资产名称、符号、类型等
 * 2. 财务设置 - 供应量、价格、APY 等
 * 3. 媒体上传 - 封面图、相册（可选）
 * 4. 预览确认 - 资产卡片预览 + 合约绑定
 * 
 * @validates Requirements 1, 7, 8
 */
'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, X } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { notification } from '@/lib/notification'

import {
  assetService,
  type AssetCreateRequest,
  type ProjectContractInfo,
} from '@/services/asset'

import { WizardProvider, useWizard } from './wizard-context'
import { StepIndicator } from './step-indicator'
import { BasicInfoStep } from './steps/basic-info-step'
import { FinancialStep } from './steps/financial-step'
import { MediaStep } from './steps/media-step'
import { PreviewStep } from './steps/preview-step'
import { WIZARD_STEPS, type CreateAssetWizardProps } from './types'

// ============ 内部组件 ============

/**
 * WizardContent - 向导内容组件
 * 
 * 使用 WizardContext 管理状态，渲染当前步骤内容
 */
interface WizardContentProps {
  onClose: () => void
  onSuccess: () => void
  availableProjects: ProjectContractInfo[]
  isLoadingProjects: boolean
}

function WizardContent({
  onClose,
  onSuccess,
  availableProjects,
  isLoadingProjects,
}: WizardContentProps) {
  const { t } = useTranslation()
  const { state, nextStep, prevStep, goToStep, reset, setSubmitting } = useWizard()
  const { currentStep, completedSteps, formData, isSubmitting } = state

  /**
   * 处理表单提交
   * @validates Requirements 7.5, 7.6
   */
  const handleSubmit = useCallback(async () => {
    setSubmitting(true)
    
    try {
      // 1. 创建资产
      const createData: AssetCreateRequest = {
        name: formData.name,
        symbol: formData.symbol.toUpperCase(),
        asset_type: formData.asset_type,
        description: formData.description,
        location: formData.location,
        total_supply: formData.total_supply,
        min_subscription: formData.min_subscription || 100,
        current_price: formData.current_price || 1,
        apy_3m: formData.apy_3m,
        apy_6m: formData.apy_6m,
        apy_12m: formData.apy_12m,
      }

      const newAsset = await assetService.createAsset(createData)

      // 2. 绑定选中的项目合约
      const bindProjects = formData.bind_projects || []
      if (bindProjects.length > 0) {
        for (const project of bindProjects) {
          try {
            await assetService.bindProjectContracts(
              newAsset.id,
              project,
              undefined,
              project !== 'common'
            )
          } catch (bindErr) {
            console.error(`Failed to bind project ${project}:`, bindErr)
          }
        }
      }

      // 3. 上传封面图
      const coverFile = formData.coverFile
      if (coverFile && coverFile.length > 0 && coverFile[0].originFileObj) {
        try {
          await assetService.uploadMedia(
            newAsset.id,
            coverFile[0].originFileObj,
            'cover'
          )
        } catch (e) {
          console.error('Cover upload failed:', e)
        }
      }

      // 4. 上传相册图片
      const galleryFiles = formData.galleryFiles || []
      for (const file of galleryFiles) {
        if (file.originFileObj) {
          try {
            await assetService.uploadMedia(
              newAsset.id,
              file.originFileObj,
              'gallery'
            )
          } catch (e) {
            console.error('Gallery upload failed:', e)
          }
        }
      }

      // 5. 成功处理
      notification.success(t('admin.assets.createSuccess', '资产创建成功'))
      reset()
      onSuccess()
      onClose()
    } catch (error: unknown) {
      // 6. 失败处理 - 保留数据，显示错误
      const errMsg = error instanceof Error
        ? error.message
        : t('admin.assets.createFailed', '创建失败')
      notification.error(errMsg)
    } finally {
      setSubmitting(false)
    }
  }, [formData, reset, onSuccess, onClose, setSubmitting, t])

  /**
   * 处理步骤点击跳转
   * 只允许跳转到已完成的步骤
   */
  const handleStepClick = useCallback((step: number) => {
    if (completedSteps.has(step)) {
      goToStep(step)
    }
  }, [completedSteps, goToStep])

  /**
   * 渲染当前步骤内容
   * @validates Requirements 1.1, 7.3
   */
  const renderStep = useMemo(() => {
    switch (currentStep) {
      case 1:
        return (
          <BasicInfoStep
            onNext={nextStep}
          />
        )
      case 2:
        return (
          <FinancialStep
            onNext={nextStep}
            onPrev={prevStep}
          />
        )
      case 3:
        return (
          <MediaStep
            onNext={nextStep}
            onPrev={prevStep}
            onSkip={nextStep}
          />
        )
      case 4:
        return (
          <PreviewStep
            onPrev={prevStep}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            availableProjects={availableProjects}
            isLoadingProjects={isLoadingProjects}
          />
        )
      default:
        return null
    }
  }, [
    currentStep,
    nextStep,
    prevStep,
    handleSubmit,
    isSubmitting,
    availableProjects,
    isLoadingProjects,
  ])

  return (
    <>
      {/* 步骤指示器 */}
      <div className="py-4 sm:py-5 md:py-6 px-4 sm:px-6 md:px-8 border-b border-white/[0.06]">
        <StepIndicator
          steps={WIZARD_STEPS}
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={handleStepClick}
        />
      </div>

      {/* 步骤内容区域 */}
      <div
        className={cn(
          'flex-1 overflow-y-auto overscroll-contain',
          'px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6',
          // 步骤切换动画
          'transition-all duration-300 ease-out'
        )}
      >
        {renderStep}
      </div>
    </>
  )
}

// ============ 主组件 ============

/**
 * CreateAssetWizard 主组件
 * 
 * 使用 shadcn/ui Dialog 作为容器，包装 WizardProvider 提供状态管理
 * 
 * @validates Requirements 1, 7.1, 7.2
 */
export function CreateAssetWizard({
  open,
  onClose,
  onSuccess,
  availableProjects,
  isLoadingProjects,
}: CreateAssetWizardProps) {
  const { t } = useTranslation()
  
  // 使用 key 强制重新挂载 WizardProvider，确保关闭时重置状态
  const [wizardKey, setWizardKey] = useState(0)

  /**
   * 处理关闭
   * @validates Requirements 7.2
   */
  const handleClose = useCallback(() => {
    // 增加 key 强制重新挂载，重置所有状态
    setWizardKey(prev => prev + 1)
    onClose()
  }, [onClose])

  /**
   * 处理 Dialog 状态变化
   */
  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      handleClose()
    }
  }, [handleClose])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          // 响应式宽度：移动端全宽，桌面端最大 900px
          'w-full max-w-[calc(100vw-32px)] sm:max-w-[600px] md:max-w-[800px] lg:max-w-[900px]',
          'p-0 gap-0',
          // 响应式高度
          'max-h-[calc(100vh-40px)] sm:max-h-[calc(100vh-60px)] md:max-h-[calc(100vh-80px)]',
          'flex flex-col',
          // Glassmorphism 风格
          'bg-[rgba(17,25,22,0.95)]',
          'backdrop-blur-xl',
          'border border-white/[0.08]',
          'shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]',
          // 隐藏默认关闭按钮
          '[&>button[class*="absolute"]]:hidden'
        )}
      >
        {/* 头部 */}
        <DialogHeader
          className={cn(
            'shrink-0 px-4 sm:px-6 md:px-8 pt-4 sm:pt-5 md:pt-6 pb-4 sm:pb-5',
            'border-b border-white/[0.06]',
            'rounded-t-xl'
          )}
          style={{
            background:
              'linear-gradient(180deg, rgba(0, 212, 170, 0.08) 0%, transparent 100%)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              {/* 图标 */}
              <div
                className={cn(
                  'w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-lg md:rounded-xl',
                  'flex items-center justify-center',
                  'border border-primary/30'
                )}
                style={{
                  background:
                    'linear-gradient(135deg, rgba(0, 212, 170, 0.2) 0%, rgba(0, 212, 170, 0.05) 100%)',
                }}
              >
                <Plus className="w-5 h-5 sm:w-[20px] sm:h-[20px] md:w-[22px] md:h-[22px] text-primary" />
              </div>
              
              {/* 标题 */}
              <div>
                <DialogTitle className="text-base sm:text-lg font-semibold text-white m-0">
                  {t('admin.assets.createTitle', 'Create New Asset')}
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-[13px] text-muted-foreground m-0 mt-0.5 sm:mt-1">
                  {t('admin.assets.wizard.subtitle')}
                </DialogDescription>
              </div>
            </div>

            {/* 关闭按钮 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </DialogHeader>

        {/* 向导内容 - 使用 key 确保关闭时重置 */}
        <WizardProvider key={wizardKey}>
          <WizardContent
            onClose={handleClose}
            onSuccess={onSuccess}
            availableProjects={availableProjects}
            isLoadingProjects={isLoadingProjects}
          />
        </WizardProvider>
      </DialogContent>
    </Dialog>
  )
}

export default CreateAssetWizard
