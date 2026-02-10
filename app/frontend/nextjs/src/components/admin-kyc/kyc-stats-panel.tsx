"use client";

/**
 * KYC Stats Panel - Bento Grid Design
 * KYC 统计面板 - Bento 网格设计
 * 
 * 采用 Apple 风格的 Bento Grid 布局，清晰的信息层级
 * Primary > Secondary > Metrics 三层结构
 */

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Clock,
  CheckCircle,
  XCircle,
  Warning,
  Timer,
  ChartLineUp,
  Shield,
  TrendUp,
  TrendDown,
} from "@phosphor-icons/react";
import type { KycStats, RiskLevel } from "@/services/admin-kyc";

interface KycStatsPanelProps {
  stats: KycStats | null;
  isLoading?: boolean;
}

// 风险等级配置
const RISK_CONFIG: Record<RiskLevel, { color: string; labelKey: string; bgColor: string; barColor: string }> = {
  low: { 
    color: "text-emerald-400", 
    labelKey: "admin.kyc.stats.riskLow", 
    bgColor: "bg-emerald-500/10",
    barColor: "bg-emerald-500"
  },
  medium: { 
    color: "text-yellow-400", 
    labelKey: "admin.kyc.stats.riskMedium", 
    bgColor: "bg-yellow-500/10",
    barColor: "bg-yellow-500"
  },
  high: { 
    color: "text-orange-400", 
    labelKey: "admin.kyc.stats.riskHigh", 
    bgColor: "bg-orange-500/10",
    barColor: "bg-orange-500"
  },
  critical: { 
    color: "text-red-400", 
    labelKey: "admin.kyc.stats.riskCritical", 
    bgColor: "bg-red-500/10",
    barColor: "bg-red-500"
  },
};

// 状态配置 - 使用 Phosphor Icons Fill 版本
const STATUS_CONFIG = {
  approved: { color: "text-emerald-400", bgColor: "bg-emerald-500/10", icon: CheckCircle, labelKey: "admin.kyc.stats.approved" },
  rejected: { color: "text-red-400", bgColor: "bg-red-500/10", icon: XCircle, labelKey: "admin.kyc.stats.rejected" },
  failed: { color: "text-yellow-400", bgColor: "bg-yellow-500/10", icon: Warning, labelKey: "admin.kyc.stats.syncFailed" },
};

// 玻璃态卡片基础样式
const glassCardBase = "bg-[#0d1117]/60 border border-white/[0.08] rounded-2xl backdrop-blur-sm";
const glassCardHover = "hover:border-white/[0.15] hover:bg-[#0d1117]/80 transition-all duration-300";

// ==================== Skeleton Loading ====================

function StatsSkeleton() {
  return (
    <div className="space-y-4">
      {/* Top Row Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Primary Card Skeleton */}
        <div className={`${glassCardBase} p-6 lg:col-span-1 h-32`}>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-white/10 rounded w-24" />
            <div className="h-10 bg-white/10 rounded w-16" />
          </div>
        </div>
        {/* Secondary Cards Skeleton */}
        <div className="lg:col-span-2 grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className={`${glassCardBase} p-4 h-32`}>
              <div className="animate-pulse space-y-2">
                <div className="h-8 bg-white/10 rounded w-8" />
                <div className="h-6 bg-white/10 rounded w-12" />
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Bottom Row Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className={`${glassCardBase} p-5 h-40`}>
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-white/10 rounded w-24" />
              <div className="h-2 bg-white/10 rounded w-full" />
              <div className="h-2 bg-white/10 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== Primary Card ====================

function PrimaryStatCard({ 
  value, 
  trend, 
  trendValue,
  delay = 0 
}: { 
  value: number; 
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  delay?: number;
}) {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`${glassCardBase} ${glassCardHover} p-6 relative overflow-hidden group`}
    >
      {/* 背景光晕效果 */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/15 transition-all duration-500" />
      
      <div className="relative z-10">
        {/* 标题行 */}
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Clock weight="fill" className="w-5 h-5 text-blue-400" />
          </div>
          <span className="text-sm font-medium text-white/60">{t("admin.kyc.stats.pendingApplications")}</span>
        </div>
        
        {/* 数字 */}
        <div className="flex items-baseline gap-3">
          <span className="text-5xl font-bold text-white tracking-tight">
            {value.toLocaleString()}
          </span>
        </div>
        
        {/* 趋势 */}
        {trend && trendValue && (
          <div className="flex items-center gap-1.5 mt-3">
            {trend === "up" ? (
              <TrendUp weight="bold" className="w-4 h-4 text-emerald-400" />
            ) : trend === "down" ? (
              <TrendDown weight="bold" className="w-4 h-4 text-red-400" />
            ) : null}
            <span className={`text-sm ${trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-white/40"}`}>
              {trendValue}
            </span>
          </div>
        )}
      </div>
      
      {/* 底部装饰线 */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500/50 via-blue-400/30 to-transparent" />
    </motion.div>
  );
}

// ==================== Secondary Cards ====================

function SecondaryStatCard({
  type,
  value,
  delay = 0,
}: {
  type: "approved" | "rejected" | "failed";
  value: number;
  delay?: number;
}) {
  const { t } = useTranslation();
  const config = STATUS_CONFIG[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`${glassCardBase} ${glassCardHover} p-5 flex flex-col justify-between group cursor-pointer`}
    >
      {/* 顶部：图标 + 标签 */}
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-xl ${config.bgColor} group-hover:scale-110 transition-transform duration-300`}>
          <Icon weight="fill" className={`w-5 h-5 ${config.color}`} />
        </div>
      </div>
      
      {/* 底部：数字 + 标签 */}
      <div>
        <div className={`text-3xl font-bold ${config.color} mb-1`}>
          {value.toLocaleString()}
        </div>
        <div className="text-xs text-white/40 font-medium">
          {t(config.labelKey)}
        </div>
      </div>
    </motion.div>
  );
}

// ==================== Processing Time Card ====================

function ProcessingTimeCard({
  avgTime,
  medianTime,
  delay = 0,
}: {
  avgTime: number;
  medianTime: number;
  delay?: number;
}) {
  const { t } = useTranslation();
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const progressWidth = Math.min((avgTime / 120) * 100, 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`${glassCardBase} ${glassCardHover} p-5`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <div className="p-1.5 rounded-lg bg-cyan-500/10">
          <Timer weight="fill" className="w-4 h-4 text-cyan-400" />
        </div>
        <span className="text-sm font-medium text-white/70">{t("admin.kyc.stats.avgProcessingTime")}</span>
      </div>

      {/* 主要内容 */}
      <div className="flex items-end gap-2 mb-4">
        <span className="text-3xl font-bold text-white">{formatTime(avgTime)}</span>
        <span className="text-sm text-white/40 mb-1">{t("admin.kyc.stats.average")}</span>
      </div>

      {/* 进度条 */}
      <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-3">
        <motion.div
          className="h-full bg-gradient-to-r from-cyan-500 to-blue-400 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progressWidth}%` }}
          transition={{ duration: 1, delay: 0.5 }}
        />
      </div>

      {/* 中位数 */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/40">{t("admin.kyc.stats.median")}</span>
        <span className="text-white/60 font-medium">{formatTime(medianTime)}</span>
      </div>
    </motion.div>
  );
}

