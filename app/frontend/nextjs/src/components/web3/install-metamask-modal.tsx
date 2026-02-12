'use client'

import { useTranslation } from 'react-i18next'
import { Download, Chrome, Flame, Shield, Info } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'

interface InstallMetaMaskModalProps {
  open: boolean
  onClose: () => void
}

// MetaMask official download links
const METAMASK_DOWNLOAD_URL = 'https://metamask.io/download/'
const METAMASK_CHROME_URL = 'https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn'
const METAMASK_FIREFOX_URL = 'https://addons.mozilla.org/en-US/firefox/addon/ether-metamask/'

export function InstallMetaMaskModal({ open, onClose }: InstallMetaMaskModalProps) {
  const { t } = useTranslation()

  // Detect browser type
  const isChrome = typeof navigator !== 'undefined' && /Chrome/.test(navigator.userAgent) && !/Edge/.test(navigator.userAgent)
  const isFirefox = typeof navigator !== 'undefined' && /Firefox/.test(navigator.userAgent)

  // Get recommended download link based on browser
  const getRecommendedUrl = () => {
    if (isChrome) return METAMASK_CHROME_URL
    if (isFirefox) return METAMASK_FIREFOX_URL
    return METAMASK_DOWNLOAD_URL
  }

  const handleInstall = () => {
    window.open(getRecommendedUrl(), '_blank', 'noopener,noreferrer')
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"
              alt="MetaMask"
              className="w-6 h-6"
            />
            <span>{t('metamask.install.title')}</span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t('metamask.install.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Info Alert */}
          <Alert variant="info">
            <Info className="h-4 w-4" />
            <AlertTitle>{t('metamask.install.required')}</AlertTitle>
            <AlertDescription>
              {t('metamask.install.description')}
            </AlertDescription>
          </Alert>

          {/* Installation Steps */}
          <div>
            <h5 className="text-sm font-semibold mb-2">{t('metamask.install.steps.title')}</h5>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <p>
                <span className="font-semibold text-foreground">1.</span> {t('metamask.install.steps.step1')}
              </p>
              <p>
                <span className="font-semibold text-foreground">2.</span> {t('metamask.install.steps.step2')}
              </p>
              <p>
                <span className="font-semibold text-foreground">3.</span> {t('metamask.install.steps.step3')}
              </p>
              <p>
                <span className="font-semibold text-foreground">4.</span> {t('metamask.install.steps.step4')}
              </p>
            </div>
          </div>

          {/* Browser Download Buttons */}
          <div>
            <h5 className="text-sm font-semibold mb-2">{t('metamask.install.browsers')}</h5>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a
                  href={METAMASK_CHROME_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2"
                >
                  <Chrome className="h-4 w-4" />
                  {t('metamask.install.chrome')}
                </a>
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a
                  href={METAMASK_FIREFOX_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2"
                >
                  <Flame className="h-4 w-4" />
                  {t('metamask.install.firefox')}
                </a>
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a
                  href={METAMASK_DOWNLOAD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t('metamask.install.other')}
                </a>
              </Button>
            </div>
          </div>

          {/* Security Warning */}
          <Alert variant="warning">
            <Shield className="h-4 w-4" />
            <AlertTitle>{t('metamask.install.security.title')}</AlertTitle>
            <AlertDescription>
              <span className="block">{t('metamask.install.security.tip1')}</span>
              <span className="block">{t('metamask.install.security.tip2')}</span>
            </AlertDescription>
          </Alert>

          {/* Official Site Link */}
          <p className="text-xs text-muted-foreground">
            {t('metamask.install.officialSite')}
            <a
              href="https://metamask.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline ml-1"
            >
              https://metamask.io
            </a>
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('metamask.install.installLater')}
          </Button>
          <Button onClick={handleInstall}>
            <Download className="h-4 w-4" />
            {t('metamask.install.goToInstall')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
