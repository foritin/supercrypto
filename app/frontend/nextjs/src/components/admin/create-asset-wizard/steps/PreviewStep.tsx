/**
 * PreviewStep - 预览确认步骤组件
 * 
 * 向导第四步（最后一步）：预览资产卡片效果并选择合约绑定
 * 左侧显示资产卡片预览，右侧显示合约绑定选择区域
 * 
 * @validates Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 * @validates Requirements 9.1, 9.2, 9.5 (可访问性)
 */
'use client'

import { useCallback, useMemo, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { 
  ArrowLeft, 
  Check, 
  Loader2, 
  Link2, 
  AlertTriangle,
  Sparkles 
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

import { useWizard } from '../WizardContext'
import { AssetCardPreview } from '../AssetCardPreview'
import type { StepComponentProps } from '../types'
import type { ProjectContractInfo, ContractBindingStatus } from '@/services/asset'

// ============ 类型定义 ============

interface PreviewStepProps extends StepComponentProps {
  /** 可用的项目列表 */
  availableProjects: ProjectContractInfo[]
  /** 是否正在加载项目 */
  isLoadingProjects: boolean
  /** 提交表单回调 */
  onSubmit: () => Promise<void>
  /** 是否正在提交 */
  isSubmitting: boolean
}

// ============ 子组件 ============

/**
 * 合约徽章组件
 */
interface ContractBadgeProps {
  contract: ContractBindingStatus
}

function ContractBadge({ contract }: ContractBadgeProps) {
  // 根据合约类型获取样式
  const getContractBadgeVariant = (contractType?: string) => {
    switch (contractType) {
      case 'common':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'mock':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
      default:
        return 'bg-green-500/20 text-green-400 border-green-500/30'
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-medium border cursor-default',
              getContractBadgeVariant(contract.contract_type)
            )}
          >
            {contract.contract_name}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-mono text-xs">{contract.contract_address}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * 项目选择项组件
 * @validates Requirements 9.1, 9.2 (可访问性)
 */
interface ProjectItemProps {
  project: ProjectContractInfo
  isSelected: boolean
  onToggle: () => void
  id?: string
  t: (key: string, params?: Record<string, unknown>) => string
}

function ProjectItem({ project, isSelected, onToggle, id, t }: ProjectItemProps) {
  // 计算可用合约数量
  const availableCount = project.contracts.filter(c => c.is_available).length
  const isDisabled = availableCount === 0

  return (
    <div
      id={id}
      role="checkbox"
      aria-checked={isSelected}
      aria-disabled={isDisabled}
      aria-label={`${project.project} - ${t('admin.assets.wizard.preview.availableContracts', { count: availableCount })}${isSelected ? ', selected' : ''}`}
      tabIndex={isDisabled ? -1 : 0}
      className={cn(
        'flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg',
        'border transition-all duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        isDisabled
          ? 'bg-white/[0.01] border-white/5 opacity-50 cursor-not-allowed'
          : isSelected
            ? 'bg-primary/10 border-primary/30'
            : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.04] hover:border-white/20 cursor-pointer'
      )}
      onClick={() => !isDisabled && onToggle()}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !isDisabled) {
          e.preventDefault()
          onToggle()
        }
      }}
    >
      <Checkbox
        checked={isSelected}
        disabled={isDisabled}
        onCheckedChange={() => !isDisabled && onToggle()}
        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        tabIndex={-1}
        aria-hidden="true"
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <span className="text-xs sm:text-sm font-medium text-white truncate">
            {project.project}
          </span>
          <span className="text-[10px] sm:text-xs text-muted-foreground">
            ({t('admin.assets.wizard.preview.availableContracts', { count: availableCount })})
          </span>
        </div>
        
        {/* 显示可用合约列表 */}
        {isSelected && availableCount > 0 && (
          <div className="flex flex-wrap gap-1 sm:gap-1.5 mt-1.5 sm:mt-2" role="list" aria-label="Available contracts">
            {project.contracts
              .filter(c => c.is_available)
              .map(contract => (
                <div key={`${contract.contract_name}-${contract.contract_address}`} role="listitem">
                  <ContractBadge contract={contract} />
                </div>
              ))
            }
          </div>
        )}
      </div>

      {isSelected && (
        <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" aria-hidden="true" />
      )}
    </div>
  )
}

