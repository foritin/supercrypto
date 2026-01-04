'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/theme-context';
import { motion } from 'framer-motion';

/**
 * ════════════════════════════════════════════════════════════════
 * Theme Switcher - 主题切换按钮
 *
 * 在明暗模式之间切换
 * - 平滑的图标旋转动画
 * - 悬停效果
 * - 无障碍支持
 * ════════════════════════════════════════════════════════════════
 *
 * @example
 * <ThemeSwitcher />
 */
export function ThemeSwitcher() {
  const { theme, toggleTheme } = useTheme();

  return (
    <motion.button
      onClick={toggleTheme}
      className="relative w-10 h-10 rounded-lg bg-white/5 border border-white/10
                 hover:bg-white/10 transition-colors
                 focus:outline-none focus:ring-2 focus:ring-[#00d4aa]/50"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={`切换到${theme === 'dark' ? '浅色' : '深色'}模式`}
      title={`切换到${theme === 'dark' ? '浅色' : '深色'}模式`}
    >
      <motion.div
        initial={false}
        animate={{ rotate: theme === 'dark' ? 0 : 180 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        {theme === 'dark' ? (
          <Moon className="w-5 h-5 text-[#c9a962]" strokeWidth={2} />
        ) : (
          <Sun className="w-5 h-5 text-[#00d4aa]" strokeWidth={2} />
        )}
      </motion.div>
    </motion.button>
  );
}
