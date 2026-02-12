/**
 * ReviewStepperModal 组件单元测试
 *
 * _Requirements: 1.2, 1.5, 2.3, 6.4, 6.5, 6.7_
 *
 * 测试内容:
 * - StepIndicator 渲染四个步骤标签
 * - 步骤 1-3 "确认并继续"按钮交互
 * - 步骤 4 通过/拒绝按钮交互
 * - isProcessing 状态下按钮禁用
 * - Modal 关闭时状态重置
 * - 各步骤条件渲染 (OCR 数据有/无、风险详情有/无)
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReviewStepperModal } from "@/components/admin-kyc/review-stepper-modal";
import type { KycDetail, RiskLevel, ReviewPriority } from "@/services/admin-kyc";

// ============================================================================
// Mocks
// ============================================================================

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        // Step labels
        "admin.kyc.stepper.steps.basicInfo": "基本信息确认",
        "admin.kyc.stepper.steps.documents": "证件审核",
        "admin.kyc.stepper.steps.riskAssessment": "风险评估",
        "admin.kyc.stepper.steps.finalDecision": "最终决定",
        // Step indicator
        "admin.kyc.stepper.statusConfirmed": "已确认",
        "admin.kyc.stepper.statusInProgress": "进行中",
        "admin.kyc.stepper.statusNotStarted": "未开始",
        // Footer
        "admin.kyc.stepper.prevStep": "上一步",
        "admin.kyc.stepper.confirmAndContinue": "确认并继续",
        // Modal
        "admin.kyc.stepper.modalDescription": "请按步骤完成审核流程，确认每个环节后方可做出最终决定",
        // Basic info
        "admin.kyc.stepper.basicInfo": "基本信息",
        "admin.kyc.stepper.fullName": "姓名",
        "admin.kyc.stepper.idType": "证件类型",
        "admin.kyc.stepper.idCard": "身份证",
        "admin.kyc.stepper.passport": "护照",
        "admin.kyc.stepper.driverLicense": "驾照",
        "admin.kyc.stepper.dateOfBirth": "出生日期",
        "admin.kyc.stepper.countryRegion": "国家/地区",
        "admin.kyc.stepper.walletAddress": "钱包地址",
        "admin.kyc.stepper.ocrInfo": "OCR 识别信息",
        "admin.kyc.stepper.confidence": "置信度",
        "admin.kyc.stepper.ocrName": "识别姓名",
        "admin.kyc.stepper.idNumber": "证件号",
        // Risk
        "admin.kyc.stepper.riskLow": "低风险",
        "admin.kyc.stepper.riskFactors": "风险因素",
        // Final decision
        "admin.kyc.stepper.reviewSummary": "审核步骤汇总",
        "admin.kyc.stepper.confirmed": "已确认",
        "admin.kyc.stepper.hasIssues": "有问题",
        "admin.kyc.stepper.auditHistory": "审核历史",
        "admin.kyc.stepper.noAuditRecords": "暂无审核记录",
        "admin.kyc.stepper.actionSubmit": "提交申请",
        "admin.kyc.stepper.system": "系统",
        "admin.kyc.stepper.investorQualification": "投资者资格",
        "admin.kyc.stepper.markAccredited": "标记为合格投资者",
        "admin.kyc.stepper.reviewDecision": "审核决定",
        "admin.kyc.stepper.selectRejectReason": "请选择拒绝原因",
        "admin.kyc.stepper.enterRejectReason": "请输入具体拒绝原因",
        "admin.kyc.stepper.cancel": "取消",
        "admin.kyc.stepper.confirmReject": "确认拒绝",
        "admin.kyc.stepper.processing": "处理中...",
        "admin.kyc.stepper.reject": "拒绝",
        "admin.kyc.stepper.approveReview": "通过审核",
      };
      if (key === "admin.kyc.stepper.stepLabel" && params?.num) {
        return `步骤 ${params.num}`;
      }
      if (key === "admin.kyc.stepper.modalTitle" && params?.name) {
        return `KYC 审核 - ${params.name}`;
      }
      return translations[key] || key;
    },
    i18n: { language: "zh-CN" },
  }),
}));

// Mock the put function from api service to prevent actual API calls
vi.mock("@/services/api", () => ({
  put: vi.fn().mockResolvedValue({}),
  get: vi.fn().mockResolvedValue({}),
  post: vi.fn().mockResolvedValue({}),
}));

// Mock wagmi
vi.mock("wagmi", () => ({
  useChainId: () => 1,
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  motion: {
    div: ({
      children,
      ...props
    }: {
      children: React.ReactNode;
      [key: string]: unknown;
    }) => {
      // Filter out motion-specific props
      const {
        variants,
        initial,
        animate,
        exit,
        transition,
        custom,
        ...htmlProps
      } = props;
      return <div {...htmlProps}>{children}</div>;
    },
  },
}));

// Mock next/image for DocumentReviewPanel
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { fill, unoptimized, ...rest } = props;
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...rest} />;
  },
}));

// ============================================================================
// Test Data
// ============================================================================

function createMockKycDetail(
  overrides: Partial<{
    ocr_data: KycDetail["ocr_data"];
    risk_details: KycDetail["risk_details"];
    status: string;
  }> = {}
): KycDetail {
  return {
    kyc: {
      id: 1,
      wallet_address: "0x1234567890abcdef1234567890abcdef12345678",
      environment: "local",
      status: "pending",
      submitted_at: "2025-01-01T00:00:00Z",
      reviewed_at: null,
      reviewer_address: null,
      reject_reason: null,
      country_code: "CN",
      is_accredited: false,
      id_type: "id_card",
      id_number_last4: "1234",
      full_name: "张三",
      date_of_birth: "1990-01-01",
      has_id_front: true,
      has_id_back: true,
      has_selfie: true,
      on_chain_sync_status: null,
      on_chain_tx_hash: null,
      on_chain_error: null,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
      risk_level: "low" as RiskLevel,
      risk_score: 25,
      priority: "normal" as ReviewPriority,
      processing_time_minutes: null,
      is_pep: false,
      is_sanctioned: false,
      source_ip: null,
      device_fingerprint: null,
    },
    documents: {
      id_front: "https://example.com/front.jpg",
      id_back: "https://example.com/back.jpg",
      selfie: "https://example.com/selfie.jpg",
    },
    audit_logs: [
      {
        id: 1,
        kyc_id: 1,
        action: "submit",
        actor_address: "0x1234567890abcdef1234567890abcdef12345678",
        actor_role: "user",
        details: {},
        created_at: "2025-01-01T00:00:00Z",
      },
    ],
    ocr_data: overrides.ocr_data !== undefined ? overrides.ocr_data : null,
    facial_comparison: null,
    risk_details:
      overrides.risk_details !== undefined ? overrides.risk_details : null,
  };
}

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onApprove: vi.fn(),
  onReject: vi.fn(),
  rejectReasons: [
    {
      code: "invalid_document",
      labels: { zh: "证件无效", en: "Invalid document" },
    },
    { code: "blurry_image", labels: { zh: "图片模糊", en: "Blurry image" } },
    { code: "other", labels: { zh: "其他原因", en: "Other reason" } },
  ],
  isProcessing: false,
};

// ============================================================================
// Tests
// ============================================================================

describe("ReviewStepperModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // --------------------------------------------------------------------------
  // StepIndicator 渲染四个步骤标签
  // --------------------------------------------------------------------------
  describe("StepIndicator 渲染", () => {
    /**
     * **Validates: Requirements 1.2**
     */
    it("应该渲染四个步骤标签", () => {
      const kycDetail = createMockKycDetail();
      render(<ReviewStepperModal kycDetail={kycDetail} {...defaultProps} />);

      expect(screen.getByText("基本信息确认")).toBeInTheDocument();
      expect(screen.getByText("证件审核")).toBeInTheDocument();
      expect(screen.getByText("风险评估")).toBeInTheDocument();
      expect(screen.getByText("最终决定")).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 步骤 1-3 "确认并继续"按钮交互
  // --------------------------------------------------------------------------
  describe("步骤 1-3 确认并继续按钮交互", () => {
    /**
     * **Validates: Requirements 2.3**
     */
    it("点击'确认并继续'应该前进到下一步", async () => {
      const user = userEvent.setup();
      const kycDetail = createMockKycDetail();
      render(<ReviewStepperModal kycDetail={kycDetail} {...defaultProps} />);

      // 步骤 1: 应该显示基本信息内容
      expect(screen.getByText("基本信息")).toBeInTheDocument();
      expect(screen.getByText("张三")).toBeInTheDocument();

      // 点击确认并继续
      const confirmBtn = screen.getByRole("button", { name: /确认并继续/ });
      await user.click(confirmBtn);

      // 步骤 2: 应该显示证件审核内容 (DocumentReviewPanel renders i18n key for "证件照片")
      expect(screen.getByText("admin.kyc.stepper.docReview.idPhotos")).toBeInTheDocument();
    });

    it("从步骤 2 点击'确认并继续'应该前进到步骤 3", async () => {
      const user = userEvent.setup();
      const kycDetail = createMockKycDetail();
      render(<ReviewStepperModal kycDetail={kycDetail} {...defaultProps} />);

      // 前进到步骤 2
      await user.click(screen.getByRole("button", { name: /确认并继续/ }));

      // 前进到步骤 3
      await user.click(screen.getByRole("button", { name: /确认并继续/ }));

      // 步骤 3: 应该显示风险评估内容 (risk score)
      expect(screen.getByText("25")).toBeInTheDocument();
      expect(screen.getByText("/ 100")).toBeInTheDocument();
    });

    it("从步骤 3 点击'确认并继续'应该前进到步骤 4 (最终决定)", async () => {
      const user = userEvent.setup();
      const kycDetail = createMockKycDetail();
      render(<ReviewStepperModal kycDetail={kycDetail} {...defaultProps} />);

      // 前进到步骤 4
      await user.click(screen.getByRole("button", { name: /确认并继续/ }));
      await user.click(screen.getByRole("button", { name: /确认并继续/ }));
      await user.click(screen.getByRole("button", { name: /确认并继续/ }));

      // 步骤 4: 应该显示审核决定区域
      expect(screen.getByText("审核步骤汇总")).toBeInTheDocument();
      expect(screen.getByText("审核决定")).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 步骤 4 通过/拒绝按钮交互
  // --------------------------------------------------------------------------
  describe("步骤 4 通过/拒绝按钮交互", () => {
    async function navigateToStep4(user: ReturnType<typeof userEvent.setup>) {
      await user.click(screen.getByRole("button", { name: /确认并继续/ }));
      await user.click(screen.getByRole("button", { name: /确认并继续/ }));
      await user.click(screen.getByRole("button", { name: /确认并继续/ }));
    }

    /**
     * **Validates: Requirements 6.4**
     */
    it("点击'通过审核'应该调用 onApprove 回调", async () => {
      const user = userEvent.setup();
      const onApprove = vi.fn();
      const kycDetail = createMockKycDetail();
      render(
        <ReviewStepperModal
          kycDetail={kycDetail}
          {...defaultProps}
          onApprove={onApprove}
        />
      );

      await navigateToStep4(user);

      // 点击通过审核
      const approveBtn = screen.getByRole("button", { name: /通过审核/ });
      await user.click(approveBtn);

      expect(onApprove).toHaveBeenCalledTimes(1);
      // 验证第一个参数是 kycId
      expect(onApprove).toHaveBeenCalledWith(
        1,
        false,
        expect.objectContaining({
          basic_info_confirmed: true,
          documents_confirmed: true,
          risk_assessment_confirmed: true,
        })
      );
    });

    /**
     * **Validates: Requirements 6.5**
     */
    it("点击'拒绝'应该显示拒绝原因表单", async () => {
      const user = userEvent.setup();
      const kycDetail = createMockKycDetail();
      render(<ReviewStepperModal kycDetail={kycDetail} {...defaultProps} />);

      await navigateToStep4(user);

      // 点击拒绝按钮
      const rejectBtn = screen.getByRole("button", { name: /拒绝/ });
      await user.click(rejectBtn);

      // 应该显示拒绝原因选择和确认拒绝按钮
      expect(
        screen.getByRole("button", { name: /确认拒绝/ })
      ).toBeInTheDocument();
      expect(screen.getByText("取消")).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // isProcessing 状态下按钮禁用
  // --------------------------------------------------------------------------
  describe("isProcessing 状态", () => {
    /**
     * **Validates: Requirements 6.7**
     */
    it("isProcessing=true 时通过和拒绝按钮应该禁用", async () => {
      const user = userEvent.setup();
      const kycDetail = createMockKycDetail();
      render(
        <ReviewStepperModal
          kycDetail={kycDetail}
          {...defaultProps}
          isProcessing={true}
        />
      );

      // 前进到步骤 4
      await user.click(screen.getByRole("button", { name: /确认并继续/ }));
      await user.click(screen.getByRole("button", { name: /确认并继续/ }));
      await user.click(screen.getByRole("button", { name: /确认并继续/ }));

      // 通过和拒绝按钮应该禁用
      const approveBtn = screen.getByRole("button", { name: /处理中/ });
      expect(approveBtn).toBeDisabled();

      const rejectBtn = screen.getByRole("button", { name: /拒绝/ });
      expect(rejectBtn).toBeDisabled();
    });
  });

  // --------------------------------------------------------------------------
  // Modal 关闭时状态重置
  // --------------------------------------------------------------------------
  describe("Modal 关闭时状态重置", () => {
    /**
     * **Validates: Requirements 1.5**
     */
    it("关闭后重新打开应该回到步骤 1", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const kycDetail = createMockKycDetail();

      const { rerender } = render(
        <ReviewStepperModal
          kycDetail={kycDetail}
          {...defaultProps}
          onClose={onClose}
        />
      );

      // 前进到步骤 2
      await user.click(screen.getByRole("button", { name: /确认并继续/ }));
      expect(screen.getByText("admin.kyc.stepper.docReview.idPhotos")).toBeInTheDocument();

      // 关闭 modal (通过 close button)
      const closeButton = screen.getByRole("button", { name: /close/i });
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalled();

      // 重新打开 - 模拟 isOpen 从 false 到 true
      rerender(
        <ReviewStepperModal
          kycDetail={kycDetail}
          {...defaultProps}
          onClose={onClose}
          isOpen={false}
        />
      );
      rerender(
        <ReviewStepperModal
          kycDetail={kycDetail}
          {...defaultProps}
          onClose={onClose}
          isOpen={true}
        />
      );

      // 应该回到步骤 1 (显示基本信息)
      expect(screen.getByText("基本信息")).toBeInTheDocument();
      expect(screen.getByText("张三")).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 各步骤条件渲染
  // --------------------------------------------------------------------------
  describe("条件渲染", () => {
    it("步骤 1: OCR 数据存在时应该显示 OCR 信息", () => {
      const kycDetail = createMockKycDetail({
        ocr_data: {
          confidence_score: 95,
          full_name: "张三",
          id_number: "110101199001011234",
          date_of_birth: "1990-01-01",
        },
      });
      render(<ReviewStepperModal kycDetail={kycDetail} {...defaultProps} />);

      expect(screen.getByText("OCR 识别信息")).toBeInTheDocument();
      expect(screen.getByText("95%")).toBeInTheDocument();
    });

    it("步骤 1: OCR 数据不存在时不应显示 OCR 信息", () => {
      const kycDetail = createMockKycDetail({ ocr_data: null });
      render(<ReviewStepperModal kycDetail={kycDetail} {...defaultProps} />);

      expect(screen.queryByText("OCR 识别信息")).not.toBeInTheDocument();
    });

    it("步骤 3: 风险详情存在时应该显示风险因素列表", async () => {
      const user = userEvent.setup();
      const kycDetail = createMockKycDetail({
        risk_details: {
          factors: [
            { description: "高风险国家", score: 30 },
            { description: "大额交易", score: 15 },
          ],
          pep_matches: [],
          sanction_matches: [],
        },
      });
      render(<ReviewStepperModal kycDetail={kycDetail} {...defaultProps} />);

      // 前进到步骤 3
      await user.click(screen.getByRole("button", { name: /确认并继续/ }));
      await user.click(screen.getByRole("button", { name: /确认并继续/ }));

      expect(screen.getByText("风险因素")).toBeInTheDocument();
      expect(screen.getByText("高风险国家")).toBeInTheDocument();
      expect(screen.getByText("大额交易")).toBeInTheDocument();
    });

    it("步骤 3: 风险详情不存在时不应显示风险因素列表", async () => {
      const user = userEvent.setup();
      const kycDetail = createMockKycDetail({ risk_details: null });
      render(<ReviewStepperModal kycDetail={kycDetail} {...defaultProps} />);

      // 前进到步骤 3
      await user.click(screen.getByRole("button", { name: /确认并继续/ }));
      await user.click(screen.getByRole("button", { name: /确认并继续/ }));

      expect(screen.queryByText("风险因素")).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // kycDetail 为 null 时不渲染
  // --------------------------------------------------------------------------
  describe("kycDetail 为 null", () => {
    it("kycDetail 为 null 时不应渲染任何内容", () => {
      const { container } = render(
        <ReviewStepperModal kycDetail={null} {...defaultProps} />
      );

      expect(
        container.querySelector('[role="dialog"]')
      ).not.toBeInTheDocument();
    });
  });
});
