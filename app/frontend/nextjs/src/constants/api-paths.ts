/**
 * API 路径常量
 *
 * 路由结构：
 * - /public/*    无需认证的公开接口（包括登录、登出、刷新）
 * - /user/*      已登录用户接口（需要 JWT）
 * - /admin/*     管理员接口（需要管理员权限）
 * - /dev/*       开发工具
 */

// ============================================================================
// 公开接口 (无需认证)
// ============================================================================

export const PUBLIC_PATHS = {
  // 平台基础信息（链配置 + 合约地址 + ABI）
  INFO: '/public/info',

  // 资产
  ASSETS: '/public/assets',
  ASSET_DETAIL: (id: number) => `/public/assets/${id}`,
  ASSET_BY_SYMBOL: (symbol: string) => `/public/assets/symbol/${symbol}`,
  ASSET_PRICE_HISTORY: (id: number, limit = 50) =>
    `/public/assets/${id}/price-history?limit=${limit}`,
  ASSET_MEDIA: (id: number) => `/public/assets/${id}/media`,

  // 合约
  CONTRACTS: '/public/contracts',
  CONTRACT_ADDRESSES: '/public/contracts/addresses',
  CONTRACT_SUBSCRIPTION: '/public/contracts/subscription',
  CONTRACT_BY_NAME: (name: string) => `/public/contracts/${name}`,

  // 认购 - 预览
  SUBSCRIPTION_PREVIEW: '/public/subscriptions/preview',

  // 质押 - 公开配置
  STAKING_CONFIG: '/public/staking/config',
  STAKING_LIMIT: '/public/staking/limit',
  STAKING_PLT_TOKEN: '/public/staking/plt-token',

  // KYC - 状态查询
  KYC_STATUS: (address: string) => `/public/kyc/status/${address}`,

  // 常量
  CONSTANTS: '/public/constants',
  CONSTANTS_GROUP: (group: string) => `/public/constants/${group}`,
} as const

// ============================================================================
// 认证接口（公开部分在 /public/auth/*，需认证部分在 /user/auth/*）
// ============================================================================

export const AUTH_PATHS = {
  // 公开接口（无需 JWT）
  LOGIN: '/public/auth/token',
  REFRESH: '/public/auth/refresh',
  LOGOUT: '/public/auth/logout',
  // 用户接口（需要 JWT）
  ME: '/user/auth/me',
} as const

// ============================================================================
// 用户接口 (需要 JWT 认证)
// ============================================================================

export const USER_PATHS = {
  // 认购
  SUBSCRIPTIONS: '/user/subscriptions',
  SUBSCRIPTION_DETAIL: (id: number) => `/user/subscriptions/${id}`,
  SUBSCRIPTION_STATS: '/user/subscriptions/stats',
  SUBSCRIPTION_REDEEM: (id: number) => `/user/subscriptions/${id}/redeem`,

  // 质押
  STAKING: '/user/staking',
  STAKING_PREVIEW: '/user/staking/preview',
  STAKING_DETAIL: (id: number) => `/user/staking/${id}`,
  STAKING_STATS: '/user/staking/stats',
  STAKING_UNSTAKE: (id: number) => `/user/staking/${id}/unstake`,
  STAKING_CLAIM: (id: number) => `/user/staking/${id}/claim`,

  // KYC
  KYC_UPLOAD: '/user/kyc/upload-document',
  KYC_UPLOAD_BASE64: '/user/kyc/upload-base64',
  KYC_UPLOAD_VIDEO: '/user/kyc/upload-video',
  KYC_DOCUMENT_URL: '/user/kyc/document-url',
  KYC_APPLY: '/user/kyc/apply',
  KYC_STATUS_UPDATE: '/user/kyc/status',
} as const

// ============================================================================
// 管理员接口 (需要管理员权限)
// ============================================================================

