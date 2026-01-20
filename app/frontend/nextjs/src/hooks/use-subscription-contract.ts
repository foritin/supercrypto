"use client";
/**
 * useSubscriptionContract Hook
 * 认购合约交互
 *
 * 防重复提交机制:
 * 1. isSubmitting 状态防止重复点击
 * 2. submittedTxHashes 缓存防止重复提交同一交易
 * 3. 后端幂等性保证 (相同 tx_hash 返回已有记录)
 */
import { useState, useCallback, useEffect, useRef } from "react";
import {
  useAccount,
  usePublicClient,
  useWalletClient,
  useChainId,
} from "wagmi";
import { parseAbi, type Address } from "viem";
import {
  contractService,
  SUBSCRIPTION_ABI,
  ERC20_ABI,
  monthsToSeconds,
  formatUSDTAmount,
  parseUSDTAmount,
  basisPointsToPercent,
} from "@/services/contract";
import {
  transactionAuditService,
  TransactionType,
} from "@/services/transaction-audit";

// 合约地址类型
interface ContractAddresses {
  subscription: Address | null;
  usdt: Address | null;
  usdc: Address | null;
}

// 后端网络名称到 chainId 的映射
const NETWORK_CHAIN_ID_MAP: Record<string, number> = {
  local: 31337, // Anvil/Hardhat local network
  localhost: 31337,
  anvil: 31337,
  hardhat: 31337,
  sepolia: 11155111,
  mainnet: 1,
  goerli: 5,
};

// 链上参数类型
interface OnChainParams {
  minInvestment: number;
  maxInvestment: number;
  requireAccredited: boolean;
  paused: boolean;
  apyByPeriod: Record<number, number>; // months -> percent
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
  // 已提交的 tx_hash 缓存，防止重复提交同一交易
  const submittedTxHashes = useRef(new Set<string>());

