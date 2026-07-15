"use client";
/**
 * useSubscriptionContract Hook
 * 认购合约交互
 *
 * 防重复提交机制:
 * 1. isSubmitting 状态防止重复点击
 * 2. submittedTxHashes 缓存防止重复提交同一交易
 * 3. 后端幂等性保证 (相同 tx_hash 返回已有记录)
 *
 * 请求优化:
 * - 使用 ref 稳定化地址引用，避免 useCallback 依赖变化导致无限循环
 * - 使用 hasFetched ref 防止 StrictMode 双重执行
 * - fetchParams 和 fetchUserData 只在地址/网络真正变化时触发
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { parseAbi, formatEther, type Address } from "viem";
import {
  useAccount,
  usePublicClient,
  useWalletClient,
  useChainId,
} from "wagmi";

import {
  validateBackendNetworkOrThrow,
} from "@/lib/network-guard";
import { pickPreferredContractAddressStablecoin } from "@/lib/stablecoin-selector";
import {
  contractService,
  SUBSCRIPTION_ABI,
  ERC20_ABI,
  monthsToSeconds,
  formatUSDTAmount,
  parseUSDTAmount,
} from "@/services/contract";
import type { ContractAddressItem } from "@/services/contract";
import { transactionAuditService } from "@/services/transaction-audit";

// 合约地址类型
interface ContractAddresses {
  subscription: Address | null;
  usdt: Address | null;
  usdc: Address | null;
}

// 后端网络名称到 chainId 的映射
const NETWORK_CHAIN_ID_MAP: Record<string, number> = {
  local: 31337,
  localhost: 31337,
  anvil: 31337,
  hardhat: 31337,
  sepolia: 11155111,
  "arbitrum-sepolia": 421614,
  arbitrum_sepolia: 421614,
  arbitrum: 42161,
  arb: 42161,
  mainnet: 1,
  goerli: 5,
};

const RPC_GAS_CAP = 16777216n;
const GAS_ESTIMATE_BUFFER_BPS = 12000n; // +20%
const BPS_BASE = 10000n;
const FALLBACK_GAS_LIMIT = 5_000_000n;
const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000" as Address;
const isUserRejected = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string | number })?.code;
  const userRejectedCodes = [4001, "ACTION_REJECTED", "USER_REJECTED"];
  const userRejectedMessages = [
    "user rejected",
    "user denied",
    "request rejected",
    "rejected the request",
    "transaction was rejected",
    "user cancelled",
    "user canceled",
    "cancelled by user",
    "canceled by user",
  ];
  const normalized = message.toLowerCase();
  return (
    (code !== undefined && userRejectedCodes.includes(code)) ||
    userRejectedMessages.some((m) => normalized.includes(m))
  );
};
const PROVIDER_ADDRESS_CACHE_TTL_MS = 15_000;
const SUBSCRIBE_PRECHECK_CACHE_TTL_MS = 8_000;
const NETWORK_FEE_CACHE_TTL_MS = 8_000;

// 链上参数类型（仅保留后端 Asset 表不含的字段）
// minInvestment / apyByPeriod 已由后端 asset.min_subscription / asset.apy_3m/6m/12m 提供
interface OnChainParams {
  maxInvestment: number;
  requireAccredited: boolean;
  paused: boolean;
}

interface NetworkFeeEstimate {
  totalWei: bigint;
  totalEth: string;
  subscribeGas: bigint;
  approvalGas: bigint;
  includesApproval: boolean;
}

// 认购交易状态
export type TxState =
  | "idle"
  | "approving"
  | "subscribing"
  | "confirming"
  | "success"
  | "error";

export function useSubscriptionContract() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();

  const [txState, setTxState] = useState<TxState>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 防重复提交状态
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittedTxHashes = useRef(new Set<string>());

  // 合约地址状态
  const [addresses, setAddresses] = useState<ContractAddresses | null>(null);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);

  // 后端配置的网络
  const [backendNetwork, setBackendNetwork] = useState<string | null>(null);

  // 链上参数状态
  const [onChainParams, setOnChainParams] = useState<OnChainParams | null>(null);
  const [isLoadingParams, setIsLoadingParams] = useState(false);

  // 用户数据状态
  const [usdtBalance, setUsdtBalance] = useState<number>(0);
  const [usdtAllowance, setUsdtAllowance] = useState<number>(0);
  const [usdcBalance, setUsdcBalance] = useState<number>(0);
  const [usdcAllowance, setUsdcAllowance] = useState<number>(0);

  // === 用 ref 稳定化，避免 useCallback 依赖变化导致无限循环 ===
  const addressesRef = useRef<ContractAddresses | null>(null);
  const backendNetworkRef = useRef<string | null>(null);
  const prevChainIdRef = useRef<number | undefined>(undefined);

  // 防止 StrictMode 双重执行
  const paramsFetchedForRef = useRef<string | null>(null);
  const userDataFetchedForRef = useRef<string | null>(null);
  const multicallUnsupportedRef = useRef(false);
  const multicallWarnedRef = useRef(false);
  const providerAddressesCacheRef = useRef<{
    subscription: Address;
    value: {
      usdt: Address | null;
      usdc: Address | null;
      kycManager: Address | null;
      rwaToken: Address | null;
    };
    ts: number;
  } | null>(null);
  const providerAddressesInFlightRef = useRef<Promise<{
    usdt: Address | null;
    usdc: Address | null;
    kycManager: Address | null;
    rwaToken: Address | null;
  }> | null>(null);
  const subscribePrecheckCacheRef = useRef<{
    subscription: Address;
    value: { paused: boolean; minInvestment: bigint; maxInvestment: bigint };
    ts: number;
  } | null>(null);
  const subscribePrecheckInFlightRef = useRef<Promise<{
    paused: boolean;
    minInvestment: bigint;
    maxInvestment: bigint;
  }> | null>(null);
  const feeEstimateCacheRef = useRef<Map<string, { value: NetworkFeeEstimate | null; ts: number }>>(new Map());
  const feeEstimateInFlightRef = useRef<Map<string, Promise<NetworkFeeEstimate | null>>>(new Map());
  const feeEstimateWarnedRef = useRef<Set<string>>(new Set());

  // 同步 ref
  addressesRef.current = addresses;
  backendNetworkRef.current = backendNetwork;

  // 检查钱包网络是否与后端配置的网络匹配
  const isNetworkMatched = backendNetwork
    ? NETWORK_CHAIN_ID_MAP[backendNetwork.toLowerCase()] === chainId
    : false;

  const isMulticallUnsupported = useCallback((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    return message.includes('does not support contract "multicall3"');
  }, []);

  const canUseMulticall = useCallback(() => {
    if (multicallUnsupportedRef.current) return false;
    const chainHasMulticall = !!publicClient?.chain?.contracts?.multicall3?.address;
    if (!chainHasMulticall) {
      multicallUnsupportedRef.current = true;
      return false;
    }
    return true;
  }, [publicClient]);

  const resolveProviderAddresses = useCallback(async () => {
    const addrs = addressesRef.current;
    if (!addrs || !addrs.subscription || !publicClient) {
      return {
        usdt: null,
        usdc: null,
        kycManager: null as Address | null,
        rwaToken: null as Address | null,
      };
    }
    const subscriptionAddr = addrs.subscription as Address;

    const now = Date.now();
    const cached = providerAddressesCacheRef.current;
    if (
      cached &&
      cached.subscription === subscriptionAddr &&
      now - cached.ts < PROVIDER_ADDRESS_CACHE_TTL_MS
    ) {
      return cached.value;
    }

    if (providerAddressesInFlightRef.current) {
      return providerAddressesInFlightRef.current;
    }

    const resolverPromise = (async () => {
      let usdt: Address | null = null;
      let usdc: Address | null = null;
      let kycManager: Address | null = null;
      let rwaToken: Address | null = null;

      try {
        const subscriptionAbi = parseAbi(SUBSCRIPTION_ABI);
        const providerAddress = (await publicClient.readContract({
          address: subscriptionAddr,
          abi: subscriptionAbi,
          functionName: "ADDRESS_PROVIDER",
        })) as Address;

        if (providerAddress && providerAddress !== ADDRESS_ZERO) {
          const providerAbi = parseAbi([
            "function get_usdt() view returns (address)",
            "function get_usdc() view returns (address)",
            "function get_kyc_manager() view returns (address)",
            "function get_vanke_rwa_token() view returns (address)",
          ]);

          const [providerUsdt, providerUsdc, providerKyc, providerRwa] = await Promise.all([
            publicClient.readContract({ address: providerAddress, abi: providerAbi, functionName: "get_usdt" }) as Promise<Address>,
            publicClient.readContract({ address: providerAddress, abi: providerAbi, functionName: "get_usdc" }) as Promise<Address>,
            publicClient.readContract({ address: providerAddress, abi: providerAbi, functionName: "get_kyc_manager" }) as Promise<Address>,
            publicClient.readContract({ address: providerAddress, abi: providerAbi, functionName: "get_vanke_rwa_token" }) as Promise<Address>,
          ]);

          if (providerUsdt && providerUsdt !== ADDRESS_ZERO) usdt = providerUsdt;
          if (providerUsdc && providerUsdc !== ADDRESS_ZERO) usdc = providerUsdc;
          if (providerKyc && providerKyc !== ADDRESS_ZERO) kycManager = providerKyc;
          if (providerRwa && providerRwa !== ADDRESS_ZERO) rwaToken = providerRwa;

          if (usdt !== addrs.usdt || usdc !== addrs.usdc) {
            setAddresses((prev) => (prev ? { ...prev, usdt, usdc } : prev));
          }
        }
      } catch {
        // provider read failed, fall back to backend-provided addresses
      }

      // Fall back to backend-provided addresses if on-chain resolution failed
      const value = {
        usdt: usdt || addrs.usdt,
        usdc: usdc || addrs.usdc,
        kycManager,
        rwaToken,
      };
      providerAddressesCacheRef.current = {
        subscription: subscriptionAddr,
        value,
        ts: Date.now(),
      };

      return value;
    })();

    providerAddressesInFlightRef.current = resolverPromise;
    try {
      return await resolverPromise;
    } finally {
      if (providerAddressesInFlightRef.current === resolverPromise) {
        providerAddressesInFlightRef.current = null;
      }
    }
  }, [publicClient]);

  const getSubscribePrecheck = useCallback(async () => {
    const addrs = addressesRef.current;
    if (!addrs?.subscription || !publicClient) {
      throw new Error("subscription_not_ready");
    }

    const now = Date.now();
    const cached = subscribePrecheckCacheRef.current;
    if (
      cached &&
      cached.subscription === addrs.subscription &&
      now - cached.ts < SUBSCRIBE_PRECHECK_CACHE_TTL_MS
    ) {
      return cached.value;
    }

    if (subscribePrecheckInFlightRef.current) {
      return subscribePrecheckInFlightRef.current;
    }

    const loaderPromise = (async () => {
      const subscriptionAbi = parseAbi(SUBSCRIPTION_ABI);
      const subscriptionAddr = addrs.subscription as Address;
      const [paused, minInvestment, maxInvestment] = await Promise.all([
        publicClient.readContract({
          address: subscriptionAddr,
          abi: subscriptionAbi,
          functionName: "paused",
        }) as Promise<boolean>,
        publicClient.readContract({
          address: subscriptionAddr,
          abi: subscriptionAbi,
          functionName: "min_investment",
        }) as Promise<bigint>,
        publicClient.readContract({
          address: subscriptionAddr,
          abi: subscriptionAbi,
          functionName: "max_investment",
        }) as Promise<bigint>,
      ]);

      const value = { paused, minInvestment, maxInvestment };
      subscribePrecheckCacheRef.current = {
        subscription: subscriptionAddr,
        value,
        ts: Date.now(),
      };
      return value;
    })();

    subscribePrecheckInFlightRef.current = loaderPromise;
    try {
      return await loaderPromise;
    } finally {
      if (subscribePrecheckInFlightRef.current === loaderPromise) {
        subscribePrecheckInFlightRef.current = null;
      }
    }
  }, [publicClient]);

  // ========== 获取合约地址 ==========
  const fetchAddresses = useCallback(async () => {
    setIsLoadingAddresses(true);
    try {
      const data = await contractService.getAddresses();
      validateBackendNetworkOrThrow(data.network);
      setBackendNetwork(data.network);

      const contracts = data.contracts;

      const stablecoins: ContractAddressItem[] = contracts["stablecoin"] || [];
      const usdtContract = pickPreferredContractAddressStablecoin(stablecoins, "USDT");
      const usdcContract = pickPreferredContractAddressStablecoin(stablecoins, "USDC");

      const defiContracts: ContractAddressItem[] = contracts["defi"] || [];
      const subscriptionContract = defiContracts.find(
        (c) => c.name.toLowerCase().includes("subscription")
      );

      setAddresses({
        subscription: (subscriptionContract?.address ?? null) as Address | null,
        usdt: (usdtContract?.address ?? null) as Address | null,
        usdc: (usdcContract?.address ?? null) as Address | null,
      });
    } catch (err) {
      console.error("Failed to fetch addresses:", err);
      setError(err instanceof Error ? err.message : "Backend network mismatch");
    } finally {
      setIsLoadingAddresses(false);
    }
  }, []);

  // ========== 获取链上参数 ==========
  // 仅读取后端 Asset 表中不存在的字段 (max_investment, paused, require_accredited)
  // min_investment / APY / lock_periods 已由后端 asset 提供，无需链上读取
  const fetchParams = useCallback(async () => {
    const addrs = addressesRef.current;
    if (!addrs?.subscription || !publicClient) return;

    setIsLoadingParams(true);
    try {
      const subscriptionAbi = parseAbi(SUBSCRIPTION_ABI);
      const subscriptionAddr = addrs.subscription;
      try {
        const useMulticall = canUseMulticall();
        if (!useMulticall) throw new Error("multicall_disabled");

        const results = await publicClient.multicall({
          allowFailure: true,
          contracts: [
            {
              address: subscriptionAddr,
              abi: subscriptionAbi,
              functionName: "max_investment",
            },
            {
              address: subscriptionAddr,
              abi: subscriptionAbi,
              functionName: "require_accredited",
            },
            {
              address: subscriptionAddr,
              abi: subscriptionAbi,
              functionName: "paused",
            },
          ],
        });

        const maxInvestmentResult = results[0];
        const requireAccreditedResult = results[1];
        const pausedResult = results[2];

        if (
          maxInvestmentResult?.status === "success" &&
          requireAccreditedResult?.status === "success" &&
          pausedResult?.status === "success" &&
          typeof maxInvestmentResult.result === "bigint" &&
          typeof requireAccreditedResult.result === "boolean" &&
          typeof pausedResult.result === "boolean"
        ) {
          setOnChainParams({
            maxInvestment: parseUSDTAmount(maxInvestmentResult.result),
            requireAccredited: requireAccreditedResult.result,
            paused: pausedResult.result,
          });
          return;
        }

        throw new Error("multicall_partial_failure");
      } catch (batchErr) {
        if (isMulticallUnsupported(batchErr)) {
          multicallUnsupportedRef.current = true;
          if (!multicallWarnedRef.current) {
            multicallWarnedRef.current = true;
            console.info("[Subscription] multicall3 unavailable on current chain, switched to single reads.");
          }
        } else if ((batchErr as Error)?.message !== "multicall_disabled") {
          console.warn("[Subscription] multicall params failed, fallback to single reads:", batchErr);
        }

        const [maxInvestment, requireAccredited, paused] = await Promise.all([
          publicClient.readContract({
            address: subscriptionAddr,
            abi: subscriptionAbi,
            functionName: "max_investment",
          }) as Promise<bigint>,
          publicClient.readContract({
            address: subscriptionAddr,
            abi: subscriptionAbi,
            functionName: "require_accredited",
          }) as Promise<boolean>,
          publicClient.readContract({
            address: subscriptionAddr,
            abi: subscriptionAbi,
            functionName: "paused",
          }) as Promise<boolean>,
        ]);

        setOnChainParams({
          maxInvestment: parseUSDTAmount(maxInvestment),
          requireAccredited,
          paused,
        });
      }
    } catch (err) {
      console.error("Failed to read contract params:", err);
    } finally {
      setIsLoadingParams(false);
    }
  }, [publicClient, canUseMulticall, isMulticallUnsupported]); // 只依赖 publicClient，地址从 ref 读取

  // ========== 获取用户余额和授权额度 ==========
  const fetchUserData = useCallback(async () => {
    const addrs = addressesRef.current;
    if (!address || !publicClient || !addrs) return;

    const resolved = await resolveProviderAddresses();

    const erc20Abi = parseAbi(ERC20_ABI);

    const callSpecs: Array<{
      key: "usdtBalance" | "usdtAllowance" | "usdcBalance" | "usdcAllowance";
      contract: {
        address: Address;
        abi: ReturnType<typeof parseAbi>;
        functionName: "balanceOf" | "allowance";
        args: readonly [Address] | readonly [Address, Address];
      };
    }> = [];

    if (resolved.usdt) {
      callSpecs.push({
        key: "usdtBalance",
        contract: {
          address: resolved.usdt,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [address],
        },
      });

      if (addrs.subscription) {
        callSpecs.push({
          key: "usdtAllowance",
          contract: {
            address: resolved.usdt,
            abi: erc20Abi,
            functionName: "allowance",
            args: [address, addrs.subscription],
          },
        });
      }
    }

    if (resolved.usdc) {
      callSpecs.push({
        key: "usdcBalance",
        contract: {
          address: resolved.usdc,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [address],
        },
      });

      if (addrs.subscription) {
        callSpecs.push({
          key: "usdcAllowance",
          contract: {
            address: resolved.usdc,
            abi: erc20Abi,
            functionName: "allowance",
            args: [address, addrs.subscription],
          },
        });
      }
    }

    if (callSpecs.length === 0) {
      setUsdtBalance(0);
      setUsdtAllowance(0);
      setUsdcBalance(0);
      setUsdcAllowance(0);
      return;
    }

    const applyValue = (
      key: "usdtBalance" | "usdtAllowance" | "usdcBalance" | "usdcAllowance",
      value: bigint | null
    ) => {
      const numeric = value ? parseUSDTAmount(value) : 0;
      switch (key) {
        case "usdtBalance":
          setUsdtBalance(numeric);
          break;
        case "usdtAllowance":
          setUsdtAllowance(numeric);
          break;
        case "usdcBalance":
          setUsdcBalance(numeric);
          break;
        case "usdcAllowance":
          setUsdcAllowance(numeric);
          break;
      }
    };

    try {
      const useMulticall = canUseMulticall();
      if (!useMulticall) throw new Error("multicall_disabled");

      const results = await publicClient.multicall({
        allowFailure: true,
        contracts: callSpecs.map((spec) => spec.contract),
      });

      results.forEach((result, index) => {
        const spec = callSpecs[index];
        if (!spec) return;

        if (result.status === "success" && typeof result.result === "bigint") {
          applyValue(spec.key, result.result);
        } else {
          applyValue(spec.key, null);
        }
      });
    } catch (batchErr) {
      if (isMulticallUnsupported(batchErr)) {
        multicallUnsupportedRef.current = true;
        if (!multicallWarnedRef.current) {
          multicallWarnedRef.current = true;
          console.info("[Subscription] multicall3 unavailable on current chain, switched to single reads.");
        }
      } else if ((batchErr as Error)?.message !== "multicall_disabled") {
        console.warn("[Subscription] multicall user data failed, fallback to single reads:", batchErr);
      }

      const readSingle = async (
        key: "usdtBalance" | "usdtAllowance" | "usdcBalance" | "usdcAllowance",
        contract: {
          address: Address;
          abi: ReturnType<typeof parseAbi>;
          functionName: "balanceOf" | "allowance";
          args: readonly [Address] | readonly [Address, Address];
        }
      ) => {
        try {
          const value = (await publicClient.readContract(contract)) as bigint;
          applyValue(key, value);
        } catch {
          applyValue(key, null);
        }
      };

      await Promise.all(
        callSpecs.map((spec) => readSingle(spec.key, spec.contract))
      );
    }
  }, [address, publicClient, canUseMulticall, isMulticallUnsupported, resolveProviderAddresses]); // 只依赖 address 和 publicClient

  // ========== Effects ==========

  // 监听链切换，重置状态
  useEffect(() => {
    if (
      prevChainIdRef.current !== undefined &&
      prevChainIdRef.current !== chainId
    ) {
      setAddresses(null);
      setOnChainParams(null);
      setUsdtBalance(0);
      setUsdtAllowance(0);
      setTxState("idle");
      setTxHash(null);
      setError(null);
      // 重置 fetch 标记
      paramsFetchedForRef.current = null;
      userDataFetchedForRef.current = null;
      providerAddressesCacheRef.current = null;
      providerAddressesInFlightRef.current = null;
      subscribePrecheckCacheRef.current = null;
      subscribePrecheckInFlightRef.current = null;
      feeEstimateCacheRef.current.clear();
      feeEstimateInFlightRef.current.clear();
      feeEstimateWarnedRef.current.clear();
    }
    prevChainIdRef.current = chainId;
  }, [chainId]);

  // 初始化加载合约地址 (只在 chainId 变化时)
  useEffect(() => {
    if (chainId) {
      fetchAddresses();
    }
  }, [fetchAddresses, chainId]);

  // 获取链上参数 - 用具体的地址字符串作为依赖，避免对象引用变化
  const subscriptionAddr = addresses?.subscription ?? null;
  useEffect(() => {
    const networkMatched = backendNetwork
      ? NETWORK_CHAIN_ID_MAP[backendNetwork.toLowerCase()] === chainId
      : false;

    if (!subscriptionAddr || !publicClient || !networkMatched) return;

    // 防止对同一地址重复请求
    const fetchKey = `${subscriptionAddr}-${chainId}`;
    if (paramsFetchedForRef.current === fetchKey) return;
    paramsFetchedForRef.current = fetchKey;

    fetchParams();
  }, [subscriptionAddr, publicClient, backendNetwork, chainId, fetchParams]);

  // 获取用户余额 - 用具体的地址字符串作为依赖
  const usdtAddr = addresses?.usdt ?? null;
  useEffect(() => {
    const networkMatched = backendNetwork
      ? NETWORK_CHAIN_ID_MAP[backendNetwork.toLowerCase()] === chainId
      : false;

    if (!address || !usdtAddr || !publicClient || !networkMatched) return;

    // 防止对同一组合重复请求
    const fetchKey = `${address}-${usdtAddr}-${chainId}`;
    if (userDataFetchedForRef.current === fetchKey) return;
    userDataFetchedForRef.current = fetchKey;

    fetchUserData();
  }, [address, usdtAddr, publicClient, backendNetwork, chainId, fetchUserData]);

  // 刷新方法 (手动调用时重置 fetch 标记)
  const refetchParams = useCallback(() => {
    paramsFetchedForRef.current = null;
    return fetchParams();
  }, [fetchParams]);

  const refetchBalance = useCallback(() => {
    userDataFetchedForRef.current = null;
    return fetchUserData();
  }, [fetchUserData]);

  // refetchAllowance 与 refetchBalance 共用同一方法
  void refetchBalance;

  // 预估网络费（可能包含 approve + subscribe 两笔）
  const estimateNetworkFee = useCallback(
    async (
      amount: number,
      lockPeriodMonths: number,
      tokenType: "USDT" | "USDC"
    ): Promise<NetworkFeeEstimate | null> => {
      const addrs = addressesRef.current;
      if (!publicClient || !address || !addrs?.subscription) return null;
      const subscriptionAddr = addrs.subscription as Address;
      const amountBigInt = formatUSDTAmount(amount);
      const lockPeriodSeconds = BigInt(monthsToSeconds(lockPeriodMonths));
      const feeKey = [
        address,
        chainId,
        subscriptionAddr,
        tokenType,
        amountBigInt.toString(),
        lockPeriodSeconds.toString(),
        String(tokenType === "USDT" ? usdtAllowance : usdcAllowance),
      ].join("|");

      try {
        const subscriptionAbi = parseAbi(SUBSCRIPTION_ABI);
        const erc20Abi = parseAbi(ERC20_ABI);

        const now = Date.now();
        const cached = feeEstimateCacheRef.current.get(feeKey);
        if (cached && now - cached.ts < NETWORK_FEE_CACHE_TTL_MS) {
          return cached.value;
        }

        const inFlight = feeEstimateInFlightRef.current.get(feeKey);
        if (inFlight) {
          return inFlight;
        }

        const estimatePromise = (async () => {
          const resolved = await resolveProviderAddresses();
          const paymentToken = tokenType === "USDT" ? resolved.usdt : resolved.usdc;
          if (!paymentToken || !resolved.rwaToken || !resolved.kycManager) return null;

          const { paused, minInvestment, maxInvestment } = await getSubscribePrecheck();
          if (paused) return null;
          if (amountBigInt < minInvestment) return null;
          if (maxInvestment > 0n && amountBigInt > maxInvestment) return null;

          const subscribeGas = await publicClient.estimateContractGas({
            account: address,
            address: subscriptionAddr,
            abi: subscriptionAbi,
            functionName: "subscribe",
            args: [amountBigInt, lockPeriodSeconds, paymentToken],
          });

          const currentAllowance = tokenType === "USDT" ? usdtAllowance : usdcAllowance;
          const tokenAddress = paymentToken;
          const includesApproval = !!tokenAddress && (currentAllowance ?? 0) < amount;

          let approvalGas = 0n;
          if (includesApproval && tokenAddress) {
            approvalGas = await publicClient.estimateContractGas({
              account: address,
              address: tokenAddress,
              abi: erc20Abi,
              functionName: "approve",
              args: [subscriptionAddr, amountBigInt],
            });
          }

          const gasPrice = await publicClient.getGasPrice();
          const totalWei = (subscribeGas + approvalGas) * gasPrice;

          return {
            totalWei,
            totalEth: formatEther(totalWei),
            subscribeGas,
            approvalGas,
            includesApproval,
          };
        })();

        feeEstimateInFlightRef.current.set(feeKey, estimatePromise);
        const estimate = await estimatePromise;
        feeEstimateCacheRef.current.set(feeKey, { value: estimate, ts: Date.now() });
        return estimate;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const looksLikeExecutionRevert =
          message.includes("ContractFunctionExecutionError") ||
          message.includes("ContractFunctionRevertedError") ||
          message.includes("Internal error");

        if (!looksLikeExecutionRevert || !feeEstimateWarnedRef.current.has(feeKey)) {
          if (looksLikeExecutionRevert) {
            feeEstimateWarnedRef.current.add(feeKey);
            console.info("[Subscription] estimateNetworkFee skipped due to current on-chain preconditions.");
          } else {
            console.warn("[Subscription] estimateNetworkFee failed:", error);
          }
        }
        return null;
      } finally {
        // 逐项清理 in-flight，避免长期占用
        feeEstimateInFlightRef.current.delete(feeKey);
      }
    },
    [publicClient, address, chainId, usdtAllowance, usdcAllowance, resolveProviderAddresses, getSubscribePrecheck]
  );

  // 授权 USDC
  const approveUSDC = useCallback(
    async (amount: number): Promise<boolean> => {
      const addrs = addressesRef.current;
      if (
        !walletClient ||
        !addrs?.usdc ||
        !addrs?.subscription ||
        !publicClient ||
        !address
      ) {
        setError("Wallet not connected");
        return false;
      }

      try {
        setTxState("approving");
        setError(null);

        const amountBigInt = formatUSDTAmount(amount);
        const resolved = await resolveProviderAddresses();
        if (!resolved.usdc) {
          setError("USDC address not configured");
          return false;
        }
        const approveGasEstimate = await publicClient
          .estimateContractGas({
            account: address,
            address: resolved.usdc,
            abi: parseAbi(ERC20_ABI),
            functionName: "approve",
            args: [addrs.subscription, amountBigInt],
          })
          .catch(() => FALLBACK_GAS_LIMIT);

        const approveGasBuffered =
          (approveGasEstimate * GAS_ESTIMATE_BUFFER_BPS) / BPS_BASE;
        const approveGasLimit =
          approveGasBuffered > RPC_GAS_CAP ? RPC_GAS_CAP : approveGasBuffered;

        const hash = await walletClient.writeContract({
          address: resolved.usdc,
          abi: parseAbi(ERC20_ABI),
          functionName: "approve",
          args: [addrs.subscription, amountBigInt],
          gas: approveGasLimit,
        });

        setTxHash(hash);

        transactionAuditService.recordTokenApprove({
          txHash: hash,
          chainId: chainId,
          network: backendNetworkRef.current || "hardhat",
          fromAddress: address,
          spenderAddress: addrs.subscription,
          tokenAddress: resolved.usdc,
          tokenSymbol: "USDC",
          tokenDecimals: 6,
          amount: amountBigInt.toString(),
          description: `Approve USDC for subscription`,
        });

        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        transactionAuditService.updateStatus(hash, "confirmed", {
          block_number: Number(receipt.blockNumber),
          gas_used: Number(receipt.gasUsed),
          effective_gas_price: receipt.effectiveGasPrice?.toString(),
        });

        // 刷新授权额度
        userDataFetchedForRef.current = null;
        await fetchUserData();

        return true;
      } catch (err) {
        console.error("USDC Approve failed:", err);
        const isRejected = isUserRejected(err);
        setError(isRejected ? "User rejected the approval" : ((err as Error).message || "USDC Approve failed"));
        setTxState("error");
        return false;
      }
    },
    [walletClient, publicClient, fetchUserData, address, chainId, resolveProviderAddresses]
  );

  // ========== 交易操作 ==========

  // 授权 USDT
  const approveUSDT = useCallback(
    async (amount: number): Promise<boolean> => {
      const addrs = addressesRef.current;
      if (
        !walletClient ||
        !addrs?.usdt ||
        !addrs?.subscription ||
        !publicClient ||
        !address
      ) {
        setError("Wallet not connected");
        return false;
      }

      try {
        setTxState("approving");
        setError(null);

        const amountBigInt = formatUSDTAmount(amount);
        const resolved = await resolveProviderAddresses();
        if (!resolved.usdt) {
          setError("USDT address not configured");
          return false;
        }
        const approveGasEstimate = await publicClient
          .estimateContractGas({
            account: address,
            address: resolved.usdt,
            abi: parseAbi(ERC20_ABI),
            functionName: "approve",
            args: [addrs.subscription, amountBigInt],
          })
          .catch(() => FALLBACK_GAS_LIMIT);

        const approveGasBuffered =
          (approveGasEstimate * GAS_ESTIMATE_BUFFER_BPS) / BPS_BASE;
        const approveGasLimit =
          approveGasBuffered > RPC_GAS_CAP ? RPC_GAS_CAP : approveGasBuffered;

        const hash = await walletClient.writeContract({
          address: resolved.usdt,
          abi: parseAbi(ERC20_ABI),
          functionName: "approve",
          args: [addrs.subscription, amountBigInt],
          gas: approveGasLimit,
        });

        setTxHash(hash);

        transactionAuditService.recordTokenApprove({
          txHash: hash,
          chainId: chainId,
          network: backendNetworkRef.current || "hardhat",
          fromAddress: address,
          spenderAddress: addrs.subscription,
          tokenAddress: resolved.usdt,
          tokenSymbol: "USDT",
          tokenDecimals: 6,
          amount: amountBigInt.toString(),
          description: `Approve USDT for subscription`,
        });

        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        transactionAuditService.updateStatus(hash, "confirmed", {
          block_number: Number(receipt.blockNumber),
          gas_used: Number(receipt.gasUsed),
          effective_gas_price: receipt.effectiveGasPrice?.toString(),
        });

        // 刷新授权额度
        userDataFetchedForRef.current = null;
        await fetchUserData();

        return true;
      } catch (err) {
        console.error("Approve failed:", err);
        const isRejected = isUserRejected(err);
        setError(isRejected ? "User rejected the approval" : ((err as Error).message || "Approve failed"));
        setTxState("error");
        return false;
      }
    },
    [walletClient, publicClient, fetchUserData, address, chainId, resolveProviderAddresses]
  );

  // 执行认购
  const subscribe = useCallback(
    async (
      amount: number,
      lockPeriodMonths: number,
      tokenType: "USDT" | "USDC" = "USDT"
    ): Promise<{ txHash: string | null; error: string | null; rejected: boolean }> => {
      if (isSubmitting) {
        console.warn("Subscription already in progress");
        return { txHash: null, error: "Subscription already in progress", rejected: false };
      }

      const addrs = addressesRef.current;
      if (!walletClient || !addrs?.subscription || !publicClient || !address) {
        setError("Wallet not connected");
        return { txHash: null, error: "Wallet not connected", rejected: false };
      }

      try {
        setIsSubmitting(true);
        setTxState("subscribing");
        setError(null);

        const amountBigInt = formatUSDTAmount(amount);
        const lockPeriodSeconds = BigInt(monthsToSeconds(lockPeriodMonths));
        const resolved = await resolveProviderAddresses();
        const paymentToken = tokenType === "USDT" ? resolved.usdt : resolved.usdc;
        if (!paymentToken) {
          setError("Provider missing payment token binding (USDT/USDC). Please register provider dependencies.");
          setTxState("error");
          return { txHash: null, error: "Provider missing payment token binding", rejected: false };
        }

        if (!resolved.rwaToken) {
          setError("Provider missing RWA token binding. Please register provider dependencies.");
          setTxState("error");
          return { txHash: null, error: "Provider missing RWA token binding", rejected: false };
        }

        if (!resolved.kycManager) {
          setError("Provider missing KYC manager binding. Please register provider dependencies.");
          setTxState("error");
          return { txHash: null, error: "Provider missing KYC manager binding", rejected: false };
        }

        // 链上预检：避免节点返回笼统的 "Internal error"
        console.log("[Subscription] Checking contract precheck...");
        const { paused: isPaused, minInvestment, maxInvestment } = await getSubscribePrecheck();

        if (isPaused) {
          setError("Contract paused");
          setTxState("error");
          return { txHash: null, error: "Contract paused", rejected: false };
        }

        if (amountBigInt < minInvestment) {
          const minHuman = parseUSDTAmount(minInvestment).toFixed(2);
          setError(`Below on-chain minimum investment: ${minHuman}`);
          setTxState("error");
          return { txHash: null, error: `Below on-chain minimum investment: ${minHuman}`, rejected: false };
        }

        if (maxInvestment > 0n && amountBigInt > maxInvestment) {
          const maxHuman = parseUSDTAmount(maxInvestment).toFixed(2);
          setError(`Exceeds on-chain maximum investment: ${maxHuman}`);
          setTxState("error");
          return { txHash: null, error: `Exceeds on-chain maximum investment: ${maxHuman}`, rejected: false };
        }

        const kycAbi = parseAbi([
          "function is_verified(address) view returns (bool)",
          "function is_accredited(address) view returns (bool)",
          "function can_invest(address,uint256) view returns (bool)",
        ]);

        console.log("[Subscription] Checking KYC status...");
        const [verified, requireAccredited, accredited, canInvest] = await Promise.all([
          publicClient.readContract({
            address: resolved.kycManager,
            abi: kycAbi,
            functionName: "is_verified",
            args: [address],
          }) as Promise<boolean>,
          Promise.resolve(onChainParams?.requireAccredited ?? false),
          publicClient.readContract({
            address: resolved.kycManager,
            abi: kycAbi,
            functionName: "is_accredited",
            args: [address],
          }) as Promise<boolean>,
          publicClient.readContract({
            address: resolved.kycManager,
            abi: kycAbi,
            functionName: "can_invest",
            args: [address, amountBigInt],
          }) as Promise<boolean>,
        ]);

        if (!verified) {
          setError("KYC verification required");
          setTxState("error");
          return { txHash: null, error: "KYC verification required", rejected: false };
        }
        if (requireAccredited && !accredited) {
          setError("Accredited investor required");
          setTxState("error");
          return { txHash: null, error: "Accredited investor required", rejected: false };
        }

        if (!canInvest) {
          setError("Cannot invest");
          setTxState("error");
          return { txHash: null, error: "Cannot invest", rejected: false };
        }

        console.log("[Subscription] Estimating gas...");
        const subscribeGasEstimate = await publicClient
          .estimateContractGas({
            account: address,
            address: addrs.subscription,
            abi: parseAbi(SUBSCRIPTION_ABI),
            functionName: "subscribe",
            args: [amountBigInt, lockPeriodSeconds, paymentToken],
          })
          .catch((err) => {
            console.warn("[Subscription] Gas estimation failed, using fallback:", err);
            return FALLBACK_GAS_LIMIT;
          });

        const subscribeGasBuffered =
          (subscribeGasEstimate * GAS_ESTIMATE_BUFFER_BPS) / BPS_BASE;
        const subscribeGasLimit =
          subscribeGasBuffered > RPC_GAS_CAP ? RPC_GAS_CAP : subscribeGasBuffered;

        console.log("[Subscription] Opening wallet for subscribe...");
        const hash = await walletClient.writeContract({
          address: addrs.subscription,
          abi: parseAbi(SUBSCRIPTION_ABI),
          functionName: "subscribe",
          args: [amountBigInt, lockPeriodSeconds, paymentToken],
          gas: subscribeGasLimit,
        });

        if (submittedTxHashes.current.has(hash)) {
          console.warn("Transaction already submitted:", hash);
          setTxState("success");
          return { txHash: hash, error: null, rejected: false };
        }

        submittedTxHashes.current.add(hash);

        transactionAuditService.recordSubscription({
          txHash: hash,
          chainId: chainId,
          network: backendNetworkRef.current || "hardhat",
          fromAddress: address,
          contractAddress: addrs.subscription,
          amount: amountBigInt.toString(),
          lockPeriodMonths: lockPeriodMonths,
          tokenSymbol: tokenType,
        });

        setTxHash(hash);
        setTxState("confirming");

        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        // Check on-chain receipt status
        if (receipt.status !== "success") {
          transactionAuditService.updateStatus(hash, "failed", {
            block_number: Number(receipt.blockNumber),
            gas_used: Number(receipt.gasUsed),
            effective_gas_price: receipt.effectiveGasPrice?.toString(),
          });
          setError("Transaction failed on-chain");
          setTxState("error");
          return { txHash: hash, error: "Transaction failed on-chain", rejected: false };
        }

        transactionAuditService.updateStatus(hash, "confirmed", {
          block_number: Number(receipt.blockNumber),
          gas_used: Number(receipt.gasUsed),
          effective_gas_price: receipt.effectiveGasPrice?.toString(),
        });

        setTxState("success");

        userDataFetchedForRef.current = null;
        await fetchUserData();

        return { txHash: hash, error: null, rejected: false };
      } catch (err) {
        console.error("Subscribe failed:", err);
        const isRejected = isUserRejected(err);
        const message = isRejected ? "User rejected the subscription" : ((err as Error).message || "Subscribe failed");
        setError(message);
        setTxState("error");
        return { txHash: null, error: message, rejected: isRejected };
      } finally {
        setIsSubmitting(false);
      }
    },
    [walletClient, publicClient, fetchUserData, isSubmitting, address, chainId, resolveProviderAddresses, onChainParams, getSubscribePrecheck]
  );

  // 直接查询链上交易回执（不依赖后端数据库）
  const checkTxReceipt = useCallback(
    async (
      txHash: string
    ): Promise<{
      success: boolean;
      blockNumber?: number;
      gasUsed?: bigint;
      effectiveGasPrice?: bigint;
    } | null> => {
      if (!publicClient) return null;
      try {
        const receipt = await publicClient.getTransactionReceipt({
          hash: txHash as `0x${string}`,
        });
        if (!receipt) return null;
        return {
          success: receipt.status === "success",
          blockNumber: Number(receipt.blockNumber),
          gasUsed: receipt.gasUsed,
          effectiveGasPrice: receipt.effectiveGasPrice ?? undefined,
        };
      } catch {
        return null;
      }
    },
    [publicClient]
  );

  // 执行赎回
  const redeem = useCallback(
    async (subscriptionId: number): Promise<string | null> => {
      const addrs = addressesRef.current;
      if (!walletClient || !addrs?.subscription || !publicClient || !address) {
        setError("Wallet not connected");
        return null;
      }

      try {
        setTxState("subscribing");
        setError(null);

        const redeemGasEstimate = await publicClient
          .estimateContractGas({
            account: address,
            address: addrs.subscription,
            abi: parseAbi(SUBSCRIPTION_ABI),
            functionName: "redeem",
            args: [BigInt(subscriptionId)],
          })
          .catch(() => FALLBACK_GAS_LIMIT);

        const redeemGasBuffered =
          (redeemGasEstimate * GAS_ESTIMATE_BUFFER_BPS) / BPS_BASE;
        const redeemGasLimit =
          redeemGasBuffered > RPC_GAS_CAP ? RPC_GAS_CAP : redeemGasBuffered;

        const hash = await walletClient.writeContract({
          address: addrs.subscription,
          abi: parseAbi(SUBSCRIPTION_ABI),
          functionName: "redeem",
          args: [BigInt(subscriptionId)],
          gas: redeemGasLimit,
        });

        transactionAuditService.recordContractCall({
          txHash: hash,
          chainId: chainId,
          network: backendNetworkRef.current || "hardhat",
          fromAddress: address,
          contractAddress: addrs.subscription,
          contractName: "VankeSubscription",
          functionName: "redeem",
          functionArgs: { subscriptionId },
          description: `Redeem subscription #${subscriptionId}`,
        });

        setTxHash(hash);
        setTxState("confirming");

        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        transactionAuditService.updateStatus(hash, "confirmed", {
          block_number: Number(receipt.blockNumber),
          gas_used: Number(receipt.gasUsed),
          effective_gas_price: receipt.effectiveGasPrice?.toString(),
        });

        setTxState("success");
        userDataFetchedForRef.current = null;
        await fetchUserData();

        return hash;
      } catch (err) {
        console.error("Redeem failed:", err);
        setError((err as Error).message || "Redeem failed");
        setTxState("error");
        return null;
      }
    },
    [walletClient, publicClient, fetchUserData, address, chainId]
  );

  // 重置状态
  const reset = useCallback(() => {
    setTxState("idle");
    setTxHash(null);
    setError(null);
  }, []);

  return {
    addresses,
    isLoadingAddresses,

    onChainParams,
    isLoadingParams,
    refetchParams,

    usdtBalance,
    usdtAllowance,
    usdcBalance,
    usdcAllowance,

    txState,
    txHash,
    error,
    isSubmitting,

    approveUSDT,
    approveUSDC,
    subscribe,
    redeem,
    estimateNetworkFee,
    checkTxReceipt,
    reset,

    isConnected,
    isContractReady: !!addresses?.subscription,

    isNetworkMatched,
    backendNetwork,
    expectedChainId: backendNetwork
      ? NETWORK_CHAIN_ID_MAP[backendNetwork.toLowerCase()]
      : undefined,
    currentChainId: chainId,
  };
}
