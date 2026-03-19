/**
 * 资产状态指示器组件
 * 
 * 显示资产的完整性状态，包括：
 * - 合约绑定状态
 * - APY 设置状态
 * - 必需文档状态
 * - 用户可见状态
 */
'use client'

import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { AssetDetail, AssetListItem } from '@/services/asset'

// 状态类型
type StatusType = 'success' | 'error' | 'warning'

// 状态项定义
interface StatusItem {
  key: string
  label: string
  status: StatusType
  required: boolean
  message: string
}

interface AssetStatusIndicatorProps {
  /** 资产数据 - 可以是列表项或详情 */
  asset: AssetListItem | AssetDetail
  /** 是否为紧凑模式（用于列表） */
  compact?: boolean
  /** 是否显示可见性状态 */
  showVisibility?: boolean
  /** 可见性信息（仅详情中有） */
  isVisible?: boolean
  /** 不可见原因列表 */
  visibilityIssues?: string[]
}

/**
 * 检查是否有 APY 设置
 */
function hasAnyAPY(asset: AssetListItem | AssetDetail): boolean {
  return asset.apy_3m > 0 || asset.apy_6m > 0 || asset.apy_12m > 0
}

/**
 * 检查是否有合约绑定
 */
function hasContractBinding(asset: AssetListItem | AssetDetail): boolean {
  // 详情模式
  if ('bound_contracts' in asset && asset.bound_contracts) {
    return asset.bound_contracts.length > 0
  }
  // 列表模式只能看 contract_address
  if ('contract_address' in asset) {
    return !!asset.contract_address
  }
  return false
}

/**
 * 获取状态图标
 */
function getStatusIcon(status: StatusType) {
  switch (status) {
    case 'success':
      return <CheckCircle className="h-3.5 w-3.5 text-primary" />
    case 'error':
      return <XCircle className="h-3.5 w-3.5 text-destructive" />
    case 'warning':
      return <AlertCircle className="h-3.5 w-3.5 text-yellow-500" />
  }
}

/**
 * 获取 Badge 样式类
 */
function getBadgeClassName(status: StatusType): string {
  switch (status) {
    case 'success':
      return 'bg-primary/20 text-primary border-primary/30 hover:bg-primary/30'
    case 'error':
      return 'bg-destructive/20 text-destructive border-destructive/30 hover:bg-destructive/30'
    case 'warning':
      return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30 hover:bg-yellow-500/30'
  }
}

/**
 * 资产状态指示器组件
 */
export function AssetStatusIndicator({
  asset,
  compact = false,
  showVisibility = true,
  isVisible,
  visibilityIssues = [],
}: AssetStatusIndicatorProps) {
  const { t } = useTranslation()

  // 计算状态项
  const statusItems = useMemo<StatusItem[]>(() => {
    const items: StatusItem[] = []

    // 合约绑定状态
    const hasContract = hasContractBinding(asset)
    items.push({
      key: 'contract',
      label: t('admin.assets.statusIndicator.contractBinding'),
      status: hasContract ? 'success' : 'error',
      required: true,
      message: hasContract 
        ? t('admin.assets.statusIndicator.contractBound') 
        : t('admin.assets.statusIndicator.contractNotBound'),
    })

    // APY 设置状态
    const hasAPY = hasAnyAPY(asset)
    items.push({
      key: 'apy',
      label: t('admin.assets.statusIndicator.apySetting'),
      status: hasAPY ? 'success' : 'error',
      required: true,
      message: hasAPY
        ? `3M: ${asset.apy_3m}% | 6M: ${asset.apy_6m}% | 12M: ${asset.apy_12m}%`
        : t('admin.assets.statusIndicator.apyNotSet'),
    })

    // 状态检查
    const isActive = asset.status === 'active'
    items.push({
      key: 'status',
      label: t('admin.assets.statusIndicator.assetStatus'),
      status: isActive ? 'success' : 'warning',
      required: false,
      message: isActive 
        ? t('admin.assets.statusIndicator.statusNormal') 
        : t('admin.assets.statusIndicator.currentStatus', { status: asset.status }),
    })

    return items
  }, [asset, t])

  // 计算用户可见性
  const computedVisibility = useMemo(() => {
    // 如果传入了 isVisible，使用传入的值
    if (typeof isVisible === 'boolean') {
      return isVisible
    }
    // 否则根据条件计算
    return (
      asset.status === 'active' &&
      hasContractBinding(asset) &&
      hasAnyAPY(asset)
    )
  }, [asset, isVisible])

  // 紧凑模式 - 只显示可见性图标
  if (compact) {
    const issues = visibilityIssues.length > 0
      ? visibilityIssues
      : statusItems.filter(s => s.status !== 'success').map(s => s.message)

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-flex items-center gap-1.5 cursor-default">
              {computedVisibility ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                  <Eye className="h-4 w-4 text-primary" />
                </>
              ) : (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
                  </span>
                  <EyeOff className="h-4 w-4 text-destructive" />
                </>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {computedVisibility ? (
              <span>{t('admin.assets.statusIndicator.userVisible')}</span>
            ) : (
              <div>
                <div className="mb-1 font-medium">{t('admin.assets.statusIndicator.userNotVisible')}:</div>
                <ul className="list-disc pl-4 space-y-0.5">
                  {issues.map((issue, i) => (
                    <li key={i} className="text-muted-foreground">{issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // 完整模式
  return (
    <TooltipProvider>
      <div className="flex flex-col gap-1">
        {/* 状态项 */}
        {statusItems.map((item) => (
          <Tooltip key={item.key}>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className={cn(
                  'cursor-default gap-1.5 justify-start',
                  getBadgeClassName(item.status)
                )}
              >
                {getStatusIcon(item.status)}
                <span>{item.label}</span>
                {item.required && item.status !== 'success' && (
                  <span className="text-destructive ml-0.5">*</span>
                )}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <span>{item.message}</span>
            </TooltipContent>
          </Tooltip>
        ))}

        {/* 可见性汇总 */}
        {showVisibility && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className={cn(
                  'cursor-default gap-1.5 justify-start',
                  computedVisibility
                    ? 'bg-primary/20 text-primary border-primary/30 hover:bg-primary/30'
                    : 'bg-destructive/20 text-destructive border-destructive/30 hover:bg-destructive/30'
                )}
              >
                {computedVisibility ? (
                  <Eye className="h-3.5 w-3.5" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5" />
                )}
                <span>
                  {computedVisibility 
                    ? t('admin.assets.statusIndicator.userVisible') 
                    : t('admin.assets.statusIndicator.userNotVisible')}
                </span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <span>
                {computedVisibility
                  ? t('admin.assets.statusIndicator.allConditionsMet')
                  : t('admin.assets.statusIndicator.notVisibleReason', { 
                      reasons: visibilityIssues.join(', ') || statusItems.filter(s => s.status !== 'success').map(s => s.label).join(', ')
                    })}
              </span>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  )
}

export default AssetStatusIndicator
