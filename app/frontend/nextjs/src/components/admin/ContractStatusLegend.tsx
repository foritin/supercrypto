/**
 * Contract Status Legend Component
 * 合约状态图例组件 (纯 Provider 模式)
 *
 * 显示注册状态的图例说明
 */
'use client';

import { Space, Tag, Typography } from 'antd';
import { CheckCircleOutlined, ExclamationCircleOutlined, WarningOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

export function ContractStatusLegend() {
  const { t } = useTranslation();

  return (
    <Space size="middle" style={{ marginBottom: 16 }}>
      <Text type="secondary">{t('admin.contracts.status.legendTitle')}:</Text>

      {/* 已同步 */}
      <Tag
        icon={<CheckCircleOutlined />}
        color="success"
        style={{ fontWeight: 500 }}
      >
        {t('admin.contracts.status.synced')}
      </Tag>

      {/* 地址不匹配 */}
      <Tag
        icon={<ExclamationCircleOutlined />}
        color="warning"
        style={{ fontWeight: 500 }}
      >
        {t('admin.contracts.status.mismatch')}
      </Tag>

      {/* 未注册 */}
      <Tag
        icon={<WarningOutlined />}
        color="orange"
        style={{ fontWeight: 500 }}
      >
        {t('admin.contracts.status.notRegistered')}
      </Tag>

      {/* 未部署 */}
      <Tag
        icon={<CloseCircleOutlined />}
        color="error"
        style={{ fontWeight: 500 }}
      >
        {t('admin.contracts.status.notDeployed')}
      </Tag>
    </Space>
  );
}

export default ContractStatusLegend;
