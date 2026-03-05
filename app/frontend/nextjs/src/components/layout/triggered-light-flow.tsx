'use client';

import { useEffect, useState, useRef } from 'react';

/**
 * ════════════════════════════════════════════════════════════════
 * TRIGGERED LIGHT FLOW - 触发式光流组件（优化版）
 * 用途: 仅在首次访问时显示一次，避免重复干扰
 * 解决: 持续动画误导用户 + 页面切换重复触发
 * ════════════════════════════════════════════════════════════════
 */

type TriggerType = 'page-load' | 'wallet-connect' | 'transaction' | 'navigation';

interface TriggeredLightFlowProps {
  /** 触发类型 */
  trigger?: TriggerType;
  /** 是否显示（用于手动控制） */
  visible?: boolean;
  /** 显示时长（毫秒），默认 2500ms */
  duration?: number;
}

// 全局标记：会话中是否已显示过光流
const hasShownLightFlow = {
  current: false,
};

export const TriggeredLightFlow: React.FC<TriggeredLightFlowProps> = ({
  trigger,
  visible: controlledVisible,
  duration = 2500,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasTriggeredRef = useRef(false);

  // 触发光流显示（仅一次）
  const show = (showDuration: number) => {
    // 检查是否已经显示过
    if (hasTriggeredRef.current) {
      return;
    }

    // 清除之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    hasTriggeredRef.current = true;
    hasShownLightFlow.current = true;
    setIsVisible(true);

    // 自动隐藏
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, showDuration);
  };

  // 处理受控模式
  useEffect(() => {
    if (controlledVisible !== undefined) {
      if (controlledVisible && !hasTriggeredRef.current) {
        show(duration);
      }
    }
  }, [controlledVisible, duration]);

  // 页面加载触发（仅一次）
  useEffect(() => {
    if (trigger === 'page-load' && !hasShownLightFlow.current) {
      // 延迟 500ms 显示，让用户先看到页面内容
      const timer = setTimeout(() => {
        show(duration);
      }, 500);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [trigger, duration]);

  // 清理
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!isVisible) return null;

  return (
    <>
      <div
        className="triggered-light-flow"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: 'linear-gradient(90deg, transparent 0%, #00d4aa 40%, #c9a962 60%, transparent 100%)',
          animation: 'triggeredFlowOnce 2.5s ease-in-out forwards',
          zIndex: 2147483647,
          boxShadow: '0 0 12px rgba(0, 212, 170, 0.6), 0 0 24px rgba(0, 212, 170, 0.3)',
          pointerEvents: 'none',
        }}
      />
      <style>{`
        @keyframes triggeredFlowOnce {
          0% {
            transform: translateX(-100%);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          85% {
            opacity: 1;
          }
          100% {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
};

/**
 * Hook 用于程序化触发光流（可重复触发，用于操作反馈）
 * @example
 * const { triggerLightFlow } = useLightFlow();
 * triggerLightFlow(); // 用于交易完成等操作反馈
 */
export const useLightFlow = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentDuration, setCurrentDuration] = useState(2000);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerLightFlow = (duration: number = 2000) => {
    // 清除之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setCurrentDuration(duration);
    setIsVisible(true);

    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, duration);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    TriggeredLightFlow: () => (
      <TriggeredLightFlow
        visible={isVisible}
        duration={currentDuration}
      />
    ),
    triggerLightFlow,
  };
};

export default TriggeredLightFlow;
