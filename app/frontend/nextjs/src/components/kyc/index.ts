export { KycStatusCard } from './kyc-status-card'
export type { KycStatusCardProps } from './kyc-status-card'
export { KycRequiredGuard, useKycRequired } from './kyc-required-guard'
export type { KycRequiredGuardProps } from './kyc-required-guard'
export { KycStepper } from './kyc-stepper'
export type { KycStepperProps } from './kyc-stepper'
export { IDCardUploader } from './id-card-uploader'
export type { IDCardUploaderProps, IdType, IdSide } from './id-card-uploader'
export { LivenessDetector, BrowserLivenessDetector, ThirdPartyLivenessDetector } from './liveness-detector'
export type {
  LivenessDetectorProps,
  LivenessResult,
  LivenessError,
  ILivenessDetector,
  ThirdPartyConfig,
} from './liveness-detector'
export { ManualSelfieUpload } from './manual-selfie-upload'
export type { ManualSelfieUploadProps } from './manual-selfie-upload'

// Step components
export { Step1BasicInfo, COUNTRY_LIST } from './steps/step1-basic-info'
export type { Step1BasicInfoProps } from './steps/step1-basic-info'

export { Step2DocumentUpload } from './steps/step2-document-upload'
export type { Step2DocumentUploadProps } from './steps/step2-document-upload'

export { Step3SelfieVerification } from './steps/step3-selfie-verification'
export type { Step3SelfieVerificationProps } from './steps/step3-selfie-verification'

export { Step4Confirmation } from './steps/step4-confirmation'
export type { Step4ConfirmationProps } from './steps/step4-confirmation'

// Wizard container
export { KycWizard } from './kyc-wizard'
export type { KycWizardProps } from './kyc-wizard'

