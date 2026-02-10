/**
 * KYC 审核 Stepper 状态管理
 *
 * 纯函数 reducer，管理分步审核弹窗的所有步骤状态转换。
 * 包含步骤导航、确认机制、拒绝表单和合格投资者标记。
 */

import { User, FileText, Shield, CheckCircle, type LucideIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** 步骤定义 */
export interface StepDefinition {
  readonly key: string;
  readonly label: string;
  readonly icon: LucideIcon;
}

/** Stepper 内部状态 */
export interface StepperState {
  /** 当前步骤索引 (0-3) */
  currentStep: number;
  /** 各步骤确认状态 [基本信息, 证件, 风险, 最终决定(未使用)] */
  confirmedSteps: [boolean, boolean, boolean, boolean];
  /** 是否显示拒绝表单 */
  rejectFormVisible: boolean;
  /** 选中的拒绝原因代码 */
  selectedRejectCode: string;
  /** 自定义拒绝原因 */
  customRejectReason: string;
  /** 合格投资者标记 */
  isAccredited: boolean;
}

/** Stepper Action 联合类型 */
export type StepperAction =
  | { type: "CONFIRM_STEP" }
  | { type: "GO_TO_STEP"; step: number }
  | { type: "TOGGLE_REJECT_FORM" }
  | { type: "SET_REJECT_CODE"; code: string }
  | { type: "SET_CUSTOM_REASON"; reason: string }
  | { type: "SET_ACCREDITED"; value: boolean }
  | { type: "RESET" }
  | { type: "RESTORE_PROGRESS"; currentStep: number; confirmedSteps: boolean[] };

/** 审核步骤确认轨迹数据（传递给后端） */
export interface ReviewStepsData {
  basic_info_confirmed: boolean;
  documents_confirmed: boolean;
  risk_assessment_confirmed: boolean;
  confirmed_at: string; // ISO 时间戳
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** 四个审核步骤定义 (label 为 i18n key，组件中通过 t() 翻译) */
export const STEPS: readonly StepDefinition[] = [
  { key: "basic-info", label: "admin.kyc.stepper.steps.basicInfo", icon: User },
  { key: "documents", label: "admin.kyc.stepper.steps.documents", icon: FileText },
  { key: "risk-assessment", label: "admin.kyc.stepper.steps.riskAssessment", icon: Shield },
  { key: "final-decision", label: "admin.kyc.stepper.steps.finalDecision", icon: CheckCircle },
] as const;

/** 初始状态 */
export const initialState: StepperState = {
  currentStep: 0,
  confirmedSteps: [false, false, false, false],
  rejectFormVisible: false,
  selectedRejectCode: "",
  customRejectReason: "",
  isAccredited: false,
};

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

/**
 * Stepper 纯函数 reducer
 *
 * 关键约束：
 * - CONFIRM_STEP：仅当 currentStep < 3 时前进，标记 confirmedSteps[currentStep] = true
 * - GO_TO_STEP：仅允许跳转到 step <= currentStep 或 confirmedSteps[step] === true 的步骤
 * - RESET：返回 initialState
 * - RESTORE_PROGRESS：从后端保存的进度恢复状态
 */
export function stepperReducer(
  state: StepperState,
  action: StepperAction
): StepperState {
  switch (action.type) {
    case "CONFIRM_STEP": {
      // 仅当 currentStep < 3 时才前进（步骤 0-2 可确认并前进）
      if (state.currentStep >= 3) {
        return state;
      }

      const newConfirmedSteps = [
        ...state.confirmedSteps,
      ] as StepperState["confirmedSteps"];
      newConfirmedSteps[state.currentStep] = true;

      return {
        ...state,
        confirmedSteps: newConfirmedSteps,
        currentStep: state.currentStep + 1,
      };
    }

    case "GO_TO_STEP": {
      const { step } = action;

      // 边界检查：步骤必须在 0-3 范围内
      if (step < 0 || step > 3) {
        return state;
      }

      // 仅允许跳转到已确认的步骤或当前步骤及之前的步骤
      if (step <= state.currentStep || state.confirmedSteps[step] === true) {
        return {
          ...state,
          currentStep: step,
        };
      }

      // 不允许跳转到未确认的未来步骤
      return state;
    }

    case "TOGGLE_REJECT_FORM": {
      return {
        ...state,
        rejectFormVisible: !state.rejectFormVisible,
      };
    }

    case "SET_REJECT_CODE": {
      return {
        ...state,
        selectedRejectCode: action.code,
      };
    }

    case "SET_CUSTOM_REASON": {
      return {
        ...state,
        customRejectReason: action.reason,
      };
    }

    case "SET_ACCREDITED": {
      return {
        ...state,
        isAccredited: action.value,
      };
    }

    case "RESET": {
      return initialState;
    }

    case "RESTORE_PROGRESS": {
      const { currentStep, confirmedSteps } = action;

      // 将传入的 boolean[] 转换为固定长度的元组
      const restoredSteps: StepperState["confirmedSteps"] = [
        confirmedSteps[0] ?? false,
        confirmedSteps[1] ?? false,
        confirmedSteps[2] ?? false,
        confirmedSteps[3] ?? false,
      ];

      // 确保 currentStep 在有效范围内
      const clampedStep = Math.max(0, Math.min(3, currentStep));

      return {
        ...initialState,
        currentStep: clampedStep,
        confirmedSteps: restoredSteps,
      };
    }

    default: {
      return state;
    }
  }
}

// ---------------------------------------------------------------------------
// Utility Functions
// ---------------------------------------------------------------------------

/**
 * 将 confirmedSteps 布尔数组转换为 ReviewStepsData
 * 用于在审核通过/拒绝时传递给后端
 */
export function buildReviewSteps(confirmedSteps: boolean[]): ReviewStepsData {
  return {
    basic_info_confirmed: confirmedSteps[0] ?? false,
    documents_confirmed: confirmedSteps[1] ?? false,
    risk_assessment_confirmed: confirmedSteps[2] ?? false,
    confirmed_at: new Date().toISOString(),
  };
}
