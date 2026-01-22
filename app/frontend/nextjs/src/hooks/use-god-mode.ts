'use client';

/**
 * GOD_MODE 总控 Hook
 * 
 * 所有权限组件统一调用此 hook，避免分散校验逻辑
 * 
 * 安全机制:
 * 1. 生产环境强制返回 false，无论环境变量如何设置
 * 2. 需要同时满足 NODE_ENV=development 和 NEXT_PUBLIC_GOD_MODE=true
 * 
 * Requirements: 14.1, 14.2
 */

export interface GodModeState {
  /** GOD_MODE 是否启用 */
  enabled: boolean;
  /** 绕过的权限列表 */
  bypassedPermissions: readonly string[];
}

const BYPASSED_PERMISSIONS = ['wallet', 'kyc', 'admin', 'accessToken'] as const;

export function useGodMode(): GodModeState {
  // 生产环境强制禁用 - 这是最重要的安全检查
  // Requirements: 14.2
  if (process.env.NODE_ENV === 'production') {
    return { enabled: false, bypassedPermissions: [] };
  }
  
  // 开发环境检查环境变量
  // Requirements: 14.1
  const enabled = process.env.NEXT_PUBLIC_GOD_MODE === 'true';
  
  return {
    enabled,
    bypassedPermissions: enabled ? BYPASSED_PERMISSIONS : [],
  };
}
