/**
 * Constants Utilities - 常量工具函数
 *
 * 提供常量数据处理的工具函数和 fallback 常量定义。
 * 当 API 请求失败时，使用 fallback 常量确保应用正常运行。
 */
import type { ConstantItem } from '@/services/constants'

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 获取常量标签
 * @param items 常量项列表
 * @param value 常量值
 * @param locale 语言 ('zh' | 'en')，默认 'zh'
 * @returns 常量标签，如果未找到则返回 value 本身作为 fallback
 */
export function getConstantLabel(
  items: ConstantItem[] | undefined,
  value: string | undefined | null,
  locale: 'zh' | 'en' = 'zh'
): string {
  if (!value) return ''
  if (!items || items.length === 0) return value

  const item = items.find((i) => i.value === value)
  return item?.labels?.[locale] ?? value
}

/**
 * 将常量列表转换为 Select/Radio 组件的 options 格式
 * @param items 常量项列表
 * @param locale 语言 ('zh' | 'en')，默认 'zh'
 * @returns options 数组 [{ value, label }]
 */
export function constantsToOptions(
  items: ConstantItem[] | undefined,
  locale: 'zh' | 'en' = 'zh'
): { value: string; label: string }[] {
  if (!items) return []

  return items.map((item) => ({
    value: item.value,
    label: item.labels?.[locale] ?? item.value,
  }))
}

/**
 * 获取常量的元数据
 * @param items 常量项列表
 * @param value 常量值
 * @param key 元数据键名
 * @returns 元数据值，如果未找到则返回 undefined
 */
export function getConstantMetadata<T = unknown>(
  items: ConstantItem[] | undefined,
  value: string,
  key: string
): T | undefined {
  if (!items) return undefined

  const item = items.find((i) => i.value === value)
  return item?.metadata?.[key] as T | undefined
}

// ============================================================================
// Fallback 常量定义 - 当 API 请求失败时使用
// ============================================================================

/**
 * 资产类型 fallback
 */
export const FALLBACK_ASSET_TYPES: ConstantItem[] = [
  { value: 'real_estate', labels: { zh: '房地产', en: 'Real Estate' } },
  { value: 'bond', labels: { zh: '债券', en: 'Bond' } },
  { value: 'commodity', labels: { zh: '大宗商品', en: 'Commodity' } },
  { value: 'equity', labels: { zh: '股权', en: 'Equity' } },
  { value: 'other', labels: { zh: '其他', en: 'Other' } },
]

/**
 * 资产状态 fallback
 */
export const FALLBACK_ASSET_STATUSES: ConstantItem[] = [
  { value: 'active', labels: { zh: '可认购', en: 'Available' }, metadata: { color: 'green' } },
  { value: 'paused', labels: { zh: '已暂停', en: 'Paused' }, metadata: { color: 'orange' } },
  { value: 'sold_out', labels: { zh: '已售罄', en: 'Sold Out' }, metadata: { color: 'red' } },
  { value: 'closed', labels: { zh: '已关闭', en: 'Closed' }, metadata: { color: 'default' } },
]

/**
 * 媒体类型 fallback
 */
export const FALLBACK_MEDIA_TYPES: ConstantItem[] = [
  { value: 'cover', labels: { zh: '封面图', en: 'Cover' } },
  { value: 'gallery', labels: { zh: '相册', en: 'Gallery' } },
  { value: 'valuation', labels: { zh: '估值报告', en: 'Valuation Report' } },
  { value: 'legal', labels: { zh: '法律文件', en: 'Legal Documents' } },
  { value: 'financial', labels: { zh: '财务文件', en: 'Financial Documents' } },
  { value: 'floor_plan', labels: { zh: '平面图', en: 'Floor Plan' } },
  { value: 'video', labels: { zh: '视频', en: 'Video' } },
]

/**
 * 认购状态 fallback
 */
export const FALLBACK_SUBSCRIPTION_STATUSES: ConstantItem[] = [
  { value: 'pending', labels: { zh: '待确认', en: 'Pending' }, metadata: { color: 'processing' } },
  { value: 'active', labels: { zh: '生效中', en: 'Active' }, metadata: { color: 'blue' } },
  { value: 'matured', labels: { zh: '已到期', en: 'Matured' }, metadata: { color: 'green' } },
  { value: 'redeemed', labels: { zh: '已赎回', en: 'Redeemed' }, metadata: { color: 'default' } },
  { value: 'cancelled', labels: { zh: '已取消', en: 'Cancelled' }, metadata: { color: 'error' } },
]

