"use client";
/**
 * 审计日志页面 - 重构版
 * 使用新的审计组件和服务
 */
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Typography, Button, Tabs, Space, App } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { RequireAdmin } from "@/components/auth";
import {
  AuditStats,
  AuditLogFilters,
  AuditLogTable,
  AuditLogDetail,
  TransactionTable,
  TransactionDetail,
  AuditExport,
  type AuditFilters,
  DEFAULT_AUDIT_FILTERS,
} from "@/components/admin/audit";
import {
  auditService,
  type AuditLog,
  type TransactionAudit,
  type AuditStats as AuditStatsType,
  type TransactionStats,
  type AuditLogQueryParams,
  type TransactionAuditQueryParams,
} from "@/services/audit";

const { Title, Text } = Typography;

export default function AuditLogsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { message } = App.useApp();

  // Tab 状态
  const [activeTab, setActiveTab] = useState<"general" | "transactions">("general");

  // 审计日志状态
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logsPagination, setLogsPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [logsLoading, setLogsLoading] = useState(false);
  const [filters, setFilters] = useState<AuditFilters>(DEFAULT_AUDIT_FILTERS);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [logDetailOpen, setLogDetailOpen] = useState(false);

  // 交易审计状态
  const [transactions, setTransactions] = useState<TransactionAudit[]>([]);
  const [txPagination, setTxPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [txLoading, setTxLoading] = useState(false);
  const [selectedTx, setSelectedTx] = useState<TransactionAudit | null>(null);
  const [txDetailOpen, setTxDetailOpen] = useState(false);

  // 统计数据
  const [stats, setStats] = useState<AuditStatsType | null>(null);
  const [txStats, setTxStats] = useState<TransactionStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // 构建查询参数
  const buildLogQueryParams = useCallback((): AuditLogQueryParams => {
    const params: AuditLogQueryParams = {
      page: logsPagination.current,
      page_size: logsPagination.pageSize,
    };

    if (filters.category && filters.category !== "all") {
      params.category = filters.category;
    }
    if (filters.action && filters.action !== "all") {
      params.action = filters.action;
    }
    if (filters.status && filters.status !== "all") {
      params.status = filters.status;
    }
    if (filters.operatorType && filters.operatorType !== "all") {
      params.operator_type = filters.operatorType;
    }
    if (filters.dateRange && filters.dateRange[0] && filters.dateRange[1]) {
      params.start_time = filters.dateRange[0].toISOString();
      params.end_time = filters.dateRange[1].toISOString();
    }

    return params;
  }, [filters, logsPagination.current, logsPagination.pageSize]);

  // 获取审计日志
  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const params = buildLogQueryParams();
      const response = await auditService.queryLogs(params);
      setLogs(response.list_data);
      setLogsPagination((prev) => ({
        ...prev,
        total: response.pagination.total,
      }));
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
      message.error(t("admin.audit.loadError", "加载审计日志失败"));
    } finally {
      setLogsLoading(false);
    }
  }, [buildLogQueryParams, message, t]);

  // 获取交易审计
  const fetchTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const params: TransactionAuditQueryParams = {
        page: txPagination.current,
        page_size: txPagination.pageSize,
      };
      const response = await auditService.queryTransactions(params);
      setTransactions(response.list_data);
      setTxPagination((prev) => ({
        ...prev,
        total: response.pagination.total,
      }));
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
      message.error(t("admin.audit.loadTxError", "加载交易记录失败"));
    } finally {
      setTxLoading(false);
    }
  }, [txPagination.current, txPagination.pageSize, message, t]);

  // 获取统计数据
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [auditStats, transactionStats] = await Promise.all([
        auditService.getStats(),
        auditService.getTransactionStats(),
      ]);
      setStats(auditStats);
      setTxStats(transactionStats);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // 当 Tab 切换或筛选条件变化时加载数据
  useEffect(() => {
    if (activeTab === "general") {
      fetchLogs();
    } else {
      fetchTransactions();
    }
  }, [activeTab, fetchLogs, fetchTransactions]);

  // 筛选条件变化时重置页码
  useEffect(() => {
    setLogsPagination((prev) => ({ ...prev, current: 1 }));
  }, [filters]);

  // 刷新数据
  const handleRefresh = () => {
    fetchStats();
    if (activeTab === "general") {
      fetchLogs();
    } else {
      fetchTransactions();
    }
  };

  // 处理日志分页变化
  const handleLogsPaginationChange = (page: number, pageSize: number) => {
    setLogsPagination((prev) => ({
      ...prev,
      current: page,
      pageSize,
    }));
  };

  // 处理交易分页变化
  const handleTxPaginationChange = (page: number, pageSize: number) => {
    setTxPagination((prev) => ({
      ...prev,
      current: page,
      pageSize,
    }));
  };

  // 查看日志详情
  const handleViewLogDetail = (log: AuditLog) => {
    setSelectedLog(log);
    setLogDetailOpen(true);
  };

  // 查看交易详情
  const handleViewTxDetail = (tx: TransactionAudit) => {
    setSelectedTx(tx);
    setTxDetailOpen(true);
  };

  // 导出筛选参数
  const exportFilters = useMemo(() => {
    const params: Record<string, string> = {};
    if (filters.category && filters.category !== "all") {
      params.category = filters.category;
    }
    if (filters.status && filters.status !== "all") {
      params.status = filters.status;
    }
    if (filters.dateRange && filters.dateRange[0] && filters.dateRange[1]) {
      params.start_time = filters.dateRange[0].toISOString();
      params.end_time = filters.dateRange[1].toISOString();
    }
    return params;
  }, [filters]);

  return (
    <RequireAdmin>
      <div style={{ maxWidth: 1600, margin: "0 auto", padding: "24px" }}>
        {/* 页面标题 */}
        <div
          style={{
            marginBottom: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <Title level={2} style={{ marginBottom: 8 }}>
              {t("admin.audit.pageTitle", "审计日志")}
            </Title>
            <Text style={{ color: "rgba(255, 255, 255, 0.65)" }}>
              {t("admin.audit.pageSubtitle", "查看所有系统操作和交易记录")}
            </Text>
          </div>
          <Space>
            <AuditExport currentFilters={exportFilters as any} />
            <Button
              icon={<ReloadOutlined spin={logsLoading || txLoading} />}
              onClick={handleRefresh}
              loading={logsLoading || txLoading}
            >
              {t("common.refresh", "刷新")}
            </Button>
          </Space>
        </div>

        {/* 统计卡片 */}
        <AuditStats
          stats={stats}
          transactionStats={txStats}
          loading={statsLoading}
        />

        {/* Tab 切换 */}
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as "general" | "transactions")}
          items={[
            {
              key: "general",
              label: t("admin.audit.tabs.general", "通用日志"),
              children: (
                <>
                  {/* 筛选栏 */}
                  <AuditLogFilters
                    filters={filters}
                    onFiltersChange={setFilters}
                    onReset={() => setFilters(DEFAULT_AUDIT_FILTERS)}
                  />

                  {/* 审计日志表格 */}
                  <AuditLogTable
                    data={logs}
                    loading={logsLoading}
                    pagination={{
                      current: logsPagination.current,
                      pageSize: logsPagination.pageSize,
                      total: logsPagination.total,
                      onChange: handleLogsPaginationChange,
                    }}
                    onViewDetail={handleViewLogDetail}
                  />
                </>
              ),
            },
            {
              key: "transactions",
              label: t("admin.audit.tabs.transactions", "交易日志"),
              children: (
                <>
                  {/* 交易表格 */}
                  <TransactionTable
                    data={transactions}
                    loading={txLoading}
                    pagination={{
                      current: txPagination.current,
                      pageSize: txPagination.pageSize,
                      total: txPagination.total,
                      onChange: handleTxPaginationChange,
                    }}
                    onViewDetail={handleViewTxDetail}
                  />
                </>
              ),
            },
          ]}
        />

        {/* 审计日志详情抽屉 */}
        <AuditLogDetail
          open={logDetailOpen}
          onClose={() => {
            setLogDetailOpen(false);
            setSelectedLog(null);
          }}
          log={selectedLog}
        />

        {/* 交易详情抽屉 */}
        <TransactionDetail
          open={txDetailOpen}
          onClose={() => {
            setTxDetailOpen(false);
            setSelectedTx(null);
          }}
          transaction={selectedTx}
        />
      </div>
    </RequireAdmin>
  );
}
