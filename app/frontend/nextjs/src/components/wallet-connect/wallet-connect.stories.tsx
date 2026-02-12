import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'

/**
 * WalletConnect Button - Design Variants
 * 
 * 这个 Story 文件用于：
 * 1. 隔离预览钱包连接按钮的不同状态
 * 2. 快速迭代样式设计
 * 3. 作为模型优化的参考
 * 
 * 当前设计问题：
 * - 按钮可能需要更明显的 hover 效果
 * - 颜色对比度可以优化
 * - 移动端适配
 */

// ============================================
// Mock Components for Storybook
// ============================================

// 未连接状态的按钮
function WalletConnectButtonDisconnected({ 
  variant = 'current',
  onClick = fn()
}: { 
  variant?: 'current' | 'outline' | 'gradient-v2' | 'glass' | 'minimal'
  onClick?: () => void 
}) {
  const variants = {
    // 当前设计
    current: {
      className: "group relative flex items-center gap-2.5 px-5 h-11 rounded-full font-semibold text-[14px] tracking-wide transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]",
      style: {
        background: 'linear-gradient(135deg, #00D4AA 0%, #00B896 100%)',
        color: '#0a0f0d',
        boxShadow: '0 0 20px rgba(0, 212, 170, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
      }
    },
    // 变体1: 描边风格
    outline: {
      className: "group relative flex items-center gap-2.5 px-5 h-11 rounded-full font-semibold text-[14px] tracking-wide transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border-2 border-primary hover:bg-primary/10",
      style: {
        background: 'transparent',
        color: '#00D4AA',
        boxShadow: '0 0 15px rgba(0, 212, 170, 0.2)',
      }
    },
    // 变体2: 渐变V2 - 更柔和
    'gradient-v2': {
      className: "group relative flex items-center gap-2.5 px-6 h-12 rounded-2xl font-semibold text-[14px] tracking-wide transition-all duration-300 hover:shadow-lg active:scale-[0.98]",
      style: {
        background: 'linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%)',
        color: 'white',
        boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
      }
    },
    // 变体3: 玻璃效果
    glass: {
      className: "group relative flex items-center gap-2.5 px-5 h-11 rounded-full font-semibold text-[14px] tracking-wide transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] backdrop-blur-md border border-white/20",
      style: {
        background: 'rgba(0, 212, 170, 0.15)',
        color: '#00D4AA',
        boxShadow: '0 8px 32px rgba(0, 212, 170, 0.2)',
      }
    },
    // 变体4: 极简风格
    minimal: {
      className: "group relative flex items-center gap-2 px-4 h-10 rounded-lg font-medium text-[13px] transition-all duration-200 hover:bg-primary/10",
      style: {
        background: 'transparent',
        color: '#00D4AA',
        boxShadow: 'none',
      }
    },
  }

  const { className, style } = variants[variant]

  return (
    <button onClick={onClick} type="button" className={className} style={style}>
      {/* Shine overlay on hover */}
      <div 
        className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/25 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" 
        aria-hidden="true"
      />
      {/* Wallet icon */}
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="relative z-10"
      >
        <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
        <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
      </svg>
      <span className="relative z-10">Connect Wallet</span>
    </button>
  )
}

// 已连接状态的按钮
function WalletConnectButtonConnected({
  address = '0x1234...5678',
  chainIcon = '🔷',
  isAuthenticated = true,
  variant = 'current',
}: {
  address?: string
  chainIcon?: string
  isAuthenticated?: boolean
  variant?: 'current' | 'pill' | 'card'
}) {
  const variants = {
    // 当前设计 - 极简
    current: (
      <div className="flex items-center gap-3">
        {/* 网络按钮 */}
        <button
          type="button"
          className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/10 transition-all duration-200"
        >
          <span className="text-lg">{chainIcon}</span>
        </button>
        {/* 地址按钮 */}
        <button type="button" className="group flex items-center gap-2 hover:opacity-80 transition-all duration-200">
          <span className={`w-2 h-2 rounded-full shrink-0 ${isAuthenticated ? 'bg-primary shadow-[0_0_6px_rgba(0,212,170,0.6)]' : 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]'}`} />
          <span className="text-sm font-medium text-white/90">{address}</span>
          <svg className="w-3.5 h-3.5 text-white/40 group-hover:text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </button>
      </div>
    ),
    // 变体: 胶囊式
    pill: (
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex items-center gap-2 px-4 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
        >
          <span className="text-sm">{chainIcon}</span>
          <span className={`w-2 h-2 rounded-full ${isAuthenticated ? 'bg-primary' : 'bg-amber-400'}`} />
          <span className="text-sm font-medium text-white">{address}</span>
          <svg className="w-3 h-3 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </button>
      </div>
    ),
    // 变体: 卡片式
    card: (
      <button
        type="button"
        className="flex items-center gap-3 px-4 py-2 rounded-xl bg-gradient-to-r from-white/5 to-white/10 border border-white/10 hover:border-primary/30 transition-all"
      >
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
          <span>{chainIcon}</span>
        </div>
        <div className="flex flex-col items-start">
          <span className="text-xs text-white/50">Connected</span>
          <span className="text-sm font-medium text-white">{address}</span>
        </div>
        <div className={`w-2 h-2 rounded-full ${isAuthenticated ? 'bg-primary animate-pulse' : 'bg-amber-400'}`} />
      </button>
    ),
  }

  return variants[variant]
}

