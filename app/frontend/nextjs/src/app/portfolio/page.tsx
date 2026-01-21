"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  DollarSign,
  Clock,
  CheckCircle,
  TrendingUp,
  History,
  Download,
  ExternalLink,
  Info,
  Copy,
} from "lucide-react";
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
import {
  DataTable,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { notification } from "@/lib/notification";
import { cn } from "@/lib/utils";

// 统计卡片组件
interface StatCardProps {
  title: string;
  value: number;
  precision?: number;
  prefix?: React.ReactNode;
  valueClassName?: string;
}

function StatCard({ title, value, precision = 2, prefix, valueClassName }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm text-muted-foreground mb-2">{title}</p>
        <div className={cn("text-2xl font-bold flex items-center gap-2", valueClassName)}>
          {prefix}
          <span>
            {typeof value === 'number' 
              ? value.toLocaleString(undefined, { minimumFractionDigits: precision, maximumFractionDigits: precision })
              : value}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// 空状态组件
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <span>{message}</span>
    </div>
  );
}

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
      notification.success(t("portfolio.redeemSuccess"));
      setDetailModalOpen(false);
      fetchSubscriptions();
    } catch (err) {
      notification.error((err as Error).message || t("portfolio.redeemFailed"));
    } finally {
      setIsRedeeming(false);
    }
  }, [selectedSubscription, t, fetchSubscriptions]);

  // 导出交易记录
  const handleExport = useCallback(async () => {
    try {
      notification.loading(t("portfolio.exporting"));
      // TODO: 实现导出功能
      notification.success(t("portfolio.exportSuccess"));
    } catch {
      notification.error(t("portfolio.exportFailed"));
    }
  }, [t]);

  // 复制文本到剪贴板
  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    notification.success("已复制到剪贴板");
  }, []);

  // 认购表格列定义
  const subscriptionColumns: ColumnDef<SubscriptionItem>[] = useMemo(
    () => [
      {
        accessorKey: "asset_name",
        header: t("portfolio.table.asset"),
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold">{row.original.asset_name}</span>
            <span className="text-xs text-muted-foreground">
              {row.original.asset_symbol}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "amount",
        header: t("portfolio.table.amount"),
        cell: ({ row }) => (
          <span className="font-semibold text-primary">
            ${row.original.amount.toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: "apy",
        header: t("portfolio.table.apy"),
        cell: ({ row }) => (
          <Badge variant="secondary" className="bg-green-500/20 text-green-400">
            {row.original.apy}% APY
          </Badge>
        ),
      },
      {
        accessorKey: "lock_period",
        header: t("portfolio.table.period"),
        cell: ({ row }) => {
          const period = row.original.lock_period;
          const daysRemaining = row.original.days_remaining;
          const progressPercent = Math.max(
            0,
            100 - (daysRemaining / (period * 30)) * 100
          );
          return (
            <div className="flex flex-col gap-1 min-w-[120px]">
              <span>
                {period} {t("common.months")}
              </span>
              <Progress value={progressPercent} indicatorColor="#00D4AA" className="h-1.5" />
              <span className="text-xs text-muted-foreground">
                {daysRemaining > 0
                  ? `${daysRemaining} ${t("common.daysLeft")}`
                  : t("portfolio.matured")}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: t("portfolio.table.status"),
        cell: ({ row }) => {
          const status = row.original.status;
          const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
            active: "secondary",
            matured: "default",
            redeemed: "outline",
          };
          return (
            <Badge variant={variants[status] || "outline"}>
              {t(`portfolio.status.${status}`)}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: t("portfolio.table.actions"),
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewDetail(row.original)}
            >
              {t("common.details")}
            </Button>
            {row.original.is_matured && row.original.status !== "redeemed" && (
              <Button
                size="sm"
                onClick={() => handleViewDetail(row.original)}
              >
                {t("portfolio.redeem")}
              </Button>
            )}
          </div>
        ),
      },
    ],
    [t, handleViewDetail]
  );

  // 交易历史表格列定义
  const transactionColumns: ColumnDef<TransactionRecord>[] = useMemo(
    () => [
      {
        accessorKey: "created_at",
        header: t("portfolio.txTable.time"),
        cell: ({ row }) => new Date(row.original.created_at).toLocaleString(),
      },
      {
        accessorKey: "tx_type",
        header: t("portfolio.txTable.type"),
        cell: ({ row }) => {
          const type = row.original.tx_type;
          const colorMap: Record<string, string> = {
            subscribe: "bg-blue-500/20 text-blue-400",
            redeem: "bg-green-500/20 text-green-400",
            stake: "bg-purple-500/20 text-purple-400",
            unstake: "bg-orange-500/20 text-orange-400",
            claim: "bg-yellow-500/20 text-yellow-400",
          };
          return (
            <Badge className={colorMap[type] || "bg-gray-500/20 text-gray-400"}>
              {TRANSACTION_TYPE_NAMES[type as keyof typeof TRANSACTION_TYPE_NAMES] || type}
            </Badge>
          );
        },
      },
      {
        accessorKey: "amount",
        header: t("portfolio.txTable.amount"),
        cell: ({ row }) => `${parseFloat(row.original.amount).toLocaleString()}`,
      },
      {
        accessorKey: "status",
        header: t("portfolio.txTable.status"),
        cell: ({ row }) => {
          const status = row.original.status;
          const colorMap: Record<string, string> = {
            pending: "bg-yellow-500/20 text-yellow-400",
            confirmed: "bg-green-500/20 text-green-400",
            failed: "bg-red-500/20 text-red-400",
          };
          return (
            <Badge className={colorMap[status] || "bg-gray-500/20 text-gray-400"}>
              {status}
            </Badge>
          );
        },
      },
      {
        accessorKey: "tx_hash",
        header: t("portfolio.txTable.txHash"),
        cell: ({ row }) => {
          const hash = row.original.tx_hash;
          const explorerUrl = getExplorerUrl(hash, row.original.network);
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">
                      {hash.slice(0, 10)}...{hash.slice(-6)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(hash)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    {explorerUrl && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        asChild
                      >
                        <a href={explorerUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{hash}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        },
      },
    ],
    [t, copyToClipboard]
  );

  // 服务端渲染或客户端未挂载时显示加载状态，避免 hydration 不匹配
  if (!mounted) {
    return (
      <div className="max-w-[1200px] mx-auto px-6 py-16 flex justify-center items-center min-h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    );
  }

  return (
    <RequireWallet>
      <div className="portfolio-page max-w-[1200px] mx-auto px-6 py-6 relative min-h-[calc(100vh-200px)]">
        {/* Page Header */}
        <div className="flex flex-col gap-2 mb-8 fade-in-stagger">
          <span className="text-primary text-sm font-semibold uppercase tracking-widest">
            My Investments
          </span>
          <h1 className="text-3xl font-bold m-0">{t("portfolio.title")}</h1>
          <p className="text-muted-foreground">{t("portfolio.subtitle")}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title={t("portfolio.stats.totalInvested")}
            value={userStats?.total_invested || 0}
            prefix={<DollarSign className="h-5 w-5" />}
            valueClassName="text-primary"
          />
          <StatCard
            title={t("portfolio.stats.totalValue")}
            value={userStats?.total_value || 0}
            prefix={<DollarSign className="h-5 w-5" />}
            valueClassName="text-yellow-400"
          />
          <StatCard
            title={t("portfolio.stats.totalEarnings")}
            value={userStats?.total_earnings || 0}
            prefix={<TrendingUp className="h-5 w-5" />}
            valueClassName="text-green-400"
          />
          <StatCard
            title={t("portfolio.stats.activeInvestments")}
            value={userStats?.active_subscriptions || 0}
            precision={0}
            prefix={<Clock className="h-5 w-5" />}
          />
        </div>

        {/* Main Content Tabs */}
        <Card>
          <CardContent className="p-6">
            <Tabs defaultValue="investments">
              <TabsList className="mb-4">
                <TabsTrigger value="investments" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  {t("portfolio.tabs.investments")}
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  {t("portfolio.tabs.history")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="investments">
                {isLoadingSubscriptions ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : subscriptions.length > 0 ? (
                  <DataTable
                    columns={subscriptionColumns}
                    data={subscriptions}
                    emptyMessage={t("portfolio.noInvestments")}
                  />
                ) : (
                  <EmptyState message={t("portfolio.noInvestments")} />
                )}
              </TabsContent>

              <TabsContent value="history">
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <Select
                      value={txTypeFilter}
                      onValueChange={(value) => setTxTypeFilter(value === "all" ? undefined : value)}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder={t("portfolio.filterByType")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部类型</SelectItem>
                        {Object.entries(TRANSACTION_TYPE_NAMES).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={handleExport}>
                      <Download className="h-4 w-4 mr-2" />
                      {t("portfolio.export")}
                    </Button>
                  </div>

                  {isLoadingTx ? (
                    <div className="space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : transactions.length > 0 ? (
                    <DataTable
                      columns={transactionColumns}
                      data={transactions}
                      pagination={{
                        pageIndex: txPagination.page - 1,
                        pageSize: txPagination.pageSize,
                        pageCount: Math.ceil(txPagination.total / txPagination.pageSize),
                        onPageChange: (page) => fetchTransactions(page + 1),
                        onPageSizeChange: (size) => {
                          setTxPagination((prev) => ({ ...prev, pageSize: size }));
                        },
                      }}
                      emptyMessage={t("portfolio.noTransactions")}
                    />
                  ) : (
                    <EmptyState message={t("portfolio.noTransactions")} />
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Subscription Detail Modal */}
        <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
          <DialogContent className="max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                {t("portfolio.subscriptionDetail")}
              </DialogTitle>
            </DialogHeader>

            {selectedSubscription && (
              <div className="flex flex-col gap-6">
                {/* 资产信息 */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{t("portfolio.detail.assetInfo")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("portfolio.detail.assetName")}
                      </span>
                      <span className="font-semibold">{selectedSubscription.asset_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("portfolio.detail.symbol")}
                      </span>
                      <span>{selectedSubscription.asset_symbol}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* 投资信息 */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{t("portfolio.detail.investmentInfo")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("portfolio.detail.amount")}
                      </span>
                      <span className="font-semibold text-primary">
                        ${selectedSubscription.amount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("portfolio.detail.tokenType")}
                      </span>
                      <Badge variant="outline">{selectedSubscription.token_type}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("portfolio.detail.lockPeriod")}
                      </span>
                      <span>
                        {selectedSubscription.lock_period} {t("common.months")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("portfolio.detail.apy")}
                      </span>
                      <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                        {selectedSubscription.apy}%
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* 收益信息 */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{t("portfolio.detail.earningsInfo")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("portfolio.detail.expectedInterest")}
                      </span>
                      <span className="text-green-400">
                        +${selectedSubscription.expected_interest.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("portfolio.detail.totalReturn")}
                      </span>
                      <span className="font-semibold text-yellow-400">
                        ${selectedSubscription.total_return.toLocaleString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* 时间信息 */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{t("portfolio.detail.timeInfo")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("portfolio.detail.startDate")}
                      </span>
                      <span>
                        {selectedSubscription.start_date
                          ? new Date(selectedSubscription.start_date).toLocaleDateString()
                          : "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("portfolio.detail.endDate")}
                      </span>
                      <span>
                        {selectedSubscription.end_date
                          ? new Date(selectedSubscription.end_date).toLocaleDateString()
                          : "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("portfolio.detail.daysRemaining")}
                      </span>
                      <span>
                        {selectedSubscription.days_remaining > 0
                          ? selectedSubscription.days_remaining
                          : t("portfolio.matured")}
                      </span>
                    </div>
                    <Progress
                      value={Math.max(
                        0,
                        100 -
                          (selectedSubscription.days_remaining /
                            (selectedSubscription.lock_period * 30)) *
                            100
                      )}
                      indicatorColor="#00D4AA"
                      showInfo
                      format={(percent) =>
                        selectedSubscription.is_matured ? (
                          <CheckCircle className="h-4 w-4 text-green-400" />
                        ) : (
                          `${Math.round(percent)}%`
                        )
                      }
                    />
                  </CardContent>
                </Card>

                {/* 状态 */}
                <div className="flex justify-center">
                  <Badge
                    className={cn(
                      "text-sm px-4 py-1",
                      selectedSubscription.status === "redeemed"
                        ? "bg-gray-500/20 text-gray-400"
                        : selectedSubscription.is_matured
                        ? "bg-green-500/20 text-green-400"
                        : "bg-blue-500/20 text-blue-400"
                    )}
                  >
                    {t(`portfolio.status.${selectedSubscription.status}`)}
                  </Badge>
                </div>
              </div>
            )}

            {selectedSubscription?.is_matured &&
              selectedSubscription?.status !== "redeemed" && (
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDetailModalOpen(false)}>
                    {t("common.cancel")}
                  </Button>
                  <Button onClick={handleRedeem} disabled={isRedeeming}>
                    {isRedeeming ? "处理中..." : t("portfolio.redeem")}
                  </Button>
                </DialogFooter>
              )}
          </DialogContent>
        </Dialog>
      </div>
    </RequireWallet>
  );
}
