"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Clock, Hourglass, AlertCircle } from "lucide-react";

interface CountdownTimerProps {
  /** 认购开始时间 */
  startTime?: string | Date;
  /** 认购结束时间 */
  endTime?: string | Date;
  /** 自定义样式类 */
  className?: string;
}

type CountdownState = 
  | { type: "upcoming"; targetTime: Date; label: string }     // 即将开始
  | { type: "active"; targetTime: Date; label: string }      // 进行中
  | { type: "ended"; label: string }                         // 已结束
  | null;

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalHours: number;
}

function calculateTimeLeft(targetTime: Date): TimeLeft {
  const now = new Date().getTime();
  const target = new Date(targetTime).getTime();
  const difference = target - now;

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalHours: 0 };
  }

  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((difference % (1000 * 60)) / 1000);
  const totalHours = difference / (1000 * 60 * 60);

  return { days, hours, minutes, seconds, totalHours };
}

function formatTimeUnit(value: number): string {
  return value.toString().padStart(2, "0");
}

export function CountdownTimer({ startTime, endTime, className = "" }: CountdownTimerProps) {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [countdownState, setCountdownState] = useState<CountdownState>(null);

  // 计算当前状态
  useEffect(() => {
    const calculateState = (): CountdownState => {
      const now = new Date().getTime();
      const start = startTime ? new Date(startTime).getTime() : null;
      const end = endTime ? new Date(endTime).getTime() : null;

      // 有开始时间且还未开始
      if (start && now < start) {
        return {
          type: "upcoming",
          targetTime: new Date(start),
          label: t("assets.countdown.startsIn"),
        };
      }

      // 有结束时间且还未结束
      if (end && now < end) {
        return {
          type: "active",
          targetTime: new Date(end),
          label: t("assets.countdown.endsIn"),
        };
      }

      // 已结束
      if (end && now >= end) {
        return {
          type: "ended",
          label: t("assets.countdown.ended"),
        };
      }

      return null;
    };

    const state = calculateState();
    setCountdownState(state);

    if (state?.targetTime) {
      setTimeLeft(calculateTimeLeft(state.targetTime));
    }
  }, [startTime, endTime, t]);

  // 每秒更新倒计时
  useEffect(() => {
    if (!countdownState?.targetTime) return;

    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(countdownState.targetTime);
      setTimeLeft(newTimeLeft);

      // 倒计时结束，重新计算状态
      if (newTimeLeft.days === 0 && newTimeLeft.hours === 0 && 
          newTimeLeft.minutes === 0 && newTimeLeft.seconds === 0) {
        window.location.reload(); // 简单刷新页面更新状态
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [countdownState]);

  // 判断是否为紧急状态（少于24小时）
  const isUrgent = useMemo(() => {
    if (!timeLeft) return false;
    return timeLeft.totalHours < 24 && timeLeft.totalHours > 0;
  }, [timeLeft]);

  // 判断是否非常紧急（少于1小时）
  const isCritical = useMemo(() => {
    if (!timeLeft) return false;
    return timeLeft.totalHours < 1 && timeLeft.totalHours > 0;
  }, [timeLeft]);

  // 如果没有倒计时状态，不显示
  if (!countdownState) return null;

  // 已结束状态
  if (countdownState.type === "ended") {
    return (
      <div className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 ${className}`}>
        <Clock className="h-4 w-4 text-white/40" />
        <span className="text-white/40 text-sm">{countdownState.label}</span>
      </div>
    );
  }

  // 没有倒计时数据
  if (!timeLeft) return null;

  // 确定样式
  const getContainerStyles = () => {
    if (isCritical) {
      return "bg-red-500/10 border-red-500/30 animate-pulse";
    }
    if (isUrgent) {
      return "bg-orange-500/10 border-orange-500/30";
    }
    if (countdownState.type === "upcoming") {
      return "bg-blue-500/10 border-blue-500/20";
    }
    return "bg-primary/10 border-primary/20";
  };

  const getTextColor = () => {
    if (isCritical) return "text-red-400";
    if (isUrgent) return "text-orange-400";
    if (countdownState.type === "upcoming") return "text-blue-400";
    return "text-primary";
  };

  const getIcon = () => {
    if (isCritical) return <AlertCircle className="h-4 w-4 text-red-400" />;
    if (isUrgent) return <Hourglass className="h-4 w-4 text-orange-400" />;
    return <Clock className={`h-4 w-4 ${getTextColor()}`} />;
  };

  return (
    <div 
      className={`relative overflow-hidden rounded-xl border p-4 ${getContainerStyles()} ${className}`}
    >
      {/* 注入 shimmer 动画样式 */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
      
      {/* 背景动效 */}
      {isUrgent && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
      )}

      <div className="relative flex flex-col items-center">
        {/* 标签 */}
        <div className={`flex items-center gap-2 mb-3 ${getTextColor()}`}>
          {getIcon()}
          <span className="text-xs font-medium uppercase tracking-wider">
            {countdownState.label}
          </span>
        </div>

        {/* 时间数字 */}
        <div className="flex items-center gap-2">
          {/* 天 */}
          {timeLeft.days > 0 && (
            <>
              <TimeUnit value={timeLeft.days} label={t("assets.countdown.days")} isUrgent={isUrgent} />
              <Separator />
            </>
          )}
          {/* 时 */}
          <TimeUnit 
            value={timeLeft.hours} 
            label={t("assets.countdown.hours")} 
            isUrgent={isUrgent}
          />
          <Separator />
          {/* 分 */}
          <TimeUnit 
            value={timeLeft.minutes} 
            label={t("assets.countdown.minutes")} 
            isUrgent={isUrgent}
          />
          <Separator />
          {/* 秒 */}
          <TimeUnit 
            value={timeLeft.seconds} 
            label={t("assets.countdown.seconds")} 
            isUrgent={isUrgent}
          />
        </div>

        {/* 紧急提示 */}
        {isCritical && (
          <div className="mt-2 text-xs text-red-400 font-medium">
            {t("assets.countdown.critical")}
          </div>
        )}
        {!isCritical && isUrgent && (
          <div className="mt-2 text-xs text-orange-400 font-medium">
            {t("assets.countdown.urgent")}
          </div>
        )}
      </div>
    </div>
  );
}

// 时间单位组件
function TimeUnit({ value, label, isUrgent }: { value: number; label: string; isUrgent: boolean }) {
  const displayValue = formatTimeUnit(value);
  
  return (
    <div className="flex flex-col items-center">
      <div 
        className={`
          relative flex items-center justify-center
          w-12 h-12 sm:w-14 sm:h-14
          rounded-lg font-mono text-xl sm:text-2xl font-bold
          ${isUrgent 
            ? "bg-black/30 text-white" 
            : "bg-black/20 text-white"
          }
        `}
      >
        {displayValue}
        {/* 数字翻转动效 */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-lg">
          <div className="w-full h-px bg-white/10 absolute top-1/2" />
        </div>
      </div>
      <span className="text-[10px] text-white/40 mt-1 uppercase">{label}</span>
    </div>
  );
}

// 分隔符组件
function Separator() {
  return (
    <div className="flex flex-col items-center justify-center h-12 sm:h-14 pb-4">
      <div className="w-1 h-1 rounded-full bg-white/30 mb-1" />
      <div className="w-1 h-1 rounded-full bg-white/30" />
    </div>
  );
}
