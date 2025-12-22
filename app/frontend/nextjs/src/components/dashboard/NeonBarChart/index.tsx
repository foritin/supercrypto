'use client';

import { motion } from 'framer-motion';
import { EmptyState } from '@/components/ui/EmptyState';

interface NeonBarChartProps {
  distribution: Record<number, number>;
  periods: number[];
}

/**
 * 霓虹条形图组件
 * 显示质押周期分布，带发光效果和动画
 */
export const NeonBarChart: React.FC<NeonBarChartProps> = ({
  distribution,
  periods,
}) => {
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);

  if (total === 0) {
    return (
      <EmptyState
        message="暂无质押数据"
        description="当前没有活跃的质押记录"
      />
    );
  }

  return (
    <div className="space-y-4">
      {periods.map((period, index) => {
        const count = distribution[period] || 0;
        const percentage = total > 0 ? (count / total) * 100 : 0;

        return (
          <motion.div
            key={period}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
          >
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400 font-medium">{period} 天</span>
              <span className="text-white font-semibold">
                {count} <span className="text-gray-500">({percentage.toFixed(1)}%)</span>
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-white/10 relative">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500
                           relative overflow-hidden"
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ delay: index * 0.1 + 0.2, duration: 0.8, ease: 'easeOut' }}
                style={{
                  boxShadow: '0 0 20px rgba(102, 126, 234, 0.6)',
                }}
              >
                {/* 霓虹光波动画 */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent 
                             via-white/30 to-transparent"
                  initial={{ x: '-100%' }}
                  animate={{ x: '200%' }}
                  transition={{
                    repeat: Infinity,
                    duration: 2,
                    ease: 'linear',
                    delay: index * 0.1,
                  }}
                />
              </motion.div>
            </div>
          </motion.div>
        );
      })}

      {/* 平均质押周期 */}
      <motion.div
        className="mt-6 pt-4 border-t border-white/10 flex justify-between 
                   text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: periods.length * 0.1 + 0.5 }}
      >
        <span className="text-gray-400">平均质押周期</span>
        <span className="font-medium text-white">
          {(() => {
            let sum = 0;
            let count = 0;
            periods.forEach((period) => {
              const periodCount = distribution[period] || 0;
              sum += period * periodCount;
              count += periodCount;
            });
            return count > 0 ? (sum / count).toFixed(1) : '0';
          })()} 天
        </span>
      </motion.div>
    </div>
  );
};

