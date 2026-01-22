'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Building2, Zap, Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

/**
 * HowItWorks 组件 - 横向时间轴
 * 
 * 特点:
 * - 发光连接线 - Requirements: 6.1
 * - 滚动触发动画 - Requirements: 6.2
 * - 移动端垂直连接线 - Requirements: 6.3
 */

interface Step {
  icon: React.ReactNode;
  step: number;
  titleKey: string;
  descKey: string;
  color: string;
}

const STEPS: Step[] = [
  {
    icon: <Building2 className="w-10 h-10" />,
    step: 1,
    titleKey: 'home.howItWorks.step1.title',
    descKey: 'home.howItWorks.step1.description',
    color: '#00D4AA',
  },
  {
    icon: <Zap className="w-10 h-10" />,
    step: 2,
    titleKey: 'home.howItWorks.step2.title',
    descKey: 'home.howItWorks.step2.description',
    color: '#FFD700',
  },
  {
    icon: <Trophy className="w-10 h-10" />,
    step: 3,
    titleKey: 'home.howItWorks.step3.title',
    descKey: 'home.howItWorks.step3.description',
    color: '#1890ff',
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

  // Intersection Observer 实现滚动触发 - Requirements: 6.2
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            // 依次激活步骤
            const timer1 = setTimeout(() => setActiveStep(1), 300);
            const timer2 = setTimeout(() => setActiveStep(2), 800);
            const timer3 = setTimeout(() => setActiveStep(3), 1300);
            return () => {
              clearTimeout(timer1);
              clearTimeout(timer2);
              clearTimeout(timer3);
            };
          }
        });
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={sectionRef} className={cn('relative', className)}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 items-start relative">
        {STEPS.map((item, index) => (
          <div
            key={item.step}
            className={cn(
              'relative transition-all duration-500',
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            )}
            style={{ transitionDelay: `${index * 200}ms` }}
          >
            {/* 发光连接线 - 桌面端水平 */}
            {/* Requirements: 6.1 */}
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  // 桌面端: 水平连接线
                  'hidden md:block absolute top-11 left-[calc(50%+50px)] w-[calc(100%-100px)] h-0.5',
                  // 动画效果
                  'transition-all duration-700',
                  activeStep > index + 1
                    ? 'opacity-100'
                    : 'opacity-30'
                )}
                style={{
                  background: activeStep > index + 1
                    ? `linear-gradient(90deg, ${item.color} 0%, ${STEPS[index + 1].color} 100%)`
                    : `linear-gradient(90deg, ${item.color}40 0%, rgba(255,255,255,0.1) 100%)`,
                  boxShadow: activeStep > index + 1
                    ? `0 0 15px ${item.color}60, 0 0 30px ${item.color}30`
                    : 'none',
                }}
              />
            )}

            {/* 发光连接线 - 移动端垂直 */}
            {/* Requirements: 6.3 */}
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  // 移动端: 垂直连接线
                  'md:hidden absolute left-1/2 -translate-x-1/2 top-[100px] w-0.5 h-[60px]',
                  // 动画效果
                  'transition-all duration-700',
                  activeStep > index + 1
                    ? 'opacity-100'
                    : 'opacity-30'
                )}
                style={{
                  background: activeStep > index + 1
                    ? `linear-gradient(180deg, ${item.color} 0%, ${STEPS[index + 1].color} 100%)`
                    : `linear-gradient(180deg, ${item.color}40 0%, rgba(255,255,255,0.1) 100%)`,
                  boxShadow: activeStep > index + 1
                    ? `0 0 15px ${item.color}60`
                    : 'none',
                }}
              />
            )}

            <div className="text-center relative pb-16 md:pb-0">
              {/* 图标容器 */}
              <div
                className={cn(
                  'w-[88px] h-[88px] rounded-3xl flex items-center justify-center mx-auto mb-7 relative',
                  'bg-gradient-to-br from-[rgba(17,25,22,0.9)] to-[rgba(26,36,30,0.9)]',
                  'transition-all duration-500',
                  activeStep >= item.step && 'scale-105'
                )}
                style={{
                  border: `2px solid ${activeStep >= item.step ? item.color : `${item.color}40`}`,
                  boxShadow: activeStep >= item.step
                    ? `0 0 40px ${item.color}30, 0 0 60px ${item.color}15`
                    : `0 0 40px ${item.color}15`,
                }}
              >
                {/* 步骤数字 */}
                <span
                  className={cn(
                    'absolute -top-3.5 -right-3.5 w-9 h-9 rounded-full flex items-center justify-center',
                    'text-base font-bold text-[var(--bg-dark)]',
                    'transition-all duration-500'
                  )}
                  style={{
                    background: `linear-gradient(135deg, ${item.color} 0%, ${item.color}CC 100%)`,
                    boxShadow: activeStep >= item.step
                      ? `0 0 20px ${item.color}80`
                      : `0 0 20px ${item.color}50`,
                  }}
                >
                  {item.step}
                </span>

                {/* 图标 */}
                <div style={{ color: item.color }}>
                  {item.icon}
                </div>
              </div>

              {/* 标题 */}
              <h4 className="text-xl font-semibold text-white mb-3">
                {t(item.titleKey)}
              </h4>

              {/* 描述 */}
              <p className="text-white/65 leading-relaxed max-w-[280px] mx-auto">
                {t(item.descKey)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
