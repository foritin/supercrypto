/**
 * CreateAssetModal 类型定义
 * Migrated from Ant Design to shadcn/ui
 */
import type { AssetType, ProjectContractInfo } from '@/services/asset'
import type { CreateAssetModalFormValues } from '@/lib/validations/asset'

// Re-export form values type for convenience
export type { CreateAssetModalFormValues as AssetFormValues }

// 媒体类型配置
export const MEDIA_CATEGORIES = {
  cover: { label: '封面图', accept: 'image/*', maxCount: 1, required: false },
  gallery: { label: '相册', accept: 'image/*', maxCount: 10, required: false },
  valuation: { label: '估值报告', accept: '.pdf,.doc,.docx', maxCount: 5, required: true },
  legal: { label: '法律文件', accept: '.pdf,.doc,.docx', maxCount: 10, required: true },
} as const

export type MediaCategory = keyof typeof MEDIA_CATEGORIES

// File type for upload (replacing Ant Design UploadFile)
export interface UploadFileItem {
  uid: string
  name: string
  status?: 'uploading' | 'done' | 'error' | 'removed'
  url?: string
  originFileObj?: File
  preview?: string
}

// Modal Props
export interface CreateAssetModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  availableProjects: ProjectContractInfo[]
  isLoadingProjects: boolean
}

// FormSection Props
export interface FormSectionProps {
  icon: React.ReactNode
  title: string
  description?: string
  children: React.ReactNode
  extra?: React.ReactNode
}

// 媒体上传区域 Props
export interface MediaUploadSectionProps {
  coverFile: UploadFileItem[]
  galleryFiles: UploadFileItem[]
  onCoverChange: (fileList: UploadFileItem[]) => void
  onGalleryChange: (fileList: UploadFileItem[]) => void
  beforeUpload: (file: File, maxSize?: number) => boolean
}

// 项目绑定区域 Props
export interface ProjectBindingSectionProps {
  availableProjects: ProjectContractInfo[]
  isLoadingProjects: boolean
  selectedProjects: string[]
  selectedContracts: Array<{
    contract_name: string
    contract_address: string
    contract_type?: string
    is_available: boolean
  }>
  onProjectsChange: (projects: string[]) => void
}
