'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useKycContext } from '@/contexts/kyc-context';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  FileText, 
  RotateCcw,
  ExternalLink,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export function KycStatusPanel() {
  const { t } = useTranslation();
  const { status, submissionId, submittedAt, reviewedAt, rejectionReason, onChainSyncStatus, reset } = useKycContext();
  const [isResetting, setIsResetting] = React.useState(false);

  const handleResubmit = async () => {
    setIsResetting(true);
    try {
      await reset();
    } finally {
      setIsResetting(false);
    }
  };

  const renderStatusContent = () => {
    switch (status) {
      case 'submitted':
        return (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Clock className="h-10 w-10 text-blue-400 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {t('kyc.statusPanel.submitted.title')}
            </h2>
            <p className="text-white/60 max-w-md mx-auto mb-6">
              {t('kyc.statusPanel.submitted.desc')}
            </p>
            {submissionId && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-white/60">
                <FileText className="h-4 w-4" />
                <span className="text-sm">{t('kyc.common.reference')}: {submissionId}</span>
              </div>
            )}
            {submittedAt && (
              <p className="mt-4 text-sm text-white/40">
                {t('kyc.common.submittedOn')} {new Date(submittedAt).toLocaleString()}
              </p>
            )}
          </div>
        );

      case 'pending_review':
        return (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Clock className="h-10 w-10 text-amber-400 animate-spin" style={{ animationDuration: '3s' }} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {t('kyc.statusPanel.underReview.title')}
            </h2>
            <p className="text-white/60 max-w-md mx-auto mb-6">
              {t('kyc.statusPanel.underReview.desc')}
            </p>
            <div className="flex flex-col gap-2 text-sm text-white/40">
              <p>{t('kyc.statusPanel.underReview.notice')}</p>
              {submissionId && <p>{t('kyc.common.reference')}: {submissionId}</p>}
            </div>
          </div>
        );

      case 'approved':
        const isPendingAdmission = onChainSyncStatus === 'pending';
        const isChainSyncException = Boolean(
          onChainSyncStatus && onChainSyncStatus !== 'synced' && onChainSyncStatus !== 'pending'
        );

        return (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/20 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {t('kyc.statusPanel.approved.title')}
            </h2>
            <p className="text-white/60 max-w-md mx-auto mb-6">
              {t('kyc.statusPanel.approved.desc')}
            </p>
            {reviewedAt && (
              <p className="text-sm text-white/40 mb-6">
                {t('kyc.common.approvedOn')} {new Date(reviewedAt).toLocaleDateString()}
              </p>
            )}
            {/* 链上状态提示 */}
            {(isPendingAdmission || isChainSyncException) && (
              <div className="max-w-md mx-auto mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="font-medium text-amber-400 mb-1">
                      {isPendingAdmission
                        ? t('kyc.approved.onChain.pendingTitle')
                        : t('kyc.approved.onChain.exceptionTitle')}
                    </p>
                    <p className="text-white/60 text-sm">
                      {isPendingAdmission ? (
                        <>
                          {t(
                            'kyc.approved.onChain.pendingDesc',
                            { status: onChainSyncStatus }
                          )}
                        </>
                      ) : (
                        <>
                          {t(
                            'kyc.approved.onChain.exceptionDesc',
                            { status: onChainSyncStatus }
                          )}
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="flex justify-center gap-4 flex-wrap">
              {isPendingAdmission ? (
                <Button variant="primary" onClick={() => window.location.href = '/support'}>
                  {t('kyc.approved.onChain.contactSupport')}
                </Button>
              ) : isChainSyncException ? (
                <>
                  <Button variant="outline" onClick={handleResubmit} disabled={isResetting}>
                    {isResetting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4 mr-2" />
                    )}
                    {isResetting
                      ? t('kyc.common.processing')
                      : t('kyc.approved.onChain.resubmit')}
                  </Button>
                  <Button variant="primary" onClick={() => window.location.href = '/support'}>
                    {t('kyc.approved.onChain.contactSupport')}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => window.location.href = '/portfolio'}>
                    {t('kyc.approved.actions.viewPortfolio')}
                  </Button>
                  <Button variant="primary" onClick={() => window.location.href = '/assets'}>
                    {t('kyc.approved.actions.startInvesting')}
                  </Button>
                </>
              )}
            </div>
          </div>
        );

      case 'rejected':
        return (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
              <XCircle className="h-10 w-10 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {t('kyc.statusPanel.rejected.title')}
            </h2>
            <p className="text-white/60 max-w-md mx-auto mb-6">
              {t('kyc.statusPanel.rejected.desc')}
            </p>
            
            {rejectionReason && (
              <div className="max-w-md mx-auto mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="font-medium text-red-400 mb-1">{t('kyc.rejected.reason')}</p>
                    <p className="text-white/60">{rejectionReason}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={() => window.location.href = '/support'}>
                <ExternalLink className="h-4 w-4 mr-2" />
                {t('kyc.approved.onChain.contactSupport')}
              </Button>
              <Button variant="primary" onClick={handleResubmit} disabled={isResetting}>
                {isResetting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4 mr-2" />
                )}
                {isResetting ? t('kyc.common.processing') : t('kyc.rejected.reapply')}
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="glass border-primary/20">
      {renderStatusContent()}
    </Card>
  );
}
