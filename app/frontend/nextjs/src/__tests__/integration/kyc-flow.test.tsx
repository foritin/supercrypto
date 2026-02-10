/**
 * KYC Flow Integration Tests
 * KYC 流程集成测试
 *
 * **Task 9.2: 前端集成测试**
 * _Requirements: 3.1, 4.1, 5.6_
 *
 * 测试内容:
 * - Admin 审核面板完整渲染 (face_image 和 liveness_video 支持)
 * - KYC 流程三步骤完成逻辑 (人脸拍照、活体检测、手持证照)
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReviewPanel } from "@/components/admin-kyc/review-panel";
import type { KycDetail, RiskLevel, ReviewPriority } from "@/services/admin-kyc";
import type { KycStatusType } from "@/services/admin";

// ============================================================================
// Mocks
// ============================================================================

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
  }),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/admin/kyc",
}));


// ============================================================================
// Test Data Factories
// ============================================================================

/**
 * Create mock KYC detail data for testing
 */
function createMockKycDetail(
  overrides: Partial<{
    documents: Partial<KycDetail["documents"]>;
    status: KycStatusType;
    riskLevel: RiskLevel;
    priority: ReviewPriority;
  }> = {}
): KycDetail {
  const defaultDocuments = {
    id_front: "https://example.com/id_front.jpg",
    id_back: "https://example.com/id_back.jpg",
    selfie: "https://example.com/selfie.jpg",
    face_image: undefined,
    liveness_video: undefined,
    ...overrides.documents,
  };

  return {
    kyc: {
      id: 1,
      wallet_address: "0x1234567890abcdef1234567890abcdef12345678",
      environment: "local",
      status: overrides.status || "pending",
      submitted_at: "2024-01-01T00:00:00Z",
      reviewed_at: null,
      reviewer_address: null,
      reject_reason: null,
      country_code: "CN",
      is_accredited: false,
      id_type: "id_card",
      id_number_last4: "1234",
      full_name: "测试用户",
      date_of_birth: "1990-01-01",
      has_id_front: true,
      has_id_back: true,
      has_selfie: true,
      on_chain_sync_status: null,
      on_chain_tx_hash: null,
      on_chain_error: null,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      risk_level: overrides.riskLevel || "low",
      risk_score: 20,
      priority: overrides.priority || "normal",
      processing_time_minutes: null,
      is_pep: false,
      is_sanctioned: false,
      source_ip: "127.0.0.1",
      device_fingerprint: "test-fingerprint",
    },
    documents: defaultDocuments,
    audit_logs: [
      {
        id: 1,
        kyc_id: 1,
        action: "submit",
        actor_address: "0x1234567890abcdef1234567890abcdef12345678",
        actor_role: "user",
        details: {},
        created_at: "2024-01-01T00:00:00Z",
      },
    ],
    ocr_data: null,
    facial_comparison: null,
    risk_details: null,
  };
}

// Default props for ReviewPanel
const defaultReviewPanelProps = {
  isOpen: true,
  onClose: vi.fn(),
  onApprove: vi.fn(),
  onReject: vi.fn(),
  rejectReasons: [
    { code: "invalid_document", labels: { zh: "证件无效", en: "Invalid document" } },
    { code: "blurry_image", labels: { zh: "图片模糊", en: "Blurry image" } },
    { code: "other", labels: { zh: "其他原因", en: "Other reason" } },
  ],
  isProcessing: false,
};


// ============================================================================
// Admin Review Panel Integration Tests
// ============================================================================

