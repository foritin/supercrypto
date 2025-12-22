"use client";
/**
 * ════════════════════════════════════════════════════════════════
 * 管理员仪表盘页面 - V6 Enhancement Edition
 * Story 7.5-FE: 平台数据统计前端仪表盘
 * 
 * 风格: 高级、精简、协调的Web3仪表盘
 * 改进: 移除边条 + 统一图标风格 + 清晰布局
 * ════════════════════════════════════════════════════════════════
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Users,
  FileText,
  Zap,
  RefreshCw,
  FileBarChart,
} from "lucide-react";
import {
  adminService,
  PlatformStatsResponse,
} from "@/services/admin";
import { RequireAuth } from "@/components/auth";
import { PremiumV5Background } from "@/components/layout/PremiumV5Background";
import { V6StatCard } from "@/components/dashboard/V6StatCard";
import { PremiumV5Chart } from "@/components/dashboard/PremiumV5Chart";
import { V6ActivityList } from "@/components/dashboard/V6ActivityList";

// 主仪表盘页面
export default function AdminDashboardPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { address, isConnected } = useAccount();

  const [stats, setStats] = useState<PlatformStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      if (!isConnected || !address) return;

      try {
        setIsLoading(true);
        setError(null);
        const data = await adminService.getPlatformStats();
        setStats(data);
      } catch (err) {
        console.error("Failed to fetch platform stats:", err);
        setError((err as Error).message || t("admin.dashboard.loadError"));
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, [isConnected, address]);

  // 刷新数据
  const handleRefresh = async () => {
    try {
      setIsLoading(true);
      const data = await adminService.getPlatformStats();
      setStats(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // 模拟活动数据
  const mockActivities = [
    {
      id: '1',
      name: t("admin.dashboard.activities.subscription", "认购 USDT-BUSD 资产"),
      date: '2025-12-17 14:30',
      amount: 5000,
      type: 'subscription' as const,
      status: 'success' as const,
    },
    {
      id: '2',
      name: t("admin.dashboard.activities.staking", "质押 PLT 代币"),
      date: '2025-12-17 12:15',
      amount: 1200,
      type: 'staking' as const,
      status: 'success' as const,
    },
    {
      id: '3',
      name: t("admin.dashboard.activities.kycApproved", "KYC 审核通过"),
      date: '2025-12-17 10:45',
      amount: 0,
      type: 'kyc' as const,
      status: 'success' as const,
    },
    {
      id: '4',
      name: t("admin.dashboard.activities.rewardDistributed", "奖励发放"),
      date: '2025-12-17 09:00',
      amount: 350,
      type: 'reward' as const,
      status: 'success' as const,
    },
    {
      id: '5',
      name: t("admin.dashboard.activities.newUser", "新用户注册"),
      date: '2025-12-17 08:20',
      amount: 0,
      type: 'user' as const,
      status: 'success' as const,
    },
  ];

  // 图表数据
  const chartData = stats ? [
    { name: '1月', value1: stats.tvl.total_tvl * 0.6, value2: stats.staking.total_staked * 0.5 },
    { name: '2月', value1: stats.tvl.total_tvl * 0.65, value2: stats.staking.total_staked * 0.55 },
    { name: '3月', value1: stats.tvl.total_tvl * 0.7, value2: stats.staking.total_staked * 0.6 },
    { name: '4月', value1: stats.tvl.total_tvl * 0.75, value2: stats.staking.total_staked * 0.7 },
    { name: '5月', value1: stats.tvl.total_tvl * 0.85, value2: stats.staking.total_staked * 0.8 },
    { name: '6月', value1: stats.tvl.total_tvl * 0.95, value2: stats.staking.total_staked * 0.9 },
    { name: '7月', value1: stats.tvl.total_tvl, value2: stats.staking.total_staked },
  ] : [];

  return (
    <RequireAuth requireKyc={false} requireAdmin>
      {/* 高级背景 */}
      <PremiumV5Background />

      <div className="min-h-screen relative px-6 py-8 max-w-[1600px] mx-auto">
        {/* 页面标题 */}
        <motion.div
          className="mb-8 flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">
              {t("admin.dashboard.pageTitle")}
            </h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
              {t("admin.dashboard.subtitle", "实时监控平台核心指标")}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="premium-btn premium-btn-ghost"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? t("admin.dashboard.refreshing", "刷新中...") : t("admin.dashboard.refreshData")}</span>
            </button>
            <button
              onClick={() => router.push("/admin/audit-logs")}
              className="premium-btn premium-btn-gold"
            >
              <FileBarChart className="w-4 h-4" />
              <span>{t("admin.auditLogs.title")}</span>
            </button>
          </div>
        </motion.div>

        {/* 错误提示 */}
        {error && (
          <motion.div
            className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 
                       backdrop-blur-xl p-4 text-red-400"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            ⚠️ {error}
          </motion.div>
        )}

        {/* 加载状态 */}
        {isLoading && !stats && (
          <div className="flex h-64 items-center justify-center">
            <div className="relative">
              <div className="h-12 w-12 animate-spin rounded-full border-2 
                             border-amber-500/20 border-t-amber-500" />
            </div>
          </div>
        )}

        {/* 主内容 */}
        {stats && (
          <div className="space-y-6">
            {/* V6 统计卡片 - 无边条清爽版 */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <V6StatCard
                title={t("admin.dashboard.tvl")}
                value={stats.tvl.total_tvl}
                prefix="$"
                icon={TrendingUp}
                trend={{ value: 15, isPositive: true }}
                variant="gold"
                delay={0}
              />

              <V6StatCard
                title={t("admin.dashboard.totalUsers")}
                value={stats.users.total_users}
                icon={Users}
                trend={{ value: 12, isPositive: true }}
                variant="cyan"
                delay={0.1}
              />

              <V6StatCard
                title={t("admin.dashboard.activeSubscriptions", "活跃认购")}
                value={stats.active_subscriptions}
                icon={FileText}
                trend={{ value: 8, isPositive: true }}
                variant="gold"
                delay={0.2}
              />

              <V6StatCard
                title={t("admin.dashboard.activeStakes")}
                value={stats.staking.active_stakes}
                icon={Zap}
                trend={{ value: 20, isPositive: true }}
                variant="cyan"
                delay={0.3}
              />
            </div>

            {/* 主内容区 - 2栏布局 */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* 左侧 - 2列 */}
              <div className="lg:col-span-2 space-y-6">
                {/* 图表 */}
                <PremiumV5Chart
                  title={t("admin.dashboard.chart.title", "数据趋势")}
                  subtitle={t("admin.dashboard.chart.subtitle", "TVL 与质押金额变化")}
                  data={chartData}
                  label1={t("admin.dashboard.tvl")}
                  label2={t("admin.dashboard.staking", "质押")}
                />

                {/* V6 活动列表 - 深色统一图标 */}
                <V6ActivityList
                  title={t("admin.dashboard.recentActivity")}
                  activities={mockActivities}
                />
              </div>

              {/* 右侧栏 - 1列 */}
              <div className="space-y-6">
                {/* 平台概况 */}
                <motion.div
                  className="premium-card"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {t("admin.dashboard.overview")}
                  </h3>
                  <p className="text-sm mb-5" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                    {t("admin.dashboard.currentStatus", "Current Status")}
                  </p>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        {t("admin.dashboard.totalAssets", "上线资产数")}
                      </span>
                      <span className="text-xl font-bold premium-text-gold">
                        {stats.total_assets}
                      </span>
                    </div>
                    
                    <div className="premium-divider" />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        {t("admin.dashboard.newUsers7d", "7日新增用户")}
                      </span>
                      <span className="text-lg font-semibold premium-text-cyan">
                        +{stats.users.new_users_7d}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        {t("admin.dashboard.newUsers24h", "24h新增用户")}
                      </span>
                      <span className="text-lg font-semibold premium-text-cyan">
                        +{stats.users.new_users_24h}
                      </span>
                    </div>
                    
                    <div className="premium-divider" />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        {t("admin.dashboard.kycConversionRate", "KYC 通过率")}
                      </span>
                      <span className="text-lg font-semibold text-white">
                        {stats.users.kyc_conversion_rate.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <button className="premium-btn premium-btn-ghost text-xs">
                      {t("admin.dashboard.detailedReport", "详细报告")}
                    </button>
                    <button className="premium-btn premium-btn-gold text-xs">
                      {t("admin.dashboard.exportData", "导出数据")}
                    </button>
                  </div>
                </motion.div>

                {/* 奖励池状态 */}
                <motion.div
                  className="premium-card"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <h3 className="text-lg font-semibold text-white mb-5">
                    {t("admin.dashboard.rewardsPool.title", "奖励池状态")}
                  </h3>

                  {/* 环形进度 */}
                  <div className="flex justify-center mb-6">
                    <div className="premium-circular-progress">
                      <svg width="140" height="140" viewBox="0 0 140 140">
                        <defs>
                          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#c9a962" />
                            <stop offset="50%" stopColor="#e8d5a3" />
                            <stop offset="100%" stopColor="#c9a962" />
                          </linearGradient>
                        </defs>
                        {/* 背景圆 */}
                        <circle
                          cx="70"
                          cy="70"
                          r="58"
                          className="premium-circular-progress-bg"
                        />
                        {/* 进度圆 */}
                        <circle
                          cx="70"
                          cy="70"
                          r="58"
                          className="premium-circular-progress-fill"
                          strokeDasharray={`${(stats.staking.total_rewards_distributed / (stats.staking.total_rewards_distributed + stats.staking.rewards_pool_remaining)) * 364} 364`}
                        />
                      </svg>
                      <div className="premium-circular-progress-center">
                        <div className="text-2xl font-bold premium-text-gold">
                          {((stats.staking.total_rewards_distributed / (stats.staking.total_rewards_distributed + stats.staking.rewards_pool_remaining)) * 100).toFixed(0)}%
                        </div>
                        <div className="text-xs mt-1" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                          {t("admin.dashboard.rewardsPool.distributed", "已分发")}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 图例 */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400" />
                        <span className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>{t("admin.dashboard.rewardsPool.distributed", "已分发")}</span>
                      </div>
                      <span className="text-sm font-medium text-white">
                        {(stats.staking.total_rewards_distributed / 1000000).toFixed(2)}M PLT
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(255, 255, 255, 0.15)' }} />
                        <span className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>{t("admin.dashboard.rewardsPool.remaining", "剩余")}</span>
                      </div>
                      <span className="text-sm font-medium text-white">
                        {(stats.staking.rewards_pool_remaining / 1000000).toFixed(2)}M PLT
                      </span>
                    </div>
                  </div>
                </motion.div>

                {/* 质押分布 */}
                <motion.div
                  className="premium-card"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <h3 className="text-lg font-semibold text-white mb-5">
                    {t("admin.dashboard.stakingDistribution.title", "质押周期分布")}
                  </h3>

                  <div className="space-y-4">
                    {[15, 30, 45, 60].map((period, index) => {
                      const count = stats.staking.period_distribution[period] || 0;
                      const maxCount = Math.max(...Object.values(stats.staking.period_distribution), 1);
                      const percentage = (count / maxCount) * 100;
                      const isGold = index % 2 === 0;
                      
                      return (
                        <div key={period}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                              {period} {t("admin.dashboard.stakingDistribution.days", "天")}
                            </span>
                            <span className="text-sm font-semibold text-white">
                              {count}
                            </span>
                          </div>
                          <div className="premium-progress">
                            <motion.div
                              className={`premium-progress-fill ${isGold ? '' : 'cyan'}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 1, delay: 0.6 + index * 0.1 }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        )}
      </div>
    </RequireAuth>
  );
}
