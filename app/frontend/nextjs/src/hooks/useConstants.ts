/**
 * useConstants Hook - 常量数据获取 Hook
 *
 * 使用 React Query 缓存常量数据，减少重复请求。
 * 支持获取指定分组的常量和获取常量标签。
 *
 * @example
 * // 获取资产类型常量
 * const { data, isLoading } = useConstants('asset_type')
 *
 * // 获取常量标签
 * const label = useConstantLabel('asset_type', 'real_estate', 'zh')
 */
import { useQuery } from '@tanstack/react-query'
import { constantsService, type ConstantItem } from '@/services/constants'

/** 缓存时间: 5 分钟 */
const STALE_TIME = 5 * 60 * 1000

/** 查询键前缀 */
const QUERY_KEY_PREFIX = 'constants'

/**
 * 获取指定分组的常量数据
 * @param group 分组名称 (如 "asset_type", "asset_status")
 * @param options 额外配置选项
 */
export function useConstants(
  group: string,
  options?: {
    enabled?: boolean
  }
) {
  return useQuery({
    queryKey: [QUERY_KEY_PREFIX, group],
    queryFn: () => constantsService.getConstants(group),
    staleTime: STALE_TIME,
    enabled: options?.enabled ?? true,
  })
}

/**
 * 获取所有常量分组
 * @param options 额外配置选项
 */
export function useAllConstants(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [QUERY_KEY_PREFIX, 'all'],
    queryFn: () => constantsService.getAllConstants(),
    staleTime: STALE_TIME,
    enabled: options?.enabled ?? true,
  })
}

/**
 * 获取常量标签
 * @param group 分组名称
 * @param value 常量值
 * @param locale 语言 ('zh' | 'en')，默认 'zh'
 * @returns 常量标签，如果未找到则返回 value 本身
 */
export function useConstantLabel(
  group: string,
  value: string | undefined | null,
  locale: 'zh' | 'en' = 'zh'
): string {
  const { data: items } = useConstants(group)

  if (!value) return ''

  if (!items || items.length === 0) {
    return value
  }

  const item = items.find((i) => i.value === value)
  return item?.labels?.[locale] ?? value
}

/**
 * 将常量列表转换为 Select 组件的 options 格式
 * @param items 常量项列表
 * @param locale 语言 ('zh' | 'en')，默认 'zh'
 * @returns Select options 数组
 */
export function constantsToSelectOptions(
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
 * Hook: 获取常量并转换为 Select options
 * @param group 分组名称
 * @param locale 语言 ('zh' | 'en')，默认 'zh'
 */
export function useConstantOptions(group: string, locale: 'zh' | 'en' = 'zh') {
  const { data, isLoading, error } = useConstants(group)

  return {
    options: constantsToSelectOptions(data, locale),
    isLoading,
    error,
  }
}