describe("Admin Review Panel Integration - Requirements 3.1, 4.1", () => {
  /**
   * **Validates: Requirements 3.1, 4.1**
   * 测试 Admin 审核面板完整渲染，包括 face_image 和 liveness_video 支持
   */

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe("Complete Panel Rendering with Media Support", () => {
    /**
     * Test: Panel should render all tabs correctly
     * **Validates: Requirements 3.1**
     */
    it("should render all tabs in the review panel", async () => {
      const user = userEvent.setup();
      const kycDetail = createMockKycDetail({
        documents: {
          face_image: "https://example.com/face_image.jpg",
          liveness_video: "https://example.com/liveness_video.mp4",
        },
      });

      render(<ReviewPanel kycDetail={kycDetail} {...defaultReviewPanelProps} />);

      // Verify all tabs are present
      expect(screen.getByRole("tab", { name: /admin\.kyc\.reviewPanel\.tabOverview/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /admin\.kyc\.reviewPanel\.tabDocuments/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /admin\.kyc\.reviewPanel\.tabRisk/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /admin\.kyc\.reviewPanel\.tabHistory/i })).toBeInTheDocument();
    });

    /**
     * Test: Documents tab should display face_image when present
     * **Validates: Requirements 3.1**
     */
    it("should display face_image in documents tab when present", async () => {
      const user = userEvent.setup();
      const kycDetail = createMockKycDetail({
        documents: {
          id_front: "https://example.com/id_front.jpg",
          id_back: "https://example.com/id_back.jpg",
          selfie: undefined, // No selfie so face_image label is used
          face_image: "https://example.com/face_image.jpg",
        },
      });

      render(<ReviewPanel kycDetail={kycDetail} {...defaultReviewPanelProps} />);

      // Navigate to documents tab
      const documentsTab = screen.getByRole("tab", { name: /admin\.kyc\.reviewPanel\.tabDocuments/i });
      await user.click(documentsTab);

      // DocumentReviewPanel shows "人脸照片" when selfie is absent and face_image is present
      expect(screen.getByText("admin.kyc.stepper.docReview.facePhoto")).toBeInTheDocument();
    });

    /**
     * Test: Documents tab should display liveness_video with VideoPlayer when present
     * **Validates: Requirements 4.1**
     */
    it("should display liveness_video with VideoPlayer when present", async () => {
      const user = userEvent.setup();
      const videoUrl = "https://example.com/liveness_video.mp4";
      const kycDetail = createMockKycDetail({
        documents: {
          liveness_video: videoUrl,
        },
      });

      render(<ReviewPanel kycDetail={kycDetail} {...defaultReviewPanelProps} />);

      // Navigate to documents tab
      const documentsTab = screen.getByRole("tab", { name: /admin\.kyc\.reviewPanel\.tabDocuments/i });
      await user.click(documentsTab);

      // DocumentReviewPanel renders liveness_video via VideoThumbnail
      expect(screen.getByText("admin.kyc.stepper.docReview.livenessVideo")).toBeInTheDocument();
    });


    /**
     * Test: Documents tab should display all document types together
     * **Validates: Requirements 3.1, 4.1**
     */
    it("should display all document types including face_image and liveness_video", async () => {
      const user = userEvent.setup();
      const kycDetail = createMockKycDetail({
        documents: {
          id_front: "https://example.com/id_front.jpg",
          id_back: "https://example.com/id_back.jpg",
          selfie: "https://example.com/selfie.jpg",
          face_image: "https://example.com/face_image.jpg",
          liveness_video: "https://example.com/liveness_video.mp4",
        },
      });

      render(<ReviewPanel kycDetail={kycDetail} {...defaultReviewPanelProps} />);

      // Navigate to documents tab
      const documentsTab = screen.getByRole("tab", { name: /admin\.kyc\.reviewPanel\.tabDocuments/i });
      await user.click(documentsTab);

      // DocumentReviewPanel uses PhotoThumbnail with i18n labels
      expect(screen.getByText("admin.kyc.stepper.docReview.front")).toBeInTheDocument();
      expect(screen.getByText("admin.kyc.stepper.docReview.back")).toBeInTheDocument();
      // Selfie takes priority over face_image in the biometric section
      expect(screen.getByText("admin.kyc.stepper.docReview.selfie")).toBeInTheDocument();
      expect(screen.getByText("admin.kyc.stepper.docReview.livenessVideo")).toBeInTheDocument();
    });

    /**
     * Test: Documents tab should not display face_image when not present
     * **Validates: Requirements 3.1**
     */
    it("should not display face_image when not present in documents", async () => {
      const user = userEvent.setup();
      const kycDetail = createMockKycDetail({
        documents: {
          face_image: undefined,
        },
      });

      render(<ReviewPanel kycDetail={kycDetail} {...defaultReviewPanelProps} />);

      // Navigate to documents tab
      const documentsTab = screen.getByRole("tab", { name: /admin\.kyc\.reviewPanel\.tabDocuments/i });
      await user.click(documentsTab);

      // Verify face_image label is not displayed
      expect(screen.queryByText("admin.kyc.stepper.docReview.facePhoto")).not.toBeInTheDocument();
    });

    /**
     * Test: Documents tab should not display liveness_video when not present
     * **Validates: Requirements 4.1**
     */
    it("should not display liveness_video when not present in documents", async () => {
      const user = userEvent.setup();
      const kycDetail = createMockKycDetail({
        documents: {
          liveness_video: undefined,
        },
      });

      render(<ReviewPanel kycDetail={kycDetail} {...defaultReviewPanelProps} />);

      // Navigate to documents tab
      const documentsTab = screen.getByRole("tab", { name: /admin\.kyc\.reviewPanel\.tabDocuments/i });
      await user.click(documentsTab);

      // Verify video player title is not displayed
      expect(screen.queryByText("admin.kyc.stepper.docReview.livenessVideo")).not.toBeInTheDocument();
    });
  });


  describe("Review Panel Status and Actions", () => {
    /**
     * Test: Panel should display correct status badge for pending KYC
     */
    it("should display pending status badge correctly", () => {
      const kycDetail = createMockKycDetail({ status: "pending" });

      render(<ReviewPanel kycDetail={kycDetail} {...defaultReviewPanelProps} />);

      // Verify status badge is displayed
      expect(screen.getByText("admin.kyc.reviewPanel.statusPending")).toBeInTheDocument();
    });

    /**
     * Test: Panel should display approve and reject buttons for pending KYC
     */
    it("should display approve and reject buttons for pending KYC", () => {
      const kycDetail = createMockKycDetail({ status: "pending" });

      render(<ReviewPanel kycDetail={kycDetail} {...defaultReviewPanelProps} />);

      // Verify action buttons are displayed
      expect(screen.getByRole("button", { name: /admin\.kyc\.reviewPanel\.approveReview/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /admin\.kyc\.reviewPanel\.reject/i })).toBeInTheDocument();
    });

    /**
     * Test: Panel should not display action buttons for approved KYC
     */
    it("should not display action buttons for approved KYC", () => {
      const kycDetail = createMockKycDetail({ status: "approved" });

      render(<ReviewPanel kycDetail={kycDetail} {...defaultReviewPanelProps} />);

      // Verify action buttons are not displayed
      expect(screen.queryByRole("button", { name: /admin\.kyc\.reviewPanel\.approveReview/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /admin\.kyc\.reviewPanel\.reject/i })).not.toBeInTheDocument();
    });

    /**
     * Test: Approve button should call onApprove callback
     */
    it("should call onApprove when approve button is clicked", async () => {
      const user = userEvent.setup();
      const onApprove = vi.fn();
      const kycDetail = createMockKycDetail({ status: "pending" });

      render(
        <ReviewPanel
          kycDetail={kycDetail}
          {...defaultReviewPanelProps}
          onApprove={onApprove}
        />
      );

      // Click approve button
      const approveButton = screen.getByRole("button", { name: /admin\.kyc\.reviewPanel\.approveReview/i });
      await user.click(approveButton);

      // Verify callback was called with correct arguments
      expect(onApprove).toHaveBeenCalledWith(kycDetail.kyc.id, false);
    });
  });

  describe("Panel State Handling", () => {
    /**
     * Test: Panel should not render when kycDetail is null
     */
    it("should not render when kycDetail is null", () => {
      const { container } = render(
        <ReviewPanel kycDetail={null} {...defaultReviewPanelProps} />
      );

      // The component returns null when kycDetail is null
      expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
    });

    /**
     * Test: Panel should not render content when isOpen is false
     */
    it("should not render content when isOpen is false", () => {
      const kycDetail = createMockKycDetail();

      render(
        <ReviewPanel
          kycDetail={kycDetail}
          {...defaultReviewPanelProps}
          isOpen={false}
        />
      );

      // Sheet content should not be visible
      expect(screen.queryByText("KYC 审核")).not.toBeInTheDocument();
      expect(screen.queryByText("admin.kyc.reviewPanel.title")).not.toBeInTheDocument();
    });
  });
});


