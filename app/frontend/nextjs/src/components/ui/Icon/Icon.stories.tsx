import type { Meta, StoryObj } from '@storybook/react';
import { Icon } from './index';

/**
 * ════════════════════════════════════════════════════════════════
 * Icon Component Stories
 *
 * 展示统一图标组件的各种用法
 * - 尺寸变体
 * - 颜色变体
 * - 动画选项
 * - 无障碍属性
 * ════════════════════════════════════════════════════════════════
 */

const meta: Meta<typeof Icon> = {
  title: 'UI/Icon',
  component: Icon,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
统一图标组件，支持 lucide-react 图标库。

**主要功能：**
- 尺寸变体：small, default, medium, large, xlarge, xxlarge
- 颜色变体：gold, cyan, default, inherit, white, gray
- 可选动画：图标旋转动画
- 无障碍：自动添加 aria-label

**用法示例：**
\`\`\`tsx
import { Icon } from '@/components/ui/Icon';

// 基础用法
<Icon name="Home" size="default" variant="cyan" />

// 带动画
<Icon name="RefreshCw" size="large" variant="gold" animated />

// 可点击
<Icon name="Settings" size="medium" onClick={handleClick} ariaLabel="打开设置" />
\`\`\`
        `,
      },
    },
  },
  tags: ['autodocs', 'a11y'],
  argTypes: {
    name: {
      control: 'select',
      description: '图标名称（来自 lucide-react）',
      options: [
        'Home',
        'Settings',
        'Wallet',
        'User',
        'Search',
        'Menu',
        'X',
        'ChevronDown',
        'ArrowRight',
        'Check',
        'XCircle',
        'CheckCircle',
        'AlertCircle',
        'Info',
        'Loader2',
        'RefreshCw',
        'LogOut',
        'ShieldCheck',
        'FileText',
        'Image',
        'Video',
        'Download',
        'Upload',
      ],
    },
    size: {
      control: 'select',
      description: '图标尺寸',
      options: ['small', 'default', 'medium', 'large', 'xlarge', 'xxlarge'],
    },
    variant: {
      control: 'select',
      description: '颜色变体',
      options: ['gold', 'cyan', 'default', 'inherit', 'white', 'gray'],
    },
    animated: {
      control: 'boolean',
      description: '是否启用旋转动画',
    },
    ariaLabel: {
      control: 'text',
      description: '无障碍标签（重要）',
    },
    onClick: {
      action: 'clicked',
      description: '点击事件',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Icon>;

/**
 * 默认状态 - 展示默认尺寸和颜色
 */
export const Default: Story = {
  args: {
    name: 'House',
    size: 'default',
    variant: 'default',
  },
};

/**
 * 尺寸变体 - 展示所有可用尺寸
 */
export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <Icon name="House" size="small" variant="cyan" ariaLabel="小图标" />
      <Icon name="House" size="default" variant="cyan" ariaLabel="默认图标" />
      <Icon name="House" size="medium" variant="cyan" ariaLabel="中等图标" />
      <Icon name="House" size="large" variant="cyan" ariaLabel="大图标" />
      <Icon name="House" size="xlarge" variant="cyan" ariaLabel="超大图标" />
      <Icon name="House" size="xxlarge" variant="cyan" ariaLabel="特大图标" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '展示了所有可用的图标尺寸选项。',
      },
    },
  },
};

/**
 * 颜色变体 - 展示所有可用颜色
 */
export const Colors: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <Icon name="CircleCheck" size="large" variant="gold" ariaLabel="金色检查" />
      <Icon name="CircleCheck" size="large" variant="cyan" ariaLabel="青色检查" />
      <Icon name="CircleCheck" size="large" variant="default" ariaLabel="默认检查" />
      <Icon name="CircleCheck" size="large" variant="inherit" ariaLabel="继承检查" />
      <Icon name="CircleCheck" size="large" variant="white" ariaLabel="白色检查" />
      <Icon name="CircleCheck" size="large" variant="gray" ariaLabel="灰色检查" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '展示了所有可用的颜色变体，对应设计系统的 Gold 和 Cyan 主题色。',
      },
    },
  },
};

/**
 * 常用图标 - 展示项目中常用的图标组合
 */
