/**
 * Transaction Audit Service
 * 交易审计服务 - 记录前端发起的链上交易
 *
 * 使用场景：
 * 1. Token 转账 - ERC20 approve/transfer
 * 2. 认购/质押操作 - 用户调用合约方法
 * 3. Admin 合约操作 - 管理员调用合约方法
 */
import { post } from "./api";

// ============ 类型定义 ============

/** 交易类型 */
export enum TransactionType {
  TRANSFER = "transfer",
  TOKEN_TRANSFER = "token_transfer",
  TOKEN_APPROVE = "token_approve",
  CONTRACT_DEPLOY = "contract_deploy",
  CONTRACT_CALL = "contract_call",
  STAKING = "staking",
  UNSTAKING = "unstaking",
  CLAIM_REWARD = "claim_reward",
  SWAP = "swap",
  OTHER = "other",
}

/** 记录交易请求 */
export interface RecordTransactionRequest {
  tx_hash: string;
  chain_id: number;
  network: string;
  from_address: string;
  to_address?: string;
  value?: string;
  tx_type: TransactionType;
  // Token 信息
  token_address?: string;
  token_symbol?: string;
  token_decimals?: number;
  token_amount?: string;
  // 合约调用信息
  contract_name?: string;
  function_name?: string;
  function_args?: Record<string, unknown>;
  // Gas 信息
  gas_price?: string;
  gas_limit?: number;
  nonce?: number;
  // 其他
  description?: string;
  extra_data?: Record<string, unknown>;
}

/** 交易记录响应 */
export interface TransactionAuditRecord {
  id: number;
  tx_hash: string;
  chain_id: number;
  network: string;
  from_address: string;
  to_address?: string;
  value: string;
  tx_type: TransactionType;
  status: string;
  created_at: string;
}

// ============ API 函数 ============

/**
 * 记录交易
 * 在交易发送后调用，用于审计追踪
 */
export async function recordTransaction(
  data: RecordTransactionRequest
): Promise<TransactionAuditRecord> {
  const response = await post<{ object_data: TransactionAuditRecord }>(
    "/user/transactions/audit",
    data
  );
  return response.object_data;
}

/**
 * 更新交易状态
 * 在交易确认后调用
 */
export async function updateTransactionStatus(
  txHash: string,
  status: "confirmed" | "failed" | "reverted",
  receipt?: {
    block_number?: number;
    gas_used?: number;
    effective_gas_price?: string;
    error_message?: string;
  }
): Promise<TransactionAuditRecord> {
  const response = await post<{ object_data: TransactionAuditRecord }>(
    `/user/transactions/audit/${txHash}/status`,
    { status, ...receipt }
  );
  return response.object_data;
}

// ============ 便捷函数 ============

/**
 * 记录 Token Approve 交易
 */
export async function recordTokenApprove(params: {
  txHash: string;
  chainId: number;
  network: string;
  fromAddress: string;
  spenderAddress: string;
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
  amount: string;
  description?: string;
}): Promise<TransactionAuditRecord | null> {
  try {
    return await recordTransaction({
      tx_hash: params.txHash,
      chain_id: params.chainId,
      network: params.network,
      from_address: params.fromAddress,
      to_address: params.tokenAddress,
      value: "0",
      tx_type: TransactionType.TOKEN_APPROVE,
      token_address: params.tokenAddress,
      token_symbol: params.tokenSymbol,
      token_decimals: params.tokenDecimals,
      token_amount: params.amount,
      function_name: "approve",
      function_args: {
        spender: params.spenderAddress,
        amount: params.amount,
      },
      description: params.description || `Approve ${params.tokenSymbol} for spending`,
    });
  } catch (error) {
    console.error("Failed to record token approve:", error);
    return null;
  }
}

/**
 * 记录合约调用交易
 */
