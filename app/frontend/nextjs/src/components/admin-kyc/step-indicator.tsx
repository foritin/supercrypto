"use client";

/**
 * StepIndicator - 步骤导航条组件
 *
 * 显示四个审核步骤的状态导航条:
 * - 未开始 (not started): 灰色圆圈 + 灰色文字
 * - 进行中 (in progress): 主题色 (#00D4AA) 圆圈 + 白色文字
 * - 已确认 (confirmed): 绿色圆圈 + 勾选图标 + 可点击
 *
 * 已确认步骤可点击回退，未确认的未来步骤禁用。
 */

import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

import { STEPS } from "./stepper-reducer";

export interface StepIndicatorProps {
  /** 当前步骤索引 (0-3) */
  currentStep: number;
  /** 各步骤确认状态 */
  confirmedSteps: boolean[];
  /** 点击步骤回调 (仅已确认步骤可触发) */
  onStepClick: (step: number) => void;
}

type StepStatus = "not-started" | "in-progress" | "confirmed";

function getStepStatus(
  index: number,
  currentStep: number,
  confirmedSteps: boolean[]
): StepStatus {
  if (confirmedSteps[index]) return "confirmed";
  if (index === currentStep) return "in-progress";
  return "not-started";
}

export function StepIndicator({
  currentStep,
  confirmedSteps,
  onStepClick,
}: StepIndicatorProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between px-6 py-4">
      {STEPS.map((step, index) => {
        const status = getStepStatus(index, currentStep, confirmedSteps);
        const isClickable = status === "confirmed";
        const Icon = step.icon;
        const translatedLabel = t(step.label);

        const statusLabel =
          status === "confirmed"
            ? t("admin.kyc.stepper.statusConfirmed")
            : status === "in-progress"
              ? t("admin.kyc.stepper.statusInProgress")
              : t("admin.kyc.stepper.statusNotStarted");

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            {/* 步骤节点 */}
            <button
              type="button"
              onClick={() => isClickable && onStepClick(index)}
              disabled={!isClickable}
              className={`
                flex items-center gap-3 group transition-all duration-200
                ${isClickable ? "cursor-pointer" : "cursor-not-allowed"}
              `}
              aria-label={`${translatedLabel} - ${statusLabel}`}
              aria-current={status === "in-progress" ? "step" : undefined}
            >
              {/* 圆圈指示器 */}
              <div
                className={`
                  flex items-center justify-center w-9 h-9 rounded-full
                  transition-all duration-200 shrink-0
                  ${
                    status === "confirmed"
                      ? "bg-emerald-500/20 border-2 border-emerald-500 group-hover:bg-emerald-500/30 group-hover:shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                      : status === "in-progress"
                        ? "bg-primary/20 border-2 border-primary shadow-[0_0_12px_rgba(0,212,170,0.3)]"
                        : "bg-white/5 border-2 border-white/15"
                  }
                `}
              >
                {status === "confirmed" ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Icon
                    className={`w-4 h-4 ${
                      status === "in-progress"
                        ? "text-primary"
                        : "text-white/30"
                    }`}
                  />
                )}
              </div>

              {/* 步骤标签 */}
              <div className="flex flex-col">
                <span
                  className={`text-[11px] font-medium leading-none mb-0.5 ${
                    status === "confirmed"
                      ? "text-emerald-400/70"
                      : status === "in-progress"
                        ? "text-primary/70"
                        : "text-white/25"
                  }`}
                >
                  {t("admin.kyc.stepper.stepLabel", { num: index + 1 })}
                </span>
                <span
                  className={`text-[13px] font-medium leading-tight whitespace-nowrap ${
                    status === "confirmed"
                      ? "text-emerald-400 group-hover:text-emerald-300"
                      : status === "in-progress"
                        ? "text-white"
                        : "text-white/35"
                  }`}
                >
                  {translatedLabel}
                </span>
              </div>
            </button>

            {/* 连接线 (最后一个步骤不显示) */}
            {index < STEPS.length - 1 && (
              <div
                className={`flex-1 h-px mx-4 transition-colors duration-200 ${
                  confirmedSteps[index]
                    ? "bg-emerald-500/40"
                    : index < currentStep
                      ? "bg-primary/30"
                      : "bg-white/10"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default StepIndicator;
