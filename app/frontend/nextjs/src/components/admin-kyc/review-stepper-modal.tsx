"use client";

/**
 * ReviewStepperModal - KYC 审核分步弹窗容器组件
 *
 * 替换现有 ReviewPanel 的入口组件，保持相同的 props 接口。
 * 使用 Radix UI Dialog 作为弹窗容器，内部通过 useReducer 管理步骤状态，
 * Framer Motion AnimatePresence 实现步骤切换动画。
 *
 * 功能:
 * - 打开时从 kycDetail.review_progress 恢复进度
 * - 步骤确认时调用 PUT /api/v1/admin/kyc/{id}/review-progress 持久化
 * - 通过/拒绝时将 confirmedSteps 转换为 ReviewStepsData 传递给回调
 * - 关闭时 dispatch RESET 重置状态
 */

import { useReducer, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { put } from "@/services/api";
import type { KycDetail } from "@/services/admin-kyc";
import {
  stepperReducer,
  initialState,
  buildReviewSteps,
  type ReviewStepsData,
} from "./stepper-reducer";
import { StepIndicator } from "./step-indicator";
import { StepFooter } from "./step-footer";
import { StepBasicInfo } from "./step-basic-info";
import { StepDocuments } from "./step-documents";
import { StepRiskAssessment } from "./step-risk-assessment";
import { StepFinalDecision } from "./step-final-decision";
import { OnChainStatusPanel } from "./onchain-status-panel";
import { AdmissionButton, shouldShowAdmissionButton } from "./admission-button";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReviewStepperModalProps {
  kycDetail: KycDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (
    kycId: number,
    isAccredited: boolean,
    reviewSteps?: ReviewStepsData
  ) => void;
  onReject: (
    kycId: number,
    reasonCode: string,
    customReason?: string,
    reviewSteps?: ReviewStepsData
  ) => void;
  rejectReasons: Array<{ code: string; labels: { zh: string; en: string } }>;
  isProcessing?: boolean;
  /** Contract info for admission/revocation (from getKycContractInfo) */
  contractInfo?: { contract_address: string; deployer_address: string } | null;
  /** Callback when admission or revocation succeeds */
  onAdmissionSuccess?: () => void;
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
};

const stepTransition = {
  x: { type: "spring" as const, stiffness: 300, damping: 30 },
  opacity: { duration: 0.2 },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReviewStepperModal({
  kycDetail,
  isOpen,
  onClose,
  onApprove,
  onReject,
  rejectReasons,
  isProcessing = false,
  contractInfo,
  onAdmissionSuccess,
}: ReviewStepperModalProps) {
  const [state, dispatch] = useReducer(stepperReducer, initialState);
  const { t } = useTranslation();
  const prevStepRef = useRef(state.currentStep);
  const directionRef = useRef(1);

  // 已审批的 KYC 进入只读查看模式 — 必须在 hooks 之前定义
  const isApproved = kycDetail?.kyc.status === "approved";

  // Track animation direction based on step change
  useEffect(() => {
    directionRef.current = state.currentStep >= prevStepRef.current ? 1 : -1;
    prevStepRef.current = state.currentStep;
  }, [state.currentStep]);

  // -----------------------------------------------------------------------
  // Restore progress when modal opens
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (isOpen && kycDetail) {
      // 已审批的 KYC 进入只读查看模式 — 所有步骤标记为已确认，允许自由切换
      if (isApproved) {
        dispatch({
          type: "RESTORE_PROGRESS",
          currentStep: 0,
          confirmedSteps: [true, true, true, true],
        });
        return;
      }

      // review_progress may exist on the kycDetail from the backend
      const progress = (kycDetail as KycDetail & { review_progress?: {
        current_step: number;
        confirmed_steps: boolean[];
      } | null }).review_progress;

      if (progress && Array.isArray(progress.confirmed_steps)) {
        dispatch({
          type: "RESTORE_PROGRESS",
          currentStep: progress.current_step,
          confirmedSteps: progress.confirmed_steps,
        });
      }
    }
  }, [isOpen, kycDetail, isApproved]);

  // -----------------------------------------------------------------------
  // Persist progress to backend
  // -----------------------------------------------------------------------
  const persistProgress = useCallback(
    async (currentStep: number, confirmedSteps: boolean[]) => {
      if (!kycDetail) return;
      try {
        await put(`/admin/kyc/${kycDetail.kyc.id}/review-progress`, {
          current_step: currentStep,
          confirmed_steps: confirmedSteps,
        });
      } catch {
        // 静默失败 - 进度持久化不应阻塞审核流程
        console.warn("Failed to persist review progress");
      }
    },
    [kycDetail]
  );

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleConfirmAndNext = useCallback(() => {
    dispatch({ type: "CONFIRM_STEP" });

    // After CONFIRM_STEP, the new state will have currentStep + 1
    // and confirmedSteps[currentStep] = true
    // We compute the next state values to persist
    // 已审批的 KYC 跳过进度持久化
    if (kycDetail && state.currentStep < 3 && !isApproved) {
      const newConfirmedSteps = [...state.confirmedSteps] as boolean[];
      newConfirmedSteps[state.currentStep] = true;
      persistProgress(state.currentStep + 1, newConfirmedSteps);
    }
  }, [state.currentStep, state.confirmedSteps, kycDetail, persistProgress, isApproved]);

  const handleGoBack = useCallback(() => {
    if (state.currentStep > 0) {
      dispatch({ type: "GO_TO_STEP", step: state.currentStep - 1 });
    }
  }, [state.currentStep]);

  const handleStepClick = useCallback(
    (step: number) => {
      dispatch({ type: "GO_TO_STEP", step });
    },
    []
  );

  const handleApprove = useCallback(() => {
    if (!kycDetail) return;
    const reviewSteps = buildReviewSteps(state.confirmedSteps);
    onApprove(kycDetail.kyc.id, state.isAccredited, reviewSteps);
  }, [kycDetail, state.confirmedSteps, state.isAccredited, onApprove]);

  const handleReject = useCallback(() => {
    if (!kycDetail || !state.selectedRejectCode) return;
    const reviewSteps = buildReviewSteps(state.confirmedSteps);
    onReject(
      kycDetail.kyc.id,
      state.selectedRejectCode,
      state.selectedRejectCode === "other"
        ? state.customRejectReason
        : undefined,
      reviewSteps
    );
  }, [
    kycDetail,
    state.confirmedSteps,
    state.selectedRejectCode,
    state.customRejectReason,
    onReject,
  ]);

  const handleClose = useCallback(() => {
    dispatch({ type: "RESET" });
    onClose();
  }, [onClose]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        handleClose();
      }
    },
    [handleClose]
  );

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (!kycDetail) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-5xl max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col"
        hideCloseButton={false}
      >
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-0 shrink-0">
          <DialogTitle className="text-lg font-semibold text-white">
            {t("admin.kyc.stepper.modalTitle", { name: kycDetail.kyc.full_name || kycDetail.kyc.wallet_address.slice(0, 10) + "..." })}
          </DialogTitle>
          <DialogDescription className="text-sm text-white/50">
            {t("admin.kyc.stepper.modalDescription")}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="shrink-0 border-b border-white/[0.08]">
          <StepIndicator
            currentStep={state.currentStep}
            confirmedSteps={state.confirmedSteps}
            onStepClick={handleStepClick}
          />
        </div>

        {/* Step Content - scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-6">
            <AnimatePresence mode="wait" custom={directionRef.current}>
              <motion.div
                key={state.currentStep}
                custom={directionRef.current}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={stepTransition}
              >
                {state.currentStep === 0 && (
                  <StepBasicInfo kycDetail={kycDetail} />
                )}
                {state.currentStep === 1 && (
                  <StepDocuments kycDetail={kycDetail} />
                )}
                {state.currentStep === 2 && (
                  <StepRiskAssessment kycDetail={kycDetail} />
                )}
                {state.currentStep === 3 && !isApproved && (
                  <StepFinalDecision
                    kycDetail={kycDetail}
                    confirmedSteps={state.confirmedSteps}
                    isAccredited={state.isAccredited}
                    onAccreditedChange={(value) =>
                      dispatch({ type: "SET_ACCREDITED", value })
                    }
                    rejectFormVisible={state.rejectFormVisible}
                    selectedRejectCode={state.selectedRejectCode}
                    customRejectReason={state.customRejectReason}
                    onToggleRejectForm={() =>
                      dispatch({ type: "TOGGLE_REJECT_FORM" })
                    }
                    onRejectCodeChange={(code) =>
                      dispatch({ type: "SET_REJECT_CODE", code })
                    }
                    onCustomReasonChange={(reason) =>
                      dispatch({ type: "SET_CUSTOM_REASON", reason })
                    }
                    onApprove={handleApprove}
                    onReject={handleReject}
                    rejectReasons={rejectReasons}
                    isProcessing={isProcessing}
                  />
                )}
              </motion.div>
            </AnimatePresence>

            {/* 链上状态面板: on_chain_sync_status=SYNCED 或 REVOKED */}
            {contractInfo && (kycDetail.kyc.on_chain_sync_status === "synced" || kycDetail.kyc.on_chain_sync_status === "revoked") && (
              <div className="mt-6">
                <OnChainStatusPanel
                  kycDetail={kycDetail}
                  contractAddress={contractInfo.contract_address}
                  deployerAddress={contractInfo.deployer_address}
                  onRevocationSuccess={onAdmissionSuccess ?? (() => {})}
                />
              </div>
            )}

            {contractInfo && shouldShowAdmissionButton(kycDetail.kyc.status, kycDetail.kyc.on_chain_sync_status) && (
              <div className="mt-6 p-4 rounded-lg border border-amber-500/30 bg-amber-500/10">
                <div className="mb-3">
                  <p className="text-sm font-medium text-amber-400">
                    {t("admin.kyc.stepper.admissionRequiredTitle", "审核已通过，请继续完成链上准入")}
                  </p>
                  <p className="text-xs text-white/70 mt-1">
                    {t(
                      "admin.kyc.stepper.admissionRequiredDesc",
                      "当前仅完成后台审核，尚未写入链上。请点击下方按钮发起准入交易。"
                    )}
                  </p>
                </div>

                <AdmissionButton
                  kycId={kycDetail.kyc.id}
                  walletAddress={kycDetail.kyc.wallet_address}
                  countryCode={kycDetail.kyc.country_code || ""}
                  isAccredited={kycDetail.kyc.is_accredited ?? false}
                  isReAdmission={kycDetail.kyc.on_chain_sync_status === "revoked"}
                  contractAddress={contractInfo.contract_address}
                  deployerAddress={contractInfo.deployer_address}
                  onSuccess={onAdmissionSuccess ?? (() => {})}
                />
              </div>
            )}
          </div>
        </div>

        {/* Step Footer - steps 1-3 only, hidden for approved KYC (read-only mode) */}
        {!isApproved && (
          <div className="shrink-0">
            <StepFooter
              currentStep={state.currentStep}
              onConfirmAndNext={handleConfirmAndNext}
              onGoBack={handleGoBack}
              isFirstStep={state.currentStep === 0}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ReviewStepperModal;
