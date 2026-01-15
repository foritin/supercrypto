/**
 * Contract Detail Panel Component
 * 合约详情侧边面板
 *
 * 显示选中合约的详细信息和依赖状态
 */
'use client';

import { Drawer, Descriptions, Tag, Button, Space, Typography, Alert } from 'antd';
import { SyncOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { GraphNode } from '@/services/contract-graph';

const { Text, Title } = Typography;

interface ContractDetailPanelProps {
  open: boolean;
  onClose: () => void;
  node: GraphNode | null;
  onUpdateDependency?: () => void;
}

// 项目颜色映射
const PROJECT_COLOR_MAP: Record<string, string> = {
  common: 'blue',
  mock: 'orange',
  vanke: 'green',
  fake: 'green',
};

export function ContractDetailPanel({
  open,
  onClose,
  node,
  onUpdateDependency,
}: ContractDetailPanelProps) {
  const { t } = useTranslation();

  if (!node) return null;

  const needsUpdate = node.status === 'needs_update';

  // 项目标签映射 - 使用翻译
  const getProjectLabel = (project: string): string => {
    return t(`admin.contracts.filters.${project}`) || project;
  };

  // 合约类型映射
  const getContractTypeLabel = (type: string): string => {
    if (type === 'common') return t('admin.contracts.filters.commonType');
    if (type === 'mock') return t('admin.contracts.filters.mockType');
    return t('admin.contracts.filters.exclusive');
  };

  return (
    <Drawer
      title={null}
      placement="right"
      size={400}
      open={open}
      onClose={onClose}
      closable={false}
      styles={{
        body: { padding: 0 },
        header: { display: 'none' },
      }}
    >
      <div style={{ padding: 24 }}>
        {/* 头部 */}
        <Space orientation="vertical" style={{ width: '100%', marginBottom: 16 }}>
          <Space>
            <Title level={4} style={{ margin: 0 }}>
              {node.label}
            </Title>
            {needsUpdate && <Tag color="error">{t('admin.contracts.status.needs_update')}</Tag>}
          </Space>
          <Text type="secondary">{t('admin.contracts.detail.title')}</Text>
        </Space>

        {/* 状态警告 */}
        {needsUpdate && (
          <Alert
            message={t('admin.contracts.detail.needsUpdateWarning')}
            description={t('admin.contracts.detail.needsUpdateDesc')}
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* 合约信息 */}
        <Descriptions
          column={1}
          size="small"
          bordered
          style={{ marginBottom: 16 }}
        >
          <Descriptions.Item label={t('admin.contracts.detail.contractName')}>
            {node.label}
          </Descriptions.Item>
          <Descriptions.Item label={t('admin.contracts.detail.contractAddress')}>
            <Text copyable style={{ fontFamily: 'monospace' }}>
              {node.address}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label={t('admin.contracts.detail.projectType')}>
            <Tag color={PROJECT_COLOR_MAP[node.project] || 'default'}>
              {getProjectLabel(node.project)}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label={t('admin.contracts.detail.contractType')}>
            <Tag>{getContractTypeLabel(node.type)}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label={t('admin.contracts.detail.dependencyStatus')}>
            <Tag color={needsUpdate ? 'error' : 'success'}>
              {needsUpdate ? t('admin.contracts.status.needs_update') : t('admin.contracts.status.synced')}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label={t('admin.contracts.detail.deployedAt')}>
            {node.deployedAt
              ? new Date(node.deployedAt).toLocaleString()
              : '-'}
          </Descriptions.Item>
        </Descriptions>

        {/* 操作按钮 */}
        {needsUpdate && onUpdateDependency && (
          <Button
            type="primary"
            icon={<SyncOutlined />}
            onClick={onUpdateDependency}
            block
          >
            {t('admin.contracts.detail.updateDependency')}
          </Button>
        )}

        {/* 关闭按钮 */}
        <Button onClick={onClose} style={{ marginTop: 12 }} block>
          {t('admin.contracts.detail.close')}
        </Button>
      </div>
    </Drawer>
  );
}

export default ContractDetailPanel;
