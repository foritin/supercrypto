'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * ════════════════════════════════════════════════════════════════
 * Theme Provider - 主题提供者
 *
 * 管理明暗模式切换状态
 * - 自动检测系统主题偏好
 * - 持久化用户选择到 localStorage
 * - 应用主题类到 document.documentElement
 * ════════════════════════════════════════════════════════════════
 *
 * @example
 * // In layout.tsx
 * <ThemeProvider>{children}</ThemeProvider>
 *
 * // In component
 * const { theme, toggleTheme } = useTheme();
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // 从 localStorage 读取保存的主题
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme) {
      setThemeState(savedTheme);
    } else {
      // 检测系统主题偏好
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      setThemeState(systemTheme);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // 应用主题到 document
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);

    // 持久化到 localStorage
    localStorage.setItem('theme', theme);
  }, [theme, mounted]);

  const toggleTheme = () => {
    setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  // 避免服务端/客户端不匹配
  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * useTheme - 使用主题钩子
 *
 * @example
 * function MyComponent() {
 *   const { theme, toggleTheme } = useTheme();
 *
 *   return (
 *     <button onClick={toggleTheme}>
 *       当前主题: {theme}
 *     </button>
 *   );
 * }
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
