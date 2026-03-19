"use client";

/**
 * Admin KYC Management
 * KYC 管理页面
 * 
 * Features:
 * - Statistics dashboard
 * - Advanced filtering and search
 * - Batch operations
 * - Document viewer with zoom/pan
 * - Risk assessment display
 * - Audit timeline
 * - Real-time updates
 */

import type { ColumnDef } from "@tanstack/react-table";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  RefreshCw,
  Shield,
  AlertTriangle,
  Eye,
  XCircle,
  Download,
  Globe,
  AlertOctagon,
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { AdmissionButton, shouldShowAdmissionButton } from "@/components/admin-kyc/admission-button";
import { BatchToolbar } from "@/components/admin-kyc/batch-toolbar";
import { KycStatsPanel } from "@/components/admin-kyc/kyc-stats-panel";
import { ReviewStepperModal } from "@/components/admin-kyc/review-stepper-modal";
import type { ReviewStepsData } from "@/components/admin-kyc/stepper-reducer";
import { RequireAuth } from "@/components/auth";
import { AdminLayout, AdminPageHeader, AdminCard } from "@/components/layout/admin-layout";
import { GlowStatusBadge } from "@/components/ui/glow-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { notification } from "@/lib/notification";
import { adminService } from "@/services/admin";
import type { KycStatusType } from "@/services/admin";
import {
  adminKycService,
  type KycStats,
  type KycItem,
  type KycDetail,
  type KycFilterParams,
  type RiskLevel,
  type ReviewPriority,
  getKycContractInfo,
} from "@/services/admin-kyc";
import { kycService } from "@/services/kyc";

// KYC Status to GlowStatusBadge variant mapping
const KYC_STATUS_VARIANTS: Record<KycStatusType, { variant: 'default' | 'info' | 'success' | 'error'; labelKey: string; pulse?: boolean; glow?: boolean }> = {
  not_started: { variant: 'default', labelKey: "admin.kyc.page.statusNotStarted" },
  pending: { variant: 'info', labelKey: "admin.kyc.page.statusPending", pulse: true, glow: true },
  approved: { variant: 'success', labelKey: "admin.kyc.page.statusApproved", glow: true },
  rejected: { variant: 'error', labelKey: "admin.kyc.page.statusRejected" },
};

// Risk level to GlowStatusBadge variant mapping
const RISK_VARIANTS: Record<RiskLevel, { variant: 'success' | 'warning' | 'orange' | 'error'; labelKey: string; icon: typeof Shield }> = {
  low: { variant: 'success', labelKey: "admin.kyc.page.riskLow", icon: Shield },
  medium: { variant: 'warning', labelKey: "admin.kyc.page.riskMedium", icon: AlertTriangle },
  high: { variant: 'orange', labelKey: "admin.kyc.page.riskHigh", icon: AlertOctagon },
  critical: { variant: 'error', labelKey: "admin.kyc.page.riskCritical", icon: AlertOctagon },
};

// Priority configuration
const PRIORITY_CONFIG: Record<ReviewPriority, { color: string; labelKey: string }> = {
  low: { color: "text-gray-400", labelKey: "admin.kyc.page.priorityLow" },
  normal: { color: "text-blue-400", labelKey: "admin.kyc.page.priorityNormal" },
  high: { color: "text-orange-400", labelKey: "admin.kyc.page.priorityHigh" },
  urgent: { color: "text-red-400", labelKey: "admin.kyc.page.priorityUrgent" },
};

