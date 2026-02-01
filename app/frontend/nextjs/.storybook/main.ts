import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';
import path from 'path';

const config: StorybookConfig = {
  stories: [
    '../../../../stories/**/*.mdx',
    '../../../../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../src/components/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
    '@storybook/addon-viewport',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  staticDirs: ['../public'],
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
    },
  },
  async viteFinal(config) {
    return mergeConfig(config, {
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '../src'),
          // 确保外部 stories 文件能找到 node_modules 中的依赖
          'lucide-react': path.resolve(__dirname, '../node_modules/lucide-react'),
          'react': path.resolve(__dirname, '../node_modules/react'),
          'react-dom': path.resolve(__dirname, '../node_modules/react-dom'),
          'framer-motion': path.resolve(__dirname, '../node_modules/framer-motion'),
          'class-variance-authority': path.resolve(__dirname, '../node_modules/class-variance-authority'),
          'clsx': path.resolve(__dirname, '../node_modules/clsx'),
          'tailwind-merge': path.resolve(__dirname, '../node_modules/tailwind-merge'),
        },
      },
    });
  },
};

export default config;
