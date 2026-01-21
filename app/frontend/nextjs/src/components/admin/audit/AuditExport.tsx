/**
 * AuditExport Component
 * 审计日志导出组件
 * 
 * 已迁移至 shadcn/ui:
 * - Dropdown → DropdownMenu
 * - Modal → Dialog
 * - Form → react-hook-form + zod
 * - DatePicker → DateRangePicker
 * - Select → shadcn/ui Select
 * - Button → shadcn/ui Button
 * - message → sonner toast
 * - @ant-design/icons → lucide-react
 * 
 * _Requirements: 13.4_
 */
'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Download, FileSpreadsheet, FileText, ChevronDown, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { notification } from '@/lib/notification';
import { exportAuditLogs, AuditCategory, AuditStatus } from '@/services/audit';

interface AuditExportProps {
  currentFilters?: {
    category?: AuditCategory;
    status?: AuditStatus;
    start_time?: string;
    end_time?: string;
  };
}

type ExportFormat = 'csv' | 'json';

// Zod schema for custom export form
const customExportSchema = z.object({
  dateRange: z.custom<DateRange>().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
  format: z.enum(['csv', 'json']),
});

type CustomExportFormValues = z.infer<typeof customExportSchema>;

export const AuditExport: React.FC<AuditExportProps> = ({ currentFilters }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Initialize react-hook-form with zod resolver
  const form = useForm<CustomExportFormValues>({
    resolver: zodResolver(customExportSchema),
    defaultValues: {
      format: 'csv',
      category: undefined,
      status: undefined,
      dateRange: undefined,
    },
  });

  // 快速导出（使用当前筛选条件）
  const handleQuickExport = async (format: ExportFormat) => {
    setLoading(true);
    try {
      const blob = await exportAuditLogs({
        ...currentFilters,
        // 添加格式参数（如果后端支持）
      });
      
      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      notification.success(t('admin.audit.export.success', '导出成功'));
    } catch (error) {
      notification.error(t('admin.audit.export.failed', '导出失败'));
      console.error('Export failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // 自定义导出
  const handleCustomExport = async (values: CustomExportFormValues) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      
      if (values.dateRange?.from) {
        params.start_time = values.dateRange.from.toISOString();
      }
      if (values.dateRange?.to) {
        params.end_time = values.dateRange.to.toISOString();
      }
      if (values.category && values.category !== 'all') {
        params.category = values.category;
      }
      if (values.status && values.status !== 'all') {
        params.status = values.status;
      }

      const blob = await exportAuditLogs(params as any);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.${values.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      notification.success(t('admin.audit.export.success', '导出成功'));
      setModalOpen(false);
      form.reset();
    } catch (error) {
      notification.error(t('admin.audit.export.failed', '导出失败'));
      console.error('Export failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    form.reset();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span className="ml-2">{t('admin.audit.export.button', '导出')}</span>
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleQuickExport('csv')}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {t('admin.audit.export.exportCsv', '导出 CSV')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleQuickExport('json')}>
            <FileText className="mr-2 h-4 w-4" />
            {t('admin.audit.export.exportJson', '导出 JSON')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setModalOpen(true)}>
            {t('admin.audit.export.customExport', '自定义导出...')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 自定义导出弹窗 */}
      <Dialog open={modalOpen} onOpenChange={handleModalClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {t('admin.audit.export.customTitle', '自定义导出')}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCustomExport)} className="space-y-4">
              <FormField
                control={form.control}
                name="dateRange"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('admin.audit.export.dateRange', '时间范围')}
                    </FormLabel>
                    <FormControl>
                      <DateRangePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder={`${t('admin.audit.export.startDate', '开始日期')} - ${t('admin.audit.export.endDate', '结束日期')}`}
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('admin.audit.export.category', '类别')}
                    </FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t('admin.audit.export.allCategories', '全部类别')}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">
                          {t('admin.audit.export.allCategories', '全部类别')}
                        </SelectItem>
                        {Object.values(AuditCategory).map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {t(`admin.audit.category.${cat}`, cat)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('admin.audit.export.status', '状态')}
                    </FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t('admin.audit.export.allStatus', '全部状态')}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">
                          {t('admin.audit.export.allStatus', '全部状态')}
                        </SelectItem>
                        {Object.values(AuditStatus).map((status) => (
                          <SelectItem key={status} value={status}>
                            {t(`admin.audit.status.${status}`, status)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="format"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('admin.audit.export.format', '导出格式')}
                    </FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="csv">
                          <div className="flex items-center">
                            <FileSpreadsheet className="mr-2 h-4 w-4" />
                            CSV
                          </div>
                        </SelectItem>
                        <SelectItem value="json">
                          <div className="flex items-center">
                            <FileText className="mr-2 h-4 w-4" />
                            JSON
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleModalClose}
                >
                  {t('common.cancel', '取消')}
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('admin.audit.export.confirm', '导出')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};
