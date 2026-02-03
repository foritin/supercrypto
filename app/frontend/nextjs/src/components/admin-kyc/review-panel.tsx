"use client";

/**
 * Review Panel - KYC Review Workflow Panel
 * 审核面板 - KYC 审核工作流面板
 * 
 * Features:
 * - Multi-step review workflow
 * - Risk assessment display
 * - Audit timeline
 * - Quick actions
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  FileText,
  Shield,
  AlertOctagon,
  ChevronRight,
  ChevronDown,
  History,
  ExternalLink,
  RotateCcw,
  Eye,
  MapPin,
  Calendar,
  CreditCard,
  Smartphone,
  Globe,
} from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import type { EnhancedKycDetail, RiskLevel, ReviewPriority } from "@/services/admin-kyc";
import type { KycStatusType } from "@/services/admin";
import { DocumentViewer } from "./document-viewer";

interface ReviewPanelProps {
  kycDetail: EnhancedKycDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (kycId: number, isAccredited: boolean) => void;
  onReject: (kycId: number, reasonCode: string, customReason?: string) => void;
  onRetrySync: (kycId: number) => void;
  rejectReasons: Array<{ code: string; label: string }>;
  isProcessing?: boolean;
}

// 状态配置
const STATUS_CONFIG: Record<KycStatusType, { color: string; bgColor: string; label: string; icon: React.ElementType }> = {
  not_started: { color: "text-gray-400", bgColor: "bg-gray-500/20", label: "未开始", icon: Clock },
  pending: { color: "text-blue-400", bgColor: "bg-blue-500/20", label: "待审核", icon: Eye },
  approved: { color: "text-emerald-400", bgColor: "bg-emerald-500/20", label: "已通过", icon: CheckCircle2 },
  rejected: { color: "text-red-400", bgColor: "bg-red-500/20", label: "已拒绝", icon: XCircle },
};

// 风险等级配置
const RISK_CONFIG: Record<RiskLevel, { color: string; bgColor: string; label: string; icon: React.ElementType }> = {
  low: { color: "text-emerald-400", bgColor: "bg-emerald-500/20", label: "低风险", icon: Shield },
  medium: { color: "text-yellow-400", bgColor: "bg-yellow-500/20", label: "中风险", icon: AlertTriangle },
  high: { color: "text-orange-400", bgColor: "bg-orange-500/20", label: "高风险", icon: AlertOctagon },
  critical: { color: "text-red-400", bgColor: "bg-red-500/20", label: "极高风险", icon: AlertOctagon },
};

// 优先级配置
const PRIORITY_CONFIG: Record<ReviewPriority, { color: string; label: string }> = {
  low: { color: "text-gray-400", label: "低" },
  normal: { color: "text-blue-400", label: "普通" },
  high: { color: "text-orange-400", label: "高" },
  urgent: { color: "text-red-400", label: "紧急" },
};

// 审核时间线组件
function AuditTimeline({ logs }: { logs: EnhancedKycDetail["audit_logs"] }) {
  const getActionIcon = (action: string) => {
    switch (action) {
      case "submit":
        return <FileText className="w-4 h-4" />;
      case "approve":
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case "reject":
        return <XCircle className="w-4 h-4 text-red-400" />;
      case "sync":
        return <RotateCcw className="w-4 h-4" />;
      default:
        return <History className="w-4 h-4" />;
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      submit: "提交申请",
      review: "开始审核",
      approve: "审核通过",
      reject: "审核拒绝",
      resubmit: "重新提交",
      sync: "链上同步",
      reset: "重置状态",
    };
    return labels[action] || action;
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
                {new Date(log.created_at).toLocaleString("zh-CN")}
              </span>
            </div>
            <p className="text-xs text-white/50 mt-1">
              {log.actor_role === "system" ? "系统" : log.actor_address.slice(0, 6) + "..." + log.actor_address.slice(-4)}
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
  details: EnhancedKycDetail["risk_details"];
}) {
  const config = RISK_CONFIG[riskLevel];

  return (
    <div className="space-y-4">
      {/* 风险评分 */}
      <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
        <div className={`w-16 h-16 rounded-full ${config.bgColor} flex items-center justify-center`}>
          <config.icon className={`w-8 h-8 ${config.color}`} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-white">{riskScore}</span>
            <span className="text-white/50">/ 100</span>
          </div>
          <span className={`text-sm ${config.color}`}>{config.label}</span>
        </div>
      </div>

      {/* 风险因素 */}
      {details?.factors && details.factors.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-white mb-2">风险因素</h4>
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
        </div>
      )}

      {/* PEP 匹配 */}
      {details?.pep_matches && details.pep_matches.length > 0 && (
        <Alert className="bg-amber-500/10 border-amber-500/30">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <AlertDescription className="text-amber-200">
            <div className="font-medium mb-1">PEP 匹配警告</div>
            <div className="space-y-1">
              {details.pep_matches.map((match, index) => (
                <div key={index} className="text-sm">
                  {match.name} - {match.position} ({match.country})
                  <span className="text-amber-400 ml-2">匹配度: {match.match_score}%</span>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* 制裁名单匹配 */}
      {details?.sanction_matches && details.sanction_matches.length > 0 && (
        <Alert className="bg-red-500/10 border-red-500/30">
          <AlertOctagon className="w-4 h-4 text-red-400" />
          <AlertDescription className="text-red-200">
            <div className="font-medium mb-1">制裁名单匹配</div>
            <div className="space-y-1">
              {details.sanction_matches.map((match, index) => (
                <div key={index} className="text-sm">
                  {match.name} - {match.list}
                  <span className="text-red-400 ml-2">匹配度: {match.match_score}%</span>
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
  onRetrySync,
  rejectReasons,
  isProcessing,
}: ReviewPanelProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedRejectCode, setSelectedRejectCode] = useState("");
  const [customRejectReason, setCustomRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [isAccredited, setIsAccredited] = useState(false);
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [selectedDocumentIndex, setSelectedDocumentIndex] = useState(0);

  if (!isOpen || !kycDetail) return null;

  const { kyc, documents, audit_logs, ocr_data, facial_comparison, risk_details } = kycDetail;
  const statusConfig = STATUS_CONFIG[kyc.status];
  const riskConfig = RISK_CONFIG[kyc.risk_level];
  const priorityConfig = PRIORITY_CONFIG[kyc.priority];

  // 构建文档列表
  const documentList = [
    documents.id_front && { type: "id_front" as const, label: "证件正面", url: documents.id_front },
    documents.id_back && { type: "id_back" as const, label: "证件背面", url: documents.id_back },
    documents.selfie && { type: "selfie" as const, label: "手持自拍", url: documents.selfie },
  ].filter(Boolean);

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

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: isOpen ? 0 : "100%" }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-[#0d1117] border-l border-white/10 z-50 overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-white">KYC 审核</h2>
            <Badge
              variant="outline"
              className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}
            >
              <statusConfig.icon className="w-3 h-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {kyc.on_chain_sync_status === "failed" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRetrySync(kyc.id)}
                disabled={isProcessing}
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                重试同步
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b border-white/10 bg-transparent p-0 h-12">
              {["overview", "documents", "risk", "history"].map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-400 data-[state=active]:bg-transparent px-6"
                >
                  {tab === "overview" && "概览"}
                  {tab === "documents" && "证件"}
                  {tab === "risk" && "风险评估"}
                  {tab === "history" && "审核历史"}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="p-6 space-y-6 mt-0">
              {/* 基本信息卡片 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-2 text-white/50 text-sm mb-1">
                    <User className="w-4 h-4" />
                    姓名
                  </div>
                  <div className="text-lg font-medium text-white">
                    {kyc.full_name || "-"}
                  </div>
                </div>

                <div className="p-4 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-2 text-white/50 text-sm mb-1">
                    <CreditCard className="w-4 h-4" />
                    证件类型
                  </div>
                  <div className="text-lg font-medium text-white">
                    {kyc.id_type === "id_card" ? "身份证" : kyc.id_type === "passport" ? "护照" : kyc.id_type === "driver_license" ? "驾照" : "-"}
                  </div>
                </div>

                <div className="p-4 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-2 text-white/50 text-sm mb-1">
                    <Calendar className="w-4 h-4" />
                    出生日期
                  </div>
                  <div className="text-lg font-medium text-white">
                    {kyc.date_of_birth || "-"}
                  </div>
                </div>

                <div className="p-4 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-2 text-white/50 text-sm mb-1">
                    <Globe className="w-4 h-4" />
                    国家/地区
                  </div>
                  <div className="text-lg font-medium text-white">
                    {kyc.country_code || "-"}
                  </div>
                </div>
              </div>

              {/* 钱包地址 */}
              <div className="p-4 bg-white/5 rounded-xl">
                <div className="flex items-center gap-2 text-white/50 text-sm mb-2">
                  <Smartphone className="w-4 h-4" />
                  钱包地址
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-sm text-white font-mono bg-black/30 px-3 py-1.5 rounded flex-1 truncate">
                    {kyc.wallet_address}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => window.open(`https://etherscan.io/address/${kyc.wallet_address}`, "_blank")}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* 优先级和风险 */}
              <div className="flex gap-4">
                <div className="flex-1 p-4 bg-white/5 rounded-xl">
                  <div className="text-sm text-white/50 mb-2">优先级</div>
                  <Badge className={`${priorityConfig.color} bg-transparent border-0`}>
                    {priorityConfig.label}
                  </Badge>
                </div>
                <div className="flex-1 p-4 bg-white/5 rounded-xl">
                  <div className="text-sm text-white/50 mb-2">风险等级</div>
                  <Badge className={`${riskConfig.color} ${riskConfig.bgColor} border-0`}>
                    <riskConfig.icon className="w-3 h-3 mr-1" />
                    {riskConfig.label}
                  </Badge>
                </div>
                <div className="flex-1 p-4 bg-white/5 rounded-xl">
                  <div className="text-sm text-white/50 mb-2">合格投资者</div>
                  <Badge
                    variant={kyc.is_accredited ? "default" : "secondary"}
                    className={kyc.is_accredited ? "bg-emerald-500/20 text-emerald-400" : ""}
                  >
                    {kyc.is_accredited ? "是" : "否"}
                  </Badge>
                </div>
              </div>

              {/* OCR 信息 */}
              {ocr_data && (
                <div className="p-4 bg-teal-500/5 border border-teal-500/20 rounded-xl">
                  <div className="flex items-center gap-2 text-teal-400 text-sm mb-3">
                    <FileText className="w-4 h-4" />
                    OCR 识别信息
                    <Badge variant="outline" className="text-xs">
                      置信度: {ocr_data.confidence_score}%
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {ocr_data.full_name && (
                      <div>
                        <span className="text-white/50">姓名: </span>
                        <span className="text-white">{ocr_data.full_name}</span>
                      </div>
                    )}
                    {ocr_data.id_number && (
                      <div>
                        <span className="text-white/50">证件号: </span>
                        <span className="text-white font-mono">{ocr_data.id_number}</span>
                      </div>
                    )}
                    {ocr_data.date_of_birth && (
                      <div>
                        <span className="text-white/50">出生日期: </span>
                        <span className="text-white">{ocr_data.date_of_birth}</span>
                      </div>
                    )}
                  </div>
                </div>
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
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <AlertTriangle className="w-4 h-4" />
                    )}
                    人脸比对结果
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/50 text-sm">相似度</span>
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
            <TabsContent value="documents" className="p-6 mt-0">
              <div className="grid grid-cols-2 gap-4">
                {documentList.map((doc, index) => (
                  doc && (
                    <div
                      key={doc.type}
                      className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-white/10 cursor-pointer"
                      onClick={() => handleDocumentClick(index)}
                    >
                      <img
                        src={doc.url}
                        alt={doc.label}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <p className="text-white font-medium">{doc.label}</p>
                          <p className="text-white/60 text-sm">点击查看大图</p>
                        </div>
                      </div>
                    </div>
                  )
                ))}
              </div>
            </TabsContent>

            {/* Risk Tab */}
            <TabsContent value="risk" className="p-6 mt-0">
              <RiskDetails
                riskLevel={kyc.risk_level}
                riskScore={kyc.risk_score}
                details={risk_details}
              />
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="p-6 mt-0">
              <AuditTimeline logs={audit_logs} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer Actions */}
        {kyc.status === "pending" && (
          <div className="p-6 border-t border-white/10 bg-[#0d1117]">
            {showRejectForm ? (
              <div className="space-y-4">
                <Select
                  value={selectedRejectCode}
                  onValueChange={setSelectedRejectCode}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择拒绝原因" />
                  </SelectTrigger>
                  <SelectContent>
                    {rejectReasons.map((reason) => (
                      <SelectItem key={reason.code} value={reason.code}>
                        {reason.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedRejectCode === "other" && (
                  <Textarea
                    placeholder="请输入具体拒绝原因"
                    value={customRejectReason}
                    onChange={(e) => setCustomRejectReason(e.target.value)}
                    rows={3}
                  />
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowRejectForm(false)}
                  >
                    取消
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    disabled={!selectedRejectCode || isProcessing}
                    onClick={handleReject}
                  >
                    {isProcessing ? "处理中..." : "确认拒绝"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                  onClick={() => setShowRejectForm(true)}
                  disabled={isProcessing}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  拒绝
                </Button>
                <Button
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                  onClick={handleApprove}
                  disabled={isProcessing}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {isProcessing ? "处理中..." : "通过审核"}
                </Button>
              </div>
            )}
          </div>
        )}
      </motion.div>

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
