/**
 * ════════════════════════════════════════════════════════════════
 * ERROR PAGE ILLUSTRATIONS - 错误页面插图系统
 * 用途: 当发生错误时展示友好的提示插图，降低用户挫败感
 * 使用: <Error404Illustration />, <Error500Illustration />, <NetworkErrorIllustration />
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
// 404 Error Illustration - 页面未找到
// 场景: 用户访问不存在的页面时
// ============================================
export const Error404Illustration: React.FC<IllustrationProps> = ({
  width = 400,
  height = 300,
  className = '',
  style,
}) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 400 300"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
  >
    <defs>
      <linearGradient id="error404-grad" x1="0" y1="0" x2="400" y2="300">
        <stop offset="0%" stopColor="#ff6b6b" stopOpacity="0.15"/>
        <stop offset="100%" stopColor="#ff6b6b" stopOpacity="0"/>
      </linearGradient>
      <filter id="glow-404">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>

    {/* 背景装饰 */}
    <circle cx="200" cy="150" r="100" fill="url(#error404-grad)" opacity="0.6"/>
    <circle cx="80" cy="80" r="30" fill="#ff6b6b" opacity="0.05"/>
    <circle cx="340" cy="220" r="40" fill="#ff6b6b" opacity="0.05"/>

    {/* 大号 404 文字 */}
    <text
      x="200"
      y="180"
      fontSize="120"
      fontWeight="bold"
      fill="none"
      stroke="#ff6b6b"
      strokeWidth="3"
      strokeDasharray="10 5"
      opacity="0.4"
      textAnchor="middle"
      filter="url(#glow-404)"
    >
      404
    </text>

    {/* 放大镜 - 表示"搜索" */}
    <circle cx="280" cy="100" r="25" fill="rgba(255, 255, 255, 0.02)" stroke="#ff6b6b" strokeWidth="2.5" opacity="0.5"/>
    <line x1="298" y1="118" x2="320" y2="140" stroke="#ff6b6b" strokeWidth="3" strokeLinecap="round" opacity="0.5"/>

    {/* 问号 */}
    <text x="190" y="175" fill="#ff6b6b" fontSize="24" fontWeight="bold" opacity="0.3">
      ?
    </text>

    {/* 装饰性断裂线条 */}
    <path d="M50 250L100 240M320 260L370 250" stroke="#ff6b6b" strokeWidth="2" strokeDasharray="8 4" opacity="0.2"/>
  </svg>
);

// ============================================
// 500 Error Illustration - 服务器错误
// 场景: 服务器内部错误时
// ============================================
export const Error500Illustration: React.FC<IllustrationProps> = ({
  width = 400,
  height = 300,
  className = '',
  style,
}) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 400 300"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
  >
    <defs>
      <linearGradient id="error500-grad" x1="0" y1="0" x2="400" y2="300">
        <stop offset="0%" stopColor="#1890ff" stopOpacity="0.15"/>
        <stop offset="100%" stopColor="#1890ff" stopOpacity="0"/>
      </linearGradient>
    </defs>

    {/* 背景装饰 */}
    <circle cx="200" cy="150" r="90" fill="url(#error500-grad)" opacity="0.5"/>

    {/* 服务器机架 */}
    <rect x="120" y="80" width="160" height="140" rx="8" fill="rgba(24, 144, 255, 0.05)" stroke="#1890ff" strokeWidth="2" opacity="0.5"/>

    {/* 服务器单元 - 显示错误状态 */}
    <rect x="135" y="95" width="130" height="25" rx="4" fill="rgba(24, 144, 255, 0.08)" stroke="#1890ff" strokeWidth="1.5" opacity="0.4"/>
    <circle cx="150" cy="107.5" r="4" fill="#ff6b6b" opacity="0.6"/> {/* 红灯 = 错误 */}

    <rect x="135" y="130" width="130" height="25" rx="4" fill="rgba(24, 144, 255, 0.08)" stroke="#1890ff" strokeWidth="1.5" opacity="0.4"/>
    <circle cx="150" cy="142.5" r="4" fill="#ff6b6b" opacity="0.6"/>

    <rect x="135" y="165" width="130" height="25" rx="4" fill="rgba(24, 144, 255, 0.08)" stroke="#1890ff" strokeWidth="1.5" opacity="0.4"/>
    <circle cx="150" cy="177.5" r="4" fill="#ff6b6b" opacity="0.6"/>

    {/* 警告三角形 */}
    <path
      d="M200 50L220 85H180L200 50Z"
      fill="rgba(255, 107, 107, 0.1)"
      stroke="#ff6b6b"
      strokeWidth="2"
      opacity="0.6"
    />
    <text x="200" y="78" fill="#ff6b6b" fontSize="16" fontWeight="bold" textAnchor="middle" opacity="0.6">!</text>

    {/* 装饰元素 */}
    <circle cx="80" cy="100" r="5" fill="#1890ff" opacity="0.3"/>
    <circle cx="330" cy="200" r="4" fill="#ff6b6b" opacity="0.3"/>
  </svg>
);

