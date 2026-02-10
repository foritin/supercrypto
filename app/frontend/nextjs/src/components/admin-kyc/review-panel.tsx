"use client";

/**
 * Review Panel - KYC Review Workflow Panel
 * 审核面板 - KYC 审核工作流面板
 * 
 * 参照 ContractDetailPanel 风格重新设计
 * 使用 Sheet + SectionCard + InfoRow 组件
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  X,
  CheckCircle,
  XCircle as XCircleIcon,
  Warning,
  Clock,
  User,
  FileText,
  Shield,
  ShieldWarning,
  Calendar,
  CreditCard,
  Globe,
  DeviceMobile,
  ArrowSquareOut,
  ArrowsClockwise,
  Eye,
  Check,
  Copy,
  Hourglass,
  TrendUp,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type { KycDetail, RiskLevel, ReviewPriority } from "@/services/admin-kyc";
import type { KycStatusType } from "@/services/admin";
import { DocumentViewer } from "./document-viewer";
import { VideoPlayer } from "./video-player";
import { DocumentReviewPanel } from "./document-review-panel";
import { SectionCard, InfoRow } from "@/components/ui";

interface ReviewPanelProps {
  kycDetail: KycDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (kycId: number, isAccredited: boolean) => void;
  onReject: (kycId: number, reasonCode: string, customReason?: string) => void;
  rejectReasons: Array<{ code: string; labels: { zh: string; en: string } }>;
  isProcessing?: boolean;
}

// 状态配置 (不含 label，label 通过 i18n 获取)
const STATUS_CONFIG: Record<KycStatusType, { color: string; bgColor: string; borderColor: string; labelKey: string; icon: React.ElementType }> = {
  not_started: { 
    color: "text-gray-400", 
    bgColor: "rgba(140, 140, 140, 0.1)",
    borderColor: "rgba(140, 140, 140, 0.3)",
    labelKey: "admin.kyc.reviewPanel.statusNotStarted", 
    icon: Clock 
  },
  pending: { 
    color: "text-blue-400", 
    bgColor: "rgba(24, 144, 255, 0.1)",
    borderColor: "rgba(24, 144, 255, 0.3)",
    labelKey: "admin.kyc.reviewPanel.statusPending", 
    icon: Eye 
  },
  approved: { 
    color: "text-emerald-400", 
    bgColor: "rgba(82, 196, 26, 0.1)",
    borderColor: "rgba(82, 196, 26, 0.3)",
    labelKey: "admin.kyc.reviewPanel.statusApproved", 
    icon: CheckCircle 
  },
  rejected: { 
    color: "text-red-400", 
    bgColor: "rgba(255, 77, 79, 0.1)",
    borderColor: "rgba(255, 77, 79, 0.3)",
    labelKey: "admin.kyc.reviewPanel.statusRejected", 
    icon: XCircleIcon 
  },
};

// 风险等级配置
const RISK_CONFIG: Record<RiskLevel, { color: string; bgColor: string; borderColor: string; labelKey: string; icon: React.ElementType }> = {
  low: { 
    color: "text-emerald-400", 
    bgColor: "rgba(82, 196, 26, 0.1)",
    borderColor: "rgba(82, 196, 26, 0.3)",
    labelKey: "admin.kyc.stepper.riskLow", 
    icon: Shield 
  },
  medium: { 
    color: "text-yellow-400", 
    bgColor: "rgba(250, 173, 20, 0.1)",
    borderColor: "rgba(250, 173, 20, 0.3)",
    labelKey: "admin.kyc.stepper.riskMedium", 
    icon: Warning 
  },
  high: { 
    color: "text-orange-400", 
    bgColor: "rgba(255, 140, 0, 0.1)",
    borderColor: "rgba(255, 140, 0, 0.3)",
    labelKey: "admin.kyc.stepper.riskHigh", 
    icon: ShieldWarning 
  },
  critical: { 
    color: "text-red-400", 
    bgColor: "rgba(255, 77, 79, 0.1)",
    borderColor: "rgba(255, 77, 79, 0.3)",
    labelKey: "admin.kyc.stepper.riskCritical", 
    icon: ShieldWarning 
  },
};

// 优先级配置
const PRIORITY_CONFIG: Record<ReviewPriority, { color: string; bgColor: string; labelKey: string }> = {
  low: { color: "text-gray-400", bgColor: "rgba(140, 140, 140, 0.1)", labelKey: "admin.kyc.reviewPanel.priorityLow" },
  normal: { color: "text-blue-400", bgColor: "rgba(24, 144, 255, 0.1)", labelKey: "admin.kyc.reviewPanel.priorityNormal" },
  high: { color: "text-orange-400", bgColor: "rgba(255, 140, 0, 0.1)", labelKey: "admin.kyc.reviewPanel.priorityHigh" },
  urgent: { color: "text-red-400", bgColor: "rgba(255, 77, 79, 0.1)", labelKey: "admin.kyc.reviewPanel.priorityUrgent" },
};

// 审核时间线组件
function AuditTimeline({ logs }: { logs: KycDetail["audit_logs"] }) {
  const { t } = useTranslation();

  const getActionIcon = (action: string) => {
    switch (action) {
      case "submit":
        return <FileText weight="fill" className="w-4 h-4 text-white/60" />;
      case "approve":
        return <CheckCircle weight="fill" className="w-4 h-4 text-emerald-400" />;
      case "reject":
        return <XCircleIcon weight="fill" className="w-4 h-4 text-red-400" />;
      case "sync":
        return <ArrowsClockwise weight="bold" className="w-4 h-4 text-white/60" />;
      default:
        return <Clock weight="fill" className="w-4 h-4 text-white/60" />;
    }
  };

  const getActionLabel = (action: string) => {
    const labelKeys: Record<string, string> = {
      submit: "admin.kyc.reviewPanel.actionSubmit",
      review: "admin.kyc.reviewPanel.actionReview",
      approve: "admin.kyc.reviewPanel.actionApprove",
      reject: "admin.kyc.reviewPanel.actionReject",
      resubmit: "admin.kyc.reviewPanel.actionResubmit",
      sync: "admin.kyc.reviewPanel.actionSync",
      reset: "admin.kyc.reviewPanel.actionReset",
    };
    return labelKeys[action] ? t(labelKeys[action]) : action;
  };

  return (
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
                {new Date(log.created_at).toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-white/50 mt-1">
              {log.actor_role === "system" ? t("admin.kyc.reviewPanel.system") : log.actor_address.slice(0, 6) + "..." + log.actor_address.slice(-4)}
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
  );
}

// 风险详情组件
function RiskDetails({ riskLevel, riskScore, details }: { 
  riskLevel: RiskLevel; 
  riskScore: number;
  details: KycDetail["risk_details"];
}) {
  const { t } = useTranslation();
  const config = RISK_CONFIG[riskLevel];
  const Icon = config.icon;

  return (
    <div className="space-y-4">
      {/* 风险评分 */}
      <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: config.bgColor, border: `1px solid ${config.borderColor}` }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: config.bgColor }}>
          <Icon weight="fill" className="w-8 h-8" style={{ color: config.color.replace('text-', '') }} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-white">{riskScore}</span>
            <span className="text-white/50">/ 100</span>
          </div>
          <span className="text-sm" style={{ color: config.color.replace('text-', '') }}>{t(config.labelKey)}</span>
        </div>
      </div>

      {/* 风险因素 */}
      {details?.factors && details.factors.length > 0 && (
        <SectionCard title={t("admin.kyc.reviewPanel.riskFactors")} icon={<Warning weight="fill" className="w-4 h-4" />} className="border-white/[0.08]">
          <div className="space-y-2">
            {details.factors.map((factor, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-white/5 rounded">
                <span className="text-sm text-white/70">{factor.description}</span>
                <span className={`text-sm font-medium ${
                  factor.score > 50 ? "text-red-400" : factor.score > 25 ? "text-yellow-400" : "text-emerald-400"
                }`}>
                  +{factor.score}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* PEP 匹配 */}
      {details?.pep_matches && details.pep_matches.length > 0 && (
        <Alert className="bg-amber-500/10 border-amber-500/30 rounded-xl">
          <Warning weight="fill" className="w-4 h-4 text-amber-400" />
          <AlertDescription className="text-amber-200">
            <div className="font-medium mb-1">{t("admin.kyc.reviewPanel.pepWarning")}</div>
            <div className="space-y-1">
              {details.pep_matches.map((match, index) => (
                <div key={index} className="text-sm">
                  {match.name} - {match.position} ({match.country})
                  <span className="text-amber-400 ml-2">{t("admin.kyc.reviewPanel.matchScore", { score: match.match_score })}</span>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* 制裁名单匹配 */}
      {details?.sanction_matches && details.sanction_matches.length > 0 && (
        <Alert className="bg-red-500/10 border-red-500/30 rounded-xl">
          <ShieldWarning weight="fill" className="w-4 h-4 text-red-400" />
          <AlertDescription className="text-red-200">
            <div className="font-medium mb-1">{t("admin.kyc.reviewPanel.sanctionMatch")}</div>
            <div className="space-y-1">
              {details.sanction_matches.map((match, index) => (
                <div key={index} className="text-sm">
                  {match.name} - {match.list}
                  <span className="text-red-400 ml-2">{t("admin.kyc.reviewPanel.matchScore", { score: match.match_score })}</span>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// 主组件
export function ReviewPanel({
  kycDetail,
  isOpen,
  onClose,
  onApprove,
  onReject,
  rejectReasons,
  isProcessing,
}: ReviewPanelProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedRejectCode, setSelectedRejectCode] = useState("");
  const [customRejectReason, setCustomRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [isAccredited, setIsAccredited] = useState(false);
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [selectedDocumentIndex, setSelectedDocumentIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  if (!kycDetail) return null;

  const { kyc, documents, audit_logs, ocr_data, facial_comparison, risk_details } = kycDetail;
  const statusConfig = STATUS_CONFIG[kyc.status];
  const riskConfig = RISK_CONFIG[kyc.risk_level];
  const priorityConfig = PRIORITY_CONFIG[kyc.priority];

  // 构建文档列表
  const documentList = [
    documents.id_front && { type: "id_front" as const, label: t("admin.kyc.reviewPanel.idFront"), url: documents.id_front },
    documents.id_back && { type: "id_back" as const, label: t("admin.kyc.reviewPanel.idBack"), url: documents.id_back },
    documents.selfie && { type: "selfie" as const, label: t("admin.kyc.reviewPanel.selfie"), url: documents.selfie },
    documents.face_image && { type: "face_image" as const, label: t("admin.kyc.reviewPanel.facePhoto"), url: documents.face_image },
  ].filter(Boolean);

  // 活体视频单独处理
  const livenessVideoUrl = documents.liveness_video;

  const handleDocumentClick = (index: number) => {
    setSelectedDocumentIndex(index);
    setDocumentViewerOpen(true);
  };

  const handleApprove = () => {
    onApprove(kyc.id, isAccredited);
  };

  const handleReject = () => {
    if (!selectedRejectCode) return;
    onReject(
      kyc.id,
      selectedRejectCode,
      selectedRejectCode === "other" ? customRejectReason : undefined
    );
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(kyc.wallet_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent 
          side="right" 
          className="w-[560px] sm:max-w-[560px] p-0 overflow-hidden border-l border-white/20"
          style={{
            background: 'linear-gradient(180deg, rgba(13, 17, 23, 0.98) 0%, rgba(18, 22, 30, 0.98) 100%)',
            boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.4), -1px 0 0 rgba(255, 255, 255, 0.1)',
          }}
        >
          {/* 顶部渐变装饰 */}
          <div 
            className="absolute top-0 left-0 right-0 h-[200px] pointer-events-none"
            style={{
              background: `linear-gradient(180deg, ${statusConfig.bgColor} 0%, transparent 100%)`,
            }}
          />

          {/* 头部区域 */}
          <SheetHeader className="relative px-6 pt-6 pb-5 border-b border-white/[0.06]">
            <div className="flex items-start gap-4">
              <div 
                className="w-14 h-14 rounded-[14px] flex items-center justify-center shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${statusConfig.bgColor} 0%, rgba(255, 255, 255, 0.02) 100%)`,
                  border: `1px solid ${statusConfig.borderColor}`,
                }}
              >
                <User weight="fill" size={28} style={{ color: statusConfig.color.replace('text-', '') }} />
              </div>
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-xl font-semibold text-white mb-2">
                  {t("admin.kyc.reviewPanel.title")}
                </SheetTitle>
                <SheetDescription asChild>
                  <div className="flex gap-2 flex-wrap items-center">
                    <Badge 
                      variant="outline"
                      className="flex items-center gap-1"
                      style={{
                        background: statusConfig.bgColor,
                        borderColor: statusConfig.borderColor,
                        color: statusConfig.color,
                      }}
                    >
                      <statusConfig.icon weight="fill" className="w-3 h-3" />
                      {t(statusConfig.labelKey)}
                    </Badge>
                    <Badge 
                      variant="secondary" 
                      className="flex items-center gap-1"
                      style={{
                        background: riskConfig.bgColor,
                        borderColor: riskConfig.borderColor,
                        color: riskConfig.color,
                      }}
                    >
                      <riskConfig.icon weight="fill" className="w-3 h-3" />
                      {t(riskConfig.labelKey)}
                    </Badge>
                  </div>
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* 内容区域 - 可滚动 */}
          <div className="relative p-6 max-h-[calc(100vh-220px)] overflow-y-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full justify-start rounded-none border-b border-white/10 bg-transparent p-0 h-12 mb-4">
                {["overview", "documents", "risk", "history"].map((tab) => (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-400 data-[state=active]:bg-transparent px-4 text-white/60 data-[state=active]:text-white"
                  >
                    {tab === "overview" && t("admin.kyc.reviewPanel.tabOverview")}
                    {tab === "documents" && t("admin.kyc.reviewPanel.tabDocuments")}
                    {tab === "risk" && t("admin.kyc.reviewPanel.tabRisk")}
                    {tab === "history" && t("admin.kyc.reviewPanel.tabHistory")}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="mt-0 space-y-4">
                {/* 基本信息卡片 */}
                <SectionCard title={t("admin.kyc.reviewPanel.basicInfo")} icon={<User weight="fill" className="w-4 h-4" />} className="border-white/[0.08]">
                  <InfoRow label={t("admin.kyc.reviewPanel.fullName")}>
                    <span className="text-white font-medium">{kyc.full_name || "-"}</span>
                  </InfoRow>
                  <InfoRow label={t("admin.kyc.reviewPanel.idType")}>
                    <span className="text-white">
                      {kyc.id_type === "id_card" ? t("admin.kyc.reviewPanel.idCard") : kyc.id_type === "passport" ? t("admin.kyc.reviewPanel.passport") : kyc.id_type === "driver_license" ? t("admin.kyc.reviewPanel.driverLicense") : "-"}
                    </span>
                  </InfoRow>
                  <InfoRow label={t("admin.kyc.reviewPanel.dateOfBirth")}>
                    <span className="text-white">{kyc.date_of_birth || "-"}</span>
                  </InfoRow>
                  <InfoRow label={t("admin.kyc.reviewPanel.countryRegion")} showBorder={false}>
                    <span className="text-white font-medium">{kyc.country_code || "-"}</span>
                  </InfoRow>
                </SectionCard>

                {/* 钱包地址卡片 */}
                <SectionCard title={t("admin.kyc.reviewPanel.walletAddress")} icon={<DeviceMobile weight="fill" className="w-4 h-4" />} className="border-white/[0.08]">
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-[13px] font-mono text-white/85 break-all leading-relaxed flex-1">
                      {kyc.wallet_address}
                    </code>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleCopyAddress}
                        className="flex items-center gap-1 text-xs bg-transparent border-none cursor-pointer p-1.5 rounded transition-colors hover:bg-white/5"
                        style={{ color: copied ? '#52c41a' : 'rgba(255, 255, 255, 0.45)' }}
                      >
                        {copied ? <Check weight="bold" className="h-4 w-4" /> : <Copy weight="bold" className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => window.open(`https://etherscan.io/address/${kyc.wallet_address}`, "_blank")}
                        className="flex items-center gap-1 text-xs bg-transparent border-none cursor-pointer p-1.5 rounded transition-colors hover:bg-white/5 text-white/45"
                      >
                        <ArrowSquareOut weight="bold" className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </SectionCard>

                {/* 审核状态卡片 */}
                <SectionCard title={t("admin.kyc.reviewPanel.reviewStatus")} icon={<Hourglass weight="fill" className="w-4 h-4" />} className="border-white/[0.08]">
                  <InfoRow label={t("admin.kyc.reviewPanel.priority")}>
                    <span className={priorityConfig.color}>{t(priorityConfig.labelKey)}</span>
                  </InfoRow>
                  <InfoRow label={t("admin.kyc.reviewPanel.riskLevel")}>
                    <span className={riskConfig.color}>{t(riskConfig.labelKey)}</span>
                  </InfoRow>
                  <InfoRow label={t("admin.kyc.reviewPanel.accreditedInvestor")} showBorder={false}>
                    <Badge
                      variant={kyc.is_accredited ? "default" : "secondary"}
                      className={kyc.is_accredited ? "bg-emerald-500/20 text-emerald-400 border-0" : "bg-white/5 border-0"}
                    >
                      {kyc.is_accredited ? t("admin.kyc.reviewPanel.yes") : t("admin.kyc.reviewPanel.no")}
                    </Badge>
                  </InfoRow>
                </SectionCard>

                {/* OCR 信息 */}
                {ocr_data && (
                  <SectionCard title={t("admin.kyc.reviewPanel.ocrInfo")} icon={<FileText weight="fill" className="w-4 h-4" />} className="border-white/[0.08]">
                    <InfoRow label={t("admin.kyc.reviewPanel.confidence")}>
                      <span className="text-teal-400">{ocr_data.confidence_score}%</span>
                    </InfoRow>
                    {ocr_data.full_name && (
                      <InfoRow label={t("admin.kyc.reviewPanel.fullName")}>
                        <span className="text-white">{ocr_data.full_name}</span>
                      </InfoRow>
                    )}
                    {ocr_data.id_number && (
                      <InfoRow label={t("admin.kyc.reviewPanel.idNumber")}>
                        <span className="text-white font-mono">{ocr_data.id_number}</span>
                      </InfoRow>
                    )}
                    {ocr_data.date_of_birth && (
                      <InfoRow label={t("admin.kyc.reviewPanel.dateOfBirth")} showBorder={false}>
                        <span className="text-white">{ocr_data.date_of_birth}</span>
                      </InfoRow>
                    )}
                  </SectionCard>
                )}

                {/* 人脸比对 */}
                {facial_comparison && (
                  <div className={`p-4 rounded-xl border ${
                    facial_comparison.is_match 
                      ? "bg-emerald-500/5 border-emerald-500/20" 
                      : "bg-red-500/5 border-red-500/20"
                  }`}>
                    <div className={`flex items-center gap-2 text-sm mb-3 ${
                      facial_comparison.is_match ? "text-emerald-400" : "text-red-400"
                    }`}>
                      {facial_comparison.is_match ? (
                        <CheckCircle weight="fill" className="w-4 h-4" />
                      ) : (
                        <Warning weight="fill" className="w-4 h-4" />
                      )}
                      {t("admin.kyc.reviewPanel.facialComparisonResult")}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/50 text-sm">{t("admin.kyc.reviewPanel.similarity")}</span>
                      <span className={`text-lg font-bold ${
                        facial_comparison.similarity_score > 80 ? "text-emerald-400" :
                        facial_comparison.similarity_score > 60 ? "text-yellow-400" : "text-red-400"
                      }`}>
                        {facial_comparison.similarity_score}%
                      </span>
                    </div>
                    <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          facial_comparison.similarity_score > 80 ? "bg-emerald-500" :
                          facial_comparison.similarity_score > 60 ? "bg-yellow-500" : "bg-red-500"
                        }`}
                        style={{ width: `${facial_comparison.similarity_score}%` }}
                      />
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents" className="mt-0">
                <DocumentReviewPanel
                  documents={documents}
                  ocrData={ocr_data}
                  facialComparison={facial_comparison}
                  riskChecks={risk_details?.checks}
                />
              </TabsContent>

              {/* Risk Tab */}
              <TabsContent value="risk" className="mt-0">
                <RiskDetails
                  riskLevel={kyc.risk_level}
                  riskScore={kyc.risk_score}
                  details={risk_details}
                />
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="mt-0">
                <AuditTimeline logs={audit_logs} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Footer Actions */}
          {kyc.status === "pending" && (
            <div className="p-6 border-t border-white/[0.06] bg-[#0a0a0f]">
              {showRejectForm ? (
                <div className="space-y-4">
                  <Select
                    value={selectedRejectCode}
                    onValueChange={setSelectedRejectCode}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue placeholder={t('admin.kyc.selectRejectReason')} />
                    </SelectTrigger>
                    <SelectContent>
                      {rejectReasons.map((reason) => {
                        const locale = t('locale') === 'en-US' ? 'en' : 'zh';
                        return (
                          <SelectItem key={reason.code} value={reason.code}>
                            {reason.labels[locale] || reason.labels.zh}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {selectedRejectCode === "other" && (
                    <Textarea
                      placeholder={t("admin.kyc.reviewPanel.enterRejectReason")}
                      value={customRejectReason}
                      onChange={(e) => setCustomRejectReason(e.target.value)}
                      rows={3}
                      className="bg-white/5 border-white/10 resize-none"
                    />
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 bg-white/5 border-white/10 hover:bg-white/10"
                      onClick={() => setShowRejectForm(false)}
                    >
                      {t("admin.kyc.reviewPanel.cancel")}
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      disabled={!selectedRejectCode || isProcessing}
                      onClick={handleReject}
                    >
                      {isProcessing ? t("admin.kyc.reviewPanel.processing") : t("admin.kyc.reviewPanel.confirmReject")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 bg-transparent h-11 rounded-xl"
                    onClick={() => setShowRejectForm(true)}
                    disabled={isProcessing}
                  >
                    <XCircleIcon weight="fill" className="w-4 h-4 mr-2" />
                    {t("admin.kyc.reviewPanel.reject")}
                  </Button>
                  <Button
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white h-11 rounded-xl"
                    onClick={handleApprove}
                    disabled={isProcessing}
                  >
                    <CheckCircle weight="fill" className="w-4 h-4 mr-2" />
                    {isProcessing ? t("admin.kyc.reviewPanel.processing") : t("admin.kyc.reviewPanel.approveReview")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Document Viewer */}
      <DocumentViewer
        documents={documentList}
        isOpen={documentViewerOpen}
        onClose={() => setDocumentViewerOpen(false)}
        initialIndex={selectedDocumentIndex}
        ocrData={ocr_data}
        facialComparison={facial_comparison}
      />
    </>
  );
}

export default ReviewPanel;
