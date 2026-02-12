'use client'
/**
 * KYC Detail Modal Component
 * Admin modal for viewing KYC application details and performing review actions
 *
 * Features:
 * - Display user basic information
 * - Display ID document images (front/back)
 * - Display selfie and liveness verification status
 * - Approve/Reject actions with confirmation
 *
 * @validates Requirements Admin 审核需求
 */
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Image from 'next/image'
import {
  CheckCircle,
  XCircle,
  User,
  FileText,
  Camera,
  Calendar,
  MapPin,
  Globe,
  CreditCard,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react'

// shadcn/ui components
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Services and utilities
import { notification } from '@/lib/notification'
import { useKycById, useKycReview } from '@/hooks/use-kyc-admin'
import { KycStatus } from '@/services/kyc'
import { truncateAddress } from '@/utils/format'
import { KYC_STATUS_BADGE } from '@/constants/status-config'

// ============================================================================
// Types
// ============================================================================

export interface KycDetailModalProps {
  /** KYC record ID */
  kycId: number | null
  /** Whether the modal is open */
  open: boolean
  /** Callback when modal open state changes */
  onOpenChange: (open: boolean) => void
  /** Callback when review is successful */
  onReviewSuccess?: () => void
}

// ID type labels
const ID_TYPE_LABELS: Record<string, string> = {
  passport: '护照',
  id_card: '身份证',
  driver_license: '驾驶证',
}

// 使用共享状态徽章配置
const STATUS_BADGE_VARIANTS = KYC_STATUS_BADGE

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Copyable address component with tooltip
 */
function CopyableAddress({ address, className }: { address: string; className?: string }) {
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
    <div className={`flex items-center gap-2 ${className || ''}`}>
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
            {copied ? '已复制' : '复制完整地址'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

/**
 * Info row component for displaying label-value pairs
 */
function InfoRow({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
  className?: string
}) {
  return (
    <div className={`flex items-start gap-3 ${className || ''}`}>
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="text-sm font-medium mt-0.5">{value || '-'}</div>
      </div>
    </div>
  )
}

/**
 * Document image component with loading state and error handling
 */
function DocumentImage({
  src,
  alt,
  label,
}: {
  src: string | null | undefined
  alt: string
  label: string
}) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  if (!src) {
    return (
      <div className="flex flex-col items-center">
        <div className="w-full aspect-[3/2] bg-muted/30 rounded-lg flex items-center justify-center border border-dashed border-muted-foreground/30">
          <div className="text-center text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <span className="text-xs">未上传</span>
          </div>
        </div>
        <span className="text-xs text-muted-foreground mt-2">{label}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full aspect-[3/2] bg-muted/30 rounded-lg overflow-hidden border border-white/10">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {hasError ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <span className="text-xs">加载失败</span>
            </div>
          </div>
        ) : (
          <Image
            src={src}
            alt={alt}
            fill
            className={`object-cover transition-opacity ${isLoading ? 'opacity-0' : 'opacity-100'}`}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false)
              setHasError(true)
            }}
          />
        )}
        {/* Open in new tab button */}
        {!hasError && !isLoading && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-md hover:bg-black/70 transition-colors"
                >
                  <ExternalLink className="h-3 w-3 text-white" />
                </a>
              </TooltipTrigger>
              <TooltipContent>在新标签页打开</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <span className="text-xs text-muted-foreground mt-2">{label}</span>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function KycDetailModal({
  kycId,
  open,
  onOpenChange,
  onReviewSuccess,
}: KycDetailModalProps) {
  const { t } = useTranslation()
  const { data: kycData, isLoading, error, refetch } = useKycById(kycId)
  const { mutate: review, isPending: isReviewing } = useKycReview()

  // Local state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    action: 'approve' | 'reject' | null
  }>({ open: false, action: null })
  const [rejectReason, setRejectReason] = useState('')

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setConfirmDialog({ open: false, action: null })
      setRejectReason('')
    }
  }, [open])

  // Refetch when kycId changes
  useEffect(() => {
    if (kycId && open) {
      refetch()
    }
  }, [kycId, open, refetch])

  // Handle review action
  const handleReview = () => {
    if (!kycData || !confirmDialog.action) return

    if (confirmDialog.action === 'reject' && !rejectReason.trim()) {
      notification.error(t('admin.kyc.rejectReasonRequired'))
      return
    }

    review(
      {
        id: kycData.id,
        data: {
          approved: confirmDialog.action === 'approve',
          reject_reason: confirmDialog.action === 'reject' ? rejectReason : undefined,
          is_accredited: confirmDialog.action === 'approve',
        },
      },
      {
        onSuccess: () => {
          notification.success(
            confirmDialog.action === 'approve'
              ? t('admin.kyc.approveSuccess')
              : t('admin.kyc.rejectSuccess')
          )
          setConfirmDialog({ open: false, action: null })
          onOpenChange(false)
          onReviewSuccess?.()
        },
        onError: (error) => {
          notification.error(error.message || t('common.error'))
        },
      }
    )
  }

  // Render status badge
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

  // Format date
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              KYC 审核详情
            </DialogTitle>
            <DialogDescription>
              查看用户提交的 KYC 认证信息并进行审核
            </DialogDescription>
          </DialogHeader>

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Error state */}
          {error && !isLoading && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                加载失败: {error.message}
              </p>
              <Button variant="outline" onClick={() => refetch()}>
                重试
              </Button>
            </div>
          )}

          {/* Content */}
          {kycData && !isLoading && !error && (
            <div className="space-y-6">
              {/* Status and ID */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">ID: {kycData.id}</span>
                  {renderStatus(kycData.status)}
                </div>
                <span className="text-xs text-muted-foreground">
                  提交时间: {formatDate(kycData.submitted_at)}
                </span>
              </div>

              <Separator />

              {/* Basic Information Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <User className="h-4 w-4" />
                  基本信息
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted/20 rounded-lg border border-white/5">
                  <InfoRow
                    icon={CreditCard}
                    label="钱包地址"
                    value={<CopyableAddress address={kycData.wallet_address} />}
                  />
                  <InfoRow
                    icon={User}
                    label="姓名"
                    value={kycData.full_name || '-'}
                  />
                  <InfoRow
                    icon={Calendar}
                    label="出生日期"
                    value={kycData.date_of_birth || '-'}
                  />
                  <InfoRow
                    icon={Globe}
                    label="国籍"
                    value={kycData.country_code || '-'}
                  />
                  <InfoRow
                    icon={MapPin}
                    label="居住地址"
                    value={kycData.address || '-'}
                    className="sm:col-span-2"
                  />
                </div>
              </div>

              <Separator />

              {/* ID Document Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  证件信息
                </h3>
                <div className="p-4 bg-muted/20 rounded-lg border border-white/5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <InfoRow
                      icon={CreditCard}
                      label="证件类型"
                      value={ID_TYPE_LABELS[kycData.id_type ?? ''] || kycData.id_type || '-'}
                    />
                    <InfoRow
                      icon={CreditCard}
                      label="证件号码"
                      value={kycData.id_number ? `****${kycData.id_number.slice(-4)}` : '-'}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <DocumentImage
                      src={kycData.id_front_url}
                      alt="证件正面"
                      label="证件正面"
                    />
                    <DocumentImage
                      src={kycData.id_back_url}
                      alt="证件背面"
                      label="证件背面"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Selfie Verification Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  自拍验证
                </h3>
                <div className="p-4 bg-muted/20 rounded-lg border border-white/5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="max-w-[200px]">
                      <DocumentImage
                        src={kycData.selfie_url}
                        alt="自拍照"
                        label="自拍照"
                      />
                    </div>
                    <div className="flex flex-col justify-center space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">活体检测:</span>
                        {kycData.liveness_verified ? (
                          <Badge variant="success" className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            已通过
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <XCircle className="h-3 w-3" />
                            未验证
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reject Reason (if rejected) */}
              {kycData.status === KycStatus.REJECTED && kycData.reject_reason && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-destructive">
                      <XCircle className="h-4 w-4" />
                      拒绝原因
                    </h3>
                    <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                      <p className="text-sm text-destructive whitespace-pre-wrap">
                        {kycData.reject_reason}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Review Info (if reviewed) */}
              {kycData.reviewed_at && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>审核时间: {formatDate(kycData.reviewed_at)}</span>
                    {kycData.reviewer_address && (
                      <span>审核人: {truncateAddress(kycData.reviewer_address)}</span>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Footer with action buttons */}
          {kycData && kycData.status === KycStatus.PENDING && (
            <DialogFooter className="mt-6 gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={() => setConfirmDialog({ open: true, action: 'reject' })}
              >
                <XCircle className="h-4 w-4 mr-2" />
                拒绝
              </Button>
              <Button
                variant="default"
                onClick={() => setConfirmDialog({ open: true, action: 'approve' })}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                通过
              </Button>
            </DialogFooter>
          )}

          {/* Close button for non-pending status */}
          {kycData && kycData.status !== KycStatus.PENDING && (
            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                关闭
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDialog({ open: false, action: null })
            setRejectReason('')
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === 'approve'
                ? t('admin.kyc.confirmApprove')
                : t('admin.kyc.confirmReject')}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                {kycData && (
                  <div className="text-sm">
                    <span className="font-medium">{t('admin.kyc.walletAddress')}:</span>{' '}
                    <span className="font-mono">{truncateAddress(kycData.wallet_address)}</span>
                  </div>
                )}
                {confirmDialog.action === 'reject' && (
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
              className={confirmDialog.action === 'reject' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {isReviewing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {confirmDialog.action === 'approve' ? t('admin.kyc.approve') : t('admin.kyc.reject')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default KycDetailModal
