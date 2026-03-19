"use client";

/**
 * StepDocuments - 步骤 2: 证件审核
 *
 * 全宽展示证件图片，复用 DocumentReviewPanel 组件。
 * DocumentReviewPanel 已内置图片放大、旋转、对比模式和视频播放功能。
 */

import type { KycDetail } from "@/services/admin-kyc";

import { DocumentReviewPanel } from "./document-review-panel";

export interface StepDocumentsProps {
  kycDetail: KycDetail;
}

export function StepDocuments({ kycDetail }: StepDocumentsProps) {
  const { documents, ocr_data } = kycDetail;

  return (
    <div className="w-full">
      <DocumentReviewPanel
        documents={documents}
        {...(ocr_data ? { ocrData: ocr_data } : {})}
      />
    </div>
  );
}

export default StepDocuments;
