'use client'

import { ShieldAlert } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { clearAuthData } from '@/utils/auth'

type ReauthEventDetail = {
  message?: string
}

export function AuthReloginDialog() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [reasonMessage, setReasonMessage] = useState<string | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)

  const handleReauthRequired = useCallback((event: Event) => {
    const customEvent = event as CustomEvent<ReauthEventDetail>
    setReasonMessage(customEvent.detail?.message || null)
    setIsConfirming(false)
    setOpen(true)
  }, [])

  useEffect(() => {
    window.addEventListener('auth:reauth-required', handleReauthRequired)
    return () => window.removeEventListener('auth:reauth-required', handleReauthRequired)
  }, [handleReauthRequired])

  const handleConfirm = useCallback(() => {
    if (isConfirming) return
    setIsConfirming(true)

    const message = reasonMessage || t('auth.sessionExpired')
    clearAuthData()
    window.dispatchEvent(new CustomEvent('auth:logout', { detail: { message } }))
    setOpen(false)

    if (window.location.pathname !== '/') {
      window.location.href = '/'
      return
    }

    setIsConfirming(false)
  }, [isConfirming, reasonMessage, t])

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setOpen(true)
        }
      }}
    >
      <DialogContent
        className="sm:max-w-[460px]"
        hideCloseButton
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <ShieldAlert className="h-5 w-5 text-gold" />
            {t('auth.reauthTitle')}
          </DialogTitle>
          <DialogDescription className="text-white/70">
            {reasonMessage || t('auth.reauthDescription')}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" className="min-w-[150px]" onClick={handleConfirm} disabled={isConfirming}>
            {isConfirming ? t('common.loading') : t('auth.reauthConfirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
