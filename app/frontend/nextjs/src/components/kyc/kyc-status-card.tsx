'use client'
/**
 * KYC Status Card Component
 * Displays the current KYC status and provides actions
 */
import { Card, Button, Badge, Space, Flex, Typography, Spin, Alert, Result } from 'antd'
import { 
  SafetyCertificateOutlined, 
  ClockCircleOutlined, 
  CloseCircleOutlined,
  ArrowRightOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useAccount } from 'wagmi'
import { useKycStatus, useKycApply, getKycStatusInfo } from '@/hooks/use-kyc-status'
import { KycStatus } from '@/services/kyc'
import { useRouter } from 'next/navigation'

const { Title, Text, Paragraph } = Typography

interface KycStatusCardProps {
  onStartKyc?: () => void
}

export function KycStatusCard({ onStartKyc }: KycStatusCardProps) {
  const { t } = useTranslation()
  const { isConnected } = useAccount()
  const { data: kycData, isLoading, isError, refetch, status } = useKycStatus()
  const { mutate: applyKyc, isPending: isApplying } = useKycApply()
  const router = useRouter()
  
  const statusInfo = getKycStatusInfo(status)

  // Not connected - show connect wallet message
  if (!isConnected) {
    return (
      <Card>
        <Result
          icon={<SafetyCertificateOutlined style={{ color: '#d9d9d9' }} />}
          title={t('kyc.connectWalletFirst')}
          subTitle={t('kyc.connectWalletDescription')}
        />
      </Card>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
          <Paragraph style={{ marginTop: 16 }}>{t('common.loading')}</Paragraph>
        </div>
      </Card>
    )
  }

  // Error state
  if (isError) {
    return (
      <Card>
        <Alert
          type="error"
          message={t('kyc.error.loadFailed')}
          action={
            <Button size="small" icon={<ReloadOutlined />} onClick={() => refetch()}>
              {t('common.retry')}
            </Button>
          }
        />
      </Card>
    )
  }

  // Handle start KYC
  const handleStartKyc = () => {
    if (onStartKyc) {
      onStartKyc()
    } else {
      applyKyc({}, {
        onSuccess: () => {
          // 引导跳转第三方 KYC（MVP：占位外链或路由）
          router.push('/kyc/start')
        },
      })
    }
  }

  // Render based on status
  const renderContent = () => {
    switch (status) {
      case KycStatus.APPROVED:
        return (
          <Result
            status="success"
            icon={<SafetyCertificateOutlined style={{ color: '#52c41a' }} />}
            title={t('kyc.approved.title')}
            subTitle={
              <Flex vertical gap={8}>
                <Text>{t('kyc.approved.description')}</Text>
                {kycData?.reviewed_at && (
                  <Text type="secondary">
                    {t('kyc.approved.date', { date: new Date(kycData.reviewed_at).toLocaleDateString() })}
                  </Text>
                )}
                {kycData?.is_accredited && (
                  <Badge status="success" text={t('kyc.accreditedInvestor')} />
                )}
              </Flex>
            }
          />
        )

      case KycStatus.PENDING:
        return (
          <Result
            icon={<ClockCircleOutlined style={{ color: '#1677ff' }} />}
            title={t('kyc.pending.title')}
            subTitle={
              <Flex vertical gap={8}>
                <Text>{t('kyc.pending.description')}</Text>
                {kycData?.submitted_at && (
                  <Text type="secondary">
                    {t('kyc.pending.submitted', { date: new Date(kycData.submitted_at).toLocaleDateString() })}
                  </Text>
                )}
              </Flex>
            }
            extra={
              <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
                {t('kyc.pending.refresh')}
              </Button>
            }
          />
        )

      case KycStatus.REJECTED:
        return (
          <Result
            status="error"
            icon={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
            title={t('kyc.rejected.title')}
            subTitle={
              <Flex vertical gap={8}>
                <Text>{t('kyc.rejected.description')}</Text>
                {kycData?.reject_reason && (
                  <Alert
                    type="error"
                    message={t('kyc.rejected.reason')}
                    description={kycData.reject_reason}
                    style={{ textAlign: 'left', marginTop: 8 }}
                  />
                )}
              </Flex>
            }
            extra={
              <Button type="primary" onClick={handleStartKyc} loading={isApplying}>
                {t('kyc.rejected.reapply')}
              </Button>
            }
          />
        )

      case KycStatus.NOT_STARTED:
      default:
        return (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <SafetyCertificateOutlined style={{ fontSize: 64, color: '#d9d9d9', marginBottom: 24 }} />
            <Title level={4}>{t('kyc.notStarted.title')}</Title>
            <Paragraph type="secondary" style={{ maxWidth: 400, margin: '0 auto 24px' }}>
              {t('kyc.notStarted.description')}
            </Paragraph>
            <Flex vertical gap={16} style={{ width: '100%' }}>
              <div>
                <Title level={5}>{t('kyc.notStarted.requirements')}</Title>
                <ul style={{ textAlign: 'left', maxWidth: 300, margin: '0 auto' }}>
                  <li>{t('kyc.notStarted.req1')}</li>
                  <li>{t('kyc.notStarted.req2')}</li>
                  <li>{t('kyc.notStarted.req3')}</li>
                </ul>
              </div>
              <Button
                type="primary"
                size="large"
                icon={<ArrowRightOutlined />}
                onClick={handleStartKyc}
                loading={isApplying}
              >
                {t('kyc.notStarted.startButton')}
              </Button>
            </Flex>
          </div>
        )
    }
  }

  return (
    <Card
      title={
        <Space>
          <SafetyCertificateOutlined />
          {t('kyc.title')}
          <Badge status={statusInfo.antdStatus} text={t(statusInfo.label)} />
        </Space>
      }
    >
      {renderContent()}
    </Card>
  )
}

