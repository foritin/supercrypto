"use client";
/**
 * Mock Token Mint Component - Web3 Dark Theme
 * Developer tool for minting and transferring test tokens
 * Only available to admin users
 */
import { useState, useEffect, useRef } from "react";
import {
  Card,
  Button,
  Space,
  Flex,
  Typography,
  InputNumber,
  Select,
  Statistic,
  Row,
  Col,
  App,
  Divider,
  Alert,
  Steps,
} from "antd";
import {
  DollarOutlined,
  SendOutlined,
  ReloadOutlined,
  PlusOutlined,
  UserOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits, formatUnits } from "viem";
import {
  MOCK_TOKEN_ADDRESSES,
  MOCK_TOKEN_INFO,
  MOCK_TOKEN_ABI,
  type MockTokenType,
} from "@/contracts/mock-token";
import { devToolsService, type TokenRecipient } from "@/services/dev-tools";
import { useCurrentUser } from "@/hooks";

const { Text } = Typography;

type MintStep =
  | "idle"
  | "minting"
  | "confirming_mint"
  | "transferring"
  | "confirming_transfer"
  | "done";

export function MockTokenMint() {
  const { t } = useTranslation();
  const { message: messageApi } = App.useApp();
  const { isConnected, address } = useAccount();
  const { isAdmin } = useCurrentUser();
  const [selectedToken, setSelectedToken] = useState<MockTokenType>("MockUSDT");
  const [mintAmount, setMintAmount] = useState<number>(1000);
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(
    null
  );
  const [currentStep, setCurrentStep] = useState<MintStep>("idle");
  const lastProcessedTxRef = useRef<string | null>(null);

  const tokenInfo = MOCK_TOKEN_INFO[selectedToken];
  const tokenAddress = MOCK_TOKEN_ADDRESSES[selectedToken];

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

  // Read admin balance with auto-refresh
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
      refetchInterval: 5000,
    },
  });

  // Read recipient balance
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
        refetchInterval: 5000,
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
        messageApi.error("MetaMask not installed");
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
        messageApi.success(`${tokenInfo.symbol} added to wallet!`);
      }
    } catch (error) {
      console.error("Failed to add token:", error);
      messageApi.error("Failed to add token to wallet");
    }
  };

  // Format balance for display
  const formatBalance = (balance: bigint | undefined) => {
    if (!balance) return "0";
    return formatUnits(balance as bigint, tokenInfo.decimals);
  };

  // Handle mint to admin first, then transfer to recipient
  const handleMintAndTransfer = async () => {
    if (!address || !mintAmount || !selectedRecipient) return;

    const amount = parseUnits(mintAmount.toString(), tokenInfo.decimals);

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
          },
          onError: (error) => {
            console.error("Mint error:", error);
            messageApi.error(error.message || t("common.error"));
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
    if (!address || !mintAmount || !selectedRecipient) return;

    const amount = parseUnits(mintAmount.toString(), tokenInfo.decimals);

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
          },
          onError: (error) => {
            console.error("Transfer error:", error);
            messageApi.error(error.message || t("common.error"));
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
        messageApi.success(
          t("dev.mockToken.mintSuccess", {
            amount: mintAmount,
            symbol: tokenInfo.symbol,
          })
        );
        refetchBalance();
        // Auto-trigger transfer
        setTimeout(() => handleTransfer(), 500);
      } else if (currentStep === "confirming_transfer") {
        // Transfer confirmed, done!
        messageApi.success(
          t("dev.mockToken.transferSuccess", {
            amount: mintAmount,
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

  // Get current step index for Steps component
  const getStepIndex = () => {
    switch (currentStep) {
      case "idle":
        return 0;
      case "minting":
      case "confirming_mint":
        return 0;
      case "transferring":
      case "confirming_transfer":
        return 1;
      case "done":
        return 2;
      default:
        return 0;
    }
  };

  const getStepStatus = (
    stepKey: string
  ): "wait" | "process" | "finish" | "error" => {
    if (currentStep === "idle") return "wait";

    const stepIndex = getStepIndex();
    const keyIndex = stepKey === "mint" ? 0 : stepKey === "transfer" ? 1 : 2;

    if (keyIndex < stepIndex) return "finish";
    if (keyIndex === stepIndex) return "process";
    return "wait";
  };

  if (!isConnected) {
    return (
      <Card
        title={
          <Space>
            <DollarOutlined style={{ color: "#00D4AA" }} />
            {t("dev.mockToken.title")}
          </Space>
        }
      >
        <Text style={{ color: "rgba(255,255,255,0.45)" }}>
          {t("kyc.connectWalletFirst")}
        </Text>
      </Card>
    );
  }

  if (!isAdmin) {
    return (
      <Card
        title={
          <Space>
            <DollarOutlined style={{ color: "#00D4AA" }} />
            {t("dev.mockToken.title")}
          </Space>
        }
      >
        <Alert
          type="warning"
          message={t("dev.mockToken.adminOnly")}
          description={t("dev.mockToken.adminOnlyDesc")}
          showIcon
        />
      </Card>
    );
  }

  const isProcessing = currentStep !== "idle" && currentStep !== "done";

  return (
    <Card
      title={
        <Space>
          <DollarOutlined style={{ color: "#00D4AA" }} />
          {t("dev.mockToken.title")}
        </Space>
      }
      extra={
        <Button
          icon={<ReloadOutlined />}
          size="small"
          onClick={() => {
            refetchBalance();
            refetchRecipients();
          }}
          loading={isBalanceLoading || isLoadingRecipients}
        />
      }
    >
      <Flex vertical gap={16} style={{ width: "100%" }}>
        <Text style={{ color: "rgba(255,255,255,0.65)" }}>
          {t("dev.mockToken.description")}
        </Text>

        {/* Token Selection */}
        <div>
          <Text strong style={{ color: "#fff" }}>
            {t("dev.mockToken.selectToken")}:
          </Text>
          <Select
            value={selectedToken}
            onChange={setSelectedToken}
            style={{ width: "100%", marginTop: 8 }}
            disabled={isProcessing}
            options={[
              {
                value: "MockUSDT",
                label: `${MOCK_TOKEN_INFO.MockUSDT.symbol} - ${MOCK_TOKEN_INFO.MockUSDT.name}`,
              },
              {
                value: "MockUSDC",
                label: `${MOCK_TOKEN_INFO.MockUSDC.symbol} - ${MOCK_TOKEN_INFO.MockUSDC.name}`,
              },
            ]}
          />
        </div>

        {/* Admin Balance */}
        <Card size="small" style={{ background: "rgba(0, 212, 170, 0.05)" }}>
          <Row gutter={16}>
            <Col span={12}>
              <Statistic
                title={
                  <Text style={{ color: "rgba(255,255,255,0.45)" }}>
                    {t("dev.mockToken.adminBalance")}
                  </Text>
                }
                value={
                  isBalanceLoading ? "-" : formatBalance(adminBalance as bigint)
                }
                suffix={tokenInfo.symbol}
                precision={2}
                styles={{ content: { color: "#00D4AA" } }}
              />
            </Col>
            <Col span={12}>
              <Statistic
                title={
                  <Text style={{ color: "rgba(255,255,255,0.45)" }}>
                    {t("dev.mockToken.decimals")}
                  </Text>
                }
                value={tokenInfo.decimals}
                styles={{ content: { color: "#fff" } }}
              />
            </Col>
          </Row>
        </Card>

        {/* Add to Wallet Button */}
        <Button icon={<PlusOutlined />} onClick={addTokenToWallet} block>
          {t("dev.mockToken.addToWallet", { symbol: tokenInfo.symbol })}
        </Button>

        <Divider
          style={{ borderColor: "rgba(255,255,255,0.08)", margin: "12px 0" }}
        />

        {/* Recipient Selection */}
        <div>
          <Text strong style={{ color: "#fff" }}>
            <UserOutlined style={{ marginRight: 8 }} />
            {t("dev.mockToken.selectRecipient")}:
          </Text>
          <Select
            value={selectedRecipient}
            onChange={setSelectedRecipient}
            style={{ width: "100%", marginTop: 8 }}
            placeholder={t("dev.mockToken.selectRecipientPlaceholder")}
            disabled={isProcessing}
            loading={isLoadingRecipients}
            options={
              recipients?.map((r) => ({
                value: r.address,
                label: r.label,
              })) || []
            }
            showSearch
            filterOption={(input, option) =>
              (option?.label as string)
                ?.toLowerCase()
                .includes(input.toLowerCase()) ||
              (option?.value as string)
                ?.toLowerCase()
                .includes(input.toLowerCase())
            }
          />
        </div>

        {/* Recipient Balance */}
        {selectedRecipient && (
          <Card size="small" style={{ background: "rgba(255, 215, 0, 0.05)" }}>
            <Statistic
              title={
                <Text style={{ color: "rgba(255,255,255,0.45)" }}>
                  {t("dev.mockToken.recipientBalance")}
                </Text>
              }
              value={formatBalance(recipientBalance as bigint)}
              suffix={tokenInfo.symbol}
              precision={2}
              styles={{ content: { color: "#FFD700" } }}
            />
          </Card>
        )}

        {/* Mint Amount */}
        <div>
          <Text strong style={{ color: "#fff" }}>
            {t("dev.mockToken.mintAmount")}:
          </Text>
          <Space.Compact style={{ width: "100%", marginTop: 8 }}>
            <InputNumber
              value={mintAmount}
              onChange={(v) => setMintAmount(v || 0)}
              min={1}
              max={1000000}
              style={{ width: "100%" }}
              disabled={isProcessing}
            />
            <Button disabled style={{ pointerEvents: "none" }}>
              {tokenInfo.symbol}
            </Button>
          </Space.Compact>
        </div>

        {/* Process Steps */}
        {currentStep !== "idle" && (
          <Steps
            size="small"
            current={getStepIndex()}
            items={[
              {
                title: t("dev.mockToken.step.mint"),
                status: getStepStatus("mint"),
              },
              {
                title: t("dev.mockToken.step.transfer"),
                status: getStepStatus("transfer"),
              },
              {
                title: t("dev.mockToken.step.done"),
                status: getStepStatus("done"),
              },
            ]}
          />
        )}

        {/* Mint & Transfer Button */}
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleMintAndTransfer}
          loading={isProcessing}
          disabled={!mintAmount || mintAmount <= 0 || !selectedRecipient}
          block
          style={{ height: 44 }}
        >
          {isProcessing
            ? currentStep === "minting" || currentStep === "confirming_mint"
              ? t("dev.mockToken.minting")
              : t("dev.mockToken.transferring")
            : t("dev.mockToken.mintAndTransfer")}
        </Button>

        {/* Transaction Status */}
        {txHash && (
          <Text
            style={{
              color: "rgba(255,255,255,0.45)",
              fontSize: 12,
              wordBreak: "break-all",
            }}
          >
            Tx: {txHash}
          </Text>
        )}

        <Text style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>
          {t("dev.mockToken.note")}
        </Text>
      </Flex>
    </Card>
  );
}
