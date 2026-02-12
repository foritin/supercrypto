/**
 * AssetCardPreview - 资产卡片预览组件
 * 
 * 在向导预览步骤中展示资产卡片效果
 * 使用与用户端一致的卡片样式，确保所见即所得
 * 
 * @validates Requirements 6.1, 6.2, 6.6
 */
'use client'

import { Building2, Landmark, Package, TrendingUp, HelpCircle, MapPin, Image as ImageIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { AssetCardPreviewProps } from './types'
import type { AssetType } from '@/services/asset'

// ============ 常量定义 ============

/**
 * 资产类型图标映射
 */
const ASSET_TYPE_ICONS: Record<AssetType, React.ReactNode> = {
  real_estate: <Building2 className="w-5 h-5" />,
  bond: <Landmark className="w-5 h-5" />,
  commodity: <Package className="w-5 h-5" />,
  equity: <TrendingUp className="w-5 h-5" />,
  other: <HelpCircle className="w-5 h-5" />,
}

/**
 * 资产类型名称映射
 */
const ASSET_TYPE_NAMES: Record<AssetType, string> = {
  real_estate: 'Real Estate',
  bond: 'Bond',
  commodity: 'Commodity',
  equity: 'Equity',
  other: 'Other',
}

/**
 * 资产类型默认图片
 */
const ASSET_TYPE_IMAGES: Record<AssetType, string> = {
  real_estate: '/images/assets/real-estate-default.jpg',
  bond: '/images/assets/bond-default.jpg',
  commodity: '/images/assets/commodity-default.jpg',
  equity: '/images/assets/equity-default.jpg',
  other: '/images/assets/other-default.jpg',
}

// ============ 工具函数 ============

/**
 * 格式化 APY 显示
 */
function formatApy(value: number): string {
  return `${value.toFixed(1)}%`
}

/**
 * 格式化价格显示
 */
function formatPrice(value: number): string {
  return `$${value.toFixed(2)}`
}

// ============ 组件 ============

/**
 * AssetCardPreview 组件
 * 
 * 展示资产卡片预览，包含：
 * - 封面图或默认图片
 * - 资产类型徽章
 * - 资产名称和代币符号
 * - 位置信息（如有）
 * - 当前价格
 * - APY 信息 (3M, 6M, 12M)
 * 
 * @validates Requirements 6.2, 6.6
 */
export function AssetCardPreview({ data }: AssetCardPreviewProps) {
  const {
    name,
    symbol,
    asset_type,
    location,
    current_price,
    apy_3m,
    apy_6m,
    apy_12m,
    coverImage,
  } = data

  // 获取背景图片
  const bgImage = coverImage || ASSET_TYPE_IMAGES[asset_type] || ASSET_TYPE_IMAGES.other

  return (
    <div
      className={cn(
        'w-full max-w-[320px]',
        'bg-[rgba(17,25,22,0.6)]',
        'border border-white/[0.06]',
        'rounded-2xl overflow-hidden',
        'transition-all duration-300',
        'hover:border-primary/30',
        'hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)]'
      )}
    >
      {/* 图片区域 */}
      <div className="relative h-40 overflow-hidden">
        {/* 背景图片 */}
        {bgImage ? (
          <img
            src={bgImage}
            alt={name || 'Asset preview'}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-white/[0.02] flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-white/20" />
          </div>
        )}
        
        {/* 渐变遮罩 */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, rgba(10, 15, 13, 0.2) 0%, rgba(10, 15, 13, 0.85) 100%)'
          }}
        />

        {/* 类型徽章 */}
        <div
          className={cn(
            'absolute bottom-3 left-3',
            'w-9 h-9 rounded-lg',
            'flex items-center justify-center',
            'bg-black/50 backdrop-blur-sm',
            'text-primary'
          )}
        >
          {ASSET_TYPE_ICONS[asset_type]}
        </div>

        {/* 预览标签 */}
        <div
          className={cn(
            'absolute top-3 right-3',
            'px-2 py-1 rounded-md',
            'bg-primary/20 border border-primary/30',
            'text-[10px] font-semibold text-primary uppercase tracking-wider'
          )}
        >
          Preview
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-5">
        {/* 标题行 */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0 mr-2">
            <h5 className="text-base font-semibold text-white truncate m-0">
              {name || 'Asset Name'}
            </h5>
            {location && (
              <div className="flex items-center gap-1 mt-1 text-xs text-white/50">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{location}</span>
              </div>
            )}
          </div>
          <span
            className={cn(
              'text-xs font-medium',
              'text-white/40',
              'bg-white/[0.05]',
              'px-2 py-0.5 rounded',
              'shrink-0'
            )}
          >
            {symbol || 'SYM'}
          </span>
        </div>

        {/* APY 区域 */}
        <div
          className={cn(
            'flex items-center',
            'bg-white/[0.03] rounded-xl',
            'p-3 mb-4'
          )}
        >
          <div className="flex-1 text-center">
            <span className="block text-[10px] text-white/40 uppercase tracking-wider mb-1">
              3M APY
            </span>
            <span className="text-sm font-semibold text-primary">
              {formatApy(apy_3m)}
            </span>
          </div>
          
          <div className="w-px h-8 bg-white/10" />
          
          <div className="flex-1 text-center">
            <span className="block text-[10px] text-white/40 uppercase tracking-wider mb-1">
              6M APY
            </span>
            <span className="text-sm font-semibold text-primary">
              {formatApy(apy_6m)}
            </span>
          </div>
          
          <div className="w-px h-8 bg-white/10" />
          
          <div className="flex-1 text-center">
            <span className="block text-[10px] text-white/40 uppercase tracking-wider mb-1">
              12M APY
            </span>
            <span className="text-sm font-semibold text-gold">
              {formatApy(apy_12m)}
            </span>
          </div>
        </div>

        {/* 价格区域 */}
        <div className="flex justify-between items-center">
          <div>
            <span className="block text-[10px] text-white/40 uppercase tracking-wider mb-0.5">
              Price
            </span>
            <span className="text-lg font-bold text-white">
              {formatPrice(current_price)}
            </span>
          </div>
          
          {/* 类型标签 */}
          <span
            className={cn(
              'text-[10px] font-medium',
              'text-white/50',
              'bg-white/[0.05]',
              'px-2 py-1 rounded-md'
            )}
          >
            {ASSET_TYPE_NAMES[asset_type]}
          </span>
        </div>
      </div>
    </div>
  )
}

export default AssetCardPreview
