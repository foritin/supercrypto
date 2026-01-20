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

import { useMemo } from 'react'
import { Tag, Tooltip, Space, Badge } from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons'
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
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />
    case 'error':
      return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
    case 'warning':
      return <ExclamationCircleOutlined style={{ color: '#faad14' }} />
  }
}

/**
 * 获取状态颜色
 */
function getStatusColor(status: StatusType): string {
  switch (status) {
    case 'success':
      return 'success'
    case 'error':
      return 'error'
    case 'warning':
      return 'warning'
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
  // 计算状态项
  const statusItems = useMemo<StatusItem[]>(() => {
    const items: StatusItem[] = []

    // 合约绑定状态
    const hasContract = hasContractBinding(asset)
    items.push({
      key: 'contract',
      label: '合约绑定',
      status: hasContract ? 'success' : 'error',
      required: true,
      message: hasContract ? '已绑定合约' : '未绑定合约',
    })

    // APY 设置状态
    const hasAPY = hasAnyAPY(asset)
    items.push({
      key: 'apy',
      label: 'APY 设置',
      status: hasAPY ? 'success' : 'error',
      required: true,
      message: hasAPY
        ? `3M: ${asset.apy_3m}% | 6M: ${asset.apy_6m}% | 12M: ${asset.apy_12m}%`
        : '未设置 APY',
    })

    // 状态检查
    const isActive = asset.status === 'active'
    items.push({
      key: 'status',
      label: '资产状态',
      status: isActive ? 'success' : 'warning',
      required: false,
      message: isActive ? '状态正常' : `当前状态: ${asset.status}`,
    })

    return items
  }, [asset])

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
      <Tooltip
        title={
          computedVisibility ? (
            '用户可见'
          ) : (
            <div>
              <div style={{ marginBottom: 4 }}>用户不可见：</div>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {issues.map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
            </div>
          )
        }
      >
        {computedVisibility ? (
          <Badge status="success" text={<EyeOutlined style={{ color: '#52c41a' }} />} />
        ) : (
          <Badge status="error" text={<EyeInvisibleOutlined style={{ color: '#ff4d4f' }} />} />
        )}
      </Tooltip>
    )
  }

  // 完整模式
  return (
    <Space direction="vertical" size={4}>
      {/* 状态项 */}
      {statusItems.map((item) => (
        <Tooltip key={item.key} title={item.message}>
          <Tag
            color={getStatusColor(item.status)}
            icon={getStatusIcon(item.status)}
            style={{ margin: 0 }}
          >
            {item.label}
            {item.required && item.status !== 'success' && (
              <span style={{ color: '#ff4d4f', marginLeft: 4 }}>*</span>
            )}
          </Tag>
        </Tooltip>
      ))}

      {/* 可见性汇总 */}
      {showVisibility && (
        <Tooltip
          title={
            computedVisibility
              ? '满足所有可见性条件'
              : `不可见原因: ${visibilityIssues.join(', ') || statusItems.filter(s => s.status !== 'success').map(s => s.label).join(', ')}`
          }
        >
          <Tag
            color={computedVisibility ? 'success' : 'error'}
            icon={computedVisibility ? <EyeOutlined /> : <EyeInvisibleOutlined />}
          >
            {computedVisibility ? '用户可见' : '用户不可见'}
          </Tag>
        </Tooltip>
      )}
    </Space>
  )
}

export default AssetStatusIndicator
