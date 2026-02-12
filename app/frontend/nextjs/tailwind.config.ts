import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // 标准化响应式断点
      screens: {
        'xs': '480px',   // 小手机横屏
        'sm': '640px',   // 手机横屏
        'md': '768px',   // 平板竖屏
        'lg': '1024px',  // 平板横屏/小桌面
        'xl': '1280px',  // 桌面
        '2xl': '1536px', // 大桌面
      },
      colors: {
        /* 注意: 主要颜色 token 已在 globals.css @theme inline 中定义
         * 包括: primary, primary-light, primary-dark, gold,
         * bg-dark, bg-card, bg-elevated, success, warning, error, info
         * 此处仅保留 @theme inline 未覆盖的辅助颜色 */

        // Web3 特殊颜色 (渐变/辅助)
        'web3-purple': '#667eea',
        'web3-blue': '#764ba2',
        // 玻璃态背景
        glass: {
          bg: 'rgba(15, 23, 42, 0.6)',
          border: 'rgba(255, 255, 255, 0.1)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'gradient-secondary': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'gradient-radial': 'radial-gradient(ellipse at top, var(--tw-gradient-stops))',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s infinite',
        'border-glow': 'borderGlow 4s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        borderGlow: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3)',
        'glow-primary': '0 0 30px rgba(99, 102, 241, 0.5)',
        'glow-success': '0 0 20px rgba(16, 185, 129, 0.4)',
        'inner-glow': 'inset 0 0 20px rgba(255, 255, 255, 0.05)',
        'glow-sm': '0 0 20px rgba(102, 126, 234, 0.4)',
        'glow': '0 0 40px rgba(102, 126, 234, 0.4)',
        'glow-lg': '0 0 60px rgba(102, 126, 234, 0.6)',
      },
    },
  },
  plugins: [
    // 添加自定义插件
    function({ addUtilities, theme }: { addUtilities: (utilities: Record<string, Record<string, string>>) => void; theme: (path: string) => string }) {
      const newUtilities = {
        '.glass': {
          background: theme('colors.glass.bg'),
          backdropFilter: 'blur(20px)',
          border: `1px solid ${theme('colors.glass.border')}`,
        },
        '.text-gradient': {
          background: theme('colors.gradient.primary'),
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
      };
      addUtilities(newUtilities);
    },
  ],
};

export default config;