export async function recordContractCall(params: {
  txHash: string;
  chainId: number;
  network: string;
  fromAddress: string;
  contractAddress: string;
  contractName: string;
  functionName: string;
  functionArgs?: Record<string, unknown>;
  value?: string;
  txType?: TransactionType;
  description?: string;
}): Promise<TransactionAuditRecord | null> {
  try {
    return await recordTransaction({
      tx_hash: params.txHash,
      chain_id: params.chainId,
      network: params.network,
      from_address: params.fromAddress,
      to_address: params.contractAddress,
      value: params.value || "0",
      tx_type: params.txType || TransactionType.CONTRACT_CALL,
      contract_name: params.contractName,
      function_name: params.functionName,
      ...(params.functionArgs ? { function_args: params.functionArgs } : {}),
      description: params.description || `Call ${params.contractName}.${params.functionName}`,
    });
  } catch (error) {
    console.error("Failed to record contract call:", error);
    return null;
  }
}

/**
 * 记录认购交易
 */
export async function recordSubscription(params: {
  txHash: string;
  chainId: number;
  network: string;
  fromAddress: string;
  contractAddress: string;
  amount: string;
  lockPeriodMonths: number;
  tokenSymbol?: string;
}): Promise<TransactionAuditRecord | null> {
  return recordContractCall({
    txHash: params.txHash,
    chainId: params.chainId,
    network: params.network,
    fromAddress: params.fromAddress,
    contractAddress: params.contractAddress,
    contractName: "VankeSubscription",
    functionName: "subscribe",
    functionArgs: {
      amount: params.amount,
      lockPeriodMonths: params.lockPeriodMonths,
    },
    txType: TransactionType.CONTRACT_CALL,
    description: `Subscribe ${params.amount} ${params.tokenSymbol || "USDT"} for ${params.lockPeriodMonths} months`,
  });
}

/**
 * 记录质押交易
 */
export async function recordStaking(params: {
  txHash: string;
  chainId: number;
  network: string;
  fromAddress: string;
  contractAddress: string;
  amount: string;
  tokenSymbol?: string;
}): Promise<TransactionAuditRecord | null> {
  return recordContractCall({
    txHash: params.txHash,
    chainId: params.chainId,
    network: params.network,
    fromAddress: params.fromAddress,
    contractAddress: params.contractAddress,
    contractName: "VankeStaking",
    functionName: "stake",
    functionArgs: { amount: params.amount },
    txType: TransactionType.STAKING,
    description: `Stake ${params.amount} ${params.tokenSymbol || "tokens"}`,
  });
}

/**
 * 记录解质押交易
 */
export async function recordUnstaking(params: {
  txHash: string;
  chainId: number;
  network: string;
  fromAddress: string;
  contractAddress: string;
  amount: string;
  tokenSymbol?: string;
}): Promise<TransactionAuditRecord | null> {
  return recordContractCall({
    txHash: params.txHash,
    chainId: params.chainId,
    network: params.network,
    fromAddress: params.fromAddress,
    contractAddress: params.contractAddress,
    contractName: "VankeStaking",
    functionName: "unstake",
    functionArgs: { amount: params.amount },
    txType: TransactionType.UNSTAKING,
    description: `Unstake ${params.amount} ${params.tokenSymbol || "tokens"}`,
  });
}

/**
 * 记录 Admin 合约操作
 */
export async function recordAdminContractCall(params: {
  txHash: string;
  chainId: number;
  network: string;
  fromAddress: string;
  contractAddress: string;
  contractName: string;
  functionName: string;
  functionArgs?: Record<string, unknown>;
  description?: string;
}): Promise<TransactionAuditRecord | null> {
  return recordContractCall({
    ...params,
    description: params.description || `[Admin] ${params.contractName}.${params.functionName}`,
  });
}

// ============ 导出服务对象 ============

export const transactionAuditService = {
  record: recordTransaction,
  updateStatus: updateTransactionStatus,
  recordTokenApprove,
  recordContractCall,
  recordSubscription,
  recordStaking,
  recordUnstaking,
  recordAdminContractCall,
};
