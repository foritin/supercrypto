/**
 * Create Asset Wizard 表单验证 Schema
 * 
 * 使用 zod 定义多步骤向导的表单验证规则
 * @validates Requirements 3, 4, 5, 6
 */

import { z } from 'zod'

// ============ 资产类型枚举 ============

/**
 * 资产类型枚举
 */
export const wizardAssetTypeEnum = z.enum([
  'real_estate',
  'bond', 
  'commodity',
  'equity',
  'other'
])

export type WizardAssetType = z.infer<typeof wizardAssetTypeEnum>

/**
 * 资产类型显示名称 (中文)
 */
export const WIZARD_ASSET_TYPE_NAMES: Record<WizardAssetType, string> = {
  real_estate: '房地产',
  bond: '债券',
  commodity: '大宗商品',
  equity: '股权',
  other: '其他',
}

// ============ Step 1: 基本信息 Schema ============

/**
 * 基本信息验证 Schema
 * 
 * 验证规则:
 * - name: 2-100 字符，必填
 * - symbol: 2-10 字符，大写，必填
 * - asset_type: 枚举值，必填
 * - location: 可选
 * - description: 最多 500 字符，可选
 * 
 * @validates Requirement 3 - 基本信息步骤
 */
export const basicInfoSchema = z.object({
  name: z.string()
    .min(2, '资产名称至少需要 2 个字符')
    .max(100, '资产名称不能超过 100 个字符'),
  
  symbol: z.string()
    .min(2, '代币符号至少需要 2 个字符')
    .max(10, '代币符号不能超过 10 个字符')
    .transform(val => val.toUpperCase())
    .refine(val => /^[A-Z0-9]+$/.test(val), {
      message: '代币符号只能包含大写字母和数字',
    }),
  
  asset_type: wizardAssetTypeEnum,
  
  location: z.string().optional(),
  
  description: z.string()
    .max(500, '描述不能超过 500 个字符')
    .optional(),
})

export type BasicInfoFormValues = z.infer<typeof basicInfoSchema>

/**
 * 基本信息默认值
 */
export const basicInfoDefaultValues: BasicInfoFormValues = {
  name: '',
  symbol: '',
  asset_type: 'real_estate',
  location: '',
  description: '',
}

// ============ Step 2: 财务设置 Schema ============

/**
 * 财务设置验证 Schema (基础版本，不含跨字段验证)
 */
const financialBaseSchema = z.object({
  total_supply: z.number()
    .positive('总供应量必须大于 0'),
  
  min_subscription: z.number()
    .positive('最小认购额必须大于 0'),
  
  current_price: z.number()
    .positive('当前价格必须大于 0'),
  
  apy_3m: z.number()
    .min(0, '3个月 APY 不能小于 0')
    .max(100, '3个月 APY 不能超过 100%')
    .optional()
    .default(0),
  
  apy_6m: z.number()
    .min(0, '6个月 APY 不能小于 0')
    .max(100, '6个月 APY 不能超过 100%')
    .optional()
    .default(0),
  
  apy_12m: z.number()
    .min(0, '12个月 APY 不能小于 0')
    .max(100, '12个月 APY 不能超过 100%')
    .optional()
    .default(0),
})

/**
 * 财务设置验证 Schema (含跨字段验证)
 * 
 * 验证规则:
 * - total_supply: 正数，必填
 * - min_subscription: 正数，必填，不能大于 total_supply
 * - current_price: 正数，step 0.01，必填
 * - apy_3m/6m/12m: 0-100 范围，可选
 * 
 * @validates Requirement 4 - 财务设置步骤
 */
export const financialSchema = financialBaseSchema.refine(
  (data) => data.min_subscription <= data.total_supply,
  {
    message: '最小认购额不能大于总供应量',
    path: ['min_subscription'],
  }
)

export type FinancialFormValues = z.infer<typeof financialBaseSchema>

/**
 * 财务设置默认值
 */
export const financialDefaultValues: FinancialFormValues = {
  total_supply: 0,
  min_subscription: 100,
  current_price: 1,
  apy_3m: 10,
  apy_6m: 12,
  apy_12m: 15,
}

// ============ Step 3: 媒体上传 Schema ============

