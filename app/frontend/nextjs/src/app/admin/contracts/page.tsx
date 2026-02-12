"use client";

/**
 * Admin Contracts Page
 * 管理员合约管理页面 - 查看合约状态、注册/解除注册合约
 * 
 * 已拆分为子组件:
 * - ContractList: 合约列表视图 (表格/树形)
 * - ContractDetail: 更新依赖地址弹窗
 * - DependencyPanel: 注册/解除注册/主合约管理 + 重置弹窗
 */

import { useState, useEffect, useCallback } from "react";
import { GraphNode } from "@/services/contract-graph";

import { useCurrentUser } from "@/hooks";
import { RequireAdmin } from "@/components/auth";
import { contractAdminService } from "@/services/contract";
import type { ContractStatusItem, ContractStatusResponse } from "@/types/contract";
import { type ContractFilters, DEFAULT_FILTERS } from "@/components/admin/contract-filter-bar";

import { ContractList } from "./components/contract-list";
import { DependencyPanel } from "./components/dependency-panel";

export default function AdminContractsPage() {
  const { isAdmin } = useCurrentUser();

  // 视图状态
  const [viewMode, setViewMode] = useState<"table" | "graph">("table");
  const [filters, setFilters] = useState<ContractFilters>(DEFAULT_FILTERS);

  // 数据状态
  const [contractStatus, setContractStatus] =
    useState<ContractStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 选中状态
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedListContract, setSelectedListContract] = useState<ContractStatusItem | null>(null);

  // 获取合约状态
  const fetchContractStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await contractAdminService.getContractStatus();
      setContractStatus(data);
    } catch (err) {
      console.error("Failed to fetch contract status:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchContractStatus();
    }
  }, [isAdmin, fetchContractStatus]);

  // 关闭详情面板
  const handleDetailPanelClose = () => {
    setDetailPanelOpen(false);
    setSelectedNode(null);
    setSelectedListContract(null);
  };

  // 合约选中处理
  const handleContractSelect = (contract: ContractStatusItem, node: GraphNode) => {
    setSelectedListContract(contract);
    setSelectedNode(node);
    setDetailPanelOpen(true);
  };

  // 操作成功后刷新
  const handleSuccess = () => {
    handleDetailPanelClose();
    fetchContractStatus();
  };

  return (
    <RequireAdmin>
      <div className="max-w-[1400px] mx-auto">
        {/* 合约列表视图 (表格/树形) */}
        <ContractList
          contractStatus={contractStatus}
          isLoading={isLoading}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          filters={filters}
          onFiltersChange={setFilters}
          onRefresh={fetchContractStatus}
          onContractSelect={handleContractSelect}
        />

        {/* 注册/解除注册/主合约管理 + 重置弹窗 */}
        <DependencyPanel
          detailPanelOpen={detailPanelOpen}
          onDetailPanelClose={handleDetailPanelClose}
          selectedNode={selectedNode}
          selectedListContract={selectedListContract}
          onSuccess={handleSuccess}
        />
      </div>
    </RequireAdmin>
  );
}
