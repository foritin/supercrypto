"use client";

/**
 * StepFinalDecision - 步骤 4: 最终决定
 *
 * 包含:
 * - ReviewSummary: 前三步确认状态汇总 (✅ 已确认 / ⚠️ 有问题)
 * - AuditTimeline: 审核历史时间线
 * - 合格投资者勾选框
 * - 通过/拒绝按钮 + 拒绝原因选择表单
 * - isProcessing 状态下禁用按钮
 */

import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  RefreshCw,
  AlertTriangle,
  User,
  ShieldCheck,
  Gavel,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SectionCard } from "@/components/ui";
import { STEPS } from "./stepper-reducer";
import type { KycDetail } from "@/services/admin-kyc";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface StepFinalDecisionProps {
  kycDetail: KycDetail;
  confirmedSteps: boolean[];
  isAccredited: boolean;
  onAccreditedChange: (value: boolean) => void;
  rejectFormVisible: boolean;
  selectedRejectCode: string;
  customRejectReason: string;
  onToggleRejectForm: () => void;
  onRejectCodeChange: (code: string) => void;
  onCustomReasonChange: (reason: string) => void;
  onApprove: () => void;
  onReject: () => void;
  rejectReasons: Array<{ code: string; labels: { zh: string; en: string } }>;
  isProcessing?: boolean;
}

export interface ReviewSummaryProps {
  confirmedSteps: boolean[];
}

// ---------------------------------------------------------------------------
// Step icon mapping (for ReviewSummary)
// ---------------------------------------------------------------------------

const STEP_ICONS: React.ElementType[] = [User, FileText, ShieldCheck];

// ---------------------------------------------------------------------------
// ReviewSummary - 前三步确认状态汇总
// ---------------------------------------------------------------------------

/**
 * ReviewSummary 组件
 *
 * 展示前三步的确认状态:
 * - ✅ 已确认 (绿色)
 * - ⚠️ 有问题 (黄色警告)
 */
