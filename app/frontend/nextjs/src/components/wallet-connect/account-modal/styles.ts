/**
 * 钱包账户弹窗 - 样式常量
 * 基于 UX 设计规范: bmad_docs/planning-artifacts/wallet-account-modal-ux-design.md
 */

export const walletModalTokens = {
  // 背景图 - NASA 地球夜景
  backgroundImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80',
  
  // 颜色
  colors: {
    // 背景
    modalOverlay: 'rgba(0, 0, 0, 0.4)',
    glassBackground: 'rgba(10, 15, 13, 0.6)',
    glassBorder: 'rgba(255, 255, 255, 0.15)',
    
    // 主色
    primary: '#00D4AA',
    primaryHover: '#00E5BB',
    
    // 状态色
    success: '#00D4AA',       // 已认证/KYC 通过
    warning: '#FBBF24',       // KYC 待完成
    error: '#EF4444',         // KYC 被拒/断开连接 hover
    
    // 文字
    textPrimary: 'rgba(255, 255, 255, 0.95)',
    textSecondary: 'rgba(255, 255, 255, 0.7)',
    textMuted: 'rgba(255, 255, 255, 0.5)',
    
    // 边框
    borderDefault: 'rgba(255, 255, 255, 0.1)',
    borderHighlight: '#FBBF24',
  },
  
  // 尺寸
  dimensions: {
    width: '400px',
    maxWidth: '95vw',
    padding: '24px',
    borderRadius: '16px',
  },
} as const

// KYC 状态类型
export type KycStatus = 'pending' | 'verified' | 'rejected' | null

// KYC 状态配置
export const kycStatusConfig: Record<NonNullable<KycStatus>, { label: string; color: string; icon: string }> = {
  pending: {
    label: 'KYC 待完成',
    color: walletModalTokens.colors.warning,
    icon: '⚠️',
  },
  verified: {
    label: 'KYC 已通过',
    color: walletModalTokens.colors.success,
    icon: '✅',
  },
  rejected: {
    label: 'KYC 被拒',
    color: walletModalTokens.colors.error,
    icon: '❌',
  },
}
