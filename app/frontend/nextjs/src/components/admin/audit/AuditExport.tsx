/**
 * AuditExport Component
 * 审计日志导出组件
 */
'use client';

import React, { useState } from 'react';
import { Button, Dropdown, message, Modal, Form, DatePicker, Select, Space } from 'antd';
import { DownloadOutlined, FileExcelOutlined, FileTextOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { MenuProps } from 'antd';
import type { Dayjs } from 'dayjs';
import { exportAuditLogs, AuditCategory, AuditStatus } from '@/services/audit';

const { RangePicker } = DatePicker;

interface AuditExportProps {
  currentFilters?: {
    category?: AuditCategory;
    status?: AuditStatus;
    start_time?: string;
    end_time?: string;
  };
}

type ExportFormat = 'csv' | 'json';

export const AuditExport: React.FC<AuditExportProps> = ({ currentFilters }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [form] = Form.useForm();

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
      
      message.success(t('admin.audit.export.success', '导出成功'));
    } catch (error) {
      message.error(t('admin.audit.export.failed', '导出失败'));
      console.error('Export failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // 自定义导出
  const handleCustomExport = async (values: {
    dateRange?: [Dayjs, Dayjs];
    category?: AuditCategory;
    status?: AuditStatus;
    format: ExportFormat;
  }) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      
      if (values.dateRange) {
        params.start_time = values.dateRange[0].toISOString();
        params.end_time = values.dateRange[1].toISOString();
      }
      if (values.category && values.category !== ('all' as any)) {
        params.category = values.category;
      }
      if (values.status && values.status !== ('all' as any)) {
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
      
      message.success(t('admin.audit.export.success', '导出成功'));
      setModalOpen(false);
      form.resetFields();
    } catch (error) {
      message.error(t('admin.audit.export.failed', '导出失败'));
      console.error('Export failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // 下拉菜单项
  const menuItems: MenuProps['items'] = [
    {
      key: 'csv',
      icon: <FileExcelOutlined />,
      label: t('admin.audit.export.exportCsv', '导出 CSV'),
      onClick: () => handleQuickExport('csv'),
    },
    {
      key: 'json',
      icon: <FileTextOutlined />,
      label: t('admin.audit.export.exportJson', '导出 JSON'),
      onClick: () => handleQuickExport('json'),
    },
    {
      type: 'divider',
    },
    {
      key: 'custom',
      label: t('admin.audit.export.customExport', '自定义导出...'),
      onClick: () => setModalOpen(true),
    },
  ];

  return (
    <>
      <Dropdown menu={{ items: menuItems }} trigger={['click']}>
        <Button icon={<DownloadOutlined />} loading={loading}>
          {t('admin.audit.export.button', '导出')}
        </Button>
      </Dropdown>

      {/* 自定义导出弹窗 */}
      <Modal
        title={t('admin.audit.export.customTitle', '自定义导出')}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={loading}
        okText={t('admin.audit.export.confirm', '导出')}
        cancelText={t('common.cancel', '取消')}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCustomExport}
          initialValues={{ format: 'csv' }}
        >
          <Form.Item
            name="dateRange"
            label={t('admin.audit.export.dateRange', '时间范围')}
          >
            <RangePicker
              style={{ width: '100%' }}
              placeholder={[
                t('admin.audit.export.startDate', '开始日期'),
                t('admin.audit.export.endDate', '结束日期'),
              ]}
            />
          </Form.Item>

          <Form.Item
            name="category"
            label={t('admin.audit.export.category', '类别')}
          >
            <Select
              placeholder={t('admin.audit.export.allCategories', '全部类别')}
              allowClear
            >
              <Select.Option value="all">
                {t('admin.audit.export.allCategories', '全部类别')}
              </Select.Option>
              {Object.values(AuditCategory).map((cat) => (
                <Select.Option key={cat} value={cat}>
                  {t(`admin.audit.category.${cat}`, cat)}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="status"
            label={t('admin.audit.export.status', '状态')}
          >
            <Select
              placeholder={t('admin.audit.export.allStatus', '全部状态')}
              allowClear
            >
              <Select.Option value="all">
                {t('admin.audit.export.allStatus', '全部状态')}
              </Select.Option>
              {Object.values(AuditStatus).map((status) => (
                <Select.Option key={status} value={status}>
                  {t(`admin.audit.status.${status}`, status)}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="format"
            label={t('admin.audit.export.format', '导出格式')}
            rules={[{ required: true }]}
          >
            <Select>
              <Select.Option value="csv">
                <Space>
                  <FileExcelOutlined />
                  CSV
                </Space>
              </Select.Option>
              <Select.Option value="json">
                <Space>
                  <FileTextOutlined />
                  JSON
                </Space>
              </Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};
