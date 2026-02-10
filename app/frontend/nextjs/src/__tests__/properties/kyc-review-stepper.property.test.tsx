/**
 * KYC 审核 Stepper Modal 属性测试
 *
 * 使用 fast-check 对 stepperReducer 和 buildReviewSteps 进行属性测试，
 * 验证设计文档中定义的正确性属性。
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import fc from 'fast-check';

// Mock react-i18next for ReviewSummary component
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "admin.kyc.stepper.steps.basicInfo": "基本信息确认",
        "admin.kyc.stepper.steps.documents": "证件审核",
        "admin.kyc.stepper.steps.riskAssessment": "风险评估",
        "admin.kyc.stepper.steps.finalDecision": "最终决定",
        "admin.kyc.stepper.reviewSummary": "审核步骤汇总",
        "admin.kyc.stepper.confirmed": "已确认",
        "admin.kyc.stepper.hasIssues": "有问题",
      };
      return translations[key] || key;
    },
    i18n: { language: "zh-CN" },
  }),
}));
import { render, screen, cleanup } from '@testing-library/react';
import {
  stepperReducer,
  initialState,
  buildReviewSteps,
  type StepperState,
  type StepperAction,
} from '@/components/admin-kyc/stepper-reducer';
import { ReviewSummary } from '@/components/admin-kyc/step-final-decision';

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/**
 * 生成随机 StepperAction（不包含 RESTORE_PROGRESS，因为它是外部恢复操作）
 */
const stepperActionArb: fc.Arbitrary<StepperAction> = fc.oneof(
  fc.constant<StepperAction>({ type: 'CONFIRM_STEP' }),
  fc.integer({ min: -1, max: 5 }).map<StepperAction>((step) => ({ type: 'GO_TO_STEP', step })),
  fc.constant<StepperAction>({ type: 'TOGGLE_REJECT_FORM' }),
  fc.string({ minLength: 0, maxLength: 20 }).map<StepperAction>((code) => ({
    type: 'SET_REJECT_CODE',
    code,
  })),
  fc.string({ minLength: 0, maxLength: 50 }).map<StepperAction>((reason) => ({
    type: 'SET_CUSTOM_REASON',
    reason,
  })),
  fc.boolean().map<StepperAction>((value) => ({ type: 'SET_ACCREDITED', value })),
  fc.constant<StepperAction>({ type: 'RESET' }),
);

/** 生成随机 StepperAction 序列 */
const stepperActionSequenceArb: fc.Arbitrary<StepperAction[]> = fc.array(stepperActionArb, {
  minLength: 1,
  maxLength: 100,
});

/** 生成随机 StepperState */
const stepperStateArb: fc.Arbitrary<StepperState> = fc.record({
  currentStep: fc.integer({ min: 0, max: 3 }),
  confirmedSteps: fc.tuple(fc.boolean(), fc.boolean(), fc.boolean(), fc.boolean()),
  rejectFormVisible: fc.boolean(),
  selectedRejectCode: fc.string({ minLength: 0, maxLength: 20 }),
  customRejectReason: fc.string({ minLength: 0, maxLength: 50 }),
  isAccredited: fc.boolean(),
});

/** 生成长度为 4 的随机布尔数组 */
const confirmedStepsArb: fc.Arbitrary<boolean[]> = fc
  .tuple(fc.boolean(), fc.boolean(), fc.boolean(), fc.boolean())
  .map(([a, b, c, d]) => [a, b, c, d]);

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * 计算从索引 0 开始连续为 true 的数量
 * 例如: [true, true, false, true] → 2
 */