  // 合约地址状态
  const [addresses, setAddresses] = useState<ContractAddresses | null>(null);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);

  // 后端配置的网络
  const [backendNetwork, setBackendNetwork] = useState<string | null>(null);

  // 链上参数状态
  const [onChainParams, setOnChainParams] = useState<OnChainParams | null>(
    null
  );
  const [isLoadingParams, setIsLoadingParams] = useState(false);

  // 用户数据状态
  const [usdtBalance, setUsdtBalance] = useState<number>(0);
  const [usdtAllowance, setUsdtAllowance] = useState<number>(0);

  // 记录上一次的 chainId，用于检测链切换
  const prevChainIdRef = useRef<number | undefined>(undefined);

  // 检查钱包网络是否与后端配置的网络匹配
  const isNetworkMatched = backendNetwork
    ? NETWORK_CHAIN_ID_MAP[backendNetwork.toLowerCase()] === chainId
    : false;

  // 获取合约地址
  const fetchAddresses = useCallback(async () => {
    setIsLoadingAddresses(true);
    try {
      const data = await contractService.getAddresses();
      setBackendNetwork(data.network);
      setAddresses({
        subscription: data.subscription as Address | null,
        usdt: data.mock_usdt as Address | null,
        usdc: data.mock_usdc as Address | null,
      });
    } catch (err) {
      console.error("Failed to fetch addresses:", err);
    } finally {
      setIsLoadingAddresses(false);
    }
  }, []);

  // 获取链上参数
  const fetchParams = useCallback(async () => {
    if (!addresses?.subscription || !publicClient) return;

    setIsLoadingParams(true);
    try {
      const subscriptionAbi = parseAbi(SUBSCRIPTION_ABI);
      const subscriptionAddr = addresses.subscription;

      // 并行读取链上数据
      const [
        minInvestment,
        maxInvestment,
        requireAccredited,
        paused,
        lockPeriods,
      ] = await Promise.all([
        publicClient.readContract({
          address: subscriptionAddr,
          abi: subscriptionAbi,
          functionName: "minInvestment",
        }) as Promise<bigint>,
        publicClient.readContract({
          address: subscriptionAddr,
          abi: subscriptionAbi,
          functionName: "maxInvestment",
        }) as Promise<bigint>,
        publicClient.readContract({
          address: subscriptionAddr,
          abi: subscriptionAbi,
          functionName: "requireAccredited",
        }) as Promise<boolean>,
        publicClient.readContract({
          address: subscriptionAddr,
          abi: subscriptionAbi,
          functionName: "paused",
        }) as Promise<boolean>,
        publicClient.readContract({
          address: subscriptionAddr,
          abi: subscriptionAbi,
          functionName: "getLockPeriods",
        }) as Promise<readonly [bigint, bigint, bigint, bigint]>,
      ]);

      // 读取每个锁定期的 APY
      const apyPromises = lockPeriods.map(
        (period) =>
          publicClient.readContract({
            address: subscriptionAddr,
            abi: subscriptionAbi,
            functionName: "lockPeriodAPY",
            args: [period],
          }) as Promise<bigint>
      );
      const apys = await Promise.all(apyPromises);

      // 构建 APY 映射 (months -> percent)
      const monthsMapping = [1, 3, 6, 12];
      const apyByPeriod: Record<number, number> = {};
      monthsMapping.forEach((months, index) => {
        apyByPeriod[months] = basisPointsToPercent(Number(apys[index]));
      });

      setOnChainParams({
        minInvestment: parseUSDTAmount(minInvestment),
        maxInvestment: parseUSDTAmount(maxInvestment),
        requireAccredited,
        paused,
        apyByPeriod,
      });
    } catch (err) {
      console.error("Failed to read contract params:", err);
    } finally {
      setIsLoadingParams(false);
    }
  }, [addresses?.subscription, publicClient]);

  // 获取用户余额和授权额度
  const fetchUserData = useCallback(async () => {
    if (!address || !addresses?.usdt || !publicClient) return;

    try {
      const balance = (await publicClient.readContract({
        address: addresses.usdt,
        abi: parseAbi(ERC20_ABI),
        functionName: "balanceOf",
        args: [address],
      })) as bigint;
      setUsdtBalance(parseUSDTAmount(balance));

      if (addresses.subscription) {
        const allowance = (await publicClient.readContract({
          address: addresses.usdt,
          abi: parseAbi(ERC20_ABI),
          functionName: "allowance",
          args: [address, addresses.subscription],
        })) as bigint;
        setUsdtAllowance(parseUSDTAmount(allowance));
      }
    } catch (err) {
      console.error("Failed to fetch user data:", err);
    }
  }, [address, addresses, publicClient]);

  // 监听链切换，重置状态并重新获取地址
  useEffect(() => {
    if (
      prevChainIdRef.current !== undefined &&
      prevChainIdRef.current !== chainId
    ) {
      // 链切换了，重置所有状态
      setAddresses(null);
      setOnChainParams(null);
      setUsdtBalance(0);
      setUsdtAllowance(0);
      setTxState("idle");
      setTxHash(null);
      setError(null);
    }
    prevChainIdRef.current = chainId;
  }, [chainId]);

  // 初始化加载 - 当 chainId 变化时也重新获取
  useEffect(() => {
    if (chainId) {
      fetchAddresses();
    }
  }, [fetchAddresses, chainId]);

  // 只在网络匹配时获取链上参数
  useEffect(() => {
    // 检查网络是否匹配
    const networkMatched = backendNetwork
      ? NETWORK_CHAIN_ID_MAP[backendNetwork.toLowerCase()] === chainId
      : false;

    if (addresses?.subscription && publicClient && networkMatched) {
      fetchParams();
    }
  }, [
    addresses?.subscription,
    fetchParams,
    publicClient,
    backendNetwork,
    chainId,
  ]);

  // 只在网络匹配时获取用户数据
  useEffect(() => {
    // 检查网络是否匹配
    const networkMatched = backendNetwork
      ? NETWORK_CHAIN_ID_MAP[backendNetwork.toLowerCase()] === chainId
      : false;

    if (address && addresses?.usdt && publicClient && networkMatched) {
      fetchUserData();
    }
  }, [
    address,
    addresses?.usdt,
    fetchUserData,
    publicClient,
    backendNetwork,
    chainId,
  ]);

  // 刷新方法
  const refetchParams = fetchParams;
  const refetchBalance = fetchUserData;
  const refetchAllowance = fetchUserData;

  // 授权 USDT
  const approveUSDT = useCallback(
    async (amount: number): Promise<boolean> => {
      if (
        !walletClient ||
        !addresses?.usdt ||
        !addresses?.subscription ||
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

        const hash = await walletClient.writeContract({
          address: addresses.usdt,
          abi: parseAbi(ERC20_ABI),
          functionName: "approve",
          args: [addresses.subscription, amountBigInt],
        });

        setTxHash(hash);

        // 记录交易到审计日志
        transactionAuditService.recordTokenApprove({
          txHash: hash,
          chainId: chainId,
          network: backendNetwork || "local",
          fromAddress: address,
          spenderAddress: addresses.subscription,
          tokenAddress: addresses.usdt,
          tokenSymbol: "USDT",
          tokenDecimals: 6,
          amount: amountBigInt.toString(),
          description: `Approve USDT for subscription`,
        });

        // 等待交易确认
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        // 更新交易状态
        transactionAuditService.updateStatus(hash, "confirmed", {
          block_number: Number(receipt.blockNumber),
          gas_used: Number(receipt.gasUsed),
          effective_gas_price: receipt.effectiveGasPrice?.toString(),
        });

        // 刷新授权额度
        await fetchUserData();

        return true;
      } catch (err) {
        console.error("Approve failed:", err);
        setError((err as Error).message || "Approve failed");
        setTxState("error");
        return false;
      }
    },
    [walletClient, addresses, publicClient, fetchUserData, address, chainId, backendNetwork]
  );

  // 执行认购
  const subscribe = useCallback(
    async (
      amount: number,
      lockPeriodMonths: number
    ): Promise<string | null> => {
      // 防止重复点击
      if (isSubmitting) {
        console.warn("Subscription already in progress");
        return null;
      }

      if (!walletClient || !addresses?.subscription || !publicClient || !address) {
        setError("Wallet not connected");
        return null;
      }

      try {
        setIsSubmitting(true); // 开始提交
        setTxState("subscribing");
        setError(null);

        const amountBigInt = formatUSDTAmount(amount);
        const lockPeriodSeconds = BigInt(monthsToSeconds(lockPeriodMonths));

        const hash = await walletClient.writeContract({
          address: addresses.subscription,
          abi: parseAbi(SUBSCRIPTION_ABI),
          functionName: "subscribe",
          args: [amountBigInt, lockPeriodSeconds],
        });

        // 检查是否已提交过此交易
        if (submittedTxHashes.current.has(hash)) {
          console.warn("Transaction already submitted:", hash);
          setTxState("success");
          return hash;
        }

        // 记录已提交的 tx_hash
        submittedTxHashes.current.add(hash);

        // 记录交易到审计日志
        transactionAuditService.recordSubscription({
          txHash: hash,
          chainId: chainId,
          network: backendNetwork || "local",
          fromAddress: address,
          contractAddress: addresses.subscription,
          amount: amountBigInt.toString(),
          lockPeriodMonths: lockPeriodMonths,
          tokenSymbol: "USDT",
        });

        setTxHash(hash);
        setTxState("confirming");

        // 等待交易确认
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        // 更新交易状态
        transactionAuditService.updateStatus(hash, "confirmed", {
          block_number: Number(receipt.blockNumber),
          gas_used: Number(receipt.gasUsed),
          effective_gas_price: receipt.effectiveGasPrice?.toString(),
        });

        setTxState("success");

        // 刷新数据
        await fetchUserData();

        return hash;
      } catch (err) {
        console.error("Subscribe failed:", err);
        setError((err as Error).message || "Subscribe failed");
        setTxState("error");
        return null;
      } finally {
        setIsSubmitting(false); // 结束提交
      }
    },
    [walletClient, addresses, publicClient, fetchUserData, isSubmitting, address, chainId, backendNetwork]
  );

  // 执行赎回
  const redeem = useCallback(
    async (subscriptionId: number): Promise<string | null> => {
      if (!walletClient || !addresses?.subscription || !publicClient || !address) {
        setError("Wallet not connected");
        return null;
      }

      try {
        setTxState("subscribing"); // reusing state
        setError(null);

        const hash = await walletClient.writeContract({
          address: addresses.subscription,
          abi: parseAbi(SUBSCRIPTION_ABI),
          functionName: "redeem",
          args: [BigInt(subscriptionId)],
        });

        // 记录交易到审计日志
        transactionAuditService.recordContractCall({
          txHash: hash,
          chainId: chainId,
          network: backendNetwork || "local",
          fromAddress: address,
          contractAddress: addresses.subscription,
          contractName: "VankeSubscription",
          functionName: "redeem",
          functionArgs: { subscriptionId },
          description: `Redeem subscription #${subscriptionId}`,
        });

        setTxHash(hash);
        setTxState("confirming");

        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        // 更新交易状态
        transactionAuditService.updateStatus(hash, "confirmed", {
          block_number: Number(receipt.blockNumber),
          gas_used: Number(receipt.gasUsed),
          effective_gas_price: receipt.effectiveGasPrice?.toString(),
        });

        setTxState("success");
        await fetchUserData();

        return hash;
      } catch (err) {
        console.error("Redeem failed:", err);
        setError((err as Error).message || "Redeem failed");
        setTxState("error");
        return null;
      }
    },
    [walletClient, addresses, publicClient, fetchUserData, address, chainId, backendNetwork]
  );

  // 重置状态
  const reset = useCallback(() => {
    setTxState("idle");
    setTxHash(null);
    setError(null);
  }, []);

  return {
    // 合约地址
    addresses,
    isLoadingAddresses,

    // 链上参数
    onChainParams,
    isLoadingParams,
    refetchParams,

    // 用户数据
    usdtBalance,
    usdtAllowance,

    // 交易状态
    txState,
    txHash,
    error,
    isSubmitting, // 提交中状态 (用于禁用按钮)

    // 操作方法
    approveUSDT,
    subscribe,
    redeem,
    reset,

    // 状态
    isConnected,
    isContractReady: !!addresses?.subscription,

    // 网络状态
    isNetworkMatched,
    backendNetwork,
    expectedChainId: backendNetwork
      ? NETWORK_CHAIN_ID_MAP[backendNetwork.toLowerCase()]
      : undefined,
    currentChainId: chainId,
  };
}
