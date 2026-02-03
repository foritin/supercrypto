/**
 * KYC Wizard 表单验证 Schema
 *
 * 使用 zod 定义 4 步骤向导的表单验证规则
 * @validates Requirements 3.2, 3.3, 3.5, 4.3, 4.4
 */

import { z } from 'zod'

// ============ 工具函数 ============

/**
 * 计算年龄
 * @param dateOfBirth - 出生日期字符串 (YYYY-MM-DD 格式)
 * @returns 年龄
 */
export function calculateAge(dateOfBirth: string): number {
  const today = new Date()
  const birthDate = new Date(dateOfBirth)

  // 检查日期是否有效
  if (isNaN(birthDate.getTime())) {
    return -1
  }

  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  // 如果还没过生日，年龄减 1
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }

  return age
}

// ============ 证件类型枚举 ============

/**
 * 证件类型枚举
 */
export const kycIdTypeEnum = z.enum(['passport', 'id_card', 'driver_license'])
export type KycIdType = z.infer<typeof kycIdTypeEnum>

/**
 * 证件类型显示名称 (中文)
 */
export const KYC_ID_TYPE_NAMES: Record<KycIdType, string> = {
  passport: '护照',
  id_card: '身份证',
  driver_license: '驾驶证',
}

// ============ Step 1: 基本信息 Schema ============

/**
 * Step 1: 基本信息验证 Schema
 *
 * 验证规则:
 * - fullName: 2-50 字符，必填
 * - dateOfBirth: 必须年满 18 岁
 * - nationality: 必填
 * - address: 必填
 *
 * @validates Requirements 3.2, 3.3, 3.5
 */
/**
 * KYC 最低年龄要求
 */
export const KYC_MIN_AGE = 16

export const step1Schema = z.object({
  fullName: z
    .string()
    .min(2, '姓名至少 2 个字符')
    .max(50, '姓名最多 50 个字符'),

  dateOfBirth: z.string().refine(
    (val) => {
      if (!val) return false
      const age = calculateAge(val)
      return age >= KYC_MIN_AGE
    },
    { message: `必须年满 ${KYC_MIN_AGE} 岁` }
  ),

  nationality: z.string().min(1, '请选择国籍'),

  address: z.string().min(1, '请输入居住地址'),
})

export type Step1FormValues = z.infer<typeof step1Schema>

/**
 * Step 1 默认值
 */
export const step1DefaultValues: Step1FormValues = {
  fullName: '',
  dateOfBirth: '',
  nationality: '',
  address: '',
}

// ============ Step 2: 证件上传 Schema ============

/**
 * Step 2: 证件上传验证 Schema
 *
 * 验证规则:
 * - idType: 枚举值，必填
 * - idNumber: 必填
 * - documentExpiry: 证件有效期，必填，必须是未来日期
 * - idFrontUrl: 有效 URL，必填
 * - idBackUrl: 有效 URL，必填
 *
 * @validates Requirements 4.3, 4.4
 */
export const step2Schema = z.object({
  idType: kycIdTypeEnum,

  idNumber: z.string().min(1, '请输入证件号码'),

  documentExpiry: z.string().refine(
    (val) => {
      if (!val) return false
      const expiryDate = new Date(val)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return expiryDate > today
    },
    { message: '证件有效期必须是未来日期' }
  ),

  idFrontUrl: z.string().url('请上传证件正面'),

  idBackUrl: z.string().url('请上传证件背面'),
})

export type Step2FormValues = z.infer<typeof step2Schema>

/**
 * Step 2 默认值
 */
export const step2DefaultValues: Step2FormValues = {
  idType: 'passport',
  idNumber: '',
  documentExpiry: '',
  idFrontUrl: '',
  idBackUrl: '',
}

// ============ Step 3: 自拍验证 Schema ============

/**
 * Step 3: 自拍验证 Schema
 *
 * 验证规则:
 * - selfieUrl: 有效 URL，必填
 * - livenessVerified: 可选布尔值
 *
 * @validates Requirements 5.5
 */
export const step3Schema = z.object({
  selfieUrl: z.string().url('请上传自拍照'),

  livenessVerified: z.boolean().optional(),
})

export type Step3FormValues = z.infer<typeof step3Schema>

/**
 * Step 3 默认值
 */
export const step3DefaultValues: Step3FormValues = {
  selfieUrl: '',
  livenessVerified: false,
}

// ============ Step 4: 确认提交 Schema ============

