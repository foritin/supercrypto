'use client';

import { motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';

import { useTheme } from '@/contexts/theme-context';

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
    <button
      onClick={toggleTheme}
      className="relative w-8 h-8 rounded-lg bg-white/5 border border-white/10
                 hover:bg-white/10 hover:scale-105 active:scale-95 transition-all
                 focus:outline-none focus:ring-2 focus:ring-primary/50
                 flex items-center justify-center"
      aria-label={`切换到${theme === 'dark' ? '浅色' : '深色'}模式`}
      title={`切换到${theme === 'dark' ? '浅色' : '深色'}模式`}
    >
      <motion.div
        initial={false}
        animate={{ rotate: theme === 'dark' ? 0 : 180 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        {theme === 'dark' ? (
          <Moon className="w-4 h-4 text-[#c9a962]" strokeWidth={2} />
        ) : (
          <Sun className="w-4 h-4 text-primary" strokeWidth={2} />
        )}
      </motion.div>
    </button>
  );
}
