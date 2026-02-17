/**
 * 资产 Logo 装饰框组件
 *
 * 根据管理员选择的边框样式渲染不同颜色主题的玻璃态外框，
 * 右下角显示资产类型专属徽标图标。
 * 边框样式与资产类型解耦，由管理员在后台自行选择。
 */
'use client'

import { Building2, Shield, Flame, TrendingUp, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FrameStyle, AssetType } from '@/services/asset'

/** 单个边框样式主题 */
interface FrameTheme {
  color: string
  glow: string
  gradient: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  labelZh: string
}

/** 边框样式主题配置 */
const FRAME_STYLE_THEMES: Record<FrameStyle, FrameTheme> = {
  green: {
    color: '#00D4AA',
    glow: 'rgba(0,212,170,0.35)',
    gradient: 'from-[#00D4AA]/20 to-[#00A080]/10',
    icon: Building2,
    label: 'Emerald',
    labelZh: '翡翠绿',
  },
  blue: {
    color: '#3B82F6',
    glow: 'rgba(59,130,246,0.35)',
    gradient: 'from-[#3B82F6]/20 to-[#1D4ED8]/10',
    icon: Shield,
    label: 'Sapphire',
    labelZh: '宝石蓝',
  },
  gold: {
    color: '#F59E0B',
    glow: 'rgba(245,158,11,0.35)',
    gradient: 'from-[#F59E0B]/20 to-[#D97706]/10',
    icon: Flame,
    label: 'Gold',
    labelZh: '黄金',
  },
  purple: {
    color: '#8B5CF6',
    glow: 'rgba(139,92,246,0.35)',
    gradient: 'from-[#8B5CF6]/20 to-[#6D28D9]/10',
    icon: TrendingUp,
    label: 'Amethyst',
    labelZh: '紫晶',
  },
  gray: {
    color: '#6B7280',
    glow: 'rgba(107,114,128,0.35)',
    gradient: 'from-[#6B7280]/20 to-[#4B5563]/10',
    icon: Layers,
    label: 'Silver',
    labelZh: '银灰',
  },
}

/** 资产类型到默认边框样式的映射 (向后兼容) */
const ASSET_TYPE_DEFAULT_FRAME: Record<AssetType, FrameStyle> = {
  real_estate: 'green',
  bond: 'blue',
  commodity: 'gold',
  equity: 'purple',
  other: 'gray',
}

type FrameSizeKey = 'sm' | 'md' | 'lg'

const SIZE_MAP: Record<FrameSizeKey, { frame: string; img: string; badge: string; badgeIcon: string }> = {
  sm: { frame: 'w-10 h-10', img: 'w-7 h-7', badge: 'w-4 h-4 -bottom-1 -right-1', badgeIcon: 'w-2.5 h-2.5' },
  md: { frame: 'w-14 h-14', img: 'w-10 h-10', badge: 'w-5 h-5 -bottom-1 -right-1', badgeIcon: 'w-3 h-3' },
  lg: { frame: 'w-20 h-20', img: 'w-14 h-14', badge: 'w-7 h-7 -bottom-1.5 -right-1.5', badgeIcon: 'w-4 h-4' },
}

interface AssetLogoFrameProps {
  /** Logo 图片 URL */
  logoUrl?: string | null
  /** 边框样式 (优先使用) */
  frameStyle?: FrameStyle | null
  /** 资产类型 (仅在 frameStyle 为空时作为 fallback) */
  assetType?: AssetType
  /** 尺寸 */
  size?: FrameSizeKey
  /** 资产名称（用于 alt） */
  name?: string
  /** 额外 className */
  className?: string
}

export function AssetLogoFrame({
  logoUrl,
  frameStyle,
  assetType = 'other',
  size = 'md',
  name = '',
  className,
}: AssetLogoFrameProps) {
  // 优先使用 frameStyle，否则根据 assetType 回退
  const resolvedStyle: FrameStyle = frameStyle || ASSET_TYPE_DEFAULT_FRAME[assetType] || 'gray'
  const theme = FRAME_STYLE_THEMES[resolvedStyle]
  const sizeConfig = SIZE_MAP[size]
  const Icon = theme.icon

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
    >
      {/* 外框 */}
      <div
        className={cn(
          sizeConfig.frame,
          'rounded-xl',
          'bg-gradient-to-br',
          theme.gradient,
          'border border-white/15',
          'backdrop-blur-md',
          'flex items-center justify-center',
          'transition-all duration-300',
        )}
        style={{
          boxShadow: `0 0 16px ${theme.glow}, inset 0 1px 0 rgba(255,255,255,0.1)`,
        }}
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={`${name} logo`}
            className={cn(sizeConfig.img, 'rounded-lg object-cover')}
          />
        ) : (
          <div className={cn(sizeConfig.img, 'opacity-40')} style={{ color: theme.color }}>
            <Icon className="w-full h-full" />
          </div>
        )}
      </div>

      {/* 右下角类型徽标 */}
      <div
        className={cn(
          'absolute',
          sizeConfig.badge,
          'rounded-full',
          'flex items-center justify-center',
          'border-2 border-[#0A0F0D]',
        )}
        style={{ backgroundColor: theme.color }}
      >
        <Icon className={cn(sizeConfig.badgeIcon, 'text-[#0A0F0D]')} />
      </div>
    </div>
  )
}

/** 所有可用的边框样式 key 列表 */
export const FRAME_STYLE_OPTIONS = Object.keys(FRAME_STYLE_THEMES) as FrameStyle[]

export { FRAME_STYLE_THEMES, ASSET_TYPE_DEFAULT_FRAME }
export type { AssetLogoFrameProps, FrameSizeKey, FrameTheme }
