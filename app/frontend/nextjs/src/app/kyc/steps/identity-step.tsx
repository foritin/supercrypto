'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useKycContext } from '@/contexts/kyc-context';
import { DocumentUpload } from '../components/document-upload';
import { CountrySelect } from '../components/country-select';
import { FormField, FormInput } from '../components/form-field';
import { ArrowLeft, ArrowRight, MapPin, FileText, Calendar, Home, ChevronLeft, Save } from 'lucide-react';

const documentTypes = [
  { value: 'passport', label: 'Passport', icon: '🛂' },
  { value: 'national_id', label: 'National ID', icon: '🆔' },
  { value: 'drivers_license', label: "Driver's License", icon: '🚗' },
];

export function IdentityStep() {
  const { t } = useTranslation();
  const { 
    formData, 
    errors, 
    updateFormData, 
    validateField, 
    showLandingPage,
    nextStep, 
    prevStep,
    saveDraft,
    lastSaved,
  } = useKycContext();

  const [uploadedFiles, setUploadedFiles] = React.useState<{
    front?: File;
    back?: File;
  }>({});

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    updateFormData({ [field]: e.target.value });
  };

  const handleBlur = (field: keyof typeof formData) => () => {
    validateField(field);
  };

  const handleFileUpload = (side: 'front' | 'back', file: File) => {
    setUploadedFiles((prev) => ({ ...prev, [side]: file }));
  };

  const handleContinue = () => {
    saveDraft();
    nextStep();
  };

  return (
    <div className="space-y-6">
      <Card className="p-8 glass border-[#00D4AA]/20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={showLandingPage}
              className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              title={t('kyc.backToOverview', 'Back to Overview')}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h3 className="text-xl font-semibold text-white">
              {t('kyc.identity.title', 'Address & Identity')}
            </h3>
          </div>
          {lastSaved && (
            <span className="flex items-center gap-1 text-xs text-[#00D4AA]">
              <Save className="h-3 w-3" />
              {t('kyc.autoSaved', 'Auto-saved')}
            </span>
          )}
        </div>

        <div className="space-y-6">
          {/* Address Section */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-white flex items-center gap-2">
              <Home className="h-5 w-5 text-[#00D4AA]" />
              {t('kyc.identity.address', 'Residential Address')}
            </h4>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                {t('kyc.identity.addressLine1', 'Address Line 1')}
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  value={formData.addressLine1 || ''}
                  onChange={handleInputChange('addressLine1')}
                  onBlur={handleBlur('addressLine1')}
                  placeholder="123 Main Street"
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
              {errors.addressLine1 && (
                <p className="mt-1 text-sm text-red-400">{errors.addressLine1}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                {t('kyc.identity.addressLine2', 'Address Line 2 (Optional)')}
              </label>
              <Input
                value={formData.addressLine2 || ''}
                onChange={handleInputChange('addressLine2')}
                placeholder="Apt 4B"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  {t('kyc.identity.city', 'City')}
                </label>
                <Input
                  value={formData.city || ''}
                  onChange={handleInputChange('city')}
                  onBlur={handleBlur('city')}
                  placeholder="New York"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
                {errors.city && (
                  <p className="mt-1 text-sm text-red-400">{errors.city}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  {t('kyc.identity.state', 'State/Province')}
                </label>
                <Input
                  value={formData.state || ''}
                  onChange={handleInputChange('state')}
                  onBlur={handleBlur('state')}
                  placeholder="NY"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
                {errors.state && (
                  <p className="mt-1 text-sm text-red-400">{errors.state}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  {t('kyc.identity.postalCode', 'Postal Code')}
                </label>
                <Input
                  value={formData.postalCode || ''}
                  onChange={handleInputChange('postalCode')}
                  onBlur={handleBlur('postalCode')}
                  placeholder="10001"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
                {errors.postalCode && (
                  <p className="mt-1 text-sm text-red-400">{errors.postalCode}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                {t('kyc.identity.country', 'Country')}
              </label>
              <CountrySelect
                value={formData.country || ''}
                onChange={handleInputChange('country')}
                onBlur={handleBlur('country')}
                error={errors.country}
              />
              {errors.country && (
                <p className="mt-1 text-sm text-red-400">{errors.country}</p>
              )}
            </div>
          </div>

          {/* Document Upload Section */}
          <div className="pt-6 border-t border-white/10">
            <h4 className="text-lg font-medium text-white flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-[#00D4AA]" />
              {t('kyc.identity.document', 'Identity Document')}
            </h4>

            {/* Document Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-white/80 mb-3">
                {t('kyc.identity.documentType', 'Document Type')}
              </label>
              <div className="grid grid-cols-3 gap-3">
                {documentTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => updateFormData({ documentType: type.value as typeof formData.documentType })}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      formData.documentType === type.value
                        ? 'border-[#00D4AA] bg-[#00D4AA]/10'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <span className="text-2xl mb-2 block">{type.icon}</span>
                    <span className={`text-sm font-medium ${
                      formData.documentType === type.value ? 'text-[#00D4AA]' : 'text-white'
                    }`}>
                      {type.label}
                    </span>
                  </button>
                ))}
              </div>
              {errors.documentType && (
                <p className="mt-2 text-sm text-red-400">{errors.documentType}</p>
              )}
            </div>

            {/* Document Number and Expiry */}
            {formData.documentType && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    {t('kyc.identity.documentNumber', 'Document Number')}
                  </label>
                  <Input
                    value={formData.documentNumber || ''}
                    onChange={handleInputChange('documentNumber')}
                    onBlur={handleBlur('documentNumber')}
                    placeholder="XX12345678"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                  {errors.documentNumber && (
                    <p className="mt-1 text-sm text-red-400">{errors.documentNumber}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    {t('kyc.identity.documentExpiry', 'Expiry Date')}
                  </label>
                  <FormInput
                    type="date"
                    value={formData.documentExpiry || ''}
                    onChange={handleInputChange('documentExpiry')}
                    onBlur={handleBlur('documentExpiry')}
                    min={new Date().toISOString().split('T')[0]}
                    error={errors.documentExpiry}
                    icon={<Calendar className="h-4 w-4" />}
                  />
                  {errors.documentExpiry && (
                    <p className="mt-1 text-sm text-red-400">{errors.documentExpiry}</p>
                  )}
                </div>
              </div>
            )}

            {/* Document Upload */}
            {formData.documentType && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DocumentUpload
                  side="front"
                  documentType={formData.documentType}
                  onUpload={(file) => handleFileUpload('front', file)}
                  uploadedFile={uploadedFiles.front}
                />
                {formData.documentType !== 'passport' && (
                  <DocumentUpload
                    side="back"
                    documentType={formData.documentType}
                    onUpload={(file) => handleFileUpload('back', file)}
                    uploadedFile={uploadedFiles.back}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          size="lg"
          onClick={prevStep}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('common.back', 'Back')}
        </Button>

        <Button
          variant="primary"
          size="lg"
          onClick={handleContinue}
          className="gap-2"
        >
          {t('common.continue', 'Continue')}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