export const ADMIN_PATHS = {
  // 资产管理
  ASSETS: '/admin/assets',
  ASSET_DETAIL: (id: number) => `/admin/assets/${id}`,
  ASSET_STATUS: (id: number) => `/admin/assets/${id}/status`,
  ASSET_PRICE: (id: number) => `/admin/assets/${id}/price`,
  ASSET_PROJECTS: '/admin/assets/projects/available',
  ASSET_BIND_PROJECT: (id: number) => `/admin/assets/${id}/bind-project`,
  ASSET_UNBIND: (id: number) => `/admin/assets/${id}/unbind`,
  
  // 资产媒体管理
  ASSET_MEDIA: (id: number) => `/admin/assets/${id}/media`,
  ASSET_MEDIA_STATS: (id: number) => `/admin/assets/${id}/media/stats`,
  ASSET_MEDIA_DETAIL: (assetId: number, mediaId: number) => `/admin/assets/${assetId}/media/${mediaId}`,
  ASSET_MEDIA_REORDER: (id: number) => `/admin/assets/${id}/media/reorder`,

  // 合约管理
  CONTRACT_STATUS: '/admin/contracts/status',
  CONTRACT_DEPENDENCY_GRAPH: '/admin/contracts/dependency-graph',
  CONTRACT_DEPENDENCIES: (name: string) => `/admin/contracts/${name}/dependencies`,
  CONTRACT_UPDATE_ADDRESS: '/admin/contracts/update-address',
  CONTRACT_CONFIRM_BINDING: '/admin/contracts/confirm-binding',
  CONTRACT_RESET_PROJECT: (project: string) => `/admin/contracts/reset/${project}`,
  CONTRACT_RESET_ALL: '/admin/contracts/reset/all',
  CONTRACT_REGISTER_PREPARE: '/admin/contracts/register/prepare',
  CONTRACT_REGISTER_CONFIRM: '/admin/contracts/register/confirm',
  CONTRACT_UNREGISTER_PREPARE: '/admin/contracts/unregister/prepare',
  CONTRACT_UNREGISTER_CONFIRM: '/admin/contracts/unregister/confirm',
  CONTRACT_VALIDATE: '/admin/contracts/validate',
  CONTRACT_SET_PRIMARY: (id: number) => `/admin/contracts/${id}/set-primary`,
  CONTRACT_UNSET_PRIMARY: (id: number) => `/admin/contracts/${id}/unset-primary`,

  // 平台统计
  STATS: '/admin/stats',
  STATS_TVL: '/admin/stats/tvl',
  STATS_USERS: '/admin/stats/users',
  STATS_STAKING: '/admin/stats/staking',
  
  // 审计日志 (独立路由)
  AUDIT_LOGS: '/admin/audit-logs',
  AUDIT_LOG_DETAIL: (id: number) => `/admin/audit-logs/${id}`,

  // KYC 管理 (静态路由在前，动态路由在后)
  KYC_LIST: '/admin/kyc/',
  KYC_STATS: '/admin/kyc/stats',
  KYC_REJECT_REASONS: '/admin/kyc/reject-reasons',
  KYC_BATCH_REVIEW: '/admin/kyc/batch-review',
  KYC_PENDING: '/admin/kyc/pending',
  KYC_FAILED_SYNC: '/admin/kyc/failed-sync',
  KYC_CONTRACT_STATUS: (address: string) => `/admin/kyc/contract-status/${address}`,
  KYC_CONTRACT_INFO: '/admin/kyc/contract-info',
  // 动态路由 (/{id} 相关)
  KYC_DETAIL: (id: number) => `/admin/kyc/${id}`,
  KYC_REVIEW: (id: number) => `/admin/kyc/${id}/review`,
  KYC_AUDIT_LOGS: (id: number) => `/admin/kyc/${id}/audit-logs`,
  KYC_CONTRACT_COMPARISON: (id: number) => `/admin/kyc/${id}/contract-comparison`,
  KYC_RECORD_ADMISSION: (kycId: number) => `/admin/kyc/${kycId}/record-admission`,
  KYC_RECORD_REVOCATION: (kycId: number) => `/admin/kyc/${kycId}/record-revocation`,

  // 会话管理
  AUTH_SESSIONS: '/admin/auth/sessions',
  AUTH_USER_SESSIONS: (address: string) => `/admin/auth/sessions/${address}`,
  AUTH_REVOKE_SESSION: (address: string) => `/admin/auth/sessions/${address}/revoke`,

  // 账户管理
  ACCOUNTS: '/admin/accounts',
  ACCOUNT_BY_ADDRESS: (address: string) => `/admin/accounts/address/${address}`,
  ACCOUNT_DELETE: (address: string) => `/admin/accounts/address/${address}`,

  // 交易管理
  TRANSACTIONS: '/admin/transactions',
  TRANSACTION_DETAIL: (id: number) => `/admin/transactions/${id}`,
  TRANSACTION_BY_HASH: (hash: string) => `/admin/transactions/hash/${hash}`,
  TRANSACTION_ADDRESS_HISTORY: (address: string) => `/admin/transactions/address/${address}/history`,
  TRANSACTION_WALLET_HISTORY: (walletId: number) => `/admin/transactions/wallet/${walletId}/history`,
  TRANSACTION_STATS: '/admin/transactions/stats',
  TRANSACTION_EXPORT: '/admin/transactions/export',
} as const

// ============================================================================
// 开发工具 (仅开发环境)
// ============================================================================

export const DEV_PATHS = {
  RESET_INFO: '/dev/reset/info',
  RESET_DATA: '/dev/reset',
  ENVIRONMENT: '/dev/environment',
  TOKEN_RECIPIENTS: '/dev/token-recipients',

  // ETH 水龙头
  FAUCET: '/dev/faucet',

  // KYC 开发工具
  KYC_QUICK_APPROVE: (address: string) => `/kyc/dev/quick-approve/${address}`,
  KYC_RESET: (address: string) => `/kyc/dev/reset/${address}`,
} as const

// ============================================================================
// 聚合导出
// ============================================================================

export const API_PATHS = {
  PUBLIC: PUBLIC_PATHS,
  AUTH: AUTH_PATHS,
  USER: USER_PATHS,
  ADMIN: ADMIN_PATHS,
  DEV: DEV_PATHS,
} as const

