'use client'

import { AlertTriangle, Loader2, RefreshCw, ShieldCheck, UserCog } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCurrentUser } from '@/hooks/use-current-user'
import { notification } from '@/lib/notification'
import { cn, truncateAddress } from '@/lib/utils'
import { adminAccountsService, type AdminAccount } from '@/services/admin-accounts'

function hasAdminRole(account: AdminAccount): boolean {
  return (account.roles || []).some((role) => role.toLowerCase() === 'admin')
}

export function AdminRolePanel() {
  const { t } = useTranslation()
  const { isContractOwner } = useCurrentUser()

  const [accounts, setAccounts] = useState<AdminAccount[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState<string>('')

  const loadAccounts = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await adminAccountsService.listAllAccounts()
      setAccounts(data)
    } catch (error) {
      notification.error((error as Error).message || t('common.error'))
    } finally {
      setIsLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadAccounts()
  }, [loadAccounts])

  const adminAccounts = useMemo(
    () => accounts.filter(hasAdminRole),
    [accounts]
  )

  const nonAdminAccounts = useMemo(
    () => accounts.filter((acc) => !hasAdminRole(acc)),
    [accounts]
  )

  useEffect(() => {
    if (!selectedAddress && nonAdminAccounts.length > 0) {
      setSelectedAddress(nonAdminAccounts[0].address)
    }
    if (selectedAddress && !nonAdminAccounts.some((acc) => acc.address === selectedAddress)) {
      setSelectedAddress(nonAdminAccounts[0]?.address || '')
    }
  }, [nonAdminAccounts, selectedAddress])

  const handleGrantAdmin = async () => {
    if (!isContractOwner || !selectedAddress) return

    const target = nonAdminAccounts.find((acc) => acc.address === selectedAddress)
    if (!target) return

    const nextRoles = Array.from(new Set([...(target.roles || []), 'admin']))

    setIsSaving(true)
    try {
      await adminAccountsService.updateAccountRoles(target.address, nextRoles)
      notification.success(t('dev.adminAccess.grantSuccess', { address: truncateAddress(target.address) }))
      await loadAccounts()
    } catch (error) {
      notification.error((error as Error).message || t('common.error'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <UserCog className="h-4 w-4 text-primary" />
          {t('dev.adminAccess.title')}
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadAccounts()}
          disabled={isLoading || isSaving}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">{t('dev.adminAccess.description')}</p>

        {!isContractOwner && (
          <div className="flex items-start gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
            <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-medium text-yellow-500">{t('dev.adminAccess.viewOnlyTitle')}</div>
              <div className="text-sm text-muted-foreground">{t('dev.adminAccess.viewOnlyDescription')}</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
            <div className="text-xs text-white/60 uppercase tracking-wider">{t('dev.adminAccess.adminUsers')}</div>
            <div className="text-2xl font-semibold text-white mt-1">{adminAccounts.length}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
            <div className="text-xs text-white/60 uppercase tracking-wider">{t('dev.adminAccess.nonAdminUsers')}</div>
            <div className="text-2xl font-semibold text-white mt-1">{nonAdminAccounts.length}</div>
          </div>
        </div>

        <div className={cn('rounded-lg border p-4 space-y-3', isContractOwner ? 'border-primary/30 bg-primary/5' : 'border-white/10 bg-white/[0.02]')}>
          <div className="flex items-center gap-2 text-sm font-medium text-white/90">
            <ShieldCheck className="h-4 w-4 text-primary" />
            {t('dev.adminAccess.grantSectionTitle')}
          </div>

          <div className="flex flex-col md:flex-row gap-2">
            <Select
              value={selectedAddress}
              onValueChange={setSelectedAddress}
              disabled={!isContractOwner || isSaving || isLoading || nonAdminAccounts.length === 0}
            >
              <SelectTrigger className="w-full md:flex-1">
                <SelectValue placeholder={t('dev.adminAccess.selectUser')} />
              </SelectTrigger>
              <SelectContent className="max-h-[280px]">
                {nonAdminAccounts.length === 0 ? (
                  <SelectItem value="_none" disabled>
                    {t('dev.adminAccess.noEligibleUsers')}
                  </SelectItem>
                ) : (
                  nonAdminAccounts.map((acc) => (
                    <SelectItem key={acc.address} value={acc.address}>
                      {truncateAddress(acc.address)}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button
              onClick={handleGrantAdmin}
              disabled={!isContractOwner || !selectedAddress || isSaving || isLoading}
              className="md:w-[180px]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('common.loading')}
                </>
              ) : (
                t('dev.adminAccess.grantButton')
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <div className="text-xs text-white/60 uppercase tracking-wider mb-2">{t('dev.adminAccess.adminList')}</div>
            <div className="max-h-48 overflow-auto space-y-1">
              {adminAccounts.length === 0 ? (
                <div className="text-xs text-white/45">{t('dev.adminAccess.empty')}</div>
              ) : (
                adminAccounts.map((acc) => (
                  <div key={acc.address} className="text-xs text-white/80 font-mono py-1">
                    {truncateAddress(acc.address)}
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <div className="text-xs text-white/60 uppercase tracking-wider mb-2">{t('dev.adminAccess.nonAdminList')}</div>
            <div className="max-h-48 overflow-auto space-y-1">
              {nonAdminAccounts.length === 0 ? (
                <div className="text-xs text-white/45">{t('dev.adminAccess.empty')}</div>
              ) : (
                nonAdminAccounts.map((acc) => (
                  <div key={acc.address} className="text-xs text-white/80 font-mono py-1">
                    {truncateAddress(acc.address)}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
