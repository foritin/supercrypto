'use client'

import { useTranslation } from 'react-i18next'
import { Wrench, Zap, DollarSign, Trash2, AlertTriangle, XCircle } from 'lucide-react'
import { RequireAdmin } from '@/components/auth'
import { QuickKycPanel } from '@/components/dev/quick-kyc-panel'
import { MockTokenMint } from '@/components/dev/mock-token-mint'
import { DataResetPanel } from '@/components/dev/data-reset-panel'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

// Environment check - only show dev tools in local/test environment
const ENV = process.env.NEXT_PUBLIC_ENV || 'local'
const IS_DEV_ENV = ENV === 'local' || ENV === 'test'

export default function DevToolsPage() {
  const { t } = useTranslation()

  // 非开发环境直接返回不可用提示
  if (!IS_DEV_ENV) {
    return (
      <div className="max-w-[800px] mx-auto py-[60px] px-6">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>{t('dev.notAvailable')}</AlertTitle>
          <AlertDescription>{t('dev.notAvailableDescription')}</AlertDescription>
        </Alert>
      </div>
    )
  }

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
          <AlertDescription>{t('dev.warningDescription', { env: ENV })}</AlertDescription>
        </Alert>

        {/* Tools */}
        <Card>
          <CardContent className="p-6">
            <Tabs defaultValue="kyc">
              <TabsList className="mb-4">
                <TabsTrigger value="kyc" className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  {t('dev.quickKyc.title')}
                </TabsTrigger>
                <TabsTrigger value="token" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  {t('dev.mockToken.title')}
                </TabsTrigger>
                <TabsTrigger value="reset" className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  {t('dev.dataReset.title')}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="kyc">
                <QuickKycPanel />
              </TabsContent>
              
              <TabsContent value="token">
                <MockTokenMint />
              </TabsContent>
              
              <TabsContent value="reset">
                <DataResetPanel />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </RequireAdmin>
  )
}
