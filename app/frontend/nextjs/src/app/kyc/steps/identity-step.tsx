'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useKycContext, type KycFormData } from '@/contexts/kyc-context';
import { DocumentUpload } from '../components/document-upload';
import { CountrySelect } from '../components/country-select';
import { FormField, FormInput } from '../components/form-field';
import { ArrowLeft, ArrowRight, MapPin, FileText, Calendar, Home, ChevronLeft, Save } from 'lucide-react';

const documentTypes = [
  { value: 'passport', label: 'Passport', icon: '🛂' },
  { value: 'national_id', label: 'National ID', icon: '🆔' },
  { value: 'drivers_license', label: "Driver's License", icon: '🚗' },
];

// 文档类型到 formData 字段的映射
const docPathFields: Record<string, { front: keyof KycFormData; back?: keyof KycFormData }> = {
  passport: { front: 'passportFrontPath' },
  national_id: { front: 'idCardFrontPath', back: 'idCardBackPath' },
  drivers_license: { front: 'driversLicenseFrontPath', back: 'driversLicenseBackPath' },
};

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

  // 本地存储 File 对象（用于预览，不持久化）
  const [localFiles, setLocalFiles] = React.useState<{
    passport: { front?: File };
    national_id: { front?: File; back?: File };
    drivers_license: { front?: File; back?: File };
  }>({
    passport: {},
    national_id: {},
    drivers_license: {},
  });

  // 当前选中的证件类型
  const currentDocType = formData.documentType;

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    updateFormData({ [field]: e.target.value });
  };

  const handleBlur = (field: keyof typeof formData) => () => {
    validateField(field);
  };

  const handleFileUpload = (side: 'front' | 'back', file: File, filePath: string) => {
    if (!currentDocType) return;
    
    // 存储 File 对象到本地状态（用于预览）
    setLocalFiles((prev) => ({
      ...prev,
      [currentDocType]: {
        ...prev[currentDocType],
        [side]: file,
      },
    }));
    
    // 存储 filePath 到 formData（会持久化到 localStorage）
    const pathField = side === 'front' 
      ? docPathFields[currentDocType]?.front 
      : docPathFields[currentDocType]?.back;
    
    if (pathField) {
      updateFormData({ [pathField]: filePath });
    }
  };

  const handleFileRemove = (side: 'front' | 'back') => {
    if (!currentDocType) return;
    
    // 清除本地 File 对象
    setLocalFiles((prev) => {
      const updated = { ...prev[currentDocType] };
      delete (updated as Record<string, unknown>)[side];
      return {
        ...prev,
        [currentDocType]: updated,
      };
    });
    
    // 清除 formData 中的 filePath
    const pathField = side === 'front' 
      ? docPathFields[currentDocType]?.front 
      : docPathFields[currentDocType]?.back;
    
    if (pathField) {
      updateFormData({ [pathField]: undefined });
    }
  };

  const handleContinue = () => {
    saveDraft();
    nextStep();
  };

  // 检查某种证件类型是否上传完整（基于 formData 中的 path）
  const isDocTypeComplete = (docType: 'passport' | 'national_id' | 'drivers_license'): boolean => {
    const fields = docPathFields[docType];
    if (!fields) return false;
    
    const frontPath = formData[fields.front] as string | undefined;
    if (docType === 'passport') {
      return !!frontPath;
    }
    const backPath = fields.back ? formData[fields.back] as string | undefined : undefined;
    return !!(frontPath && backPath);
  };

  // 获取某个证件类型某一面的上传路径
  const getUploadedPath = (docType: string, side: 'front' | 'back'): string | undefined => {
    const fields = docPathFields[docType];
    if (!fields) return undefined;
    const pathField = side === 'front' ? fields.front : fields.back;
    return pathField ? formData[pathField] as string | undefined : undefined;
  };

  // 检查是否有任意一种证件类型上传完整（三选一）
  const hasAnyCompleteDocument = React.useMemo(() => {
    return isDocTypeComplete('passport') || 
           isDocTypeComplete('national_id') || 
           isDocTypeComplete('drivers_license');
  }, [formData]);

  // 统计已完成的证件类型数量
  const completedDocCount = React.useMemo(() => {
    let count = 0;
    if (isDocTypeComplete('passport')) count++;
    if (isDocTypeComplete('national_id')) count++;
    if (isDocTypeComplete('drivers_license')) count++;
    return count;
  }, [formData]);

  // 当前选中证件类型的上传状态提示
  const currentDocUploadHint = React.useMemo(() => {
    if (!currentDocType) return null;
    
    const isComplete = isDocTypeComplete(currentDocType);
    
    if (isComplete) {
      return {
        type: 'success' as const,
        message: t('kyc.identity.uploadComplete', 'Document upload complete'),
      };
    }
    
    const frontPath = getUploadedPath(currentDocType, 'front');
    const backPath = getUploadedPath(currentDocType, 'back');
    
    if (currentDocType === 'passport') {
      if (!frontPath) {
        return {
          type: 'warning' as const,
          message: t('kyc.identity.errors.passportRequired', 'Please upload your passport data page'),
        };
      }
    } else {
      if (!frontPath && !backPath) {
        return {
          type: 'warning' as const,
          message: t('kyc.identity.errors.bothSidesRequired', 'Please upload both front and back of your document'),
        };
      }
      if (!frontPath) {
        return {
          type: 'warning' as const,
          message: t('kyc.identity.errors.frontRequired', 'Please upload the front of your document'),
        };
      }
      if (!backPath) {
        return {
          type: 'warning' as const,
          message: t('kyc.identity.errors.backRequired', 'Please upload the back of your document'),
        };
      }
    }
    return null;
  }, [currentDocType, formData, t]);

  // Continue 按钮是否禁用
  const isContinueDisabled = React.useMemo(() => {
    // 有表单验证错误
    if (Object.keys(errors).length > 0) return true;
    
    // 必须至少有一种证件类型上传完整
    if (!hasAnyCompleteDocument) return true;
    
    return false;
  }, [errors, hasAnyCompleteDocument]);

  // 获取当前证件类型的本地 File 对象和已上传路径
  const currentLocalFiles = currentDocType ? localFiles[currentDocType] : {};
  const currentFrontPath = currentDocType ? getUploadedPath(currentDocType, 'front') : undefined;
  const currentBackPath = currentDocType ? getUploadedPath(currentDocType, 'back') : undefined;

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
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DocumentUpload
                    side="front"
                    documentType={formData.documentType}
                    onUpload={(file, filePath) => handleFileUpload('front', file, filePath)}
                    onRemove={() => handleFileRemove('front')}
                    uploadedFile={(currentLocalFiles as { front?: File }).front}
                    uploadedPath={currentFrontPath}
                  />
                  {formData.documentType !== 'passport' && (
                    <DocumentUpload
                      side="back"
                      documentType={formData.documentType}
                      onUpload={(file, filePath) => handleFileUpload('back', file, filePath)}
                      onRemove={() => handleFileRemove('back')}
                      uploadedFile={(currentLocalFiles as { front?: File; back?: File }).back}
                      uploadedPath={currentBackPath}
                    />
                  )}
                </div>
                
                {/* 当前证件类型上传状态提示 */}
                {currentDocUploadHint && (
                  <p className={`text-sm flex items-center gap-1.5 ${
                    currentDocUploadHint.type === 'success' ? 'text-[#00D4AA]' : 'text-amber-400'
                  }`}>
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                      currentDocUploadHint.type === 'success' ? 'bg-[#00D4AA]' : 'bg-amber-400'
                    }`} />
                    {currentDocUploadHint.message}
                  </p>
                )}
              </div>
            )}

            {/* 多证件上传提示 */}
            <div className="mt-4 p-4 rounded-lg bg-white/5 border border-white/10">
              <p className="text-sm text-white/60">
                <span className="text-[#00D4AA] font-medium">💡 {t('kyc.identity.uploadTip.title', 'Tip')}:</span>{' '}
                {t('kyc.identity.uploadTip.description', 'You only need to upload one type of document to continue. However, uploading multiple document types can speed up the verification process.')}
              </p>
              
              {/* 已完成的证件类型统计 */}
              {completedDocCount > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-white/40">
                    {t('kyc.identity.uploadStatus', 'Upload status')}:
                  </span>
                  <div className="flex gap-2">
                    {(['passport', 'national_id', 'drivers_license'] as const).map((docType) => {
                      const isComplete = isDocTypeComplete(docType);
                      const labels = {
                        passport: t('kyc.idTypes.passport', 'Passport'),
                        national_id: t('kyc.idTypes.idCard', 'ID Card'),
                        drivers_license: t('kyc.idTypes.driverLicense', 'Driver License'),
                      };
                      return (
                        <span
                          key={docType}
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            isComplete 
                              ? 'bg-[#00D4AA]/20 text-[#00D4AA]' 
                              : 'bg-white/5 text-white/30'
                          }`}
                        >
                          {isComplete ? '✓ ' : ''}{labels[docType]}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
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
          disabled={isContinueDisabled}
          className="gap-2"
        >
          {t('common.continue', 'Continue')}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
