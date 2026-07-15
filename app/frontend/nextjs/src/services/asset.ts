/**
 * Asset API Service - RWA 资产相关 API
 *
 * 路由变更：
 * - 公开接口：/public/assets/*
 * - 管理员接口：/admin/assets/*
 */
import { PUBLIC_PATHS, ADMIN_PATHS } from '@/constants/api-paths'
import { api } from '@/services/api'

export type AssetStatus = 'active' | 'paused' | 'sold_out' | 'closed'
export type AssetType = 'real_estate' | 'bond' | 'commodity' | 'equity' | 'other'
export type AssetSubscriptionMode = 'current' | 'fixed' | 'both'
export type FrameStyle = 'green' | 'blue' | 'gold' | 'purple' | 'gray'
// MVP 媒体类型 - 与后端 MediaType 枚举同步
export type MediaType = 'cover' | 'gallery' | 'valuation' | 'legal' | 'financial' | 'floor_plan' | 'video' | 'other' | 'logo'

export interface AssetMediaItem {
  id: number
  media_type: MediaType
  title: string | null
  description: string | null
  url: string
  thumbnail_url: string | null
  file_name: string | null
  sort_order: number
  is_primary: boolean
}

export interface MediaBatchUploadResult {
  success: boolean
  file_name: string
  media: AssetMediaItem | null
  error: string | null
}

export interface MediaBatchUploadResponse {
  total: number
  success_count: number
  failed_count: number
  results: MediaBatchUploadResult[]
}

export interface MediaBatchDeleteResult {
  media_id: number
  success: boolean
  error: string | null
}

export interface MediaBatchDeleteResponse {
  total: number
  success_count: number
  failed_count: number
  results: MediaBatchDeleteResult[]
}

export interface AssetFeaturesData {
  bedrooms: number | null
  bathrooms: number | null
  sqft: number | null
  sqm: number | null
  lot_size: number | null
  year_built: number | null
  year_renovated: number | null
  property_type: 'single_family' | 'multi_family' | 'condo' | 'commercial' | null
  stories: number | null
  rental_status: 'occupied' | 'vacant' | 'partial' | null
  monthly_rent: number | null
  lease_end_date: string | null
  amenities: string[] | null
  neighborhood: {
    schools?: string[]
    transit?: string[]
    shopping?: string[]
    description?: string
  } | null
}

export interface AssetListItem {
  id: number
  name: string
  symbol: string
  asset_type: AssetType
  subscription_mode: AssetSubscriptionMode
  image_url: string | null
  cover_image_url: string | null  // 封面图预签名 URL（从 AssetMedia 获取）
  logo_url: string | null  // Logo 预签名 URL（从 AssetMedia 获取）
  frame_style: FrameStyle | null  // Logo 边框样式
  current_price: number
  apy_3m: number
  apy_6m: number
  apy_12m: number
  status: AssetStatus
  total_supply: number
  subscribed_amount: number
  subscription_progress: number
  subscription_start_at: string | null
  subscription_end_at: string | null
  is_available: boolean
  contract_address: string | null
}

export interface ContractBindingItem {
  contract_name: string
  contract_address: string
  contract_type: 'common' | 'project'
  is_primary: boolean
}

export interface RecentInvestor {
  wallet_address: string
  amount: number
  invested_at: string
}

export interface AssetDetail {
  id: number
  chain_id?: number
  risk_level?: 'low' | 'medium' | 'high'
  name: string
  symbol: string
  description: string | null
  asset_type: AssetType
  subscription_mode: AssetSubscriptionMode
  image_url: string | null
  document_url: string | null
  location: string | null
  current_price: number
  price_updated_at: string | null
  total_supply: number
  subscribed_amount: number
  min_subscription: number
  remaining_amount: number
  subscription_progress: number
  subscription_start_at: string | null
  subscription_end_at: string | null
  apy_3m: number
  apy_6m: number
  apy_12m: number
  project: string | null
  bound_contracts: ContractBindingItem[] | null
  contract_address: string | null
  logo_url: string | null  // Logo 预签名 URL（从 AssetMedia 获取）
  frame_style: FrameStyle | null  // Logo 边框样式
  cover_image_url: string | null  // 封面图 URL（从 AssetMedia 获取）
  status: AssetStatus
  is_available: boolean
  environment: string
  // 投资者统计
  investor_count: number
  recent_investors: RecentInvestor[] | null
  // 时间
  created_at: string
  updated_at: string
  media?: AssetMediaItem[]
  features?: AssetFeaturesData | null
}

