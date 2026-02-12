"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { useTranslation } from "react-i18next";

import { RequireKyc } from "@/components/auth";
import { subscriptionService } from "@/services/subscription";
import type { SubscriptionItem } from "@/types/subscription";
import { stakingService } from "@/services/staking";
import type {
  StakingResponse,
  StakingLimitResponse,
  StakingStatsResponse,
  StakingStatus,
} from "@/types/staking";
import { notification } from "@/lib/notification";

import { StakingPools } from "./components/staking-pools";
import { StakeForm } from "./components/stake-form";
import { RewardsPanel } from "./components/rewards-panel";
import { StakingHistory } from "./components/staking-history";

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

  // 筛选状态
  const [statusFilter, setStatusFilter] = useState<string>("all");

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
              ...(statusFilter !== "all" && { status: statusFilter as StakingStatus }),
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
          {/* 统计卡片 + 今日限额 */}
          <StakingPools stats={stats} limit={limit} />

          {/* 新建质押表单 */}
          <StakeForm
            loading={loading}
            subscriptions={subscriptions}
            limit={limit}
            onStakeSuccess={loadData}
          />

          {/* 质押历史列表 */}
          <StakingHistory
            loading={loading}
            stakings={stakings}
            pagination={pagination}
            statusFilter={statusFilter}
            onStatusFilterChange={(value) => {
              setStatusFilter(value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            onPageChange={(page) =>
              setPagination((prev) => ({ ...prev, page }))
            }
            onPageSizeChange={(size) =>
              setPagination((prev) => ({ ...prev, pageSize: size }))
            }
            onDataRefresh={loadData}
          />

          {/* PLT 代币信息 + 使用说明 */}
          <RewardsPanel />
        </div>
      </div>
    </RequireKyc>
  );
}
