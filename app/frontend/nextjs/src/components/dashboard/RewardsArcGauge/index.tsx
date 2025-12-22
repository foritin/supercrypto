'use client';

import { motion } from 'framer-motion';

interface RewardsArcGaugeProps {
  distributed: number;
  remaining: number;
  token: string;
}

/**
 * 奖励池弧形仪表盘组件
 * 显示已分发和剩余的奖励代币
 */
export const RewardsArcGauge: React.FC<RewardsArcGaugeProps> = ({
  distributed,
  remaining,
  token,
}) => {
  const total = distributed + remaining;
  const percentage = total > 0 ? (distributed / total) * 100 : 0;
  
  // 计算弧线路径
  const radius = 80;
  const startAngle = 180;
  const endAngle = 360;
  const angle = startAngle + ((endAngle - startAngle) * percentage) / 100;
  
  // 计算弧线的SVG路径
  const getArcPath = (percent: number) => {
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = ((startAngle + ((endAngle - startAngle) * percent) / 100) * Math.PI) / 180;
    
    const x1 = 100 + radius * Math.cos(startRad);
    const y1 = 100 + radius * Math.sin(startRad);
    const x2 = 100 + radius * Math.cos(endRad);
    const y2 = 100 + radius * Math.sin(endRad);
    
    const largeArc = percent > 50 ? 1 : 0;
    
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(1)}M`;
    }
    if (num >= 1_000) {
      return `${(num / 1_000).toFixed(1)}K`;
    }
    return num.toFixed(0);
  };

  return (
    <div className="relative w-full">
      <svg viewBox="0 0 200 120" className="w-full h-auto">
        {/* 渐变定义 */}
        <defs>
          <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>

        {/* 背景弧线 */}
        <path
          d={getArcPath(100)}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="12"
          strokeLinecap="round"
        />

        {/* 进度弧线 - 动画 */}
        <motion.path
          d={getArcPath(0)}
          fill="none"
          stroke="url(#gauge-gradient)"
          strokeWidth="12"
          strokeLinecap="round"
          initial={{ d: getArcPath(0) }}
          animate={{ d: getArcPath(percentage) }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          style={{
            filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.6))',
          }}
        />
      </svg>

      {/* 数据显示 */}
      <div className="absolute top-12 left-0 right-0 flex flex-col items-center 
                      justify-center text-center space-y-2">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="text-xs text-gray-400">已分发</div>
          <div className="text-2xl font-bold text-white">
            {formatNumber(distributed)} {token}
          </div>
        </motion.div>

        <div className="w-16 h-px bg-white/20" />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <div className="text-xs text-gray-400">剩余</div>
          <div className="text-lg font-medium text-white">
            {formatNumber(remaining)} {token}
          </div>
        </motion.div>
      </div>

      {/* 百分比指示器 */}
      <motion.div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 
                   text-sm font-medium text-green-400"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        {percentage.toFixed(1)}% 已发放
      </motion.div>
    </div>
  );
};

