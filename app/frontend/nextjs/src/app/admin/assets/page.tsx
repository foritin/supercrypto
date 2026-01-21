'use client'

import { useTranslation } from 'react-i18next'
import { AssetAdminList } from '@/components/admin/asset-admin-list'
import { RequireAdmin } from '@/components/auth'

export default function AdminAssetsPage() {
  const { t } = useTranslation()

  return (
    <RequireAdmin>
      <div className="max-w-[1400px] mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold tracking-tight mb-2">
            {t('admin.assets.title')}
          </h2>
          <p className="text-muted-foreground">
            {t('admin.assets.subtitle')}
          </p>
        </div>

        {/* Asset Management - AssetAdminList 内部已有 Card 包裹 */}
        <AssetAdminList />
      </div>
    </RequireAdmin>
  )
}