export const CommonIcons: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '16px' }}>
      <Icon name="House" size="large" variant="cyan" ariaLabel="首页" />
      <Icon name="Settings" size="large" variant="default" ariaLabel="设置" />
      <Icon name="Wallet" size="large" variant="gold" ariaLabel="钱包" />
      <Icon name="User" size="large" variant="cyan" ariaLabel="用户" />
      <Icon name="Search" size="large" variant="default" ariaLabel="搜索" />
      <Icon name="Menu" size="large" variant="gold" ariaLabel="菜单" />
      <Icon name="X" size="large" variant="default" ariaLabel="关闭" />
      <Icon name="ChevronDown" size="large" variant="cyan" ariaLabel="下拉" />
      <Icon name="ArrowRight" size="large" variant="gold" ariaLabel="继续" />
      <Icon name="Check" size="large" variant="cyan" ariaLabel="确认" />
      <Icon name="LogOut" size="large" variant="default" ariaLabel="登出" />
      <Icon name="ShieldCheck" size="large" variant="gold" ariaLabel="安全" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '展示 SuperCrypto 项目中最常用的图标，采用 Gold (#c9a962) 和 Cyan (#00d4aa) 主题色。',
      },
    },
  },
};

/**
 * 状态图标 - 展示各种状态和反馈图标
 */
export const StatusIcons: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '16px' }}>
      <Icon name="CircleCheck" size="xlarge" variant="cyan" ariaLabel="成功" />
      <Icon name="CircleX" size="xlarge" variant="default" ariaLabel="错误" />
      <Icon name="CircleAlert" size="xlarge" variant="gold" ariaLabel="警告" />
      <Icon name="Info" size="xlarge" variant="cyan" ariaLabel="信息" />
      <Icon name="LoaderCircle" size="xlarge" variant="gold" animated ariaLabel="加载中" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '展示用于状态反馈和系统消息的图标。LoaderCircle 带有旋转动画，用于加载状态。',
      },
    },
  },
};

/**
 * 动画图标 - 展示带动画的图标
 */
export const AnimatedIcons: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
      <Icon name="LoaderCircle" size="xlarge" variant="gold" animated ariaLabel="加载中" />
      <Icon name="RefreshCw" size="xlarge" variant="cyan" animated ariaLabel="刷新" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '展示带旋转动画的图标，适用于加载状态和刷新操作。',
      },
    },
  },
};

/**
 * 可点击图标 - 展示交互式图标
 */
export const InteractiveIcons: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <Icon
        name="Settings"
        size="large"
        variant="default"
        ariaLabel="打开设置"
      />
      <Icon
        name="LogOut"
        size="large"
        variant="gold"
        ariaLabel="登出"
      />
      <Icon
        name="RefreshCw"
        size="large"
        variant="cyan"
        ariaLabel="刷新数据"
        animated
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '可点击的图标，用于触发操作。注意：这些图标在 Storybook 中只是视觉展示，实际点击事件需要在应用中处理。',
      },
    },
  },
};

/**
 * 深色模式 - 展示在深色背景下的表现
 */
export const DarkMode: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <Icon name="House" size="large" variant="gold" ariaLabel="首页" />
      <Icon name="Wallet" size="large" variant="cyan" ariaLabel="钱包" />
      <Icon name="Settings" size="large" variant="default" ariaLabel="设置" />
      <Icon name="User" size="large" variant="white" ariaLabel="用户" />
    </div>
  ),
  parameters: {
    backgrounds: {
      default: 'dark',
    },
    docs: {
      description: {
        story: '展示图标在深色背景（SuperCrypto 主题）下的表现。使用 Gold 和 Cyan 变体获得最佳视觉效果。',
      },
    },
  },
};

/**
 * 无障碍测试 - 确保所有图标都有适当的 aria-label
 */
export const Accessibility: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '16px' }}>
      <Icon name="House" size="large" variant="cyan" ariaLabel="返回首页" />
      <Icon name="Wallet" size="large" variant="gold" ariaLabel="连接钱包" />
      <Icon name="Settings" size="large" variant="default" ariaLabel="打开设置" />
      <Icon name="User" size="large" variant="cyan" ariaLabel="用户资料" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '**无障碍要求：** 所有装饰性图标应使用 `aria-hidden="true"`，功能性图标必须提供描述性的 `ariaLabel`。此示例中的所有图标都有适当的标签。',
      },
    },
  },
};
