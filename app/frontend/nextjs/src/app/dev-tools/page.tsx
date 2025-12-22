'use client'

import { Typography, Card, Space, Alert, Tabs } from 'antd'
import { 
  ToolOutlined, 
  ThunderboltOutlined, 
  DollarOutlined,
  DeleteOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { RequireAdmin } from '@/components/auth'
import { QuickKycPanel } from '@/components/dev/quick-kyc-panel'
import { MockTokenMint } from '@/components/dev/mock-token-mint'
import { DataResetPanel } from '@/components/dev/data-reset-panel'

const { Title, Text } = Typography

// Environment check - only show dev tools in local/test environment
const ENV = process.env.NEXT_PUBLIC_ENV || 'local'
const IS_DEV_ENV = ENV === 'local' || ENV === 'test'

export default function DevToolsPage() {
  const { t } = useTranslation()

  // 非开发环境直接返回不可用提示
  if (!IS_DEV_ENV) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '60px 24px' }}>
        <Alert
          type="error"
          message={t('dev.notAvailable')}
          description={t('dev.notAvailableDescription')}
        />
      </div>
    )
  }

  const tabItems = [
    {
      key: 'kyc',
      label: (
        <Space>
          <ThunderboltOutlined />
          {t('dev.quickKyc.title')}
        </Space>
      ),
      children: <QuickKycPanel />,
    },
    {
      key: 'token',
      label: (
        <Space>
          <DollarOutlined />
          {t('dev.mockToken.title')}
        </Space>
      ),
      children: <MockTokenMint />,
    },
    {
      key: 'reset',
      label: (
        <Space>
          <DeleteOutlined />
          {t('dev.dataReset.title')}
        </Space>
      ),
      children: <DataResetPanel />,
    },
  ]

  return (
    <RequireAdmin>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Page Header */}
        <div style={{ marginBottom: 32 }}>
          <Title level={2} style={{ marginBottom: 8 }}>
            <ToolOutlined style={{ marginRight: 12 }} />
            {t('dev.title')}
          </Title>
          <Text style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
            {t('dev.subtitle')}
          </Text>
        </div>

        {/* Warning */}
        <Alert
          type="warning"
          message={t('dev.warning')}
          description={t('dev.warningDescription', { env: ENV })}
          style={{ marginBottom: 24 }}
          showIcon
        />

        {/* Tools */}
        <Card>
          <Tabs items={tabItems} defaultActiveKey="kyc" />
        </Card>
      </div>
    </RequireAdmin>
  )
}
