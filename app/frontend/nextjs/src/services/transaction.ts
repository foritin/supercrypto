/**
 * Transaction API Service
 * 交易历史相关 API（管理员接口）
 */
import { API_PATHS } from "@/constants/api-paths";
import { getExplorerUrl as getExplorerUrlByChainId } from "@/lib/utils";
import { api } from "@/services/api";

// 交易状态
export type TransactionStatus = "pending" | "confirmed" | "failed";

// 交易类型
export type TransactionType =
  | "subscription" // 认购
  | "redeem" // 赎回
  | "stake" // 质押
  | "unstake" // 解押
  | "claim" // 领取奖励
  | "transfer" // 转账
  | "approve" // 授权
  | "mint" // 铸造
  | "other"; // 其他

// 交易记录
export interface TransactionRecord {
  id: number;
  tx_hash: string;
  from_address: string;
  to_address: string;
  amount: string;
  network: string;
  status: TransactionStatus;
  tx_type: TransactionType;
  gas_price: string | null;
  gas_used: string | null;
  block_number: number | null;
  block_timestamp: string | null;
  wallet_id: number | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

// 交易统计
export interface TransactionStats {
  total_transactions: number;
  pending_count: number;
  confirmed_count: number;
  failed_count: number;
  total_amount: string;
}

// 查询参数
export interface TransactionListQuery {
  address?: string;
  from_address?: string;
  to_address?: string;
  wallet_id?: number;
  network?: string;
  status?: TransactionStatus;
  tx_type?: TransactionType;
  page?: number;
  page_size?: number;
}

// 分页响应
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// 获取钱包地址的辅助函数
function getWalletAddress(): string {
  const address = localStorage.getItem("supercrypto-wallet-address");
  if (!address) {
    throw new Error("Wallet not connected");
  }
  return address;
}

export const transactionService = {
  /**
   * 获取交易列表（管理员接口）
   */
  async getTransactions(
    query: TransactionListQuery = {}
  ): Promise<PaginatedResponse<TransactionRecord>> {
    const params = new URLSearchParams();
    if (query.address) params.append("address", query.address);
    if (query.from_address) params.append("from_address", query.from_address);
    if (query.to_address) params.append("to_address", query.to_address);
    if (query.wallet_id) params.append("wallet_id", query.wallet_id.toString());
    if (query.network) params.append("network", query.network);
    if (query.status) params.append("status", query.status);
    if (query.tx_type) params.append("tx_type", query.tx_type);
    if (query.page) params.append("page", query.page.toString());
    if (query.page_size) params.append("page_size", query.page_size.toString());

    const url = `${API_PATHS.ADMIN.TRANSACTIONS}${
      params.toString() ? `?${params.toString()}` : ""
    }`;
    const response = await api.get<API.ResponseData<TransactionRecord>>(url);
    return {
      items: response.list_data || [],
      total: response.pagination?.total || 0,
      page: response.pagination?.page || 1,
      page_size: response.pagination?.page_size || 10,
      total_pages: response.pagination?.total_pages || 0,
    };
  },

  /**
   * 获取用户的交易历史（管理员接口）
   */
  async getUserTransactions(
    page: number = 1,
    pageSize: number = 10
  ): Promise<PaginatedResponse<TransactionRecord>> {
    const address = getWalletAddress();
    const url = `${API_PATHS.ADMIN.TRANSACTION_ADDRESS_HISTORY(address)}?page=${page}&page_size=${pageSize}`;
    const response = await api.get<API.ResponseData<TransactionRecord>>(url);
    return {
      items: response.list_data || [],
      total: response.pagination?.total || 0,
      page: response.pagination?.page || 1,
      page_size: response.pagination?.page_size || 10,
      total_pages: response.pagination?.total_pages || 0,
    };
  },

  /**
   * 获取交易详情（管理员接口）
   */
  async getTransaction(txId: number): Promise<TransactionRecord> {
    const response = await api.get<API.ResponseData<TransactionRecord>>(
      API_PATHS.ADMIN.TRANSACTION_DETAIL(txId)
    );
    return response.object_data as TransactionRecord;
  },

  /**
   * 根据哈希获取交易（管理员接口）
   */
  async getTransactionByHash(
    txHash: string
  ): Promise<TransactionRecord | null> {
    const response = await api.get<API.ResponseData<TransactionRecord>>(
      API_PATHS.ADMIN.TRANSACTION_BY_HASH(txHash)
    );
    return response.object_data;
  },

  /**
   * 获取交易统计（管理员接口）
   */
  async getTransactionStats(address?: string): Promise<TransactionStats> {
    const params = address ? `?address=${address}` : "";
    const response = await api.get<API.ResponseData<TransactionStats>>(
      `${API_PATHS.ADMIN.TRANSACTION_STATS}${params}`
    );
    return response.object_data as TransactionStats;
  },

  /**
   * 导出交易记录（CSV）（管理员接口）
   */
  async exportTransactions(query: TransactionListQuery = {}): Promise<Blob> {
    const params = new URLSearchParams();
    if (query.address) params.append("address", query.address);
    if (query.status) params.append("status", query.status);
    if (query.tx_type) params.append("tx_type", query.tx_type);
    params.append("format", "csv");

    const url = `${API_PATHS.ADMIN.TRANSACTION_EXPORT}?${params.toString()}`;
    const response = await api.get(url, { responseType: "blob" });
    return response as unknown as Blob;
  },
};

/**
 * 以下常量作为 fallback 使用
 * 推荐使用 useConstants hook 从后端 API 获取最新数据:
 * - useConstants('transaction_type') 获取交易类型
 * @see src/hooks/useConstants.ts
 * @see src/lib/constants.ts (fallback 常量)
 */

// 交易类型显示名称
export const TRANSACTION_TYPE_NAMES: Record<TransactionType, string> = {
  subscription: "Subscription",
  redeem: "Redemption",
  stake: "Stake",
  unstake: "Unstake",
  claim: "Claim Reward",
  transfer: "Transfer",
  approve: "Approve",
  mint: "Mint",
  other: "Other",
};

// 交易类型颜色
export const TRANSACTION_TYPE_COLORS: Record<TransactionType, string> = {
  subscription: "blue",
  redeem: "green",
  stake: "purple",
  unstake: "orange",
  claim: "gold",
  transfer: "cyan",
  approve: "default",
  mint: "magenta",
  other: "default",
};

// 交易状态颜色
export const TRANSACTION_STATUS_COLORS: Record<TransactionStatus, string> = {
  pending: "processing",
  confirmed: "success",
  failed: "error",
};

// 获取区块链浏览器链接（基于网络名称的兼容接口）
export function getExplorerUrl(
  txHash: string,
  network: string = "hardhat"
): string | null {
  const networkToChainId: Record<string, number> = {
    mainnet: 1,
    main: 1,
    sepolia: 11155111,
    test: 11155111,
  }
  const chainId = networkToChainId[network]
  if (!chainId) return null
  return getExplorerUrlByChainId(chainId, 'tx', txHash)
}
