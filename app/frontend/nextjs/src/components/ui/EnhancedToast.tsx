/**
 * ════════════════════════════════════════════════════════════════
 * ENHANCED TOAST - 增强型通知组件
 * 用途: 提供更好的视觉反馈和动画效果
 * 使用: EnhancedToast.success(), EnhancedToast.error(), etc.
 * 
 * 已迁移: Ant Design message → sonner toast
 * @validates Requirements 16.11
 * ════════════════════════════════════════════════════════════════
 */

import { notification, toast } from '@/lib/notification';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Loader2,
} from 'lucide-react';
import React from 'react';

// Toast 类型配置
interface ToastConfig {
  icon?: React.ReactNode;
  duration?: number;
  className?: string;
  description?: string;
}

// 自定义图标组件 - 使用 lucide-react 并添加动画效果
const SuccessIcon = () => (
  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#00D4AA]/20">
    <CheckCircle className="w-4 h-4 text-[#00D4AA] animate-in zoom-in-50 duration-200" />
  </div>
);

const ErrorIcon = () => (
  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500/20">
    <XCircle className="w-4 h-4 text-red-500 animate-in zoom-in-50 duration-200" />
  </div>
);

const WarningIcon = () => (
  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-yellow-500/20">
    <AlertTriangle className="w-4 h-4 text-yellow-500 animate-in zoom-in-50 duration-200" />
  </div>
);

const InfoIcon = () => (
  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/20">
    <Info className="w-4 h-4 text-blue-500 animate-in zoom-in-50 duration-200" />
  </div>
);

const LoadingIcon = () => (
  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/20">
    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
  </div>
);

// Enhanced Toast API - 使用 sonner toast
export const EnhancedToast = {
  /**
   * 显示成功通知
   * @param content - 通知内容
   * @param config - 可选配置
   * @returns Toast ID
   */
  success: (content: React.ReactNode, config?: ToastConfig) => {
    return toast.success(String(content), {
      icon: config?.icon ?? <SuccessIcon />,
      duration: config?.duration ? config.duration * 1000 : 3000,
      className: config?.className ?? 'enhanced-toast',
      description: config?.description,
    });
  },

  /**
   * 显示错误通知
   * @param content - 通知内容
   * @param config - 可选配置
   * @returns Toast ID
   */
  error: (content: React.ReactNode, config?: ToastConfig) => {
    return toast.error(String(content), {
      icon: config?.icon ?? <ErrorIcon />,
      duration: config?.duration ? config.duration * 1000 : 4000, // 错误消息显示更长时间
      className: config?.className ?? 'enhanced-toast',
      description: config?.description,
    });
  },

  /**
   * 显示警告通知
   * @param content - 通知内容
   * @param config - 可选配置
   * @returns Toast ID
   */
  warning: (content: React.ReactNode, config?: ToastConfig) => {
    return toast.warning(String(content), {
      icon: config?.icon ?? <WarningIcon />,
      duration: config?.duration ? config.duration * 1000 : 3000,
      className: config?.className ?? 'enhanced-toast',
      description: config?.description,
    });
  },

  /**
   * 显示信息通知
   * @param content - 通知内容
   * @param config - 可选配置
   * @returns Toast ID
   */
  info: (content: React.ReactNode, config?: ToastConfig) => {
    return toast.info(String(content), {
      icon: config?.icon ?? <InfoIcon />,
      duration: config?.duration ? config.duration * 1000 : 3000,
      className: config?.className ?? 'enhanced-toast',
      description: config?.description,
    });
  },

  /**
   * 显示加载通知
   * @param content - 通知内容
   * @param config - 可选配置
   * @returns Toast ID (用于后续关闭)
   */
  loading: (content: React.ReactNode, config?: ToastConfig) => {
    return toast.loading(String(content), {
      icon: config?.icon ?? <LoadingIcon />,
      duration: config?.duration ? config.duration * 1000 : Infinity, // 持续显示直到手动关闭
      className: config?.className ?? 'enhanced-toast',
      description: config?.description,
    });
  },

  /**
   * 关闭指定的 toast
   * @param toastId - Toast ID
   */
  dismiss: (toastId?: string | number) => {
    toast.dismiss(toastId);
  },

  /**
   * 关闭所有 toast
   */
  destroy: () => {
    toast.dismiss();
  },

  /**
   * Promise 风格的 toast
   * 显示加载状态，然后根据 Promise 结果显示成功或错误
   * @param promise - 要跟踪的 Promise
   * @param messages - 各状态的消息
   */
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    }
  ) => {
    return toast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    });
  },
};

// 默认导出（兼容性）
export default EnhancedToast;
