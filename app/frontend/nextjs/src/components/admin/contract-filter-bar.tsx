/**
 * Contract Filter Bar Component
 * 合约筛选栏组件 - 已迁移至 shadcn/ui 组件
 *
 * 筛选条件:
 * - 搜索框 (合约名称)
 * - 状态下拉 (已同步/需更新/未部署/全部)
 * - 类型下拉 (Exclusive/Common/Mock/全部)
 * - 显示已解绑 Checkbox
 * - 重置按钮
 * 
 * 注意: 项目筛选已移至 Project Contracts 表格独立实现
 */
'use client';

import { Search, X, HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';

export interface ContractFilters {
  search: string;              // 搜索关键词
  status: string;              // 'all' | 'synced' | 'needs_update' | 'not_deployed'
  type: string;                // 'all' | 'exclusive' | 'common' | 'mock'
  showNotRegistered: boolean;  // 是否显示未注册的合约（包括从未注册和已解绑的）
}

const DEFAULT_FILTERS: ContractFilters = {
  search: '',
  status: 'all',
  type: 'all',
  showNotRegistered: true,     // 默认显示未注册的合约
};

interface ContractFilterBarProps {
  filters: ContractFilters;
  onFiltersChange: (filters: ContractFilters) => void;
  onReset: () => void;
}

// 状态选项
const STATUS_OPTIONS = [
  { value: 'all', labelKey: 'admin.contracts.filters.allStatus' },
  { value: 'synced', labelKey: 'admin.contracts.status.synced' },
  { value: 'mismatch', labelKey: 'admin.contracts.status.mismatch' },
  { value: 'not_registered', labelKey: 'admin.contracts.status.notRegistered' },
  { value: 'not_deployed', labelKey: 'admin.contracts.status.notDeployed' },
];

// 类型选项
const TYPE_OPTIONS = [
  { value: 'all', labelKey: 'admin.contracts.filters.allTypes' },
  { value: 'exclusive', labelKey: 'admin.contracts.filters.exclusive' },
  { value: 'common', labelKey: 'admin.contracts.filters.commonType' },
  { value: 'mock', labelKey: 'admin.contracts.filters.mockType' },
];

export function ContractFilterBar({
  filters,
  onFiltersChange,
  onReset,
}: ContractFilterBarProps) {
  const { t } = useTranslation();

  const handleFieldChange = (field: keyof ContractFilters, value: string | boolean) => {
    onFiltersChange({ ...filters, [field]: value });
  };

  const handleReset = () => {
    onReset();
  };

  return (
    <div
      className="p-4 mb-4 rounded-xl border backdrop-blur-lg"
      style={{
        background: 'var(--glass-bg)',
        borderColor: 'var(--glass-border)',
      }}
    >
      <div className="flex flex-wrap items-center gap-3">
        {/* 搜索框 */}
        <div className="relative w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('admin.contracts.filters.searchPlaceholder')}
            className="pl-9"
            value={filters.search}
            onChange={(e) => handleFieldChange('search', e.target.value)}
          />
        </div>

        {/* 状态下拉 */}
        <Select
          value={filters.status || 'all'}
          onValueChange={(value) => handleFieldChange('status', value)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t('admin.contracts.filters.statusPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {t(opt.labelKey, opt.value === 'all' ? '全部状态' : opt.value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 类型下拉 */}
        <Select
          value={filters.type || 'all'}
          onValueChange={(value) => handleFieldChange('type', value)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t('admin.contracts.filters.typePlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {t(opt.labelKey, opt.value === 'all' ? '全部类型' : opt.value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 重置按钮 */}
        <Button variant="outline" onClick={handleReset}>
          <X className="h-4 w-4 mr-1" />
          {t('admin.contracts.filters.reset')}
        </Button>

        {/* 分隔线 */}
        <div className="w-px h-6 bg-white/15 mx-1" />

        {/* 显示未注册 Checkbox */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showNotRegistered"
                  checked={filters.showNotRegistered}
                  onCheckedChange={(checked) => handleFieldChange('showNotRegistered', checked === true)}
                />
                <Label
                  htmlFor="showNotRegistered"
                  className="text-sm text-muted-foreground cursor-pointer flex items-center gap-1"
                >
                  {t('admin.contracts.filters.showNotRegistered')}
                  <HelpCircle className="h-3 w-3 opacity-60" />
                </Label>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('admin.contracts.filters.showNotRegisteredTooltip')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

export { DEFAULT_FILTERS };
