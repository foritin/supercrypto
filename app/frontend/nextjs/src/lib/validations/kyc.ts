import { z } from 'zod'

/**
 * KYC form validation schemas
 * Validates: Requirements 4.2 - Form validation using zod schemas
 */

// ID type enum
export const idTypeEnum = z.enum(['passport', 'id_card', 'driver_license'])
export type IdType = z.infer<typeof idTypeEnum>

// ID type display names (Chinese)
export const ID_TYPE_NAMES: Record<IdType, string> = {
  passport: '护照',
  id_card: '身份证',
  driver_license: '驾驶证',
}

/**
 * Schema for KYC application form
 */
export const kycApplySchema = z.object({
  full_name: z.string().min(1, '姓名不能为空'),
  id_type: idTypeEnum,
  id_number: z.string().min(1, '证件号码不能为空'),
  country: z.string().min(1, '国家/地区不能为空'),
  is_accredited: z.boolean().default(false),
})

export type KycApplyFormValues = z.infer<typeof kycApplySchema>

/**
 * Default values for the KYC application form
 */
export const kycApplyDefaultValues: Partial<KycApplyFormValues> = {
  full_name: '',
  id_type: 'passport',
  id_number: '',
  country: '',
  is_accredited: false,
}

/**
 * Schema for KYC status update (admin)
 */
export const kycStatusUpdateSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']),
  rejection_reason: z.string().optional(),
})

export type KycStatusUpdateFormValues = z.infer<typeof kycStatusUpdateSchema>