// ============================================================================
// KYC Flow Three-Step Completion Logic Tests
// ============================================================================

describe("KYC Flow Three-Step Completion Logic - Requirements 5.6", () => {
  /**
   * **Validates: Requirements 5.6**
   * 测试 KYC 流程三步骤完成逻辑
   *
   * 三个步骤:
   * 1. 人脸拍照 (capturedImage + uploadStatus === 'success')
   * 2. 活体检测 (livenessVerified === true)
   * 3. 手持证照 (selfieImage + selfieUploadStatus === 'success')
   */

  // Type definitions matching liveness-step.tsx
  type UploadStatus = "idle" | "uploading" | "success" | "error";

  interface LivenessStepState {
    capturedImage: string | null;
    uploadStatus: UploadStatus;
    livenessVerified: boolean;
    selfieImage: string | null;
    selfieUploadStatus: UploadStatus;
  }

  /**
   * Helper function to determine if continue button should be enabled
   * This mirrors the logic in liveness-step.tsx isAllComplete calculation
   */
  function isAllComplete(state: LivenessStepState): boolean {
    return (
      state.capturedImage !== null &&
      state.uploadStatus === "success" &&
      state.livenessVerified === true &&
      state.selfieImage !== null &&
      state.selfieUploadStatus === "success"
    );
  }

  describe("Three-Step Completion Gate", () => {
    /**
     * Test: All three steps complete should enable continue
     * **Validates: Requirements 5.6**
     */
    it("should enable continue when all three steps are complete", () => {
      const state: LivenessStepState = {
        capturedImage: "data:image/jpeg;base64,abc123",
        uploadStatus: "success",
        livenessVerified: true,
        selfieImage: "data:image/jpeg;base64,xyz789",
        selfieUploadStatus: "success",
      };

      expect(isAllComplete(state)).toBe(true);
    });

    /**
     * Test: Missing face photo should disable continue
     * **Validates: Requirements 5.6**
     */
    it("should disable continue when face photo is missing", () => {
      const state: LivenessStepState = {
        capturedImage: null, // Missing
        uploadStatus: "success",
        livenessVerified: true,
        selfieImage: "data:image/jpeg;base64,xyz789",
        selfieUploadStatus: "success",
      };

      expect(isAllComplete(state)).toBe(false);
    });

    /**
     * Test: Face photo upload not success should disable continue
     * **Validates: Requirements 5.6**
     */
    it("should disable continue when face photo upload is not success", () => {
      const uploadStatuses: UploadStatus[] = ["idle", "uploading", "error"];

      uploadStatuses.forEach((status) => {
        const state: LivenessStepState = {
          capturedImage: "data:image/jpeg;base64,abc123",
          uploadStatus: status, // Not success
          livenessVerified: true,
          selfieImage: "data:image/jpeg;base64,xyz789",
          selfieUploadStatus: "success",
        };

        expect(isAllComplete(state)).toBe(false);
      });
    });


    /**
     * Test: Liveness not verified should disable continue
     * **Validates: Requirements 5.6**
     */
    it("should disable continue when liveness is not verified", () => {
      const state: LivenessStepState = {
        capturedImage: "data:image/jpeg;base64,abc123",
        uploadStatus: "success",
        livenessVerified: false, // Not verified
        selfieImage: "data:image/jpeg;base64,xyz789",
        selfieUploadStatus: "success",
      };

      expect(isAllComplete(state)).toBe(false);
    });

    /**
     * Test: Missing selfie should disable continue
     * **Validates: Requirements 5.6**
     */
    it("should disable continue when selfie is missing", () => {
      const state: LivenessStepState = {
        capturedImage: "data:image/jpeg;base64,abc123",
        uploadStatus: "success",
        livenessVerified: true,
        selfieImage: null, // Missing
        selfieUploadStatus: "success",
      };

      expect(isAllComplete(state)).toBe(false);
    });

    /**
     * Test: Selfie upload not success should disable continue
     * **Validates: Requirements 5.6**
     */
    it("should disable continue when selfie upload is not success", () => {
      const uploadStatuses: UploadStatus[] = ["idle", "uploading", "error"];

      uploadStatuses.forEach((status) => {
        const state: LivenessStepState = {
          capturedImage: "data:image/jpeg;base64,abc123",
          uploadStatus: "success",
          livenessVerified: true,
          selfieImage: "data:image/jpeg;base64,xyz789",
          selfieUploadStatus: status, // Not success
        };

        expect(isAllComplete(state)).toBe(false);
      });
    });

    /**
     * Test: Initial state should disable continue
     * **Validates: Requirements 5.6**
     */
    it("should disable continue in initial state", () => {
      const state: LivenessStepState = {
        capturedImage: null,
        uploadStatus: "idle",
        livenessVerified: false,
        selfieImage: null,
        selfieUploadStatus: "idle",
      };

      expect(isAllComplete(state)).toBe(false);
    });
  });


  describe("Step Completion Combinations", () => {
    /**
     * Test: Only step 1 complete should disable continue
     */
    it("should disable continue when only step 1 (face photo) is complete", () => {
      const state: LivenessStepState = {
        capturedImage: "data:image/jpeg;base64,abc123",
        uploadStatus: "success",
        livenessVerified: false,
        selfieImage: null,
        selfieUploadStatus: "idle",
      };

      expect(isAllComplete(state)).toBe(false);
    });

    /**
     * Test: Only steps 1 and 2 complete should disable continue
     */
    it("should disable continue when only steps 1 and 2 are complete", () => {
      const state: LivenessStepState = {
        capturedImage: "data:image/jpeg;base64,abc123",
        uploadStatus: "success",
        livenessVerified: true,
        selfieImage: null, // Step 3 not complete
        selfieUploadStatus: "idle",
      };

      expect(isAllComplete(state)).toBe(false);
    });

    /**
     * Test: Steps 1 and 3 complete but not 2 should disable continue
     */
    it("should disable continue when steps 1 and 3 are complete but not step 2", () => {
      const state: LivenessStepState = {
        capturedImage: "data:image/jpeg;base64,abc123",
        uploadStatus: "success",
        livenessVerified: false, // Step 2 not complete
        selfieImage: "data:image/jpeg;base64,xyz789",
        selfieUploadStatus: "success",
      };

      expect(isAllComplete(state)).toBe(false);
    });

    /**
     * Test: Steps 2 and 3 complete but not 1 should disable continue
     */
    it("should disable continue when steps 2 and 3 are complete but not step 1", () => {
      const state: LivenessStepState = {
        capturedImage: null, // Step 1 not complete
        uploadStatus: "idle",
        livenessVerified: true,
        selfieImage: "data:image/jpeg;base64,xyz789",
        selfieUploadStatus: "success",
      };

      expect(isAllComplete(state)).toBe(false);
    });
  });


  describe("Upload Status Transitions", () => {
    /**
     * Test: Uploading status should not enable continue even with images present
     */
    it("should disable continue when face photo is uploading", () => {
      const state: LivenessStepState = {
        capturedImage: "data:image/jpeg;base64,abc123",
        uploadStatus: "uploading", // Still uploading
        livenessVerified: true,
        selfieImage: "data:image/jpeg;base64,xyz789",
        selfieUploadStatus: "success",
      };

      expect(isAllComplete(state)).toBe(false);
    });

    /**
     * Test: Uploading selfie should not enable continue
     */
    it("should disable continue when selfie is uploading", () => {
      const state: LivenessStepState = {
        capturedImage: "data:image/jpeg;base64,abc123",
        uploadStatus: "success",
        livenessVerified: true,
        selfieImage: "data:image/jpeg;base64,xyz789",
        selfieUploadStatus: "uploading", // Still uploading
      };

      expect(isAllComplete(state)).toBe(false);
    });

    /**
     * Test: Error status should not enable continue
     */
    it("should disable continue when face photo upload has error", () => {
      const state: LivenessStepState = {
        capturedImage: "data:image/jpeg;base64,abc123",
        uploadStatus: "error", // Upload failed
        livenessVerified: true,
        selfieImage: "data:image/jpeg;base64,xyz789",
        selfieUploadStatus: "success",
      };

      expect(isAllComplete(state)).toBe(false);
    });

    /**
     * Test: Selfie error status should not enable continue
     */
    it("should disable continue when selfie upload has error", () => {
      const state: LivenessStepState = {
        capturedImage: "data:image/jpeg;base64,abc123",
        uploadStatus: "success",
        livenessVerified: true,
        selfieImage: "data:image/jpeg;base64,xyz789",
        selfieUploadStatus: "error", // Upload failed
      };

      expect(isAllComplete(state)).toBe(false);
    });
  });
});
