"use client";

/**
 * Batch Toolbar - KYC Batch Operations
 * 批量操作工具栏 - KYC 批量操作
 */

import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  Download,
  ChevronDown,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { KycItem } from "@/services/admin-kyc";

interface BatchToolbarProps {
  selectedItems: KycItem[];
  onClearSelection: () => void;
  onBatchApprove: (ids: number[]) => Promise<void>;
  onBatchReject: (ids: number[], reasonCode: string, customReason?: string) => Promise<void>;
  onExport?: () => Promise<void>;
  rejectReasons: Array<{ code: string; labels: { zh: string; en: string } }>;
}

export function BatchToolbar({
  selectedItems,
  onClearSelection,
  onBatchApprove,
  onBatchReject,
  onExport,
  rejectReasons,
}: BatchToolbarProps) {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [selectedRejectCode, setSelectedRejectCode] = useState("");
  const [customRejectReason, setCustomRejectReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingAction, setProcessingAction] = useState<string>("");
  const { t } = useTranslation();

  const selectedCount = selectedItems.length;

  // 可以批量通过的项目（状态为 pending）
  const canApprove = selectedItems.filter((item) => item.status === "pending");
  // 可以批量拒绝的项目（状态为 pending）
  const canReject = selectedItems.filter((item) => item.status === "pending");

  const handleBatchApprove = async () => {
    if (canApprove.length === 0) return;
    setIsProcessing(true);
    setProcessingAction("approving");
    try {
      await onBatchApprove(canApprove.map((item) => item.id));
      setShowApproveDialog(false);
    } finally {
      setIsProcessing(false);
      setProcessingAction("");
    }
  };

  const handleBatchReject = async () => {
    if (canReject.length === 0 || !selectedRejectCode) return;
    setIsProcessing(true);
    setProcessingAction("rejecting");
    try {
      await onBatchReject(
        canReject.map((item) => item.id),
        selectedRejectCode,
        selectedRejectCode === "other" ? customRejectReason : undefined
      );
      setShowRejectDialog(false);
    } finally {
      setIsProcessing(false);
      setProcessingAction("");
    }
  };

  const handleExport = async () => {
    if (!onExport) return;
    setIsProcessing(true);
    setProcessingAction("exporting");
    try {
      await onExport();
    } finally {
      setIsProcessing(false);
      setProcessingAction("");
    }
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30"
        >
          <div className="flex items-center gap-3 px-4 py-3 bg-[#0d1117]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl">
            {/* 选择计数 */}
            <div className="flex items-center gap-2 pr-4 border-r border-white/10">
              <Checkbox checked={true} onCheckedChange={onClearSelection} />
              <span className="text-sm text-white">
                {t("admin.kyc.batch.selected")} <span className="font-bold text-teal-400">{selectedCount}</span> {t("admin.kyc.batch.items")}
              </span>
            </div>

            {/* 批量操作按钮 */}
            <div className="flex items-center gap-2">
              {/* 批量通过 */}
              {canApprove.length > 0 && (
                <Button
                  size="sm"
                  className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-0"
                  onClick={() => setShowApproveDialog(true)}
                  disabled={isProcessing}
                >
                  {isProcessing && processingAction === "approving" ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                  )}
                  {t("admin.kyc.batch.approve")} ({canApprove.length})
                </Button>
              )}

              {/* 批量拒绝 */}
              {canReject.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  onClick={() => setShowRejectDialog(true)}
                  disabled={isProcessing}
                >
                  {isProcessing && processingAction === "rejecting" ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4 mr-1" />
                  )}
                  {t("admin.kyc.batch.reject")} ({canReject.length})
                </Button>
              )}

              {/* 更多操作 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost">
                    {t("admin.kyc.batch.more")} <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#0d1117] border-white/10">
                  {onExport && (
                    <DropdownMenuItem
                      onClick={handleExport}
                      disabled={isProcessing}
                      className="text-white/70 focus:text-white focus:bg-white/10"
                    >
                      {isProcessing && processingAction === "exporting" ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 mr-2" />
                      )}
                      {t("admin.kyc.batch.exportData")}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* 清除选择 */}
            <Button
              size="sm"
              variant="ghost"
              className="text-white/50 hover:text-white"
              onClick={onClearSelection}
            >
              {t("admin.kyc.batch.clear")}
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* 批量通过确认对话框 */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="bg-[#0d1117] border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              {t("admin.kyc.batch.confirmApproveTitle")}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {t("admin.kyc.batch.confirmApproveDesc", { count: canApprove.length })}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-emerald-400 text-sm mb-2">
                <AlertTriangle className="w-4 h-4" />
                {t("admin.kyc.batch.operationTips")}
              </div>
              <ul className="text-sm text-white/60 space-y-1">
                <li>• {t("admin.kyc.batch.approveTip1")}</li>
                <li>• {t("admin.kyc.batch.approveTip2")}</li>
                <li>• {t("admin.kyc.batch.approveTip3")}</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              {t("admin.kyc.batch.cancel")}
            </Button>
            <Button
              className="bg-emerald-500 hover:bg-emerald-600"
              onClick={handleBatchApprove}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("admin.kyc.batch.processing")}
                </>
              ) : (
                <>{t("admin.kyc.batch.confirmApprove")} ({canApprove.length})</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量拒绝对话框 */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="bg-[#0d1117] border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-400" />
              {t("admin.kyc.batch.batchRejectTitle")}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {t("admin.kyc.batch.batchRejectDesc", { count: canReject.length })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Select
              value={selectedRejectCode}
              onValueChange={setSelectedRejectCode}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("admin.kyc.batch.selectRejectReason")} />
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
                placeholder={t("admin.kyc.batch.enterRejectReason")}
                value={customRejectReason}
                onChange={(e) => setCustomRejectReason(e.target.value)}
                rows={3}
              />
            )}

            <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertTriangle className="w-4 h-4" />
                {t("admin.kyc.batch.rejectWarning")}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              {t("admin.kyc.batch.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleBatchReject}
              disabled={!selectedRejectCode || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("admin.kyc.batch.processing")}
                </>
              ) : (
                <>{t("admin.kyc.batch.confirmReject")} ({canReject.length})</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default BatchToolbar;
