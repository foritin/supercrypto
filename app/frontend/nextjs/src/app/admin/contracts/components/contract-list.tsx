"use client";

import { useMemo } from "react";
import {
  GitBranch,
  Table as TableIcon,
  RefreshCw,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { GraphNode } from "@/services/contract-graph";

import type {
  ContractStatusItem,
  ContractStatusResponse,
} from "@/types/contract";

import { ContractDependencyTree } from "@/components/admin/contract-dependency-tree";
import { ContractFilterBar, type ContractFilters, DEFAULT_FILTERS } from "@/components/admin/contract-filter-bar";
import { ContractTableList } from "@/components/admin/contract-table-list";
import { ContractStatusLegend } from "@/components/admin/contract-status-legend";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ContractListProps {
  contractStatus: ContractStatusResponse | null;
  isLoading: boolean;
  viewMode: "table" | "graph";
  onViewModeChange: (mode: "table" | "graph") => void;
  filters: ContractFilters;
  onFiltersChange: (filters: ContractFilters) => void;
  onRefresh: () => void;
  onContractSelect: (contract: ContractStatusItem, node: GraphNode) => void;
}

export function ContractList({
  contractStatus,
  isLoading,
  viewMode,
  onViewModeChange,
  filters,
  onFiltersChange,
  onRefresh,
  onContractSelect,
}: ContractListProps) {
  const { t } = useTranslation();

  // 获取所有合约的扁平列表
  const allContracts = useMemo(() => {
    if (!contractStatus) return [];
    return [
      ...(contractStatus.global_contracts || []),
      ...(contractStatus.project_contracts?.flatMap(p => p.contracts) || []),
    ];
  }, [contractStatus]);

  // 筛选后的合约数据
  const filteredContractStatus = useMemo(() => {
    if (!contractStatus) return null;

    const filterContract = (contract: ContractStatusItem) => {
      // 未注册的合约过滤（包括 not_registered 状态和已解绑的）
      if (!filters.showNotRegistered && (contract.registration_status === 'not_registered' || contract.is_deleted)) {
        return false;
      }

      // 搜索筛选
      if (filters.search && !contract.name.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      // 状态筛选（使用 registration_status）
      if (filters.status !== 'all' && contract.registration_status !== filters.status) {
        return false;
      }

      // 类型筛选 - 使用 scope
      if (filters.type !== 'all') {
        const contractScope = contract.scope === 'global' ? 'common' : 'exclusive';
        if (contractScope !== filters.type) {
          return false;
        }
      }

      return true;
    };

    return {
      ...contractStatus,
      global_contracts: contractStatus.global_contracts?.filter(filterContract) || [],
      project_contracts: contractStatus.project_contracts?.map(group => ({
        ...group,
        contracts: group.contracts.filter(filterContract),
      })).filter(group => group.contracts.length > 0) || [],
    };
  }, [contractStatus, filters]);

  // 将 ContractStatusItem 转换为 GraphNode 格式供详情面板使用
  const createGraphNodeFromContract = (contract: ContractStatusItem): GraphNode => ({
    id: contract.name,
    label: contract.name,
    address: contract.address || '',
    project: contract.project || 'common',
    status: contract.registration_status as GraphNode["status"],
    type: contract.scope === 'global' ? 'common' : 'exclusive',
    module: null,
    deployedAt: contract.deployed_at || null,
    providerAddress: contract.provider_address || null,
    isRegistered: contract.registration_status === 'synced',
    missingDeps: [],
    contractId: contract.id,
    isPrimary: contract.is_primary,
    symbol: contract.symbol,
    actions: contract.actions,
  });

  return (
    <>
      {/* Page Header with Refresh Button */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold mb-2">
            {t("admin.contracts.title")}
          </h2>
          <p className="text-white/65">
            {t("admin.contracts.subtitle")}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={onRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {t("admin.contracts.refresh")}
        </Button>
      </div>

      {/* View Toggle Tabs */}
      <Tabs value={viewMode} onValueChange={(value) => onViewModeChange(value as "table" | "graph")}>
        <TabsList className="mb-4">
          <TabsTrigger value="table" className="flex items-center gap-2">
            <TableIcon className="h-4 w-4" />
            {t("admin.contracts.table.listView")}
          </TabsTrigger>
          <TabsTrigger value="graph" className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            {t("admin.contracts.table.treeView")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="table">
          {/* 状态图例 */}
          <ContractStatusLegend />

          {/* 筛选栏 */}
          <ContractFilterBar
            filters={filters}
            onFiltersChange={onFiltersChange}
            onReset={() => onFiltersChange(DEFAULT_FILTERS)}
          />

          {/* 表格列表 */}
          <ContractTableList
            contractStatus={filteredContractStatus}
            loading={isLoading}
            onContractClick={(contract) => {
              const node = createGraphNodeFromContract(contract);
              onContractSelect(contract, node);
            }}
          />
        </TabsContent>

        <TabsContent value="graph">
          {/* 筛选栏 */}
          <ContractFilterBar
            filters={filters}
            onFiltersChange={onFiltersChange}
            onReset={() => onFiltersChange(DEFAULT_FILTERS)}
          />
          <ContractDependencyTree
            showNotRegistered={filters.showNotRegistered}
            onContractClick={(contractId) => {
              const nodeData = allContracts.find(
                (c) => c.name === contractId
              );
              if (nodeData) {
                const node = createGraphNodeFromContract(nodeData);
                onContractSelect(nodeData, node);
              }
            }}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
