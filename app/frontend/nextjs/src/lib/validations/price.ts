import { z } from 'zod'

/**
 * Price update form validation schemas
 * Validates: Requirements 4.2 - Form validation using zod schemas
 */

// Price source enum
export const priceSourceEnum = z.enum(['manual', 'oracle', 'api'])
export type PriceSource = z.infer<typeof priceSourceEnum>

// Price source display names (Chinese)
export const PRICE_SOURCE_NAMES: Record<PriceSource, string> = {
  manual: '手动输入',
  oracle: '预言机',
  api: 'API',
}

/**
 * Schema for price update form
 */
export const priceUpdateSchema = z.object({
  price: z.number()
    .min(0, '价格不能为负数')
    .refine(val => val > 0, '价格必须大于0'),
  source: priceSourceEnum,
})

export type PriceUpdateFormValues = z.infer<typeof priceUpdateSchema>

/**
 * Default values for the price update form
 */
export const priceUpdateDefaultValues: Partial<PriceUpdateFormValues> = {
  price: 0,
  source: 'manual',
}

/**
 * Schema for batch price update
 */
export const batchPriceUpdateSchema = z.object({
  updates: z.array(z.object({
    asset_id: z.number().int().positive('资产ID必须为正整数'),
    price: z.number()
      .min(0, '价格不能为负数')
      .refine(val => val > 0, '价格必须大于0'),
    source: priceSourceEnum,
  })).min(1, '至少需要一条价格更新'),
})

export type BatchPriceUpdateFormValues = z.infer<typeof batchPriceUpdateSchema>
