/**
 * 业务错误码枚举
 * 
 * 与后端 src/shared/schemas/enums/error_codes.py 保持同步
 * 前端根据错误码进行国际化翻译
 * 
 * 错误码规范:
 * - 1xxx: 认证相关
 * - 2xxx: 资产相关  
 * - 3xxx: 合约相关
 * - 4xxx: KYC 相关
 * - 5xxx: 认购相关
 * - 6xxx: 环境限制
 * - 9xxx: 通用错误
 */
export enum ErrorCode {
  // ============ 认证相关 (1xxx) ============
  AUTH_TOKEN_EXPIRED = 1001,
  AUTH_TOKEN_INVALID = 1002,
  AUTH_SIGNATURE_INVALID = 1003,
  AUTH_NONCE_INVALID = 1004,
  AUTH_SESSION_REVOKED = 1005,

  // ============ 资产相关 (2xxx) ============
  ASSET_NOT_FOUND = 2001,
  ASSET_SYMBOL_EXISTS = 2002,
  ASSET_NOT_AVAILABLE = 2003,
  ASSET_SUPPLY_EXCEEDED = 2004,

  // ============ 合约绑定相关 (3xxx) ============
  PROJECT_NO_PRIMARY_CONTRACT = 3001,
  PROJECT_NO_CONTRACTS = 3002,
  CONTRACTS_NOT_FOUND = 3003,
  CONTRACT_ALREADY_BOUND = 3004,
  CONTRACT_NOT_BOUND = 3005,
  CONTRACT_DEPLOYMENT_NOT_FOUND = 3006,
  PROJECT_NOT_READY = 3007,
  PROJECT_BOUND_CANNOT_MODIFY = 3008,
  PROJECT_ALREADY_HAS_PRIMARY = 3009,
  CONTRACT_NOT_PROJECT_SCOPE = 3010,
  CONTRACT_NOT_PRIMARY = 3011,

  // ============ KYC 相关 (4xxx) ============
  KYC_NOT_FOUND = 4001,
  KYC_ALREADY_PENDING = 4002,
  KYC_ALREADY_APPROVED = 4003,
  KYC_INVALID_STATUS = 4004,
  KYC_ALREADY_SYNCED = 4005,
  KYC_SYNC_NOT_REQUIRED = 4006,
  KYC_REQUIRED = 4007,

  // ============ 认购相关 (5xxx) ============
  SUBSCRIPTION_NOT_FOUND = 5001,
  SUBSCRIPTION_MIN_AMOUNT = 5002,
  SUBSCRIPTION_SUPPLY_EXCEEDED = 5003,
  SUBSCRIPTION_CONFLICT = 5004,
  SUBSCRIPTION_PROCESSING = 5005,

  // ============ 环境限制 (6xxx) ============
  ENV_NOT_ALLOWED = 6001,
  ENV_HARDHAT_ONLY = 6002,
  ENV_DEV_ONLY = 6003,

  // ============ 通用错误 (9xxx) ============
  UNKNOWN_ERROR = 9000,
  VALIDATION_ERROR = 9001,
  NOT_FOUND = 9002,
  UNAUTHORIZED = 9003,
  FORBIDDEN = 9004,
  CONFLICT = 9005,
}

/**
 * 错误码对应的中文消息
 * 
 * 用于前端显示友好的错误提示
 */
