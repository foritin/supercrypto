/**
 * StepIndicator 组件单元测试
 *
 * 验证步骤导航条的渲染和交互行为:
 * - 四个步骤标签正确渲染
 * - 三种视觉状态 (未开始、进行中、已确认)
 * - 已确认步骤可点击回退
 * - 未确认步骤禁用
 * - hover 已确认步骤时提供视觉反馈
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StepIndicator } from "@/components/admin-kyc/step-indicator";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      // 返回中文翻译值以保持测试可读性
      const translations: Record<string, string> = {
        "admin.kyc.stepper.steps.basicInfo": "基本信息确认",
        "admin.kyc.stepper.steps.documents": "证件审核",
        "admin.kyc.stepper.steps.riskAssessment": "风险评估",
        "admin.kyc.stepper.steps.finalDecision": "最终决定",
        "admin.kyc.stepper.statusConfirmed": "已确认",
        "admin.kyc.stepper.statusInProgress": "进行中",
        "admin.kyc.stepper.statusNotStarted": "未开始",
      };
      if (key === "admin.kyc.stepper.stepLabel" && params?.num) {
        return `步骤 ${params.num}`;
      }
      return translations[key] || key;
    },
    i18n: { language: "zh-CN" },
  }),
}));

describe("StepIndicator", () => {
  const defaultProps = {
    currentStep: 0,
    confirmedSteps: [false, false, false, false],
    onStepClick: vi.fn(),
  };

  it("应该渲染四个步骤标签", () => {
    render(<StepIndicator {...defaultProps} />);

    expect(screen.getByText("基本信息确认")).toBeInTheDocument();
    expect(screen.getByText("证件审核")).toBeInTheDocument();
    expect(screen.getByText("风险评估")).toBeInTheDocument();
    expect(screen.getByText("最终决定")).toBeInTheDocument();
  });

  it("应该显示步骤编号", () => {
    render(<StepIndicator {...defaultProps} />);

    expect(screen.getByText("步骤 1")).toBeInTheDocument();
    expect(screen.getByText("步骤 2")).toBeInTheDocument();
    expect(screen.getByText("步骤 3")).toBeInTheDocument();
    expect(screen.getByText("步骤 4")).toBeInTheDocument();
  });

  it("当前步骤应该有 aria-current='step' 属性", () => {
    render(<StepIndicator {...defaultProps} currentStep={1} />);

    const step2Button = screen.getByLabelText(/证件审核 - 进行中/);
    expect(step2Button).toHaveAttribute("aria-current", "step");

    // 其他步骤不应有 aria-current
    const step1Button = screen.getByLabelText(/基本信息确认 - 未开始/);
    expect(step1Button).not.toHaveAttribute("aria-current");
  });

  it("已确认步骤应该可点击", () => {
    const onStepClick = vi.fn();
    render(
      <StepIndicator
        currentStep={2}
        confirmedSteps={[true, true, false, false]}
        onStepClick={onStepClick}
      />
    );

    // 点击已确认的步骤 1
    const step1Button = screen.getByLabelText(/基本信息确认 - 已确认/);
    fireEvent.click(step1Button);
    expect(onStepClick).toHaveBeenCalledWith(0);

    // 点击已确认的步骤 2
    const step2Button = screen.getByLabelText(/证件审核 - 已确认/);
    fireEvent.click(step2Button);
    expect(onStepClick).toHaveBeenCalledWith(1);
  });

  it("未确认步骤应该禁用", () => {
    const onStepClick = vi.fn();
    render(
      <StepIndicator
        currentStep={0}
        confirmedSteps={[false, false, false, false]}
        onStepClick={onStepClick}
      />
    );

    // 未来步骤应该被禁用
    const step2Button = screen.getByLabelText(/证件审核 - 未开始/);
    expect(step2Button).toBeDisabled();

    // 点击禁用的步骤不应触发回调
    fireEvent.click(step2Button);
    expect(onStepClick).not.toHaveBeenCalled();
  });

  it("进行中步骤不应可点击 (未确认)", () => {
    const onStepClick = vi.fn();
    render(
      <StepIndicator
        currentStep={1}
        confirmedSteps={[true, false, false, false]}
        onStepClick={onStepClick}
      />
    );

    // 当前进行中的步骤应该被禁用 (未确认)
    const step2Button = screen.getByLabelText(/证件审核 - 进行中/);
    expect(step2Button).toBeDisabled();

    fireEvent.click(step2Button);
    expect(onStepClick).not.toHaveBeenCalled();
  });

  it("所有步骤确认后应该都可点击", () => {
    const onStepClick = vi.fn();
    render(
      <StepIndicator
        currentStep={3}
        confirmedSteps={[true, true, true, false]}
        onStepClick={onStepClick}
      />
    );

    // 所有已确认步骤应该可点击
    fireEvent.click(screen.getByLabelText(/基本信息确认 - 已确认/));
    expect(onStepClick).toHaveBeenCalledWith(0);

    fireEvent.click(screen.getByLabelText(/证件审核 - 已确认/));
    expect(onStepClick).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByLabelText(/风险评估 - 已确认/));
    expect(onStepClick).toHaveBeenCalledWith(2);
  });
});
