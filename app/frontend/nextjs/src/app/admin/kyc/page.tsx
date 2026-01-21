"use client";

/**
 * Admin KYC 审核页面 (Story 2.9)
 *
 * 功能：
 * - 查看待审核/全部 KYC 列表
 * - 查看 KYC 详情和证件照片
 * - 审核通过/拒绝操作
 * - 查看链上同步状态
 * - 重试同步失败的 KYC
 * - 批量重试同步失败 (Code Review C3)
 *
 * 已迁移到 shadcn/ui 组件:
 * - Table -> DataTable
 * - Card, Row, Col, Statistic -> shadcn/ui Card + Tailwind grid
 * - Button -> shadcn/ui Button
 * - Tag -> Badge
 * - Drawer -> Sheet
 * - Modal -> Dialog
 * - Select -> shadcn/ui Select
 * - Input, TextArea -> shadcn/ui Input, Textarea
 * - Tabs -> shadcn/ui Tabs
 * - Alert -> shadcn/ui Alert
 * - Spin -> Skeleton
 * - Image -> next/image
 * - message -> notification (sonner)
 * - @ant-design/icons -> lucide-react
 */

import { useState, useEffect, useCallback, Component, ReactNode } from "react";
import { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  AlertTriangle,
  Loader2,
} from "lucide-react";

import { notification } from "@/lib/notification";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  adminService,
  type AdminKycItem,
  type AdminKycDetail,
  type KycStats,
  type RejectReasonOption,
  type KycStatusType,
} from "@/services/admin";
import { kycService } from "@/services/kyc";

// Code Review M5: ErrorBoundary 组件
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("KYC Page Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>页面加载失败</AlertTitle>
              <AlertDescription>
                <p>{this.state.error?.message || "未知错误"}</p>
                <Button
                  variant="outline"
                  onClick={() =>
                    this.setState({ hasError: false, error: null })
                  }
                  className="mt-4"
                >
                  重试
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )
      );
    }
    return this.props.children;
  }
}


// 状态 Badge 变体映射
const STATUS_BADGE_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  not_started: "secondary",
  pending: "outline",
  approved: "default",
  rejected: "destructive",
};

// 状态显示文本
const STATUS_LABELS: Record<string, string> = {
  not_started: "未开始",
  pending: "待审核",
  approved: "已通过",
  rejected: "已拒绝",
};

// 链上同步状态配置
const SYNC_STATUS_CONFIG: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; text: string }> = {
  not_required: { variant: "secondary", text: "无需同步" },
  pending: { variant: "outline", text: "待同步" },
  synced: { variant: "default", text: "已同步" },
  failed: { variant: "destructive", text: "同步失败" },
};

// 证件类型映射
const ID_TYPE_LABELS: Record<string, string> = {
  id_card: "身份证",
  passport: "护照",
  driver_license: "驾照",
};

// 统计卡片组件
interface StatCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  colorClass: string;
}

function StatCard({ title, value, icon, colorClass }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-3xl font-bold mt-1 ${colorClass}`}>{value}</p>
          </div>
          <div className={`${colorClass}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}


