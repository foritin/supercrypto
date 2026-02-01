import { addons } from '@storybook/manager-api';
import { create } from '@storybook/theming';

const theme = create({
  base: 'dark',
  brandTitle: 'SuperCrypto Design System',
  brandUrl: 'https://supercrypto.com',
  brandImage: undefined,
  brandTarget: '_self',
  
  // Color palette matching SuperCrypto design system
  colorPrimary: '#00D4AA',
  colorSecondary: '#6366F1',
  
  // UI colors
  appBg: '#0A0F0D',
  appContentBg: '#111815',
  appBorderColor: 'rgba(255, 255, 255, 0.08)',
  appBorderRadius: 8,
  
  // Typography
  fontBase: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
  fontCode: '"JetBrains Mono", monospace',
  
  // Text colors
  textColor: 'rgba(255, 255, 255, 0.95)',
  textInverseColor: '#0A0F0D',
  textMutedColor: 'rgba(255, 255, 255, 0.60)',
  
  // Toolbar
  barTextColor: 'rgba(255, 255, 255, 0.70)',
  barSelectedColor: '#00D4AA',
  barBg: '#111815',
  
  // Form colors
  inputBg: 'rgba(0, 0, 0, 0.3)',
  inputBorder: 'rgba(255, 255, 255, 0.1)',
  inputTextColor: 'rgba(255, 255, 255, 0.95)',
  inputBorderRadius: 8,
});

addons.setConfig({
  theme,
  sidebar: {
    showRoots: true,
  },
  toolbar: {
    title: { hidden: false },
    zoom: { hidden: false },
    eject: { hidden: false },
    copy: { hidden: false },
    fullscreen: { hidden: false },
  },
});
