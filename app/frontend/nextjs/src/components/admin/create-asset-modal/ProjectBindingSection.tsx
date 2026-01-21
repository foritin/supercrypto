/**
 * ProjectBindingSection Component
 * 项目绑定区域 - 选择项目并预览将绑定的合约
 * Migrated from Ant Design to shadcn/ui
 */
'use client'

import React from 'react'
import { Link2, AlertTriangle, X, Check, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { FormSection } from './FormSection'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { ProjectBindingSectionProps } from './types'

export const ProjectBindingSection = React.memo(function ProjectBindingSection({
  availableProjects,
  isLoadingProjects,
  selectedProjects,
  selectedContracts,
  onProjectsChange,
}: ProjectBindingSectionProps) {
  const { t } = useTranslation()

  // Toggle project selection
  const toggleProject = (project: string) => {
    if (selectedProjects.includes(project)) {
      onProjectsChange(selectedProjects.filter(p => p !== project))
    } else {
      onProjectsChange([...selectedProjects, project])
    }
  }

  // Get badge variant based on contract type
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
    <FormSection
      icon={<Link2 className="w-5 h-5" />}
      title={t('admin.assets.section.binding', '项目合约绑定')}
      description={t('admin.assets.section.bindingDesc', '选择要绑定的智能合约项目')}
      extra={
        <span className="px-2 py-0.5 text-xs bg-orange-500/20 text-orange-400 rounded">
          {t('admin.assets.recommended', '推荐')}
        </span>
      }
    >
      {/* Project selection */}
      <div className="space-y-2 mb-4">
        <label className="text-sm font-medium text-white flex items-center gap-2">
          {t('admin.assets.form.bindProjects', 'Select Projects')}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground cursor-help">ⓘ</span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  {t('admin.assets.form.bindProjectsTooltip', '选择项目后，该项目下的可用合约将自动绑定')}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </label>
        
        {isLoadingProjects ? (
          <div className="flex items-center gap-2 text-muted-foreground py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading projects...</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {availableProjects.map((p) => {
              const isSelected = selectedProjects.includes(p.project)
              return (
                <button
                  key={p.project}
                  type="button"
                  onClick={() => toggleProject(p.project)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium",
                    "border transition-all duration-200",
                    "flex items-center gap-2",
                    isSelected
                      ? "bg-primary/20 border-primary/50 text-primary"
                      : "bg-white/[0.02] border-white/10 text-muted-foreground hover:bg-white/[0.05] hover:border-white/20"
                  )}
                >
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                  {p.project}
                  <span className="text-xs opacity-70">
                    ({p.contract_count} {t('admin.assets.contracts', 'contracts')})
                  </span>
                </button>
              )
            })}
            {availableProjects.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {t('admin.assets.noProjects', 'No projects available')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* 合约预览 */}
      {selectedContracts.length > 0 && (
        <div className="p-4 bg-web3-success/5 border border-web3-success/15 rounded-lg">
          <p className="text-[13px] font-semibold text-white mb-3">
            {t('admin.assets.contractsToBindTitle', '将要绑定的合约')} ({selectedContracts.length})
          </p>
          <div className="flex flex-wrap gap-2">
            <TooltipProvider>
              {selectedContracts.map((c) => (
                <Tooltip key={`${c.contract_name}-${c.contract_address}`}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "px-2.5 py-1 rounded-md text-xs font-medium border cursor-default",
                        getContractBadgeVariant(c.contract_type)
                      )}
                    >
                      {c.contract_name}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-mono text-xs">{c.contract_address}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          </div>
        </div>
      )}

      {/* Warning when no projects selected */}
      {selectedProjects.length === 0 && (
        <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-400">
              {t('admin.assets.noProjectWarning', '未选择项目，资产创建后将不会绑定任何合约')}
            </p>
            <p className="text-xs text-yellow-400/70 mt-1">
              {t(
                'admin.assets.noProjectWarningDesc',
                '用户端仅展示已绑定合约的资产，您可以在创建后通过合约绑定功能进行绑定'
              )}
            </p>
          </div>
        </div>
      )}
    </FormSection>
  )
})
