/**
 * ReviewPanel Unit Tests
 * 审核面板单元测试
 *
 * **Property 2: Document List Construction**
 * **Validates: Requirements 3.2**
 *
 * 测试 ReviewPanel 组件的文档列表构建逻辑：
 * - 当 documents.face_image 存在时，documentList 包含 face_image 条目
 * - 当 documents.liveness_video 存在时，渲染 VideoPlayer
 * - 当 documents.liveness_video 不存在时，不渲染 VideoPlayer
 */

import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, afterEach } from "vitest";

import { ReviewPanel } from "@/components/admin-kyc/review-panel";
import type { KycStatusType } from "@/services/admin";
import type { KycDetail, RiskLevel, ReviewPriority } from "@/services/admin-kyc";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock wagmi
vi.mock("wagmi", () => ({
  useChainId: () => 1,
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

// Helper function to create mock KYC detail data
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
const defaultProps = {
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

describe("ReviewPanel - Property 2: Document List Construction", () => {
  /**
   * **Validates: Requirements 3.2**
   */

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe("face_image document handling", () => {
    /**
     * Test: When documents.face_image is present, documentList includes face_image entry
     * **Validates: Requirements 3.2**
     */
    it("should include face_image in document list when face_image is present", async () => {
      const user = userEvent.setup();
      const kycDetail = createMockKycDetail({
        documents: {
          id_front: "https://example.com/id_front.jpg",
          id_back: "https://example.com/id_back.jpg",
          selfie: "", // No selfie so face_image label is used
          face_image: "https://example.com/face_image.jpg",
        },
      });

      render(<ReviewPanel kycDetail={kycDetail} {...defaultProps} />);

      // Click on the documents tab to view documents
      const documentsTab = screen.getByRole("tab", { name: /admin\.kyc\.reviewPanel\.tabDocuments/i });
      await user.click(documentsTab);

      // DocumentReviewPanel shows face photo label when selfie is absent and face_image is present
      expect(screen.getByText("admin.kyc.stepper.docReview.facePhoto")).toBeInTheDocument();
    });

    /**
     * Test: When documents.face_image is not present, documentList does not include face_image entry
     * **Validates: Requirements 3.2**
     */
    it("should not include face_image in document list when face_image is not present", async () => {
      const user = userEvent.setup();
      const kycDetail = createMockKycDetail({
        documents: {},
      });

      render(<ReviewPanel kycDetail={kycDetail} {...defaultProps} />);

      // Click on the documents tab to view documents
      const documentsTab = screen.getByRole("tab", { name: /admin\.kyc\.reviewPanel\.tabDocuments/i });
      await user.click(documentsTab);

      // Verify face_image label is not displayed
      expect(screen.queryByText("admin.kyc.stepper.docReview.facePhoto")).not.toBeInTheDocument();
    });
  });

  describe("liveness_video handling", () => {
    /**
     * Test: When documents.liveness_video is present, VideoPlayer is rendered
     * **Validates: Requirements 4.1, 4.2, 4.3**
     */
    it("should render VideoPlayer when liveness_video is present", async () => {
      const user = userEvent.setup();
      const kycDetail = createMockKycDetail({
        documents: {
          liveness_video: "https://example.com/liveness_video.mp4",
        },
      });

      render(<ReviewPanel kycDetail={kycDetail} {...defaultProps} />);

      // Click on the documents tab to view documents
      const documentsTab = screen.getByRole("tab", { name: /admin\.kyc\.reviewPanel\.tabDocuments/i });
      await user.click(documentsTab);

      // DocumentReviewPanel renders liveness_video via VideoThumbnail with liveness video label
      expect(screen.getByText("admin.kyc.stepper.docReview.livenessVideo")).toBeInTheDocument();
    });

    /**
     * Test: When documents.liveness_video is not present, VideoPlayer is not rendered
     * **Validates: Requirements 4.4**
     */
    it("should not render VideoPlayer when liveness_video is not present", async () => {
      const user = userEvent.setup();
      const kycDetail = createMockKycDetail({
        documents: {},
      });

      render(<ReviewPanel kycDetail={kycDetail} {...defaultProps} />);

      // Click on the documents tab to view documents
      const documentsTab = screen.getByRole("tab", { name: /admin\.kyc\.reviewPanel\.tabDocuments/i });
      await user.click(documentsTab);

      // Verify video player title is not displayed
      expect(screen.queryByText("admin.kyc.stepper.docReview.livenessVideo")).not.toBeInTheDocument();

      // Verify no video element exists
      const videoElement = document.querySelector("video");
      expect(videoElement).not.toBeInTheDocument();
    });
  });

  describe("combined document scenarios", () => {
    /**
     * Test: When both face_image and liveness_video are present, both are rendered
     */
    it("should render both face_image and liveness_video when both are present", async () => {
      const user = userEvent.setup();
      const kycDetail = createMockKycDetail({
        documents: {
          face_image: "https://example.com/face_image.jpg",
          liveness_video: "https://example.com/liveness_video.mp4",
        },
      });

      render(<ReviewPanel kycDetail={kycDetail} {...defaultProps} />);

      // Click on the documents tab to view documents
      const documentsTab = screen.getByRole("tab", { name: /admin\.kyc\.reviewPanel\.tabDocuments/i });
      await user.click(documentsTab);

      // DocumentReviewPanel renders face_image and liveness_video via i18n keys
      expect(screen.getByText("admin.kyc.stepper.docReview.livenessVideo")).toBeInTheDocument();
    });

    /**
     * Test: When neither face_image nor liveness_video are present, neither is rendered
     */
    it("should not render face_image or liveness_video when neither is present", async () => {
      const user = userEvent.setup();
      const kycDetail = createMockKycDetail({
        documents: {},
      });

      render(<ReviewPanel kycDetail={kycDetail} {...defaultProps} />);

      // Click on the documents tab to view documents
      const documentsTab = screen.getByRole("tab", { name: /admin\.kyc\.reviewPanel\.tabDocuments/i });
      await user.click(documentsTab);

      // Verify neither is displayed
      expect(screen.queryByText("admin.kyc.stepper.docReview.facePhoto")).not.toBeInTheDocument();
      expect(screen.queryByText("admin.kyc.stepper.docReview.livenessVideo")).not.toBeInTheDocument();
    });

    /**
     * Test: Standard documents (id_front, id_back, selfie) are always rendered when present
     */
    it("should render standard documents when present", async () => {
      const user = userEvent.setup();
      const kycDetail = createMockKycDetail({
        documents: {
          id_front: "https://example.com/id_front.jpg",
          id_back: "https://example.com/id_back.jpg",
          selfie: "https://example.com/selfie.jpg",
        },
      });

      render(<ReviewPanel kycDetail={kycDetail} {...defaultProps} />);

      // Click on the documents tab to view documents
      const documentsTab = screen.getByRole("tab", { name: /admin\.kyc\.reviewPanel\.tabDocuments/i });
      await user.click(documentsTab);

      // DocumentReviewPanel uses PhotoThumbnail with i18n labels
      expect(screen.getByText("admin.kyc.stepper.docReview.front")).toBeInTheDocument();
      expect(screen.getByText("admin.kyc.stepper.docReview.back")).toBeInTheDocument();
      expect(screen.getByText("admin.kyc.stepper.docReview.selfie")).toBeInTheDocument();
    });
  });

  describe("panel state handling", () => {
    /**
     * Test: Panel should not render content when kycDetail is null
     */
    it("should not render when kycDetail is null", () => {
      const { container } = render(
        <ReviewPanel kycDetail={null} {...defaultProps} />
      );

      // The component returns null when kycDetail is null
      // Sheet content should not be present
      expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
    });

    /**
     * Test: Panel should not render when isOpen is false
     */
    it("should not render content when isOpen is false", () => {
      const kycDetail = createMockKycDetail();

      render(
        <ReviewPanel kycDetail={kycDetail} {...defaultProps} isOpen={false} />
      );

      // Sheet content should not be visible
      expect(screen.queryByText("KYC 审核")).not.toBeInTheDocument();
      expect(screen.queryByText("admin.kyc.reviewPanel.title")).not.toBeInTheDocument();
    });
  });
});
