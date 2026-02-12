"use client";

import { useEffect, useState } from "react";
import { DollarSign, PieChart, Info, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { stakingService } from "@/services/staking";
import type { PLTTokenInfoResponse } from "@/types/staking";

export function RewardsPanel() {
  const { t } = useTranslation();
  const [pltInfo, setPltInfo] = useState<PLTTokenInfoResponse | null>(null);

  // 加载 PLT 代币信息（不需要钱包连接）
  useEffect(() => {
    stakingService.getPLTTokenInfo().then(setPltInfo).catch(console.error);
  }, []);

  if (!pltInfo) return null;

  return (
    <>
      {/* PLT 代币信息 */}
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
    </>
  );
}
