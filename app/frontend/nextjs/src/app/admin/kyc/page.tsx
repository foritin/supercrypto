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
 * Code Review M5: 添加 ErrorBoundary
 */

import { useState, useEffect, useCallback, Component, ReactNode } from "react";
import {
  Table,
  Card,
  Button,
  Tag,
  Space,
  Drawer,
  Image,
  Descriptions,
  Select,
  Modal,
  Input,
  Statistic,
  Row,
  Col,
  message,
  Tabs,
  Alert,
  Spin,
  Checkbox,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  EyeOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import type { ColumnsType, TableRowSelection } from "antd/es/table";
import {
  adminService,
  type AdminKycItem,
  type AdminKycDetail,
  type KycStats,
  type RejectReasonOption,
  type KycStatusType,
} from "@/services/admin";
import { kycService } from "@/services/kyc";

const { TextArea } = Input;

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
            <Alert
              type="error"
              message="页面加载失败"
              description={
                <div>
                  <p>{this.state.error?.message || "未知错误"}</p>
                  <Button
                    type="primary"
                    onClick={() =>
                      this.setState({ hasError: false, error: null })
                    }
                    className="mt-4"
                  >
                    重试
                  </Button>
                </div>
              }
            />
          </div>
        )
      );
    }
    return this.props.children;
  }
}

// 状态标签颜色
const STATUS_COLORS: Record<string, string> = {
  not_started: "default",
  pending: "processing",
  approved: "success",
  rejected: "error",
};

// 链上同步状态标签
const SYNC_STATUS_TAGS: Record<string, { color: string; text: string }> = {
  not_required: { color: "default", text: "无需同步" },
  pending: { color: "processing", text: "待同步" },
  synced: { color: "success", text: "已同步" },
  failed: { color: "error", text: "同步失败" },
};