/**
 * 质押状态 fallback
 */
export const FALLBACK_STAKING_STATUSES: ConstantItem[] = [
  { value: 'active', labels: { zh: '质押中', en: 'Active' }, metadata: { color: 'processing' } },
  { value: 'matured', labels: { zh: '已到期', en: 'Matured' }, metadata: { color: 'success' } },
  { value: 'unstaked', labels: { zh: '已解押', en: 'Unstaked' }, metadata: { color: 'default' } },
  { value: 'claimed', labels: { zh: '已领取', en: 'Claimed' }, metadata: { color: 'default' } },
]

/**
 * 交易类型 fallback
 */
export const FALLBACK_TRANSACTION_TYPES: ConstantItem[] = [
  { value: 'subscription', labels: { zh: '认购', en: 'Subscription' }, metadata: { color: 'blue' } },
  { value: 'redeem', labels: { zh: '赎回', en: 'Redemption' }, metadata: { color: 'green' } },
  { value: 'stake', labels: { zh: '质押', en: 'Stake' }, metadata: { color: 'purple' } },
  { value: 'unstake', labels: { zh: '解押', en: 'Unstake' }, metadata: { color: 'orange' } },
  { value: 'claim', labels: { zh: '领取奖励', en: 'Claim Reward' }, metadata: { color: 'gold' } },
  { value: 'transfer', labels: { zh: '转账', en: 'Transfer' }, metadata: { color: 'cyan' } },
  { value: 'approve', labels: { zh: '授权', en: 'Approve' }, metadata: { color: 'default' } },
  { value: 'mint', labels: { zh: '铸造', en: 'Mint' }, metadata: { color: 'magenta' } },
  { value: 'other', labels: { zh: '其他', en: 'Other' }, metadata: { color: 'default' } },
]

/**
 * 证件类型 fallback
 */
export const FALLBACK_ID_TYPES: ConstantItem[] = [
  { value: 'passport', labels: { zh: '护照', en: 'Passport' } },
  { value: 'id_card', labels: { zh: '身份证', en: 'ID Card' } },
  { value: 'driver_license', labels: { zh: '驾驶证', en: 'Driver License' } },
]

/**
 * 锁定期 fallback
 */
export const FALLBACK_LOCK_PERIODS: ConstantItem[] = [
  { value: '3', labels: { zh: '3 个月', en: '3 Months' } },
  { value: '6', labels: { zh: '6 个月', en: '6 Months' } },
  { value: '12', labels: { zh: '12 个月', en: '12 Months' } },
]

/**
 * 代币类型 fallback
 */
export const FALLBACK_TOKEN_TYPES: ConstantItem[] = [
  { value: 'USDT', labels: { zh: 'USDT', en: 'USDT' } },
  { value: 'USDC', labels: { zh: 'USDC', en: 'USDC' } },
]

/**
 * 价格来源 fallback
 */
export const FALLBACK_PRICE_SOURCES: ConstantItem[] = [
  { value: 'manual', labels: { zh: '手动输入', en: 'Manual' } },
  { value: 'oracle', labels: { zh: '预言机', en: 'Oracle' } },
  { value: 'api', labels: { zh: 'API', en: 'API' } },
]

// ============================================================================
// Fallback 常量映射表 - 按分组名称索引
// ============================================================================

export const FALLBACK_CONSTANTS: Record<string, ConstantItem[]> = {
  asset_type: FALLBACK_ASSET_TYPES,
  asset_status: FALLBACK_ASSET_STATUSES,
  media_type: FALLBACK_MEDIA_TYPES,
  subscription_status: FALLBACK_SUBSCRIPTION_STATUSES,
  staking_status: FALLBACK_STAKING_STATUSES,
  transaction_type: FALLBACK_TRANSACTION_TYPES,
  id_type: FALLBACK_ID_TYPES,
  lock_period: FALLBACK_LOCK_PERIODS,
  token_type: FALLBACK_TOKEN_TYPES,
  price_source: FALLBACK_PRICE_SOURCES,
}

/**
 * 获取 fallback 常量
 * @param group 分组名称
 * @returns fallback 常量列表，如果分组不存在则返回空数组
 */
export function getFallbackConstants(group: string): ConstantItem[] {
  return FALLBACK_CONSTANTS[group] ?? []
}
