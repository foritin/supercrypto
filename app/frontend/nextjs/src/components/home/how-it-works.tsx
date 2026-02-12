"use client";

import React, { useEffect, useState, useRef } from "react";
import { Wallet, ShieldCheck, TrendingUp, Coins, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * HowItWorks 组件 - 增强版
 *
 * 增强功能:
 * - 4 步骤流程（增加 Yield Generation）
 * - 添加 CTA 按钮
 * - 更丰富的动画效果
 * - 步骤详情展开
 */

interface Step {
  icon: React.ReactNode;
  step: number;
  titleKey: string;
  descKey: string;
  detailKey: string;
  color: string;
}

const STEPS: Step[] = [
  {
    icon: <Wallet className="w-8 h-8" />,
    step: 1,
    titleKey: "home.howItWorksEnhanced.step1.title",
    descKey: "home.howItWorksEnhanced.step1.description",
    detailKey: "home.howItWorksEnhanced.step1.detail",
    color: "#00D4AA",
  },
  {
    icon: <ShieldCheck className="w-8 h-8" />,
    step: 2,
    titleKey: "home.howItWorksEnhanced.step2.title",
    descKey: "home.howItWorksEnhanced.step2.description",
    detailKey: "home.howItWorksEnhanced.step2.detail",
    color: "#FFD700",
  },
  {
    icon: <Coins className="w-8 h-8" />,
    step: 3,
    titleKey: "home.howItWorksEnhanced.step3.title",
    descKey: "home.howItWorksEnhanced.step3.description",
    detailKey: "home.howItWorksEnhanced.step3.detail",
    color: "#1890ff",
  },
  {
    icon: <TrendingUp className="w-8 h-8" />,
    step: 4,
    titleKey: "home.howItWorksEnhanced.step4.title",
    descKey: "home.howItWorksEnhanced.step4.description",
    detailKey: "home.howItWorksEnhanced.step4.detail",
    color: "#a855f7",
  },
];

interface HowItWorksProps {
  className?: string;
}

export function HowItWorks({ className }: HowItWorksProps) {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  // Intersection Observer 实现滚动触发动画
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            // 依次激活步骤
            STEPS.forEach((_, index) => {
              setTimeout(() => setActiveStep(index + 1), 300 + index * 500);
            });
          }
        });
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const toggleExpand = (step: number) => {
    setExpandedStep(expandedStep === step ? null : step);
  };

  return (
    <div ref={sectionRef} className={cn("relative", className)}>
      {/* 桌面端: 水平布局 */}
      <div className="hidden lg:grid lg:grid-cols-4 gap-6 items-start relative">
        {STEPS.map((item, index) => (
          <div
            key={item.step}
            className={cn(
              "relative transition-all duration-500 cursor-pointer",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
            style={{ transitionDelay: `${index * 200}ms` }}
            onClick={() => toggleExpand(item.step)}
          >
            {/* 发光连接线 */}
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  "absolute top-10 left-[calc(50%+40px)] w-[calc(100%-80px)] h-0.5",
                  "transition-all duration-700",
                  activeStep > index ? "opacity-100" : "opacity-20"
                )}
                style={{
                  background:
                    activeStep > index
                      ? `linear-gradient(90deg, ${item.color} 0%, ${STEPS[index + 1].color} 100%)`
                      : `linear-gradient(90deg, ${item.color}40 0%, rgba(255,255,255,0.1) 100%)`,
                  boxShadow:
                    activeStep > index
                      ? `0 0 15px ${item.color}60, 0 0 30px ${item.color}30`
                      : "none",
                }}
              />
            )}

            <div className="text-center relative">
              {/* 图标容器 */}
              <div
                className={cn(
                  "w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5 relative",
                  "bg-gradient-to-br from-[rgba(17,25,22,0.9)] to-[rgba(26,36,30,0.9)]",
                  "transition-all duration-500 hover:scale-110",
                  activeStep >= item.step && "scale-105"
                )}
                style={{
                  border: `2px solid ${activeStep >= item.step ? item.color : `${item.color}40`}`,
                  boxShadow:
                    activeStep >= item.step
                      ? `0 0 40px ${item.color}30, 0 0 60px ${item.color}15`
                      : `0 0 40px ${item.color}15`,
                }}
              >
                {/* 步骤数字 */}
                <span
                  className={cn(
                    "absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center",
                    "text-sm font-bold text-[var(--bg-dark)]",
                    "transition-all duration-500"
                  )}
                  style={{
                    background: `linear-gradient(135deg, ${item.color} 0%, ${item.color}CC 100%)`,
                    boxShadow:
                      activeStep >= item.step
                        ? `0 0 20px ${item.color}80`
                        : `0 0 20px ${item.color}50`,
                  }}
                >
                  {item.step}
                </span>

                {/* 图标 */}
                <div style={{ color: item.color }}>{item.icon}</div>
              </div>

              {/* 标题 */}
              <h4 className="text-lg font-semibold text-white mb-2">{t(item.titleKey)}</h4>

              {/* 描述 */}
              <p className="text-white/60 text-sm leading-relaxed mb-3">{t(item.descKey)}</p>

              {/* 展开详情 */}
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300",
                  expandedStep === item.step ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
                )}
              >
                <p className="text-white/50 text-xs leading-relaxed px-2">{t(item.detailKey)}</p>
              </div>

              {/* 展开提示 */}
              <div className="mt-2 text-xs text-white/30">{t("home.howItWorksEnhanced.clickToExpand")}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 移动端: 垂直布局 */}
      <div className="lg:hidden space-y-6">
        {STEPS.map((item, index) => (
          <div
            key={item.step}
            className={cn(
              "relative flex gap-4 transition-all duration-500",
              isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
            )}
            style={{ transitionDelay: `${index * 200}ms` }}
          >
            {/* 左侧图标和时间线 */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-16 h-16 rounded-xl flex items-center justify-center relative flex-shrink-0",
                  "bg-gradient-to-br from-[rgba(17,25,22,0.9)] to-[rgba(26,36,30,0.9)]",
                  "transition-all duration-500"
                )}
                style={{
                  border: `2px solid ${activeStep >= item.step ? item.color : `${item.color}40`}`,
                  boxShadow:
                    activeStep >= item.step
                      ? `0 0 30px ${item.color}30`
                      : `0 0 30px ${item.color}15`,
                }}
              >
                <span
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: item.color,
                    color: "#0A0F0D",
                  }}
                >
                  {item.step}
                </span>
                <div style={{ color: item.color }} className="scale-75">
                  {item.icon}
                </div>
              </div>

              {/* 垂直连接线 */}
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "w-0.5 flex-1 mt-2 transition-all duration-700",
                    activeStep > index ? "opacity-100" : "opacity-20"
                  )}
                  style={{
                    background: activeStep > index ? item.color : `${item.color}40`,
                    minHeight: "40px",
                  }}
                />
              )}
            </div>

            {/* 右侧内容 */}
            <div className="flex-1 pb-6" onClick={() => toggleExpand(item.step)}>
              <h4 className="text-lg font-semibold text-white mb-1">{t(item.titleKey)}</h4>
              <p className="text-white/60 text-sm">{t(item.descKey)}</p>

              {/* 展开详情 */}
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300",
                  expandedStep === item.step ? "max-h-32 opacity-100 mt-2" : "max-h-0 opacity-0"
                )}
              >
                <p className="text-white/50 text-xs leading-relaxed">{t(item.detailKey)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA 按钮 */}
      <div
        className={cn(
          "mt-12 text-center transition-all duration-500",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )}
        style={{ transitionDelay: "800ms" }}
      >
        <p className="text-white/60 mb-4">{t("home.howItWorksEnhanced.ctaText")}</p>
        <Button
          size="lg"
          className="bg-primary hover:bg-primary/90 text-bg-dark font-medium px-8"
          onClick={() => (window.location.href = "/assets")}
        >
          {t("home.howItWorksEnhanced.ctaButton")}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