function AdminKycPageContent() {
  // 状态
  const [stats, setStats] = useState<KycStats | null>(null);
  const [kycList, setKycList] = useState<AdminKycItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [activeTab, setActiveTab] = useState<string>("pending");

  // 详情抽屉
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedKyc, setSelectedKyc] = useState<AdminKycDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // 审核弹窗
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve");
  const [rejectReasons, setRejectReasons] = useState<RejectReasonOption[]>([]);
  const [selectedRejectCode, setSelectedRejectCode] = useState<string>("");
  const [customRejectReason, setCustomRejectReason] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  // Code Review C3: 批量选择状态
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [batchRetryLoading, setBatchRetryLoading] = useState(false);

  // 加载统计
  const loadStats = useCallback(async () => {
    try {
      const data = await adminService.getKycStats();
      setStats(data);
    } catch (error) {
      console.error("Failed to load KYC stats:", error);
    }
  }, []);

  // 加载列表
  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const statusMap: Record<string, KycStatusType | undefined> = {
        pending: "pending",
        approved: "approved",
        rejected: "rejected",
        all: undefined,
      };

      const params = {
        status: statusMap[activeTab],
        page: pagination.current,
        page_size: pagination.pageSize,
      };

      const response = await adminService.getKycList(params);
      setKycList(response.list_data);
      setPagination((prev) => ({
        ...prev,
        total: response.pagination.total,
      }));
    } catch (error) {
      console.error("Failed to load KYC list:", error);
      notification.error("加载 KYC 列表失败");
    } finally {
      setLoading(false);
    }
  }, [activeTab, pagination.current, pagination.pageSize]);


  // 加载拒绝原因
  const loadRejectReasons = useCallback(async () => {
    try {
      const reasons = await adminService.getRejectReasons();
      setRejectReasons(reasons);
    } catch (error) {
      console.error("Failed to load reject reasons:", error);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    loadStats();
    loadRejectReasons();
  }, [loadStats, loadRejectReasons]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  // 打开详情
  const openDetail = async (kycId: number) => {
    setDetailLoading(true);
    setDetailVisible(true);
    try {
      const detail = await adminService.getKycDetail(kycId);
      setSelectedKyc(detail);
    } catch (error) {
      console.error("Failed to load KYC detail:", error);
      notification.error("加载详情失败");
    } finally {
      setDetailLoading(false);
    }
  };

  // 打开审核弹窗
  const openReviewModal = (action: "approve" | "reject") => {
    setReviewAction(action);
    setSelectedRejectCode("");
    setCustomRejectReason("");
    setReviewModalVisible(true);
  };

  // 执行审核
  const handleReview = async () => {
    if (!selectedKyc) return;

    setReviewLoading(true);
    try {
      const data = {
        approved: reviewAction === "approve",
        is_accredited: reviewAction === "approve",
        reject_reason_code: reviewAction === "reject" ? selectedRejectCode : undefined,
        reject_reason:
          reviewAction === "reject" && selectedRejectCode === "other"
            ? customRejectReason
            : undefined,
      };

      await kycService.review(selectedKyc.kyc.id, data);
      notification.success(reviewAction === "approve" ? "审核通过成功" : "审核拒绝成功");
      setReviewModalVisible(false);
      setDetailVisible(false);
      loadList();
      loadStats();
    } catch (error) {
      console.error("Failed to review KYC:", error);
      notification.error("审核操作失败");
    } finally {
      setReviewLoading(false);
    }
  };


  // 重试同步
  const handleRetrySync = async (kycId: number) => {
    try {
      await kycService.retrySync(kycId);
      notification.success("重试同步成功");
      loadList();
      loadStats();
    } catch (error) {
      console.error("Failed to retry sync:", error);
      notification.error("重试同步失败");
    }
  };

  // Code Review C3: 批量重试同步
  const handleBatchRetrySync = async () => {
    if (selectedRowKeys.length === 0) {
      notification.warning("请先选择要重试的记录");
      return;
    }

    // 过滤出同步失败的记录
    const failedItems = kycList.filter(
      (item) =>
        selectedRowKeys.includes(item.id) &&
        item.on_chain_sync_status === "failed"
    );

    if (failedItems.length === 0) {
      notification.warning("所选记录中没有同步失败的 KYC");
      return;
    }

    setBatchRetryLoading(true);
    let successCount = 0;
    let failCount = 0;

    for (const item of failedItems) {
      try {
        await kycService.retrySync(item.id);
        successCount++;
      } catch (error) {
        console.error(`Failed to retry sync for ${item.id}:`, error);
        failCount++;
      }
    }

    setBatchRetryLoading(false);
    setSelectedRowKeys([]);

    if (successCount > 0) {
      notification.success(`成功重试 ${successCount} 条，失败 ${failCount} 条`);
      loadList();
      loadStats();
    } else {
      notification.error("批量重试全部失败");
    }
  };

  // 处理行选择
  const handleRowSelectionChange = (selectedRows: AdminKycItem[]) => {
    setSelectedRowKeys(selectedRows.map((row) => row.id));
  };


  // 表格列定义
  const columns: ColumnDef<AdminKycItem>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="全选"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          disabled={row.original.on_chain_sync_status !== "failed"}
          aria-label="选择行"
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
      accessorKey: "wallet_address",
      header: "钱包地址",
      size: 180,
      cell: ({ row }) => {
        const addr = row.original.wallet_address;
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
      },
    },
    {
      accessorKey: "full_name",
      header: "姓名",
      size: 100,
      cell: ({ row }) => row.original.full_name || "-",
    },
    {
      accessorKey: "id_type",
      header: "证件类型",
      size: 80,
      cell: ({ row }) => {
        const type = row.original.id_type;
        return type ? ID_TYPE_LABELS[type] || type : "-";
      },
    },
    {
      accessorKey: "status",
      header: "状态",
      size: 100,
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <Badge variant={STATUS_BADGE_VARIANTS[status] || "secondary"}>
            {STATUS_LABELS[status] || status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "on_chain_sync_status",
      header: "链上同步",
      size: 140,
      cell: ({ row }) => {
        const status = row.original.on_chain_sync_status;
        if (!status) return "-";
        const config = SYNC_STATUS_CONFIG[status];
        return (
          <div className="flex items-center gap-2">
            <Badge variant={config?.variant || "secondary"}>
              {config?.text || status}
            </Badge>
            {status === "failed" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRetrySync(row.original.id)}
                className="h-6 px-2 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                重试
              </Button>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "submitted_at",
      header: "提交时间",
      size: 160,
      cell: ({ row }) => {
        const time = row.original.submitted_at;
        return time ? new Date(time).toLocaleString("zh-CN") : "-";
      },
    },
    {
      id: "action",
      header: "操作",
      size: 100,
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openDetail(row.original.id)}
        >
          <Eye className="h-4 w-4 mr-1" />
          详情
        </Button>
      ),
    },
  ];

  // 计算分页
  const pageCount = Math.ceil(pagination.total / pagination.pageSize);


  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">KYC 审核管理</h1>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="待审核"
          value={stats?.pending || 0}
          icon={<RefreshCw className={`h-8 w-8 ${stats?.pending ? "animate-spin" : ""}`} />}
          colorClass="text-blue-400"
        />
        <StatCard
          title="已通过"
          value={stats?.approved || 0}
          icon={<CheckCircle className="h-8 w-8" />}
          colorClass="text-[#00D4AA]"
        />
        <StatCard
          title="已拒绝"
          value={stats?.rejected || 0}
          icon={<XCircle className="h-8 w-8" />}
          colorClass="text-red-400"
        />
        <StatCard
          title="同步失败"
          value={stats?.failed_sync || 0}
          icon={<AlertTriangle className="h-8 w-8" />}
          colorClass="text-yellow-400"
        />
      </div>

      {/* 列表 */}
      <Card>
        <CardHeader className="pb-0">
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              setActiveTab(value);
              setSelectedRowKeys([]);
              setPagination((prev) => ({ ...prev, current: 1 }));
            }}
          >
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="pending">
                  待审核 ({stats?.pending || 0})
                </TabsTrigger>
                <TabsTrigger value="approved">已通过</TabsTrigger>
                <TabsTrigger value="rejected">已拒绝</TabsTrigger>
                <TabsTrigger value="all">全部</TabsTrigger>
              </TabsList>

              {/* 批量重试按钮 */}
              {selectedRowKeys.length > 0 && (
                <Button
                  onClick={handleBatchRetrySync}
                  disabled={batchRetryLoading}
                >
                  {batchRetryLoading && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  <RefreshCw className="h-4 w-4 mr-2" />
                  批量重试 ({selectedRowKeys.length})
                </Button>
              )}
            </div>
          </Tabs>
        </CardHeader>

        <CardContent className="pt-4">
          <DataTable
            columns={columns}
            data={kycList}
            loading={loading}
            emptyMessage="暂无数据"
            enableRowSelection
            onRowSelectionChange={handleRowSelectionChange}
            pagination={{
              pageIndex: pagination.current - 1,
              pageSize: pagination.pageSize,
              pageCount: pageCount,
              onPageChange: (page) => {
                setPagination((prev) => ({ ...prev, current: page + 1 }));
                setSelectedRowKeys([]);
              },
              onPageSizeChange: (size) => {
                setPagination((prev) => ({ ...prev, pageSize: size, current: 1 }));
                setSelectedRowKeys([]);
              },
            }}
          />
        </CardContent>
      </Card>

      {/* 详情抽屉 */}
      <Sheet open={detailVisible} onOpenChange={setDetailVisible}>
        <SheetContent className="w-[640px] sm:max-w-[640px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              <span>KYC 详情</span>
              {selectedKyc?.kyc.status === "pending" && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => openReviewModal("approve")}>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    通过
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => openReviewModal("reject")}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    拒绝
                  </Button>
                </div>
              )}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6">
            {detailLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : selectedKyc ? (
              <div className="space-y-6">
                {/* 基本信息 */}
                <div>
                  <h4 className="font-semibold mb-4">基本信息</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="col-span-2">
                      <span className="text-muted-foreground">钱包地址：</span>
                      <span className="font-mono break-all">
                        {selectedKyc.kyc.wallet_address}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">姓名：</span>
                      <span>{selectedKyc.kyc.full_name || "-"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">证件类型：</span>
                      <span>
                        {selectedKyc.kyc.id_type
                          ? ID_TYPE_LABELS[selectedKyc.kyc.id_type] ||
                            selectedKyc.kyc.id_type
                          : "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">证件号后4位：</span>
                      <span>{selectedKyc.kyc.id_number_last4 || "-"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">出生日期：</span>
                      <span>{selectedKyc.kyc.date_of_birth || "-"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">国家代码：</span>
                      <span>{selectedKyc.kyc.country_code || "-"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">合格投资者：</span>
                      <span>{selectedKyc.kyc.is_accredited ? "是" : "否"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">状态：</span>
                      <Badge
                        variant={
                          STATUS_BADGE_VARIANTS[selectedKyc.kyc.status] ||
                          "secondary"
                        }
                      >
                        {STATUS_LABELS[selectedKyc.kyc.status] ||
                          selectedKyc.kyc.status}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">链上同步：</span>
                      {selectedKyc.kyc.on_chain_sync_status ? (
                        <Badge
                          variant={
                            SYNC_STATUS_CONFIG[selectedKyc.kyc.on_chain_sync_status]
                              ?.variant || "secondary"
                          }
                        >
                          {SYNC_STATUS_CONFIG[selectedKyc.kyc.on_chain_sync_status]
                            ?.text || selectedKyc.kyc.on_chain_sync_status}
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </div>
                  </div>
                </div>


                {/* 同步错误信息 */}
                {selectedKyc.kyc.on_chain_error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>链上同步失败</AlertTitle>
                    <AlertDescription className="flex items-center justify-between">
                      <span>{selectedKyc.kyc.on_chain_error}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRetrySync(selectedKyc.kyc.id)}
                      >
                        重试
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                {/* 拒绝原因 */}
                {selectedKyc.kyc.reject_reason && (
                  <Alert variant="warning">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>拒绝原因</AlertTitle>
                    <AlertDescription>
                      {selectedKyc.kyc.reject_reason}
                    </AlertDescription>
                  </Alert>
                )}

                {/* 证件照片 */}
                <div>
                  <h4 className="font-semibold mb-4">证件照片</h4>
                  <div className="flex gap-6 flex-wrap">
                    {selectedKyc.documents.id_front && (
                      <div className="text-center">
                        <div className="relative w-[150px] h-[100px] rounded-lg overflow-hidden border border-white/10">
                          <Image
                            src={selectedKyc.documents.id_front}
                            alt="证件正面"
                            fill
                            className="object-cover"
                          />
                        </div>
                        <p className="text-muted-foreground text-sm mt-2">
                          证件正面
                        </p>
                      </div>
                    )}
                    {selectedKyc.documents.id_back && (
                      <div className="text-center">
                        <div className="relative w-[150px] h-[100px] rounded-lg overflow-hidden border border-white/10">
                          <Image
                            src={selectedKyc.documents.id_back}
                            alt="证件背面"
                            fill
                            className="object-cover"
                          />
                        </div>
                        <p className="text-muted-foreground text-sm mt-2">
                          证件背面
                        </p>
                      </div>
                    )}
                    {selectedKyc.documents.selfie && (
                      <div className="text-center">
                        <div className="relative w-[150px] h-[100px] rounded-lg overflow-hidden border border-white/10">
                          <Image
                            src={selectedKyc.documents.selfie}
                            alt="手持自拍"
                            fill
                            className="object-cover"
                          />
                        </div>
                        <p className="text-muted-foreground text-sm mt-2">
                          手持自拍
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>


      {/* 审核弹窗 */}
      <Dialog open={reviewModalVisible} onOpenChange={setReviewModalVisible}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "approve" ? "确认通过" : "确认拒绝"}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            {reviewAction === "approve" ? (
              <p>确定通过此 KYC 申请？审核通过后将自动同步到链上。</p>
            ) : (
              <div className="space-y-4">
                <p>请选择拒绝原因：</p>
                <Select
                  value={selectedRejectCode}
                  onValueChange={setSelectedRejectCode}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择拒绝原因" />
                  </SelectTrigger>
                  <SelectContent>
                    {rejectReasons.map((r) => (
                      <SelectItem key={r.code} value={r.code}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedRejectCode === "other" && (
                  <Textarea
                    placeholder="请输入具体拒绝原因"
                    rows={3}
                    value={customRejectReason}
                    onChange={(e) => setCustomRejectReason(e.target.value)}
                  />
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReviewModalVisible(false)}
            >
              取消
            </Button>
            <Button
              variant={reviewAction === "reject" ? "destructive" : "default"}
              onClick={handleReview}
              disabled={reviewLoading}
            >
              {reviewLoading && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {reviewAction === "approve" ? "确认通过" : "确认拒绝"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Code Review M5: 默认导出包装 ErrorBoundary
export default function AdminKycPage() {
  return (
    <ErrorBoundary>
      <AdminKycPageContent />
    </ErrorBoundary>
  );
}