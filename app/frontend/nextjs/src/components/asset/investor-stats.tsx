"use client";

import { useTranslation } from "react-i18next";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RecentInvestor } from "@/services/asset";

interface InvestorStatsProps {
  investorCount: number;
  recentInvestors: RecentInvestor[] | null;
  className?: string;
}

// 生成头像背景色 - 使用更和谐的配色
function getAvatarGradient(address: string): string {
  const gradients = [
    "from-emerald-400 to-teal-500",
    "from-blue-400 to-indigo-500",
    "from-violet-400 to-purple-500",
    "from-amber-400 to-orange-500",
    "from-rose-400 to-pink-500",
  ];
  const index = address.charCodeAt(2) % gradients.length;
  return gradients[index];
}

// 生成头像首字母
function getInitial(address: string): string {
  return address.slice(2, 3).toUpperCase();
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
        "flex items-center justify-between py-2.5 px-4 rounded-xl",
        "bg-gradient-to-r from-white/[0.03] to-white/[0.02]",
        "border border-white/[0.06]",
        className
      )}
    >
      {/* 左侧：投资者数量 */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#00D4AA]/10">
          <Users className="h-4 w-4 text-[#00D4AA]" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-semibold text-white tabular-nums">
            {investorCount.toLocaleString()}
          </span>
          <span className="text-xs text-white/40">
            {t("assets.investorStats.investors")}
          </span>
        </div>
      </div>

      {/* 右侧：头像堆叠 */}
      <div className="flex items-center gap-2">
        <div className="flex -space-x-1.5">
          {displayInvestors.map((investor, index) => (
            <div
              key={investor.wallet_address}
              className={cn(
                "relative w-6 h-6 rounded-full flex items-center justify-center",
                "bg-gradient-to-br",
                "ring-2 ring-[#0a0f0d]",
                "text-[9px] font-bold text-white/90",
                getAvatarGradient(investor.wallet_address),
                "hover:scale-110 hover:z-10 transition-transform duration-200 cursor-pointer"
              )}
              style={{ zIndex: displayInvestors.length - index }}
              title={`${investor.wallet_address.slice(0, 6)}...${investor.wallet_address.slice(-4)}`}
            >
              {getInitial(investor.wallet_address)}
            </div>
          ))}
        </div>

        {/* 更多投资者 */}
        {remainingCount > 0 && (
          <div
            className={cn(
              "flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full",
              "bg-white/[0.05] text-white/50 text-[10px] font-medium"
            )}
          >
            +{remainingCount > 99 ? "99" : remainingCount}
          </div>
        )}
      </div>
    </div>
  );
}
