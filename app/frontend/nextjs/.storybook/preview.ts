import type { Preview } from '@storybook/react';
import { withThemeByDataAttribute } from '@storybook/addon-themes';
import '../src/app/globals.css'; // 导入全局样式

/**
 * ════════════════════════════════════════════════════════════════
 * Storybook Preview Configuration
 *
 * 全局装饰器和配置
 * - 主题切换支持（dark/light mode）
 * - 响应式测试布局
 * - 无障碍测试配置
 * ════════════════════════════════════════════════════════════════
 */

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    // 无障碍测试配置
    a11y: {
      config: {
        rules: [
          {
            // WCAG AA 标准
            id: 'color-contrast',
            enabled: true,
          },
          {
            // 要求 alt 文本
            id: 'image-alt',
            enabled: true,
          },
          {
            // 要求表单标签
            id: 'label',
            enabled: true,
          },
        ],
      },
    },
    // 响应式测试布局
    viewport: {
      viewports: {
        xs: {
          name: 'XS (320px)',
          styles: {
            width: '320px',
            height: '568px',
          },
        },
        sm: {
          name: 'SM (375px)',
          styles: {
            width: '375px',
            height: '667px',
          },
        },
        md: {
          name: 'MD (768px)',
          styles: {
            width: '768px',
            height: '1024px',
          },
        },
        lg: {
          name: 'LG (1024px)',
          styles: {
            width: '1024px',
            height: '768px',
          },
        },
        xl: {
          name: 'XL (1280px)',
          styles: {
            width: '1280px',
            height: '720px',
          },
        },
        '2xl': {
          name: '2XL (1536px)',
          styles: {
            width: '1536px',
            height: '864px',
          },
        },
      },
      defaultViewport: 'lg',
    },
  },
  // 全局装饰器
  decorators: [
    // 主题切换支持
    withThemeByDataAttribute({
      themes: {
        dark: 'dark',
        light: 'light',
      },
      defaultTheme: 'dark',
      attributeName: 'class',
    }),
    // 响应式测试布局装饰器
    (Story) => (
      <div style={{ padding: '24px', minHeight: '100vh', background: '#0a0f0d' }}>
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs', 'a11y'],
};

export default preview;
