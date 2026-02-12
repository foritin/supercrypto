/**
 * ════════════════════════════════════════════════════════════════
 * EMPTY STATE ILLUSTRATIONS - 空状态插图系统
 * 用途: 当用户数据为空时展示友好的提示插图
 * 使用: <NoAssetsIllustration />, <NoTransactionsIllustration />
 * ════════════════════════════════════════════════════════════════
 */

import React from 'react';

interface IllustrationProps {
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}

// ============================================
// No Assets Illustration - 无资产插图
// 场景: 用户钱包中没有任何资产时
// ============================================
export const NoAssetsIllustration: React.FC<IllustrationProps> = ({
  width = 320,
  height = 240,
  className = '',
  style,
}) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 320 240"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
  >
    <defs>
      <linearGradient id="empty-wallet-grad" x1="0" y1="0" x2="320" y2="240">
        <stop offset="0%" stopColor="#00D4AA" stopOpacity="0.2"/>
        <stop offset="100%" stopColor="#00D4AA" stopOpacity="0"/>
      </linearGradient>
      <linearGradient id="coin-gold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFD700"/>
        <stop offset="100%" stopColor="#FFA500"/>
      </linearGradient>
    </defs>

    {/* 背景圆形装饰 */}
    <circle cx="160" cy="120" r="80" fill="url(#empty-wallet-grad)" opacity="0.5"/>
    <circle cx="100" cy="80" r="30" fill="#00D4AA" opacity="0.05"/>
    <circle cx="240" cy="160" r="40" fill="#FFD700" opacity="0.05"/>

    {/* 主钱包轮廓 */}
    <rect
      x="80"
      y="80"
      width="160"
      height="100"
      rx="12"
      fill="rgba(255, 255, 255, 0.03)"
      stroke="#00D4AA"
      strokeWidth="2"
      strokeDasharray="8 4"
      opacity="0.6"
    />

    {/* 钱包翻盖 */}
    <path
      d="M80 100C80 89.5066 88.5066 81 99 81H221C231.493 81 240 89.5066 240 100V110H80V100Z"
      fill="rgba(0, 212, 170, 0.08)"
      stroke="#00D4AA"
      strokeWidth="1.5"
      opacity="0.4"
    />

    {/* 虚线金币 - 表示"空" */}
    <ellipse cx="180" cy="135" rx="18" ry="9" fill="none" stroke="#FFD700" strokeWidth="2" strokeDasharray="4 2" opacity="0.5"/>

    {/* 问号 - 表示不确定/空 */}
    <text x="172" y="142" fill="#FFD700" fontSize="20" fontWeight="bold" opacity="0.4">
      ?
    </text>

    {/* 浮动的小元素装饰 */}
    <circle cx="60" cy="60" r="4" fill="#00D4AA" opacity="0.3"/>
    <circle cx="280" cy="180" r="6" fill="#FFD700" opacity="0.2"/>
    <circle cx="120" cy="200" r="3" fill="#1890ff" opacity="0.3"/>
  </svg>
);

// ============================================
// No Transactions Illustration - 无交易记录插图
// 场景: 用户没有任何交易历史时
// ============================================
export const NoTransactionsIllustration: React.FC<IllustrationProps> = ({
  width = 320,
  height = 240,
  className = '',
  style,
}) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 320 240"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
  >
    <defs>
      <linearGradient id="transaction-grad" x1="0" y1="0" x2="320" y2="240">
        <stop offset="0%" stopColor="#1890ff" stopOpacity="0.15"/>
        <stop offset="100%" stopColor="#1890ff" stopOpacity="0"/>
      </linearGradient>
    </defs>

    {/* 背景装饰 */}
    <circle cx="160" cy="120" r="70" fill="url(#transaction-grad)" opacity="0.6"/>

    {/* 文档列表轮廓 */}
    <rect x="90" y="60" width="140" height="120" rx="8" fill="rgba(255, 255, 255, 0.02)" stroke="#1890ff" strokeWidth="2" opacity="0.5"/>

    {/* 虚线行 - 表示无数据 */}
    <line x1="110" y1="90" x2="200" y2="90" stroke="#1890ff" strokeWidth="2" strokeDasharray="6 3" opacity="0.3"/>
    <line x1="110" y1="115" x2="210" y2="115" stroke="#1890ff" strokeWidth="2" strokeDasharray="6 3" opacity="0.3"/>
    <line x1="110" y1="140" x2="180" y2="140" stroke="#1890ff" strokeWidth="2" strokeDasharray="6 3" opacity="0.3"/>
    <line x1="110" y1="165" x2="190" y2="165" stroke="#1890ff" strokeWidth="2" strokeDasharray="6 3" opacity="0.3"/>

    {/* 时钟图标 - 表示"等待中" */}
    <circle cx="160" cy="120" r="16" fill="rgba(24, 144, 255, 0.1)" stroke="#1890ff" strokeWidth="2"/>
    <path d="M160 112V120H168" stroke="#1890ff" strokeWidth="2" strokeLinecap="round" fill="none"/>

    {/* 装饰点 */}
    <circle cx="70" cy="90" r="5" fill="#00D4AA" opacity="0.3"/>
    <circle cx="260" cy="150" r="4" fill="#FFD700" opacity="0.3"/>
    <circle cx="100" cy="200" r="3" fill="#1890ff" opacity="0.4"/>
  </svg>
);

// ============================================
// No Staking Illustration - 无质押资产插图
// 场景: 用户未参与任何质押时
// ============================================
export const NoStakingIllustration: React.FC<IllustrationProps> = ({
  width = 320,
  height = 240,
  className = '',
  style,
}) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 320 240"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
  >
    <defs>
      <linearGradient id="staking-grad" x1="0" y1="0" x2="320" y2="240">
        <stop offset="0%" stopColor="#FFD700" stopOpacity="0.2"/>
        <stop offset="100%" stopColor="#FFD700" stopOpacity="0"/>
      </linearGradient>
    </defs>

    {/* 背景装饰 */}
    <circle cx="160" cy="120" r="75" fill="url(#staking-grad)" opacity="0.5"/>

    {/* 虚线金币堆 - 表示"空" */}
    <ellipse cx="140" cy="150" rx="25" ry="10" fill="none" stroke="#FFD700" strokeWidth="2" strokeDasharray="5 3" opacity="0.4"/>
    <ellipse cx="160" cy="145" rx="25" ry="10" fill="none" stroke="#FFD700" strokeWidth="2" strokeDasharray="5 3" opacity="0.5"/>
    <ellipse cx="180" cy="140" rx="25" ry="10" fill="none" stroke="#FFD700" strokeWidth="2" strokeDasharray="5 3" opacity="0.6"/>

    {/* 上升箭头 - 虚线表示未激活 */}
    <path
      d="M160 70V120M160 70L150 80M160 70L170 80"
      stroke="#FFD700"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray="8 4"
      opacity="0.5"
      fill="none"
    />

    {/* 加号 - 表示"添加" */}
    <circle cx="160" cy="120" r="14" fill="rgba(255, 215, 0, 0.1)" stroke="#FFD700" strokeWidth="2"/>
    <path d="M160 113V127M153 120H167" stroke="#FFD700" strokeWidth="2" strokeLinecap="round"/>

    {/* 装饰元素 */}
    <circle cx="80" cy="70" r="4" fill="#FFD700" opacity="0.3"/>
    <circle cx="250" cy="180" r="5" fill="#00D4AA" opacity="0.3"/>
    <circle cx="120" cy="210" r="3" fill="#1890ff" opacity="0.3"/>
  </svg>
);
