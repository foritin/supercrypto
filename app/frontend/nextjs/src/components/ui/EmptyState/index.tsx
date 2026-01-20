'use client';

import { motion } from 'framer-motion';

interface EmptyStateProps {
  message: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * 空状态组件
 * 显示友好的空数据提示，带浮动粒子动画
 */
import React from 'react';

export const EmptyState: React.FC<EmptyStateProps> = React.memo(function EmptyState({
  message,
  description,
  action,
}) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-12"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* 浮动粒子效果 */}
      <div className="relative mb-6">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="inline-block mx-2"
            animate={{
              y: [0, -10, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.2,
              ease: 'easeInOut',
            }}
          >
            <span className="text-4xl">✨</span>
          </motion.div>
        ))}
      </div>

      <h3 className="text-xl font-semibold text-gray-300 mb-2">
        {message}
      </h3>
      
      {description && (
        <p className="text-sm text-gray-500 mb-6 text-center max-w-md">
          {description}
        </p>
      )}

      {action && (
        <motion.button
          onClick={action.onClick}
          className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 
                     to-blue-600 text-white font-medium
                     hover:shadow-lg hover:shadow-purple-500/50
                     transition-all duration-300"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  );
});

