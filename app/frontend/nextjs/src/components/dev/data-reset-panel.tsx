'use client'
/**
 * Data Reset Panel Component
 * Developer tool for resetting test data
 */
import { useState, useEffect, useCallback } from 'react'
import { Card, Button, Space, Flex, Typography, Alert, Checkbox, Input, Modal, Statistic, Row, Col, App } from 'antd'
import { DeleteOutlined, WarningOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { devToolsService, type ResetableDataInfo, type DataResetRequest } from '@/services/dev-tools'

const { Text } = Typography

type DataType = 'kyc' | 'transaction' | 'all'

export function DataResetPanel() {
  const { t } = useTranslation()
  const { message: messageApi } = App.useApp()
  
  const [selectedTypes, setSelectedTypes] = useState<DataType[]>(['all'])
  const [confirmText, setConfirmText] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Data state
  const [resetInfo, setResetInfo] = useState<ResetableDataInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  // Fetch resetable data info
  const fetchResetInfo = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await devToolsService.getResetInfo()
      setResetInfo(data)
    } catch (err) {
      console.error('Failed to fetch reset info:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refetch = fetchResetInfo

  useEffect(() => {
    fetchResetInfo()
  }, [fetchResetInfo])

  // Reset data
  const handleReset = async (request: DataResetRequest) => {
    setIsResetting(true)
    try {
      await devToolsService.resetData(request)
      messageApi.success(t('dev.dataReset.success'))
      setIsModalOpen(false)
      setConfirmText('')
      refetch()
    } catch (error) {
      messageApi.error((error as Error).message || t('common.error'))
    } finally {
      setIsResetting(false)
    }
  }

  // Handle checkbox change
  const handleTypeChange = (type: DataType, checked: boolean) => {
    if (type === 'all') {
      setSelectedTypes(checked ? ['all'] : [])
    } else {
      let newTypes = selectedTypes.filter(t => t !== 'all')
      if (checked) {
        newTypes.push(type)
      } else {
        newTypes = newTypes.filter(t => t !== type)
      }
      setSelectedTypes(newTypes)
    }
  }

  // Open confirmation modal
  const handleResetClick = () => {
    if (selectedTypes.length === 0) {
      messageApi.warning(t('dev.dataReset.selectType'))
      return
    }
    setIsModalOpen(true)
  }

  // Execute reset
  const handleConfirmReset = () => {
    if (confirmText !== 'RESET') {
      messageApi.error(t('dev.dataReset.confirmError'))
      return
    }
    
    handleReset({
      confirmation: 'RESET',
      data_types: selectedTypes,
    })
  }

  const isAllSelected = selectedTypes.includes('all')

  return (
    <Card 
      title={<Space><DeleteOutlined />{t('dev.dataReset.title')}</Space>}
      extra={
        <Button 
          size="small" 
          onClick={() => refetch()}
          loading={isLoading}
        >
          {t('common.refresh')}
        </Button>
      }
    >
      <Flex vertical gap={16} style={{ width: '100%' }}>
        {/* Warning */}
        <Alert
          type="error"
          icon={<WarningOutlined />}
          message={t('dev.dataReset.warning')}
          description={t('dev.dataReset.warningDescription')}
          showIcon
        />

        {/* Data Statistics */}
        {resetInfo && (
          <Row gutter={16}>
            <Col span={12}>
              <Statistic
                title={t('dev.dataReset.kycRecords')}
                value={resetInfo.kyc_count}
              />
            </Col>
            <Col span={12}>
              <Statistic
                title={t('dev.dataReset.transactionRecords')}
                value={resetInfo.transaction_count}
              />
            </Col>
          </Row>
        )}

        {/* Data Type Selection */}
        <div>
          <Text strong>{t('dev.dataReset.selectDataTypes')}:</Text>
          <div style={{ marginTop: 8 }}>
            <Flex vertical>
              <Checkbox
                checked={isAllSelected}
                onChange={(e) => handleTypeChange('all', e.target.checked)}
              >
                {t('dev.dataReset.allData')}
              </Checkbox>
              <Checkbox
                checked={selectedTypes.includes('kyc') || isAllSelected}
                disabled={isAllSelected}
                onChange={(e) => handleTypeChange('kyc', e.target.checked)}
              >
                {t('dev.dataReset.kycData')} ({resetInfo?.kyc_count || 0})
              </Checkbox>
              <Checkbox
                checked={selectedTypes.includes('transaction') || isAllSelected}
                disabled={isAllSelected}
                onChange={(e) => handleTypeChange('transaction', e.target.checked)}
              >
                {t('dev.dataReset.transactionData')} ({resetInfo?.transaction_count || 0})
              </Checkbox>
            </Flex>
          </div>
        </div>

        {/* Reset Button */}
        <Button
          type="primary"
          danger
          icon={<DeleteOutlined />}
          onClick={handleResetClick}
          disabled={selectedTypes.length === 0}
          block
        >
          {t('dev.dataReset.resetButton')}
        </Button>

        <Text type="secondary" style={{ fontSize: 12 }}>
          {t('dev.dataReset.note')}
        </Text>
      </Flex>

      {/* Confirmation Modal */}
      <Modal
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
            {t('dev.dataReset.confirmTitle')}
          </Space>
        }
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false)
          setConfirmText('')
        }}
        onOk={handleConfirmReset}
        okText={t('dev.dataReset.confirmButton')}
        okButtonProps={{ 
          danger: true, 
          disabled: confirmText !== 'RESET',
          loading: isResetting,
        }}
        cancelText={t('common.cancel')}
      >
        <Flex vertical gap={16} style={{ width: '100%' }}>
          <Alert
            type="error"
            message={t('dev.dataReset.confirmWarning')}
            showIcon
          />
          
          <div>
            <Text>{t('dev.dataReset.confirmPrompt')}</Text>
            <Input
              placeholder="RESET"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              style={{ marginTop: 8 }}
            />
          </div>
          
          <div>
            <Text strong>{t('dev.dataReset.willDelete')}:</Text>
            <ul style={{ marginTop: 8, paddingLeft: 20 }}>
              {(isAllSelected || selectedTypes.includes('kyc')) && (
                <li>{t('dev.dataReset.kycData')}</li>
              )}
              {(isAllSelected || selectedTypes.includes('transaction')) && (
                <li>{t('dev.dataReset.transactionData')}</li>
              )}
            </ul>
          </div>
        </Flex>
      </Modal>
    </Card>
  )
}
