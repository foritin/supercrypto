"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Rocket,
  Clock,
  Trophy,
  Info,
  ExternalLink,
  AlertTriangle,
  Gift,
  Flame,
  Zap,
  DollarSign,
  PieChart,
  CheckCircle,
} from "lucide-react";
import { useAccount } from "wagmi";
import { useTranslation } from "react-i18next";
import { ColumnDef } from "@tanstack/react-table";

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
  STAKING_PERIODS,
  STAKING_STATUS_COLORS,
} from "@/services/staking";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { notification } from "@/lib/notification";
import { cn } from "@/lib/utils";

// 统计卡片组件
interface StatCardProps {
  title: string;
  value: number;
  precision?: number;
  suffix?: string;
  prefix?: React.ReactNode;
  valueClassName?: string;
  formatter?: (value: number) => string;
}

function StatCard({
  title,
  value,
  precision = 0,
  suffix,
  prefix,
  valueClassName,
  formatter,
}: StatCardProps) {
  const displayValue = formatter
    ? formatter(value)
    : value.toLocaleString(undefined, {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
      });

  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm text-muted-foreground mb-2">{title}</p>
        <div
          className={cn(
            "text-2xl font-bold flex items-center gap-2",
            valueClassName
          )}
        >
          {prefix}
          <span>
            {displayValue}
            {suffix && <span className="text-base ml-1">{suffix}</span>}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// 空状态组件
function EmptyState({
  message,
  description,
  children,
}: {
  message: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
      <span>{message}</span>
      {description && (
        <span className="text-sm text-muted-foreground/70">{description}</span>
      )}
      {children}
    </div>
  );
}

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
      className={cn(
        "cursor-pointer transition-all hover:border-primary/50 relative",
        selected && "border-primary border-2 bg-primary/5"
      )}
      onClick={onClick}
    >
      {recommended && (
        <div className="absolute -top-2 -right-2 z-10">
          <Badge className="bg-yellow-500 text-black text-xs">
            {t("staking.period.recommended")}
          </Badge>
        </div>
      )}
      <CardContent className="p-4 flex flex-col items-center gap-2">
        <span className="text-2xl font-bold">{days}</span>
        <span className="text-sm text-muted-foreground">{t("common.days")}</span>
        <div className="w-full h-px bg-border my-2" />
        <span className="text-lg font-semibold text-green-400">{multiplier}x</span>
        <span className="text-xs text-muted-foreground">
          {t("staking.stake.multiplier")}
        </span>
      </CardContent>
    </Card>
  );
}

