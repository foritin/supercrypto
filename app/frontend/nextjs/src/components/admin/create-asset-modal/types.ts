/**
 * CreateAssetModal 类型定义
 */
import type { UploadFile } from 'antd'
import type { AssetType, ProjectContractInfo } from '@/services/asset'

// 表单值类型定义
export interface AssetFormValues {
  name: string
  symbol: string
  asset_type: AssetType
  description?: string
  location?: string
  total_supply: number
  min_subscription?: number
  current_price?: number
  apy_3m?: number
  apy_6m?: number
  apy_12m?: number
  bind_projects?: string[]
}

// 媒体类型配置
export const MEDIA_CATEGORIES = {
  cover: { label: '封面图', accept: 'image/*', maxCount: 1, required: false },
  gallery: { label: '相册', accept: 'image/*', maxCount: 10, required: false },
  valuation: { label: '估值报告', accept: '.pdf,.doc,.docx', maxCount: 5, required: true },
  legal: { label: '法律文件', accept: '.pdf,.doc,.docx', maxCount: 10, required: true },
} as const

export type MediaCategory = keyof typeof MEDIA_CATEGORIES

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
  coverFile: UploadFile[]
  galleryFiles: UploadFile[]
  onCoverChange: (fileList: UploadFile[]) => void
  onGalleryChange: (fileList: UploadFile[]) => void
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
}