export interface PriceHistoryItem {
  id: number
  price: number
  source: string | null
  created_at: string
}

export interface MediaStats {
  total_count: number
  by_type: Record<MediaType, number>
  total_size_bytes: number
  has_cover: boolean
  has_valuation: boolean
  has_legal: boolean
}
export interface AssetListQuery {
  status?: AssetStatus
  asset_type?: AssetType
  subscription_mode?: AssetSubscriptionMode
  page?: number
  page_size?: number
}
export interface AssetCreateRequest {
  name: string
  symbol: string
  description?: string
  asset_type: AssetType
  subscription_mode?: AssetSubscriptionMode
  image_url?: string
  document_url?: string
  location?: string
  total_supply: number
  min_subscription?: number
  current_price?: number
  apy_3m?: number
  apy_6m?: number
  apy_12m?: number
  subscription_start_at?: string
  subscription_end_at?: string
  contract_address?: string
  frame_style?: FrameStyle
}
export interface AssetUpdateRequest {
  name?: string
  symbol?: string
  description?: string
  asset_type?: AssetType
  subscription_mode?: AssetSubscriptionMode
  image_url?: string
  document_url?: string
  location?: string
  total_supply?: number
  min_subscription?: number
  current_price?: number
  apy_3m?: number
  apy_6m?: number
  apy_12m?: number
  subscription_start_at?: string | null
  subscription_end_at?: string | null
  contract_address?: string
  frame_style?: FrameStyle
}

