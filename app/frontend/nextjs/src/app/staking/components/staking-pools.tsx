"use client";

import {
  Rocket,
  Clock,
  Trophy,
  Gift,
  Flame,
  Info,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { StakingStatsResponse, StakingLimitResponse } from "@/types/staking";

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

// Alert 组件 (exported for reuse in other staking components)
export function AlertBox({
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

interface StakingPoolsProps {
  stats: StakingStatsResponse | null;
  limit: StakingLimitResponse | null;
}

export function StakingPools({ stats, limit }: StakingPoolsProps) {
  const { t } = useTranslation();

  return (
    <>
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
    </>
  );
}