// ============ 主组件 ============

/**
 * PreviewStep 组件
 * 
 * 向导最后一步，展示：
 * - 左侧：资产卡片预览
 * - 右侧：合约绑定选择
 * - 底部：返回和创建按钮
 * 
 * @validates Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 * @validates Requirements 9.5 (焦点管理)
 */
export function PreviewStep({
  onPrev,
  availableProjects,
  isLoadingProjects,
  onSubmit,
  isSubmitting,
}: PreviewStepProps) {
  const { t } = useTranslation()
  const { state, updateFormData } = useWizard()
  const { formData } = state
  
  // Ref for focus management
  const firstFocusableRef = useRef<HTMLHeadingElement>(null)

  // Focus management when step mounts (accessibility requirement 9.5)
  useEffect(() => {
    const timer = setTimeout(() => {
      firstFocusableRef.current?.focus()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // 获取选中的项目列表
  const selectedProjects = formData.bind_projects || []

  // 计算将要绑定的合约列表
  const selectedContracts = useMemo(() => {
    const contracts: ContractBindingStatus[] = []
    
    for (const projectName of selectedProjects) {
      const project = availableProjects.find(p => p.project === projectName)
      if (project) {
        contracts.push(...project.contracts.filter(c => c.is_available))
      }
    }
    
    return contracts
  }, [selectedProjects, availableProjects])

  // 准备预览数据
  const previewData = useMemo(() => {
    // 获取封面图预览 URL
    let coverImage: string | undefined
    if (formData.coverFile && formData.coverFile.length > 0) {
      const coverFile = formData.coverFile[0]
      coverImage = coverFile.preview || coverFile.url
    }

    return {
      name: formData.name,
      symbol: formData.symbol,
      asset_type: formData.asset_type,
      location: formData.location,
      current_price: formData.current_price,
      apy_3m: formData.apy_3m,
      apy_6m: formData.apy_6m,
      apy_12m: formData.apy_12m,
      coverImage,
    }
  }, [formData])

  /**
   * 切换项目选择
   */
  const toggleProject = useCallback((projectName: string) => {
    const currentSelected = formData.bind_projects || []
    
    if (currentSelected.includes(projectName)) {
      updateFormData({
        bind_projects: currentSelected.filter(p => p !== projectName)
      })
    } else {
      updateFormData({
        bind_projects: [...currentSelected, projectName]
      })
    }
  }, [formData.bind_projects, updateFormData])

  /**
   * 处理创建提交
   * @validates Requirements 6.5
   */
  const handleSubmit = useCallback(async () => {
    await onSubmit()
  }, [onSubmit])

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6">
      {/* 步骤说明 */}
      <div className="flex items-center gap-2 text-muted-foreground">
        <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" aria-hidden="true" />
        <h3 
          ref={firstFocusableRef}
          tabIndex={-1}
          className="text-xs sm:text-sm focus:outline-none"
        >
          {t('admin.assets.wizard.preview.title')}
        </h3>
      </div>

      {/* 主内容区域 - 移动端垂直堆叠，桌面端左右布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
        {/* 左侧：资产卡片预览 - 移动端居中显示 */}
        <section aria-labelledby="preview-section-title" className="space-y-2 sm:space-y-3">
          <h4 id="preview-section-title" className="text-xs sm:text-sm font-medium text-white flex items-center gap-2">
            {t('admin.assets.wizard.preview.cardPreview')}
            <span className="text-[10px] sm:text-xs text-muted-foreground font-normal">
              {t('admin.assets.wizard.preview.cardPreviewHint')}
            </span>
          </h4>
          
          <div className="flex justify-center p-3 sm:p-4 bg-white/[0.02] rounded-lg sm:rounded-xl border border-white/5">
            <AssetCardPreview data={previewData} />
          </div>
        </section>

        {/* 右侧：合约绑定选择 */}
        <section aria-labelledby="binding-section-title" className="space-y-2 sm:space-y-3">
          <h4 id="binding-section-title" className="text-xs sm:text-sm font-medium text-white flex items-center gap-2">
            <Link2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
            {t('admin.assets.wizard.preview.contractBinding')}
            <span className="px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs bg-orange-500/20 text-orange-400 rounded">
              {t('admin.assets.wizard.preview.recommended')}
            </span>
          </h4>

          {/* 项目列表 - 移动端减少最大高度 */}
          <div 
            className="space-y-2 max-h-[200px] sm:max-h-[250px] md:max-h-[300px] overflow-y-auto pr-1"
            role="group"
            aria-label="Available projects"
          >
            {isLoadingProjects ? (
              <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground" role="status" aria-live="polite">
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span className="text-sm">{t('admin.assets.wizard.preview.loadingProjects')}</span>
              </div>
            ) : availableProjects.filter(p => p.project !== 'common').length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm" role="status">
                {t('admin.assets.wizard.preview.noProjects')}
              </div>
            ) : (
              // 过滤掉 common 项目，只显示项目专属合约
              availableProjects
                .filter(p => p.project !== 'common')
                .map((project, index) => (
                  <ProjectItem
                    key={project.project}
                    id={`project-${index}`}
                    project={project}
                    isSelected={selectedProjects.includes(project.project)}
                    onToggle={() => toggleProject(project.project)}
                    t={t}
                  />
                ))
            )}
          </div>

          {/* 已选合约预览 */}
          {selectedContracts.length > 0 && (
            <div className="p-3 sm:p-4 bg-primary/5 border border-primary/15 rounded-lg" role="region" aria-label="Selected contracts">
              <p className="text-xs sm:text-[13px] font-semibold text-white mb-2 sm:mb-3">
                {t('admin.assets.wizard.preview.contractsToBind', { count: selectedContracts.length })}
              </p>
              <div className="flex flex-wrap gap-1.5 sm:gap-2" role="list" aria-label="Selected contracts list">
                {selectedContracts.map(contract => (
                  <div key={`${contract.contract_name}-${contract.contract_address}`} role="listitem">
                    <ContractBadge contract={contract} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 未选择项目警告 */}
          {selectedProjects.length === 0 && !isLoadingProjects && availableProjects.length > 0 && (
            <div 
              className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg"
              role="alert"
              aria-live="polite"
            >
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-xs sm:text-sm font-medium text-yellow-400">
                  {t('admin.assets.wizard.preview.noProjectSelected')}
                </p>
                <p className="text-[10px] sm:text-xs text-yellow-400/70 mt-0.5 sm:mt-1">
                  {t('admin.assets.wizard.preview.noProjectSelectedDesc')}
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* 底部按钮 - 移动端优化间距 */}
      <div className="flex justify-between pt-3 sm:pt-4 border-t border-white/5">
        {/* 返回按钮 */}
        <Button
          type="button"
          variant="ghost"
          onClick={onPrev}
          disabled={isSubmitting}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('admin.assets.wizard.buttons.back')}
        </Button>

        {/* 创建按钮 - 移动端优化尺寸 */}
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={cn(
            'min-w-[120px] sm:min-w-[140px]',
            'bg-gradient-to-r from-primary to-[#00E5BB]',
            'text-[#0a0f0d] font-semibold',
            'hover:shadow-[0_0_30px_rgba(0,212,170,0.4)]',
            'transition-all duration-300'
          )}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" />
              <span className="text-sm sm:text-base">{t('admin.assets.wizard.buttons.creating')}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
              <span className="text-sm sm:text-base">{t('admin.assets.wizard.buttons.create')}</span>
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

export default PreviewStep
