/**
 * Contract Detail Panel Component
 * 合约详情侧边面板 - Premium UI Design
 */
'use client';

import { useState } from 'react';
import { Drawer, Tag, Button, Space, Typography, Alert, Modal } from 'antd';
import { SyncOutlined, DeleteOutlined, ExclamationCircleOutlined, CopyOutlined, CheckOutlined } from '@ant-design/icons';
import { FileCode2, Clock, Layers, GitBranch } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GraphNode } from '@/services/contract-graph';

const { Text } = Typography;

interface ContractDetailPanelProps {
  open: boolean;
  onClose: () => void;
  node: GraphNode | null;
  onUpdateDependency?: () => void;
  onUnregister?: () => void;
  isRegistering?: boolean;
  isUnregistering?: boolean;
}

// 项目颜色映射
const PROJECT_COLOR_MAP: Record<string, { bg: string; border: string; text: string }> = {
  common: { bg: 'rgba(24, 144, 255, 0.1)', border: 'rgba(24, 144, 255, 0.3)', text: '#1890ff' },
  mock: { bg: 'rgba(250, 173, 20, 0.1)', border: 'rgba(250, 173, 20, 0.3)', text: '#faad14' },
  vanke: { bg: 'rgba(0, 212, 170, 0.1)', border: 'rgba(0, 212, 170, 0.3)', text: '#00D4AA' },
  fake: { bg: 'rgba(0, 212, 170, 0.1)', border: 'rgba(0, 212, 170, 0.3)', text: '#00D4AA' },
};

// 状态颜色映射
const STATUS_COLOR_MAP: Record<string, { bg: string; border: string; text: string }> = {
  ready: { bg: 'rgba(82, 196, 26, 0.1)', border: 'rgba(82, 196, 26, 0.3)', text: '#52c41a' },
  not_deployed: { bg: 'rgba(140, 140, 140, 0.1)', border: 'rgba(140, 140, 140, 0.3)', text: '#8c8c8c' },
  not_registered: { bg: 'rgba(250, 173, 20, 0.1)', border: 'rgba(250, 173, 20, 0.3)', text: '#faad14' },
  missing_deps: { bg: 'rgba(255, 77, 79, 0.1)', border: 'rgba(255, 77, 79, 0.3)', text: '#ff4d4f' },
};

