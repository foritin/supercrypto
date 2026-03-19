/**
 * Treasury Multisig Types
 * 国库多签相关类型定义
 */

/** 赎回请求状态 */
export type RedemptionStatus = 'pending' | 'signing' | 'executed' | 'rejected' | 'cancelled';

/** 赎回事件类型 */
export type RedemptionEventType =
  | 'request_created'
  | 'proposal_created'
  | 'signature_submitted'
  | 'threshold_reached'
  | 'executed'
  | 'rejected';

/** 签名者信息 */
export interface Signer {
  address: string;
  name?: string;
  isActive: boolean;
}

/** 签名记录 */
export interface Signature {
  signerAddress: string;
  signedAt: string;
  txHash: string;
}

/** 赎回事件 */
export interface RedemptionEvent {
  id: string;
  eventType: RedemptionEventType;
  status?: RedemptionStatus;
  actorAddress?: string;
  txHash?: string;
  message?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

/** 多签配置 */
export interface MultisigConfig {
  signers: Signer[];
  threshold: number;
  contractAddress?: string;
  balance?: string;
  environment: string;
}

/** 赎回请求 */
export interface RedemptionRequest {
  id: string;
  requestId: number;
  subscriptionId: number;
  userAddress: string;
  userName?: string;
  assetName: string;
  assetSymbol: string;
  principal: string;
  interest: string;
  totalAmount: string;
  status: RedemptionStatus;
  proposalId?: number;
  proposalTxHash?: string;
  executedAt?: string;
  executeTxHash?: string;
  createdAt: string;
  signatures: Signature[];
  signers: Signer[];
  threshold: number;
  environment: string;
  events?: RedemptionEvent[];
}

/** 赎回队列查询参数 */
export interface RedemptionQueueQuery {
  status?: RedemptionStatus;
  page?: number;
  pageSize?: number;
}

/** 赎回队列响应 */
export interface RedemptionQueueResponse {
  items: RedemptionRequest[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** 多签提案详情 */
export interface ProposalDetails {
  id: number;
  recipient: string;
  token: string;
  amount: string;
  description: string;
  signatures: string[];
  executed: boolean;
  createdAt: string;
  executedAt?: string;
}

/** 国库统计 */
export interface TreasuryStats {
  balance: string;
  pendingCount: number;
  pendingTotal: string;
  executedCount: number;
  executedTotal: string;
  signerCount: number;
  threshold: number;
}

/** 多签状态响应 */
export interface MultisigStatusResponse {
  contractAddress: string;
  signers: Signer[];
  threshold: number;
  proposalCount: number;
  executedCount: number;
  environment: string;
}

/** 初始化国库请求 */
export interface TreasuryInitRequest {
  signers: string[];
  threshold: number;
  environment: string;
}

/** 初始化国库响应 */
export interface TreasuryInitResponse {
  contractAddress: string;
  signers: string[];
  threshold: number;
  txHash: string;
}

/** 签名请求 */
export interface SignRedemptionRequest {
  redemptionId: string;
  signature?: string;
}

/** 执行请求 */
export interface ExecuteRedemptionRequest {
  redemptionId: string;
  txHash: string;
}

/** 拒绝请求 */
export interface RejectRedemptionRequest {
  redemptionId: string;
  reason?: string;
}

/** 用户赎回记录 */
export interface UserRedemption {
  id: string;
  assetName: string;
  assetSymbol: string;
  amount: string;
  status: RedemptionStatus;
  createdAt: string;
  completedAt?: string;
  txHash?: string;
}
