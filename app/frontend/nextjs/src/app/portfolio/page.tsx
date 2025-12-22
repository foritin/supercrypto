"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Typography,
  Row,
  Col,
  Card,
  Tag,
  Table,
  Tabs,
  Flex,
  Statistic,
  Empty,
  Spin,
  Button,
  Modal,
  Progress,
  Tooltip,
  Select,
  message,
} from "antd";
import {
  DollarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ArrowUpOutlined,
  HistoryOutlined,
  ExportOutlined,
  LinkOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useAccount } from "wagmi";
import {
  subscriptionService,
  type SubscriptionItem,
  type UserStats,
} from "@/services/subscription";
import {
  transactionService,
  type TransactionRecord,
  TRANSACTION_TYPE_NAMES,
  TRANSACTION_TYPE_COLORS,
  TRANSACTION_STATUS_COLORS,
  getExplorerUrl,
} from "@/services/transaction";
import { RequireWallet } from "@/components/auth";

const { Title, Text } = Typography;

export default function PortfolioPage() {
  const { t } = useTranslation();
  const { address, isConnected } = useAccount();

  // 客户端挂载状态 - 用于避免 hydration 不匹配
  const [mounted, setMounted] = useState(false);

  // 认购数据
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoadingSubscriptions, setIsLoadingSubscriptions] = useState(false);

  // 交易历史数据
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [txPagination, setTxPagination] = useState({
    total: 0,
    page: 1,
    pageSize: 10,
  });
  const [isLoadingTx, setIsLoadingTx] = useState(false);
  const [txTypeFilter, setTxTypeFilter] = useState<string | undefined>();

  // 详情弹窗
  const [selectedSubscription, setSelectedSubscription] =
    useState<SubscriptionItem | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // 赎回状态
  const [isRedeeming, setIsRedeeming] = useState(false);

  // 确保客户端挂载后再渲染依赖浏览器状态的内容
  useEffect(() => {
    setMounted(true);
  }, []);

  // 获取用户订阅记录
  const fetchSubscriptions = useCallback(async () => {
    if (!isConnected || !address) return;

    setIsLoadingSubscriptions(true);
    try {
      const [result, stats] = await Promise.all([
        subscriptionService.getSubscriptions({ page: 1, page_size: 50 }),
        subscriptionService.getUserStats(),
      ]);
      // 添加空值检查
      if (result && result.items) {
        setSubscriptions(result.items);
      } else {
        setSubscriptions([]);
      }
      setUserStats(stats || null);
    } catch (err) {
      console.error("Failed to fetch subscriptions:", err);
      setSubscriptions([]);
      setUserStats(null);
    } finally {
      setIsLoadingSubscriptions(false);
    }
  }, [isConnected, address]);

  // 获取交易历史
  const fetchTransactions = useCallback(
    async (page: number = 1) => {
      if (!isConnected || !address) return;

      setIsLoadingTx(true);
      try {
        const result = await transactionService.getUserTransactions(
          page,
          txPagination.pageSize
        );
        // 添加空值检查，防止 API 返回 undefined 或结构不符
        if (result && result.items) {
          setTransactions(result.items);
          setTxPagination((prev) => ({
            ...prev,
            total: result.total || 0,
            page: result.page || 1,
          }));
        } else {
          // API 未返回预期数据，设置空数组
          setTransactions([]);
        }
      } catch (err) {
        console.error("Failed to fetch transactions:", err);
        // 发生错误时设置空数组，避免 UI 崩溃
        setTransactions([]);
      } finally {
        setIsLoadingTx(false);
      }
    },
    [isConnected, address, txPagination.pageSize]
  );

  useEffect(() => {
    fetchSubscriptions();
    fetchTransactions();
  }, [fetchSubscriptions, fetchTransactions]);

  // 查看认购详情
  const handleViewDetail = useCallback((subscription: SubscriptionItem) => {
    setSelectedSubscription(subscription);
    setDetailModalOpen(true);
  }, []);

  // 赎回认购
  const handleRedeem = useCallback(async () => {
    if (!selectedSubscription) return;

    setIsRedeeming(true);
    try {
      // TODO: 实际的链上赎回交易
      const mockTxHash = `0x${Date.now().toString(16)}...`;
      await subscriptionService.redeemSubscription(
        selectedSubscription.id,
        mockTxHash
      );
      message.success(t("portfolio.redeemSuccess"));
      setDetailModalOpen(false);
      fetchSubscriptions();
    } catch (err) {
      message.error((err as Error).message || t("portfolio.redeemFailed"));
    } finally {
      setIsRedeeming(false);
    }
  }, [selectedSubscription, t, fetchSubscriptions]);

  // 导出交易记录
  const handleExport = useCallback(async () => {
    try {
      message.loading(t("portfolio.exporting"));
      // TODO: 实现导出功能
      message.success(t("portfolio.exportSuccess"));
    } catch {
      message.error(t("portfolio.exportFailed"));
    }
  }, [t]);

  // 认购表格列
  const subscriptionColumns = useMemo(
    () => [
      {
        title: t("portfolio.table.asset"),
        dataIndex: "asset_name",
        key: "asset_name",
        render: (name: string, record: SubscriptionItem) => (
          <Flex vertical gap={2}>
            <Text strong>{name}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.asset_symbol}
            </Text>
          </Flex>
        ),
      },
      {
        title: t("portfolio.table.amount"),
        dataIndex: "amount",
        key: "amount",
        render: (amount: number) => (
          <Text strong style={{ color: "#00D4AA" }}>
            ${amount.toLocaleString()}
          </Text>
        ),
      },
      {
        title: t("portfolio.table.apy"),
        dataIndex: "apy",
        key: "apy",
        render: (apy: number) => <Tag color="green">{apy}% APY</Tag>,
      },
      {
        title: t("portfolio.table.period"),
        dataIndex: "lock_period",
        key: "lock_period",
        render: (period: number, record: SubscriptionItem) => (
          <Flex vertical gap={4}>
            <Text>
              {period} {t("common.months")}
            </Text>
            <Progress
              percent={Math.max(
                0,
                100 - (record.days_remaining / (period * 30)) * 100
              )}
              size="small"
              showInfo={false}
              strokeColor="#00D4AA"
            />
            <Text type="secondary" style={{ fontSize: 11 }}>
              {record.days_remaining > 0
                ? `${record.days_remaining} ${t("common.daysLeft")}`
                : t("portfolio.matured")}
            </Text>
          </Flex>
        ),
      },
      {
        title: t("portfolio.table.status"),
        dataIndex: "status",
        key: "status",
        render: (status: string) => {
          const colors: Record<string, string> = {
            active: "processing",
            matured: "success",
            redeemed: "default",
          };
          return (
            <Tag color={colors[status] || "default"}>
              {t(`portfolio.status.${status}`)}
            </Tag>
          );
        },
      },
      {
        title: t("portfolio.table.actions"),
        key: "actions",
        render: (_: unknown, record: SubscriptionItem) => (
          <Flex gap={8}>
            <Button
              type="link"
              size="small"
              onClick={() => handleViewDetail(record)}
            >
              {t("common.details")}
            </Button>
            {record.is_matured && record.status !== "redeemed" && (
              <Button
                type="primary"
                size="small"
                onClick={() => handleViewDetail(record)}
              >
                {t("portfolio.redeem")}
              </Button>
            )}
          </Flex>
        ),
      },
    ],
    [t, handleViewDetail]
  );

  // 交易历史表格列
  const transactionColumns = useMemo(
    () => [
      {
        title: t("portfolio.txTable.time"),
        dataIndex: "created_at",
        key: "created_at",
        render: (time: string) => new Date(time).toLocaleString(),
      },
      {
        title: t("portfolio.txTable.type"),
        dataIndex: "tx_type",
        key: "tx_type",
        render: (type: string) => (
          <Tag
            color={
              TRANSACTION_TYPE_COLORS[
                type as keyof typeof TRANSACTION_TYPE_COLORS
              ] || "default"
            }
          >
            {TRANSACTION_TYPE_NAMES[
              type as keyof typeof TRANSACTION_TYPE_NAMES
            ] || type}
          </Tag>
        ),
      },
      {
        title: t("portfolio.txTable.amount"),
        dataIndex: "amount",
        key: "amount",
        render: (amount: string) => `$${parseFloat(amount).toLocaleString()}`,
      },
      {
        title: t("portfolio.txTable.status"),
        dataIndex: "status",
        key: "status",
        render: (status: string) => (
          <Tag
            color={
              TRANSACTION_STATUS_COLORS[
                status as keyof typeof TRANSACTION_STATUS_COLORS
              ] || "default"
            }
          >
            {status}
          </Tag>
        ),
      },
      {
        title: t("portfolio.txTable.txHash"),
        dataIndex: "tx_hash",
        key: "tx_hash",
        render: (hash: string, record: TransactionRecord) => {
          const explorerUrl = getExplorerUrl(hash, record.network);
          return (
            <Tooltip title={hash}>
              <Text
                copyable={{ text: hash }}
                style={{ fontFamily: "monospace", fontSize: 12 }}
              >
                {hash.slice(0, 10)}...{hash.slice(-6)}
              </Text>
              {explorerUrl && (
                <Button
                  type="link"
                  size="small"
                  icon={<LinkOutlined />}
                  href={explorerUrl}
                  target="_blank"
                />
              )}
            </Tooltip>
          );
        },
      },
    ],
    [t]
  );

  // Tab 项
  const tabItems = useMemo(
    () => [
      {
        key: "investments",
        label: (
          <span>
            <DollarOutlined /> {t("portfolio.tabs.investments")}
          </span>
        ),
        children: (
          <Table
            columns={subscriptionColumns}
            dataSource={subscriptions}
            rowKey="id"
            loading={isLoadingSubscriptions}
            pagination={false}
            locale={{
              emptyText: <Empty description={t("portfolio.noInvestments")} />,
            }}
          />
        ),
      },
      {
        key: "history",
        label: (
          <span>
            <HistoryOutlined /> {t("portfolio.tabs.history")}
          </span>
        ),
        children: (
          <Flex vertical gap={16}>
            <Flex justify="space-between" align="center">
              <Select
                placeholder={t("portfolio.filterByType")}
                allowClear
                style={{ width: 200 }}
                value={txTypeFilter}
                onChange={setTxTypeFilter}
                options={Object.entries(TRANSACTION_TYPE_NAMES).map(
                  ([value, label]) => ({
                    value,
                    label,
                  })
                )}
              />
              <Button icon={<ExportOutlined />} onClick={handleExport}>
                {t("portfolio.export")}
              </Button>
            </Flex>
            <Table
              columns={transactionColumns}
              dataSource={transactions}
              rowKey="id"
              loading={isLoadingTx}
              pagination={{
                current: txPagination.page,
                total: txPagination.total,
                pageSize: txPagination.pageSize,
                onChange: (page) => fetchTransactions(page),
              }}
              locale={{
                emptyText: (
                  <Empty description={t("portfolio.noTransactions")} />
                ),
              }}
            />
          </Flex>
        ),
      },
    ],
    [
      t,
      subscriptionColumns,
      subscriptions,
      isLoadingSubscriptions,
      transactionColumns,
      transactions,
      isLoadingTx,
      txPagination,
      txTypeFilter,
      handleExport,
      fetchTransactions,
    ]
  );

  // 服务端渲染或客户端未挂载时显示加载状态，避免 hydration 不匹配
  if (!mounted) {
    return (
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "60px 24px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "calc(100vh - 200px)",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <RequireWallet>
      <div
        className="portfolio-page"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "24px",
          position: "relative",
          minHeight: "calc(100vh - 200px)",
        }}
      >
      {/* Page Header */}
      <Flex
        vertical
        gap={8}
        style={{ marginBottom: 32 }}
        className="fade-in-stagger"
      >
        <Text
          style={{
            color: "#00D4AA",
            fontSize: 14,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "2px",
          }}
        >
          My Investments
        </Text>
        <Title level={2} style={{ margin: 0 }}>
          {t("portfolio.title")}
        </Title>
        <Text style={{ color: "rgba(255, 255, 255, 0.65)" }}>
          {t("portfolio.subtitle")}
        </Text>
      </Flex>

      {/* Stats Cards */}
      <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t("portfolio.stats.totalInvested")}
              value={userStats?.total_invested || 0}
              precision={2}
              prefix={<DollarOutlined />}
              styles={{ content: { color: "#00D4AA" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t("portfolio.stats.totalValue")}
              value={userStats?.total_value || 0}
              precision={2}
              prefix={<DollarOutlined />}
              styles={{ content: { color: "#FFD700" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t("portfolio.stats.totalEarnings")}
              value={userStats?.total_earnings || 0}
              precision={2}
              prefix={<ArrowUpOutlined />}
              styles={{ content: { color: "#52C41A" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t("portfolio.stats.activeInvestments")}
              value={userStats?.active_subscriptions || 0}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Content Tabs */}
      <Card>
        <Tabs items={tabItems} />
      </Card>

      {/* Subscription Detail Modal */}
      <Modal
        title={
          <Flex align="center" gap={8}>
            <InfoCircleOutlined />
            {t("portfolio.subscriptionDetail")}
          </Flex>
        }
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={
          selectedSubscription?.is_matured &&
          selectedSubscription?.status !== "redeemed" ? (
            <Flex justify="end" gap={8}>
              <Button onClick={() => setDetailModalOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                type="primary"
                loading={isRedeeming}
                onClick={handleRedeem}
              >
                {t("portfolio.redeem")}
              </Button>
            </Flex>
          ) : null
        }
        width={600}
      >
        {selectedSubscription && (
          <Flex vertical gap={24}>
            {/* 资产信息 */}
            <Card size="small" title={t("portfolio.detail.assetInfo")}>
              <Flex vertical gap={12}>
                <Flex justify="space-between">
                  <Text type="secondary">
                    {t("portfolio.detail.assetName")}
                  </Text>
                  <Text strong>{selectedSubscription.asset_name}</Text>
                </Flex>
                <Flex justify="space-between">
                  <Text type="secondary">{t("portfolio.detail.symbol")}</Text>
                  <Text>{selectedSubscription.asset_symbol}</Text>
                </Flex>
              </Flex>
            </Card>

            {/* 投资信息 */}
            <Card size="small" title={t("portfolio.detail.investmentInfo")}>
              <Flex vertical gap={12}>
                <Flex justify="space-between">
                  <Text type="secondary">{t("portfolio.detail.amount")}</Text>
                  <Text strong style={{ color: "#00D4AA" }}>
                    ${selectedSubscription.amount.toLocaleString()}
                  </Text>
                </Flex>
                <Flex justify="space-between">
                  <Text type="secondary">
                    {t("portfolio.detail.tokenType")}
                  </Text>
                  <Tag>{selectedSubscription.token_type}</Tag>
                </Flex>
                <Flex justify="space-between">
                  <Text type="secondary">
                    {t("portfolio.detail.lockPeriod")}
                  </Text>
                  <Text>
                    {selectedSubscription.lock_period} {t("common.months")}
                  </Text>
                </Flex>
                <Flex justify="space-between">
                  <Text type="secondary">{t("portfolio.detail.apy")}</Text>
                  <Tag color="green">{selectedSubscription.apy}%</Tag>
                </Flex>
              </Flex>
            </Card>

            {/* 收益信息 */}
            <Card size="small" title={t("portfolio.detail.earningsInfo")}>
              <Flex vertical gap={12}>
                <Flex justify="space-between">
                  <Text type="secondary">
                    {t("portfolio.detail.expectedInterest")}
                  </Text>
                  <Text style={{ color: "#52C41A" }}>
                    +${selectedSubscription.expected_interest.toLocaleString()}
                  </Text>
                </Flex>
                <Flex justify="space-between">
                  <Text type="secondary">
                    {t("portfolio.detail.totalReturn")}
                  </Text>
                  <Text strong style={{ color: "#FFD700" }}>
                    ${selectedSubscription.total_return.toLocaleString()}
                  </Text>
                </Flex>
              </Flex>
            </Card>

            {/* 时间信息 */}
            <Card size="small" title={t("portfolio.detail.timeInfo")}>
              <Flex vertical gap={12}>
                <Flex justify="space-between">
                  <Text type="secondary">
                    {t("portfolio.detail.startDate")}
                  </Text>
                  <Text>
                    {selectedSubscription.start_date
                      ? new Date(
                          selectedSubscription.start_date
                        ).toLocaleDateString()
                      : "-"}
                  </Text>
                </Flex>
                <Flex justify="space-between">
                  <Text type="secondary">{t("portfolio.detail.endDate")}</Text>
                  <Text>
                    {selectedSubscription.end_date
                      ? new Date(
                          selectedSubscription.end_date
                        ).toLocaleDateString()
                      : "-"}
                  </Text>
                </Flex>
                <Flex justify="space-between">
                  <Text type="secondary">
                    {t("portfolio.detail.daysRemaining")}
                  </Text>
                  <Text>
                    {selectedSubscription.days_remaining > 0
                      ? selectedSubscription.days_remaining
                      : t("portfolio.matured")}
                  </Text>
                </Flex>
                <Progress
                  percent={Math.max(
                    0,
                    100 -
                      (selectedSubscription.days_remaining /
                        (selectedSubscription.lock_period * 30)) *
                        100
                  )}
                  strokeColor="#00D4AA"
                  format={() =>
                    selectedSubscription.is_matured ? (
                      <CheckCircleOutlined style={{ color: "#52C41A" }} />
                    ) : null
                  }
                />
              </Flex>
            </Card>

            {/* 状态 */}
            <Flex justify="center">
              <Tag
                color={
                  selectedSubscription.status === "redeemed"
                    ? "default"
                    : selectedSubscription.is_matured
                    ? "success"
                    : "processing"
                }
                style={{ fontSize: 14, padding: "4px 16px" }}
              >
                {t(`portfolio.status.${selectedSubscription.status}`)}
              </Tag>
            </Flex>
          </Flex>
        )}
      </Modal>
    </div>
    </RequireWallet>
  );
}
