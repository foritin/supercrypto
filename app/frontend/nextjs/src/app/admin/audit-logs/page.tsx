"use client";
/**
 * 审计日志页面
 * Story 7.6-FE: 审计日志前端查看
 */
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useTranslation } from "react-i18next";
import {
  adminService,
  AuditLogResponse,
  AuditAction,
  PaginatedResponse,
} from "@/services/admin";
import { RequireAuth } from "@/components/auth";

// 操作类型映射 - 使用翻译 key
const ACTION_KEYS: Record<AuditAction, string> = {
  KYC_APPROVE: "admin.auditLogs.actions.KYC_APPROVE",
  KYC_REJECT: "admin.auditLogs.actions.KYC_REJECT",
  ASSET_CREATE: "admin.auditLogs.actions.ASSET_CREATE",
  ASSET_UPDATE: "admin.auditLogs.actions.ASSET_UPDATE",
  ASSET_PAUSE: "admin.auditLogs.actions.ASSET_PAUSE",
  CONTRACT_BIND: "admin.auditLogs.actions.CONTRACT_BIND",
  CONTRACT_SYNC: "admin.auditLogs.actions.CONTRACT_SYNC",
  STAKING_START: "admin.auditLogs.actions.STAKING_START",
  STAKING_PAUSE: "admin.auditLogs.actions.STAKING_PAUSE",
  ADMIN_ACTION: "admin.auditLogs.actions.ADMIN_ACTION",
};

// 操作类型颜色
const ACTION_COLORS: Record<AuditAction, string> = {
  KYC_APPROVE: "bg-green-500/20 text-green-400",
  KYC_REJECT: "bg-red-500/20 text-red-400",
  ASSET_CREATE: "bg-blue-500/20 text-blue-400",
  ASSET_UPDATE: "bg-yellow-500/20 text-yellow-400",
  ASSET_PAUSE: "bg-orange-500/20 text-orange-400",
  CONTRACT_BIND: "bg-purple-500/20 text-purple-400",
  CONTRACT_SYNC: "bg-indigo-500/20 text-indigo-400",
  STAKING_START: "bg-teal-500/20 text-teal-400",
  STAKING_PAUSE: "bg-pink-500/20 text-pink-400",
  ADMIN_ACTION: "bg-gray-500/20 text-gray-400",
};

// 格式化时间
function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// 缩短地址
function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// 筛选器组件
function FilterPanel({
  filters,
  onFilterChange,
  onReset,
  t,
}: {
  filters: {
    action?: AuditAction;
    success?: boolean;
  };
  onFilterChange: (key: string, value: unknown) => void;
  onReset: () => void;
  t: (key: string, fallback?: string) => string;
}) {
  return (
    <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* 操作类型筛选 */}
        <div>
          <label className="mb-1 block text-xs text-gray-400">{t("admin.auditLogs.filterByAction")}</label>
          <select
            value={filters.action || ""}
            onChange={(e) =>
              onFilterChange("action", e.target.value || undefined)
            }
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="">{t("admin.auditLogs.allActions")}</option>
            {Object.entries(ACTION_KEYS).map(([key, labelKey]) => (
              <option key={key} value={key}>
                {t(labelKey)}
              </option>
            ))}
          </select>
        </div>

        {/* 结果筛选 */}
        <div>
          <label className="mb-1 block text-xs text-gray-400">{t("admin.auditLogs.filterByResult")}</label>
          <select
            value={filters.success === undefined ? "" : String(filters.success)}
            onChange={(e) => {
              const val = e.target.value;
              onFilterChange(
                "success",
                val === "" ? undefined : val === "true"
              );
            }}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="">{t("admin.auditLogs.allResults")}</option>
            <option value="true">{t("admin.auditLogs.success")}</option>
            <option value="false">{t("admin.auditLogs.failed")}</option>
          </select>
        </div>

        {/* 重置按钮 */}
        <div className="flex-1" />
        <button
          onClick={onReset}
          className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300 transition-all hover:bg-white/10"
        >
          {t("admin.auditLogs.resetFilters", "重置筛选")}
        </button>
      </div>
    </div>
  );
}

