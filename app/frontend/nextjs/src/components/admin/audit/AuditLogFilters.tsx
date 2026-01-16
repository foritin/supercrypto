/**
 * AuditLogFilters Component
 * 审计日志筛选组件 - 采用 ContractFilterBar 风格
 */
'use client';

import React from 'react';
import { Input, Select, DatePicker, Button, Space } from 'antd';
import { SearchOutlined, ClearOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import dayjs, { Dayjs } from 'dayjs';
import { 
  AuditCategory, 
  AuditAction, 
  AuditStatus,
} from '@/services/audit';

const { RangePicker } = DatePicker;

export interface AuditFilters {
  search: string;
  category: AuditCategory | 'all';
  action: AuditAction | 'all';
  status: AuditStatus | 'all';
  operatorType: string;
  dateRange: [Dayjs | null, Dayjs | null] | null;
}

export const DEFAULT_AUDIT_FILTERS: AuditFilters = {
  search: '',
  category: 'all',
  action: 'all',
  status: 'all',
  operatorType: 'all',
  dateRange: null,
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
      style={{
        padding: 16,
        marginBottom: 16,
        background: 'rgba(15, 15, 26, 0.6)',
        borderRadius: 12,
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <Space size="middle" wrap style={{ width: '100%' }}>
        {/* 搜索框 */}
        <Input
          placeholder={t('admin.audit.filters.searchPlaceholder', '搜索操作者/目标/描述')}
          prefix={<SearchOutlined />}
          allowClear
          style={{ width: 200 }}
          value={filters.search}
          onChange={(e) => handleFieldChange('search', e.target.value)}
        />

        {/* 类别筛选 */}
        <Select
          placeholder={t('admin.audit.filters.categoryPlaceholder', '选择类别')}
          style={{ width: 140 }}
          value={filters.category}
          onChange={(value) => handleFieldChange('category', value)}
          allowClear
          onClear={() => handleFieldChange('category', 'all')}
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <Select.Option key={opt.value} value={opt.value}>
              {t(opt.labelKey, opt.value === 'all' ? '全部类别' : opt.value)}
            </Select.Option>
          ))}
        </Select>

        {/* 状态筛选 */}
        <Select
          placeholder={t('admin.audit.filters.statusPlaceholder', '选择状态')}
          style={{ width: 120 }}
          value={filters.status}
          onChange={(value) => handleFieldChange('status', value)}
          allowClear
          onClear={() => handleFieldChange('status', 'all')}
        >
          {STATUS_OPTIONS.map((opt) => (
            <Select.Option key={opt.value} value={opt.value}>
              {t(opt.labelKey, opt.value === 'all' ? '全部状态' : opt.value)}
            </Select.Option>
          ))}
        </Select>

        {/* 操作者类型筛选 */}
        <Select
          placeholder={t('admin.audit.filters.operatorTypePlaceholder', '操作者类型')}
          style={{ width: 120 }}
          value={filters.operatorType}
          onChange={(value) => handleFieldChange('operatorType', value)}
          allowClear
          onClear={() => handleFieldChange('operatorType', 'all')}
        >
          {OPERATOR_TYPE_OPTIONS.map((opt) => (
            <Select.Option key={opt.value} value={opt.value}>
              {t(opt.labelKey, opt.value === 'all' ? '全部类型' : opt.value)}
            </Select.Option>
          ))}
        </Select>

        {/* 时间范围 */}
        <RangePicker
          placeholder={[
            t('admin.audit.filters.startDate', '开始日期'),
            t('admin.audit.filters.endDate', '结束日期'),
          ]}
          value={filters.dateRange}
          onChange={(dates) => handleFieldChange('dateRange', dates)}
          style={{ width: 260 }}
        />

        {/* 重置按钮 */}
        <Button icon={<ClearOutlined />} onClick={onReset}>
          {t('admin.audit.filters.reset', '重置')}
        </Button>
      </Space>
    </div>
  );
};
