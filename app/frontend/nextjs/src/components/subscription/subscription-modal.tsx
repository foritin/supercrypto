'use client'
/**
 * Subscription Modal Component
 * 认购弹窗组件
 */
import { useState, useEffect } from 'react'
import {
  Modal,
  Form,
  InputNumber,
  Segmented,
  Space,
  Flex,
  Typography,
  Card,
  Statistic,
  Divider,
  Alert,
  Spin,
  message,
} from 'antd'
import {
  DollarOutlined,
  CalendarOutlined,
  PercentageOutlined,
  RiseOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useAccount } from 'wagmi'
import {
  subscriptionService,
  type SubscriptionPreviewRequest,
  type SubscriptionPreviewResponse,
  type TokenType,
  type LockPeriod,
  TOKEN_TYPE_OPTIONS,
  LOCK_PERIOD_OPTIONS,
} from '@/services/subscription'
import type { AssetDetail } from '@/services/asset'
import { useSubscriptionContract } from '@/hooks'

const { Text, Title } = Typography

interface SubscriptionModalProps {
  open: boolean
  asset: AssetDetail | null
  onClose: () => void
  onSuccess: () => void
}

export function SubscriptionModal({ open, asset, onClose, onSuccess }: SubscriptionModalProps) {
  const { t } = useTranslation()
  const { address, isConnected } = useAccount()
  const [form] = Form.useForm()
  
  // Contract integration
  const {
    isContractReady,
    usdtBalance,
    usdtAllowance,
    approveUSDT,
    subscribe: contractSubscribe,
    reset: resetContract,
  } = useSubscriptionContract()
  
  // Form values
  const [amount, setAmount] = useState<number>(0)
  const [tokenType, setTokenType] = useState<TokenType>('USDT')
  const [lockPeriod, setLockPeriod] = useState<LockPeriod>(3)
  
  // Preview state
  const [preview, setPreview] = useState<SubscriptionPreviewResponse | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  
  // Reset form when modal opens
  useEffect(() => {
    if (open && asset) {
      form.resetFields()
      setAmount(asset.min_subscription)
      setTokenType('USDT')
      setLockPeriod(3)
      setPreview(null)
    }
  }, [open, asset, form])
  
  // Fetch preview when form values change
  useEffect(() => {
    if (!asset || !amount || amount < asset.min_subscription) {
      setPreview(null)
      return
    }
    
    const fetchPreview = async () => {
      setPreviewLoading(true)
      try {
        const data: SubscriptionPreviewRequest = {
          asset_id: asset.id,
          amount,
          token_type: tokenType,
          lock_period: lockPeriod,
        }
        const result = await subscriptionService.previewSubscription(data)
        setPreview(result)
      } catch {
        setPreview(null)
      } finally {
        setPreviewLoading(false)
      }
    }
    
    const debounce = setTimeout(fetchPreview, 300)
    return () => clearTimeout(debounce)
  }, [asset, amount, tokenType, lockPeriod])
  
  // Transaction state for UI feedback
  const [txState, setTxState] = useState<'idle' | 'signing' | 'pending' | 'confirming' | 'success'>('idle')
  
  // Reset tx state when modal closes
  useEffect(() => {
    if (!open) {
      setTxState('idle')
    }
  }, [open])
  
  // Check if approval is needed
  const needsApproval = isContractReady && tokenType === 'USDT' && 
    (usdtAllowance ?? 0) < amount

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Submit subscription with real or simulated transaction flow
  const handleSubmit = async () => {
    if (!asset || !preview) {
      message.error('Invalid state')
      return
    }

    setIsSubmitting(true)
    
    try {
      let txHash: string
      
      // Use real contract if deployed, otherwise simulate
      if (isContractReady && tokenType === 'USDT') {
        // ========== Real Contract Flow ==========
        
        // Step 1: Approve if needed
        if (needsApproval) {
          setTxState('signing')
          const approved = await approveUSDT(amount)
          if (!approved) throw new Error('Approval failed')
        }
        
        // Step 2: Subscribe
        setTxState('pending')
        const result = await contractSubscribe(amount, lockPeriod)
        if (!result) throw new Error('Transaction failed')
        
        txHash = result
        setTxState('confirming')
        
      } else {
        // ========== Simulated Flow (for USDC or no contract) ==========
        
        // Step 1: Signing (simulated)
        setTxState('signing')
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Step 2: Pending (simulated)
        setTxState('pending')
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Step 3: Confirming (simulated)
        setTxState('confirming')
        
        // Generate mock tx hash
        txHash = `0x${Date.now().toString(16)}${'0'.repeat(48)}`
      }
      
      // Save to backend
      await subscriptionService.createSubscription({
        asset_id: asset.id,
        amount,
        token_type: tokenType,
        lock_period: lockPeriod,
        tx_hash: txHash,
      })
      
      // Step 4: Success
      setTxState('success')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      message.success(t('subscription.createSuccess'))
      resetContract()
      onSuccess()
      onClose()
    } catch (error) {
      setTxState('idle')
      resetContract()
      message.error((error as Error).message || t('common.error'))
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Get button text based on transaction state
  const getButtonText = () => {
    switch (txState) {
      case 'signing':
        return t('subscription.signing')
      case 'pending':
        return t('subscription.pending')
      case 'confirming':
        return t('subscription.confirming')
      case 'success':
        return t('subscription.success')
      default:
        return t('subscription.confirm')
    }
  }
  
  // Get APY for selected lock period
  const getSelectedApy = () => {
    if (!asset) return 0
    switch (lockPeriod) {
      case 3: return asset.apy_3m
      case 6: return asset.apy_6m
      case 12: return asset.apy_12m
      default: return 0
    }
  }
  
  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }
  
  if (!asset) return null
  
  return (
    <Modal
      title={
        <Space>
          <DollarOutlined />
          {t('subscription.title')}
        </Space>
      }
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={isSubmitting || txState !== 'idle'}
      okText={getButtonText()}
      cancelText={t('common.cancel')}
      okButtonProps={{ 
        disabled: !preview || !isConnected || amount < asset.min_subscription || txState !== 'idle'
      }}
      cancelButtonProps={{
        disabled: txState !== 'idle'
      }}
      width={600}
    >
      <Flex vertical gap={24} style={{ width: '100%' }}>
        {/* Asset Info */}
        <Card size="small" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)' }}>
          <Space>
            <Text strong>{asset.name}</Text>
            <Text type="secondary">({asset.symbol})</Text>
          </Space>
        </Card>
        
        {/* Wallet Check */}
        {!isConnected && (
          <Alert
            type="warning"
            message={t('subscription.connectWalletFirst')}
            showIcon
          />
        )}
        
        {/* Subscription Form */}
        <Form form={form} layout="vertical">
          {/* Token Type */}
          <Form.Item label={t('subscription.tokenType')}>
            <Segmented
              value={tokenType}
              onChange={(value) => setTokenType(value as TokenType)}
              options={TOKEN_TYPE_OPTIONS.map(opt => ({
                value: opt.value,
                label: (
                  <Space>
                    <DollarOutlined />
                    {opt.label}
                  </Space>
                ),
              }))}
              block
            />
          </Form.Item>
          
          {/* Lock Period */}
          <Form.Item label={t('subscription.lockPeriod')}>
            <Segmented
              value={lockPeriod}
              onChange={(value) => setLockPeriod(value as LockPeriod)}
              options={LOCK_PERIOD_OPTIONS.map(opt => ({
                value: opt.value,
                label: (
                  <Flex vertical gap={0} style={{ padding: '4px 0' }}>
                    <Text>{opt.label}</Text>
                    <Text type="success" style={{ fontSize: 12 }}>
                      {opt.value === 3 ? asset.apy_3m : opt.value === 6 ? asset.apy_6m : asset.apy_12m}% APY
                    </Text>
                  </Flex>
                ),
              }))}
              block
            />
          </Form.Item>
          
          {/* Amount */}
          <Form.Item 
            label={t('subscription.amount')}
            help={`${t('subscription.minAmount')}: $${asset.min_subscription}`}
          >
            <InputNumber
              value={amount}
              onChange={(value) => setAmount(value || 0)}
              min={asset.min_subscription}
              max={asset.remaining_amount}
              style={{ width: '100%' }}
              prefix="$"
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => Number(value?.replace(/\$\s?|(,*)/g, '') || 0)}
              size="large"
            />
          </Form.Item>
        </Form>
        
        <Divider style={{ margin: '12px 0' }} />
        
        {/* Preview */}
        <Card 
          title={
            <Space>
              <RiseOutlined />
              {t('subscription.preview')}
            </Space>
          }
          size="small"
        >
          {previewLoading ? (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <Spin />
            </div>
          ) : preview ? (
            <Flex vertical gap={8} style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Space>
                  <PercentageOutlined />
                  <Text>{t('subscription.apy')}</Text>
                </Space>
                <Text strong style={{ color: '#52c41a' }}>{preview.apy}%</Text>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Space>
                  <DollarOutlined />
                  <Text>{t('subscription.expectedInterest')}</Text>
                </Space>
                <Text strong>${preview.expected_interest.toFixed(2)}</Text>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Space>
                  <DollarOutlined />
                  <Text>{t('subscription.totalReturn')}</Text>
                </Space>
                <Text strong style={{ color: '#1677ff', fontSize: 16 }}>
                  ${preview.total_return.toFixed(2)}
                </Text>
              </div>
              
              <Divider style={{ margin: '8px 0' }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Space>
                  <CalendarOutlined />
                  <Text>{t('subscription.maturityDate')}</Text>
                </Space>
                <Text>{formatDate(preview.end_date)}</Text>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">{t('subscription.rwaTokens')}</Text>
                <Text type="secondary">{preview.rwa_token_amount.toFixed(4)} {preview.asset_symbol}</Text>
              </div>
            </Flex>
          ) : (
            <Text type="secondary">{t('subscription.enterAmountToPreview')}</Text>
          )}
        </Card>
      </Flex>
    </Modal>
  )
}