// 证件类型映射
const ID_TYPE_LABELS: Record<string, string> = {
  id_card: "身份证",
  passport: "护照",
  driver_license: "驾照",
};

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
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">(
    "approve"
  );
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
      setKycList(response.list);
      setPagination((prev) => ({
        ...prev,
        total: response.pagination.total,
      }));
    } catch (error) {
      console.error("Failed to load KYC list:", error);
      message.error("加载 KYC 列表失败");
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
      message.error("加载详情失败");
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
        reject_reason_code:
          reviewAction === "reject" ? selectedRejectCode : undefined,
        reject_reason:
          reviewAction === "reject" && selectedRejectCode === "other"
            ? customRejectReason
            : undefined,
      };

      await kycService.review(selectedKyc.kyc.id, data);
      message.success(
        reviewAction === "approve" ? "审核通过成功" : "审核拒绝成功"
      );
      setReviewModalVisible(false);
      setDetailVisible(false);
      loadList();
      loadStats();
    } catch (error) {
      console.error("Failed to review KYC:", error);
      message.error("审核操作失败");
    } finally {
      setReviewLoading(false);
    }
  };

  // 重试同步
  const handleRetrySync = async (kycId: number) => {
    try {
      await kycService.retrySync(kycId);
      message.success("重试同步成功");
      loadList();
      loadStats();
    } catch (error) {
      console.error("Failed to retry sync:", error);
      message.error("重试同步失败");
    }
  };

  // Code Review C3: 批量重试同步
  const handleBatchRetrySync = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning("请先选择要重试的记录");
      return;
    }

    // 过滤出同步失败的记录
    const failedItems = kycList.filter(
      (item) =>
        selectedRowKeys.includes(item.id) &&
        item.on_chain_sync_status === "failed"
    );

    if (failedItems.length === 0) {
      message.warning("所选记录中没有同步失败的 KYC");
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
      message.success(`成功重试 ${successCount} 条，失败 ${failCount} 条`);
      loadList();
      loadStats();
    } else {
      message.error("批量重试全部失败");
    }
  };

  // 行选择配置
  const rowSelection: TableRowSelection<AdminKycItem> = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
    getCheckboxProps: (record) => ({
      // 只允许选择同步失败的记录进行批量重试
      disabled: record.on_chain_sync_status !== "failed",
    }),
  };

  // 表格列定义
  const columns: ColumnsType<AdminKycItem> = [
    {
      title: "ID",
      dataIndex: "id",
      width: 60,
    },
    {
      title: "钱包地址",
      dataIndex: "wallet_address",
      width: 180,
      render: (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`,
    },
    {
      title: "姓名",
      dataIndex: "full_name",
      width: 100,
      render: (name: string | null) => name || "-",
    },
    {
      title: "证件类型",
      dataIndex: "id_type",
      width: 80,
      render: (type: string | null) =>
        type ? ID_TYPE_LABELS[type] || type : "-",
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 100,
      render: (status: string) => (
        <Tag color={STATUS_COLORS[status]}>
          {status === "pending"
            ? "待审核"
            : status === "approved"
            ? "已通过"
            : status === "rejected"
            ? "已拒绝"
            : status}
        </Tag>
      ),
    },
    {
      title: "链上同步",
      dataIndex: "on_chain_sync_status",
      width: 100,
      render: (status: string | null, record) => {
        if (!status) return "-";
        const tag = SYNC_STATUS_TAGS[status];
        return (
          <Space>
            <Tag color={tag?.color}>{tag?.text || status}</Tag>
            {status === "failed" && (
              <Button
                type="link"
                size="small"
                icon={<ReloadOutlined />}
                onClick={() => handleRetrySync(record.id)}
              >
                重试
              </Button>
            )}
          </Space>
        );
      },
    },
    {
      title: "提交时间",
      dataIndex: "submitted_at",
      width: 160,
      render: (time: string | null) =>
        time ? new Date(time).toLocaleString("zh-CN") : "-",
    },
    {
      title: "操作",
      key: "action",
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => openDetail(record.id)}
        >
          详情
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">KYC 审核管理</h1>

      {/* 统计卡片 */}
      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card>
            <Statistic
              title="待审核"
              value={stats?.pending || 0}
              valueStyle={{ color: "#1890ff" }}
              prefix={<SyncOutlined spin={stats?.pending ? true : false} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已通过"
              value={stats?.approved || 0}
              valueStyle={{ color: "#52c41a" }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已拒绝"
              value={stats?.rejected || 0}
              valueStyle={{ color: "#ff4d4f" }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="同步失败"
              value={stats?.failed_sync || 0}
              valueStyle={{ color: "#faad14" }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 列表 */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key);
            setSelectedRowKeys([]); // 切换 Tab 时清空选择
          }}
          items={[
            { key: "pending", label: `待审核 (${stats?.pending || 0})` },
            { key: "approved", label: "已通过" },
            { key: "rejected", label: "已拒绝" },
            { key: "all", label: "全部" },
          ]}
          tabBarExtraContent={
            // Code Review C3: 批量重试按钮
            selectedRowKeys.length > 0 && (
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                loading={batchRetryLoading}
                onClick={handleBatchRetrySync}
              >
                批量重试 ({selectedRowKeys.length})
              </Button>
            )
          }
        />

        <Table
          columns={columns}
          dataSource={kycList}
          rowKey="id"
          loading={loading}
          rowSelection={rowSelection}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              setPagination((prev) => ({
                ...prev,
                current: page,
                pageSize,
              }));
              setSelectedRowKeys([]); // 翻页时清空选择
            },
          }}
        />
      </Card>

      {/* 详情抽屉 */}
      <Drawer
        title="KYC 详情"
        width={640}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        extra={
          selectedKyc?.kyc.status === "pending" && (
            <Space>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => openReviewModal("approve")}
              >
                通过
              </Button>
              <Button
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => openReviewModal("reject")}
              >
                拒绝
              </Button>
            </Space>
          )
        }
      >
        {detailLoading ? (
          <div className="flex justify-center items-center h-64">
            <Spin size="large" />
          </div>
        ) : selectedKyc ? (
          <div>
            {/* 基本信息 */}
            <Descriptions title="基本信息" column={2} bordered className="mb-6">
              <Descriptions.Item label="钱包地址" span={2}>
                {selectedKyc.kyc.wallet_address}
              </Descriptions.Item>
              <Descriptions.Item label="姓名">
                {selectedKyc.kyc.full_name || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="证件类型">
                {selectedKyc.kyc.id_type
                  ? ID_TYPE_LABELS[selectedKyc.kyc.id_type] ||
                    selectedKyc.kyc.id_type
                  : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="证件号后4位">
                {selectedKyc.kyc.id_number_last4 || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="出生日期">
                {selectedKyc.kyc.date_of_birth || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="国家代码">
                {selectedKyc.kyc.country_code || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="合格投资者">
                {selectedKyc.kyc.is_accredited ? "是" : "否"}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={STATUS_COLORS[selectedKyc.kyc.status]}>
                  {selectedKyc.kyc.status === "pending"
                    ? "待审核"
                    : selectedKyc.kyc.status === "approved"
                    ? "已通过"
                    : selectedKyc.kyc.status === "rejected"
                    ? "已拒绝"
                    : selectedKyc.kyc.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="链上同步">
                {selectedKyc.kyc.on_chain_sync_status ? (
                  <Tag
                    color={
                      SYNC_STATUS_TAGS[selectedKyc.kyc.on_chain_sync_status]
                        ?.color
                    }
                  >
                    {SYNC_STATUS_TAGS[selectedKyc.kyc.on_chain_sync_status]
                      ?.text || selectedKyc.kyc.on_chain_sync_status}
                  </Tag>
                ) : (
                  "-"
                )}
              </Descriptions.Item>
            </Descriptions>

            {/* 同步错误信息 */}
            {selectedKyc.kyc.on_chain_error && (
              <Alert
                type="error"
                message="链上同步失败"
                description={selectedKyc.kyc.on_chain_error}
                className="mb-6"
                action={
                  <Button
                    size="small"
                    onClick={() => handleRetrySync(selectedKyc.kyc.id)}
                  >
                    重试
                  </Button>
                }
              />
            )}

            {/* 拒绝原因 */}
            {selectedKyc.kyc.reject_reason && (
              <Alert
                type="warning"
                message="拒绝原因"
                description={selectedKyc.kyc.reject_reason}
                className="mb-6"
              />
            )}

            {/* 证件照片 */}
            <h4 className="font-bold mb-4">证件照片</h4>
            <Image.PreviewGroup>
              <Space size="large">
                {selectedKyc.documents.id_front && (
                  <div className="text-center">
                    <Image
                      width={150}
                      src={selectedKyc.documents.id_front}
                      alt="证件正面"
                    />
                    <div className="text-gray-500 mt-2">证件正面</div>
                  </div>
                )}
                {selectedKyc.documents.id_back && (
                  <div className="text-center">
                    <Image
                      width={150}
                      src={selectedKyc.documents.id_back}
                      alt="证件背面"
                    />
                    <div className="text-gray-500 mt-2">证件背面</div>
                  </div>
                )}
                {selectedKyc.documents.selfie && (
                  <div className="text-center">
                    <Image
                      width={150}
                      src={selectedKyc.documents.selfie}
                      alt="手持自拍"
                    />
                    <div className="text-gray-500 mt-2">手持自拍</div>
                  </div>
                )}
              </Space>
            </Image.PreviewGroup>
          </div>
        ) : null}
      </Drawer>

      {/* 审核弹窗 */}
      <Modal
        title={reviewAction === "approve" ? "确认通过" : "确认拒绝"}
        open={reviewModalVisible}
        onOk={handleReview}
        onCancel={() => setReviewModalVisible(false)}
        confirmLoading={reviewLoading}
        okText={reviewAction === "approve" ? "确认通过" : "确认拒绝"}
        okButtonProps={{
          danger: reviewAction === "reject",
        }}
      >
        {reviewAction === "approve" ? (
          <p>确定通过此 KYC 申请？审核通过后将自动同步到链上。</p>
        ) : (
          <div>
            <p className="mb-4">请选择拒绝原因：</p>
            <Select
              placeholder="选择拒绝原因"
              style={{ width: "100%", marginBottom: 16 }}
              value={selectedRejectCode}
              onChange={setSelectedRejectCode}
              options={rejectReasons.map((r) => ({
                value: r.code,
                label: r.label,
              }))}
            />
            {selectedRejectCode === "other" && (
              <TextArea
                placeholder="请输入具体拒绝原因"
                rows={3}
                value={customRejectReason}
                onChange={(e) => setCustomRejectReason(e.target.value)}
              />
            )}
          </div>
        )}
      </Modal>
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
