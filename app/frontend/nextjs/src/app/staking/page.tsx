"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  Row,
  Col,
  Typography,
  Statistic,
  Select,
  InputNumber,
  Button,
  Table,
  Tag,
  Progress,
  Modal,
  Alert,
  Empty,
  Spin,
  Space,
  Segmented,
  Tooltip,
  Divider,
  Flex,
  message,
  Steps,
  Badge,
} from "antd";
import {
  RocketOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  InfoCircleOutlined,
  LinkOutlined,
  WarningOutlined,
  GiftOutlined,
  FireOutlined,
  ThunderboltOutlined,
  DollarOutlined,
  PieChartOutlined,
} from "@ant-design/icons";
import { useAccount } from "wagmi";
import { useTranslation } from "react-i18next";
import type { ColumnsType } from "antd/es/table";

import { RequireKyc } from "@/components/auth";
import {
  subscriptionService,
  type SubscriptionItem,
} from "@/services/subscription";
import {
  stakingService,
  type StakingResponse,
  type StakingLimitResponse,
  type StakingStatsResponse,
  type StakingStatus,
  type PLTTokenInfoResponse,
  type TokenAllocation,
  STAKING_PERIODS,
  STAKING_STATUS_COLORS,
} from "@/services/staking";

const { Title, Text, Paragraph } = Typography;

// 周期卡片组件
function PeriodCard({
  days,
  multiplier,
  selected,
  recommended,
  onClick,
}: {
  days: number;
  multiplier: number;
  selected: boolean;
  recommended?: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Card
      hoverable
      onClick={onClick}
      style={{
        cursor: "pointer",
        borderColor: selected ? "#1890ff" : undefined,
        borderWidth: selected ? 2 : 1,
        background: selected ? "rgba(24, 144, 255, 0.05)" : undefined,
        position: "relative",
      }}
    >
      {recommended && (
        <Badge.Ribbon text={t("staking.period.recommended")} color="gold" />
      )}
      <Flex vertical align="center" gap={8}>
        <Text strong style={{ fontSize: 24 }}>
          {days}
        </Text>
        <Text type="secondary">{t("common.days")}</Text>
        <Divider style={{ margin: "8px 0" }} />
        <Text style={{ color: "#52c41a", fontSize: 18, fontWeight: 600 }}>
          {multiplier}x
        </Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {t("staking.stake.multiplier")}
        </Text>
      </Flex>
    </Card>
  );
}

