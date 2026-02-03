"use client";

/**
 * Batch Toolbar - KYC Batch Operations
 * 批量操作工具栏 - KYC 批量操作
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Download,
  Trash2,
  ChevronDown,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EnhancedKycItem } from "@/services/admin-kyc";

interface BatchToolbarProps {
  selectedItems: EnhancedKycItem[];
  onClearSelection: () => void;
  onBatchApprove: (ids: number[]) => Promise<void>;
  onBatchReject: (ids: number[], reasonCode: string, customReason?: string) => Promise<void>;
  onBatchRetrySync?: (ids: number[]) => Promise<void>;
  onExport?: () => Promise<void>;
  rejectReasons: Array<{ code: string; label: string }>;
}

export function BatchToolbar({
  selectedItems,
  onClearSelection,
  onBatchApprove,
  onBatchReject,
  onBatchRetrySync,
  onExport,
  rejectReasons,
}: BatchToolbarProps) {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [selectedRejectCode, setSelectedRejectCode] = useState("");
  const [customRejectReason, setCustomRejectReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingAction, setProcessingAction] = useState<string>("");

  const selectedCount = selectedItems.length;
  const selectedIds = selectedItems.map((item) => item.id);

  // 可以批量通过的项目（状态为 pending）
  const canApprove = selectedItems.filter((item) => item.status === "pending");
  // 可以批量拒绝的项目（状态为 pending）
  const canReject = selectedItems.filter((item) => item.status === "pending");
  // 可以批量重试同步的项目（状态为 failed）
  const canRetrySync = selectedItems.filter((item) => item.on_chain_sync_status === "failed");

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

  const handleBatchRetrySync = async () => {
    if (!onBatchRetrySync || canRetrySync.length === 0) return;
    setIsProcessing(true);
    setProcessingAction("retrying");
    try {
      await onBatchRetrySync(canRetrySync.map((item) => item.id));
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
                已选择 <span className="font-bold text-teal-400">{selectedCount}</span> 项
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
                  通过 ({canApprove.length})
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
                  拒绝 ({canReject.length})
                </Button>
              )}

              {/* 更多操作 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost">
                    更多 <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#0d1117] border-white/10">
                  {canRetrySync.length > 0 && onBatchRetrySync && (
                    <DropdownMenuItem
                      onClick={handleBatchRetrySync}
                      disabled={isProcessing}
                      className="text-white/70 focus:text-white focus:bg-white/10"
                    >
                      {isProcessing && processingAction === "retrying" ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      重试同步 ({canRetrySync.length})
                    </DropdownMenuItem>
                  )}
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
                      导出数据
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
              清除
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
              确认批量通过
            </DialogTitle>
            <DialogDescription className="text-white/60">
              您即将通过 {canApprove.length} 个 KYC 申请，此操作不可撤销。
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-emerald-400 text-sm mb-2">
                <AlertTriangle className="w-4 h-4" />
                操作提示
              </div>
              <ul className="text-sm text-white/60 space-y-1">
                <li>• 通过后将自动同步到链上</li>
                <li>• 用户将收到审核通过通知</li>
                <li>• 请确保已仔细审核所有证件</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              取消
            </Button>
            <Button
              className="bg-emerald-500 hover:bg-emerald-600"
              onClick={handleBatchApprove}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  处理中...
                </>
              ) : (
                <>确认通过 ({canApprove.length})</>
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
              批量拒绝
            </DialogTitle>
            <DialogDescription className="text-white/60">
              选择拒绝原因，将应用于 {canReject.length} 个选中的申请。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
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
                placeholder="请输入具体拒绝原因（将发送给用户）"
                value={customRejectReason}
                onChange={(e) => setCustomRejectReason(e.target.value)}
                rows={3}
              />
            )}

            <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertTriangle className="w-4 h-4" />
                注意: 拒绝操作不可撤销
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleBatchReject}
              disabled={!selectedRejectCode || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  处理中...
                </>
              ) : (
                <>确认拒绝 ({canReject.length})</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default BatchToolbar;
