/**
 * ════════════════════════════════════════════════════════════════
 * ENHANCED TOAST - 增强型通知组件
 * 用途: 提供更好的视觉反馈和动画效果
 * 使用: EnhancedToast.success(), EnhancedToast.error(), etc.
 * ════════════════════════════════════════════════════════════════
 */

import { message } from 'antd';
import type { ArgsProps } from 'antd/es/message';
import React from 'react';

// Toast 类型配置
interface ToastConfig {
  icon?: React.ReactNode;
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
}

// 成功图标
const SuccessIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="10" fill="#52c41a" fillOpacity="0.2"/>
    <path
      d="M6 10L9 13L14 7"
      stroke="#52c41a"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="toast-check-icon"
    />
  </svg>
);

// 错误图标
const ErrorIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="10" fill="#ff4d4f" fillOpacity="0.2"/>
    <path
      d="M7 7L13 13M13 7L7 13"
      stroke="#ff4d4f"
      strokeWidth="2"
      strokeLinecap="round"
      className="toast-cross-icon"
    />
  </svg>
);

// 警告图标
const WarningIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="10" fill="#faad14" fillOpacity="0.2"/>
    <path
      d="M10 6V11M10 14V14.01"
      stroke="#faad14"
      strokeWidth="2"
      strokeLinecap="round"
      className="toast-warning-icon"
    />
  </svg>
);

// 信息图标
const InfoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="10" fill="#1890ff" fillOpacity="0.2"/>
    <path
      d="M10 8V10M10 13V13.01M10 4C6.68629 4 4 6.68629 4 10C4 13.3137 6.68629 16 10 16C13.3137 16 16 13.3137 16 10C16 6.68629 13.3137 4 10 4Z"
      stroke="#1890ff"
      strokeWidth="2"
      strokeLinecap="round"
      className="toast-info-icon"
    />
  </svg>
);

// 加载图标
const LoadingIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    className="toast-loading-icon"
  >
    <circle
      cx="10"
      cy="10"
      r="8"
      stroke="#1890ff"
      strokeWidth="2"
      strokeOpacity="0.3"
    />
    <path
      d="M10 2A8 8 0 0 1 18 10"
      stroke="#1890ff"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

// 基础配置
const baseConfig: ArgsProps = {
  duration: 3,
  className: 'enhanced-toast',
  style: {
    borderRadius: '12px',
    padding: '12px 20px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
  },
};

// Enhanced Toast API
export const EnhancedToast = {
  success: (content: React.ReactNode, config?: ToastConfig) => {
    return message.success({
      ...baseConfig,
      icon: <SuccessIcon />,
      content,
      ...config,
    });
  },

  error: (content: React.ReactNode, config?: ToastConfig) => {
    return message.error({
      ...baseConfig,
      icon: <ErrorIcon />,
      content,
      duration: 4, // 错误消息显示更长时间
      ...config,
    });
  },

  warning: (content: React.ReactNode, config?: ToastConfig) => {
    return message.warning({
      ...baseConfig,
      icon: <WarningIcon />,
      content,
      ...config,
    });
  },

  info: (content: React.ReactNode, config?: ToastConfig) => {
    return message.info({
      ...baseConfig,
      icon: <InfoIcon />,
      content,
      ...config,
    });
  },

  loading: (content: React.ReactNode, config?: ToastConfig) => {
    return message.loading({
      ...baseConfig,
      icon: <LoadingIcon />,
      content,
      duration: 0, // 持续显示直到手动关闭
      ...config,
    });
  },
};

// 默认导出（兼容性）
export default EnhancedToast;
