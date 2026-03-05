"use client";

import { Zap } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { notification } from "@/lib/notification";
import { cn } from "@/lib/utils";
import { stakingService, STAKING_PERIODS } from "@/services/staking";
import type { StakingLimitResponse } from "@/types/staking";
import type { SubscriptionItem } from "@/types/subscription";

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

interface StakeFormProps {
  loading: boolean;
  subscriptions: SubscriptionItem[];
  limit: StakingLimitResponse | null;
  onStakeSuccess: () => void;
}

export function StakeForm({
  loading,
  subscriptions,
  limit,
  onStakeSuccess,
}: StakeFormProps) {
  const { t } = useTranslation();

  // 质押表单状态
  const [selectedSubscription, setSelectedSubscription] = useState<
    string | null
  >(null);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(30);
  const [stakeAmount, setStakeAmount] = useState<number>(0);
  const [staking, setStaking] = useState(false);

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
      onStakeSuccess();
    } catch (error) {
      console.error("Stake failed:", error);
      notification.error(t("staking.stake.failed"));
    } finally {
      setStaking(false);
    }
  };

  return (
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
                    <Link href="/assets">{t("staking.stake.goToAssets")}</Link>
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
  );
}