// 日志详情模态框
function LogDetailModal({
  log,
  onClose,
  t,
}: {
  log: AuditLogResponse;
  onClose: () => void;
  t: (key: string, fallback?: string) => string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl border border-white/10 bg-gray-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">{t("admin.auditLogs.details")}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 transition-colors hover:text-white"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* 基本信息 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400">{t("admin.auditLogs.logId", "日志 ID")}</label>
              <p className="font-mono text-white">{log.id}</p>
            </div>
            <div>
              <label className="text-xs text-gray-400">{t("admin.auditLogs.time")}</label>
              <p className="text-white">{formatDateTime(log.created_at)}</p>
            </div>
            <div>
              <label className="text-xs text-gray-400">{t("admin.auditLogs.operator")}</label>
              <p className="font-mono text-white">{log.operator_address}</p>
            </div>
            <div>
              <label className="text-xs text-gray-400">{t("admin.auditLogs.action")}</label>
              <span
                className={`inline-block rounded-full px-3 py-1 text-xs ${
                  ACTION_COLORS[log.action]
                }`}
              >
                {t(ACTION_KEYS[log.action])}
              </span>
            </div>
          </div>

          {/* 目标信息 */}
          {(log.target_type || log.target_id) && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400">{t("admin.auditLogs.targetType")}</label>
                <p className="text-white">{log.target_type || "-"}</p>
              </div>
              <div>
                <label className="text-xs text-gray-400">{t("admin.auditLogs.targetId")}</label>
                <p className="font-mono text-white">{log.target_id || "-"}</p>
              </div>
            </div>
          )}

          {/* 操作结果 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400">{t("admin.auditLogs.result")}</label>
              <p className={log.success ? "text-green-400" : "text-red-400"}>
                {log.success ? t("admin.auditLogs.success") : t("admin.auditLogs.failed")}
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-400">{t("admin.auditLogs.environment", "环境")}</label>
              <p className="text-white">{log.environment}</p>
            </div>
          </div>

          {/* 错误信息 */}
          {log.error_message && (
            <div>
              <label className="text-xs text-gray-400">{t("admin.auditLogs.errorMessage")}</label>
              <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
                {log.error_message}
              </p>
            </div>
          )}

          {/* 交易哈希 */}
          {log.tx_hash && (
            <div>
              <label className="text-xs text-gray-400">{t("admin.auditLogs.txHash")}</label>
              <p className="break-all font-mono text-sm text-blue-400">
                {log.tx_hash}
              </p>
            </div>
          )}

          {/* IP 地址 */}
          {log.ip_address && (
            <div>
              <label className="text-xs text-gray-400">{t("admin.auditLogs.ipAddress")}</label>
              <p className="font-mono text-white">{log.ip_address}</p>
            </div>
          )}

          {/* 详情 */}
          {log.details && Object.keys(log.details).length > 0 && (
            <div>
              <label className="text-xs text-gray-400">{t("admin.auditLogs.operationDetails", "操作详情")}</label>
              <pre className="mt-1 overflow-auto rounded-lg bg-black/50 p-3 text-xs text-gray-300">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white transition-all hover:bg-white/20"
          >
            {t("common.close", "关闭")}
          </button>
        </div>
      </div>
    </div>
  );
}

// 主页面
export default function AuditLogsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { address, isConnected } = useAccount();

  const [logs, setLogs] = useState<AuditLogResponse[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    page_size: 20,
    total_pages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 筛选条件
  const [filters, setFilters] = useState<{
    action?: AuditAction;
    success?: boolean;
  }>({});

  // 详情模态框
  const [selectedLog, setSelectedLog] = useState<AuditLogResponse | null>(null);

  // 获取日志列表
  const fetchLogs = useCallback(
    async (page = 1) => {
      if (!isConnected || !address) return;

      try {
        setIsLoading(true);
        setError(null);
        const data = await adminService.getAuditLogs({
          ...filters,
          page,
          page_size: 20,
        });
        setLogs(data.list);
        setPagination(data.pagination);
      } catch (err) {
        console.error("Failed to fetch audit logs:", err);
        setError((err as Error).message || t("admin.auditLogs.loadError"));
      } finally {
        setIsLoading(false);
      }
    },
    [isConnected, address, filters]
  );

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // 筛选变更
  const handleFilterChange = (key: string, value: unknown) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // 重置筛选
  const handleResetFilters = () => {
    setFilters({});
  };

  // 翻页
  const handlePageChange = (page: number) => {
    fetchLogs(page);
  };

  return (
    <RequireAuth requireKyc={false} requireAdmin>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-6 py-8">
        {/* 页面标题 */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="rounded-lg bg-white/10 p-2 text-white transition-all hover:bg-white/20"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">{t("admin.auditLogs.pageTitle")}</h1>
              <p className="text-sm text-gray-400">{t("admin.auditLogs.pageSubtitle")}</p>
            </div>
          </div>
          <button
            onClick={() => fetchLogs(1)}
            disabled={isLoading}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white transition-all hover:bg-white/20 disabled:opacity-50"
          >
            {isLoading ? t("common.loading", "加载中...") : t("common.refresh", "刷新")}
          </button>
        </div>

        {/* 筛选面板 */}
        <FilterPanel
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={handleResetFilters}
          t={t}
        />

        {/* 错误提示 */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-400">
            {error}
          </div>
        )}

        {/* 日志列表 */}
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-400">
                  {t("admin.auditLogs.time")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-400">
                  {t("admin.auditLogs.operator")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-400">
                  {t("admin.auditLogs.action")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-400">
                  {t("admin.auditLogs.target")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-400">
                  {t("admin.auditLogs.result")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-400">
                  {t("common.actions", "操作")}
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading && logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    <div className="flex items-center justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    {t("admin.auditLogs.noLogs")}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-white/5 transition-colors hover:bg-white/5"
                  >
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-white">
                        {shortenAddress(log.operator_address)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-1 text-xs ${
                          ACTION_COLORS[log.action]
                        }`}
                      >
                        {t(ACTION_KEYS[log.action])}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {log.target_type && (
                        <>
                          {log.target_type}
                          {log.target_id && (
                            <span className="ml-1 text-gray-500">
                              #{log.target_id}
                            </span>
                          )}
                        </>
                      )}
                      {!log.target_type && "-"}
                    </td>
                    <td className="px-4 py-3">
                      {log.success ? (
                        <span className="inline-flex items-center gap-1 text-sm text-green-400">
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          {t("admin.auditLogs.success")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-sm text-red-400">
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                          {t("admin.auditLogs.failed")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-sm text-blue-400 transition-colors hover:text-blue-300"
                      >
                        {t("admin.auditLogs.viewDetails")}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        {pagination.total_pages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-400">
              {t("admin.auditLogs.pagination", "共 {{total}} 条记录，第 {{page}} / {{totalPages}} 页", {
                total: pagination.total,
                page: pagination.page,
                totalPages: pagination.total_pages
              })}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1 || isLoading}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("common.prevPage", "上一页")}
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={
                  pagination.page >= pagination.total_pages || isLoading
                }
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("common.nextPage", "下一页")}
              </button>
            </div>
          </div>
        )}

        {/* 详情模态框 */}
        {selectedLog && (
          <LogDetailModal
            log={selectedLog}
            onClose={() => setSelectedLog(null)}
            t={t}
          />
        )}
      </div>
    </RequireAuth>
  );
}
