import { z } from 'zod'

/**
 * Asset form validation schemas
 * Validates: Requirements 4.2 - Form validation using zod schemas
 */

// Asset type enum
export const assetTypeEnum = z.enum(['real_estate', 'bond', 'commodity', 'equity', 'other'])
export type AssetType = z.infer<typeof assetTypeEnum>

// Asset type display names (Chinese)
export const ASSET_TYPE_NAMES: Record<AssetType, string> = {
  real_estate: '房地产',
  bond: '债券',
  commodity: '大宗商品',
  equity: '股权',
  other: '其他',
}

/**
 * Schema for creating a new asset
 */
export const createAssetSchema = z.object({
  name: z.string()
    .min(1, '资产名称不能为空')
    .max(100, '资产名称不能超过100个字符'),
  symbol: z.string()
    .min(1, '资产符号不能为空')
    .max(10, '资产符号不能超过10个字符')
    .regex(/^[A-Z]+$/, '资产符号必须为大写字母'),
  description: z.string().optional(),
  asset_type: assetTypeEnum,
  image_url: z.string().url('请输入有效的图片URL').optional().or(z.literal('')),
  document_url: z.string().url('请输入有效的文档URL').optional().or(z.literal('')),
  location: z.string().optional(),
  total_supply: z.number()
    .min(0, '总供应量不能为负数'),
  min_subscription: z.number()
    .min(0, '最小认购额不能为负数'),
  apy_3m: z.number()
    .min(0, 'APY不能为负数')
    .max(100, 'APY不能超过100%'),
  apy_6m: z.number()
    .min(0, 'APY不能为负数')
    .max(100, 'APY不能超过100%'),
  apy_12m: z.number()
    .min(0, 'APY不能为负数')
    .max(100, 'APY不能超过100%'),
})

export type CreateAssetFormValues = z.infer<typeof createAssetSchema>

/**
 * Schema for the CreateAssetModal form (includes additional fields)
 * Used by the admin modal for creating assets with project binding
 * Note: All fields are required to avoid type mismatches with react-hook-form
 */
export const createAssetModalSchema = z.object({
  name: z.string()
    .min(1, '资产名称不能为空')
    .max(100, '资产名称不能超过100个字符'),
  symbol: z.string()
    .min(1, '资产符号不能为空')
    .max(10, '资产符号不能超过10个字符'),
  description: z.string().optional(),
  asset_type: assetTypeEnum,
  location: z.string().optional(),
  total_supply: z.number()
    .min(0, '总供应量不能为负数'),
  min_subscription: z.number()
    .min(0, '最小认购额不能为负数'),
  current_price: z.number()
    .min(0, '价格不能为负数'),
  apy_3m: z.number()
    .min(0, 'APY不能为负数')
    .max(100, 'APY不能超过100%'),
  apy_6m: z.number()
    .min(0, 'APY不能为负数')
    .max(100, 'APY不能超过100%'),
  apy_12m: z.number()
    .min(0, 'APY不能为负数')
    .max(100, 'APY不能超过100%'),
  bind_projects: z.array(z.string()),
})

export type CreateAssetModalFormValues = z.infer<typeof createAssetModalSchema>

/**
 * Default values for the CreateAssetModal form
 */
export const createAssetModalDefaultValues: CreateAssetModalFormValues = {
  name: '',
  symbol: '',
  description: '',
  asset_type: 'real_estate',
  location: '',
  total_supply: 0,
  min_subscription: 100,
  current_price: 1,
  apy_3m: 10,
  apy_6m: 12,
  apy_12m: 15,
  bind_projects: [],
}

/**
 * Schema for updating an existing asset
 * All fields are optional except for identification
 */
export const updateAssetSchema = createAssetSchema.partial()

export type UpdateAssetFormValues = z.infer<typeof updateAssetSchema>

/**
 * Default values for the create asset form
 */
export const createAssetDefaultValues: Partial<CreateAssetFormValues> = {
  name: '',
  symbol: '',
  description: '',
  asset_type: 'real_estate',
  image_url: '',
  document_url: '',
  location: '',
  total_supply: 0,
  min_subscription: 0,
  apy_3m: 0,
  apy_6m: 0,
  apy_12m: 0,
}
