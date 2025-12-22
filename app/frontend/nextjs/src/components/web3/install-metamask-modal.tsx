'use client'
import { Modal, Button, Typography, Space, Flex, Alert } from 'antd'
import { DownloadOutlined, ChromeOutlined, FireOutlined, SafetyOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

const { Title, Paragraph, Text, Link } = Typography

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
  const isChrome = /Chrome/.test(navigator.userAgent) && !/Edge/.test(navigator.userAgent)
  const isFirefox = /Firefox/.test(navigator.userAgent)

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
    <Modal
      title={
        <Space>
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"
            alt="MetaMask"
            style={{ width: 24, height: 24 }}
          />
          <span>{t('metamask.install.title')}</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          {t('metamask.install.installLater')}
        </Button>,
        <Button
          key="install"
          type="primary"
          icon={<DownloadOutlined />}
          onClick={handleInstall}
        >
          {t('metamask.install.goToInstall')}
        </Button>,
      ]}
      width={520}
    >
      <Flex vertical gap={16} style={{ width: '100%' }}>
        <Alert
          message={t('metamask.install.required')}
          description={t('metamask.install.description')}
          type="info"
          showIcon
        />

        <div>
          <Title level={5}>{t('metamask.install.steps.title')}</Title>
          <Flex vertical gap={8}>
            <Text>
              <Text strong>1.</Text> {t('metamask.install.steps.step1')}
            </Text>
            <Text>
              <Text strong>2.</Text> {t('metamask.install.steps.step2')}
            </Text>
            <Text>
              <Text strong>3.</Text> {t('metamask.install.steps.step3')}
            </Text>
            <Text>
              <Text strong>4.</Text> {t('metamask.install.steps.step4')}
            </Text>
          </Flex>
        </div>

        <div>
          <Title level={5}>{t('metamask.install.browsers')}</Title>
          <Space>
            <Button
              icon={<ChromeOutlined />}
              size="small"
              href={METAMASK_CHROME_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('metamask.install.chrome')}
            </Button>
            <Button
              icon={<FireOutlined />}
              size="small"
              href={METAMASK_FIREFOX_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('metamask.install.firefox')}
            </Button>
            <Button
              size="small"
              href={METAMASK_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('metamask.install.other')}
            </Button>
          </Space>
        </div>

        <Alert
          message={
            <Space>
              <SafetyOutlined />
              <Text strong>{t('metamask.install.security.title')}</Text>
            </Space>
          }
          description={
            <Text type="secondary">
              {t('metamask.install.security.tip1')}
              <br />
              {t('metamask.install.security.tip2')}
            </Text>
          }
          type="warning"
        />

        <Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 12 }}>
          {t('metamask.install.officialSite')}
          <Link href="https://metamask.io" target="_blank" rel="noopener noreferrer">
            https://metamask.io
          </Link>
        </Paragraph>
      </Flex>
    </Modal>
  )
}