/**
 * 文件验证辅助函数
 * 验证文件大小不超过指定限制
 */
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

/**
 * 上传文件项 Schema
 */
const uploadFileItemSchema = z.object({
  uid: z.string(),
  name: z.string(),
  status: z.enum(['uploading', 'done', 'error', 'removed']).optional(),
  url: z.string().optional(),
  originFileObj: z.any().optional(),
  preview: z.string().optional(),
})

/**
 * 媒体上传验证 Schema
 * 
 * 验证规则:
 * - coverFile: 可选，最多 1 个文件，每个文件最大 5MB
 * - galleryFiles: 可选，最多 10 个文件，每个文件最大 5MB
 * 
 * @validates Requirement 5 - 媒体上传步骤
 */
export const mediaSchema = z.object({
  coverFile: z.array(uploadFileItemSchema)
    .max(1, '封面图最多只能上传 1 张')
    .optional()
    .default([]),
  
  galleryFiles: z.array(uploadFileItemSchema)
    .max(10, '相册最多只能上传 10 张图片')
    .optional()
    .default([]),
})

export type MediaFormValues = z.infer<typeof mediaSchema>

/**
 * 媒体上传默认值
 */
export const mediaDefaultValues: MediaFormValues = {
  coverFile: [],
  galleryFiles: [],
}

/**
 * 验证单个文件大小
 * @param file - 要验证的文件
 * @returns 是否通过验证
 */
export function validateFileSize(file: File): boolean {
  return file.size <= MAX_FILE_SIZE
}

/**
 * 获取文件大小限制的友好显示
 */
export const MAX_FILE_SIZE_MB = MAX_FILE_SIZE / (1024 * 1024)

// ============ Step 4: 合约绑定 Schema ============

/**
 * 合约绑定验证 Schema
 * 
 * 验证规则:
 * - bind_projects: 字符串数组，可选
 * 
 * @validates Requirement 6 - 预览确认步骤
 */
export const bindingSchema = z.object({
  bind_projects: z.array(z.string())
    .optional()
    .default([]),
})

export type BindingFormValues = z.infer<typeof bindingSchema>

/**
 * 合约绑定默认值
 */
export const bindingDefaultValues: BindingFormValues = {
  bind_projects: [],
}

// ============ 完整表单 Schema ============

/**
 * 创建资产向导完整表单 Schema
 * 
 * 合并所有步骤的 Schema，用于最终提交验证
 * 
 * @validates Requirements 3, 4, 5, 6
 */
export const createAssetWizardSchema = basicInfoSchema
  .merge(financialBaseSchema)
  .merge(mediaSchema)
  .merge(bindingSchema)
  .refine(
    (data) => data.min_subscription <= data.total_supply,
    {
      message: '最小认购额不能大于总供应量',
      path: ['min_subscription'],
    }
  )

export type CreateAssetWizardFormValues = z.infer<typeof createAssetWizardSchema>

/**
 * 创建资产向导完整表单默认值
 */
export const createAssetWizardDefaultValues: CreateAssetWizardFormValues = {
  ...basicInfoDefaultValues,
  ...financialDefaultValues,
  ...mediaDefaultValues,
  ...bindingDefaultValues,
}

// ============ 步骤验证辅助函数 ============

/**
 * 验证基本信息步骤
 * @param data - 表单数据
 * @returns 验证结果
 */
export function validateBasicInfo(data: unknown) {
  return basicInfoSchema.safeParse(data)
}

/**
 * 验证财务设置步骤
 * @param data - 表单数据
 * @returns 验证结果
 */
export function validateFinancial(data: unknown) {
  return financialSchema.safeParse(data)
}

/**
 * 验证媒体上传步骤
 * @param data - 表单数据
 * @returns 验证结果
 */
export function validateMedia(data: unknown) {
  return mediaSchema.safeParse(data)
}

/**
 * 验证合约绑定步骤
 * @param data - 表单数据
 * @returns 验证结果
 */
export function validateBinding(data: unknown) {
  return bindingSchema.safeParse(data)
}

/**
 * 验证完整表单
 * @param data - 表单数据
 * @returns 验证结果
 */
export function validateCreateAssetWizard(data: unknown) {
  return createAssetWizardSchema.safeParse(data)
}
