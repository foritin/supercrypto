/**
 * Theme Colors - 集中式主题颜色配置
 * 
 * 统一管理所有状态颜色映射，避免各组件重复定义
 * 基于 2025-2026 暗黑模式 UI 设计最佳实践
 */

// ============================================
// 状态颜色 - 使用 CSS 变量引用
// ============================================

export const STATUS_COLORS = {
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  error: 'var(--color-error)',
  info: 'var(--color-info)',
  default: 'var(--text-muted)',
} as const;

// ============================================
// 状态颜色 - 原始值 (用于不支持 CSS 变量的场景)
// ============================================

export const STATUS_COLORS_RAW = {
  success: '#52c41a',
  warning: '#faad14',
  error: '#ff4d4f',
  info: '#1890ff',
  default: 'rgba(255, 255, 255, 0.40)',
} as const;

// ============================================
// 主题色
// ============================================

export const THEME_COLORS = {
  primary: 'var(--color-primary)',
  primaryLight: 'var(--color-primary-light)',
  primaryDark: 'var(--color-primary-dark)',
  primaryGlow: 'var(--color-primary-glow)',
  gold: 'var(--color-gold)',
  goldLight: 'var(--color-gold-light)',
  goldDark: 'var(--color-gold-dark)',
} as const;

// ============================================
// 背景色
// ============================================

export const BG_COLORS = {
  dark: 'var(--bg-dark)',
  card: 'var(--bg-card)',
  cardHover: 'var(--bg-card-hover)',
  elevated: 'var(--bg-elevated)',
  glass: 'var(--glass-bg)',
} as const;

// ============================================
// 文字颜色
// ============================================

export const TEXT_COLORS = {
  primary: 'var(--text-primary)',
  secondary: 'var(--text-secondary)',
  tertiary: 'var(--text-tertiary)',
  muted: 'var(--text-muted)',
} as const;

// ============================================
// 边框颜色
// ============================================

export const BORDER_COLORS = {
  default: 'var(--border-color)',
  light: 'var(--border-color-light)',
  glass: 'var(--glass-border)',
} as const;

// ============================================
// Ant Design Tag 颜色映射
// ============================================

export const TAG_COLORS = {
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'processing',
  default: 'default',
} as const;

// ============================================
// 注册状态颜色映射 (用于合约管理)
// ============================================

export type RegistrationStatus = 'synced' | 'mismatch' | 'not_registered' | 'not_deployed' | 'unknown';

export const REGISTRATION_STATUS_COLORS: Record<RegistrationStatus, string> = {
  synced: 'success',
  mismatch: 'warning',
  not_registered: 'orange',
  not_deployed: 'error',
  unknown: 'default',
};

// ============================================
// 合约类型颜色映射
// ============================================

export type ContractType = 'registry' | 'kyc' | 'governance' | 'stablecoin' | 'token' | 'defi';

export const CONTRACT_TYPE_COLORS: Record<ContractType, string> = {
  registry: 'purple',
  kyc: 'blue',
  governance: 'geekblue',
  stablecoin: 'green',
  token: 'gold',
  defi: 'orange',
};

// ============================================
// 工具函数
// ============================================

/**
 * 获取状态对应的 CSS 变量颜色
 */
export function getStatusColor(status: keyof typeof STATUS_COLORS): string {
  return STATUS_COLORS[status] || STATUS_COLORS.default;
}

/**
 * 获取状态对应的 Ant Design Tag 颜色
 */
export function getTagColor(status: keyof typeof TAG_COLORS): string {
  return TAG_COLORS[status] || TAG_COLORS.default;
}

/**
 * 获取带透明度的状态背景色
 */
export function getStatusBgColor(status: keyof typeof STATUS_COLORS_RAW, opacity: number = 0.1): string {
  const color = STATUS_COLORS_RAW[status] || STATUS_COLORS_RAW.default;
  // 将 hex 转换为 rgba
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  return color;
}
