import type { Preview } from '@storybook/react';
import React from 'react';
import '../app/frontend/nextjs/src/app/globals.css';

// Glassmorphism background for all stories
const GlassmorphismBackground = ({ children }: { children: React.ReactNode }) => (
  <div 
    className="min-h-screen p-8"
    style={{ 
      background: '#0A0F0D',
      backgroundImage: `
        radial-gradient(circle at 20% 50%, rgba(0, 212, 170, 0.03) 0%, transparent 50%),
        radial-gradient(circle at 80% 80%, rgba(99, 102, 241, 0.03) 0%, transparent 50%)
      `,
    }}
  >
    {children}
  </div>
);

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    backgrounds: {
      default: 'dark',
      values: [
        {
          name: 'dark',
          value: '#0A0F0D',
        },
        {
          name: 'elevated',
          value: '#111815',
        },
        {
          name: 'light',
          value: '#ffffff',
        },
      ],
    },
    viewport: {
      viewports: {
        desktop: {
          name: 'Desktop',
          styles: {
            width: '1280px',
            height: '800px',
          },
        },
        tablet: {
          name: 'Tablet',
          styles: {
            width: '768px',
            height: '1024px',
          },
        },
        mobile: {
          name: 'Mobile',
          styles: {
            width: '375px',
            height: '667px',
          },
        },
      },
    },
    docs: {
      story: {
        inline: true,
      },
    },
  },
  decorators: [
    (Story) => (
      <GlassmorphismBackground>
        <Story />
      </GlassmorphismBackground>
    ),
  ],
  tags: ['autodocs'],
};

export default preview;
