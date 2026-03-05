"use client";

/**
 * Subscription Orchestrator
 * 统一交易编排中心 - 管理完整的认购流程状态机
 * 
 * 状态流转:
 * idle -> validating -> creating_order -> awaiting_signature -> 
 * broadcasting -> monitoring -> confirming -> completed
 * 
 * 异常分支:
 * - network_mismatch: 网络不匹配
 * - jwt_expired: JWT 失效
 * - kyc_rejected: KYC 未准入
 * - receipt_timeout: 回执超时
 * - chain_failed: 链上失败
 * - backend_failed: 后端校验失败
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAccount, useChainId } from "wagmi";

import { useSubscriptionContract, useTokenBalance } from "@/hooks";
import { notification } from "@/lib/notification";
import { api } from "@/services/api";
import type { AssetDetail } from "@/services/asset";
import { subscriptionService } from "@/services/subscription";
import type { TokenType, LockPeriod, SubscriptionPreviewResponse } from "@/types/subscription";

// Transaction State Machine Types
export type TransactionState =
  | "idle"
  | "validating"
  | "creating_order"
  | "awaiting_signature"
  | "broadcasting"
  | "monitoring"
  | "confirming"
  | "completed"
  | "failed";

export type FailureReason =
  | null
  | "network_mismatch"
  | "jwt_expired"
  | "kyc_rejected"
  | "insufficient_balance"
  | "receipt_timeout"
  | "chain_rejected"
  | "chain_failed"
  | "backend_failed"
  | "approval_failed"
  | "user_rejected"
  | "unknown";

export interface TransactionContext {
  orderId?: string;
  txHash?: string;
  blockNumber?: number;
  gasUsed?: bigint;
  effectiveGasPrice?: bigint;
  receiptTimestamp?: number;
  backendConfirmed?: boolean;
  retryCount: number;
  errorMessage?: string;
}

export interface UseSubscriptionOrchestratorReturn {
  // State
  txState: TransactionState;
  failureReason: FailureReason;
  context: TransactionContext;
  progress: number;
  
  // Data
  preview: SubscriptionPreviewResponse | null;
  isPreviewLoading: boolean;
  
  // Actions
  initSubscription: (params: SubscriptionParams) => Promise<boolean>;
  retry: () => Promise<boolean>;
  reset: () => void;
  refreshPreview: (amount: number, tokenType: TokenType, lockPeriod: LockPeriod) => Promise<void>;
  
  // Contract Data
  tokenBalance: string;
  tokenBalanceRaw: bigint;
  isBalanceLoading: boolean;
  allowance: number;
  needsApproval: boolean;
  approveToken: (amount: number) => Promise<boolean>;
  
  // Config
  maxRetries: number;
  currentChainId: number | undefined;
  requiredChainId: number;
}

export interface SubscriptionParams {
  asset: AssetDetail;
  amount: number;
  tokenType: TokenType;
  lockPeriod: LockPeriod;
}

const MAX_RETRIES = 3;
const RECEIPT_TIMEOUT = 120000; // 2 minutes

interface KycStatusApiResponse {
  data?: { status?: string };
}

interface MonitoredReceipt {
  blockNumber?: number;
  gasUsed: bigint;
  effectiveGasPrice: bigint;
}

interface ApiLikeError {
  message?: string;
  code?: string;
  response?: {
    status?: number;
  };
}

function toApiLikeError(error: unknown): ApiLikeError {
  if (typeof error === "object" && error !== null) {
    return error as ApiLikeError;
  }

  return {};
}

// Progress mapping for each state
const STATE_PROGRESS: Record<TransactionState, number> = {
  idle: 0,
  validating: 5,
  creating_order: 15,
  awaiting_signature: 25,
  broadcasting: 40,
  monitoring: 60,
  confirming: 85,
  completed: 100,
  failed: 0,
};

export function useSubscriptionOrchestrator(): UseSubscriptionOrchestratorReturn {
  const { t } = useTranslation();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  
  // Contract hooks
  const {
    addresses,
    usdtAllowance,
    usdcAllowance,
    approveUSDT,
    approveUSDC,
    subscribe,
    reset: resetContract,
  } = useSubscriptionContract();
  
  // Token balances
  const { 
    formatted: usdtBalance, 
    balance: usdtRaw, 
    isLoading: usdtLoading 
  } = useTokenBalance(addresses?.usdt ?? undefined);
  const { 
    formatted: usdcBalance, 
    balance: usdcRaw, 
    isLoading: usdcLoading 
  } = useTokenBalance(addresses?.usdc ?? undefined);
  
  // State
  const [txState, setTxState] = useState<TransactionState>("idle");
  const [failureReason, setFailureReason] = useState<FailureReason>(null);
  const [context, setContext] = useState<TransactionContext>({ retryCount: 0 });
  const [preview, setPreview] = useState<SubscriptionPreviewResponse | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  
  // Refs for managing async operations
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentParamsRef = useRef<SubscriptionParams | null>(null);
  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
      }
    };
  }, []);
  
  // Get token data based on type
  const getTokenData = useCallback((type: TokenType) => {
    if (type === "USDT") {
      return {
        balance: usdtBalance,
        raw: usdtRaw,
        loading: usdtLoading,
        allowance: usdtAllowance ?? 0,
        approve: approveUSDT,
      };
    }
    return {
      balance: usdcBalance,
      raw: usdcRaw,
      loading: usdcLoading,
      allowance: usdcAllowance ?? 0,
      approve: approveUSDC,
    };
  }, [usdtBalance, usdtRaw, usdtLoading, usdtAllowance, usdcBalance, usdcRaw, usdcLoading, usdcAllowance, approveUSDT, approveUSDC]);
  
  // Calculate if approval is needed
  const needsApproval = useCallback((amount: number, tokenType: TokenType) => {
    const { allowance } = getTokenData(tokenType);
    return allowance < amount;
  }, [getTokenData]);
  
  // Refresh preview
  const refreshPreview = useCallback(async (
    amount: number,
    tokenType: TokenType,
    lockPeriod: LockPeriod
  ) => {
    if (!currentParamsRef.current?.asset) return;
    
    setIsPreviewLoading(true);
    try {
      const result = await subscriptionService.previewSubscription({
        asset_id: currentParamsRef.current.asset.id,
        amount,
        token_type: tokenType,
        lock_period: lockPeriod,
      });
      setPreview(result);
    } catch (error) {
      console.error("Preview failed:", error);
      setPreview(null);
    } finally {
      setIsPreviewLoading(false);
    }
  }, []);
  
  // Validate prerequisites
  const validatePrerequisites = useCallback(async (
    params: SubscriptionParams
  ): Promise<{ valid: boolean; reason?: FailureReason }> => {
    // Check connection
    if (!isConnected || !address) {
      return { valid: false, reason: "user_rejected" };
    }
    
    // Check chain
    const requiredChainId = params.asset.chain_id ?? 1;
    if (chainId !== requiredChainId) {
      return { valid: false, reason: "network_mismatch" };
    }
    
    // Check KYC status via API
    try {
      const response = (await api.get("/v1/user/kyc/status")) as KycStatusApiResponse;
      if (response.data?.status !== "approved") {
        return { valid: false, reason: "kyc_rejected" };
      }
    } catch (error: unknown) {
      const apiError = toApiLikeError(error);
      if (apiError.response?.status === 401) {
        return { valid: false, reason: "jwt_expired" };
      }
      return { valid: false, reason: "backend_failed" };
    }
    
    // Check balance
    const { balance } = getTokenData(params.tokenType);
    if (parseFloat(balance) < params.amount) {
      return { valid: false, reason: "insufficient_balance" };
    }
    
    return { valid: true };
  }, [isConnected, address, chainId, getTokenData]);
  
  // Create order
  const createOrder = useCallback(async (
    params: SubscriptionParams
  ): Promise<{ success: boolean; orderId?: string; error?: string }> => {
    try {
      const response = await subscriptionService.createSubscriptionPending({
        asset_id: params.asset.id,
        amount: params.amount,
        token_type: params.tokenType,
        lock_period: params.lockPeriod,
      });
      return { success: true, orderId: response.order_id };
    } catch (error: unknown) {
      const apiError = toApiLikeError(error);
      if (apiError.response?.status === 401) {
        return { success: false, error: "jwt_expired" };
      }
      return { success: false, ...(apiError.message ? { error: apiError.message } : {}) };
    }
  }, []);
  
  // Monitor transaction receipt
  const monitorReceipt = useCallback(async (
    txHash: string
  ): Promise<{ success: boolean; receipt?: MonitoredReceipt; error?: FailureReason }> => {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkReceipt = async () => {
        try {
          // Check via contract service
          const receipt = await subscriptionService.getTransactionReceipt(txHash);
          
          if (receipt) {
            if (receipt.status === "success") {
              resolve({ 
                success: true, 
                receipt: {
                  ...(receipt.block_number !== undefined ? { blockNumber: receipt.block_number } : {}),
                  gasUsed: BigInt(receipt.gas_used ?? "0"),
                  effectiveGasPrice: BigInt(receipt.effective_gas_price ?? "0"),
                }
              });
              return;
            } else {
              resolve({ success: false, error: "chain_failed" });
              return;
            }
          }
          
          // Timeout check
          if (Date.now() - startTime > RECEIPT_TIMEOUT) {
            resolve({ success: false, error: "receipt_timeout" });
            return;
          }
          
          // Continue monitoring
          monitoringIntervalRef.current = setTimeout(checkReceipt, 3000);
        } catch {
          if (Date.now() - startTime > RECEIPT_TIMEOUT) {
            resolve({ success: false, error: "receipt_timeout" });
          } else {
            monitoringIntervalRef.current = setTimeout(checkReceipt, 3000);
          }
        }
      };
      
      checkReceipt();
    });
  }, []);
  
  // Confirm with backend
  const confirmWithBackend = useCallback(async (
    orderId: string,
    txHash: string,
    receipt: MonitoredReceipt
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await subscriptionService.confirmSubscription({
        order_id: orderId,
        tx_hash: txHash,
        ...(receipt.blockNumber !== undefined ? { block_number: receipt.blockNumber } : {}),
        gas_used: receipt.gasUsed.toString(),
        effective_gas_price: receipt.effectiveGasPrice.toString(),
      });
      return { success: true };
    } catch (error: unknown) {
      const apiError = toApiLikeError(error);
      return { success: false, ...(apiError.message ? { error: apiError.message } : {}) };
    }
  }, []);
  
  // Main subscription flow
  const initSubscription = useCallback(async (
    params: SubscriptionParams
  ): Promise<boolean> => {
    // Reset state
    setTxState("idle");
    setFailureReason(null);
    setContext({ retryCount: 0 });
    currentParamsRef.current = params;
    
    abortControllerRef.current = new AbortController();
    
    try {
      // Step 1: Validation
      setTxState("validating");
      const validation = await validatePrerequisites(params);
      if (!validation.valid) {
        setFailureReason(validation.reason!);
        setTxState("failed");
        return false;
      }
      
      // Step 2: Create pending order
      setTxState("creating_order");
      const orderResult = await createOrder(params);
      if (!orderResult.success) {
        setFailureReason(orderResult.error as FailureReason || "backend_failed");
        setTxState("failed");
        return false;
      }
      
      const orderId = orderResult.orderId!;
      setContext(prev => ({ ...prev, orderId }));
      
      // Step 3: Handle token approval if needed
      const tokenData = getTokenData(params.tokenType);
      if (tokenData.allowance < params.amount) {
        setTxState("awaiting_signature");
        const approved = await tokenData.approve(params.amount);
        if (!approved) {
          setFailureReason("approval_failed");
          setTxState("failed");
          return false;
        }
      }
      
      // Step 4: Submit transaction
      setTxState("awaiting_signature");
      const txResult = await subscribe(params.amount, params.lockPeriod);
      
      if (!txResult) {
        setFailureReason("user_rejected");
        setTxState("failed");
        return false;
      }
      
      const txHash = txResult;
      setContext(prev => ({ ...prev, txHash }));
      
      // Step 5: Broadcasting
      setTxState("broadcasting");
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 6: Monitor receipt
      setTxState("monitoring");
      const receiptResult = await monitorReceipt(txHash);
      
      if (!receiptResult.success) {
        setFailureReason(receiptResult.error || "chain_failed");
        setTxState("failed");
        return false;
      }

      if (!receiptResult.receipt) {
        setFailureReason("chain_failed");
        setTxState("failed");
        return false;
      }
      
      const receipt = receiptResult.receipt;
      setContext(prev => ({
        ...prev,
        gasUsed: receipt.gasUsed,
        effectiveGasPrice: receipt.effectiveGasPrice,
        receiptTimestamp: Date.now(),
        ...(receipt.blockNumber !== undefined ? { blockNumber: receipt.blockNumber } : {}),
      }));
      
      // Step 7: Backend confirmation
      setTxState("confirming");
      const confirmResult = await confirmWithBackend(orderId, txHash, receipt);
      
      if (!confirmResult.success) {
        setFailureReason("backend_failed");
        setContext((prev) => ({
          ...prev,
          ...(confirmResult.error ? { errorMessage: confirmResult.error } : {}),
        }));
        setTxState("failed");
        return false;
      }
      
      // Success
      setContext(prev => ({ ...prev, backendConfirmed: true }));
      setTxState("completed");
      notification.success(t("subscription.successTitle"));
      return true;
      
    } catch (error: unknown) {
      const apiError = toApiLikeError(error);
      console.error("Subscription error:", apiError);
      
      // Categorize error
      let reason: FailureReason = "unknown";
      
      if (apiError.code === "ACTION_REJECTED" || apiError.message?.includes("rejected")) {
        reason = "user_rejected";
      } else if (apiError.message?.includes("timeout")) {
        reason = "receipt_timeout";
      } else if (apiError.response?.status === 401) {
        reason = "jwt_expired";
      } else if (apiError.message?.includes("insufficient funds")) {
        reason = "insufficient_balance";
      } else if (apiError.message?.includes("network")) {
        reason = "network_mismatch";
      }
      
      setFailureReason(reason);
      setContext((prev) => ({
        ...prev,
        ...(apiError.message ? { errorMessage: String(apiError.message) } : {}),
      }));
      setTxState("failed");
      return false;
    }
  }, [validatePrerequisites, createOrder, getTokenData, subscribe, monitorReceipt, confirmWithBackend, t]);
  
  // Retry mechanism
  const retry = useCallback(async (): Promise<boolean> => {
    if (!currentParamsRef.current) return false;
    if (context.retryCount >= MAX_RETRIES) {
      notification.error(t("subscription.maxRetriesReached"));
      return false;
    }
    
    setContext(prev => ({ ...prev, retryCount: prev.retryCount + 1 }));
    return initSubscription(currentParamsRef.current);
  }, [context.retryCount, initSubscription, t]);
  
  // Reset
  const reset = useCallback(() => {
    setTxState("idle");
    setFailureReason(null);
    setContext({ retryCount: 0 });
    setPreview(null);
    currentParamsRef.current = null;
    abortControllerRef.current?.abort();
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
    }
    resetContract();
  }, [resetContract]);
  
  // Approve token helper
  const approveToken = useCallback(async (amount: number): Promise<boolean> => {
    if (!currentParamsRef.current) return false;
    const tokenData = getTokenData(currentParamsRef.current.tokenType);
    return await tokenData.approve(amount);
  }, [getTokenData]);
  
  // Current token data
  const currentTokenType = currentParamsRef.current?.tokenType || "USDT";
  const tokenData = getTokenData(currentTokenType);
  
  return {
    txState,
    failureReason,
    context,
    progress: STATE_PROGRESS[txState],
    preview,
    isPreviewLoading,
    initSubscription,
    retry,
    reset,
    refreshPreview,
    tokenBalance: tokenData.balance,
    tokenBalanceRaw: tokenData.raw ?? 0n,
    isBalanceLoading: tokenData.loading,
    allowance: tokenData.allowance,
    needsApproval: currentParamsRef.current 
      ? needsApproval(currentParamsRef.current.amount, currentParamsRef.current.tokenType)
      : false,
    approveToken,
    maxRetries: MAX_RETRIES,
    currentChainId: chainId,
    requiredChainId: currentParamsRef.current?.asset.chain_id ?? 1,
  };
}
