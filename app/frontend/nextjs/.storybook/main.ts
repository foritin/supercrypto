import type { StorybookConfig } from '@storybook/nextjs';

const config: StorybookConfig = {
  stories: [
    '../src/**/*.mdx',
    '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-onboarding',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y', // 无障碍测试插件
    '@storybook/addon-themes', // 主题切换插件
  ],
  framework: {
    name: '@storybook/nextjs',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  // TypeScript 配置
  typescript: {
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => {
        return prop.parent ? !/node_modules/.test(prop.parent.fileName) : true;
      },
    },
  },
  // Webpack 配置扩展
  webpackFinal: async (config) => {
    // 处理绝对路径导入
    config.resolve = {
      ...config.resolve,
      alias: {
        ...config.resolve.alias,
        '@': '/home/rex/project/mix/SuperCrypto/app/frontend/nextjs/src',
      },
    };
    return config;
  },
};

export default config;
