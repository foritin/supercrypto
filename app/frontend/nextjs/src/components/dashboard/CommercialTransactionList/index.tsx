'use client';

import React from 'react';
import { motion } from 'framer-motion';

/**
 * ════════════════════════════════════════════════════════════════
 * COMMERCIAL TRANSACTION LIST - 商业化交易列表
 * 设计参考: Ulfry Dashboard
 * 特点: 清爽布局 + 头像 + 状态标签
 * ════════════════════════════════════════════════════════════════
 */

interface Transaction {
  id: string;
  name: string;
  date: string;
  amount: number;
  status: 'success' | 'pending' | 'failed';
  avatar?: string;
}

interface CommercialTransactionListProps {
  title: string;
  transactions: Transaction[];
}

const StatusBadge: React.FC<{ status: Transaction['status'] }> = ({ status }) => {
  const config = {
    success: { label: '成功', className: 'success' },
    pending: { label: '处理中', className: 'warning' },
    failed: { label: '失败', className: 'error' },
  };

  const { label, className } = config[status];

  return (
    <span className={`commercial-badge ${className}`}>
      {label}
    </span>
  );
};

export const CommercialTransactionList: React.FC<CommercialTransactionListProps> = ({
  title,
  transactions,
}) => {
  return (
    <motion.div
      className="commercial-glass-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
    >
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">{title}</h3>
        <button className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
          查看全部 →
        </button>
      </div>

      {/* 交易列表 */}
      <div className="space-y-2">
        {transactions.map((transaction, index) => (
          <motion.div
            key={transaction.id}
            className="commercial-transaction-row"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + index * 0.1 }}
          >
            {/* 左侧: 头像 + 名称和日期 */}
            <div className="flex items-center flex-1 gap-3">
              {/* 头像 */}
              <div
                className="commercial-avatar flex items-center justify-center text-white font-bold text-sm"
                style={{
                  background: `linear-gradient(135deg, #${Math.floor(Math.random() * 16777215).toString(16)} 0%, #${Math.floor(Math.random() * 16777215).toString(16)} 100%)`,
                }}
              >
                {transaction.name.charAt(0).toUpperCase()}
              </div>

              {/* 名称和日期 */}
              <div>
                <p className="text-sm font-semibold text-white">
                  {transaction.name}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {transaction.date}
                </p>
              </div>
            </div>

            {/* 右侧: 金额 + 状态 */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-bold text-white">
                  ${transaction.amount.toLocaleString()}
                </p>
              </div>
              <StatusBadge status={transaction.status} />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

