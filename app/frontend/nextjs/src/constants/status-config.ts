/**
 * 状态徽章配置
 * 集中定义 KYC 和资产状态对应的 Badge variant 映射
 * 消除各组件中重复的 STATUS_BADGE_VARIANTS 定义
 */

import type { KycStatus } from '@/services/kyc'
import type { AssetStatus } from '@/services/asset'

/**
 * KYC 状态 → Badge variant 映射
 * 用于管理后台 KYC 列表和详情弹窗
 */
export const KYC_STATUS_BADGE: Record<
  KycStatus,
  'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'
> = {
  not_started: 'outline',
  pending: 'warning',
  approved: 'success',
  rejected: 'destructive',
}

/**
 * 资产状态 → Badge variant 映射
 * 用于管理后台资产列表
 */
export const ASSET_STATUS_BADGE: Record<
  AssetStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  active: 'default',
  paused: 'secondary',
  sold_out: 'outline',
  closed: 'destructive',
}