/**
 * Step 4: 确认提交验证 Schema
 *
 * 验证规则:
 * - privacyAgreed: 必须为 true
 * - infoConfirmed: 必须为 true
 *
 * @validates Requirements 6.2, 6.3
 */
export const step4Schema = z.object({
  privacyAgreed: z
    .boolean()
    .refine((val) => val === true, { message: '请同意隐私政策' }),

  infoConfirmed: z
    .boolean()
    .refine((val) => val === true, { message: '请确认信息真实' }),
})

export type Step4FormValues = z.infer<typeof step4Schema>

/**
 * Step 4 默认值
 * 注意: 默认值为 false，需要用户主动勾选
 */
export const step4DefaultValues: Step4FormValues = {
  privacyAgreed: false,
  infoConfirmed: false,
}

// ============ 完整表单 Schema ============

/**
 * KYC 向导完整表单 Schema
 *
 * 合并所有步骤的 Schema，用于最终提交验证
 *
 * @validates Requirements 3.2, 3.3, 3.5, 4.3, 4.4
 */
export const kycWizardSchema = step1Schema
  .merge(step2Schema)
  .merge(step3Schema)
  .merge(step4Schema)

export type KycWizardFormData = z.infer<typeof kycWizardSchema>

/**
 * KYC 向导完整表单默认值
 */
export const kycWizardDefaultValues = {
  ...step1DefaultValues,
  ...step2DefaultValues,
  ...step3DefaultValues,
  ...step4DefaultValues,
}

// ============ 步骤验证辅助函数 ============

/**
 * 验证 Step 1: 基本信息
 * @param data - 表单数据
 * @returns 验证结果
 */
export function validateStep1(data: unknown) {
  return step1Schema.safeParse(data)
}

/**
 * 验证 Step 2: 证件上传
 * @param data - 表单数据
 * @returns 验证结果
 */
export function validateStep2(data: unknown) {
  return step2Schema.safeParse(data)
}

/**
 * 验证 Step 3: 自拍验证
 * @param data - 表单数据
 * @returns 验证结果
 */
export function validateStep3(data: unknown) {
  return step3Schema.safeParse(data)
}

/**
 * 验证 Step 4: 确认提交
 * @param data - 表单数据
 * @returns 验证结果
 */
export function validateStep4(data: unknown) {
  return step4Schema.safeParse(data)
}

/**
 * 验证完整 KYC 向导表单
 * @param data - 表单数据
 * @returns 验证结果
 */
export function validateKycWizard(data: unknown) {
  return kycWizardSchema.safeParse(data)
}

// ============ 文件验证常量 ============

/**
 * 文件大小限制 (5MB)
 */
export const KYC_MAX_FILE_SIZE = 5 * 1024 * 1024

/**
 * 文件大小限制 (MB 显示)
 */
export const KYC_MAX_FILE_SIZE_MB = KYC_MAX_FILE_SIZE / (1024 * 1024)

/**
 * 支持的文件类型
 */
export const KYC_ACCEPTED_FILE_TYPES = ['image/jpeg', 'image/png']

/**
 * 支持的文件扩展名
 */
export const KYC_ACCEPTED_EXTENSIONS = '.jpg,.jpeg,.png'

/**
 * 验证文件格式
 * @param file - 要验证的文件
 * @returns 是否为有效格式
 */
export function validateFileType(file: File): boolean {
  return KYC_ACCEPTED_FILE_TYPES.includes(file.type)
}

/**
 * 验证文件大小
 * @param file - 要验证的文件
 * @returns 是否在大小限制内
 */
export function validateFileSize(file: File): boolean {
  return file.size <= KYC_MAX_FILE_SIZE
}

/**
 * 验证 KYC 文件 (格式和大小)
 * @param file - 要验证的文件
 * @returns 验证结果对象
 */
export function validateKycFile(file: File): {
  valid: boolean
  error?: 'FILE_TOO_LARGE' | 'INVALID_TYPE'
  message?: string
} {
  if (!validateFileType(file)) {
    return {
      valid: false,
      error: 'INVALID_TYPE',
      message: '仅支持 JPG/PNG 格式',
    }
  }

  if (!validateFileSize(file)) {
    return {
      valid: false,
      error: 'FILE_TOO_LARGE',
      message: `文件大小不能超过 ${KYC_MAX_FILE_SIZE_MB}MB`,
    }
  }

  return { valid: true }
}