// Alert 组件
function AlertBox({
  type,
  message,
  description,
}: {
  type: "success" | "warning" | "error" | "info";
  message: string;
  description?: string;
}) {
  const colorMap = {
    success: "bg-green-500/10 border-green-500/30 text-green-400",
    warning: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
    error: "bg-red-500/10 border-red-500/30 text-red-400",
    info: "bg-blue-500/10 border-blue-500/30 text-blue-400",
  };

  const iconMap = {
    success: <CheckCircle className="h-5 w-5" />,
    warning: <AlertTriangle className="h-5 w-5" />,
    error: <AlertTriangle className="h-5 w-5" />,
    info: <Info className="h-5 w-5" />,
  };

  return (
    <div className={cn("p-4 rounded-lg border", colorMap[type])}>
      <div className="flex items-start gap-3">
        {iconMap[type]}
        <div className="flex flex-col gap-1">
          <span className="font-medium">{message}</span>
          {description && (
            <span className="text-sm opacity-80">{description}</span>
          )}
        </div>
      </div>
    </div>
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
    string | null
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
      notification.error(t("staking.error.loadFailed"));
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
    (s) => s.id === Number(selectedSubscription)
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
      notification.warning(t("staking.error.invalidAmount"));
      return;
    }

    setStaking(true);
    try {
      // TODO: 实际应该调用合约并获取交易哈希
      const txHash = `0x${Date.now().toString(16)}${"0".repeat(48)}`; // 模拟交易哈希

      await stakingService.createStaking({
        subscription_id: Number(selectedSubscription),
        amount: stakeAmount,
        period: selectedPeriod as 15 | 30 | 45 | 60,
        tx_hash: txHash,
      });

      notification.success(t("staking.stake.success"));
      setSelectedSubscription(null);
      setStakeAmount(0);
      loadData();
    } catch (error) {
      console.error("Stake failed:", error);
      notification.error(t("staking.stake.failed"));
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
      notification.success(t("staking.unstake.success"));
      setUnstakeModalVisible(false);
      setSelectedStaking(null);
      loadData();
    } catch (error) {
      console.error("Unstake failed:", error);
      notification.error(t("staking.unstake.failed"));
    }
  };

  // 领取奖励
  const handleClaim = async (staking: StakingResponse) => {
    try {
      // TODO: 实际应该调用合约
      const txHash = `0x${Date.now().toString(16)}${"0".repeat(48)}`;

      await stakingService.claimRewards(staking.id, txHash);
      notification.success(t("staking.claim.success"));
      loadData();
    } catch (error) {
      console.error("Claim failed:", error);
      notification.error(t("staking.claim.failed"));
    }
  };

  // 表格列定义
  const columns: ColumnDef<StakingResponse>[] = useMemo(
    () => [
      {
        accessorKey: "amount",
        header: t("staking.detail.amount"),
        cell: ({ row }) => (
          <span className="font-semibold">
            {row.original.amount.toLocaleString()} tokens
          </span>
        ),
      },
      {
        accessorKey: "period",
        header: t("staking.detail.period"),
        cell: ({ row }) => (
          <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
            {row.original.period} {t("common.days")}
          </Badge>
        ),
      },
      {
        accessorKey: "multiplier",
        header: t("staking.detail.multiplier"),
        cell: ({ row }) => (
          <span className="text-green-400">{row.original.multiplier}x</span>
        ),
      },
      {
        id: "progress",
        header: t("staking.detail.progress"),
        cell: ({ row }) => {
          const totalDays = row.original.period;
          const passedDays = totalDays - row.original.days_remaining;
          const percent = Math.min(100, (passedDays / totalDays) * 100);

          return (
            <div className="flex flex-col gap-1 min-w-[120px]">
              <Progress
                value={percent}
                indicatorColor={row.original.is_matured ? "#22c55e" : "#00D4AA"}
                className="h-1.5"
              />
              <span className="text-xs text-muted-foreground">
                {row.original.days_remaining > 0
                  ? `${row.original.days_remaining} ${t("common.days")} ${t(
                      "staking.detail.daysRemaining"
                    )}`
                  : t("staking.status.matured")}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "current_rewards",
        header: t("staking.detail.currentRewards"),
        cell: ({ row }) => (
          <span className="text-yellow-400 flex items-center gap-1">
            <Gift className="h-4 w-4" />
            {row.original.current_rewards.toFixed(4)} PLT
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: t("staking.detail.status"),
        cell: ({ row }) => {
          const status = row.original.status;
          const colorMap: Record<string, string> = {
            active: "bg-blue-500/20 text-blue-400",
            matured: "bg-green-500/20 text-green-400",
            unstaked: "bg-gray-500/20 text-gray-400",
            claimed: "bg-purple-500/20 text-purple-400",
          };
          return (
            <Badge className={colorMap[status] || "bg-gray-500/20 text-gray-400"}>
              {t(`staking.status.${status}`)}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: t("common.actions"),
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedStaking(row.original);
                setDetailModalVisible(true);
              }}
            >
              {t("common.details")}
            </Button>
            {row.original.status === "active" && (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-400 hover:text-red-300"
                onClick={() => {
                  setSelectedStaking(row.original);
                  setUnstakeModalVisible(true);
                }}
              >
                {t("staking.unstake.title")}
              </Button>
            )}
            {row.original.status === "matured" &&
              row.original.pending_rewards > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary"
                  onClick={() => handleClaim(row.original)}
                >
                  {t("staking.claim.title")}
                </Button>
              )}
          </div>
        ),
      },
    ],
    [t]
  );

  return (
    <RequireKyc>
      <div className="relative min-h-[calc(100vh-200px)]">
        {/* Background Orbs */}
        <div
          className="bg-orb bg-orb-gold animate-float"
          style={{ top: "5%", right: "10%", opacity: 0.5 }}
        />
        <div
          className="bg-orb bg-orb-primary animate-float-delayed"
          style={{ bottom: "20%", left: "5%", opacity: 0.3 }}
        />

        <div className="flex flex-col gap-6 py-6 relative z-10">
          {/* 页面标题 */}
          <div className="flex justify-between items-center fade-in-stagger">
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-bold flex items-center gap-2 m-0">
                <Flame className="h-6 w-6 text-orange-500" />
                {t("staking.title")}
              </h2>
              <p className="text-muted-foreground">{t("staking.subtitle")}</p>
            </div>
          </div>

          {/* 统计卡片 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title={t("staking.stats.totalStaked")}
              value={stats?.total_staked || 0}
              suffix="tokens"
              prefix={<Rocket className="h-5 w-5" />}
              valueClassName="text-blue-400"
            />
            <StatCard
              title={t("staking.stats.activeStakes")}
              value={stats?.active_stakes || 0}
              prefix={<Clock className="h-5 w-5" />}
              valueClassName="text-purple-400"
            />
            <StatCard
              title={t("staking.stats.totalRewards")}
              value={stats?.total_rewards_earned || 0}
              precision={4}
              suffix="PLT"
              prefix={<Trophy className="h-5 w-5" />}
              valueClassName="text-green-400"
            />
            <StatCard
              title={t("staking.stats.pendingRewards")}
              value={stats?.pending_rewards || 0}
              precision={4}
              suffix="PLT"
              prefix={<Gift className="h-5 w-5" />}
              valueClassName="text-yellow-400"
            />
          </div>

          {/* 今日限额 */}
          {limit && (
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold">{t("staking.limit.title")}</span>
                    <span className="text-sm text-muted-foreground">
                      {t("staking.info.dailyLimit", {
                        amount: limit.total_limit.toLocaleString(),
                      })}
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="relative w-20 h-20">
                      <svg className="w-20 h-20 transform -rotate-90">
                        <circle
                          cx="40"
                          cy="40"
                          r="36"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          className="text-white/10"
                        />
                        <circle
                          cx="40"
                          cy="40"
                          r="36"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={`${
                            (limit.used_limit / limit.total_limit) * 226
                          } 226`}
                          className={
                            limit.is_exhausted ? "text-red-500" : "text-primary"
                          }
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-sm font-semibold">
                          {limit.remaining_limit.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {t("staking.limit.remaining")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                {limit.is_exhausted && (
                  <div className="mt-4">
                    <AlertBox
                      type="warning"
                      message={t("staking.limit.exhausted")}
                      description={t("staking.limit.exhaustedDesc")}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 新建质押 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-400" />
                {t("staking.stake.title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : subscriptions.length === 0 ? (
                <EmptyState
                  message={t("staking.stake.noSubscription")}
                  description={t("staking.stake.noSubscriptionDesc")}
                >
                  <Button className="mt-4" asChild>
                    <a href="/assets">{t("staking.stake.goToAssets")}</a>
                  </Button>
                </EmptyState>
              ) : (
                <div className="flex flex-col gap-6">
                  {/* 选择认购 */}
                  <div>
                    <label className="block font-semibold mb-2">
                      {t("staking.stake.selectSubscription")}
                    </label>
                    <Select
                      value={selectedSubscription || ""}
                      onValueChange={setSelectedSubscription}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t("staking.stake.selectSubscription")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {subscriptions.map((sub) => (
                          <SelectItem key={sub.id} value={String(sub.id)}>
                            <div className="flex justify-between items-center w-full gap-4">
                              <span>
                                {sub.asset_name || `Asset #${sub.asset_id}`}
                              </span>
                              <span className="text-muted-foreground">
                                {sub.rwa_token_amount.toLocaleString()} tokens
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 选择周期 */}
                  <div>
                    <label className="block font-semibold mb-2">
                      {t("staking.stake.period")}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {STAKING_PERIODS.map(({ period, multiplier }) => (
                        <PeriodCard
                          key={period}
                          days={period}
                          multiplier={multiplier}
                          selected={selectedPeriod === period}
                          recommended={period === 30}
                          onClick={() => setSelectedPeriod(period)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* 质押数量 */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="font-semibold">
                        {t("staking.stake.amount")}
                      </label>
                      {selectedSubscription && (
                        <span className="text-sm text-muted-foreground">
                          {t("staking.stake.available")}:{" "}
                          {maxStakeAmount.toLocaleString()} tokens
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder={t("staking.stake.amountPlaceholder")}
                        value={stakeAmount || ""}
                        onChange={(e) =>
                          setStakeAmount(Number(e.target.value) || 0)
                        }
                        min={0}
                        max={effectiveMax}
                        disabled={!selectedSubscription}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        onClick={() => setStakeAmount(effectiveMax)}
                        disabled={!selectedSubscription}
                      >
                        MAX
                      </Button>
                    </div>
                  </div>

                  {/* 预览 */}
                  {stakeAmount > 0 && (
                    <Card className="bg-green-500/5 border-green-500/20">
                      <CardContent className="p-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="flex flex-col">
                            <span className="text-sm text-muted-foreground">
                              {t("staking.stake.multiplier")}
                            </span>
                            <span className="text-xl font-bold text-green-400">
                              {multiplier}x
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm text-muted-foreground">
                              {t("staking.stake.expectedRewards")}
                            </span>
                            <span className="text-xl font-bold text-yellow-400">
                              {expectedRewards.toFixed(4)} PLT
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm text-muted-foreground">
                              {t("staking.stake.endDate")}
                            </span>
                            <span className="text-xl font-bold">
                              {new Date(
                                Date.now() + selectedPeriod * 24 * 60 * 60 * 1000
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* 提交按钮 */}
                  <Button
                    size="lg"
                    className="w-full"
                    disabled={
                      !selectedSubscription ||
                      stakeAmount <= 0 ||
                      limit?.is_exhausted ||
                      staking
                    }
                    onClick={handleStake}
                  >
                    {staking
                      ? t("staking.stake.processing")
                      : t("staking.stake.confirm")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 质押列表 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("staking.list.title")}</CardTitle>
              <Tabs
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              >
                <TabsList>
                  <TabsTrigger value="all">{t("staking.list.all")}</TabsTrigger>
                  <TabsTrigger value="active">
                    {t("staking.list.active")}
                  </TabsTrigger>
                  <TabsTrigger value="matured">
                    {t("staking.list.matured")}
                  </TabsTrigger>
                  <TabsTrigger value="unstaked">
                    {t("staking.list.unstaked")}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : stakings.length > 0 ? (
                <DataTable
                  columns={columns}
                  data={stakings}
                  pagination={{
                    pageIndex: pagination.page - 1,
                    pageSize: pagination.pageSize,
                    pageCount: Math.ceil(pagination.total / pagination.pageSize),
                    onPageChange: (page) =>
                      setPagination((prev) => ({ ...prev, page: page + 1 })),
                    onPageSizeChange: (size) =>
                      setPagination((prev) => ({ ...prev, pageSize: size })),
                  }}
                  emptyMessage={t("staking.list.empty")}
                />
              ) : (
                <EmptyState
                  message={t("staking.list.empty")}
                  description={t("staking.list.emptyDesc")}
                />
              )}
            </CardContent>
          </Card>

          {/* PLT 代币信息 */}
          {pltInfo && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-yellow-400" />
                  {t("staking.plt.title")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 左侧：代币统计 */}
                  <div className="flex flex-col gap-4">
                    <h4 className="font-semibold">{t("staking.plt.tokenInfo")}</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">
                          {t("staking.plt.totalSupply")}
                        </span>
                        <span className="text-lg font-semibold">
                          {pltInfo.total_supply.toLocaleString()} PLT
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">
                          {t("staking.plt.circulatingSupply")}
                        </span>
                        <span className="text-lg font-semibold">
                          {pltInfo.circulating_supply.toLocaleString()} PLT
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">
                          {t("staking.plt.currentPrice")}
                        </span>
                        <span className="text-lg font-semibold">
                          ${(pltInfo.current_price || 0).toFixed(4)}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">
                          {t("staking.plt.marketCap")}
                        </span>
                        <span className="text-lg font-semibold">
                          ${(pltInfo.market_cap || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="h-px bg-border my-2" />

                    <h4 className="font-semibold">{t("staking.plt.stakingPool")}</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">
                          {t("staking.plt.poolTotal")}
                        </span>
                        <span className="font-semibold">
                          {(pltInfo.staking_rewards_pool / 1000000).toFixed(1)}M PLT
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">
                          {t("staking.plt.poolDistributed")}
                        </span>
                        <span className="font-semibold text-green-400">
                          {pltInfo.staking_rewards_distributed.toLocaleString()} PLT
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">
                          {t("staking.plt.poolRemaining")}
                        </span>
                        <span className="font-semibold text-blue-400">
                          {(pltInfo.staking_rewards_remaining / 1000000).toFixed(1)}M
                          PLT
                        </span>
                      </div>
                    </div>

                    <Progress
                      value={Math.round(
                        (pltInfo.staking_rewards_distributed /
                          pltInfo.staking_rewards_pool) *
                          100
                      )}
                      indicatorColor="#22c55e"
                      showInfo
                      format={(percent) =>
                        `${percent}% ${t("staking.plt.poolDistributed")}`
                      }
                    />
                  </div>

                  {/* 右侧：分配图表 */}
                  <div className="flex flex-col gap-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <PieChart className="h-4 w-4" />
                      {t("staking.plt.distributionTitle")}
                    </h4>

                    {/* 简易饼图使用 CSS */}
                    <div className="flex justify-center">
                      <div
                        className="w-[200px] h-[200px] rounded-full shadow-lg"
                        style={{
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
                        }}
                      />
                    </div>

                    {/* 图例 */}
                    <div className="grid grid-cols-2 gap-2">
                      <TooltipProvider>
                        {pltInfo.distribution.allocations.map((alloc) => (
                          <Tooltip key={alloc.name}>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2 cursor-help">
                                <div
                                  className="w-3 h-3 rounded-sm"
                                  style={{ backgroundColor: alloc.color }}
                                />
                                <span className="text-xs text-muted-foreground">
                                  {alloc.name}: {alloc.percentage}%
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{alloc.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </TooltipProvider>
                    </div>

                    {/* APY */}
                    <div className="flex justify-center mt-2">
                      <Card className="bg-green-500/10 border-green-500/20">
                        <CardContent className="p-4 flex flex-col items-center">
                          <span className="text-sm text-muted-foreground">
                            {t("staking.plt.averageApy")}
                          </span>
                          <span className="text-2xl font-bold text-green-400">
                            {pltInfo.average_apy.toFixed(2)}%
                          </span>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 使用说明 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                {t("staking.info.howItWorks")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                {/* 步骤说明 */}
                <div className="flex flex-col gap-3">
                  {[1, 2, 3, 4].map((step) => (
                    <div key={step} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold">
                        {step}
                      </div>
                      <span>{t(`staking.info.step${step}`)}</span>
                    </div>
                  ))}
                </div>

                <div className="h-px bg-border my-2" />

                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    {t("staking.info.rewards")}
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-400" />
                    {t("staking.info.earlyUnstake")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 详情弹窗 */}
        <Dialog open={detailModalVisible} onOpenChange={setDetailModalVisible}>
          <DialogContent className="max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{t("staking.detail.title")}</DialogTitle>
            </DialogHeader>

            {selectedStaking && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">
                      {t("staking.detail.stakingId")}
                    </span>
                    <span className="font-semibold">#{selectedStaking.id}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">
                      {t("staking.detail.status")}
                    </span>
                    <Badge
                      className={cn(
                        "w-fit",
                        selectedStaking.status === "active"
                          ? "bg-blue-500/20 text-blue-400"
                          : selectedStaking.status === "matured"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-gray-500/20 text-gray-400"
                      )}
                    >
                      {t(`staking.status.${selectedStaking.status}`)}
                    </Badge>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">
                      {t("staking.detail.amount")}
                    </span>
                    <span className="font-semibold">
                      {selectedStaking.amount.toLocaleString()} tokens
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">
                      {t("staking.detail.period")}
                    </span>
                    <span className="font-semibold">
                      {selectedStaking.period} {t("common.days")}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">
                      {t("staking.detail.startDate")}
                    </span>
                    <span>
                      {new Date(selectedStaking.start_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">
                      {t("staking.detail.endDate")}
                    </span>
                    <span>
                      {new Date(selectedStaking.end_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">
                      {t("staking.detail.multiplier")}
                    </span>
                    <span className="text-green-400">
                      {selectedStaking.multiplier}x
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">
                      {t("staking.detail.daysRemaining")}
                    </span>
                    <span>
                      {selectedStaking.days_remaining} {t("common.days")}
                    </span>
                  </div>
                </div>

                <div className="h-px bg-border" />

                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">
                      {t("staking.detail.expectedRewards")}
                    </span>
                    <span className="text-lg font-semibold">
                      {selectedStaking.expected_rewards.toFixed(4)} PLT
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">
                      {t("staking.detail.currentRewards")}
                    </span>
                    <span className="text-lg font-semibold text-yellow-400">
                      {selectedStaking.current_rewards.toFixed(4)} PLT
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">
                      {t("staking.detail.claimedRewards")}
                    </span>
                    <span className="text-lg font-semibold text-green-400">
                      {selectedStaking.claimed_rewards.toFixed(4)} PLT
                    </span>
                  </div>
                </div>

                {selectedStaking.stake_tx_hash && (
                  <>
                    <div className="h-px bg-border" />
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {t("staking.detail.txHash")}:
                      </span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="font-mono text-sm truncate max-w-[200px]">
                              {selectedStaking.stake_tx_hash}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{selectedStaking.stake_tx_hash}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        asChild
                      >
                        <a
                          href={`https://etherscan.io/tx/${selectedStaking.stake_tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* 解除质押弹窗 */}
        <Dialog open={unstakeModalVisible} onOpenChange={setUnstakeModalVisible}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("staking.unstake.title")}</DialogTitle>
            </DialogHeader>

            {selectedStaking && (
              <div className="flex flex-col gap-4">
                <AlertBox
                  type={selectedStaking.is_matured ? "success" : "warning"}
                  message={
                    selectedStaking.is_matured
                      ? t("staking.unstake.warningMatured")
                      : t("staking.unstake.warning")
                  }
                  description={
                    !selectedStaking.is_matured
                      ? t("staking.unstake.warningEarly", {
                          percent: Math.round(
                            (selectedStaking.days_remaining /
                              selectedStaking.period) *
                              100
                          ),
                        })
                      : undefined
                  }
                />

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">
                      {t("staking.unstake.principal")}
                    </span>
                    <span className="text-lg font-semibold">
                      {selectedStaking.amount.toLocaleString()} tokens
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">
                      {t("staking.unstake.rewards")}
                    </span>
                    <span className="text-lg font-semibold text-green-400">
                      {selectedStaking.current_rewards.toFixed(4)} PLT
                    </span>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setUnstakeModalVisible(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button variant="destructive" onClick={handleUnstake}>
                {t("staking.unstake.confirm")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RequireKyc>
  );
}
