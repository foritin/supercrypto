/**
 * Asset API Service - RWA 资产相关 API
 *
 * 路由变更：
 * - 公开接口：/public/assets/*
 * - 管理员接口：/admin/assets/*
 */
import { api } from '@/services/api'
import { PUBLIC_PATHS, ADMIN_PATHS } from '@/constants/api-paths'

export type AssetStatus = 'active' | 'paused' | 'sold_out' | 'closed'
export type AssetType = 'real_estate' | 'bond' | 'commodity' | 'equity' | 'other'
export type MediaType = 'image' | 'cover' | 'floor_plan' | 'evaluation' | 'document' | 'video'

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
  image_url: string | null
  current_price: number
  apy_3m: number
  apy_6m: number
  apy_12m: number
  status: AssetStatus
  total_supply: number
  subscribed_amount: number
  subscription_progress: number
  is_available: boolean
}

export interface ContractBindingItem {
  contract_name: string
  contract_address: string
  contract_type: 'common' | 'project'
  is_primary: boolean
}

export interface AssetDetail {
  id: number
  name: string
  symbol: string
  description: string | null
  asset_type: AssetType
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
  apy_3m: number
  apy_6m: number
  apy_12m: number
  project: string | null
  bound_contracts: ContractBindingItem[] | null
  contract_address: string | null
  status: AssetStatus
  is_available: boolean
  environment: string
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
export interface AssetListQuery {
  status?: AssetStatus
  asset_type?: AssetType
  page?: number
  page_size?: number
}
export interface AssetCreateRequest {
  name: string
  symbol: string
  description?: string
  asset_type: AssetType
  image_url?: string
  document_url?: string
  location?: string
  total_supply: number
  min_subscription?: number
  current_price?: number
  apy_3m?: number
  apy_6m?: number
  apy_12m?: number
  contract_address?: string
}
export interface AssetUpdateRequest {
  name?: string
  symbol?: string
  description?: string
  asset_type?: AssetType
  image_url?: string
  document_url?: string
  location?: string
  total_supply?: number
  min_subscription?: number
  current_price?: number
  apy_3m?: number
  apy_6m?: number
  apy_12m?: number
  contract_address?: string
}

export const assetService = {
  // ============ 公开接口 ============

  async getAssets(query: AssetListQuery = {}) {
    const params = new URLSearchParams()
    if (query.status) params.append('status', query.status)
    if (query.asset_type) params.append('asset_type', query.asset_type)
    if (query.page) params.append('page', query.page.toString())
    if (query.page_size) params.append('page_size', query.page_size.toString())
    const url = PUBLIC_PATHS.ASSETS + (params.toString() ? '?' + params.toString() : '')
    const response = await api.get<API.ResponseData<AssetListItem>>(url)
    return {
      items: response.list || [],
      pagination: response.pagination || { total: 0, page: 1, page_size: 10, total_pages: 0 },
    }
  },

  async getAsset(id: number): Promise<AssetDetail> {
    return (await api.get<API.ResponseData<AssetDetail>>(PUBLIC_PATHS.ASSET_DETAIL(id)))
      .object as AssetDetail
  },

  async getAssetBySymbol(symbol: string): Promise<AssetDetail> {
    return (await api.get<API.ResponseData<AssetDetail>>(PUBLIC_PATHS.ASSET_BY_SYMBOL(symbol)))
      .object as AssetDetail
  },

  async getPriceHistory(assetId: number, limit = 50): Promise<PriceHistoryItem[]> {
    return (
      (await api.get<API.ResponseData<PriceHistoryItem>>(
        PUBLIC_PATHS.ASSET_PRICE_HISTORY(assetId, limit)
      )).list || []
    )
  },

  async getAssetMedia(assetId: number): Promise<AssetMediaItem[]> {
    return (
      (await api.get<API.ResponseData<AssetMediaItem>>(PUBLIC_PATHS.ASSET_MEDIA(assetId))).list ||
      []
    )
  },

  // ============ 管理员接口 ============

  async createAsset(data: AssetCreateRequest): Promise<AssetDetail> {
    return (await api.post<API.ResponseData<AssetDetail>>(ADMIN_PATHS.ASSETS, data))
      .object as AssetDetail
  },

  async updateAsset(id: number, data: AssetUpdateRequest): Promise<AssetDetail> {
    return (await api.put<API.ResponseData<AssetDetail>>(ADMIN_PATHS.ASSET_DETAIL(id), data))
      .object as AssetDetail
  },

  async updateAssetStatus(id: number, status: AssetStatus): Promise<AssetDetail> {
    return (
      await api.patch<API.ResponseData<AssetDetail>>(ADMIN_PATHS.ASSET_STATUS(id), { status })
    ).object as AssetDetail
  },

  async updateAssetPrice(id: number, price: number, source = 'manual'): Promise<AssetDetail> {
    return (
      await api.post<API.ResponseData<AssetDetail>>(
        ADMIN_PATHS.ASSET_PRICE(id, price, source),
        {}
      )
    ).object as AssetDetail
  },

  async getAvailableProjects(): Promise<ProjectContractInfo[]> {
    return (await api.get<API.ResponseData<ProjectContractInfo>>(ADMIN_PATHS.ASSET_PROJECTS))
      .list || []
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
    ).object as AssetDetail
  },

  async unbindContracts(
    assetId: number,
    options: { contract_names?: string[]; project?: string; unbind_all?: boolean }
  ): Promise<AssetDetail> {
    return (
      await api.delete<API.ResponseData<AssetDetail>>(ADMIN_PATHS.ASSET_UNBIND(assetId), {
        data: options,
      })
    ).object as AssetDetail
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
  image: 'Photos',
  cover: 'Cover',
  floor_plan: 'Floor Plan',
  evaluation: 'Evaluation Report',
  document: 'Documents',
  video: 'Video',
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
