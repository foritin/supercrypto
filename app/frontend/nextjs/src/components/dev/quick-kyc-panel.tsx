'use client'
/**
 * Quick KYC Panel Component
 * Developer tool for quick KYC approval/reset
 */
import { Card, Button, Flex, Typography, Badge, Popconfirm, message } from 'antd'
import { 
  SafetyCertificateOutlined, 
  CheckCircleOutlined, 
  UndoOutlined,
  LoadingOutlined 
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useAccount } from 'wagmi'
import { useKycStatus, useQuickKycApprove, useKycReset, getKycStatusInfo } from '@/hooks/use-kyc-status'
import { KycStatus } from '@/services/kyc'

const { Title, Text } = Typography

export function QuickKycPanel() {
  const { t } = useTranslation()
  const { isConnected, address } = useAccount()
  const { status, isLoading: isStatusLoading, refetch } = useKycStatus()
  const { mutate: quickApprove, isPending: isApproving } = useQuickKycApprove()
  const { mutate: resetKyc, isPending: isResetting } = useKycReset()
  
  const statusInfo = getKycStatusInfo(status)
  const isApproved = status === KycStatus.APPROVED

  // Handle quick approve
  const handleQuickApprove = () => {
    quickApprove(undefined, {
      onSuccess: () => {
        message.success(t('dev.kyc.approveSuccess'))
        refetch()
      },
      onError: (error) => {
        message.error(error.message || t('common.error'))
      },
    })
  }

  // Handle reset
  const handleReset = () => {
    resetKyc(undefined, {
      onSuccess: () => {
        message.success(t('dev.kyc.resetSuccess'))
        refetch()
      },
      onError: (error) => {
        message.error(error.message || t('common.error'))
      },
    })
  }

  if (!isConnected) {
    return (
      <Card title={<Flex gap={8}><SafetyCertificateOutlined />{t('dev.kyc.title')}</Flex>}>
        <Text type="secondary">{t('kyc.connectWalletFirst')}</Text>
      </Card>
    )
  }

  return (
    <Card 
      title={<Flex gap={8}><SafetyCertificateOutlined />{t('dev.kyc.title')}</Flex>}
      extra={<Badge status={statusInfo.antdStatus} text={t(statusInfo.label)} />}
    >
      <Flex vertical gap={16} style={{ width: '100%' }}>
        <Text type="secondary">{t('dev.kyc.description')}</Text>
        
        {isStatusLoading ? (
          <LoadingOutlined />
        ) : (
          <Flex gap={8}>
            {!isApproved ? (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={handleQuickApprove}
                loading={isApproving}
              >
                {t('dev.kyc.approveButton')}
              </Button>
            ) : (
              <Popconfirm
                title={t('dev.kyc.resetConfirm')}
                onConfirm={handleReset}
                okText={t('common.confirm')}
                cancelText={t('common.cancel')}
              >
                <Button
                  danger
                  icon={<UndoOutlined />}
                  loading={isResetting}
                >
                  {t('dev.kyc.resetButton')}
                </Button>
              </Popconfirm>
            )}
          </Flex>
        )}
        
        <Text type="secondary" style={{ fontSize: 12 }}>
          {t('dev.kyc.note')}
        </Text>
      </Flex>
    </Card>
  )
}