export function ReviewSummary({ confirmedSteps }: ReviewSummaryProps) {
  const { t } = useTranslation();

  return (
    <SectionCard
      title={t("admin.kyc.stepper.reviewSummary")}
      icon={<Gavel className="w-4 h-4" />}
      className="border-white/[0.08]"
    >
      <div className="space-y-2">
        {STEPS.slice(0, 3).map((step, index) => {
          const isConfirmed = confirmedSteps[index] ?? false;
          const Icon = STEP_ICONS[index] ?? User;

          return (
            <div
              key={step.key}
              data-testid={`review-summary-step-${index}`}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                isConfirmed
                  ? "bg-emerald-500/5 border-emerald-500/20"
                  : "bg-amber-500/5 border-amber-500/20"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isConfirmed ? "bg-emerald-500/10" : "bg-amber-500/10"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isConfirmed ? "text-emerald-400" : "text-amber-400"
                    }`}
                  />
                </div>
                <span className="text-sm text-white/80">{t(step.label)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {isConfirmed ? (
                  <>
                    <CheckCircle2
                      className="w-4 h-4 text-emerald-400"
                    />
                    <span
                      className="text-xs text-emerald-400"
                      data-testid={`step-status-${index}`}
                    >
                      {t("admin.kyc.stepper.confirmed")}
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle
                      className="w-4 h-4 text-amber-400"
                    />
                    <span
                      className="text-xs text-amber-400"
                      data-testid={`step-status-${index}`}
                    >
                      {t("admin.kyc.stepper.hasIssues")}
                    </span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// AuditTimeline - 审核历史时间线
// ---------------------------------------------------------------------------

function AuditTimeline({ logs }: { logs: KycDetail["audit_logs"] }) {
  const { t } = useTranslation();

  const getActionIcon = (action: string) => {
    switch (action) {
      case "submit":
        return <FileText className="w-4 h-4 text-white/60" />;
      case "approve":
        return (
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        );
      case "reject":
        return <XCircle className="w-4 h-4 text-red-400" />;
      case "sync":
        return (
          <RefreshCw className="w-4 h-4 text-white/60" />
        );
      default:
        return <Clock className="w-4 h-4 text-white/60" />;
    }
  };

  const ACTION_LABEL_KEYS: Record<string, string> = {
    submit: "admin.kyc.stepper.actionSubmit",
    review: "admin.kyc.stepper.actionReview",
    approve: "admin.kyc.stepper.actionApprove",
    reject: "admin.kyc.stepper.actionReject",
    resubmit: "admin.kyc.stepper.actionResubmit",
    sync: "admin.kyc.stepper.actionSync",
    reset: "admin.kyc.stepper.actionReset",
  };

  const getActionLabel = (action: string) => {
    const key = ACTION_LABEL_KEYS[action];
    return key ? t(key) : action;
  };

  if (logs.length === 0) {
    return (
      <SectionCard
        title={t("admin.kyc.stepper.auditHistory")}
        icon={<Clock className="w-4 h-4" />}
        className="border-white/[0.08]"
      >
        <div className="text-center py-6 text-white/40 text-sm">
          {t("admin.kyc.stepper.noAuditRecords")}
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title={t("admin.kyc.stepper.auditHistory")}
      icon={<Clock className="w-4 h-4" />}
      className="border-white/[0.08]"
    >
      <div className="space-y-4">
        {logs.map((log, index) => (
          <div key={log.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                {getActionIcon(log.action)}
              </div>
              {index < logs.length - 1 && (
                <div className="w-px flex-1 bg-white/10 mt-2" />
              )}
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">
                  {getActionLabel(log.action)}
                </span>
                <span className="text-xs text-white/40">
                  {new Date(log.created_at).toLocaleString("zh-CN")}
                </span>
              </div>
              <p className="text-xs text-white/50 mt-1">
                {log.actor_role === "system"
                  ? t("admin.kyc.stepper.system")
                  : log.actor_address.slice(0, 6) +
                    "..." +
                    log.actor_address.slice(-4)}
              </p>
              {Object.keys(log.details).length > 0 && (
                <div className="mt-2 p-2 bg-white/5 rounded text-xs text-white/60">
                  {JSON.stringify(log.details)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// StepFinalDecision - 主组件
// ---------------------------------------------------------------------------

export function StepFinalDecision({
  kycDetail,
  confirmedSteps,
  isAccredited,
  onAccreditedChange,
  rejectFormVisible,
  selectedRejectCode,
  customRejectReason,
  onToggleRejectForm,
  onRejectCodeChange,
  onCustomReasonChange,
  onApprove,
  onReject,
  rejectReasons,
  isProcessing = false,
}: StepFinalDecisionProps) {
  const { t } = useTranslation();
  const { audit_logs } = kycDetail;

  return (
    <div className="space-y-4">
      {/* 审核步骤汇总 */}
      <ReviewSummary confirmedSteps={confirmedSteps} />

      {/* 审核历史时间线 */}
      <AuditTimeline logs={audit_logs} />

      {/* 合格投资者勾选框 */}
      <SectionCard
        title={t("admin.kyc.stepper.investorQualification")}
        icon={<ShieldCheck className="w-4 h-4" />}
        className="border-white/[0.08]"
      >
        <div className="flex items-center gap-3 py-1">
          <Checkbox
            id="accredited-investor"
            checked={isAccredited}
            onCheckedChange={(checked) =>
              onAccreditedChange(checked === true)
            }
            disabled={isProcessing}
            className="border-white/30 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
          />
          <label
            htmlFor="accredited-investor"
            className="text-sm text-white/80 cursor-pointer select-none"
          >
            {t("admin.kyc.stepper.markAccredited")}
          </label>
        </div>
      </SectionCard>

      {/* 审核操作区域 */}
      <SectionCard
        title={t("admin.kyc.stepper.reviewDecision")}
        icon={<Gavel className="w-4 h-4" />}
        className="border-white/[0.08]"
      >
        {rejectFormVisible ? (
          <div className="space-y-4">
            <Select
              value={selectedRejectCode}
              onValueChange={onRejectCodeChange}
            >
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue placeholder={t("admin.kyc.stepper.selectRejectReason")} />
              </SelectTrigger>
              <SelectContent>
                {rejectReasons.map((reason) => (
                  <SelectItem key={reason.code} value={reason.code}>
                    {reason.labels.zh}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedRejectCode === "other" && (
              <Textarea
                placeholder={t("admin.kyc.stepper.enterRejectReason")}
                value={customRejectReason}
                onChange={(e) => onCustomReasonChange(e.target.value)}
                rows={3}
                className="bg-white/5 border-white/10 resize-none"
              />
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 bg-white/5 border-white/10 hover:bg-white/10"
                onClick={onToggleRejectForm}
                disabled={isProcessing}
              >
                {t("admin.kyc.stepper.cancel")}
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={!selectedRejectCode || isProcessing}
                onClick={onReject}
              >
                {isProcessing ? t("admin.kyc.stepper.processing") : t("admin.kyc.stepper.confirmReject")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 bg-transparent h-11 rounded-xl"
              onClick={onToggleRejectForm}
              disabled={isProcessing}
            >
              <XCircle className="w-4 h-4 mr-2" />
              {t("admin.kyc.stepper.reject")}
            </Button>
            <Button
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white h-11 rounded-xl"
              onClick={onApprove}
              disabled={isProcessing}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {isProcessing ? t("admin.kyc.stepper.processing") : t("admin.kyc.stepper.approveReview")}
            </Button>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

export default StepFinalDecision;
