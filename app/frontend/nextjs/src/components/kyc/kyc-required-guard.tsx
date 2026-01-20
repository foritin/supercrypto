'use client'
/**
 * KYC Required Guard Component
 * Wraps content that requires KYC verification
 */
import { ReactNode } from 'react'
import { Modal, Button, Result, Spin } from 'antd'
import { SafetyCertificateOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useAccount } from 'wagmi'
import { useKycStatus } from '@/hooks/use-kyc-status'

interface KycRequiredGuardProps {
  children: ReactNode
  /**
   * What to show when KYC is not approved
   * - 'modal': Show a modal overlay (default)
   * - 'inline': Show inline message
   * - 'redirect': Redirect to KYC page (requires onRedirect)
   */
  mode?: 'modal' | 'inline' | 'redirect'
  /**
   * Callback when user clicks "Go to KYC"
   */
  onStartKyc?: () => void
  /**
   * Custom title for the KYC required message
   */
  title?: string
  /**
   * Custom description for the KYC required message
   */
  description?: string
}

export function KycRequiredGuard({
  children,
  mode = 'modal',
  onStartKyc,
  title,
  description,
}: KycRequiredGuardProps) {
  const { t } = useTranslation()
  const { isConnected } = useAccount()
  const { isLoading, isApproved, status } = useKycStatus()

  // Loading state
  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin size="large" />
      </div>
    )
  }

  // Not connected - show the content but it won't work
  if (!isConnected) {
    return <>{children}</>
  }

  // KYC approved - show content
  if (isApproved) {
    return <>{children}</>
  }

  // KYC not approved - show guard
  const kycMessage = (
    <Result
      icon={<SafetyCertificateOutlined style={{ color: 'var(--color-warning)' }} />}
      title={title || t('kyc.guard.title')}
      subTitle={description || t('kyc.guard.description')}
      extra={
        <Button
          type="primary"
          icon={<ArrowRightOutlined />}
          onClick={onStartKyc}
        >
          {t('kyc.guard.startButton')}
        </Button>
      }
    />
  )

  if (mode === 'inline') {
    return kycMessage
  }

  // Modal mode
  return (
    <>
      {children}
      <Modal
        open={true}
        footer={null}
        closable={false}
        centered
        maskClosable={false}
        width={480}
      >
        {kycMessage}
      </Modal>
    </>
  )
}

/**
 * Hook to check if KYC is required before action
 */
export function useKycRequired() {
  const { isConnected } = useAccount()
  const { isApproved, status, isLoading } = useKycStatus()
  
  return {
    isKycRequired: isConnected && !isApproved && !isLoading,
    isKycApproved: isApproved,
    isLoading,
    status,
  }
}

