'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useKycContext } from '@/contexts/kyc-context';
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  User, 
  MapPin, 
  FileText,
  Shield,
  AlertCircle,
  Loader2,
  ChevronLeft,
} from 'lucide-react';
import { toast } from 'sonner';

export function ConfirmationStep() {
  const { t } = useTranslation();
  const { 
    formData, 
    errors,
    showLandingPage,
    submitKyc,
    prevStep,
    updateFormData,
  } = useKycContext();

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [agreed, setAgreed] = React.useState(formData.agreeToTerms || false);

  const handleSubmit = async () => {
    if (!agreed) {
      toast.error(t('kyc.confirmation.agreeRequired'));
      return;
    }

    updateFormData({ agreeToTerms: true });
    setIsSubmitting(true);

    try {
      const success = await submitKyc();
      if (success) {
        toast.success(t('kyc.confirmation.submitted'));
      }
    } catch (error) {
      toast.error(t('kyc.confirmation.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <Card className="p-8 glass border-primary/20">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={showLandingPage}
            className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            title={t('kyc.backToOverview')}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            {t('kyc.confirmation.title')}
          </h3>
          <p className="text-white/60 max-w-md mx-auto">
            {t('kyc.confirmation.desc')}
          </p>
        </div>

        <div className="space-y-6 max-w-2xl mx-auto">
          {/* Personal Information */}
          <div className="p-5 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <h4 className="font-semibold text-white">{t('kyc.confirmation.sections.personalInfo')}</h4>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-white/40 mb-1">{t('kyc.confirmation.fields.fullName')}</p>
                <p className="text-white font-medium">{formData.firstName} {formData.lastName}</p>
              </div>
              <div>
                <p className="text-white/40 mb-1">{t('kyc.confirmation.fields.dateOfBirth')}</p>
                <p className="text-white font-medium">{formatDate(formData.dateOfBirth)}</p>
              </div>
              <div>
                <p className="text-white/40 mb-1">{t('kyc.confirmation.fields.nationality')}</p>
                <p className="text-white font-medium">{formData.nationality}</p>
              </div>
              <div>
                <p className="text-white/40 mb-1">{t('kyc.confirmation.fields.email')}</p>
                <p className="text-white font-medium">{formData.email}</p>
              </div>
              <div>
                <p className="text-white/40 mb-1">{t('kyc.confirmation.fields.phone')}</p>
                <p className="text-white font-medium">{formData.phone}</p>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="p-5 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <h4 className="font-semibold text-white">{t('kyc.confirmation.sections.address')}</h4>
            </div>
            <div className="text-sm space-y-2">
              <p className="text-white font-medium">{formData.addressLine1}</p>
              {formData.addressLine2 && <p className="text-white">{formData.addressLine2}</p>}
              <p className="text-white/60">
                {formData.city}, {formData.state} {formData.postalCode}
              </p>
              <p className="text-white/60">{formData.country}</p>
            </div>
          </div>

          {/* Identity Document */}
          <div className="p-5 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <h4 className="font-semibold text-white">{t('kyc.confirmation.sections.identityDocument')}</h4>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-white/40 mb-1">{t('kyc.confirmation.fields.documentType')}</p>
                <p className="text-white font-medium capitalize">{formData.documentType?.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-white/40 mb-1">{t('kyc.confirmation.fields.documentNumber')}</p>
                <p className="text-white font-medium">{formData.documentNumber}</p>
              </div>
              <div>
                <p className="text-white/40 mb-1">{t('kyc.confirmation.fields.expiryDate')}</p>
                <p className="text-white font-medium">{formatDate(formData.documentExpiry)}</p>
              </div>
            </div>
          </div>

          {/* Face Verification */}
          {formData.faceImage && (
            <div className="p-5 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <h4 className="font-semibold text-white">{t('kyc.confirmation.sections.faceVerification')}</h4>
              </div>
              <div className="flex items-center gap-3">
                <img
                  src={formData.faceImage}
                  alt="Face verification"
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div>
                  <p className="text-white font-medium">Photo Captured</p>
                  <p className="text-sm text-primary">{t('kyc.confirmation.livenessVerified')}</p>
                </div>
              </div>
            </div>
          )}

          {/* Terms Agreement */}
          <div className="p-5 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => {
                  setAgreed(e.target.checked);
                  updateFormData({ agreeToTerms: e.target.checked });
                }}
                className="mt-1 h-4 w-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary/50"
              />
              <div className="text-sm text-white/60">
                <p>
                  {t('kyc.confirmation.terms.accuracy')}
                </p>
                <p className="mt-2">
                  {t('kyc.confirmation.terms.agreePrefix')}{' '}
                  <a href="/terms" className="text-primary hover:underline" target="_blank">
                    {t('kyc.confirmation.terms.termsOfService')}
                  </a>{' '}
                  {t('kyc.confirmation.terms.and')}{' '}
                  <a href="/privacy" className="text-primary hover:underline" target="_blank">
                    {t('kyc.confirmation.terms.privacyPolicy')}
                  </a>.
                </p>
              </div>
            </label>
            {errors.agreeToTerms && (
              <p className="mt-2 text-sm text-red-400">{errors.agreeToTerms}</p>
            )}
          </div>

          {/* Security Notice */}
          <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-white/60">
              {t('kyc.confirmation.securityNotice')}
            </p>
          </div>
        </div>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          size="lg"
          onClick={prevStep}
          disabled={isSubmitting}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </Button>

        <Button
          variant="primary"
          size="lg"
          onClick={handleSubmit}
          disabled={isSubmitting || !agreed}
          className="gap-2 min-w-[160px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('kyc.confirmation.submitting')}
            </>
          ) : (
            <>
              {t('kyc.confirmation.submit')}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
