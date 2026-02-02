"use client";

import { useTranslation } from "react-i18next";
import { Users, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RecentInvestor } from "@/services/asset";

interface InvestorStatsProps {
  investorCount: number;
  recentInvestors: RecentInvestor[] | null;
  className?: string;
}

// 生成头像渐变颜色
function getAvatarColor(address: string): string {
  const colors = [
    "from-blue-500 to-blue-600",
    "from-purple-500 to-purple-600",
    "from-emerald-500 to-emerald-600",
    "from-orange-500 to-orange-600",
    "from-pink-500 to-pink-600",
    "from-cyan-500 to-cyan-600",
  ];
  const index = address.charCodeAt(2) % colors.length;
  return colors[index];
}

// 缩短钱包地址
function shortenAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

// 生成头像URL
function getAvatarUrl(address: string): string {
  return `https://api.dicebear.com/7.x/identicon/svg?seed=${address}&backgroundColor=transparent`;
}

export function InvestorStats({
  investorCount,
  recentInvestors,
  className = "",
}: InvestorStatsProps) {
  const { t } = useTranslation();

  // 只显示前3个最近投资者
  const displayInvestors = recentInvestors?.slice(0, 3) || [];
  const remainingCount = Math.max(0, investorCount - displayInvestors.length);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-white/[0.08] p-4",
        "bg-gradient-to-br from-white/[0.05] to-white/[0.02]",
        className
      )}
    >
      {/* 装饰背景 */}
      <div className="absolute -top-10 -right-10 w-20 h-20 bg-[#00D4AA]/5 rounded-full blur-2xl" />

      <div className="relative flex items-center gap-4">
        {/* 投资者数量 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#00D4AA]/10 text-[#00D4AA]">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-white">{investorCount}</span>
              {investorCount > 100 && (
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              )}
            </div>
            <span className="text-white/40 text-xs">{t("assets.investorStats.participants")}</span>
          </div>
        </div>

        {/* 分隔线 */}
        <div className="w-px h-10 bg-white/10" />

        {/* 最近投资者头像 */}
        <div className="flex items-center gap-3">
          <span className="text-white/40 text-xs">{t("assets.investorStats.recent")}</span>
          
          <div className="flex items-center">
            {/* 头像堆叠 */}
            <div className="flex -space-x-2">
              {displayInvestors.map((investor, index) => (
                <div
                  key={investor.wallet_address}
                  className={cn(
                    "relative w-8 h-8 rounded-full border-2 border-[#0a0f0d] overflow-hidden",
                    "transition-transform duration-200 hover:scale-110 hover:z-10 cursor-pointer",
                    "bg-gradient-to-br",
                    getAvatarColor(investor.wallet_address)
                  )}
                  style={{ zIndex: displayInvestors.length - index }}
                  title={`${shortenAddress(investor.wallet_address)} · $${investor.amount.toLocaleString()}`}
                >
                  <img
                    src={getAvatarUrl(investor.wallet_address)}
                    alt={investor.wallet_address}
                    className="w-full h-full object-cover opacity-80"
                  />
                </div>
              ))}
            </div>

            {/* 更多投资者 */}
            {remainingCount > 0 && (
              <div
                className={cn(
                  "ml-1 flex items-center justify-center w-8 h-8 rounded-full",
                  "bg-white/10 text-white/60 text-[10px] font-medium",
                  "border-2 border-[#0a0f0d]"
                )}
                title={t("assets.investorStats.more", { count: remainingCount })}
              >
                +{remainingCount > 99 ? "99" : remainingCount}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 底部激励文字 */}
      {investorCount > 0 && (
        <div className="mt-3 pt-3 border-t border-white/[0.06]">
          <p className="text-white/40 text-xs text-center">
            {t("assets.investorStats.joinOthers", { count: investorCount })}
          </p>
        </div>
      )}
    </div>
  );
}
