/**
 * Contract Status Legend Component
 * 合约状态图例组件
 *
 * 显示三种部署状态的图例说明
 */
'use client';

import { Space, Tag, Typography } from 'antd';
import { CheckCircleOutlined, ExclamationCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

export function ContractStatusLegend() {
  const { t } = useTranslation();

  return (
    <Space size="middle" style={{ marginBottom: 16 }}>
      <Text type="secondary">{t('admin.contracts.status.legendTitle')}:</Text>

      {/* 已部署且已绑定 */}
      <Tag
        icon={<CheckCircleOutlined />}
        color="success"
        style={{ fontWeight: 500 }}
      >
        {t('admin.contracts.status.deployedAndBinded')}
      </Tag>

      {/* 已部署但需绑定 */}
      <Tag
        icon={<ExclamationCircleOutlined />}
        color="warning"
        style={{ fontWeight: 500 }}
      >
        {t('admin.contracts.status.deployedNeedsBinding')}
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