// ============================================
// Storybook Configuration
// ============================================

const meta: Meta = {
  title: 'Components/WalletConnect',
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#0a0f0d' },
        { name: 'header', value: '#1a1f1d' },
        { name: 'light', value: '#ffffff' },
      ],
    },
  },
  tags: ['autodocs'],
}

export default meta

// ============================================
// Stories - 未连接状态
// ============================================

export const DisconnectedCurrent: StoryObj = {
  name: '🔌 Disconnected - Current Design',
  render: () => <WalletConnectButtonDisconnected variant="current" />,
}

export const DisconnectedOutline: StoryObj = {
  name: '🔌 Disconnected - Outline',
  render: () => <WalletConnectButtonDisconnected variant="outline" />,
}

export const DisconnectedGradientV2: StoryObj = {
  name: '🔌 Disconnected - Gradient V2',
  render: () => <WalletConnectButtonDisconnected variant="gradient-v2" />,
}

export const DisconnectedGlass: StoryObj = {
  name: '🔌 Disconnected - Glass Effect',
  render: () => <WalletConnectButtonDisconnected variant="glass" />,
}

export const DisconnectedMinimal: StoryObj = {
  name: '🔌 Disconnected - Minimal',
  render: () => <WalletConnectButtonDisconnected variant="minimal" />,
}

// ============================================
// Stories - 已连接状态
// ============================================

export const ConnectedCurrent: StoryObj = {
  name: '✅ Connected - Current Design',
  render: () => <WalletConnectButtonConnected variant="current" />,
}

export const ConnectedPill: StoryObj = {
  name: '✅ Connected - Pill Style',
  render: () => <WalletConnectButtonConnected variant="pill" />,
}

export const ConnectedCard: StoryObj = {
  name: '✅ Connected - Card Style',
  render: () => <WalletConnectButtonConnected variant="card" />,
}

export const ConnectedUnauthenticated: StoryObj = {
  name: '⚠️ Connected - Not Authenticated',
  render: () => <WalletConnectButtonConnected isAuthenticated={false} />,
}

// ============================================
// Stories - 所有变体对比
// ============================================

export const AllDisconnectedVariants: StoryObj = {
  name: '📊 All Disconnected Variants',
  render: () => (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex flex-col gap-2">
        <span className="text-xs text-white/50 uppercase tracking-wider">Current</span>
        <WalletConnectButtonDisconnected variant="current" />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs text-white/50 uppercase tracking-wider">Outline</span>
        <WalletConnectButtonDisconnected variant="outline" />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs text-white/50 uppercase tracking-wider">Gradient V2</span>
        <WalletConnectButtonDisconnected variant="gradient-v2" />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs text-white/50 uppercase tracking-wider">Glass</span>
        <WalletConnectButtonDisconnected variant="glass" />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs text-white/50 uppercase tracking-wider">Minimal</span>
        <WalletConnectButtonDisconnected variant="minimal" />
      </div>
    </div>
  ),
}

export const AllConnectedVariants: StoryObj = {
  name: '📊 All Connected Variants',
  render: () => (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex flex-col gap-2">
        <span className="text-xs text-white/50 uppercase tracking-wider">Current</span>
        <WalletConnectButtonConnected variant="current" />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs text-white/50 uppercase tracking-wider">Pill</span>
        <WalletConnectButtonConnected variant="pill" />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs text-white/50 uppercase tracking-wider">Card</span>
        <WalletConnectButtonConnected variant="card" />
      </div>
    </div>
  ),
}
