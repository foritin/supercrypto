/**
 * ════════════════════════════════════════════════════════════════
 * CUSTOM ICONS - SuperCrypto 品牌专属图标系统
 * 用途: 替代 Ant Design 通用图标，建立独特视觉语言
 * 使用: <WalletIcon />, <StakingIcon />, <PortfolioIcon />
 * ════════════════════════════════════════════════════════════════
 */

import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

// ============================================
// Wallet Icon - 钱包图标
// 设计理念: 现代化数字钱包，带有动态渐变和光晕效果
// ============================================
export const WalletIcon: React.FC<IconProps> = ({
  size = 64,
  color = '#00D4AA',
  className = '',
  style,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
  >
    {/* 背景光晕 */}
    <defs>
      <radialGradient id="wallet-glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(32 32) rotate(90) scale(32)">
        <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
        <stop offset="100%" stopColor={color} stopOpacity="0"/>
      </radialGradient>
      <linearGradient id="wallet-gradient" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor={color}/>
        <stop offset="100%" stopColor={`${color}DD`}/>
      </linearGradient>
    </defs>

    {/* 光晕背景 */}
    <circle cx="32" cy="32" r="28" fill="url(#wallet-glow)" opacity="0.5"/>

    {/* 钱包外轮廓 */}
    <rect
      x="8"
      y="16"
      width="48"
      height="36"
      rx="8"
      fill="none"
      stroke="url(#wallet-gradient)"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* 钱包翻盖 */}
    <path
      d="M8 24C8 19.5817 11.5817 16 16 16H48C52.4183 16 56 19.5817 56 24V28H8V24Z"
      fill={`${color}15`}
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* 金币装饰 */}
    <circle cx="46" cy="32" r="6" fill={color} opacity="0.9"/>
    <circle cx="46" cy="32" r="3" fill="white" opacity="0.3"/>

    {/* 卡片装饰线 */}
    <line x1="16" y1="36" x2="32" y2="36" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
    <line x1="16" y1="42" x2="28" y2="42" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
  </svg>
);

// ============================================
// Staking Icon - 质押图标
// 设计理念: 增长、积累、收益，带有上升箭头和层叠效果
// ============================================
export const StakingIcon: React.FC<IconProps> = ({
  size = 64,
  color = '#FFD700',
  className = '',
  style,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
  >
    <defs>
      <linearGradient id="staking-gradient" x1="0" y1="64" x2="64" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor={color}/>
        <stop offset="100%" stopColor="#FFA500"/>
      </linearGradient>
      <linearGradient id="coin-gradient" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
        <stop offset="0%" stopColor={color} stopOpacity="0.9"/>
        <stop offset="100%" stopColor={color} stopOpacity="0.6"/>
      </linearGradient>
    </defs>

    {/* 背景光晕 */}
    <circle cx="32" cy="32" r="28" fill={color} opacity="0.08"/>

    {/* 底层金币堆叠 */}
    <ellipse cx="20" cy="48" rx="8" ry="4" fill="url(#coin-gradient)" opacity="0.4"/>
    <ellipse cx="32" cy="50" rx="8" ry="4" fill="url(#coin-gradient)" opacity="0.6"/>
    <ellipse cx="44" cy="48" rx="8" ry="4" fill="url(#coin-gradient)" opacity="0.8"/>

    {/* 中层金币 */}
    <ellipse cx="24" cy="42" rx="8" ry="4" fill="url(#coin-gradient)" opacity="0.6"/>
    <ellipse cx="36" cy="44" rx="8" ry="4" fill="url(#coin-gradient)" opacity="0.8"/>

    {/* 顶层金币 */}
    <ellipse cx="30" cy="36" rx="10" ry="5" fill={color} opacity="0.9"/>

    {/* 上升箭头 */}
    <path
      d="M32 16V38M32 16L26 22M32 16L38 22"
      stroke="url(#staking-gradient)"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />

    {/* 增长百分比符号 */}
    <text x="42" y="26" fill={color} fontSize="12" fontWeight="bold" opacity="0.8">%</text>
  </svg>
);

// ============================================
// Portfolio Icon - 投资组合图标
// 设计理念: 多元化、平衡、数据可视化，带有饼图和趋势线
// ============================================
export const PortfolioIcon: React.FC<IconProps> = ({
  size = 64,
  color = '#1890ff',
  className = '',
  style,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
  >
    <defs>
      <linearGradient id="portfolio-gradient-1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={color}/>
        <stop offset="100%" stopColor={`${color}CC`}/>
      </linearGradient>
      <linearGradient id="portfolio-gradient-2" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#00D4AA"/>
        <stop offset="100%" stopColor="#00A08C"/>
      </linearGradient>
      <linearGradient id="portfolio-gradient-3" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FFD700"/>
        <stop offset="100%" stopColor="#FFA500"/>
      </linearGradient>
    </defs>

    {/* 背景光晕 */}
    <circle cx="32" cy="32" r="28" fill={color} opacity="0.08"/>

    {/* 饼图 - 扇区1 (40%) */}
    <path
      d="M32 32L32 16A16 16 0 0 1 45.86 23.5Z"
      fill="url(#portfolio-gradient-1)"
      opacity="0.9"
    />

    {/* 饼图 - 扇区2 (35%) */}
    <path
      d="M32 32L45.86 23.5A16 16 0 0 1 43.5 43.5Z"
      fill="url(#portfolio-gradient-2)"
      opacity="0.85"
    />

    {/* 饼图 - 扇区3 (25%) */}
    <path
      d="M32 32L43.5 43.5A16 16 0 0 1 32 16Z"
      fill="url(#portfolio-gradient-3)"
      opacity="0.8"
    />

    {/* 中心圆 - 创造环形图效果 */}
    <circle cx="32" cy="32" r="8" fill="rgba(26, 26, 46, 0.95)"/>

    {/* 趋势线 */}
    <path
      d="M12 48L20 44L28 46L36 40L44 42L52 36"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.6"
      fill="none"
    />

    {/* 趋势点 */}
    <circle cx="20" cy="44" r="2" fill={color} opacity="0.8"/>
    <circle cx="28" cy="46" r="2" fill="#00D4AA" opacity="0.8"/>
    <circle cx="36" cy="40" r="2" fill="#FFD700" opacity="0.8"/>
    <circle cx="44" cy="42" r="2" fill={color} opacity="0.8"/>
  </svg>
);
