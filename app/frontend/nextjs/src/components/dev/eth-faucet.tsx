'use client'
/**
 * ETH Faucet Component - Web3 Dark Theme
 * Developer tool for sending ETH to addresses via Hardhat
 * Only available to admin users in hardhat environment
 */
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Fuel, Send, RefreshCw, User, AlertTriangle, Loader2 } from 'lucide-react'
import { useAccount } from 'wagmi'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { notification } from '@/lib/notification'
import { devToolsService, type TokenRecipient } from '@/services/dev-tools'
import { useCurrentUser, useNativeBalance } from '@/hooks'

export function EthFaucet() {
  const { t } = useTranslation()
  const { isConnected, address: currentAddress } = useAccount()
  const { isAdmin } = useCurrentUser()
  const { refetch: refetchBalance } = useNativeBalance()
  const [address, setAddress] = useState('')
  const [amount, setAmount] = useState('100')
  const [isSending, setIsSending] = useState(false)
  const [lastResult, setLastResult] = useState<{ old: number; new: number } | null>(null)

  // Recipient list (reuse from dev-tools service)
  const [recipients, setRecipients] = useState<TokenRecipient[]>([])
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(false)

  const fetchRecipients = async () => {
    if (!isAdmin) return
    setIsLoadingRecipients(true)
    try {
      const data = await devToolsService.getTokenRecipients()
      setRecipients(data)
    } catch (err) {
      console.error('Failed to fetch recipients:', err)
    } finally {
      setIsLoadingRecipients(false)
    }
  }

  useEffect(() => {
    if (isAdmin) fetchRecipients()
  }, [isAdmin])

  const handleSend = async () => {
    if (!address || !parseFloat(amount)) return
    setIsSending(true)
    setLastResult(null)
    try {
      const result = await devToolsService.faucet({
        address,
        amount_eth: parseFloat(amount),
      })
      setLastResult({ old: result.old_balance_eth, new: result.new_balance_eth })

      // 如果充值的是当前连接的钱包地址，提示刷新 MetaMask
      const isCurrentUser = address.toLowerCase() === currentAddress?.toLowerCase()
      if (isCurrentUser) {
        notification.success(
          `${t('dev.faucet.success', { amount: result.amount_eth })}。如果 MetaMask 余额未更新，请切换网络后切回。`,
          { duration: 5000 }
        )
      } else {
        notification.success(t('dev.faucet.success', { amount: result.amount_eth }))
      }

      // Refresh wallet balance after faucet success
      await refetchBalance()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('common.error')
      notification.error(message)
    } finally {
      setIsSending(false)
    }
  }

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Fuel className="h-4 w-4 text-primary" />
            {t('dev.faucet.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t('kyc.connectWalletFirst')}</p>
        </CardContent>
      </Card>
    )
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Fuel className="h-4 w-4 text-primary" />
            {t('dev.faucet.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
            <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="font-medium text-yellow-500">{t('dev.mockToken.adminOnly')}</span>
              <span className="text-sm text-muted-foreground">{t('dev.mockToken.adminOnlyDesc')}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Fuel className="h-4 w-4 text-primary" />
          {t('dev.faucet.title')}
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchRecipients}
          disabled={isLoadingRecipients}
        >
          {isLoadingRecipients ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <p className="text-muted-foreground text-sm">{t('dev.faucet.description')}</p>

        {/* Recipient Selection */}
        <div className="flex flex-col gap-2">
          <label className="font-medium text-foreground text-sm flex items-center gap-2">
            <User className="h-4 w-4" />
            {t('dev.faucet.address')}:
          </label>
          <Select
            value={address}
            onValueChange={setAddress}
            disabled={isSending || isLoadingRecipients}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('dev.faucet.addressPlaceholder')} />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {isLoadingRecipients ? (
                <SelectItem value="_loading" disabled>
                  {t('common.loading')}...
                </SelectItem>
              ) : recipients.length === 0 ? (
                <SelectItem value="_empty" disabled>
                  {t('dev.mockToken.noRecipients')}
                </SelectItem>
              ) : (
                recipients.map((r) => (
                  <SelectItem key={r.address} value={r.address}>
                    {r.label}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {/* Manual address input */}
          <Input
            placeholder="0x..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={isSending}
          />
        </div>

        {/* Amount */}
        <div className="flex flex-col gap-2">
          <label className="font-medium text-foreground text-sm">
            {t('dev.faucet.amount')}:
          </label>
          <div className="flex gap-2">
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={0.1}
              max={10000}
              step={1}
              disabled={isSending}
              className="flex-1"
            />
            <Button variant="outline" disabled className="pointer-events-none">
              ETH
            </Button>
          </div>
        </div>

        {/* Result */}
        {lastResult && (
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">{t('dev.faucet.oldBalance')}</span>
                <span className="text-lg font-semibold text-foreground">
                  {lastResult.old.toFixed(4)} <span className="text-sm font-normal">ETH</span>
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">{t('dev.faucet.newBalance')}</span>
                <span className="text-lg font-semibold text-primary">
                  {lastResult.new.toFixed(4)} <span className="text-sm font-normal">ETH</span>
                </span>
              </div>
            </div>
            {/* MetaMask 刷新提示 */}
            <div className="mt-3 pt-3 border-t border-primary/10 text-xs text-yellow-500">
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                如果 MetaMask 仍显示 0 ETH，请点击钱包内的"刷新"按钮，或切换网络后切回 Hardhat
              </span>
            </div>
          </div>
        )}

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={!address || !parseFloat(amount) || parseFloat(amount) <= 0 || isSending}
          className="w-full h-11"
        >
          {isSending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t('dev.faucet.sending')}
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              {t('dev.faucet.sendButton')}
            </>
          )}
        </Button>

        <p className="text-muted-foreground/60 text-xs">{t('dev.faucet.note')}</p>
      </CardContent>
    </Card>
  )
}