// ==================== Conversion Card ====================

function ConversionCard({
  approvalRate,
  resubmitRate,
  delay = 0,
}: {
  approvalRate: number;
  resubmitRate: number;
  delay?: number;
}) {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`${glassCardBase} ${glassCardHover} p-5`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <div className="p-1.5 rounded-lg bg-emerald-500/10">
          <ChartLineUp weight="fill" className="w-4 h-4 text-emerald-400" />
        </div>
        <span className="text-sm font-medium text-white/70">{t("admin.kyc.stats.conversionRate")}</span>
      </div>

      {/* 通过率 */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-white/40">{t("admin.kyc.stats.approvalRate")}</span>
          <span className="text-sm font-semibold text-emerald-400">{approvalRate.toFixed(1)}%</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-emerald-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${approvalRate}%` }}
            transition={{ duration: 1, delay: 0.3 }}
          />
        </div>
      </div>

      {/* 重新提交率 */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-white/40">{t("admin.kyc.stats.resubmitRate")}</span>
          <span className="text-sm font-semibold text-yellow-400">{resubmitRate.toFixed(1)}%</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-yellow-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${resubmitRate}%` }}
            transition={{ duration: 1, delay: 0.4 }}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ==================== Risk Distribution Card ====================

function RiskDistributionCard({
  distribution,
  delay = 0,
}: {
  distribution: Record<RiskLevel, number>;
  delay?: number;
}) {
  const { t } = useTranslation();
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  
  // 过滤掉数量为0的风险等级，减少视觉噪音
  const activeRisks = (Object.entries(distribution) as [RiskLevel, number][])
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a); // 按数量降序排列

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`${glassCardBase} ${glassCardHover} p-5`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/10">
            <Shield weight="fill" className="w-4 h-4 text-purple-400" />
          </div>
          <span className="text-sm font-medium text-white/70">{t("admin.kyc.stats.riskDistribution")}</span>
        </div>
        <span className="text-xs text-white/30">{total} {t("admin.kyc.stats.unit")}</span>
      </div>

      {/* Risk List */}
      <div className="space-y-2.5">
        {(Object.entries(distribution) as [RiskLevel, number][]).map(([level, count], index) => {
          const config = RISK_CONFIG[level];
          const percentage = total > 0 ? (count / total) * 100 : 0;
          
          return (
            <div key={level} className="group">
              <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${config.barColor}`} />
                  <span className="text-xs text-white/50 group-hover:text-white/70 transition-colors">
                    {t(config.labelKey)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-white">{count}</span>
                  <span className="text-xs text-white/30 w-10 text-right">{percentage.toFixed(0)}%</span>
                </div>
              </div>
              <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                <motion.div
                  className={`h-full ${config.barColor} rounded-full`}
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.8, delay: 0.2 + index * 0.1 }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ==================== Main Component ====================

export function KycStatsPanel({ stats, isLoading }: KycStatsPanelProps) {
  if (isLoading || !stats) {
    return <StatsSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Top Row: Primary + Secondary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Primary Card - 待审核 */}
        <PrimaryStatCard
          value={stats.pending}
          delay={0}
        />
        
        {/* Secondary Cards - 状态统计 */}
        <div className="lg:col-span-2 grid grid-cols-3 gap-3">
          <SecondaryStatCard
            type="approved"
            value={stats.approved}
            delay={0.1}
          />
          <SecondaryStatCard
            type="rejected"
            value={stats.rejected}
            delay={0.15}
          />
          <SecondaryStatCard
            type="failed"
            value={stats.failed_sync}
            delay={0.2}
          />
        </div>
      </div>

      {/* Bottom Row: Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ProcessingTimeCard
          avgTime={stats.avg_processing_time_minutes}
          medianTime={stats.median_processing_time_minutes}
          delay={0.3}
        />
        <ConversionCard
          approvalRate={stats.approval_rate}
          resubmitRate={stats.resubmit_rate}
          delay={0.35}
        />
        <RiskDistributionCard
          distribution={stats.risk_distribution}
          delay={0.4}
        />
      </div>
    </div>
  );
}

export default KycStatsPanel;