export const assetService = {
  // ============ 公开接口 ============

  async getAssets(query: AssetListQuery = {}) {
    const params = new URLSearchParams()
    if (query.status) params.append('status', query.status)
    if (query.asset_type) params.append('asset_type', query.asset_type)
    if (query.subscription_mode) params.append('subscription_mode', query.subscription_mode)
    if (query.page) params.append('page', query.page.toString())
    if (query.page_size) params.append('page_size', query.page_size.toString())
    const url = PUBLIC_PATHS.ASSETS + (params.toString() ? '?' + params.toString() : '')
    const response = await api.get<API.ResponseData<AssetListItem>>(url)
    return {
      items: response.list_data || [],
      pagination: response.pagination || { total: 0, page: 1, page_size: 10, total_pages: 0 },
    }
  },

  async getAsset(id: number): Promise<AssetDetail> {
    return (await api.get<API.ResponseData<AssetDetail>>(PUBLIC_PATHS.ASSET_DETAIL(id)))
      .object_data as AssetDetail
  },

  async getAssetBySymbol(symbol: string): Promise<AssetDetail> {
    return (await api.get<API.ResponseData<AssetDetail>>(PUBLIC_PATHS.ASSET_BY_SYMBOL(symbol)))
      .object_data as AssetDetail
  },

  async getPriceHistory(assetId: number, limit = 50): Promise<PriceHistoryItem[]> {
    return (
      (await api.get<API.ResponseData<PriceHistoryItem>>(
        PUBLIC_PATHS.ASSET_PRICE_HISTORY(assetId, limit)
      )).list_data || []
    )
  },

  async getAssetMedia(assetId: number): Promise<AssetMediaItem[]> {
    return (
      (await api.get<API.ResponseData<AssetMediaItem>>(PUBLIC_PATHS.ASSET_MEDIA(assetId))).list_data ||
      []
    )
  },

  // ============ 管理员接口 ============

  /**
   * 获取资产列表 (管理员)
   * 返回所有资产，包括未绑定合约的资产
   */
  async getAssetsAdmin(query: AssetListQuery = {}) {
    const params = new URLSearchParams()
    if (query.status) params.append('status', query.status)
    if (query.asset_type) params.append('asset_type', query.asset_type)
    if (query.subscription_mode) params.append('subscription_mode', query.subscription_mode)
    if (query.page) params.append('page', query.page.toString())
    if (query.page_size) params.append('page_size', query.page_size.toString())
    const url = ADMIN_PATHS.ASSETS + (params.toString() ? '?' + params.toString() : '')
    const response = await api.get<API.ResponseData<AssetListItem>>(url)
    return {
      items: response.list_data || [],
      pagination: response.pagination || { total: 0, page: 1, page_size: 10, total_pages: 0 },
    }
  },

  /**
   * 获取资产详情 (管理员)
   * 可以获取所有资产，包括未绑定合约的资产
   */
  async getAssetAdmin(id: number): Promise<AssetDetail> {
    return (await api.get<API.ResponseData<AssetDetail>>(ADMIN_PATHS.ASSET_DETAIL(id)))
      .object_data as AssetDetail
  },

  async createAsset(data: AssetCreateRequest): Promise<AssetDetail> {
    return (await api.post<API.ResponseData<AssetDetail>>(ADMIN_PATHS.ASSETS, data))
      .object_data as AssetDetail
  },

  async updateAsset(id: number, data: AssetUpdateRequest): Promise<AssetDetail> {
    return (await api.put<API.ResponseData<AssetDetail>>(ADMIN_PATHS.ASSET_DETAIL(id), data))
      .object_data as AssetDetail
  },

  async updateAssetStatus(id: number, status: AssetStatus): Promise<AssetDetail> {
    return (
      await api.patch<API.ResponseData<AssetDetail>>(ADMIN_PATHS.ASSET_STATUS(id), { status })
    ).object_data as AssetDetail
  },

  /**
   * 永久删除资产 (管理员危险操作)
   * 会清理所有关联数据和 MinIO 文件
   */
  async deleteAsset(id: number): Promise<{ id: number; name: string; symbol: string; deleted_files: number; deleted_media: number }> {
    return (
      await api.delete<API.ResponseData<{ id: number; name: string; symbol: string; deleted_files: number; deleted_media: number }>>(
        ADMIN_PATHS.ASSET_DETAIL(id)
      )
    ).object_data as { id: number; name: string; symbol: string; deleted_files: number; deleted_media: number }
  },

  async updateAssetPrice(id: number, price: number, source = 'manual'): Promise<AssetDetail> {
    return (
      await api.post<API.ResponseData<AssetDetail>>(
        ADMIN_PATHS.ASSET_PRICE(id),
        { price, source }
      )
    ).object_data as AssetDetail
  },

  async getAvailableProjects(): Promise<ProjectContractInfo[]> {
    return (await api.get<API.ResponseData<ProjectContractInfo>>(ADMIN_PATHS.ASSET_PROJECTS))
      .list_data || []
  },

  async bindProjectContracts(
    assetId: number,
    project: string,
    contractNames?: string[],
    setPrimary = true
  ): Promise<AssetDetail> {
    return (
      await api.post<API.ResponseData<AssetDetail>>(ADMIN_PATHS.ASSET_BIND_PROJECT(assetId), {
        project,
        contract_names: contractNames,
        set_primary: setPrimary,
      })
    ).object_data as AssetDetail
  },

  async unbindContracts(
    assetId: number,
    options: { contract_names?: string[]; project?: string; unbind_all?: boolean }
  ): Promise<AssetDetail> {
    // 注意：api.delete 内部会将 body 放入 { data: body }，所以这里直接传 options
    return (
      await api.delete<API.ResponseData<AssetDetail>>(ADMIN_PATHS.ASSET_UNBIND(assetId), options)
    ).object_data as AssetDetail
  },

  // ============ 媒体管理接口 ============

  /**
   * 获取资产媒体列表 (Admin)
   */
  async getAssetMediaAdmin(assetId: number, mediaType?: MediaType): Promise<AssetMediaItem[]> {
    const params = mediaType ? `?media_type=${mediaType}` : ''
    return (
      (await api.get<API.ResponseData<AssetMediaItem>>(ADMIN_PATHS.ASSET_MEDIA(assetId) + params))
        .list_data || []
    )
  },

  /**
   * 获取媒体统计信息
   */
  async getMediaStats(assetId: number): Promise<MediaStats> {
    return (
      await api.get<API.ResponseData<MediaStats>>(ADMIN_PATHS.ASSET_MEDIA_STATS(assetId))
    ).object_data as MediaStats
  },

  /**
   * 批量上传媒体文件（复用连接，减少开销）
   * 即使只上传一个文件也使用此接口
   */
  async uploadMedia(
    assetId: number,
    files: File | File[],
    mediaType: MediaType
  ): Promise<MediaBatchUploadResponse> {
    const fileArray = Array.isArray(files) ? files : [files]
    const formData = new FormData()
    fileArray.forEach((file) => {
      formData.append('files', file)
    })
    formData.append('media_type', mediaType)

    return (
      await api.post<API.ResponseData<MediaBatchUploadResponse>>(
        ADMIN_PATHS.ASSET_MEDIA(assetId),
        formData
      )
    ).object_data as MediaBatchUploadResponse
  },

  /**
   * 批量删除媒体文件（复用连接，减少开销）
   * 即使只删除一个文件也使用此接口
   */
  async deleteMedia(
    assetId: number,
    mediaIds: number | number[]
  ): Promise<MediaBatchDeleteResponse> {
    const idArray = Array.isArray(mediaIds) ? mediaIds : [mediaIds]
    return (
      await api.post<API.ResponseData<MediaBatchDeleteResponse>>(
        `${ADMIN_PATHS.ASSET_MEDIA(assetId)}/delete`,
        { media_ids: idArray }
      )
    ).object_data as MediaBatchDeleteResponse
  },

  /**
   * 更新媒体信息
   */
  async updateMedia(
    assetId: number,
    mediaId: number,
    data: { title?: string; description?: string; is_primary?: boolean }
  ): Promise<AssetMediaItem> {
    return (
      await api.patch<API.ResponseData<AssetMediaItem>>(
        ADMIN_PATHS.ASSET_MEDIA_DETAIL(assetId, mediaId),
        data
      )
    ).object_data as AssetMediaItem
  },

  /**
   * 重新排序媒体
   */
  async reorderMedia(assetId: number, mediaIds: number[]): Promise<AssetMediaItem[]> {
    return (
      await api.put<API.ResponseData<AssetMediaItem>>(ADMIN_PATHS.ASSET_MEDIA_REORDER(assetId), {
        media_ids: mediaIds,
      })
    ).list_data as AssetMediaItem[]
  },
}

