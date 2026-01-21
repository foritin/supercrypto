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
