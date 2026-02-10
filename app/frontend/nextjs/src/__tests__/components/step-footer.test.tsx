/**
 * StepFooter 组件单元测试
 *
 * 验证底部操作栏的渲染和交互行为:
 * - 步骤 1-3 显示导航按钮
 * - 步骤 1 时隐藏"上一步"按钮
 * - 步骤 4 时不渲染
 * - 按钮点击触发正确回调
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StepFooter } from "@/components/admin-kyc/step-footer";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "admin.kyc.stepper.prevStep": "上一步",
        "admin.kyc.stepper.confirmAndContinue": "确认并继续",
      };
      return translations[key] || key;
    },
    i18n: { language: "zh-CN" },
  }),
}));

describe("StepFooter", () => {
  const defaultProps = {
    currentStep: 0,
    onConfirmAndNext: vi.fn(),
    onGoBack: vi.fn(),
    isFirstStep: true,
  };

  it("步骤 1 时应该显示'确认并继续'按钮", () => {
    render(<StepFooter {...defaultProps} />);

    expect(screen.getByText("确认并继续")).toBeInTheDocument();
  });

  it("步骤 1 (isFirstStep=true) 时应该隐藏'上一步'按钮", () => {
    render(<StepFooter {...defaultProps} isFirstStep={true} />);

    expect(screen.queryByText("上一步")).not.toBeInTheDocument();
  });

  it("步骤 2 时应该同时显示'上一步'和'确认并继续'按钮", () => {
    render(
      <StepFooter
        currentStep={1}
        onConfirmAndNext={vi.fn()}
        onGoBack={vi.fn()}
        isFirstStep={false}
      />
    );

    expect(screen.getByText("上一步")).toBeInTheDocument();
    expect(screen.getByText("确认并继续")).toBeInTheDocument();
  });

  it("步骤 3 时应该同时显示'上一步'和'确认并继续'按钮", () => {
    render(
      <StepFooter
        currentStep={2}
        onConfirmAndNext={vi.fn()}
        onGoBack={vi.fn()}
        isFirstStep={false}
      />
    );

    expect(screen.getByText("上一步")).toBeInTheDocument();
    expect(screen.getByText("确认并继续")).toBeInTheDocument();
  });

  it("步骤 4 (index 3) 时不应渲染任何内容", () => {
    const { container } = render(
      <StepFooter
        currentStep={3}
        onConfirmAndNext={vi.fn()}
        onGoBack={vi.fn()}
        isFirstStep={false}
      />
    );

    expect(container.innerHTML).toBe("");
  });

  it("点击'确认并继续'应该触发 onConfirmAndNext 回调", () => {
    const onConfirmAndNext = vi.fn();
    render(
      <StepFooter
        currentStep={0}
        onConfirmAndNext={onConfirmAndNext}
        onGoBack={vi.fn()}
        isFirstStep={true}
      />
    );

    fireEvent.click(screen.getByText("确认并继续"));
    expect(onConfirmAndNext).toHaveBeenCalledTimes(1);
  });

  it("点击'上一步'应该触发 onGoBack 回调", () => {
    const onGoBack = vi.fn();
    render(
      <StepFooter
        currentStep={1}
        onConfirmAndNext={vi.fn()}
        onGoBack={onGoBack}
        isFirstStep={false}
      />
    );

    fireEvent.click(screen.getByText("上一步"));
    expect(onGoBack).toHaveBeenCalledTimes(1);
  });
});
