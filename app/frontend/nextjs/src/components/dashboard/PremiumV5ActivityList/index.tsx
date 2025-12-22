'use client';

import React from 'react';
import { motion } from 'framer-motion';

/**
 * ════════════════════════════════════════════════════════════════
 * PREMIUM V5 ACTIVITY LIST - 高级活动列表
 * 特点: 精致列表项 + 渐变头像 + 微妙动效
 * ════════════════════════════════════════════════════════════════
 */

interface Activity {
  id: string;
  name: string;
  date: string;
  amount: number;
  type: 'subscription' | 'staking' | 'kyc' | 'reward' | 'user';
  status: 'success' | 'pending' | 'failed';
}

interface PremiumV5ActivityListProps {
  title: string;
  activities: Activity[];
}

const typeConfig = {
  subscription: { gradient: 'from-amber-500 to-orange-600', icon: '📋' },
  staking: { gradient: 'from-emerald-500 to-teal-600', icon: '⚡' },
  kyc: { gradient: 'from-blue-500 to-indigo-600', icon: '✓' },
  reward: { gradient: 'from-purple-500 to-pink-600', icon: '🎁' },
  user: { gradient: 'from-cyan-500 to-blue-600', icon: '👤' },
};

const statusConfig = {
  success: { label: '成功', className: 'premium-badge-success' },
  pending: { label: '处理中', className: 'premium-badge-gold' },
  failed: { label: '失败', className: 'premium-badge-gold' },
};

export const PremiumV5ActivityList: React.FC<PremiumV5ActivityListProps> = ({
  title,
  activities,
}) => {
  return (
    <motion.div
      className="premium-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      {/* 标题 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <button className="text-sm transition-colors hover:text-white" style={{ color: 'rgba(201, 169, 98, 0.8)' }}>
          查看全部 →
        </button>
      </div>

      {/* 列表 */}
      <div className="space-y-1">
        {activities.map((activity, index) => {
          const type = typeConfig[activity.type];
          const status = statusConfig[activity.status];

          return (
            <motion.div
              key={activity.id}
              className="premium-list-item"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.08 }}
            >
              {/* 头像 */}
              <div
                className={`premium-avatar bg-gradient-to-br ${type.gradient} mr-3`}
              >
                <span className="text-base">{type.icon}</span>
              </div>

              {/* 内容 */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {activity.name}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                  {activity.date}
                </p>
              </div>

              {/* 金额 + 状态 */}
              <div className="flex items-center gap-3 ml-3">
                {activity.amount > 0 && (
                  <span className="text-sm font-semibold text-white">
                    ${activity.amount.toLocaleString()}
                  </span>
                )}
                <span className={status.className}>
                  {status.label}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

