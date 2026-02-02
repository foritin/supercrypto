"use client";

import { useTranslation } from "react-i18next";
import { Wallet, TrendingUp, Clock, CheckCircle, PauseCircle, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressEnhanced } from "@/components/ui/progress-enhanced";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { CountdownTimer } from "./countdown-timer";
import { InvestorStats } from "./investor-stats";
import type { AssetDetail, AssetStatus } from "@/services/asset";

interface InvestPanelProps {
  asset: AssetDetail;
  isConnected: boolean;
  isKycApproved: boolean;
  onSubscribe: () => void;
  onGoToKyc: () => void;
}

// 状态徽章组件
function StatusBadge({ 
  status, 
  progress,
  t 
}: { 
  status: AssetStatus; 
  progress: number;
  t: (key: string) => string;
}) {
  const getStatusConfig = () => {
    switch (status) {
      case "active":
        if (progress >= 90) {
          return {
            icon: <Flame className="h-3.5 w-3.5" />,
            text: t("assets.invest.statusBadge.sellingFast"),
            className: "bg-gradient-to-r from-orange-500 to-red-500 text-white",
          };
        }
        return {
          icon: <TrendingUp className="h-3.5 w-3.5" />,
          text: t("assets.invest.statusBadge.active"),
          className: "bg-gradient-to-r from-[#00D4AA] to-[#00B894] text-black",
        };
      case "paused":
        return {
          icon: <PauseCircle className="h-3.5 w-3.5" />,
          text: t("assets.invest.statusBadge.paused"),
          className: "bg-gradient-to-r from-yellow-500 to-orange-500 text-white",
        };
      case "sold_out":
        return {
          icon: <CheckCircle className="h-3.5 w-3.5" />,
          text: t("assets.invest.statusBadge.soldOut"),
          className: "bg-gradient-to-r from-gray-500 to-gray-600 text-white",
        };
      case "closed":
        return {
          icon: <Clock className="h-3.5 w-3.5" />,
          text: t("assets.invest.statusBadge.closed"),
          className: "bg-gradient-to-r from-gray-600 to-gray-700 text-white",
        };
      default:
        return {
          icon: <TrendingUp className="h-3.5 w-3.5" />,
          text: t("assets.invest.statusBadge.available"),
          className: "bg-gradient-to-r from-[#00D4AA] to-[#00B894] text-black",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg ${config.className}`}
    >
      {config.icon}
      <span>{config.text}</span>
    </div>
  );
}

// 数据卡片组件
function StatCard({
  label,
  value,
  format,
  highlight = false,
}: {
  label: string;
  value: number;
  format: "usd" | "percentage" | "usd-short";
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col items-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors">
      <span className={`text-lg font-bold ${highlight ? "text-[#00D4AA]" : "text-white"}`}>
        <AnimatedNumber value={value} format={format} duration={1200} className={highlight ? "text-[#00D4AA]" : ""} />
      </span>
      <span className="text-white/40 text-[10px] uppercase mt-1">{label}</span>
    </div>
  );
}

// 主组件
export function InvestPanel({
  asset,
  isConnected,
  isKycApproved,
  onSubscribe,
  onGoToKyc,
}: InvestPanelProps) {
  const { t } = useTranslation();
  const progress = (asset.subscribed_amount / asset.total_supply) * 100;

  // 获取按钮状态
  const getButtonState = () => {
    if (!isConnected) {
      return {
        text: t("assets.invest.connectWallet"),
        disabled: true,
        hint: t("assets.invest.connectWalletHint"),
      };
    }
    if (!isKycApproved) {
      return {
        text: t("assets.invest.completeKyc"),
        disabled: false,
        hint: null,
        action: onGoToKyc,
      };
    }
    if (asset.status !== "active") {
      return {
        text: t("assets.invest.notAvailable"),
        disabled: true,
        hint: t("assets.invest.notAvailableHint"),
      };
    }
    return {
      text: t("assets.invest.subscribeNow"),
      disabled: false,
      hint: null,
      action: onSubscribe,
    };
  };

  const buttonState = getButtonState();

  return (
    <div className="relative bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/[0.08] rounded-2xl p-6 overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00D4AA]/30 to-transparent" />
      
      {/* 投资状态徽章 */}
      <div className="flex justify-center mb-4">
        <StatusBadge status={asset.status as AssetStatus} progress={progress} t={t} />
      </div>

      {/* 倒计时 - 创建紧迫感 */}
      {/* 注意：当后端添加 subscription_start_time 和 subscription_end_time 字段后，
          取消下面的注释并传入实际时间 */}
      {/*
      <div className="mb-5">
        <CountdownTimer
          startTime={asset.subscription_start_time}
          endTime={asset.subscription_end_time}
        />
      </div>
      */}
      
      {/* 演示模式：模拟倒计时效果 */}
      {asset.status === "active" && (
        <div className="mb-5">
          <CountdownTimer
            endTime={new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000)}
          />
        </div>
      )}

      {/* 目标金额 - 主视觉 */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-full">
          <span className="text-[40px] sm:text-[48px] font-bold text-white tracking-tight leading-none">
            <AnimatedNumber 
              value={asset.total_supply} 
              format="usd-short" 
              duration={1500}
              className="font-bold"
            />
          </span>
        </div>
        <span className="text-white/40 text-xs uppercase tracking-wider mt-2 block">
          {t("assets.invest.totalInvestment")}
        </span>
      </div>

      {/* 进度条区域 */}
      <div className="mb-6">
        <div className="flex justify-between items-end mb-2">
          <div>
            <span className="text-white/40 text-xs uppercase">{t("assets.invest.subscribed")}</span>
            <div className="text-white font-semibold text-lg">
              <AnimatedNumber 
                value={asset.subscribed_amount} 
                format="usd-short" 
                duration={1500}
              />
            </div>
          </div>
          <div className="text-right">
            <span className="text-[#00D4AA]/60 text-xs uppercase">{t("assets.invest.remaining")}</span>
            <div className="text-[#00D4AA] font-semibold text-lg">
              <AnimatedNumber 
                value={asset.remaining_amount} 
                format="usd-short" 
                duration={1500}
                className="text-[#00D4AA]"
              />
            </div>
          </div>
        </div>
        
        {/* 进度条 - 带动态效果 */}
        <div className="relative">
          <ProgressEnhanced 
            value={progress} 
            indicatorColor="#00D4AA" 
            className="h-3 bg-white/5"
            animated={true}
            pulse={progress >= 90 && progress < 100}
          />
          {/* 进度百分比标签 */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <span className="text-[10px] font-bold text-white/80 bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
              {progress.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* 投资者统计 - 社交证明 */}
      <div className="mb-5">
        <InvestorStats 
          investorCount={asset.investor_count || 247}
          recentInvestors={asset.recent_investors || [
            { wallet_address: "0x742d35Cc6634C0532925a3b8D4C9db96590f6C7E", amount: 50000, invested_at: "2024-01-15T10:30:00Z" },
            { wallet_address: "0x8ba1f109551bD432803012645Hac136c82C3e8C", amount: 25000, invested_at: "2024-01-14T15:20:00Z" },
            { wallet_address: "0x3f5CE5FBFe3E9af3971dD833A7D3C8B2d8E15E0D", amount: 100000, invested_at: "2024-01-13T09:45:00Z" },
          ]}
        />
      </div>

      {/* 关键数据网格 */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard 
          label={t("assets.financials.expectedReturn")} 
          value={asset.apy_12m} 
          format="percentage" 
          highlight 
        />
        <StatCard 
          label={t("assets.financials.tokenPrice")} 
          value={asset.current_price} 
          format="usd" 
        />
      </div>

      {/* 认购按钮 */}
      <Button
        size="lg"
        className={`w-full h-[52px] text-base font-semibold rounded-xl transition-all duration-300 ${
          buttonState.disabled
            ? "bg-white/10 text-white/40 cursor-not-allowed"
            : "bg-[#00D4AA] hover:bg-[#00D4AA]/90 text-black hover:shadow-lg hover:shadow-[#00D4AA]/20"
        }`}
        disabled={buttonState.disabled}
        onClick={buttonState.action}
      >
        <Wallet className="h-5 w-5 mr-2" />
        {buttonState.text}
      </Button>

      {/* 提示信息 */}
      {buttonState.hint && (
        <p className="text-center mt-3 text-sm text-white/40">
          {buttonState.hint}
        </p>
      )}
      
      {isConnected && !isKycApproved && (
        <p className="text-center mt-3 text-sm text-white/40">
          <Button
            variant="link"
            className="text-[#00D4AA] p-0 h-auto hover:underline"
            onClick={onGoToKyc}
          >
            {t("assets.invest.completeKyc")}
          </Button>
          {" "}{t("assets.invest.toInvest")}
        </p>
      )}

      {/* 装饰性光晕 */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#00D4AA]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-[#00D4AA]/3 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
}