export function ContractDetailPanel({
  open,
  onClose,
  node,
  onUpdateDependency,
  onUnregister,
  isRegistering = false,
  isUnregistering = false,
}: ContractDetailPanelProps) {
  const { t } = useTranslation();
  const [unregisterModalOpen, setUnregisterModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!node) return null;

  const hasIssue = node.status === 'not_registered' || node.status === 'missing_deps';
  const isNotDeployed = node.status === 'not_deployed';
  const isReady = node.status === 'ready';
  const isAddressProvider = node.id === 'AddressProvider' || node.label === 'AddressProvider';
  const canUnregister = isReady && node.isRegistered && onUnregister && !isAddressProvider;

  const handleUnregisterConfirm = () => {
    setUnregisterModalOpen(false);
    onUnregister?.();
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(node.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getProjectLabel = (project: string): string => {
    return t(`admin.contracts.filters.${project}`) || project;
  };

  const getContractTypeLabel = (type: string): string => {
    if (type === 'common') return t('admin.contracts.filters.commonType');
    if (type === 'mock') return t('admin.contracts.filters.mockType');
    return t('admin.contracts.filters.exclusive');
  };

  const statusColors = STATUS_COLOR_MAP[node.status] || STATUS_COLOR_MAP.not_deployed;
  const projectColors = PROJECT_COLOR_MAP[node.project] || PROJECT_COLOR_MAP.common;

  return (
    <>
      <Drawer
        title={null}
        placement="right"
        width={480}
        onClose={onClose}
        open={open}
        closable={false}
        rootStyle={{ zIndex: 2147483648 }}
        styles={{
          body: { padding: 0 },
          header: { display: 'none' },
          wrapper: { 
            zIndex: 2147483648,
            background: 'linear-gradient(180deg, rgba(10, 10, 15, 0.98) 0%, rgba(15, 15, 22, 0.98) 100%)',
          },
        }}
      >
        {/* 顶部渐变装饰 */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 200,
          background: `linear-gradient(180deg, ${statusColors.bg} 0%, transparent 100%)`,
          pointerEvents: 'none',
        }} />

        {/* 头部区域 */}
        <div style={{
          position: 'relative',
          padding: '24px 24px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        }}>
          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              width: 32,
              height: 32,
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'rgba(255, 255, 255, 0.6)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            ✕
          </button>

          {/* 图标和标题 */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: `linear-gradient(135deg, ${statusColors.bg} 0%, rgba(255, 255, 255, 0.02) 100%)`,
              border: `1px solid ${statusColors.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <FileCode2 size={28} style={{ color: statusColors.text }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 600,
                color: '#fff',
                marginBottom: 8,
              }}>
                {node.label}
              </h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 500,
                  background: statusColors.bg,
                  border: `1px solid ${statusColors.border}`,
                  color: statusColors.text,
                }}>
                  {t(`admin.contracts.status.${node.status}`)}
                </span>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 500,
                  background: projectColors.bg,
                  border: `1px solid ${projectColors.border}`,
                  color: projectColors.text,
                }}>
                  {getProjectLabel(node.project)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 内容区域 */}
        <div style={{ padding: 24, position: 'relative' }}>
          {/* 状态警告 */}
          {hasIssue && (
            <Alert
              message={node.status === 'not_registered'
                ? t('admin.contracts.detail.notRegisteredWarning')
                : t('admin.contracts.detail.missingDepsWarning')}
              description={node.status === 'not_registered'
                ? t('admin.contracts.detail.notRegisteredDesc')
                : t('admin.contracts.detail.missingDepsDesc')}
              type="warning"
              showIcon
              style={{ marginBottom: 20, borderRadius: 12 }}
            />
          )}

          {/* 信息卡片 */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: 16,
            overflow: 'hidden',
          }}>
            {/* 合约地址 */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}>
                <span style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.45)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {t('admin.contracts.detail.contractAddress')}
                </span>
                <button
                  onClick={handleCopyAddress}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: copied ? '#52c41a' : 'rgba(255, 255, 255, 0.45)',
                    cursor: 'pointer',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12,
                  }}
                >
                  {copied ? <CheckOutlined /> : <CopyOutlined />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <code style={{
                display: 'block',
                fontSize: 13,
                fontFamily: 'JetBrains Mono, Monaco, monospace',
                color: 'rgba(255, 255, 255, 0.85)',
                wordBreak: 'break-all',
                lineHeight: 1.5,
              }}>
                {node.address}
              </code>
            </div>

            {/* 其他信息 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              <InfoItem
                icon={<Layers size={16} />}
                label={t('admin.contracts.detail.contractType')}
                value={getContractTypeLabel(node.type)}
              />
              <InfoItem
                icon={<GitBranch size={16} />}
                label={t('admin.contracts.detail.dependencyStatus')}
                value={t(`admin.contracts.status.${node.status}`)}
                valueColor={statusColors.text}
              />
              <InfoItem
                icon={<Clock size={16} />}
                label={t('admin.contracts.detail.deployedAt')}
                value={node.deployedAt ? new Date(node.deployedAt).toLocaleString() : '-'}
                span={2}
              />
            </div>
          </div>

          {/* 操作按钮 */}
          <div style={{ marginTop: 24 }}>
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              {hasIssue && node.status === 'not_registered' && onUpdateDependency && (
                <Button
                  type="primary"
                  icon={<SyncOutlined spin={isRegistering} />}
                  onClick={onUpdateDependency}
                  loading={isRegistering}
                  block
                  size="large"
                  style={{ height: 48, borderRadius: 12, fontWeight: 500 }}
                >
                  {isRegistering
                    ? t('admin.contracts.detail.registering')
                    : t('admin.contracts.detail.registerToProvider')}
                </Button>
              )}

              {canUnregister && (
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => setUnregisterModalOpen(true)}
                  loading={isUnregistering}
                  block
                  size="large"
                  style={{ height: 48, borderRadius: 12, fontWeight: 500 }}
                  disabled={isRegistering}
                >
                  {isUnregistering
                    ? t('admin.contracts.unregister.unregistering', '解除注册中...')
                    : t('admin.contracts.unregister.button', '解除注册')}
                </Button>
              )}

              <Button 
                onClick={onClose} 
                block 
                size="large"
                style={{ 
                  height: 48, 
                  borderRadius: 12, 
                  fontWeight: 500,
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                }}
                disabled={isRegistering || isUnregistering}
              >
                {t('admin.contracts.detail.close')}
              </Button>
            </Space>
          </div>
        </div>
      </Drawer>

      {/* 解除注册确认对话框 */}
      <Modal
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#faad14' }} />
            {t('admin.contracts.unregister.confirmTitle', '确认解除注册')}
          </Space>
        }
        open={unregisterModalOpen}
        onOk={handleUnregisterConfirm}
        onCancel={() => setUnregisterModalOpen(false)}
        okText={t('admin.contracts.unregister.confirm', '确认解除注册')}
        cancelText={t('admin.contracts.unregister.cancel', '取消')}
        okButtonProps={{ danger: true }}
        zIndex={2147483649}
      >
        <Alert
          type="warning"
          showIcon
          message={t('admin.contracts.unregister.warning', '警告：此操作将解除合约注册')}
          description={t(
            'admin.contracts.unregister.warningDesc',
            '您即将解除注册合约 {{name}}。此操作会将 AddressProvider 中的地址设置为零地址。',
            { name: node?.label }
          )}
          style={{ marginBottom: 16 }}
        />
        <Typography.Text type="secondary">
          {t('admin.contracts.unregister.warningNote', '解除注册后，依赖此合约的其他合约可能无法正常工作。')}
        </Typography.Text>
      </Modal>
    </>
  );
}

// 信息项组件
function InfoItem({ 
  icon, 
  label, 
  value, 
  valueColor,
  span = 1 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string;
  valueColor?: string;
  span?: number;
}) {
  return (
    <div style={{
      padding: '16px 20px',
      borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
      borderRight: span === 1 ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
      gridColumn: span === 2 ? '1 / -1' : undefined,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
        color: 'rgba(255, 255, 255, 0.45)',
      }}>
        {icon}
        <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {label}
        </span>
      </div>
      <div style={{ 
        fontSize: 14, 
        fontWeight: 500, 
        color: valueColor || 'rgba(255, 255, 255, 0.85)',
      }}>
        {value}
      </div>
    </div>
  );
}

export default ContractDetailPanel;
