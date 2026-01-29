/**
 * Form validation schemas index
 * Exports all zod schemas for form validation
 * Validates: Requirements 4.2 - Form validation using zod schemas
 */

// Asset schemas
export {
  assetTypeEnum,
  createAssetSchema,
  updateAssetSchema,
  createAssetDefaultValues,
  ASSET_TYPE_NAMES,
  type AssetType,
  type CreateAssetFormValues,
  type UpdateAssetFormValues,
} from './asset'

// KYC schemas
export {
  idTypeEnum,
  kycApplySchema,
  kycApplyDefaultValues,
  kycStatusUpdateSchema,
  ID_TYPE_NAMES,
  type IdType,
  type KycApplyFormValues,
  type KycStatusUpdateFormValues,
} from './kyc'

// Price schemas
export {
  priceSourceEnum,
  priceUpdateSchema,
  priceUpdateDefaultValues,
  batchPriceUpdateSchema,
  PRICE_SOURCE_NAMES,
  type PriceSource,
  type PriceUpdateFormValues,
  type BatchPriceUpdateFormValues,
} from './price'

// Create Asset Wizard schemas
export {
  // Schemas
  wizardAssetTypeEnum,
  basicInfoSchema,
  financialSchema,
  mediaSchema,
  bindingSchema,
  createAssetWizardSchema,
  // Default values
  basicInfoDefaultValues,
  financialDefaultValues,
  mediaDefaultValues,
  bindingDefaultValues,
  createAssetWizardDefaultValues,
  // Constants
  WIZARD_ASSET_TYPE_NAMES,
  MAX_FILE_SIZE_MB,
  // Validation helpers
  validateBasicInfo,
  validateFinancial,
  validateMedia,
  validateBinding,
  validateCreateAssetWizard,
  validateFileSize,
  // Types
  type WizardAssetType,
  type BasicInfoFormValues,
  type FinancialFormValues,
  type MediaFormValues,
  type BindingFormValues,
  type CreateAssetWizardFormValues,
} from './create-asset-wizard'

// KYC Wizard schemas
export {
  // Schemas
  kycIdTypeEnum,
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  kycWizardSchema,
  // Default values
  step1DefaultValues,
  step2DefaultValues,
  step3DefaultValues,
  step4DefaultValues,
  kycWizardDefaultValues,
  // Constants
  KYC_ID_TYPE_NAMES,
  KYC_MAX_FILE_SIZE,
  KYC_MAX_FILE_SIZE_MB,
  KYC_ACCEPTED_FILE_TYPES,
  KYC_ACCEPTED_EXTENSIONS,
  // Validation helpers
  calculateAge,
  validateStep1,
  validateStep2,
  validateStep3,
  validateStep4,
  validateKycWizard,
  validateFileType,
  validateFileSize as validateKycFileSize,
  validateKycFile,
  // Types
  type KycIdType,
  type Step1FormValues,
  type Step2FormValues,
  type Step3FormValues,
  type Step4FormValues,
  type KycWizardFormData,
} from './kyc-wizard'
