'use client';

import { motion } from 'framer-motion';
import {
  FileText,
  Zap,
  CheckCircle,
  Gift,
  User,
} from 'lucide-react';
import React from 'react';

/**
 * ════════════════════════════════════════════════════════════════
 * 高级活动列表 (深色统一图标)
 * 设计: 深色背景图标 + 金色/青色细边框，与主题协调
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

interface ActivityListProps {
  title: string;
  activities: Activity[];
}

// 图标映射 - 使用lucide图标
const typeIcons = {
  subscription: FileText,
  staking: Zap,
  kyc: CheckCircle,
  reward: Gift,
  user: User,
};

// 类型颜色映射 - 只用金色和青色
const typeColors = {
  subscription: 'gold',  // 金色
  staking: 'cyan',       // 青色
  kyc: 'cyan',           // 青色
  reward: 'gold',        // 金色
  user: 'gold',          // 金色
};

const statusConfig = {
  success: { label: '成功', className: 'premium-badge-success' },
  pending: { label: '处理中', className: 'premium-badge-gold' },
  failed: { label: '失败', className: 'premium-badge-gold' },
};

export const ActivityList: React.FC<ActivityListProps> = ({
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
        <button
          className="text-sm transition-colors hover:text-white"
          style={{ color: 'rgba(201, 169, 98, 0.8)' }}
        >
          查看全部 →
        </button>
      </div>

      {/* 列表 */}
      <div className="space-y-1">
        {activities.map((activity, index) => {
          const IconComponent = typeIcons[activity.type];
          const colorType = typeColors[activity.type];
          const isCyan = colorType === 'cyan';
          const status = statusConfig[activity.status];

          return (
            <motion.div
              key={activity.id}
              className="premium-list-item"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.08 }}
            >
              {/* 深色图标容器 */}
              <div className={`v6-activity-icon ${isCyan ? 'cyan' : ''} mr-3`}>
                <IconComponent />
              </div>

              {/* 内容 */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {activity.name}
                </p>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: 'rgba(255, 255, 255, 0.50)' }}  /* Improved from 0.4 - 5.1:1 ✓ */
                >
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
                <span className={status.className}>{status.label}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