export default function AdminKycPage() {
  const { t } = useTranslation();

  // State
  const [stats, setStats] = useState<KycStats | null>(null);
  const [kycList, setKycList] = useState<KycItem[]>([]);
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
  const [selectedKyc, setSelectedKyc] = useState<KycDetail | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  // Batch Selection
  const [selectedRows, setSelectedRows] = useState<KycItem[]>([]);
  const [rejectReasons, setRejectReasons] = useState<Array<{ code: string; labels: { zh: string; en: string } }>>([]);

  // Contract Info (for admission/revocation)
  const [contractInfo, setContractInfo] = useState<{ contract_address: string; deployer_address: string } | null>(null);

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const data = await adminKycService.getKycStats();
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
        ...(statusMap[activeTab] ? { status: statusMap[activeTab] } : {}),
        ...(searchQuery ? { search_query: searchQuery } : {}),
        ...(riskFilter !== "all" ? { risk_level: riskFilter } : {}),
        ...(priorityFilter !== "all" ? { priority: priorityFilter } : {}),
        ...(countryFilter !== "all" ? { country_code: countryFilter } : {}),
        page: pagination.page,
        page_size: pagination.pageSize,
        sort_by: "submitted_at",
        sort_order: "desc",
      };

      const response = await adminKycService.getKycList(params);
      setKycList(response.list_data);
      setPagination((prev) => ({ ...prev, total: response.pagination.total }));
    } catch (error) {
      console.error("Failed to load KYC list:", error);
      notification.error(t("admin.kyc.page.loadListFailed"));
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

  // Load contract info (for admission/revocation)
  const loadContractInfo = useCallback(async () => {
    try {
      const info = await getKycContractInfo();
      setContractInfo(info);
    } catch (error) {
      console.error("Failed to load contract info:", error);
      // Non-critical: admission features will be disabled
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadStats();
    loadRejectReasons();
    loadContractInfo();
  }, [loadStats, loadRejectReasons, loadContractInfo]);

  useEffect(() => {
    loadKycList();
  }, [loadKycList]);

  // Open review panel
  const handleOpenReview = async (kycId: number) => {
    try {
      const detail = await adminKycService.getKycDetail(kycId);
      setSelectedKyc(detail);
      setReviewPanelOpen(true);
    } catch (error) {
      console.error("Failed to load KYC detail:", error);
      notification.error(t("admin.kyc.page.loadDetailFailed"));
    }
  };

  // Handle approve
  const handleApprove = async (kycId: number, isAccredited: boolean, reviewSteps?: ReviewStepsData) => {
    setReviewLoading(true);
    try {
      await kycService.review(kycId, {
        approved: true,
        is_accredited: isAccredited,
        ...(reviewSteps ? { review_steps: reviewSteps } : {}),
      });
      notification.success(t("admin.kyc.page.approveSuccess"));
      notification.warning(
        t(
          "admin.kyc.page.approveNeedAdmission",
          "Review approved. Please continue with on-chain admission."
        )
      );
      if (selectedKyc?.kyc.id === kycId) {
        const detail = await adminKycService.getKycDetail(kycId);
        setSelectedKyc(detail);
      }
      loadKycList();
      loadStats();
    } catch (error) {
      console.error("Failed to approve KYC:", error);
      notification.error(t("admin.kyc.page.reviewFailed"));
    } finally {
      setReviewLoading(false);
    }
  };

  // Handle reject
  const handleReject = async (kycId: number, reasonCode: string, customReason?: string, reviewSteps?: ReviewStepsData) => {
    setReviewLoading(true);
    try {
      await kycService.review(kycId, {
        approved: false,
        is_accredited: false,
        reject_reason_code: reasonCode,
        ...(customReason ? { reject_reason: customReason } : {}),
        ...(reviewSteps ? { review_steps: reviewSteps } : {}),
      });
      notification.success(t("admin.kyc.page.rejectSuccess"));
      setReviewPanelOpen(false);
      loadKycList();
      loadStats();
    } catch (error) {
      console.error("Failed to reject KYC:", error);
      notification.error(t("admin.kyc.page.reviewFailed"));
    } finally {
      setReviewLoading(false);
    }
  };

  // Handle admission/revocation success - refresh detail and list
  const handleAdmissionSuccess = useCallback(async () => {
    // Refresh the KYC detail if one is currently open
    if (selectedKyc) {
      try {
        const detail = await adminKycService.getKycDetail(selectedKyc.kyc.id);
        setSelectedKyc(detail);
      } catch (error) {
        console.error("Failed to refresh KYC detail:", error);
      }
    }
    // Refresh the list and stats
    loadKycList();
    loadStats();
  }, [selectedKyc, loadKycList, loadStats]);

  // Batch operations
  const handleBatchApprove = async (ids: number[]) => {
    try {
      // Note: In a real implementation, you'd use adminKycService.batchReviewKyc
      // For now, we'll process one by one
      for (const id of ids) {
        await kycService.review(id, { approved: true, is_accredited: false });
      }
      notification.success(t("admin.kyc.page.batchApproveSuccess", { count: ids.length }));
      setSelectedRows([]);
      loadKycList();
      loadStats();
    } catch (error) {
      console.error("Batch approve failed:", error);
      notification.error(t("admin.kyc.page.batchApproveFailed"));
    }
  };

  const handleBatchReject = async (ids: number[], reasonCode: string, customReason?: string) => {
    try {
      for (const id of ids) {
        await kycService.review(id, {
          approved: false,
          is_accredited: false,
          reject_reason_code: reasonCode,
          ...(customReason ? { reject_reason: customReason } : {}),
        });
      }
      notification.success(t("admin.kyc.page.batchRejectSuccess", { count: ids.length }));
      setSelectedRows([]);
      loadKycList();
      loadStats();
    } catch (error) {
      console.error("Batch reject failed:", error);
      notification.error(t("admin.kyc.page.batchRejectFailed"));
    }
  };

  // Table columns
  const columns: ColumnDef<KycItem>[] = useMemo(
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
        header: () => t("admin.kyc.page.colName"),
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
        header: () => t("admin.kyc.page.colStatus"),
        cell: ({ row }) => {
          const config = KYC_STATUS_VARIANTS[row.original.status];
          return (
            <GlowStatusBadge 
              variant={config.variant}
              pulse={config.pulse}
              glow={config.glow}
            >
              {t(config.labelKey)}
            </GlowStatusBadge>
          );
        },
      },
      {
        accessorKey: "risk_level",
        header: () => t("admin.kyc.page.colRisk"),
        cell: ({ row }) => {
          const config = RISK_VARIANTS[row.original.risk_level];
          const Icon = config.icon;
          return (
            <div className="flex items-center gap-1">
              <Icon className={`w-3.5 h-3.5`} />
              <GlowStatusBadge variant={config.variant}>
                {t(config.labelKey)}
              </GlowStatusBadge>
            </div>
          );
        },
      },
      {
        accessorKey: "priority",
        header: () => t("admin.kyc.page.colPriority"),
        cell: ({ row }) => {
          const config = PRIORITY_CONFIG[row.original.priority];
          return <span className={`text-xs ${config.color}`}>{t(config.labelKey)}</span>;
        },
      },
      {
        accessorKey: "country_code",
        header: () => t("admin.kyc.page.colCountry"),
        cell: ({ row }) => row.original.country_code || "-",
      },
      {
        accessorKey: "submitted_at",
        header: () => t("admin.kyc.page.colSubmittedAt"),
        cell: ({ row }) => {
          const time = row.original.submitted_at;
          if (!time) return "-";
          const date = new Date(time);
          return (
            <div className="text-sm">
              <div>{date.toLocaleDateString()}</div>
              <div className="text-xs text-white/50">{date.toLocaleTimeString()}</div>
            </div>
          );
        },
      },
      {
        accessorKey: "processing_time_minutes",
        header: () => t("admin.kyc.page.colProcessingTime"),
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
        header: () => t("admin.kyc.page.colActions"),
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenReview(row.original.id)}
            >
              <Eye className="w-4 h-4 mr-1" />
              {t("admin.kyc.page.review")}
            </Button>
            {/* 准入按钮: status=APPROVED && on_chain_sync_status !== SYNCED */}
            {shouldShowAdmissionButton(row.original.status, row.original.on_chain_sync_status) && contractInfo && (
              <AdmissionButton
                kycId={row.original.id}
                walletAddress={row.original.wallet_address}
                countryCode={row.original.country_code || ''}
                isAccredited={row.original.is_accredited ?? false}
                isReAdmission={row.original.on_chain_sync_status === 'revoked'}
                contractAddress={contractInfo.contract_address}
                deployerAddress={contractInfo.deployer_address}
                onSuccess={() => {
                  loadKycList();
                  loadStats();
                }}
              />
            )}
            {/* 解除准入按钮: status=APPROVED && on_chain_sync_status === SYNCED */}
            {row.original.status === 'approved' && row.original.on_chain_sync_status === 'synced' && (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                onClick={() => handleOpenReview(row.original.id)}
              >
                <XCircle className="w-4 h-4 mr-1" />
                {t("admin.kyc.admission.revoke")}
              </Button>
            )}
          </div>
        ),
      },
    ],
    [contractInfo]
  );

  return (
    <RequireAuth admin>
      <AdminLayout>
        <AdminPageHeader
          title={t("admin.kyc.title")}
          subtitle={t("admin.kyc.description")}
          actions={
            <>
              <Button
                variant="outline"
                onClick={() => {
                  loadStats();
                  loadKycList();
                }}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                {t("admin.kyc.page.refresh")}
              </Button>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                {t("admin.kyc.page.export")}
              </Button>
            </>
          }
        />

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
        <AdminCard delay={0.2}>
          <Card className="bg-transparent border-0">
            <CardHeader className="pb-0">
              {/* Tabs & Search */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="bg-white/5">
                    <TabsTrigger value="pending" className="data-[state=active]:bg-white/10">
                      {t("admin.kyc.page.tabPending")} {stats?.pending ? `(${stats.pending})` : ""}
                    </TabsTrigger>
                    <TabsTrigger value="approved" className="data-[state=active]:bg-white/10">
                      {t("admin.kyc.page.tabApproved")}
                    </TabsTrigger>
                    <TabsTrigger value="rejected" className="data-[state=active]:bg-white/10">
                      {t("admin.kyc.page.tabRejected")}
                    </TabsTrigger>
                    <TabsTrigger value="all" className="data-[state=active]:bg-white/10">
                      {t("admin.kyc.page.tabAll")}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <Input
                      placeholder={t("admin.kyc.page.searchPlaceholder")}
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
                    <SelectValue placeholder={t("admin.kyc.page.riskPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("admin.kyc.page.allRisk")}</SelectItem>
                    <SelectItem value="low">{t("admin.kyc.page.riskLowFilter")}</SelectItem>
                    <SelectItem value="medium">{t("admin.kyc.page.riskMediumFilter")}</SelectItem>
                    <SelectItem value="high">{t("admin.kyc.page.riskHighFilter")}</SelectItem>
                    <SelectItem value="critical">{t("admin.kyc.page.riskCriticalFilter")}</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as ReviewPriority | "all")}>
                  <SelectTrigger className="w-32 bg-white/5 border-white/10">
                    <SelectValue placeholder={t("admin.kyc.page.priorityPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("admin.kyc.page.allPriority")}</SelectItem>
                    <SelectItem value="low">{t("admin.kyc.page.priorityLow")}</SelectItem>
                    <SelectItem value="normal">{t("admin.kyc.page.priorityNormal")}</SelectItem>
                    <SelectItem value="high">{t("admin.kyc.page.priorityHigh")}</SelectItem>
                    <SelectItem value="urgent">{t("admin.kyc.page.priorityUrgent")}</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger className="w-40 bg-white/5 border-white/10">
                    <Globe className="w-4 h-4 mr-2" />
                    <SelectValue placeholder={t("admin.kyc.page.countryPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("admin.kyc.page.allCountry")}</SelectItem>
                    <SelectItem value="CN">{t("admin.kyc.page.countryCN")}</SelectItem>
                    <SelectItem value="US">{t("admin.kyc.page.countryUS")}</SelectItem>
                    <SelectItem value="SG">{t("admin.kyc.page.countrySG")}</SelectItem>
                    <SelectItem value="JP">{t("admin.kyc.page.countryJP")}</SelectItem>
                    <SelectItem value="KR">{t("admin.kyc.page.countryKR")}</SelectItem>
                    <SelectItem value="GB">{t("admin.kyc.page.countryGB")}</SelectItem>
                    <SelectItem value="DE">{t("admin.kyc.page.countryDE")}</SelectItem>
                    <SelectItem value="other">{t("admin.kyc.page.countryOther")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              <DataTable
                columns={columns}
                data={kycList}
                loading={loading}
                emptyMessage={t("admin.kyc.page.noData")}
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
        </AdminCard>

        {/* Review Stepper Modal */}
        <ReviewStepperModal
          kycDetail={selectedKyc}
          isOpen={reviewPanelOpen}
          onClose={() => {
            setReviewPanelOpen(false);
            setSelectedKyc(null);
          }}
          onApprove={handleApprove}
          onReject={handleReject}
          rejectReasons={rejectReasons}
          isProcessing={reviewLoading}
          contractInfo={contractInfo}
          onAdmissionSuccess={handleAdmissionSuccess}
        />

        {/* Batch Toolbar */}
        <BatchToolbar
          selectedItems={selectedRows}
          onClearSelection={() => setSelectedRows([])}
          onBatchApprove={handleBatchApprove}
          onBatchReject={handleBatchReject}
          rejectReasons={rejectReasons}
        />
      </AdminLayout>
    </RequireAuth>
  );
}