export interface ContractBindingStatus {
  contract_name: string
  contract_address: string
  contract_type: 'common' | 'mock' | 'exclusive'
  is_available: boolean
  bound_to_asset: string | null
  bound_to_asset_id: number | null
}
export interface ProjectContractInfo {
  project: string
  contract_count: number
  contracts: ContractBindingStatus[]
}

/**
 * 以下常量作为 fallback 使用
 * 推荐使用 useConstants hook 从后端 API 获取最新数据:
 * - useConstants('asset_type') 获取资产类型
 * - useConstants('asset_status') 获取资产状态
 * - useConstants('media_type') 获取媒体类型
 * @see src/hooks/useConstants.ts
 * @see src/lib/constants.ts (fallback 常量)
 */
export const ASSET_TYPE_NAMES: Record<AssetType, string> = {
  real_estate: 'Real Estate',
  bond: 'Bond',
  commodity: 'Commodity',
  equity: 'Equity',
  other: 'Other',
}
export const ASSET_STATUS_NAMES: Record<AssetStatus, string> = {
  active: 'Available',
  paused: 'Paused',
  sold_out: 'Sold Out',
  closed: 'Closed',
}
export const ASSET_STATUS_COLORS: Record<AssetStatus, string> = {
  active: 'green',
  paused: 'orange',
  sold_out: 'red',
  closed: 'default',
}
export const MEDIA_TYPE_NAMES: Record<MediaType, string> = {
  cover: 'Cover',
  gallery: 'Gallery',
  valuation: 'Valuation Report',
  legal: 'Legal Documents',
  financial: 'Financial Documents',
  floor_plan: 'Floor Plan',
  video: 'Video',
  other: 'Other Documents',
  logo: 'Logo',
}
export const PROPERTY_TYPE_NAMES: Record<string, string> = {
  single_family: 'Single Family',
  multi_family: 'Multi Family',
  condo: 'Condo',
  commercial: 'Commercial',
}
export const RENTAL_STATUS_NAMES: Record<string, string> = {
  occupied: 'Occupied',
  vacant: 'Vacant',
  partial: 'Partially Occupied',
}
export const AMENITY_ICONS: Record<string, string> = {
  parking: 'P',
  pool: 'Pool',
  gym: 'Gym',
  security: 'Security',
  garden: 'Garden',
  balcony: 'Balcony',
  elevator: 'Elevator',
  ac: 'AC',
  heating: 'Heating',
  laundry: 'Laundry',
  storage: 'Storage',
  pet_friendly: 'Pet Friendly',
}
