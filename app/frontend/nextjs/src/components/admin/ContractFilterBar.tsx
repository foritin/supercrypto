/**
 * Contract Filter Bar Component
 * 合约筛选栏组件
 *
 * 筛选条件:
 * - 搜索框 (合约名称)
 * - 项目下拉 (Common/Mock/Vanke/全部)
 * - 状态下拉 (已同步/需更新/未部署/全部)
 * - 类型下拉 (Exclusive/Common/Mock/全部)
 * - 重置按钮
 */
'use client';

import { Form, Input, Select, Button, Space } from 'antd';
import { SearchOutlined, ClearOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

export interface ContractFilters {
  search: string;              // 搜索关键词
  project: string;             // 'all' | 'common' | 'mock' | 'vanke' | 'fake'
  status: string;              // 'all' | 'synced' | 'needs_update' | 'not_deployed'
  type: string;                // 'all' | 'exclusive' | 'common' | 'mock'
}

const DEFAULT_FILTERS: ContractFilters = {
  search: '',
  project: 'all',
  status: 'all',
  type: 'all',
};

interface ContractFilterBarProps {
  filters: ContractFilters;
  onFiltersChange: (filters: ContractFilters) => void;
  onReset: () => void;
}

export function ContractFilterBar({
  filters,
  onFiltersChange,
  onReset,
}: ContractFilterBarProps) {
  const { t } = useTranslation();

  const handleFieldChange = (field: keyof ContractFilters, value: string) => {
    onFiltersChange({ ...filters, [field]: value });
  };

  const handleReset = () => {
    onReset();
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
          placeholder={t('admin.contracts.filters.searchPlaceholder')}
          prefix={<SearchOutlined />}
          allowClear
          style={{ width: 200 }}
          value={filters.search}
          onChange={(e) => handleFieldChange('search', e.target.value)}
        />

        {/* 项目下拉 */}
        <Select
          placeholder={t('admin.contracts.filters.projectPlaceholder')}
          style={{ width: 140 }}
          value={filters.project || undefined}
          onChange={(value) => handleFieldChange('project', value)}
          allowClear
        >
          <Select.Option value="all">{t('admin.contracts.filters.allProjects')}</Select.Option>
          <Select.Option value="common">{t('admin.contracts.filters.common')}</Select.Option>
          <Select.Option value="mock">{t('admin.contracts.filters.mock')}</Select.Option>
          <Select.Option value="vanke">{t('admin.contracts.filters.vanke')}</Select.Option>
          <Select.Option value="fake">{t('admin.contracts.filters.fake')}</Select.Option>
        </Select>

        {/* 状态下拉 */}
        <Select
          placeholder={t('admin.contracts.filters.statusPlaceholder')}
          style={{ width: 140 }}
          value={filters.status || undefined}
          onChange={(value) => handleFieldChange('status', value)}
          allowClear
        >
          <Select.Option value="all">{t('admin.contracts.filters.allStatus')}</Select.Option>
          <Select.Option value="synced">{t('admin.contracts.status.synced')}</Select.Option>
          <Select.Option value="needs_update">{t('admin.contracts.status.needs_update')}</Select.Option>
          <Select.Option value="not_deployed">{t('admin.contracts.status.not_deployed')}</Select.Option>
        </Select>

        {/* 类型下拉 */}
        <Select
          placeholder={t('admin.contracts.filters.typePlaceholder')}
          style={{ width: 140 }}
          value={filters.type || undefined}
          onChange={(value) => handleFieldChange('type', value)}
          allowClear
        >
          <Select.Option value="all">{t('admin.contracts.filters.allTypes')}</Select.Option>
          <Select.Option value="exclusive">{t('admin.contracts.filters.exclusive')}</Select.Option>
          <Select.Option value="common">{t('admin.contracts.filters.commonType')}</Select.Option>
          <Select.Option value="mock">{t('admin.contracts.filters.mockType')}</Select.Option>
        </Select>

        {/* 重置按钮 */}
        <Button icon={<ClearOutlined />} onClick={handleReset}>
          {t('admin.contracts.filters.reset')}
        </Button>
      </Space>
    </div>
  );
}

export { DEFAULT_FILTERS };
