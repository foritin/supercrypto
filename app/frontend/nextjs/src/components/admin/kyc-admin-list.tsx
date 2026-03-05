'use client'
/**
 * KYC Admin List Component
 * Admin panel for managing KYC applications
 * 
 * Migrated from Ant Design to shadcn/ui:
 * - Table → DataTable (@tanstack/react-table)
 * - Modal → Dialog (Radix)
 * - Select → shadcn/ui Select
 * - Button → shadcn/ui Button
 * - Tag → Badge
 * - Badge (status) → custom status indicators
 * - message → sonner toast (notification service)
 * - Typography → native elements with Tailwind
 * - Flex → Tailwind flex utilities
 * - Space → Tailwind gap utilities
 * 
 * @validates Requirements 8.2
 */
import type { ColumnDef } from '@tanstack/react-table'
import { CheckCircle, XCircle, Eye, RefreshCw, Loader2, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

// shadcn/ui components
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
// Services and utilities
import { KYC_STATUS_BADGE } from '@/constants/status-config'
import { useKycList, useKycReview } from '@/hooks/use-kyc-admin'
import { notification } from '@/lib/notification'
import { KycStatus } from '@/services/kyc'
import type { KycFullResponse } from '@/services/kyc'
import { truncateAddress } from '@/utils/format'

// KYC Detail Modal
import { KycDetailModal } from './kyc-detail-modal'

// 使用共享状态徽章配置
const STATUS_BADGE_VARIANTS = KYC_STATUS_BADGE

// Copyable address component
function CopyableAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="flex items-center gap-1">
      <span className="font-mono text-sm">{truncateAddress(address)}</span>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {copied ? '已复制' : '复制地址'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

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
  const [viewReasonDialog, setViewReasonDialog] = useState<{
    open: boolean
    reason: string
  }>({ open: false, reason: '' })
  const [detailModal, setDetailModal] = useState<{
    open: boolean
    kycId: number | null
  }>({ open: false, kycId: null })
  
  const { data, isLoading, refetch } = useKycList({
    page,
    page_size: pageSize,
    ...(statusFilter ? { status: statusFilter } : {}),
  })
  
  const { mutate: review, isPending: isReviewing } = useKycReview()

  // Status badge renderer
  const renderStatus = (status: KycStatus) => {
    const labels: Record<KycStatus, string> = {
      [KycStatus.NOT_STARTED]: t('kyc.status.notStarted'),
      [KycStatus.PENDING]: t('kyc.status.pending'),
      [KycStatus.APPROVED]: t('kyc.status.approved'),
      [KycStatus.REJECTED]: t('kyc.status.rejected'),
    }
    return (
      <Badge variant={STATUS_BADGE_VARIANTS[status]}>
        {labels[status]}
      </Badge>
    )
  }

  // Table columns using @tanstack/react-table ColumnDef
  const columns: ColumnDef<KycFullResponse>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      size: 80,
    },
    {
      accessorKey: 'wallet_address',
      header: t('admin.kyc.walletAddress'),
      cell: ({ row }) => (
        <CopyableAddress address={row.original.wallet_address} />
      ),
    },
    {
      accessorKey: 'status',
      header: t('admin.kyc.status'),
      size: 120,
      cell: ({ row }) => renderStatus(row.original.status),
    },
    {
      accessorKey: 'country_code',
      header: t('admin.kyc.country'),
      size: 100,
      cell: ({ row }) => row.original.country_code || '-',
    },
    {
      accessorKey: 'submitted_at',
      header: t('admin.kyc.submittedAt'),
      size: 180,
      cell: ({ row }) => 
        row.original.submitted_at 
          ? new Date(row.original.submitted_at).toLocaleString() 
          : '-',
    },
    {
      accessorKey: 'reviewed_at',
      header: t('admin.kyc.reviewedAt'),
      size: 180,
      cell: ({ row }) => 
        row.original.reviewed_at 
          ? new Date(row.original.reviewed_at).toLocaleString() 
          : '-',
    },
    {
      id: 'actions',
      header: t('admin.kyc.actions'),
      size: 200,
      cell: ({ row }) => {
        const record = row.original
        return (
          <div className="flex gap-1">
            {/* 查看详情按钮 - 对所有状态可见 */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDetailModal({ open: true, kycId: record.id })}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    {t('admin.kyc.viewDetail')}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('admin.kyc.viewDetail')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {record.status === KycStatus.PENDING && (
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => openReviewModal(record, 'approve')}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {t('admin.kyc.approve')}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('admin.kyc.approve')}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => openReviewModal(record, 'reject')}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        {t('admin.kyc.reject')}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('admin.kyc.reject')}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}
            {record.status === KycStatus.REJECTED && record.reject_reason && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewReasonDialog({
                        open: true,
                        reason: record.reject_reason || '',
                      })}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      {t('admin.kyc.viewReason')}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('admin.kyc.viewReason')}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )
      },
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
      notification.error(t('admin.kyc.rejectReasonRequired'))
      return
    }
    
    review({
      id: reviewModal.kyc.id,
      data: {
        approved: reviewModal.action === 'approve',
        is_accredited: reviewModal.action === 'approve',
        ...(reviewModal.action === 'reject' ? { reject_reason: rejectReason } : {}),
      },
    }, {
      onSuccess: () => {
        notification.success(
          reviewModal.action === 'approve'
            ? t('admin.kyc.approveSuccess')
            : t('admin.kyc.rejectSuccess')
        )
        setReviewModal({ visible: false, kyc: null, action: null })
        refetch()
      },
      onError: (error) => {
        notification.error(error.message || t('common.error'))
      },
    })
  }

  // Status filter options
  const statusOptions = [
    { value: 'all', label: t('admin.kyc.allStatus') },
    { value: KycStatus.PENDING, label: t('kyc.status.pending') },
    { value: KycStatus.APPROVED, label: t('kyc.status.approved') },
    { value: KycStatus.REJECTED, label: t('kyc.status.rejected') },
    { value: KycStatus.NOT_STARTED, label: t('kyc.status.notStarted') },
  ]

  // Calculate stats from current page data
  const pendingCount = data?.items.filter(k => k.status === KycStatus.PENDING).length || 0
  const approvedCount = data?.items.filter(k => k.status === KycStatus.APPROVED).length || 0
  const rejectedCount = data?.items.filter(k => k.status === KycStatus.REJECTED).length || 0

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>{t('admin.kyc.title')}</CardTitle>
          <div className="flex gap-2">
            <Select
              value={statusFilter || 'all'}
              onValueChange={(value) => setStatusFilter(value === 'all' ? undefined : value as KycStatus)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t('admin.kyc.filterByStatus')} />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('common.refresh')}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats */}
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-yellow-500" />
            <span className="text-sm text-muted-foreground">
              {t('kyc.status.pending')}: {pendingCount}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-sm text-muted-foreground">
              {t('kyc.status.approved')}: {approvedCount}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-sm text-muted-foreground">
              {t('kyc.status.rejected')}: {rejectedCount}
            </span>
          </div>
        </div>

        {/* DataTable */}
        <DataTable
          columns={columns}
          data={data?.items || []}
          loading={isLoading}
          emptyMessage={t('common.noData')}
          pagination={{
            pageIndex: page - 1,
            pageSize,
            pageCount: Math.ceil((data?.total || 0) / pageSize) || 1,
            onPageChange: (p) => setPage(p + 1),
            onPageSizeChange: setPageSize,
          }}
        />
      </CardContent>

      {/* Review Confirmation Dialog - using AlertDialog */}
      <AlertDialog 
        open={reviewModal.visible} 
        onOpenChange={(open) => {
          if (!open) {
            setReviewModal({ visible: false, kyc: null, action: null })
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {reviewModal.action === 'approve'
                ? t('admin.kyc.confirmApprove')
                : t('admin.kyc.confirmReject')}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                {reviewModal.kyc && (
                  <div className="text-sm">
                    <span className="font-medium">{t('admin.kyc.walletAddress')}:</span>{' '}
                    <span className="font-mono">{truncateAddress(reviewModal.kyc.wallet_address)}</span>
                  </div>
                )}
                {reviewModal.action === 'reject' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {t('admin.kyc.rejectReason')}:
                    </label>
                    <Textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder={t('admin.kyc.rejectReasonPlaceholder')}
                      rows={3}
                    />
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReview}
              disabled={isReviewing}
              className={reviewModal.action === 'reject' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {isReviewing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {reviewModal.action === 'approve' ? t('admin.kyc.approve') : t('admin.kyc.reject')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Reject Reason Dialog */}
      <Dialog 
        open={viewReasonDialog.open} 
        onOpenChange={(open) => {
          if (!open) {
            setViewReasonDialog({ open: false, reason: '' })
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.kyc.rejectReason')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {viewReasonDialog.reason}
            </p>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setViewReasonDialog({ open: false, reason: '' })}
            >
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KYC Detail Modal */}
      <KycDetailModal
        kycId={detailModal.kycId}
        open={detailModal.open}
        onOpenChange={(open) => setDetailModal({ open, kycId: open ? detailModal.kycId : null })}
        onReviewSuccess={refetch}
      />
    </Card>
  )
}
