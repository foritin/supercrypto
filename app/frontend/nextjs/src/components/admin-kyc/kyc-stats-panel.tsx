"use client";

/**
 * KYC Stats Panel - Enhanced Statistics Dashboard
 * KYC 统计面板 - 增强版统计仪表板
 */

import { motion } from "framer-motion";
import {
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Timer,
  Shield,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { EnhancedKycStats, RiskLevel } from "@/services/admin-kyc";

interface KycStatsPanelProps {
  stats: EnhancedKycStats | null;
  isLoading?: boolean;
}

// 风险等级配置
const RISK_CONFIG: Record<RiskLevel, { color: string; label: string; bgColor: string }> = {
  low: { color: "text-emerald-400", label: "低风险", bgColor: "bg-emerald-500/20" },
  medium: { color: "text-yellow-400", label: "中风险", bgColor: "bg-yellow-500/20" },
  high: { color: "text-orange-400", label: "高风险", bgColor: "bg-orange-500/20" },
  critical: { color: "text-red-400", label: "极高风险", bgColor: "bg-red-500/20" },
};

// 统计卡片组件
function StatCard({
  title,
  value,
  suffix,
  icon: Icon,
  trend,
  trendValue,
  color,
  delay = 0,
}: {
  title: string;
  value: number;
  suffix?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  color: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <Card className="bg-[#0d1117]/80 border-white/10 backdrop-blur-sm overflow-hidden relative">
        {/* 渐变背景 */}
        <div className={`absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 ${color.replace("text-", "bg-")}`} />
        
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-white/50">{title}</p>
              <div className="flex items-baseline gap-1 mt-2">
                <span className={`text-3xl font-bold ${color}`}>
                  {value.toLocaleString()}
                </span>
                {suffix && <span className="text-sm text-white/40">{suffix}</span>}
              </div>
              {trend && trendValue && (
                <div className="flex items-center gap-1 mt-2">
                  {trend === "up" ? (
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                  ) : trend === "down" ? (
                    <TrendingDown className="w-3 h-3 text-red-400" />
                  ) : null}
                  <span className={`text-xs ${trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-white/40"}`}>
                    {trendValue}
                  </span>
                </div>
              )}
            </div>
            <div className={`p-3 rounded-xl ${color.replace("text-", "bg-")}/10`}>
              <Icon className={`w-6 h-6 ${color}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// 处理时间卡片
function ProcessingTimeCard({
  avgTime,
  medianTime,
  delay = 0,
}: {
  avgTime: number;
  medianTime: number;
  delay?: number;
}) {
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <Card className="bg-[#0d1117]/80 border-white/10 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Timer className="w-5 h-5 text-blue-400" />
            <span className="text-sm text-white/70">平均处理时间</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-white">{formatTime(avgTime)}</span>
            <span className="text-sm text-white/40 mb-1">平均</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-white/50">中位数:</span>
            <span className="text-sm font-medium text-white">{formatTime(medianTime)}</span>
          </div>
          <div className="mt-4 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((avgTime / 120) * 100, 100)}%` }}
              transition={{ duration: 1, delay: 0.5 }}
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// 转化率卡片
function ConversionCard({
  approvalRate,
  resubmitRate,
  delay = 0,
}: {
  approvalRate: number;
  resubmitRate: number;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <Card className="bg-[#0d1117]/80 border-white/10 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-emerald-400" />
            <span className="text-sm text-white/70">转化率</span>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white/50">通过率</span>
                <span className="text-emerald-400 font-medium">{approvalRate.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-emerald-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${approvalRate}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white/50">重新提交率</span>
                <span className="text-yellow-400 font-medium">{resubmitRate.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-yellow-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${resubmitRate}%` }}
                  transition={{ duration: 1, delay: 0.4 }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// 风险分布卡片
function RiskDistributionCard({
  distribution,
  delay = 0,
}: {
  distribution: Record<RiskLevel, number>;
  delay?: number;
}) {
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <Card className="bg-[#0d1117]/80 border-white/10 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-purple-400" />
            <span className="text-sm text-white/70">风险分布</span>
          </div>
          
          <div className="space-y-3">
            {(Object.entries(distribution) as [RiskLevel, number][]).map(([level, count], index) => {
              const config = RISK_CONFIG[level];
              const percentage = total > 0 ? (count / total) * 100 : 0;
              
              return (
                <div key={level}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={config.color}>{config.label}</span>
                    <span className="text-white/60">{count} ({percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full ${config.bgColor.replace("/20", "")}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.8, delay: 0.2 + index * 0.1 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// 主组件
export function KycStatsPanel({ stats, isLoading }: KycStatsPanelProps) {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-[#0d1117]/50 border-white/5 h-32">
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-white/10 rounded w-1/2" />
                <div className="h-8 bg-white/10 rounded w-1/3" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 主要统计 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="待审核"
          value={stats.pending}
          icon={Clock}
          color="text-blue-400"
          delay={0}
        />
        <StatCard
          title="已通过"
          value={stats.approved}
          icon={CheckCircle2}
          color="text-emerald-400"
          trend="up"
          trendValue={`${stats.approval_rate.toFixed(1)}% 通过率`}
          delay={0.1}
        />
        <StatCard
          title="已拒绝"
          value={stats.rejected}
          icon={XCircle}
          color="text-red-400"
          delay={0.2}
        />
        <StatCard
          title="同步失败"
          value={stats.failed_sync}
          icon={AlertTriangle}
          color="text-yellow-400"
          delay={0.3}
        />
      </div>

      {/* 详细统计 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ProcessingTimeCard
          avgTime={stats.avg_processing_time_minutes}
          medianTime={stats.median_processing_time_minutes}
          delay={0.4}
        />
        <ConversionCard
          approvalRate={stats.approval_rate}
          resubmitRate={stats.resubmit_rate}
          delay={0.5}
        />
        <RiskDistributionCard
          distribution={stats.risk_distribution}
          delay={0.6}
        />
      </div>
    </div>
  );
}

export default KycStatsPanel;
