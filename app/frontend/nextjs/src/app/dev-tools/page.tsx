'use client'

import { Wrench, Zap, DollarSign, Fuel, AlertTriangle, UserCog } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { RequireAdmin } from '@/components/auth'
import { AdminRolePanel } from '@/components/dev/admin-role-panel'
import { EthFaucet } from '@/components/dev/eth-faucet'
import { MockTokenMint } from '@/components/dev/mock-token-mint'
import { QuickKycPanel } from '@/components/dev/quick-kyc-panel'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export default function DevToolsPage() {
  const { t } = useTranslation()

  return (
    <RequireAdmin>
      <div className="max-w-[1200px] mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-2 flex items-center gap-3">
            <Wrench className="h-6 w-6" />
            {t('dev.title')}
          </h2>
          <p className="text-white/65">
            {t('dev.subtitle')}
          </p>
        </div>

        {/* Warning */}
        <Alert variant="warning" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('dev.warning')}</AlertTitle>
          <AlertDescription>{t('dev.warningDescription')}</AlertDescription>
        </Alert>

        {/* Tools */}
        <Card>
          <CardContent className="p-6">
            <Tabs defaultValue="kyc">
              <TabsList className="mb-4">
                <TabsTrigger value="kyc" className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  {t('dev.kyc.title')}
                </TabsTrigger>
                <TabsTrigger value="token" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  {t('dev.mockToken.title')}
                </TabsTrigger>
                <TabsTrigger value="faucet" className="flex items-center gap-2">
                  <Fuel className="h-4 w-4" />
                  {t('dev.faucet.title')}
                </TabsTrigger>
                <TabsTrigger value="admin-access" className="flex items-center gap-2">
                  <UserCog className="h-4 w-4" />
                  {t('dev.adminAccess.title')}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="kyc">
                <QuickKycPanel />
              </TabsContent>
              
              <TabsContent value="token">
                <MockTokenMint />
              </TabsContent>
              
              <TabsContent value="faucet">
                <EthFaucet />
              </TabsContent>

              <TabsContent value="admin-access">
                <AdminRolePanel />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </RequireAdmin>
  )
}
