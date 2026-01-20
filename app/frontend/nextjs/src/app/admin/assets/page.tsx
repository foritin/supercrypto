'use client'

import { Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { AssetAdminList } from '@/components/admin/asset-admin-list'
import { RequireAdmin } from '@/components/auth'

const { Title, Text } = Typography

export default function AdminAssetsPage() {
  const { t } = useTranslation()

  return (
    <RequireAdmin>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        {/* Page Header */}
        <div style={{ marginBottom: 32 }}>
          <Title level={2} style={{ marginBottom: 8 }}>
            {t('admin.assets.title')}
          </Title>
          <Text style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
            {t('admin.assets.subtitle')}
          </Text>
        </div>

        {/* Asset Management - AssetAdminList 内部已有 Card 包裹 */}
        <AssetAdminList />
      </div>
    </RequireAdmin>
  )
}
