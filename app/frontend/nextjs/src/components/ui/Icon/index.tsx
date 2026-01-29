'use client';

import { LucideIcon, icons } from 'lucide-react';
import { cn } from '@/utils/cn';
import { iconSizes, type IconVariant } from '@/utils/icon-mapping';
import { motion } from 'framer-motion';

interface IconProps {
  name: keyof typeof icons;
  size?: 'small' | 'default' | 'medium' | 'large' | 'xlarge' | 'xxlarge' | number;
  className?: string;
  variant?: IconVariant;
  ariaLabel?: string;
  animated?: boolean;
  onClick?: () => void;
}

/**
 * ════════════════════════════════════════════════════════════════
 * Unified Icon Component - 统一图标组件
 *
 * 替代 @ant-design/icons，使用 lucide-react
 * 支持统一的尺寸、颜色、动画和无障碍属性
 * ════════════════════════════════════════════════════════════════
 *
 * @example
 * // 基础用法
 * <Icon name="home" size="large" variant="gold" />
 *
 * // 带动画
 * <Icon name="wallet" size="default" variant="cyan" animated />
 *
 * // 可点击
 * <Icon name="settings" size="large" onClick={handleClick} />
 */
export function Icon({
  name,
  size = 'default',
  className,
  variant = 'default',
  ariaLabel,
  animated = false,
  onClick,
}: IconProps) {
  const LucideIcon = icons[name] as LucideIcon;

  if (!LucideIcon) {
    console.warn(`Icon "${name}" not found in lucide-react`);
    return null;
  }

  const pixelSize = typeof size === 'number' ? size : iconSizes[size];

  const variantStyles: Record<IconVariant, string> = {
    gold: 'text-[#c9a962]',
    cyan: 'text-[#00d4aa]',
    default: 'text-current',
    inherit: 'text-inherit',
    white: 'text-white',
    gray: 'text-gray-400',
  };

  const baseClassName = cn(
    variantStyles[variant],
    onClick && 'cursor-pointer transition-transform hover:scale-110 active:scale-95',
    className
  );

  const iconElement = (
    <LucideIcon
      width={pixelSize}
      height={pixelSize}
      className={baseClassName}
      aria-label={ariaLabel}
      aria-hidden={!ariaLabel}
      onClick={onClick}
    />
  );

  if (animated) {
    return (
      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        {iconElement}
      </motion.div>
    );
  }

  return iconElement;
}

// 预设组合 - 常用图标快捷方式
export const IconPresets = {
  Home: (props: Omit<IconProps, 'name'>) => <Icon name="House" {...props} />,
  Settings: (props: Omit<IconProps, 'name'>) => <Icon name="Settings" {...props} />,
  Wallet: (props: Omit<IconProps, 'name'>) => <Icon name="Wallet" {...props} />,
  Bank: (props: Omit<IconProps, 'name'>) => <Icon name="Landmark" {...props} />,
  Rocket: (props: Omit<IconProps, 'name'>) => <Icon name="Rocket" {...props} />,
  Flame: (props: Omit<IconProps, 'name'>) => <Icon name="Flame" {...props} />,
  FileText: (props: Omit<IconProps, 'name'>) => <Icon name="FileText" {...props} />,
  BarChart: (props: Omit<IconProps, 'name'>) => <Icon name="ChartBar" {...props} />,
  Refresh: (props: Omit<IconProps, 'name'>) => <Icon name="RefreshCw" {...props} />,
  User: (props: Omit<IconProps, 'name'>) => <Icon name="User" {...props} />,
  Globe: (props: Omit<IconProps, 'name'>) => <Icon name="Globe" {...props} />,
  GitHub: (props: Omit<IconProps, 'name'>) => <Icon name="Github" {...props} />,
  Twitter: (props: Omit<IconProps, 'name'>) => <Icon name="Twitter" {...props} />,
};