// ============================================
// Network Error Illustration - 网络错误
// 场景: 网络连接失败时
// ============================================
export const NetworkErrorIllustration: React.FC<IllustrationProps> = ({
  width = 400,
  height = 300,
  className = '',
  style,
}) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 400 300"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
  >
    <defs>
      <linearGradient id="network-error-grad" x1="0" y1="0" x2="400" y2="300">
        <stop offset="0%" stopColor="#FFD700" stopOpacity="0.2"/>
        <stop offset="100%" stopColor="#FFD700" stopOpacity="0"/>
      </linearGradient>
    </defs>

    {/* 背景装饰 */}
    <circle cx="200" cy="150" r="85" fill="url(#network-error-grad)" opacity="0.5"/>

    {/* 断开的连接线 */}
    <path d="M100 150L170 150" stroke="#FFD700" strokeWidth="3" strokeDasharray="8 4" opacity="0.4"/>
    <path d="M230 150L300 150" stroke="#FFD700" strokeWidth="3" strokeDasharray="8 4" opacity="0.4"/>

    {/* 左侧节点 */}
    <circle cx="100" cy="150" r="20" fill="rgba(255, 215, 0, 0.1)" stroke="#FFD700" strokeWidth="2.5" opacity="0.6"/>
    <circle cx="100" cy="150" r="8" fill="#FFD700" opacity="0.4"/>

    {/* 右侧节点 */}
    <circle cx="300" cy="150" r="20" fill="rgba(255, 215, 0, 0.1)" stroke="#FFD700" strokeWidth="2.5" opacity="0.6"/>
    <circle cx="300" cy="150" r="8" fill="#FFD700" opacity="0.4"/>

    {/* 中间断开处 - X 标记 */}
    <circle cx="200" cy="150" r="25" fill="rgba(255, 107, 107, 0.1)" stroke="#ff6b6b" strokeWidth="2" opacity="0.6"/>
    <path d="M190 140L210 160M210 140L190 160" stroke="#ff6b6b" strokeWidth="3" strokeLinecap="round" opacity="0.6"/>

    {/* WiFi 信号 - 表示网络问题 */}
    <path d="M320 80Q340 60 360 80" stroke="#FFD700" strokeWidth="2" fill="none" opacity="0.3"/>
    <path d="M325 90Q340 75 355 90" stroke="#FFD700" strokeWidth="2" fill="none" opacity="0.4"/>
    <path d="M332 100Q340 92 348 100" stroke="#FFD700" strokeWidth="2" fill="none" opacity="0.5"/>
    <circle cx="340" cy="112" r="4" fill="#FFD700" opacity="0.6"/>

    {/* 装饰元素 */}
    <circle cx="60" cy="200" r="4" fill="#FFD700" opacity="0.3"/>
    <circle cx="350" cy="250" r="5" fill="#ff6b6b" opacity="0.3"/>
    <circle cx="150" cy="250" r="3" fill="#1890ff" opacity="0.3"/>
  </svg>
);
