'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { Progress } from '@/components/ui/progress';

interface Asset {
  id: string;
  name: string;
  value: number;
  progress: number;
  type: 'rwa' | 'token';
  apy?: number;
}

interface PortfolioCardProps {
  assets: Asset[];
  totalValue: number;
  loading?: boolean;
}

export const PortfolioCard: React.FC<PortfolioCardProps> = ({
  assets,
  totalValue,
  loading = false
}) => {
  // 计算图表数据
  const chartData = assets.map((asset, index) => ({
    name: asset.name,
    value: asset.value,
    color: ['#6366F1', '#10B981', '#F59E0B', '#EF4444'][index % 4]
  }));

  // 简化的饼图组件（使用CSS实现）
  const PieChart = ({ data }: { data: typeof chartData }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);

    return (
      <div className="relative w-48 h-48">
        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
          {data.map((item, index) => {
            const percentage = (item.value / total) * 100;
            const strokeDasharray = `${percentage} ${100 - percentage}`;

            return (
              <circle
                key={item.name}
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={item.color}
                strokeWidth="8"
                strokeDasharray={strokeDasharray}
                className="transition-all duration-500"
                style={{
                  strokeDashoffset: index > 0 ? data.slice(0, index).reduce((sum, prev) => sum + (prev.value / total) * 100, 0) : 0
                }}
              />
            );
          })}
        </svg>

        {/* 中心文字 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center transform rotate-0">
          <p className="text-xs text-gray-400 mb-1">总资产</p>
          <p className="text-lg font-bold text-white">
            ¥{(totalValue / 1000).toFixed(1)}K
          </p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <GlassCard className="p-6 h-full">
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">加载投资组合...</p>
          </div>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6 h-full">
      {/* 标题 */}
      <h2 className="text-xl font-bold text-white mb-6 flex items-center justify-between">
        投资组合
        <span className="text-sm font-normal text-gray-400">
          共 {assets.length} 项资产
        </span>
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 饼图 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-center"
        >
          <PieChart data={chartData} />
        </motion.div>

        {/* 资产列表 */}
        <div className="space-y-6">
          {assets.map((asset, index) => (
            <motion.div
              key={asset.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: chartData[index].color }}
                  />
                  <div>
                    <p className="text-sm font-medium text-white">
                      {asset.name}
                    </p>
                    {asset.apy && (
                      <p className="text-xs text-gray-400">
                        APY: {asset.apy}%
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm font-medium text-white">
                    ¥{asset.value.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400">
                    {((asset.value / totalValue) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* 进度条 */}
              <Progress
                value={asset.progress}
                className="h-1.5 group-hover:opacity-100 opacity-80 transition-opacity"
                indicatorColor={asset.type === 'rwa' ? '#6366f1' : '#10b981'}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* 底部统计 */}
      <div className="mt-6 pt-6 border-t border-white/10">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400 mb-1">投资收益率</p>
            <p className="text-white font-medium">
              +{((totalValue - 100000) / 100000 * 100).toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-gray-400 mb-1">累计收益</p>
            <p className="text-emerald-400 font-medium">
              +¥{(totalValue - 100000).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};