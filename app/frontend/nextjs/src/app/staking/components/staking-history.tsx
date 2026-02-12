"use client";

import { useState, useMemo } from "react";
import { Gift, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useChainId } from "wagmi";
import { ColumnDef } from "@tanstack/react-table";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DataTable } from "@/components/ui/data-table";
import { cn, getExplorerUrl } from "@/lib/utils";
import { notification } from "@/lib/notification";
import { EmptyState } from "@/components/ui/empty-state";
import { stakingService } from "@/services/staking";
import type { StakingResponse } from "@/types/staking";
import { AlertBox } from "./staking-pools";

interface StakingHistoryProps {
  loading: boolean;
  stakings: StakingResponse[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onDataRefresh: () => void;
}

export function StakingHistory({
  loading,
  stakings,
  pagination,
  statusFilter,
  onStatusFilterChange,
  onPageChange,
  onPageSizeChange,
  onDataRefresh,
}: StakingHistoryProps) {
  const { t } = useTranslation();
  const chainId = useChainId();
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedStaking, setSelectedStaking] =
    useState<StakingResponse | null>(null);
  const [unstakeModalVisible, setUnstakeModalVisible] = useState(false);

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
      onDataRefresh();
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
      onDataRefresh();
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
    <>
      {/* 质押列表 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("staking.list.title")}</CardTitle>
          <Tabs
            value={statusFilter}
            onValueChange={onStatusFilterChange}
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
                onPageChange: (page) => onPageChange(page + 1),
                onPageSizeChange: onPageSizeChange,
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
                        href={getExplorerUrl(chainId, 'tx', selectedStaking.stake_tx_hash) || '#'}
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
                {...(!selectedStaking.is_matured
                  ? {
                      description: t("staking.unstake.warningEarly", {
                        percent: Math.round(
                          (selectedStaking.days_remaining /
                            selectedStaking.period) *
                            100
                        ),
                      }),
                    }
                  : {})}
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
    </>
  );
}