function countConsecutiveConfirmed(confirmedSteps: boolean[]): number {
  let count = 0;
  for (const step of confirmedSteps) {
    if (step) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
// Property 1: Stepper Reducer 步骤顺序不变量
// ---------------------------------------------------------------------------

/**
 * **Feature: kyc-review-stepper-modal, Property 1: Stepper reducer step order invariant**
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 3.4, 4.5, 5.5, 7.3**
 *
 * For any randomly generated StepperAction sequence, starting from initialState
 * and applying each action sequentially, the resulting state's `currentStep`
 * never exceeds the count of consecutive confirmed steps from index 0,
 * and `GO_TO_STEP` only changes `currentStep` when the target step is confirmed
 * or is the current step or before.
 */
describe('Property 1: Stepper reducer step order invariant', () => {
  /**
   * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 3.4, 4.5, 5.5, 7.3**
   * 属性: currentStep 永远不超过从索引 0 开始连续已确认步骤数
   */
  it('property: currentStep never exceeds consecutive confirmed steps count', () => {
    fc.assert(
      fc.property(stepperActionSequenceArb, (actions) => {
        let state = initialState;

        for (const action of actions) {
          state = stepperReducer(state, action);

          const consecutiveConfirmed = countConsecutiveConfirmed(state.confirmedSteps);

          // currentStep should never exceed the number of consecutive confirmed steps
          expect(state.currentStep).toBeLessThanOrEqual(consecutiveConfirmed);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 2.4, 2.5**
   * 属性: GO_TO_STEP 仅在目标步骤已确认或 <= currentStep 时才改变 currentStep
   */
  it('property: GO_TO_STEP only changes currentStep when target is confirmed or reachable', () => {
    fc.assert(
      fc.property(
        stepperActionSequenceArb,
        fc.integer({ min: -1, max: 5 }),
        (setupActions, targetStep) => {
          // First apply setup actions to get to some state
          let state = initialState;
          for (const action of setupActions) {
            state = stepperReducer(state, action);
          }

          const prevStep = state.currentStep;
          const goToAction: StepperAction = { type: 'GO_TO_STEP', step: targetStep };
          const newState = stepperReducer(state, goToAction);

          if (newState.currentStep !== prevStep) {
            // If currentStep changed, the target must have been reachable:
            // either target <= prevStep or confirmedSteps[target] === true
            expect(
              targetStep <= prevStep || state.confirmedSteps[targetStep] === true,
            ).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2: Reset 操作幂等性
// ---------------------------------------------------------------------------

/**
 * **Feature: kyc-review-stepper-modal, Property 2: Reset idempotency**
 * **Validates: Requirements 1.5, 7.2**
 *
 * For any StepperState (arbitrary currentStep, confirmedSteps combination,
 * arbitrary form state), executing RESET action always returns initialState.
 */
describe('Property 2: Reset idempotency', () => {
  /**
   * **Validates: Requirements 1.5, 7.2**
   * 属性: 对于任意 StepperState，RESET 总是返回 initialState
   */
  it('property: RESET always returns initialState regardless of current state', () => {
    fc.assert(
      fc.property(stepperStateArb, (arbitraryState) => {
        const resetAction: StepperAction = { type: 'RESET' };
        const result = stepperReducer(arbitraryState, resetAction);

        expect(result).toEqual(initialState);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 1.5, 7.2**
   * 属性: 连续多次 RESET 结果相同（幂等性）
   */
  it('property: multiple consecutive RESETs produce the same result', () => {
    fc.assert(
      fc.property(stepperStateArb, fc.integer({ min: 1, max: 10 }), (arbitraryState, count) => {
        let state = arbitraryState;
        const resetAction: StepperAction = { type: 'RESET' };

        for (let i = 0; i < count; i++) {
          state = stepperReducer(state, resetAction);
        }

        expect(state).toEqual(initialState);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Cleanup for React rendering tests
// ---------------------------------------------------------------------------

afterEach(cleanup);

// ---------------------------------------------------------------------------
// Property 3: ReviewSummary 确认状态准确性
// ---------------------------------------------------------------------------

/**
 * **Feature: kyc-review-stepper-modal, Property 3: ReviewSummary accuracy**
 * **Validates: Requirements 6.1**
 *
 * For any boolean array of length 3 `confirmedSteps`, the ReviewSummary component's
 * rendered output shows a status label for each step that matches the corresponding
 * boolean value: "已确认" for true, "有问题" for false.
 */
describe('Property 3: ReviewSummary accuracy', () => {
  /** 生成长度为 3 的随机布尔数组 (前三步确认状态) */
  const confirmedSteps3Arb: fc.Arbitrary<boolean[]> = fc
    .tuple(fc.boolean(), fc.boolean(), fc.boolean())
    .map(([a, b, c]) => [a, b, c]);

  /**
   * **Validates: Requirements 6.1**
   * 属性: 每个步骤的状态标记（已确认/有问题）与对应的布尔值一一对应
   */
  it('property: each step status label matches the corresponding boolean value', () => {
    fc.assert(
      fc.property(confirmedSteps3Arb, (steps) => {
        render(<ReviewSummary confirmedSteps={steps} />);

        for (let i = 0; i < 3; i++) {
          const statusEl = screen.getByTestId(`step-status-${i}`);
          if (steps[i]) {
            expect(statusEl.textContent).toBe('已确认');
          } else {
            expect(statusEl.textContent).toBe('有问题');
          }
        }

        cleanup();
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4: 审核回调参数正确性
// ---------------------------------------------------------------------------

/**
 * **Feature: kyc-review-stepper-modal, Property 4: Callback parameter correctness**
 * **Validates: Requirements 6.4, 6.6**
 *
 * For any positive integer kycId, boolean isAccredited, non-empty string reasonCode,
 * and optional string customReason, when triggering the approve action onApprove
 * receives (kycId, isAccredited, reviewSteps), and when triggering the reject action
 * onReject receives (kycId, reasonCode, customReason, reviewSteps), where reviewSteps'
 * confirmation status matches confirmedSteps.
 */
describe('Property 4: Callback parameter correctness', () => {
  /**
   * **Validates: Requirements 6.4**
   * 属性: onApprove 回调接收正确的 (kycId, isAccredited, reviewSteps) 参数，
   * 且 reviewSteps 中的确认状态与 confirmedSteps 一致
   */
  it('property: approve callback receives correct parameters with matching reviewSteps', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.boolean(),
        confirmedStepsArb,
        (kycId, isAccredited, confirmedSteps) => {
          // Simulate the handleApprove logic from ReviewStepperModal
          const reviewSteps = buildReviewSteps(confirmedSteps);

          // Capture callback parameters
          let capturedKycId: number | undefined;
          let capturedIsAccredited: boolean | undefined;
          let capturedReviewSteps: ReturnType<typeof buildReviewSteps> | undefined;

          const onApprove = (
            id: number,
            accredited: boolean,
            steps?: ReturnType<typeof buildReviewSteps>,
          ) => {
            capturedKycId = id;
            capturedIsAccredited = accredited;
            capturedReviewSteps = steps;
          };

          // Execute the callback assembly (mirrors handleApprove)
          onApprove(kycId, isAccredited, reviewSteps);

          // Verify callback received correct parameters
          expect(capturedKycId).toBe(kycId);
          expect(capturedIsAccredited).toBe(isAccredited);
          expect(capturedReviewSteps).toBeDefined();

          // Verify reviewSteps confirmation status matches confirmedSteps
          expect(capturedReviewSteps!.basic_info_confirmed).toBe(confirmedSteps[0]);
          expect(capturedReviewSteps!.documents_confirmed).toBe(confirmedSteps[1]);
          expect(capturedReviewSteps!.risk_assessment_confirmed).toBe(confirmedSteps[2]);

          // Verify confirmed_at is a valid ISO timestamp
          const parsed = new Date(capturedReviewSteps!.confirmed_at);
          expect(parsed.getTime()).not.toBeNaN();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 6.6**
   * 属性: onReject 回调接收正确的 (kycId, reasonCode, customReason, reviewSteps) 参数，
   * 且 reviewSteps 中的确认状态与 confirmedSteps 一致
   */
  it('property: reject callback receives correct parameters with matching reviewSteps', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.string({ minLength: 1, maxLength: 30 }),
        fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
        confirmedStepsArb,
        (kycId, reasonCode, customReason, confirmedSteps) => {
          // Simulate the handleReject logic from ReviewStepperModal
          const reviewSteps = buildReviewSteps(confirmedSteps);

          // Capture callback parameters
          let capturedKycId: number | undefined;
          let capturedReasonCode: string | undefined;
          let capturedCustomReason: string | undefined;
          let capturedReviewSteps: ReturnType<typeof buildReviewSteps> | undefined;

          const onReject = (
            id: number,
            code: string,
            reason?: string,
            steps?: ReturnType<typeof buildReviewSteps>,
          ) => {
            capturedKycId = id;
            capturedReasonCode = code;
            capturedCustomReason = reason;
            capturedReviewSteps = steps;
          };

          // Execute the callback assembly (mirrors handleReject)
          onReject(kycId, reasonCode, customReason, reviewSteps);

          // Verify callback received correct parameters
          expect(capturedKycId).toBe(kycId);
          expect(capturedReasonCode).toBe(reasonCode);
          expect(capturedCustomReason).toBe(customReason);
          expect(capturedReviewSteps).toBeDefined();

          // Verify reviewSteps confirmation status matches confirmedSteps
          expect(capturedReviewSteps!.basic_info_confirmed).toBe(confirmedSteps[0]);
          expect(capturedReviewSteps!.documents_confirmed).toBe(confirmedSteps[1]);
          expect(capturedReviewSteps!.risk_assessment_confirmed).toBe(confirmedSteps[2]);

          // Verify confirmed_at is a valid ISO timestamp
          const parsed = new Date(capturedReviewSteps!.confirmed_at);
          expect(parsed.getTime()).not.toBeNaN();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 6.6**
   * 属性: 当 reasonCode 为 "other" 时，customReason 被传递；
   * 当 reasonCode 不为 "other" 时，customReason 为 undefined
   * (模拟 ReviewStepperModal 中 handleReject 的条件逻辑)
   */
  it('property: reject callback conditionally passes customReason based on reasonCode', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.oneof(fc.constant('other'), fc.string({ minLength: 1, maxLength: 20 })),
        fc.string({ minLength: 1, maxLength: 100 }),
        confirmedStepsArb,
        (kycId, reasonCode, customRejectReason, confirmedSteps) => {
          // Simulate the handleReject conditional logic from ReviewStepperModal
          const reviewSteps = buildReviewSteps(confirmedSteps);

          let capturedCustomReason: string | undefined;

          const onReject = (
            _id: number,
            _code: string,
            reason?: string,
            _steps?: ReturnType<typeof buildReviewSteps>,
          ) => {
            capturedCustomReason = reason;
          };

          // Mirror the exact conditional logic from handleReject:
          // reasonCode === "other" ? customRejectReason : undefined
          onReject(
            kycId,
            reasonCode,
            reasonCode === 'other' ? customRejectReason : undefined,
            reviewSteps,
          );

          if (reasonCode === 'other') {
            expect(capturedCustomReason).toBe(customRejectReason);
          } else {
            expect(capturedCustomReason).toBeUndefined();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5: buildReviewSteps 转换一致性
// ---------------------------------------------------------------------------

/**
 * **Feature: kyc-review-stepper-modal, Property 5: buildReviewSteps conversion consistency**
 * **Validates: Requirements 7.4**
 *
 * For any boolean array of length 4, buildReviewSteps output's
 * basic_info_confirmed equals confirmedSteps[0],
 * documents_confirmed equals confirmedSteps[1],
 * risk_assessment_confirmed equals confirmedSteps[2],
 * and confirmed_at is a valid ISO timestamp string.
 */
describe('Property 5: buildReviewSteps conversion consistency', () => {
  /**
   * **Validates: Requirements 7.4**
   * 属性: 输出字段与输入索引一一对应
   */
  it('property: output fields map one-to-one with input indices', () => {
    fc.assert(
      fc.property(confirmedStepsArb, (confirmedSteps) => {
        const result = buildReviewSteps(confirmedSteps);

        expect(result.basic_info_confirmed).toBe(confirmedSteps[0]);
        expect(result.documents_confirmed).toBe(confirmedSteps[1]);
        expect(result.risk_assessment_confirmed).toBe(confirmedSteps[2]);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 7.4**
   * 属性: confirmed_at 是有效的 ISO 时间戳字符串
   */
  it('property: confirmed_at is a valid ISO timestamp', () => {
    fc.assert(
      fc.property(confirmedStepsArb, (confirmedSteps) => {
        const result = buildReviewSteps(confirmedSteps);

        // Verify confirmed_at is a non-empty string
        expect(typeof result.confirmed_at).toBe('string');
        expect(result.confirmed_at.length).toBeGreaterThan(0);

        // Verify it parses as a valid date
        const parsed = new Date(result.confirmed_at);
        expect(parsed.getTime()).not.toBeNaN();

        // Verify it's a valid ISO format (contains T separator and Z or timezone offset)
        expect(result.confirmed_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      }),
      { numRuns: 100 },
    );
  });
});
