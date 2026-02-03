"use client";

/**
 * Admin KYC Management - Enhanced Version
 * KYC 管理页面 - 增强版
 * 
 * Features:
 * - Enhanced statistics dashboard
 * - Advanced filtering and search
 * - Batch operations
 * - Document viewer with zoom/pan
 * - Risk assessment display
 * - Audit timeline
 * - Real-time updates
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Search,
  Filter,
  RefreshCw,
  Shield,
  AlertTriangle,
  Eye,
  CheckCircle2,
  XCircle,
  Download,
  MoreHorizontal,
  Calendar,
  Globe,
  Clock,
  AlertOctagon,
  Loader2,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { notification } from "@/lib/notification";
import { RequireAuth } from "@/components/auth";
import { V6Background } from "@/components/layout/V6Background";

import { KycStatsPanel } from "@/components/admin-kyc/kyc-stats-panel";
import { ReviewPanel } from "@/components/admin-kyc/review-panel";
import { BatchToolbar } from "@/components/admin-kyc/batch-toolbar";

import {
  adminKycService,
  type EnhancedKycStats,
  type EnhancedKycItem,
  type EnhancedKycDetail,
  type KycFilterParams,
  type RiskLevel,
  type ReviewPriority,
} from "@/services/admin-kyc";
import { kycService } from "@/services/kyc";
import { adminService } from "@/services/admin";
import type { KycStatusType } from "@/services/admin";

// 状态配置
const STATUS_CONFIG: Record<KycStatusType, { color: string; bgColor: string; label: string }> = {
  not_started: { color: "text-gray-400", bgColor: "bg-gray-500/20", label: "未开始" },
  pending: { color: "text-blue-400", bgColor: "bg-blue-500/20", label: "待审核" },
  approved: { color: "text-emerald-400", bgColor: "bg-emerald-500/20", label: "已通过" },
  rejected: { color: "text-red-400", bgColor: "bg-red-500/20", label: "已拒绝" },
};

// 风险等级配置
const RISK_CONFIG: Record<RiskLevel, { color: string; bgColor: string; label: string; icon: typeof Shield }> = {
  low: { color: "text-emerald-400", bgColor: "bg-emerald-500/20", label: "低", icon: Shield },
  medium: { color: "text-yellow-400", bgColor: "bg-yellow-500/20", label: "中", icon: AlertTriangle },
  high: { color: "text-orange-400", bgColor: "bg-orange-500/20", label: "高", icon: AlertOctagon },
  critical: { color: "text-red-400", bgColor: "bg-red-500/20", label: "极高", icon: AlertOctagon },
};

// 优先级配置
const PRIORITY_CONFIG: Record<ReviewPriority, { color: string; label: string }> = {
  low: { color: "text-gray-400", label: "低" },
  normal: { color: "text-blue-400", label: "普通" },
  high: { color: "text-orange-400", label: "高" },
  urgent: { color: "text-red-400", label: "紧急" },
};

export default function AdminKycPage() {
  const { t } = useTranslation();

  // State
  const [stats, setStats] = useState<EnhancedKycStats | null>(null);
  const [kycList, setKycList] = useState<EnhancedKycItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
  });

  // Filters
  const [activeTab, setActiveTab] = useState<string>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<ReviewPriority | "all">("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");

  // Review Panel
  const [reviewPanelOpen, setReviewPanelOpen] = useState(false);
  const [selectedKyc, setSelectedKyc] = useState<EnhancedKycDetail | null>(null);
  const [selectedKycId, setSelectedKycId] = useState<number | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  // Batch Selection
  const [selectedRows, setSelectedRows] = useState<EnhancedKycItem[]>([]);
  const [rejectReasons, setRejectReasons] = useState<Array<{ code: string; label: string }>>([]);

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const data = await adminKycService.getEnhancedKycStats();
      setStats(data);
    } catch (error) {
      console.error("Failed to load KYC stats:", error);
    }
  }, []);

  // Load KYC list
  const loadKycList = useCallback(async () => {
    setLoading(true);
    try {
      const statusMap: Record<string, KycStatusType | undefined> = {
        pending: "pending",
        approved: "approved",
        rejected: "rejected",
        all: undefined,
      };

      const params: KycFilterParams = {
        status: statusMap[activeTab],
        search_query: searchQuery || undefined,
        risk_level: riskFilter !== "all" ? riskFilter : undefined,
        priority: priorityFilter !== "all" ? priorityFilter : undefined,
        country_code: countryFilter !== "all" ? countryFilter : undefined,
        page: pagination.page,
        page_size: pagination.pageSize,
        sort_by: "submitted_at",
        sort_order: "desc",
      };

      const response = await adminKycService.getEnhancedKycList(params);
      setKycList(response.list_data);
      setPagination((prev) => ({ ...prev, total: response.pagination.total }));
    } catch (error) {
      console.error("Failed to load KYC list:", error);
      notification.error("加载 KYC 列表失败");
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, riskFilter, priorityFilter, countryFilter, pagination.page, pagination.pageSize]);

  // Load reject reasons
  const loadRejectReasons = useCallback(async () => {
    try {
      const reasons = await adminService.getRejectReasons();
      setRejectReasons(reasons);
    } catch (error) {
      console.error("Failed to load reject reasons:", error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadStats();
    loadRejectReasons();
  }, [loadStats, loadRejectReasons]);

  useEffect(() => {
    loadKycList();
  }, [loadKycList]);

  // Open review panel
  const handleOpenReview = async (kycId: number) => {
    setSelectedKycId(kycId);
    try {
      const detail = await adminKycService.getEnhancedKycDetail(kycId);
      setSelectedKyc(detail);
      setReviewPanelOpen(true);
    } catch (error) {
      console.error("Failed to load KYC detail:", error);
      notification.error("加载详情失败");
    }
  };

  // Handle approve
  const handleApprove = async (kycId: number, isAccredited: boolean) => {
    setReviewLoading(true);
    try {
      await kycService.review(kycId, {
        approved: true,
        is_accredited: isAccredited,
      });
      notification.success("审核通过成功");
      setReviewPanelOpen(false);
      loadKycList();
      loadStats();
    } catch (error) {
      console.error("Failed to approve KYC:", error);
      notification.error("审核操作失败");
    } finally {
      setReviewLoading(false);
    }
  };

  // Handle reject
  const handleReject = async (kycId: number, reasonCode: string, customReason?: string) => {
    setReviewLoading(true);
    try {
      await kycService.review(kycId, {
        approved: false,
        is_accredited: false,
        reject_reason_code: reasonCode,
        reject_reason: customReason,
      });
      notification.success("审核拒绝成功");
      setReviewPanelOpen(false);
      loadKycList();
      loadStats();
    } catch (error) {
      console.error("Failed to reject KYC:", error);
      notification.error("审核操作失败");
    } finally {
      setReviewLoading(false);
    }
  };

  // Handle retry sync
  const handleRetrySync = async (kycId: number) => {
    try {
      await kycService.retrySync(kycId);
      notification.success("重试同步成功");
      loadKycList();
      loadStats();
    } catch (error) {
      console.error("Failed to retry sync:", error);
      notification.error("重试同步失败");
    }
  };

  // Batch operations
  const handleBatchApprove = async (ids: number[]) => {
    try {
      // Note: In a real implementation, you'd use adminKycService.batchReviewKyc
      // For now, we'll process one by one
      for (const id of ids) {
        await kycService.review(id, { approved: true, is_accredited: false });
      }
      notification.success(`批量通过成功: ${ids.length} 个`);
      setSelectedRows([]);
      loadKycList();
      loadStats();
    } catch (error) {
      console.error("Batch approve failed:", error);
      notification.error("批量通过失败");
    }
  };

  const handleBatchReject = async (ids: number[], reasonCode: string, customReason?: string) => {
    try {
      for (const id of ids) {
        await kycService.review(id, {
          approved: false,
          is_accredited: false,
          reject_reason_code: reasonCode,
          reject_reason: customReason,
        });
      }
      notification.success(`批量拒绝成功: ${ids.length} 个`);
      setSelectedRows([]);
      loadKycList();
      loadStats();
    } catch (error) {
      console.error("Batch reject failed:", error);
      notification.error("批量拒绝失败");
    }
  };

  const handleBatchRetrySync = async (ids: number[]) => {
    try {
      let success = 0;
      let failed = 0;
      for (const id of ids) {
        try {
          await kycService.retrySync(id);
          success++;
        } catch {
          failed++;
        }
      }
      notification.success(`重试完成: 成功 ${success}, 失败 ${failed}`);
      loadKycList();
      loadStats();
    } catch (error) {
      console.error("Batch retry failed:", error);
      notification.error("批量重试失败");
    }
  };

  // Table columns
  const columns: ColumnDef<EnhancedKycItem>[] = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "id",
        header: "ID",
        size: 60,
      },
      {
        accessorKey: "full_name",
        header: "姓名",
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-white">{row.original.full_name || "-"}</div>
            <div className="text-xs text-white/50 font-mono">
              {row.original.wallet_address.slice(0, 6)}...{row.original.wallet_address.slice(-4)}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => {
          const config = STATUS_CONFIG[row.original.status];
          return (
            <Badge className={`${config.bgColor} ${config.color} border-0`}>
              {config.label}
            </Badge>
          );
        },
      },
      {
        accessorKey: "risk_level",
        header: "风险",
        cell: ({ row }) => {
          const config = RISK_CONFIG[row.original.risk_level];
          const Icon = config.icon;
          return (
            <div className="flex items-center gap-1">
              <Icon className={`w-3.5 h-3.5 ${config.color}`} />
              <Badge className={`${config.bgColor} ${config.color} border-0 text-xs`}>
                {config.label}
              </Badge>
            </div>
          );
        },
      },
      {
        accessorKey: "priority",
        header: "优先级",
        cell: ({ row }) => {
          const config = PRIORITY_CONFIG[row.original.priority];
          return <span className={`text-xs ${config.color}`}>{config.label}</span>;
        },
      },
      {
        accessorKey: "country_code",
        header: "国家",
        cell: ({ row }) => row.original.country_code || "-",
      },
      {
        accessorKey: "submitted_at",
        header: "提交时间",
        cell: ({ row }) => {
          const time = row.original.submitted_at;
          if (!time) return "-";
          const date = new Date(time);
          return (
            <div className="text-sm">
              <div>{date.toLocaleDateString("zh-CN")}</div>
              <div className="text-xs text-white/50">{date.toLocaleTimeString("zh-CN")}</div>
            </div>
          );
        },
      },
      {
        accessorKey: "processing_time_minutes",
        header: "处理时间",
        cell: ({ row }) => {
          const minutes = row.original.processing_time_minutes;
          if (!minutes) return "-";
          if (minutes < 60) return `${Math.round(minutes)}m`;
          const hours = Math.floor(minutes / 60);
          const mins = Math.round(minutes % 60);
          return `${hours}h ${mins}m`;
        },
      },
      {
        id: "actions",
        header: "操作",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenReview(row.original.id)}
            >
              <Eye className="w-4 h-4 mr-1" />
              审核
            </Button>
            {row.original.on_chain_sync_status === "failed" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRetrySync(row.original.id)}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    []
  );

  return (
    <RequireAuth admin>
      <V6Background />

      <div className="min-h-screen relative px-6 py-8 max-w-[1600px] mx-auto">
        {/* Header */}
        <motion.div
          className="mb-8 flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">KYC 管理</h1>
            <p className="text-white/50">身份认证审核与风险管理</p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                loadStats();
                loadKycList();
              }}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              刷新
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              导出
            </Button>
          </div>
        </motion.div>

        {/* Stats Panel */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <KycStatsPanel stats={stats} isLoading={!stats && loading} />
        </motion.div>

        {/* Filters & Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="bg-[#0d1117]/80 border-white/10 backdrop-blur-sm">
            <CardHeader className="pb-0">
              {/* Tabs & Search */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="bg-white/5">
                    <TabsTrigger value="pending" className="data-[state=active]:bg-white/10">
                      待审核 {stats?.pending ? `(${stats.pending})` : ""}
                    </TabsTrigger>
                    <TabsTrigger value="approved" className="data-[state=active]:bg-white/10">
                      已通过
                    </TabsTrigger>
                    <TabsTrigger value="rejected" className="data-[state=active]:bg-white/10">
                      已拒绝
                    </TabsTrigger>
                    <TabsTrigger value="all" className="data-[state=active]:bg-white/10">
                      全部
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <Input
                      placeholder="搜索姓名或钱包地址..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-64 bg-white/5 border-white/10"
                    />
                  </div>
                </div>
              </div>

              {/* Advanced Filters */}
              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/10">
                <Filter className="w-4 h-4 text-white/40" />
                
                <Select value={riskFilter} onValueChange={(v) => setRiskFilter(v as RiskLevel | "all")}>
                  <SelectTrigger className="w-32 bg-white/5 border-white/10">
                    <SelectValue placeholder="风险等级" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部风险</SelectItem>
                    <SelectItem value="low">低风险</SelectItem>
                    <SelectItem value="medium">中风险</SelectItem>
                    <SelectItem value="high">高风险</SelectItem>
                    <SelectItem value="critical">极高风险</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as ReviewPriority | "all")}>
                  <SelectTrigger className="w-32 bg-white/5 border-white/10">
                    <SelectValue placeholder="优先级" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="low">低</SelectItem>
                    <SelectItem value="normal">普通</SelectItem>
                    <SelectItem value="high">高</SelectItem>
                    <SelectItem value="urgent">紧急</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger className="w-40 bg-white/5 border-white/10">
                    <Globe className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="国家/地区" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部国家</SelectItem>
                    <SelectItem value="CN">中国</SelectItem>
                    <SelectItem value="US">美国</SelectItem>
                    <SelectItem value="SG">新加坡</SelectItem>
                    <SelectItem value="JP">日本</SelectItem>
                    <SelectItem value="KR">韩国</SelectItem>
                    <SelectItem value="GB">英国</SelectItem>
                    <SelectItem value="DE">德国</SelectItem>
                    <SelectItem value="other">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              <DataTable
                columns={columns}
                data={kycList}
                loading={loading}
                emptyMessage="暂无数据"
                enableRowSelection
                onRowSelectionChange={setSelectedRows}
                pagination={{
                  pageIndex: pagination.page - 1,
                  pageSize: pagination.pageSize,
                  pageCount: Math.ceil(pagination.total / pagination.pageSize),
                  onPageChange: (page) => setPagination((prev) => ({ ...prev, page: page + 1 })),
                  onPageSizeChange: (size) => setPagination((prev) => ({ ...prev, pageSize: size, page: 1 })),
                }}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Review Panel */}
        <ReviewPanel
          kycDetail={selectedKyc}
          isOpen={reviewPanelOpen}
          onClose={() => {
            setReviewPanelOpen(false);
            setSelectedKyc(null);
          }}
          onApprove={handleApprove}
          onReject={handleReject}
          onRetrySync={handleRetrySync}
          rejectReasons={rejectReasons}
          isProcessing={reviewLoading}
        />

        {/* Batch Toolbar */}
        <BatchToolbar
          selectedItems={selectedRows}
          onClearSelection={() => setSelectedRows([])}
          onBatchApprove={handleBatchApprove}
          onBatchReject={handleBatchReject}
          onBatchRetrySync={handleBatchRetrySync}
          rejectReasons={rejectReasons}
        />
      </div>
    </RequireAuth>
  );
}
