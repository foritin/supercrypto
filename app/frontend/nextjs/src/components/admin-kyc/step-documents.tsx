"use client";

/**
 * StepDocuments - 步骤 2: 证件审核
 *
 * 全宽展示证件图片，复用 DocumentReviewPanel 组件。
 * DocumentReviewPanel 已内置图片放大、旋转、对比模式和视频播放功能。
 */

import { DocumentReviewPanel } from "./document-review-panel";
import type { KycDetail } from "@/services/admin-kyc";

export interface StepDocumentsProps {
  kycDetail: KycDetail;
}

export function StepDocuments({ kycDetail }: StepDocumentsProps) {
  const { documents, ocr_data, facial_comparison, risk_details } = kycDetail;

  return (
    <div className="w-full">
      <DocumentReviewPanel
        documents={documents}
        ocrData={ocr_data}
        facialComparison={facial_comparison}
        riskChecks={risk_details?.checks}
      />
    </div>
  );
}

export default StepDocuments;
