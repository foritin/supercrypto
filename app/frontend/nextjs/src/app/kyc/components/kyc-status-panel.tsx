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
} from 'lucide-react';

export function KycStatusPanel() {
  const { t } = useTranslation();
  const { status, submissionId, submittedAt, reviewedAt, rejectionReason, reset } = useKycContext();

  const renderStatusContent = () => {
    switch (status) {
      case 'submitted':
        return (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Clock className="h-10 w-10 text-blue-400 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {t('kyc.status.submitted.title', 'Application Submitted')}
            </h2>
            <p className="text-white/60 max-w-md mx-auto mb-6">
              {t('kyc.status.submitted.desc', 'Your KYC application has been received and is awaiting review.')}
            </p>
            {submissionId && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-white/60">
                <FileText className="h-4 w-4" />
                <span className="text-sm">Reference: {submissionId}</span>
              </div>
            )}
            {submittedAt && (
              <p className="mt-4 text-sm text-white/40">
                Submitted on {new Date(submittedAt).toLocaleString()}
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
              {t('kyc.status.underReview.title', 'Under Review')}
            </h2>
            <p className="text-white/60 max-w-md mx-auto mb-6">
              {t('kyc.status.underReview.desc', 'Our compliance team is reviewing your documents. This usually takes 1-2 business days.')}
            </p>
            <div className="flex flex-col gap-2 text-sm text-white/40">
              <p>We will notify you via email once the review is complete.</p>
              {submissionId && <p>Reference: {submissionId}</p>}
            </div>
          </div>
        );

      case 'approved':
        return (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#00D4AA]/20 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-[#00D4AA]" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {t('kyc.status.approved.title', 'KYC Approved!')}
            </h2>
            <p className="text-white/60 max-w-md mx-auto mb-6">
              {t('kyc.status.approved.desc', 'Your identity has been verified. You now have full access to all platform features.')}
            </p>
            {reviewedAt && (
              <p className="text-sm text-white/40 mb-6">
                Approved on {new Date(reviewedAt).toLocaleDateString()}
              </p>
            )}
            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={() => window.location.href = '/portfolio'}>
                View Portfolio
              </Button>
              <Button variant="primary" onClick={() => window.location.href = '/invest'}>
                Start Investing
              </Button>
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
              {t('kyc.status.rejected.title', 'KYC Rejected')}
            </h2>
            <p className="text-white/60 max-w-md mx-auto mb-6">
              {t('kyc.status.rejected.desc', 'Unfortunately, your application could not be approved.')}
            </p>
            
            {rejectionReason && (
              <div className="max-w-md mx-auto mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="font-medium text-red-400 mb-1">Reason:</p>
                    <p className="text-white/60">{rejectionReason}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={() => window.location.href = '/support'}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
              <Button variant="primary" onClick={reset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Resubmit
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="glass border-[#00D4AA]/20">
      {renderStatusContent()}
    </Card>
  );
}
