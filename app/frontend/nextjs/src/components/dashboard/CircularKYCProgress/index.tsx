'use client';

import { motion } from 'framer-motion';

interface CircularKYCProgressProps {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  conversionRate: number;
}

/**
 * KYC环形进度组件
 * 显示KYC认证的进度和转化率
 */
export const CircularKYCProgress: React.FC<CircularKYCProgressProps> = ({
  total,
  approved,
  pending,
  rejected,
  conversionRate,
}) => {
  const percentage = total > 0 ? (approved / total) * 100 : 0;
  const circumference = 2 * Math.PI * 56; // r=56
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const steps = [
    { label: '总用户', value: total, color: 'bg-blue-500' },
    { label: '待审核', value: pending, color: 'bg-yellow-500' },
    { label: '已通过', value: approved, color: 'bg-green-500' },
    { label: '已拒绝', value: rejected, color: 'bg-red-500' },
  ];

  return (
    <div className="space-y-6">
      {/* 环形进度 */}
      <div className="relative w-32 h-32 mx-auto">
        {/* SVG圆环 */}
        <svg className="w-full h-full -rotate-90">
          {/* 渐变定义 */}
          <defs>
            <linearGradient id="kyc-progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#667eea" />
              <stop offset="100%" stopColor="#764ba2" />
            </linearGradient>
          </defs>

          {/* 背景圆环 */}
          <circle
            cx="64"
            cy="64"
            r="56"
            className="stroke-white/10"
            strokeWidth="8"
            fill="none"
          />

          {/* 进度圆环 */}
          <motion.circle
            cx="64"
            cy="64"
            r="56"
            stroke="url(#kyc-progress-gradient)"
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            strokeLinecap="round"
          />
        </svg>

        {/* 中心显示 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-3xl font-bold text-white"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            {conversionRate.toFixed(0)}%
          </motion.span>
          <span className="text-xs text-gray-400 mt-1">KYC通过率</span>
        </div>
      </div>

      {/* KYC转化漏斗 */}
      <div className="grid grid-cols-4 gap-3">
        {steps.map((step, i) => (
          <motion.div
            key={i}
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 + 0.3, duration: 0.4 }}
          >
            <motion.div
              className={`mx-auto mb-2 flex h-12 w-12 items-center justify-center 
                         rounded-full ${step.color} shadow-lg`}
              whileHover={{ scale: 1.1 }}
              style={{
                boxShadow: `0 4px 20px ${step.color.replace('bg-', 'rgba(').replace('-500', ', 0.4)')}`
              }}
            >
              <span className="text-lg font-bold text-white">{step.value}</span>
            </motion.div>
            <p className="text-xs text-gray-400">{step.label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

