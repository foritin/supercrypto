'use client'
/**
 * KYC Admin List Component
 * Admin panel for managing KYC applications
 */
import { useState } from 'react'
import { Table, Card, Select, Button, Tag, Space, Flex, Typography, Badge, Modal, Input, message } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import type { ColumnsType } from 'antd/es/table'
import { useKycList, useKycReview } from '@/hooks/use-kyc-admin'
import { KycStatus } from '@/services/kyc'
import type { KycFullResponse } from '@/services/kyc'
import { truncateAddress } from '@/utils/format'

const { Title, Text } = Typography
const { TextArea } = Input

export function KycAdminList() {
  const { t } = useTranslation()
  const [statusFilter, setStatusFilter] = useState<KycStatus | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [reviewModal, setReviewModal] = useState<{
    visible: boolean
    kyc: KycFullResponse | null
    action: 'approve' | 'reject' | null
  }>({ visible: false, kyc: null, action: null })
  const [rejectReason, setRejectReason] = useState('')
  
  const { data, isLoading, refetch } = useKycList({
    status: statusFilter,
    page,
    page_size: pageSize,
  })
  
  const { mutate: review, isPending: isReviewing } = useKycReview()

  // Status tag renderer
  const renderStatus = (status: KycStatus) => {
    const config: Record<KycStatus, { color: string; label: string }> = {
      [KycStatus.NOT_STARTED]: { color: 'default', label: t('kyc.status.notStarted') },
      [KycStatus.PENDING]: { color: 'processing', label: t('kyc.status.pending') },
      [KycStatus.APPROVED]: { color: 'success', label: t('kyc.status.approved') },
      [KycStatus.REJECTED]: { color: 'error', label: t('kyc.status.rejected') },
    }
    const { color, label } = config[status]
    return <Tag color={color}>{label}</Tag>
  }

  // Table columns
  const columns: ColumnsType<KycFullResponse> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: t('admin.kyc.walletAddress'),
      dataIndex: 'wallet_address',
      key: 'wallet_address',
      render: (addr: string) => (
        <Text copyable={{ text: addr }}>{truncateAddress(addr)}</Text>
      ),
    },
    {
      title: t('admin.kyc.status'),
      dataIndex: 'status',
      key: 'status',
      render: renderStatus,
      width: 120,
    },
    {
      title: t('admin.kyc.country'),
      dataIndex: 'country_code',
      key: 'country_code',
      width: 100,
      render: (code: string | null) => code || '-',
    },
    {
      title: t('admin.kyc.submittedAt'),
      dataIndex: 'submitted_at',
      key: 'submitted_at',
      render: (date: string | null) => 
        date ? new Date(date).toLocaleString() : '-',
      width: 180,
    },
    {
      title: t('admin.kyc.reviewedAt'),
      dataIndex: 'reviewed_at',
      key: 'reviewed_at',
      render: (date: string | null) => 
        date ? new Date(date).toLocaleString() : '-',
      width: 180,
    },
    {
      title: t('admin.kyc.actions'),
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space>
          {record.status === KycStatus.PENDING && (
            <>
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => openReviewModal(record, 'approve')}
              >
                {t('admin.kyc.approve')}
              </Button>
              <Button
                danger
                size="small"
                icon={<CloseCircleOutlined />}
                onClick={() => openReviewModal(record, 'reject')}
              >
                {t('admin.kyc.reject')}
              </Button>
            </>
          )}
          {record.status === KycStatus.REJECTED && record.reject_reason && (
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => Modal.info({
                title: t('admin.kyc.rejectReason'),
                content: record.reject_reason,
              })}
            >
              {t('admin.kyc.viewReason')}
            </Button>
          )}
        </Space>
      ),
    },
  ]

  // Open review modal
  const openReviewModal = (kyc: KycFullResponse, action: 'approve' | 'reject') => {
    setReviewModal({ visible: true, kyc, action })
    setRejectReason('')
  }

  // Handle review submit
  const handleReview = () => {
    if (!reviewModal.kyc || !reviewModal.action) return
    
    if (reviewModal.action === 'reject' && !rejectReason.trim()) {
      message.error(t('admin.kyc.rejectReasonRequired'))
      return
    }
    
    review({
      id: reviewModal.kyc.id,
      data: {
        approved: reviewModal.action === 'approve',
        reject_reason: reviewModal.action === 'reject' ? rejectReason : undefined,
        is_accredited: reviewModal.action === 'approve',
      },
    }, {
      onSuccess: () => {
        message.success(
          reviewModal.action === 'approve'
            ? t('admin.kyc.approveSuccess')
            : t('admin.kyc.rejectSuccess')
        )
        setReviewModal({ visible: false, kyc: null, action: null })
        refetch()
      },
      onError: (error) => {
        message.error(error.message || t('common.error'))
      },
    })
  }

  // Status filter options
  const statusOptions = [
    { value: undefined, label: t('admin.kyc.allStatus') },
    { value: KycStatus.PENDING, label: t('kyc.status.pending') },
    { value: KycStatus.APPROVED, label: t('kyc.status.approved') },
    { value: KycStatus.REJECTED, label: t('kyc.status.rejected') },
    { value: KycStatus.NOT_STARTED, label: t('kyc.status.notStarted') },
  ]

  return (
    <Card>
      <Flex vertical gap={24} style={{ width: '100%' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>{t('admin.kyc.title')}</Title>
          <Space>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={statusOptions}
              style={{ width: 150 }}
              placeholder={t('admin.kyc.filterByStatus')}
            />
            <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
              {t('common.refresh')}
            </Button>
          </Space>
        </div>

        {/* Stats */}
        <Space size="large">
          <Badge status="processing" text={`${t('kyc.status.pending')}: ${data?.items.filter(k => k.status === KycStatus.PENDING).length || 0}`} />
          <Badge status="success" text={`${t('kyc.status.approved')}: ${data?.items.filter(k => k.status === KycStatus.APPROVED).length || 0}`} />
          <Badge status="error" text={`${t('kyc.status.rejected')}: ${data?.items.filter(k => k.status === KycStatus.REJECTED).length || 0}`} />
        </Space>

        {/* Table */}
        <Table
          columns={columns}
          dataSource={data?.items || []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            pageSize,
            total: data?.total || 0,
            showSizeChanger: true,
            showTotal: (total) => t('admin.kyc.totalRecords', { total }),
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
            },
          }}
        />
      </Flex>

      {/* Review Modal */}
      <Modal
        title={
          reviewModal.action === 'approve'
            ? t('admin.kyc.confirmApprove')
            : t('admin.kyc.confirmReject')
        }
        open={reviewModal.visible}
        onCancel={() => setReviewModal({ visible: false, kyc: null, action: null })}
        onOk={handleReview}
        confirmLoading={isReviewing}
        okText={reviewModal.action === 'approve' ? t('admin.kyc.approve') : t('admin.kyc.reject')}
        okButtonProps={{ danger: reviewModal.action === 'reject' }}
      >
        {reviewModal.kyc && (
          <Flex vertical style={{ width: '100%' }}>
            <Text>
              <strong>{t('admin.kyc.walletAddress')}:</strong>{' '}
              {truncateAddress(reviewModal.kyc.wallet_address)}
            </Text>
            {reviewModal.action === 'reject' && (
              <div>
                <Text strong>{t('admin.kyc.rejectReason')}:</Text>
                <TextArea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder={t('admin.kyc.rejectReasonPlaceholder')}
                  rows={3}
                  style={{ marginTop: 8 }}
                />
              </div>
            )}
          </Flex>
        )}
      </Modal>
    </Card>
  )
}

