"use client";

/**
 * StepFooter - 底部操作栏组件
 *
 * 步骤 1-3 (index 0-2): 显示"上一步"和"确认并继续"按钮
 * - 步骤 1 (isFirstStep=true) 时隐藏"上一步"
 * 步骤 4 (index 3): 返回 null，由 StepFinalDecision 自行处理操作
 */

import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

export interface StepFooterProps {
  /** 当前步骤索引 (0-3) */
  currentStep: number;
  /** 确认并前进到下一步 */
  onConfirmAndNext: () => void;
  /** 回退到上一步 */
  onGoBack: () => void;
  /** 是否为第一步 (隐藏"上一步"按钮) */
  isFirstStep: boolean;
}

export function StepFooter({
  currentStep,
  onConfirmAndNext,
  onGoBack,
  isFirstStep,
}: StepFooterProps) {
  const { t } = useTranslation();

  // 步骤 4 (index 3) 不渲染，由 StepFinalDecision 自行处理
  if (currentStep >= 3) {
    return null;
  }

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.08]">
      {/* 上一步按钮 - 第一步时隐藏 */}
      {isFirstStep ? (
        <div />
      ) : (
        <Button
          variant="ghost"
          className="h-11 rounded-xl px-5 text-white/70 hover:text-white"
          onClick={onGoBack}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t("admin.kyc.stepper.prevStep")}
        </Button>
      )}

      {/* 确认并继续按钮 */}
      <Button
        variant="primary"
        className="h-11 rounded-xl px-6"
        onClick={onConfirmAndNext}
      >
        <Check className="w-4 h-4 mr-2" />
        {t("admin.kyc.stepper.confirmAndContinue")}
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}

export default StepFooter;
