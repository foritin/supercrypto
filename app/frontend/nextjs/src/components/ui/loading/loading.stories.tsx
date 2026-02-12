import type { Meta, StoryObj } from '@storybook/react';
import { Loading, Skeleton, DashboardSkeleton } from './index';

/**
 * ════════════════════════════════════════════════════════════════
 * Loading Component Stories
 *
 * 展示加载状态和骨架屏组件
 * - 不同尺寸的加载器
 * - 颜色变体（Gold/Cyan）
 * - 骨架屏占位符
 * - 仪表板专用骨架屏
 * ════════════════════════════════════════════════════════════════
 */

const meta: Meta<typeof Loading> = {
  title: 'UI/Loading',
  component: Loading,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
统一的加载状态组件，提供更好的感知性能。

**主要功能：**
- 旋转加载指示器
- 骨架屏占位符
- 预配置的仪表板骨架屏
- 颜色变体：gold, cyan, default

**用法示例：**
\`\`\`tsx
import { Loading, Skeleton, DashboardSkeleton } from '@/components/ui/loading';

// 旋转加载器
<Loading variant="cyan" text="加载中..." />

// 骨架屏
<Skeleton className="h-32 w-full" variant="gold" />

// 仪表板骨架屏
<DashboardSkeleton />
\`\`\`
        `,
      },
    },
  },
  tags: ['autodocs', 'a11y'],
  argTypes: {
    size: {
      control: 'select',
      description: '加载器尺寸',
      options: ['small', 'default', 'large'],
    },
    variant: {
      control: 'select',
      description: '颜色变体',
      options: ['gold', 'cyan', 'default'],
    },
    text: {
      control: 'text',
      description: '加载提示文本',
    },
    fullscreen: {
      control: 'boolean',
      description: '是否全屏显示',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Loading>;

/**
 * 默认状态 - 展示默认加载器
 */
export const Default: Story = {
  args: {
    size: 'default',
    variant: 'cyan',
  },
};

/**
 * 尺寸变体 - 展示所有可用尺寸
 */
export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
      <Loading size="small" variant="cyan" />
      <Loading size="default" variant="cyan" />
      <Loading size="large" variant="cyan" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '展示了小、默认、大三种尺寸的加载器。',
      },
    },
  },
};

/**
 * 颜色变体 - 展示所有可用颜色
 */
export const Colors: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
      <Loading variant="gold" />
      <Loading variant="cyan" />
      <Loading variant="default" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '展示了 Gold（金色）、Cyan（青色）和 Default（白色）三种颜色变体，对应 SuperCrypto 的设计系统。',
      },
    },
  },
};

/**
 * 带文本 - 展示带提示文本的加载器
 */
export const WithText: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Loading variant="cyan" text="加载中..." />
      <Loading variant="gold" text="请稍候..." />
      <Loading variant="default" text="处理中..." />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '展示带文本提示的加载状态，为用户提供更好的上下文信息。',
      },
    },
  },
};

/**
 * 全屏加载 - 展示全屏加载遮罩
 */
export const Fullscreen: Story = {
  args: {
    size: 'large',
    variant: 'gold',
    text: '正在加载...',
    fullscreen: true,
  },
  parameters: {
    docs: {
      description: {
        story: '全屏加载遮罩，用于页面级加载状态。注意：在 Storybook 中这会覆盖整个预览区域。',
      },
    },
  },
};

/**
 * 骨架屏基础 - 展示基础骨架屏用法
 */
export const BasicSkeleton: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '300px' }}>
      <Skeleton className="h-4 w-3/4" variant="gold" />
      <Skeleton className="h-4 w-1/2" variant="cyan" />
      <Skeleton className="h-32 w-full" variant="default" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '基础骨架屏占位符，用于内容加载时的占位显示。可以组合使用不同尺寸和颜色的骨架屏。',
      },
    },
  },
};

/**
 * 仪表板骨架屏 - 展示预配置的仪表板加载状态
 */
export const Dashboard: Story = {
  render: () => <DashboardSkeleton />,
  parameters: {
    docs: {
      description: {
        story: '预配置的仪表板骨架屏，包括统计卡片、图表和列表的占位符。在数据加载时提供更好的感知性能。',
      },
    },
  },
};

/**
 * 卡片加载 - 展示卡片内的加载状态
 */
export const CardLoading: Story = {
  render: () => (
    <div
      style={{
        background: 'rgba(17, 25, 22, 0.8)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '24px',
        width: '300px',
      }}
    >
      <div style={{ marginBottom: '16px' }}>
        <Skeleton className="h-6 w-32 mb-4" variant="gold" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
        <Loading variant="cyan" text="加载中..." />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '展示卡片内的加载状态，结合骨架屏和旋转加载器，提供完整的加载体验。',
      },
    },
  },
};

/**
 * 无障碍 - 加载状态的无障碍支持
 */
export const Accessibility: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Loading variant="cyan" text="正在加载数据..." />
      <Skeleton className="h-4 w-48" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '**无障碍支持：**\n- Loading 组件使用 `role="status"` 和 `aria-live="polite"` 通知屏幕阅读器\n- 骨架屏内置 `aria-label="加载中"` 和 `sr-only` 文本',
      },
    },
  },
};