export const ErrorMessages: Record<number, string> = {
  // ============ 认证相关 (1xxx) ============
  [ErrorCode.AUTH_TOKEN_EXPIRED]: '登录已过期，请重新登录',
  [ErrorCode.AUTH_TOKEN_INVALID]: '无效的登录凭证',
  [ErrorCode.AUTH_SIGNATURE_INVALID]: '签名验证失败',
  [ErrorCode.AUTH_NONCE_INVALID]: '无效的 Nonce',
  [ErrorCode.AUTH_SESSION_REVOKED]: '会话已被撤销',

  // ============ 资产相关 (2xxx) ============
  [ErrorCode.ASSET_NOT_FOUND]: '资产不存在',
  [ErrorCode.ASSET_SYMBOL_EXISTS]: '资产符号已存在',
  [ErrorCode.ASSET_NOT_AVAILABLE]: '资产不可用',
  [ErrorCode.ASSET_SUPPLY_EXCEEDED]: '超出资产供应量',

  // ============ 合约绑定相关 (3xxx) ============
  [ErrorCode.PROJECT_NO_PRIMARY_CONTRACT]: '项目未设置主合约',
  [ErrorCode.PROJECT_NO_CONTRACTS]: '项目没有合约',
  [ErrorCode.CONTRACTS_NOT_FOUND]: '合约不存在',
  [ErrorCode.CONTRACT_ALREADY_BOUND]: '合约已绑定',
  [ErrorCode.CONTRACT_NOT_BOUND]: '合约未绑定',
  [ErrorCode.CONTRACT_DEPLOYMENT_NOT_FOUND]: '合约部署记录不存在',
  [ErrorCode.PROJECT_NOT_READY]: '项目未就绪，无法绑定 Asset',
  [ErrorCode.PROJECT_BOUND_CANNOT_MODIFY]: '项目已绑定 Asset，请先解绑后再进行此操作',
  [ErrorCode.PROJECT_ALREADY_HAS_PRIMARY]: '该项目已有主合约，请先取消现有主合约',
  [ErrorCode.CONTRACT_NOT_PROJECT_SCOPE]: '只有项目专属合约可以设为主合约',
  [ErrorCode.CONTRACT_NOT_PRIMARY]: '该合约不是主合约',

  // ============ KYC 相关 (4xxx) ============
  [ErrorCode.KYC_NOT_FOUND]: 'KYC 记录不存在',
  [ErrorCode.KYC_ALREADY_PENDING]: 'KYC 申请正在审核中',
  [ErrorCode.KYC_ALREADY_APPROVED]: 'KYC 已通过审核',
  [ErrorCode.KYC_INVALID_STATUS]: '无效的 KYC 状态',
  [ErrorCode.KYC_ALREADY_SYNCED]: 'KYC 已同步到链上',
  [ErrorCode.KYC_SYNC_NOT_REQUIRED]: 'KYC 无需同步',
  [ErrorCode.KYC_REQUIRED]: '需要完成 KYC 认证',

  // ============ 认购相关 (5xxx) ============
  [ErrorCode.SUBSCRIPTION_NOT_FOUND]: '认购记录不存在',
  [ErrorCode.SUBSCRIPTION_MIN_AMOUNT]: '认购金额低于最小限额',
  [ErrorCode.SUBSCRIPTION_SUPPLY_EXCEEDED]: '超出可认购数量',
  [ErrorCode.SUBSCRIPTION_CONFLICT]: '认购冲突',
  [ErrorCode.SUBSCRIPTION_PROCESSING]: '认购正在处理中',

  // ============ 环境限制 (6xxx) ============
  [ErrorCode.ENV_NOT_ALLOWED]: '当前环境不允许此操作',
  [ErrorCode.ENV_HARDHAT_ONLY]: '仅限 Hardhat 环境',
  [ErrorCode.ENV_DEV_ONLY]: '仅限开发环境',

  // ============ 通用错误 (9xxx) ============
  [ErrorCode.UNKNOWN_ERROR]: '未知错误',
  [ErrorCode.VALIDATION_ERROR]: '数据验证失败',
  [ErrorCode.NOT_FOUND]: '资源不存在',
  [ErrorCode.UNAUTHORIZED]: '未授权',
  [ErrorCode.FORBIDDEN]: '禁止访问',
  [ErrorCode.CONFLICT]: '资源冲突',
};

/**
 * 获取错误消息
 * 
 * @param code 错误码
 * @returns 对应的中文错误消息，如果不存在则返回默认消息
 */
export function getErrorMessage(code: number): string {
  return ErrorMessages[code] || ErrorMessages[ErrorCode.UNKNOWN_ERROR];
}
