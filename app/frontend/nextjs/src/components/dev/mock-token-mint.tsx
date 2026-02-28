"use client";
/**
 * Mock Token Mint Component - Web3 Dark Theme
 * Developer tool for minting and transferring test tokens
 * Only available to admin users
 * 
 * Migrated from Ant Design to shadcn/ui
 * @validates Requirements 16.13
 */
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  DollarSign,
  Send,
  RefreshCw,
  Plus,
  User,
  Wallet,
  AlertTriangle,
  Loader2,
  Check,
  Circle,
} from "lucide-react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
} from "wagmi";
import { parseUnits, formatUnits } from "viem";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { notification } from "@/lib/notification";
import {
  MOCK_TOKEN_INFO,
  MOCK_TOKEN_ABI,
  type MockTokenType,
} from "@/contracts/mock-token";
import { devToolsService, type TokenRecipient } from "@/services/dev-tools";
import { useCurrentUser, useStablecoinAddresses } from "@/hooks";
import { transactionAuditService } from "@/services/transaction-audit";
import { truncateAddress } from "@/lib/utils";

type MintStep =
  | "idle"
  | "minting"
  | "confirming_mint"
  | "transferring"
  | "confirming_transfer"
  | "done";

export function MockTokenMint() {
  const { t } = useTranslation();
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { isAdmin } = useCurrentUser();
  const { addresses, isLoading: isAddressesLoading } = useStablecoinAddresses();
  const [selectedToken, setSelectedToken] = useState<MockTokenType>("MockUSDT");
  const [mintAmount, setMintAmount] = useState<string>("1000");
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(
    null
  );
  const [currentStep, setCurrentStep] = useState<MintStep>("idle");
  const lastProcessedTxRef = useRef<string | null>(null);

  const tokenInfo = MOCK_TOKEN_INFO[selectedToken];
  const tokenAddress = addresses[selectedToken];

  // Fetch token recipients
  const [recipients, setRecipients] = useState<TokenRecipient[]>([]);
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(false);

  const fetchRecipients = async () => {
    if (!isAdmin) return;
    setIsLoadingRecipients(true);
    try {
      const data = await devToolsService.getTokenRecipients();
      setRecipients(data);
    } catch (err) {
      console.error("Failed to fetch recipients:", err);
    } finally {
      setIsLoadingRecipients(false);
    }
  };

  const refetchRecipients = fetchRecipients;

  useEffect(() => {
    if (isAdmin) {
      fetchRecipients();
    }
  }, [isAdmin]);

  // Read admin balance (手动 refetch，不再自动轮询)
  const {
    data: adminBalance,
    isLoading: isBalanceLoading,
    refetch: refetchBalance,
  } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: MOCK_TOKEN_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Read recipient balance (手动 refetch，不再自动轮询)
  const { data: recipientBalance, refetch: refetchRecipientBalance } =
    useReadContract({
      address: tokenAddress as `0x${string}`,
      abi: MOCK_TOKEN_ABI,
      functionName: "balanceOf",
      args: selectedRecipient
        ? [selectedRecipient as `0x${string}`]
        : undefined,
      query: {
        enabled: !!selectedRecipient,
      },
    });

  // Write contract
  const {
    writeContract,
    data: txHash,
    isPending: isWriting,
    reset: resetWrite,
  } = useWriteContract();

  // Wait for transaction
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: txHash,
    });

  // Reset transaction state when token changes
  useEffect(() => {
    resetWrite();
    lastProcessedTxRef.current = null;
    setCurrentStep("idle");
  }, [selectedToken, resetWrite]);

  // Add token to MetaMask
  const addTokenToWallet = async () => {
    try {
      const ethereum = window.ethereum as
        | {
            request?: (args: {
              method: string;
              params: unknown;
            }) => Promise<boolean>;
          }
        | undefined;
      if (!ethereum || !ethereum.request) {
        notification.error("MetaMask not installed");
        return;
      }

      const wasAdded = await ethereum.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: tokenAddress,
            symbol: tokenInfo.symbol,
            decimals: tokenInfo.decimals,
          },
        },
      });

      if (wasAdded) {
        notification.success(`${tokenInfo.symbol} added to wallet!`);
      }
    } catch (error) {
      console.error("Failed to add token:", error);
      notification.error("Failed to add token to wallet");
    }
  };

  // Format balance for display
  const formatBalance = (balance: bigint | undefined) => {
    if (!balance) return "0";
    return formatUnits(balance as bigint, tokenInfo.decimals);
  };

  // Parse mint amount
  const parsedMintAmount = parseFloat(mintAmount) || 0;

  // Handle mint to admin first, then transfer to recipient
  const handleMintAndTransfer = async () => {
    if (!address || !parsedMintAmount || !selectedRecipient) return;

    const amount = parseUnits(parsedMintAmount.toString(), tokenInfo.decimals);

    console.log("=== Mint & Transfer Debug ===");
    console.log("Token Address:", tokenAddress);
    console.log("Admin Address:", address);
    console.log("Recipient Address:", selectedRecipient);
    console.log("Amount (raw):", amount.toString());

    // Step 1: Mint to admin
    setCurrentStep("minting");

    try {
      writeContract(
        {
          address: tokenAddress as `0x${string}`,
          abi: MOCK_TOKEN_ABI,
          functionName: "mint",
          args: [address, amount],
        },
        {
          onSuccess: (hash) => {
            console.log("Mint transaction submitted:", hash);
            setCurrentStep("confirming_mint");
            // Record mint transaction audit
            transactionAuditService.recordContractCall({
              txHash: hash,
              chainId,
              network: "hardhat",
              fromAddress: address,
              contractAddress: tokenAddress,
              contractName: selectedToken,
              functionName: "mint",
              functionArgs: { to: address, amount: amount.toString() },
              description: `[Dev] Mint ${parsedMintAmount} ${tokenInfo.symbol}`,
            });
          },
          onError: (error) => {
            console.error("Mint error:", error);
            notification.error(error.message || t("common.error"));
            setCurrentStep("idle");
          },
        }
      );
    } catch (err) {
      console.error("Mint exception:", err);
      setCurrentStep("idle");
    }
  };

  // Handle transfer after mint is confirmed
  const handleTransfer = async () => {
    if (!address || !parsedMintAmount || !selectedRecipient) return;

    const amount = parseUnits(parsedMintAmount.toString(), tokenInfo.decimals);

    setCurrentStep("transferring");

    try {
      resetWrite();
      writeContract(
        {
          address: tokenAddress as `0x${string}`,
          abi: MOCK_TOKEN_ABI,
          functionName: "transfer",
          args: [selectedRecipient as `0x${string}`, amount],
        },
        {
          onSuccess: (hash) => {
            console.log("Transfer transaction submitted:", hash);
            setCurrentStep("confirming_transfer");
            // Record transfer transaction audit
            transactionAuditService.recordContractCall({
              txHash: hash,
              chainId,
              network: "hardhat",
              fromAddress: address!,
              contractAddress: tokenAddress,
              contractName: selectedToken,
              functionName: "transfer",
              functionArgs: { to: selectedRecipient, amount: amount.toString() },
              description: `[Dev] Transfer ${parsedMintAmount} ${tokenInfo.symbol} to ${selectedRecipient?.slice(0, 6)}...${selectedRecipient?.slice(-4)}`,
            });
          },
          onError: (error) => {
            console.error("Transfer error:", error);
            notification.error(error.message || t("common.error"));
            setCurrentStep("idle");
          },
        }
      );
    } catch (err) {
      console.error("Transfer exception:", err);
      setCurrentStep("idle");
    }
  };

  // Handle transaction confirmations
  useEffect(() => {
    if (isConfirmed && txHash && lastProcessedTxRef.current !== txHash) {
      lastProcessedTxRef.current = txHash;

      if (currentStep === "confirming_mint") {
        // Mint confirmed, now transfer
        notification.success(
          t("dev.mockToken.mintSuccess", {
            amount: parsedMintAmount,
            symbol: tokenInfo.symbol,
          })
        );
        refetchBalance();
        // Auto-trigger transfer
        setTimeout(() => handleTransfer(), 500);
      } else if (currentStep === "confirming_transfer") {
        // Transfer confirmed, done!
        notification.success(
          t("dev.mockToken.transferSuccess", {
            amount: parsedMintAmount,
            symbol: tokenInfo.symbol,
            recipient:
              selectedRecipient?.slice(0, 6) +
              "..." +
              selectedRecipient?.slice(-4),
          })
        );
        refetchBalance();
        refetchRecipientBalance();
        setCurrentStep("done");

        // Reset after 2 seconds
        setTimeout(() => {
          setCurrentStep("idle");
          resetWrite();
          lastProcessedTxRef.current = null;
        }, 2000);
      }
    }
  }, [isConfirmed, txHash, currentStep]);

  // Get step status for custom Steps component
  const getStepStatus = (stepKey: "mint" | "transfer" | "done") => {
    if (currentStep === "idle") return "wait";

    const stepOrder = { mint: 0, transfer: 1, done: 2 };
    const currentOrder = {
      idle: -1,
      minting: 0,
      confirming_mint: 0,
      transferring: 1,
      confirming_transfer: 1,
      done: 2,
    };

    const stepIndex = stepOrder[stepKey];
    const currentIndex = currentOrder[currentStep];

    if (stepIndex < currentIndex) return "finish";
    if (stepIndex === currentIndex) return "process";
    return "wait";
  };

  // Step indicator component
  const StepIndicator = ({
    status,
    title,
  }: {
    status: "wait" | "process" | "finish";
    title: string;
  }) => {
    return (
      <div className="flex flex-col items-center gap-1">
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
            status === "finish"
              ? "bg-primary text-primary-foreground"
              : status === "process"
              ? "bg-primary/20 border-2 border-primary text-primary"
              : "bg-white/10 text-muted-foreground"
          }`}
        >
          {status === "finish" ? (
            <Check className="h-3 w-3" />
          ) : status === "process" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Circle className="h-3 w-3" />
          )}
        </div>
        <span
          className={`text-xs ${
            status === "process" ? "text-primary" : "text-muted-foreground"
          }`}
        >
          {title}
        </span>
      </div>
    );
  };

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <DollarSign className="h-4 w-4 text-primary" />
            {t("dev.mockToken.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t("kyc.connectWalletFirst")}</p>
        </CardContent>
      </Card>
    );
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <DollarSign className="h-4 w-4 text-primary" />
            {t("dev.mockToken.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Warning Alert */}
          <div className="flex items-start gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
            <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="font-medium text-yellow-500">
                {t("dev.mockToken.adminOnly")}
              </span>
              <span className="text-sm text-muted-foreground">
                {t("dev.mockToken.adminOnlyDesc")}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isProcessing = currentStep !== "idle" && currentStep !== "done";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <DollarSign className="h-4 w-4 text-primary" />
          {t("dev.mockToken.title")}
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            refetchBalance();
            refetchRecipients();
          }}
          disabled={isBalanceLoading || isLoadingRecipients}
        >
          {isBalanceLoading || isLoadingRecipients ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <p className="text-muted-foreground text-sm">
          {t("dev.mockToken.description")}
        </p>

        {/* Token Selection */}
        <div className="flex flex-col gap-2">
          <label className="font-medium text-foreground text-sm">
            {t("dev.mockToken.selectToken")}:
          </label>
          <Select
            value={selectedToken}
            onValueChange={(value) => setSelectedToken(value as MockTokenType)}
            disabled={isProcessing}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MockUSDT">
                {MOCK_TOKEN_INFO.MockUSDT.symbol} -{" "}
                {MOCK_TOKEN_INFO.MockUSDT.name}
              </SelectItem>
              <SelectItem value="MockUSDC">
                {MOCK_TOKEN_INFO.MockUSDC.symbol} -{" "}
                {MOCK_TOKEN_INFO.MockUSDC.name}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Address Warning */}
        {!isAddressesLoading && !tokenAddress && (
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                <span className="font-medium text-yellow-500">
                  合约地址未配置
                </span>
                <span className="text-sm text-muted-foreground">
                  请检查后端服务是否正常运行，并确认 contract_deployment 表中已部署 {tokenInfo.symbol} 合约
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Admin Balance */}
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">
                {t("dev.mockToken.adminBalance")}
              </span>
              <span className="text-xl font-semibold text-primary">
                {isBalanceLoading
                  ? "-"
                  : formatBalance(adminBalance as bigint)}{" "}
                <span className="text-sm font-normal">{tokenInfo.symbol}</span>
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">
                {t("dev.mockToken.decimals")}
              </span>
              <span className="text-xl font-semibold text-foreground">
                {tokenInfo.decimals}
              </span>
            </div>
          </div>
          {/* Contract Address */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-primary/10">
            <span className="text-xs text-muted-foreground">
              {t("dev.mockToken.contractAddress")}:
            </span>
            {isAddressesLoading ? (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                {t("dev.mockToken.loadingAddresses")}
              </span>
            ) : (
              <span
                className="text-xs font-mono text-primary/80 cursor-pointer hover:text-primary transition-colors"
                title={tokenAddress}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(tokenAddress);
                    toast.success(t("dev.mockToken.addressCopied"));
                  } catch {
                    toast.error(t("common.error"));
                  }
                }}
              >
                {truncateAddress(tokenAddress)}
              </span>
            )}
          </div>
        </div>

        {/* Add to Wallet Button */}
        <Button variant="outline" onClick={addTokenToWallet} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          {t("dev.mockToken.addToWallet", { symbol: tokenInfo.symbol })}
        </Button>

        {/* Divider */}
        <div className="border-t border-white/10 my-2" />

        {/* Recipient Selection */}
        <div className="flex flex-col gap-2">
          <label className="font-medium text-foreground text-sm flex items-center gap-2">
            <User className="h-4 w-4" />
            {t("dev.mockToken.selectRecipient")}:
          </label>
          <Select
            value={selectedRecipient || ""}
            onValueChange={setSelectedRecipient}
            disabled={isProcessing || isLoadingRecipients}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={t("dev.mockToken.selectRecipientPlaceholder")}
              />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {isLoadingRecipients ? (
                <SelectItem value="_loading" disabled>
                  {t("common.loading")}...
                </SelectItem>
              ) : recipients?.length === 0 ? (
                <SelectItem value="_empty" disabled>
                  {t("dev.mockToken.noRecipients")}
                </SelectItem>
              ) : (
                recipients?.map((r) => (
                  <SelectItem key={r.address} value={r.address}>
                    {r.label}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Recipient Balance */}
        {selectedRecipient && (
          <div className="rounded-lg bg-yellow-500/5 border border-yellow-500/20 p-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">
                {t("dev.mockToken.recipientBalance")}
              </span>
              <span className="text-xl font-semibold text-yellow-500">
                {formatBalance(recipientBalance as bigint)}{" "}
                <span className="text-sm font-normal">{tokenInfo.symbol}</span>
              </span>
            </div>
          </div>
        )}

        {/* Mint Amount */}
        <div className="flex flex-col gap-2">
          <label className="font-medium text-foreground text-sm">
            {t("dev.mockToken.mintAmount")}:
          </label>
          <div className="flex gap-2">
            <Input
              type="number"
              value={mintAmount}
              onChange={(e) => setMintAmount(e.target.value)}
              min={1}
              max={1000000}
              disabled={isProcessing}
              className="flex-1"
            />
            <Button variant="outline" disabled className="pointer-events-none">
              {tokenInfo.symbol}
            </Button>
          </div>
        </div>

        {/* Process Steps */}
        {currentStep !== "idle" && (
          <div className="flex items-center justify-between px-4 py-3 bg-white/5 rounded-lg">
            <StepIndicator
              status={getStepStatus("mint")}
              title={t("dev.mockToken.step.mint")}
            />
            <div className="flex-1 h-px bg-white/10 mx-2" />
            <StepIndicator
              status={getStepStatus("transfer")}
              title={t("dev.mockToken.step.transfer")}
            />
            <div className="flex-1 h-px bg-white/10 mx-2" />
            <StepIndicator
              status={getStepStatus("done")}
              title={t("dev.mockToken.step.done")}
            />
          </div>
        )}

        {/* Mint & Transfer Button */}
        <Button
          onClick={handleMintAndTransfer}
          disabled={!parsedMintAmount || parsedMintAmount <= 0 || !selectedRecipient || isProcessing || isAddressesLoading}
          className="w-full h-11"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {currentStep === "minting" || currentStep === "confirming_mint"
                ? t("dev.mockToken.minting")
                : t("dev.mockToken.transferring")}
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              {t("dev.mockToken.mintAndTransfer")}
            </>
          )}
        </Button>

        {/* Transaction Status */}
        {txHash && (
          <p className="text-muted-foreground text-xs break-all">Tx: {txHash}</p>
        )}

        <p className="text-muted-foreground/60 text-xs">
          {t("dev.mockToken.note")}
        </p>
      </CardContent>
    </Card>
  );
}
