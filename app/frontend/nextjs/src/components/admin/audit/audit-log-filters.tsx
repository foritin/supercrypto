/**
 * AuditLogFilters Component
 * 审计日志筛选组件 - 采用 ContractFilterBar 风格
 * 已迁移至 shadcn/ui 组件
 */
'use client';

import { Search, X } from 'lucide-react';
import React from 'react';
import { type DateRange } from 'react-day-picker';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { 
  AuditAction} from '@/types/audit';
import { 
  AuditCategory, 
  AuditStatus,
} from '@/types/audit';

export interface AuditFilters {
  search: string;
  category: AuditCategory | 'all';
  action: AuditAction | 'all';
  status: AuditStatus | 'all';
  operatorType: string;
  dateRange: DateRange | undefined;
}

export const DEFAULT_AUDIT_FILTERS: AuditFilters = {
  search: '',
  category: 'all',
  action: 'all',
  status: 'all',
  operatorType: 'all',
  dateRange: undefined,
};

interface AuditLogFiltersProps {
  filters: AuditFilters;
  onFiltersChange: (filters: AuditFilters) => void;
  onReset: () => void;
}

// 类别选项
const CATEGORY_OPTIONS = [
  { value: 'all', labelKey: 'admin.audit.filters.allCategories' },
  { value: AuditCategory.AUTH, labelKey: 'admin.audit.category.auth' },
  { value: AuditCategory.ACCOUNT, labelKey: 'admin.audit.category.account' },
  { value: AuditCategory.KYC, labelKey: 'admin.audit.category.kyc' },
  { value: AuditCategory.CONTRACT, labelKey: 'admin.audit.category.contract' },
  { value: AuditCategory.ASSET, labelKey: 'admin.audit.category.asset' },
  { value: AuditCategory.PERMISSION, labelKey: 'admin.audit.category.permission' },
  { value: AuditCategory.SYSTEM, labelKey: 'admin.audit.category.system' },
];

// 状态选项
const STATUS_OPTIONS = [
  { value: 'all', labelKey: 'admin.audit.filters.allStatus' },
  { value: AuditStatus.SUCCESS, labelKey: 'admin.audit.status.success' },
  { value: AuditStatus.FAILED, labelKey: 'admin.audit.status.failed' },
  { value: AuditStatus.PENDING, labelKey: 'admin.audit.status.pending' },
];

// 操作者类型选项
const OPERATOR_TYPE_OPTIONS = [
  { value: 'all', labelKey: 'admin.audit.filters.allOperatorTypes' },
  { value: 'admin', labelKey: 'admin.audit.operatorType.admin' },
  { value: 'user', labelKey: 'admin.audit.operatorType.user' },
  { value: 'system', labelKey: 'admin.audit.operatorType.system' },
];

export const AuditLogFilters: React.FC<AuditLogFiltersProps> = ({
  filters,
  onFiltersChange,
  onReset,
}) => {
  const { t } = useTranslation();

  const handleFieldChange = <K extends keyof AuditFilters>(
    field: K,
    value: AuditFilters[K]
  ) => {
    onFiltersChange({ ...filters, [field]: value });
  };

  return (
    <div
      className="p-4 mb-4 rounded-xl border backdrop-blur-lg"
      style={{
        background: 'rgba(15, 15, 26, 0.6)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
      }}
    >
      <div className="flex flex-wrap items-center gap-3">
        {/* 搜索框 */}
        <div className="relative w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('admin.audit.filters.searchPlaceholder', '搜索操作者/目标/描述')}
            className="pl-9"
            value={filters.search}
            onChange={(e) => handleFieldChange('search', e.target.value)}
          />
        </div>

        {/* 类别筛选 */}
        <Select
          value={filters.category}
          onValueChange={(value) => handleFieldChange('category', value as AuditCategory | 'all')}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t('admin.audit.filters.categoryPlaceholder', '选择类别')} />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {t(opt.labelKey, opt.value === 'all' ? '全部类别' : opt.value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 状态筛选 */}
        <Select
          value={filters.status}
          onValueChange={(value) => handleFieldChange('status', value as AuditStatus | 'all')}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder={t('admin.audit.filters.statusPlaceholder', '选择状态')} />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {t(opt.labelKey, opt.value === 'all' ? '全部状态' : opt.value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 操作者类型筛选 */}
        <Select
          value={filters.operatorType}
          onValueChange={(value) => handleFieldChange('operatorType', value)}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder={t('admin.audit.filters.operatorTypePlaceholder', '操作者类型')} />
          </SelectTrigger>
          <SelectContent>
            {OPERATOR_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {t(opt.labelKey, opt.value === 'all' ? '全部类型' : opt.value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 时间范围 */}
        <DateRangePicker
          onChange={(range) => handleFieldChange('dateRange', range)}
          placeholder={t('admin.audit.filters.dateRangePlaceholder', '选择日期范围')}
          className="w-[260px]"
          dateFormat="yyyy-MM-dd"
          {...(filters.dateRange ? { value: filters.dateRange } : {})}
        />

        {/* 重置按钮 */}
        <Button variant="outline" onClick={onReset}>
          <X className="h-4 w-4 mr-1" />
          {t('admin.audit.filters.reset', '重置')}
        </Button>
      </div>
    </div>
  );
};