export default function StakingPage() {
  const { t } = useTranslation();
  const { address, isConnected } = useAccount();

  // 状态
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StakingStatsResponse | null>(null);
  const [limit, setLimit] = useState<StakingLimitResponse | null>(null);
  const [stakings, setStakings] = useState<StakingResponse[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
  });

  // 质押表单状态
  const [selectedSubscription, setSelectedSubscription] = useState<
    number | null
  >(null);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(30);
  const [stakeAmount, setStakeAmount] = useState<number>(0);
  const [staking, setStaking] = useState(false);

  // 筛选状态
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // 详情弹窗
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedStaking, setSelectedStaking] =
    useState<StakingResponse | null>(null);
  const [unstakeModalVisible, setUnstakeModalVisible] = useState(false);

  // PLT 代币信息
  const [pltInfo, setPltInfo] = useState<PLTTokenInfoResponse | null>(null);

  // 加载数据
  const loadData = useCallback(async () => {
    if (!isConnected || !address) return;

    setLoading(true);
    try {
      // 并行加载
      const [statsRes, limitRes, stakingsRes, subscriptionsRes] =
        await Promise.all([
          stakingService.getUserStats().catch(() => null),
          stakingService.getTodayLimit().catch(() => null),
          stakingService
            .getStakings({
              status:
                statusFilter === "all"
                  ? undefined
                  : (statusFilter as StakingStatus),
              page: pagination.page,
              page_size: pagination.pageSize,
            })
            .catch(() => ({
              items: [],
              pagination: { total: 0, page: 1, page_size: 10, total_pages: 0 },
            })),
          subscriptionService
            .getSubscriptions({ status: "active" })
            .then((res) => res.items)
            .catch(() => []),
        ]);

      setStats(statsRes);
      setLimit(limitRes);
      setStakings(stakingsRes.items);
      setPagination((prev) => ({
        ...prev,
        total: stakingsRes.pagination.total,
      }));

      // 只显示 active 或 matured 状态且有可用代币的认购
      const activeSubscriptions = (subscriptionsRes || []).filter(
        (s: SubscriptionItem) =>
          (s.status === "active" || s.status === "matured") &&
          s.rwa_token_amount > 0
      );
      setSubscriptions(activeSubscriptions);
    } catch (error) {
      console.error("Failed to load staking data:", error);
      message.error(t("staking.error.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [
    isConnected,
    address,
    statusFilter,
    pagination.page,
    pagination.pageSize,
    t,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 加载 PLT 代币信息（不需要钱包连接）
  useEffect(() => {
    stakingService.getPLTTokenInfo().then(setPltInfo).catch(console.error);
  }, []);

  // 获取选中的认购
  const selectedSubData = subscriptions.find(
    (s) => s.id === selectedSubscription
  );
  const maxStakeAmount = selectedSubData?.rwa_token_amount || 0;
  const remainingLimit = limit?.remaining_limit || 0;
  const effectiveMax = Math.min(maxStakeAmount, remainingLimit);

  // 计算预期收益
  const periodConfig = STAKING_PERIODS.find((p) => p.period === selectedPeriod);
  const multiplier = periodConfig?.multiplier || 1;
  const expectedRewards =
    stakeAmount * multiplier * 0.01 * (selectedPeriod / 365); // 简化计算

  // 提交质押
  const handleStake = async () => {
    if (!selectedSubscription || stakeAmount <= 0) {
      message.warning(t("staking.error.invalidAmount"));
      return;
    }

    setStaking(true);
    try {
      // TODO: 实际应该调用合约并获取交易哈希
      const txHash = `0x${Date.now().toString(16)}${"0".repeat(48)}`; // 模拟交易哈希

      await stakingService.createStaking({
        subscription_id: selectedSubscription,
        amount: stakeAmount,
        period: selectedPeriod as 15 | 30 | 45 | 60,
        tx_hash: txHash,
      });

      message.success(t("staking.stake.success"));
      setSelectedSubscription(null);
      setStakeAmount(0);
      loadData();
    } catch (error) {
      console.error("Stake failed:", error);
      message.error(t("staking.stake.failed"));
    } finally {
      setStaking(false);
    }
  };

  // 解除质押
  const handleUnstake = async () => {
    if (!selectedStaking) return;

    try {
      // TODO: 实际应该调用合约
      const txHash = `0x${Date.now().toString(16)}${"0".repeat(48)}`;

      await stakingService.unstake(selectedStaking.id, txHash);
      message.success(t("staking.unstake.success"));
      setUnstakeModalVisible(false);
      setSelectedStaking(null);
      loadData();
    } catch (error) {
      console.error("Unstake failed:", error);
      message.error(t("staking.unstake.failed"));
    }
  };

  // 领取奖励
  const handleClaim = async (staking: StakingResponse) => {
    try {
      // TODO: 实际应该调用合约
      const txHash = `0x${Date.now().toString(16)}${"0".repeat(48)}`;

      await stakingService.claimRewards(staking.id, txHash);
      message.success(t("staking.claim.success"));
      loadData();
    } catch (error) {
      console.error("Claim failed:", error);
      message.error(t("staking.claim.failed"));
    }
  };

  // 表格列
  const columns: ColumnsType<StakingResponse> = [
    {
      title: t("staking.detail.amount"),
      dataIndex: "amount",
      key: "amount",
      render: (amount: number) => (
        <Text strong>{amount.toLocaleString()} tokens</Text>
      ),
    },
    {
      title: t("staking.detail.period"),
      dataIndex: "period",
      key: "period",
      render: (period: number) => (
        <Tag color="blue">
          {period} {t("common.days")}
        </Tag>
      ),
    },
    {
      title: t("staking.detail.multiplier"),
      dataIndex: "multiplier",
      key: "multiplier",
      render: (multiplier: number) => (
        <Text style={{ color: "#52c41a" }}>{multiplier}x</Text>
      ),
    },
    {
      title: t("staking.detail.progress"),
      key: "progress",
      render: (_, record) => {
        const totalDays = record.period;
        const passedDays = totalDays - record.days_remaining;
        const percent = Math.min(100, (passedDays / totalDays) * 100);

        return (
          <Flex vertical gap={4}>
            <Progress
              percent={Math.round(percent)}
              size="small"
              status={record.is_matured ? "success" : "active"}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.days_remaining > 0
                ? `${record.days_remaining} ${t("common.days")} ${t(
                    "staking.detail.daysRemaining"
                  )}`
                : t("staking.status.matured")}
            </Text>
          </Flex>
        );
      },
    },
    {
      title: t("staking.detail.currentRewards"),
      dataIndex: "current_rewards",
      key: "current_rewards",
      render: (rewards: number) => (
        <Text style={{ color: "#faad14" }}>
          <GiftOutlined /> {rewards.toFixed(4)} PLT
        </Text>
      ),
    },
    {
      title: t("staking.detail.status"),
      dataIndex: "status",
      key: "status",
      render: (status: StakingStatus) => (
        <Tag color={STAKING_STATUS_COLORS[status]}>
          {t(`staking.status.${status}`)}
        </Tag>
      ),
    },
    {
      title: t("common.actions"),
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setSelectedStaking(record);
              setDetailModalVisible(true);
            }}
          >
            {t("common.details")}
          </Button>
          {record.status === "active" && (
            <Button
              type="link"
              size="small"
              danger
              onClick={() => {
                setSelectedStaking(record);
                setUnstakeModalVisible(true);
              }}
            >
              {t("staking.unstake.title")}
            </Button>
          )}
          {record.status === "matured" && record.pending_rewards > 0 && (
            <Button
              type="link"
              size="small"
              onClick={() => handleClaim(record)}
            >
              {t("staking.claim.title")}
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <RequireKyc>
      <div style={{ position: "relative", minHeight: "calc(100vh - 200px)" }}>
        {/* Background Orbs */}
        <div
          className="bg-orb bg-orb-gold animate-float"
          style={{ top: "5%", right: "10%", opacity: 0.5 }}
        />
        <div
          className="bg-orb bg-orb-primary animate-float-delayed"
          style={{ bottom: "20%", left: "5%", opacity: 0.3 }}
        />

        <Flex
          vertical
          gap={24}
          style={{ padding: "24px 0", position: "relative", zIndex: 1 }}
        >
          {/* 页面标题 */}
          <Flex
            justify="space-between"
            align="center"
            className="fade-in-stagger"
          >
            <Flex vertical>
              <Title level={2} style={{ margin: 0 }}>
                <FireOutlined style={{ marginRight: 8, color: "#fa541c" }} />
                {t("staking.title")}
              </Title>
              <Text type="secondary">{t("staking.subtitle")}</Text>
            </Flex>
          </Flex>

          {/* 统计卡片 */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title={t("staking.stats.totalStaked")}
                  value={stats?.total_staked || 0}
                  suffix="tokens"
                  prefix={<RocketOutlined />}
                  styles={{ content: { color: "#1890ff" } }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title={t("staking.stats.activeStakes")}
                  value={stats?.active_stakes || 0}
                  prefix={<ClockCircleOutlined />}
                  styles={{ content: { color: "#722ed1" } }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title={t("staking.stats.totalRewards")}
                  value={stats?.total_rewards_earned || 0}
                  precision={4}
                  suffix="PLT"
                  prefix={<TrophyOutlined />}
                  styles={{ content: { color: "#52c41a" } }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title={t("staking.stats.pendingRewards")}
                  value={stats?.pending_rewards || 0}
                  precision={4}
                  suffix="PLT"
                  prefix={<GiftOutlined />}
                  styles={{ content: { color: "#faad14" } }}
                />
              </Card>
            </Col>
          </Row>

          {/* 今日限额 */}
          {limit && (
            <Card>
              <Flex justify="space-between" align="center">
                <Flex vertical>
                  <Text strong>{t("staking.limit.title")}</Text>
                  <Text type="secondary">
                    {t("staking.info.dailyLimit", {
                      amount: limit.total_limit.toLocaleString(),
                    })}
                  </Text>
                </Flex>
                <Progress
                  type="circle"
                  percent={Math.round(
                    (limit.used_limit / limit.total_limit) * 100
                  )}
                  format={() => (
                    <span style={{ fontSize: 14 }}>
                      {limit.remaining_limit.toLocaleString()}
                      <br />
                      <span style={{ fontSize: 10, color: "#999" }}>
                        {t("staking.limit.remaining")}
                      </span>
                    </span>
                  )}
                  size={80}
                  status={limit.is_exhausted ? "exception" : "active"}
                />
              </Flex>
              {limit.is_exhausted && (
                <Alert
                  type="warning"
                  message={t("staking.limit.exhausted")}
                  description={t("staking.limit.exhaustedDesc")}
                  style={{ marginTop: 16 }}
                />
              )}
            </Card>
          )}

          {/* 新建质押 */}
          <Card
            title={
              <Flex align="center" gap={8}>
                <ThunderboltOutlined style={{ color: "#faad14" }} />
                {t("staking.stake.title")}
              </Flex>
            }
          >
            {loading ? (
              <Spin />
            ) : subscriptions.length === 0 ? (
              <Empty
                description={
                  <Flex vertical align="center" gap={8}>
                    <Text>{t("staking.stake.noSubscription")}</Text>
                    <Text type="secondary">
                      {t("staking.stake.noSubscriptionDesc")}
                    </Text>
                  </Flex>
                }
              >
                <Button type="primary" href="/assets">
                  {t("staking.stake.goToAssets")}
                </Button>
              </Empty>
            ) : (
              <Flex vertical gap={24}>
                {/* 选择认购 */}
                <div>
                  <Text strong style={{ display: "block", marginBottom: 8 }}>
                    {t("staking.stake.selectSubscription")}
                  </Text>
                  <Select
                    style={{ width: "100%" }}
                    placeholder={t("staking.stake.selectSubscription")}
                    value={selectedSubscription}
                    onChange={setSelectedSubscription}
                    options={subscriptions.map((sub) => ({
                      value: sub.id,
                      label: (
                        <Flex justify="space-between">
                          <span>
                            {sub.asset_name || `Asset #${sub.asset_id}`}
                          </span>
                          <span style={{ color: "#999" }}>
                            {sub.rwa_token_amount.toLocaleString()} tokens
                          </span>
                        </Flex>
                      ),
                    }))}
                  />
                </div>

                {/* 选择周期 */}
                <div>
                  <Text strong style={{ display: "block", marginBottom: 8 }}>
                    {t("staking.stake.period")}
                  </Text>
                  <Row gutter={16}>
                    {STAKING_PERIODS.map(({ period, multiplier }) => (
                      <Col xs={12} sm={6} key={period}>
                        <PeriodCard
                          days={period}
                          multiplier={multiplier}
                          selected={selectedPeriod === period}
                          recommended={period === 30}
                          onClick={() => setSelectedPeriod(period)}
                        />
                      </Col>
                    ))}
                  </Row>
                </div>

                {/* 质押数量 */}
                <div>
                  <Flex
                    justify="space-between"
                    align="center"
                    style={{ marginBottom: 8 }}
                  >
                    <Text strong>{t("staking.stake.amount")}</Text>
                    {selectedSubscription && (
                      <Text type="secondary">
                        {t("staking.stake.available")}:{" "}
                        {maxStakeAmount.toLocaleString()} tokens
                      </Text>
                    )}
                  </Flex>
                  <InputNumber
                    style={{ width: "100%" }}
                    placeholder={t("staking.stake.amountPlaceholder")}
                    value={stakeAmount}
                    onChange={(value) => setStakeAmount(value || 0)}
                    min={0}
                    max={effectiveMax}
                    disabled={!selectedSubscription}
                    addonAfter={
                      <Button
                        type="link"
                        size="small"
                        onClick={() => setStakeAmount(effectiveMax)}
                        disabled={!selectedSubscription}
                      >
                        MAX
                      </Button>
                    }
                  />
                </div>

                {/* 预览 */}
                {stakeAmount > 0 && (
                  <Card style={{ background: "rgba(82, 196, 26, 0.05)" }}>
                    <Row gutter={16}>
                      <Col span={8}>
                        <Statistic
                          title={t("staking.stake.multiplier")}
                          value={multiplier}
                          suffix="x"
                          styles={{ content: { color: "#52c41a" } }}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic
                          title={t("staking.stake.expectedRewards")}
                          value={expectedRewards}
                          precision={4}
                          suffix="PLT"
                          styles={{ content: { color: "#faad14" } }}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic
                          title={t("staking.stake.endDate")}
                          value={new Date(
                            Date.now() + selectedPeriod * 24 * 60 * 60 * 1000
                          ).toLocaleDateString()}
                        />
                      </Col>
                    </Row>
                  </Card>
                )}

                {/* 提交按钮 */}
                <Button
                  type="primary"
                  size="large"
                  block
                  loading={staking}
                  disabled={
                    !selectedSubscription ||
                    stakeAmount <= 0 ||
                    limit?.is_exhausted
                  }
                  onClick={handleStake}
                >
                  {staking
                    ? t("staking.stake.processing")
                    : t("staking.stake.confirm")}
                </Button>
              </Flex>
            )}
          </Card>

          {/* 质押列表 */}
          <Card
            title={t("staking.list.title")}
            extra={
              <Segmented
                value={statusFilter}
                onChange={(value) => {
                  setStatusFilter(value as string);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                options={[
                  { label: t("staking.list.all"), value: "all" },
                  { label: t("staking.list.active"), value: "active" },
                  { label: t("staking.list.matured"), value: "matured" },
                  { label: t("staking.list.unstaked"), value: "unstaked" },
                ]}
              />
            }
          >
            <Table
              columns={columns}
              dataSource={stakings}
              rowKey="id"
              loading={loading}
              pagination={{
                current: pagination.page,
                pageSize: pagination.pageSize,
                total: pagination.total,
                onChange: (page, pageSize) =>
                  setPagination({ page, pageSize, total: pagination.total }),
              }}
              locale={{
                emptyText: (
                  <Empty
                    description={
                      <Flex vertical align="center" gap={4}>
                        <Text>{t("staking.list.empty")}</Text>
                        <Text type="secondary">
                          {t("staking.list.emptyDesc")}
                        </Text>
                      </Flex>
                    }
                  />
                ),
              }}
            />
          </Card>

          {/* PLT 代币信息 */}
          {pltInfo && (
            <Card
              title={
                <Flex align="center" gap={8}>
                  <DollarOutlined style={{ color: "#faad14" }} />
                  {t("staking.plt.title")}
                </Flex>
              }
            >
              <Row gutter={[24, 24]}>
                {/* 左侧：代币统计 */}
                <Col xs={24} lg={12}>
                  <Flex vertical gap={16}>
                    <Text strong style={{ fontSize: 16 }}>
                      {t("staking.plt.tokenInfo")}
                    </Text>
                    <Row gutter={[16, 16]}>
                      <Col span={12}>
                        <Statistic
                          title={t("staking.plt.totalSupply")}
                          value={pltInfo.total_supply}
                          suffix="PLT"
                          formatter={(value) => value?.toLocaleString()}
                        />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title={t("staking.plt.circulatingSupply")}
                          value={pltInfo.circulating_supply}
                          suffix="PLT"
                          formatter={(value) => value?.toLocaleString()}
                        />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title={t("staking.plt.currentPrice")}
                          value={pltInfo.current_price || 0}
                          prefix="$"
                          precision={4}
                        />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title={t("staking.plt.marketCap")}
                          value={pltInfo.market_cap || 0}
                          prefix="$"
                          formatter={(value) => value?.toLocaleString()}
                        />
                      </Col>
                    </Row>

                    <Divider style={{ margin: "8px 0" }} />

                    <Text strong style={{ fontSize: 16 }}>
                      {t("staking.plt.stakingPool")}
                    </Text>
                    <Row gutter={[16, 16]}>
                      <Col span={8}>
                        <Statistic
                          title={t("staking.plt.poolTotal")}
                          value={pltInfo.staking_rewards_pool}
                          suffix="PLT"
                          styles={{ content: { fontSize: 16 } }}
                          formatter={(value) =>
                            (Number(value) / 1000000).toFixed(1) + "M"
                          }
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic
                          title={t("staking.plt.poolDistributed")}
                          value={pltInfo.staking_rewards_distributed}
                          suffix="PLT"
                          styles={{
                            content: { fontSize: 16, color: "#52c41a" },
                          }}
                          formatter={(value) => value?.toLocaleString()}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic
                          title={t("staking.plt.poolRemaining")}
                          value={pltInfo.staking_rewards_remaining}
                          suffix="PLT"
                          styles={{
                            content: { fontSize: 16, color: "#1890ff" },
                          }}
                          formatter={(value) =>
                            (Number(value) / 1000000).toFixed(1) + "M"
                          }
                        />
                      </Col>
                    </Row>

                    <Progress
                      percent={Math.round(
                        (pltInfo.staking_rewards_distributed /
                          pltInfo.staking_rewards_pool) *
                          100
                      )}
                      status="active"
                      strokeColor="#52c41a"
                      format={(percent) =>
                        `${percent}% ${t("staking.plt.poolDistributed")}`
                      }
                    />
                  </Flex>
                </Col>

                {/* 右侧：分配图表 */}
                <Col xs={24} lg={12}>
                  <Flex vertical gap={16}>
                    <Text strong style={{ fontSize: 16 }}>
                      <PieChartOutlined style={{ marginRight: 8 }} />
                      {t("staking.plt.distributionTitle")}
                    </Text>

                    {/* 简易饼图使用 CSS */}
                    <Flex justify="center">
                      <div
                        style={{
                          width: 200,
                          height: 200,
                          borderRadius: "50%",
                          background: `conic-gradient(
                          ${pltInfo.distribution.allocations
                            .map((a, i) => {
                              const start = pltInfo.distribution.allocations
                                .slice(0, i)
                                .reduce((sum, x) => sum + x.percentage, 0);
                              return `${a.color} ${start}% ${
                                start + a.percentage
                              }%`;
                            })
                            .join(", ")}
                        )`,
                          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                        }}
                      />
                    </Flex>

                    {/* 图例 */}
                    <Row gutter={[8, 8]}>
                      {pltInfo.distribution.allocations.map((alloc) => (
                        <Col xs={12} key={alloc.name}>
                          <Flex align="center" gap={8}>
                            <div
                              style={{
                                width: 12,
                                height: 12,
                                borderRadius: 2,
                                backgroundColor: alloc.color,
                              }}
                            />
                            <Tooltip title={alloc.description}>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {alloc.name}: {alloc.percentage}%
                              </Text>
                            </Tooltip>
                          </Flex>
                        </Col>
                      ))}
                    </Row>

                    {/* APY */}
                    <Flex justify="center" style={{ marginTop: 8 }}>
                      <Card
                        size="small"
                        style={{
                          background: "rgba(82, 196, 26, 0.1)",
                          border: "none",
                        }}
                      >
                        <Statistic
                          title={t("staking.plt.averageApy")}
                          value={pltInfo.average_apy}
                          suffix="%"
                          precision={2}
                          styles={{
                            content: { color: "#52c41a", fontSize: 24 },
                          }}
                        />
                      </Card>
                    </Flex>
                  </Flex>
                </Col>
              </Row>
            </Card>
          )}

          {/* 使用说明 */}
          <Card
            title={
              <Flex align="center" gap={8}>
                <InfoCircleOutlined />
                {t("staking.info.howItWorks")}
              </Flex>
            }
          >
            <Steps
              direction="vertical"
              items={[
                {
                  title: t("staking.info.step1"),
                  status: "finish",
                },
                {
                  title: t("staking.info.step2"),
                  status: "finish",
                },
                {
                  title: t("staking.info.step3"),
                  status: "finish",
                },
                {
                  title: t("staking.info.step4"),
                  status: "finish",
                },
              ]}
            />
            <Divider />
            <Flex vertical gap={8}>
              <Text type="secondary">
                <InfoCircleOutlined style={{ marginRight: 8 }} />
                {t("staking.info.rewards")}
              </Text>
              <Text type="secondary">
                <WarningOutlined style={{ marginRight: 8, color: "#faad14" }} />
                {t("staking.info.earlyUnstake")}
              </Text>
            </Flex>
          </Card>
        </Flex>

        {/* 详情弹窗 */}
        <Modal
          title={t("staking.detail.title")}
          open={detailModalVisible}
          onCancel={() => {
            setDetailModalVisible(false);
            setSelectedStaking(null);
          }}
          footer={null}
          width={600}
        >
          {selectedStaking && (
            <Flex vertical gap={16}>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Text type="secondary">{t("staking.detail.stakingId")}</Text>
                  <br />
                  <Text strong>#{selectedStaking.id}</Text>
                </Col>
                <Col span={12}>
                  <Text type="secondary">{t("staking.detail.status")}</Text>
                  <br />
                  <Tag color={STAKING_STATUS_COLORS[selectedStaking.status]}>
                    {t(`staking.status.${selectedStaking.status}`)}
                  </Tag>
                </Col>
                <Col span={12}>
                  <Text type="secondary">{t("staking.detail.amount")}</Text>
                  <br />
                  <Text strong>
                    {selectedStaking.amount.toLocaleString()} tokens
                  </Text>
                </Col>
                <Col span={12}>
                  <Text type="secondary">{t("staking.detail.period")}</Text>
                  <br />
                  <Text strong>
                    {selectedStaking.period} {t("common.days")}
                  </Text>
                </Col>
                <Col span={12}>
                  <Text type="secondary">{t("staking.detail.startDate")}</Text>
                  <br />
                  <Text>
                    {new Date(selectedStaking.start_date).toLocaleDateString()}
                  </Text>
                </Col>
                <Col span={12}>
                  <Text type="secondary">{t("staking.detail.endDate")}</Text>
                  <br />
                  <Text>
                    {new Date(selectedStaking.end_date).toLocaleDateString()}
                  </Text>
                </Col>
                <Col span={12}>
                  <Text type="secondary">{t("staking.detail.multiplier")}</Text>
                  <br />
                  <Text style={{ color: "#52c41a" }}>
                    {selectedStaking.multiplier}x
                  </Text>
                </Col>
                <Col span={12}>
                  <Text type="secondary">
                    {t("staking.detail.daysRemaining")}
                  </Text>
                  <br />
                  <Text>
                    {selectedStaking.days_remaining} {t("common.days")}
                  </Text>
                </Col>
              </Row>

              <Divider />

              <Row gutter={[16, 16]}>
                <Col span={8}>
                  <Statistic
                    title={t("staking.detail.expectedRewards")}
                    value={selectedStaking.expected_rewards}
                    precision={4}
                    suffix="PLT"
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title={t("staking.detail.currentRewards")}
                    value={selectedStaking.current_rewards}
                    precision={4}
                    suffix="PLT"
                    styles={{ content: { color: "#faad14" } }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title={t("staking.detail.claimedRewards")}
                    value={selectedStaking.claimed_rewards}
                    precision={4}
                    suffix="PLT"
                    styles={{ content: { color: "#52c41a" } }}
                  />
                </Col>
              </Row>

              {selectedStaking.stake_tx_hash && (
                <>
                  <Divider />
                  <Flex align="center" gap={8}>
                    <Text type="secondary">{t("staking.detail.txHash")}:</Text>
                    <Tooltip title={selectedStaking.stake_tx_hash}>
                      <Text copyable ellipsis style={{ maxWidth: 200 }}>
                        {selectedStaking.stake_tx_hash}
                      </Text>
                    </Tooltip>
                    <Button
                      type="link"
                      size="small"
                      icon={<LinkOutlined />}
                      href={`https://etherscan.io/tx/${selectedStaking.stake_tx_hash}`}
                      target="_blank"
                    />
                  </Flex>
                </>
              )}
            </Flex>
          )}
        </Modal>

        {/* 解除质押弹窗 */}
        <Modal
          title={t("staking.unstake.title")}
          open={unstakeModalVisible}
          onCancel={() => {
            setUnstakeModalVisible(false);
            setSelectedStaking(null);
          }}
          onOk={handleUnstake}
          okText={t("staking.unstake.confirm")}
          okButtonProps={{ danger: true }}
        >
          {selectedStaking && (
            <Flex vertical gap={16}>
              <Alert
                type={selectedStaking.is_matured ? "success" : "warning"}
                message={
                  selectedStaking.is_matured
                    ? t("staking.unstake.warningMatured")
                    : t("staking.unstake.warning")
                }
                description={
                  !selectedStaking.is_matured &&
                  t("staking.unstake.warningEarly", {
                    percent: Math.round(
                      (selectedStaking.days_remaining /
                        selectedStaking.period) *
                        100
                    ),
                  })
                }
              />

              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic
                    title={t("staking.unstake.principal")}
                    value={selectedStaking.amount}
                    suffix="tokens"
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title={t("staking.unstake.rewards")}
                    value={selectedStaking.current_rewards}
                    precision={4}
                    suffix="PLT"
                    styles={{ content: { color: "#52c41a" } }}
                  />
                </Col>
              </Row>
            </Flex>
          )}
        </Modal>
      </div>
    </RequireKyc>
  );
}
